import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { assert } from "@/lib/errors";
import { capabilities, paymentEnvironment } from "@/lib/config";
import { paymentApi, paypalRequest } from "./paypal";
import { internalPurchase, withPurchaseLease } from "./purchases";
export async function settlePurchase(id: string) {
  return withPurchaseLease(id, async () => {
    const p = await internalPurchase(id);
    if (
      p.paymentState !== "captured" ||
      !p.entitlement ||
      p.entitlement.revokedAt
    )
      return;
    assert(
      p.mode === paymentEnvironment(),
      "PAYMENT_ENVIRONMENT_MISMATCH",
      "Purchase payment environment does not match.",
      409,
    );
    const dispute = await db.purchaseDispute.findUnique({
      where: { purchaseId: id },
    });
    const onHold =
      dispute &&
      ["open", "needs_information", "approved"].includes(dispute.state);
    for (const payable of p.payables) {
      if (["cancelled", "recovery_required"].includes(payable.state)) continue;
      const seller = await db.seller.findUniqueOrThrow({
        where: { id: payable.sellerId },
      });
      const previous = await db.payoutAttempt.findUnique({
        where: { payableId: payable.id },
      });
      // Reconcile already submitted payouts, but do not submit new ones during review.
      if (onHold && !previous?.batchId) continue;
      const configuredRecipient = previous?.recipient || seller.payoutEmail;
      if (
        (!capabilities().payouts && !previous?.batchId) ||
        !configuredRecipient
      ) {
        if (
          ["paid", "submitted", "pending", "returned"].includes(payable.state)
        )
          continue;
        await db.sellerPayable.update({
          where: { id: payable.id },
          data: {
            state: "owed",
            error: !capabilities().payouts
              ? "Payouts are not enabled. Earnings remain payable."
              : "Payout details are awaiting verification.",
          },
        });
        continue;
      }
      const attempt = await db.payoutAttempt.upsert({
        where: { payableId: payable.id },
        update: {},
        create: {
          payableId: payable.id,
          requestId: randomUUID(),
          recipient: configuredRecipient,
        },
      });
      const recipient = attempt.recipient || configuredRecipient;
      if (!attempt.recipient)
        await db.payoutAttempt.update({
          where: { id: attempt.id },
          data: { recipient },
        });
      try {
        let batch;
        if (attempt.batchId)
          batch = await paypalRequest(
            `/v1/payments/payouts/${encodeURIComponent(attempt.batchId)}?page_size=100`,
          );
        else {
          await db.sellerPayable.update({
            where: { id: payable.id },
            data: { state: "submitted", error: null },
          });
          batch = await paypalRequest(
            "/v1/payments/payouts",
            "POST",
            {
              sender_batch_header: {
                sender_batch_id: attempt.requestId,
                email_subject: "Trove data earnings",
              },
              items: [
                {
                  recipient_type: "EMAIL",
                  receiver: recipient,
                  amount: {
                    currency: "USD",
                    value: (payable.amountCents / 100).toFixed(2),
                  },
                  sender_item_id: payable.id,
                  note: `Trove purchase ${id}`,
                },
              ],
            },
            attempt.requestId,
          );
          await db.payoutAttempt.update({
            where: { id: attempt.id },
            data: {
              batchId: batch.batch_header?.payout_batch_id,
              state: "pending",
            },
          });
          if (batch.batch_header?.payout_batch_id)
            batch = await paypalRequest(
              `/v1/payments/payouts/${encodeURIComponent(batch.batch_header.payout_batch_id)}?page_size=100`,
            );
        }
        const item =
          batch.items?.find(
            (i) => i.payout_item?.sender_item_id === payable.id,
          ) || batch.items?.[0];
        const status =
          item?.transaction_status ||
          batch.batch_header?.batch_status ||
          "PENDING";
        const state =
          status === "SUCCESS"
            ? "paid"
            : ["FAILED", "DENIED", "BLOCKED", "CANCELED"].includes(status)
              ? "failed"
              : ["RETURNED", "REFUNDED", "REVERSED"].includes(status)
                ? "returned"
                : "pending";
        if (["paid", "returned"].includes(state))
          assert(
            item?.payout_item?.sender_item_id === payable.id &&
              item.payout_item.receiver?.toLowerCase() ===
                recipient.toLowerCase() &&
              item.payout_item.amount?.currency === "USD" &&
              Math.round(Number(item.payout_item.amount.value) * 100) ===
                payable.amountCents,
            "PAYOUT_MISMATCH",
            "PayPal payout does not match the approved recipient and amount.",
            502,
          );
        if (item?.payout_item_fee)
          assert(
            item.payout_item_fee.currency === "USD" &&
              Number.isFinite(Number(item.payout_item_fee.value)) &&
              Number(item.payout_item_fee.value) >= 0,
            "PAYOUT_FEE_MISMATCH",
            "PayPal payout fee requires reconciliation.",
            502,
          );
        await db.$transaction(async (tx) => {
          await tx.payoutAttempt.update({
            where: { id: attempt.id },
            data: {
              itemId: item?.payout_item_id,
              state,
              ...(item?.payout_item_fee
                ? {
                    processorFeeCents: Math.round(
                      Number(item.payout_item_fee.value) * 100,
                    ),
                  }
                : {}),
            },
          });
          await tx.sellerPayable.update({
            where: { id: payable.id },
            data: {
              state,
              error: item?.errors
                ? `${item.errors.name}: ${item.errors.message}`
                : null,
            },
          });
          if (state === "paid")
            await tx.ledgerEntry.createMany({
              skipDuplicates: true,
              data: [
                {
                  purchaseId: id,
                  groupId: `payout:${payable.id}`,
                  account: `seller_payable:${payable.sellerId}`,
                  amountCents: payable.amountCents,
                },
                {
                  purchaseId: id,
                  groupId: `payout:${payable.id}`,
                  account: "processor_receivable",
                  amountCents: -payable.amountCents,
                },
              ],
            });
          if (state === "returned" && payable.state === "paid")
            await tx.ledgerEntry.createMany({
              skipDuplicates: true,
              data: [
                {
                  purchaseId: id,
                  groupId: `payout-return:${payable.id}`,
                  account: `seller_payable:${payable.sellerId}`,
                  amountCents: -payable.amountCents,
                },
                {
                  purchaseId: id,
                  groupId: `payout-return:${payable.id}`,
                  account: "processor_receivable",
                  amountCents: payable.amountCents,
                },
              ],
            });
          if (state === "paid" && item?.payout_item_fee) {
            const fee = Math.round(Number(item.payout_item_fee.value) * 100);
            await tx.ledgerEntry.createMany({
              skipDuplicates: true,
              data: [
                {
                  purchaseId: id,
                  groupId: `payout-fee:${payable.id}`,
                  account: "processor_expense",
                  amountCents: fee,
                },
                {
                  purchaseId: id,
                  groupId: `payout-fee:${payable.id}`,
                  account: "processor_receivable",
                  amountCents: -fee,
                },
              ],
            });
          }
        });
        if (state === "pending")
          throw new Error(`Seller payout remains ${status.toLowerCase()}.`);
      } catch (error) {
        await db.sellerPayable.update({
          where: { id: payable.id },
          data: {
            error:
              error instanceof Error
                ? error.message
                : "Payout requires reconciliation.",
          },
        });
        await updateSettlement(id);
        throw error;
      }
    }
    await updateSettlement(id);
  });
}
async function updateSettlement(id: string) {
  const states = (
    await db.sellerPayable.findMany({ where: { purchaseId: id } })
  ).map((x) => x.state);
  const state = states.every((s) => s === "paid")
    ? "paid"
    : states.includes("recovery_required")
      ? "recovery_required"
      : states.includes("returned")
        ? "returned"
        : states.includes("failed")
          ? "failed"
          : states.some((s) => ["pending", "submitted"].includes(s))
            ? "pending"
            : "owed";
  await db.purchase.update({ where: { id }, data: { settlementState: state } });
}
export async function processRefund(id: string) {
  return withPurchaseLease(id, async () => {
    const p = await internalPurchase(id);
    const refund = await db.refund.findUniqueOrThrow({
      where: { purchaseId: id },
    });
    if (refund.state === "completed") return;
    const dispute = refund.disputeId
      ? await db.purchaseDispute.findUnique({ where: { id: refund.disputeId } })
      : null;
    const providerEvent =
      refund.approvalBasis === "paypal_verified_event" && refund.externalId
        ? await db.webhookEvent.findFirst({
            where: {
              eventType: "PAYMENT.CAPTURE.REFUNDED",
              resourceId: refund.externalId,
            },
          })
        : null;
    assert(
      refund.approvalBasis === "legacy_authorized" ||
        (refund.approvalBasis === "dispute_review" &&
          dispute?.purchaseId === id &&
          dispute.state === "approved" &&
          dispute.reviewedBy &&
          dispute.reviewedAt) ||
        providerEvent,
      "REFUND_NOT_APPROVED",
      "Refund requires an approved purchase issue review.",
      409,
    );
    assert(
      p.mode === paymentEnvironment(),
      "PAYMENT_ENVIRONMENT_MISMATCH",
      "Purchase payment environment does not match.",
      409,
    );
    const result = refund.externalId
      ? await paymentApi.getRefund(refund.externalId)
      : await paymentApi.refund(p.captureId!, refund.requestId, refund.reason);
    assert(
      result.id &&
        result.amount?.currency_code === "USD" &&
        Math.round(Number(result.amount.value) * 100) === p.quote.totalCents,
      "REFUND_MISMATCH",
      "PayPal refund amount does not match this purchase.",
      502,
    );
    await db.refund.update({
      where: { id: refund.id },
      data: {
        externalId: result.id,
        state: "pending",
      },
    });
    if (result.status !== "COMPLETED")
      throw new Error("PayPal refund is pending; it has not completed.");
    await db.$transaction(async (tx) => {
      await tx.refund.update({
        where: { id: refund.id },
        data: { state: "completed" },
      });
      if (refund.disputeId)
        await tx.purchaseDispute.update({
          where: { id: refund.disputeId },
          data: { state: "resolved_refund" },
        });
      const prior = await tx.ledgerEntry.count({
        where: { groupId: `refund:${id}` },
      });
      if (prior) return;
      await tx.purchase.update({
        where: { id },
        data: {
          paymentState: "refunded",
          settlementState: p.payables.some(
            (x) => x.state === "recovery_required",
          )
            ? "recovery_required"
            : "not_due",
        },
      });
      await tx.resultEntitlement.updateMany({
        where: { purchaseId: id },
        data: { revokedAt: new Date() },
      });
      const sellerTotal = p.quote.lines.reduce((s, l) => s + l.sellerCents, 0);
      await tx.ledgerEntry.createMany({
        data: [
          {
            purchaseId: id,
            groupId: `refund:${id}`,
            account: "processor_receivable",
            amountCents: -p.quote.totalCents,
          },
          {
            purchaseId: id,
            groupId: `refund:${id}`,
            account: "platform_revenue",
            amountCents: p.quote.commissionCents,
          },
          ...p.payables.map((payable) => ({
            purchaseId: id,
            groupId: `refund:${id}`,
            account: `${payable.state === "recovery_required" ? "seller_recovery" : "seller_payable"}:${payable.sellerId}`,
            amountCents: payable.amountCents,
          })),
        ],
      });
      assert(
        sellerTotal + p.quote.commissionCents === p.quote.totalCents,
        "LEDGER_IMBALANCE",
        "Refund ledger would not balance.",
        500,
      );
    });
  });
}

/** Read-only processor reconciliation. A verified external refund records money
 * already returned by PayPal; it never authorizes or POSTs a new refund. */
export async function reconcileRefundEvent(eventId: string) {
  const event = await db.webhookEvent.findUniqueOrThrow({
    where: { id: eventId },
  });
  assert(
    event.eventType === "PAYMENT.CAPTURE.REFUNDED" && event.resourceId,
    "INVALID_EVENT",
    "A verified PayPal refund event is required.",
    409,
  );
  const result = await paymentApi.getRefund(event.resourceId);
  assert(
    result.id === event.resourceId && result.status === "COMPLETED",
    "REFUND_PENDING",
    "PayPal has not confirmed this refund as completed.",
    409,
  );
  const parent = result.links?.find((link) => link.rel === "up");
  let captureId = "";
  if (parent) {
    const url = new URL(parent.href);
    if (
      url.protocol === "https:" &&
      [
        "api-m.paypal.com",
        "api-m.sandbox.paypal.com",
        "api.paypal.com",
        "api.sandbox.paypal.com",
      ].includes(url.hostname)
    )
      captureId =
        /^\/v2\/payments\/captures\/([^/]+)$/.exec(url.pathname)?.[1] || "";
  }
  assert(
    captureId,
    "REFUND_MISMATCH",
    "PayPal refund is not bound to a captured payment.",
    502,
  );
  const p = await db.purchase.findUnique({
    where: { captureId },
    include: { quote: true },
  });
  // A merchant may have transactions outside Trove. They do not belong in our ledger.
  if (!p) return;
  assert(
    p.mode === paymentEnvironment() &&
      result.amount?.currency_code === "USD" &&
      Math.round(Number(result.amount.value) * 100) === p.quote.totalCents,
    "REFUND_MISMATCH",
    "External refund requires review: only an exact full-purchase refund can be reconciled automatically.",
    409,
  );
  await withPurchaseLease(p.id, async () =>
    db.$transaction(async (tx) => {
      const prior = await tx.refund.findUnique({ where: { purchaseId: p.id } });
      if (prior?.state === "completed") {
        assert(
          prior.externalId === result.id,
          "REFUND_MISMATCH",
          "Another refund is already recorded for this purchase.",
          409,
        );
        return;
      }
      assert(
        !prior?.externalId || prior.externalId === result.id,
        "REFUND_MISMATCH",
        "A different refund is already being reconciled.",
        409,
      );
      const dispute = await tx.purchaseDispute.findUnique({
        where: { purchaseId: p.id },
      });
      await tx.refund.upsert({
        where: { purchaseId: p.id },
        create: {
          purchaseId: p.id,
          requestId: randomUUID(),
          externalId: result.id,
          reason: "Completed refund confirmed independently with PayPal.",
          approvalBasis: "paypal_verified_event",
          disputeId: dispute?.id,
        },
        update: {
          externalId: result.id,
          approvalBasis: "paypal_verified_event",
          ...(dispute ? { disputeId: dispute.id } : {}),
        },
      });
      await tx.purchase.update({
        where: { id: p.id },
        data: { paymentState: "refund_pending" },
      });
      await tx.sellerPayable.updateMany({
        where: { purchaseId: p.id, state: { in: ["owed", "failed"] } },
        data: { state: "cancelled" },
      });
      await tx.sellerPayable.updateMany({
        where: {
          purchaseId: p.id,
          state: { in: ["submitted", "pending", "paid", "returned"] },
        },
        data: { state: "recovery_required" },
      });
      await tx.auditEvent.create({
        data: {
          actor: "paypal",
          resourceId: p.id,
          action: "external_refund_confirmed",
          reason: `Verified event ${event.id}; confirmed processor refund ${result.id}.`,
        },
      });
    }),
  );
  await processRefund(p.id);
}
