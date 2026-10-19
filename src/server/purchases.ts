import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { encrypt, decrypt, hash } from "@/lib/crypto";
import { AppError, assert } from "@/lib/errors";
import { capabilities, appUrl } from "@/lib/config";
import type { Actor } from "./auth";
import { getQuote, quoteInclude } from "./quotes";
import {
  paymentApi,
  PayPalError,
  verifyOrder,
  type PaymentResource,
} from "./paypal";
import {
  prepareConnector,
  type ConnectorScenario,
  type PreparedResult,
} from "./connectors";
export const purchaseInclude = {
  quote: { include: quoteInclude },
  entitlement: true,
  executions: {
    select: {
      id: true,
      state: true,
      resultHash: true,
      checks: true,
      expiresAt: true,
    },
  },
  receipt: true,
  payables: true,
  refunds: true,
} satisfies Prisma.PurchaseInclude;
export type FullPurchase = Prisma.PurchaseGetPayload<{
  include: typeof purchaseInclude;
}>;
export const internalPurchase = async (id: string) => {
  const p = await db.purchase.findUnique({
    where: { id },
    include: { ...purchaseInclude, executions: true },
  });
  assert(p, "NOT_FOUND", "Purchase not found.", 404);
  return p;
};
export async function getPurchase(actor: Actor, id: string) {
  const p = await db.purchase.findFirst({
    where: { id, workspaceId: actor.workspaceId },
    include: purchaseInclude,
  });
  assert(p, "NOT_FOUND", "Purchase not found in this workspace.", 404);
  return p;
}
export async function enqueue(type: string, resourceId: string, suffix = "") {
  return db.job.upsert({
    where: { key: `${type}:${resourceId}:${suffix}` },
    update: {},
    create: { key: `${type}:${resourceId}:${suffix}`, type, resourceId },
  });
}
async function operation(purchaseId: string, name: string) {
  return db.paymentAttempt.upsert({
    where: { purchaseId_operation: { purchaseId, operation: name } },
    update: {},
    create: { purchaseId, operation: name, requestId: randomUUID() },
  });
}
async function recordOperation(id: string, resource: PaymentResource) {
  await db.paymentAttempt.update({
    where: { id },
    data: {
      resourceId: resource.id,
      status: "completed",
      response: resource as unknown as Prisma.InputJsonValue,
    },
  });
}
export async function createPurchase(
  actor: Actor,
  quoteId: string,
  mode: "sandbox" | "simulation",
  idempotencyKey: string,
) {
  assert(
    mode !== "simulation" || capabilities().simulation,
    "SIMULATION_DISABLED",
    "Simulation is disabled.",
    403,
  );
  if (mode === "sandbox")
    assert(
      capabilities().paypal,
      "PAYPAL_NOT_CONFIGURED",
      "Connect PayPal Sandbox credentials to approve a real sandbox purchase. Simulation is available separately.",
      503,
    );
  const existing = await db.purchase.findUnique({
    where: {
      workspaceId_idempotencyKey: {
        workspaceId: actor.workspaceId,
        idempotencyKey,
      },
    },
  });
  if (existing) {
    assert(
      existing.quoteId === quoteId && existing.mode === mode,
      "IDEMPOTENCY_CONFLICT",
      "This request identity belongs to a different purchase.",
      409,
    );
    return {
      purchase: await getPurchase(actor, existing.id),
      approvalUrl: `${appUrl()}/purchases/${existing.id}`,
    };
  }
  const quote = await getQuote(actor, quoteId);
  assert(
    quote.expiresAt > new Date(),
    "QUOTE_EXPIRED",
    "This quote expired. Create and approve a new quote.",
    409,
  );
  const purchase = await db.$transaction(async (tx) => {
    if (quote.taskId)
      await tx.$queryRaw`SELECT id FROM "TaskRun" WHERE id = ${quote.taskId} FOR UPDATE`;
    const prior = await tx.purchase.findUnique({ where: { quoteId } });
    if (prior) {
      assert(
        prior.mode === mode,
        "QUOTE_ALREADY_USED",
        "This quote is already bound to another payment mode.",
        409,
      );
      return prior;
    }
    if (quote.taskId) {
      const task = await tx.taskRun.findUniqueOrThrow({
        where: { id: quote.taskId },
      });
      assert(
        task.spentCents + task.reservedCents + quote.totalCents <=
          task.budgetCents,
        "BUDGET_EXCEEDED",
        "Other active purchases leave insufficient budget.",
        409,
      );
      await tx.taskRun.update({
        where: { id: task.id },
        data: { reservedCents: { increment: quote.totalCents } },
      });
    }
    const p = await tx.purchase.create({
      data: {
        quoteId,
        workspaceId: actor.workspaceId,
        taskId: quote.taskId,
        idempotencyKey,
        mode,
        paymentState: "awaiting_approval",
        reservation: { create: { amountCents: quote.totalCents } },
      },
    });
    await tx.auditEvent.create({
      data: {
        actor: actor.id,
        resourceId: p.id,
        action: "purchase_created",
        reason: mode,
      },
    });
    return p;
  });
  return {
    purchase: await getPurchase(actor, purchase.id),
    approvalUrl: `${appUrl()}/purchases/${purchase.id}`,
  };
}
export async function createPayPalOrder(actor: Actor, id: string) {
  const p = await getPurchase(actor, id);
  assert(
    p.mode === "sandbox" && !p.approvedAt && !p.cancelledAt,
    "INVALID_STATE",
    "This purchase cannot start a PayPal approval.",
    409,
  );
  assert(
    p.quote.expiresAt > new Date(),
    "QUOTE_EXPIRED",
    "Create a new quote before checking out.",
    409,
  );
  if (p.paypalOrderId) return { orderId: p.paypalOrderId };
  const op = await operation(id, "create_order");
  try {
    const result = await paymentApi.create(id, p.quote, op.requestId);
    await recordOperation(op.id, result);
    await db.purchase.update({
      where: { id },
      data: { paypalOrderId: result.id },
    });
    return { orderId: result.id };
  } catch (error) {
    await db.paymentAttempt.update({
      where: { id: op.id },
      data: {
        status: "uncertain",
        error: error instanceof Error ? error.message : "Order creation failed",
      },
    });
    throw error;
  }
}
export async function approvePurchase(
  actor: Actor,
  id: string,
  orderId?: string,
) {
  const p = await getPurchase(actor, id);
  assert(
    p.mode === "sandbox" &&
      p.paypalOrderId &&
      p.paypalOrderId === orderId &&
      !p.cancelledAt,
    "INVALID_ORDER",
    "Approval does not belong to this purchase.",
    409,
  );
  if (p.approvedAt) return p;
  assert(
    p.quote.expiresAt > new Date(),
    "QUOTE_EXPIRED",
    "Approval arrived after the quote expired. Cancel this purchase and request a new quote.",
    409,
  );
  const order = await paymentApi.order(p.paypalOrderId);
  verifyOrder(order, id, p.quote);
  assert(
    order.status === "APPROVED",
    "ORDER_NOT_APPROVED",
    "The buyer has not approved this PayPal order.",
    409,
  );
  await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Purchase" WHERE id = ${id} FOR UPDATE`;
    const current = await tx.purchase.findUniqueOrThrow({ where: { id } });
    assert(
      !current.cancelledAt && current.paymentState === "awaiting_approval",
      "CANNOT_APPROVE",
      "This purchase was cancelled or has already started processing.",
      409,
    );
    await tx.purchase.update({
      where: { id },
      data: { approvedAt: new Date() },
    });
    await tx.job.upsert({
      where: { key: `fulfil:${id}:` },
      update: {},
      create: { key: `fulfil:${id}:`, type: "fulfil", resourceId: id },
    });
  });
  return getPurchase(actor, id);
}
export async function simulateApproval(
  actor: Actor,
  id: string,
  scenario: ConnectorScenario = "success",
) {
  assert(
    capabilities().simulation,
    "SIMULATION_DISABLED",
    "Simulation is disabled.",
    403,
  );
  const p = await getPurchase(actor, id);
  assert(
    p.mode === "simulation" && !p.cancelledAt,
    "INVALID_STATE",
    "Only simulated purchases support this action.",
    409,
  );
  assert(
    p.quote.expiresAt > new Date() || p.approvedAt,
    "QUOTE_EXPIRED",
    "Create a new quote before simulation.",
    409,
  );
  await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Purchase" WHERE id = ${id} FOR UPDATE`;
    const current = await tx.purchase.findUniqueOrThrow({ where: { id } });
    assert(
      !current.cancelledAt &&
        !["voided", "refunded", "refund_pending"].includes(
          current.paymentState,
        ),
      "CANNOT_APPROVE",
      "This purchase can no longer be approved.",
      409,
    );
    await tx.purchase.update({
      where: { id },
      data: {
        approvedAt: current.approvedAt || new Date(),
        authorizationId: current.authorizationId || `SIM-AUTH-${id}`,
        paymentState:
          current.paymentState === "awaiting_approval"
            ? "authorized"
            : current.paymentState,
      },
    });
  });
  await fulfilPurchase(id, scenario);
  return getPurchase(actor, id);
}
async function releaseReservation(
  tx: Prisma.TransactionClient,
  p: FullPurchase,
  captured: boolean,
) {
  const reserved = await tx.budgetReservation.updateMany({
    where: { purchaseId: p.id, state: "reserved" },
    data: { state: captured ? "spent" : "released" },
  });
  if (reserved.count && p.taskId) {
    await tx.$queryRaw`SELECT id FROM "TaskRun" WHERE id = ${p.taskId} FOR UPDATE`;
    await tx.taskRun.update({
      where: { id: p.taskId },
      data: {
        reservedCents: { decrement: p.quote.totalCents },
        ...(captured ? { spentCents: { increment: p.quote.totalCents } } : {}),
      },
    });
  }
}
export async function finalizeCapture(id: string, capture: PaymentResource) {
  const p = await internalPurchase(id);
  assert(
    capture.status === "COMPLETED" &&
      capture.amount?.currency_code === "USD" &&
      capture.amount.value === (p.quote.totalCents / 100).toFixed(2),
    "CAPTURE_MISMATCH",
    "Capture is incomplete or does not match the approved amount.",
    409,
  );
  assert(
    p.executions.length === p.quote.lines.length &&
      p.executions.every(
        (x) =>
          x.state === "validated" && x.encrypted && x.expiresAt > new Date(),
      ),
    "DELIVERY_UNAVAILABLE",
    "Payment requires recovery: staged results are unavailable.",
    409,
  );
  const expiresAt = new Date(
    Math.min(...p.executions.map((x) => x.expiresAt.getTime())),
  );
  await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Purchase" WHERE id = ${id} FOR UPDATE`;
    const prior = await tx.resultEntitlement.findUnique({
      where: { purchaseId: id },
    });
    if (prior) return;
    await tx.purchase.update({
      where: { id },
      data: {
        captureId: capture.id,
        paymentState: "captured",
        fulfilmentState: "available",
        settlementState: "owed",
        error: null,
      },
    });
    await tx.resultEntitlement.create({
      data: { purchaseId: id, workspaceId: p.workspaceId, expiresAt },
    });
    await releaseReservation(tx, p, true);
    const amounts = new Map<string, number>();
    for (const line of p.quote.lines)
      amounts.set(
        line.sellerId,
        (amounts.get(line.sellerId) || 0) + line.sellerCents,
      );
    for (const [sellerId, amountCents] of amounts)
      await tx.sellerPayable.create({
        data: { purchaseId: id, sellerId, amountCents },
      });
    await tx.ledgerEntry.createMany({
      data: [
        {
          purchaseId: id,
          groupId: `capture:${id}`,
          account: "processor_receivable",
          amountCents: p.quote.totalCents,
        },
        ...Array.from(amounts, ([sellerId, cents]) => ({
          purchaseId: id,
          groupId: `capture:${id}`,
          account: `seller_payable:${sellerId}`,
          amountCents: -cents,
        })),
        {
          purchaseId: id,
          groupId: `capture:${id}`,
          account: "platform_revenue",
          amountCents: -p.quote.commissionCents,
        },
      ],
    });
    const fee = capture.seller_receivable_breakdown?.paypal_fee;
    if (fee?.currency_code === "USD") {
      const cents = Math.round(Number(fee.value) * 100);
      await tx.ledgerEntry.createMany({
        data: [
          {
            purchaseId: id,
            groupId: `processor-fee:${id}`,
            account: "processor_expense",
            amountCents: cents,
          },
          {
            purchaseId: id,
            groupId: `processor-fee:${id}`,
            account: "processor_receivable",
            amountCents: -cents,
          },
        ],
      });
    }
    await tx.receipt.create({
      data: {
        purchaseId: id,
        document: {
          version: 1,
          purchaseId: id,
          mode: p.mode,
          quoteId: p.quoteId,
          planHash: p.quote.planHash,
          currency: "USD",
          totalCents: p.quote.totalCents,
          includedCommissionCents: p.quote.commissionCents,
          paypalOrderId: p.paypalOrderId,
          authorizationId: p.authorizationId,
          captureId: capture.id,
          resultExpiresAt: expiresAt.toISOString(),
          lines: p.quote.lines.map((l) => ({
            ...(l.snapshot as object),
            fields: l.fields,
            quantity: l.quantity,
            priceCents: l.priceCents,
            sellerCents: l.sellerCents,
          })),
          checks: p.executions.map((x) => ({
            resultHash: x.resultHash,
            checks: x.checks,
          })),
          accuracyNote:
            "Delivery checks establish contract conformance, not objective data accuracy. All seeded providers and data are synthetic.",
        },
      },
    });
    await tx.auditEvent.create({
      data: {
        actor: "worker",
        resourceId: id,
        action: "capture_confirmed_and_entitlement_created",
        reason: capture.id,
      },
    });
    await tx.job.upsert({
      where: { key: `settle:${id}:` },
      update: {},
      create: { key: `settle:${id}:`, type: "settle", resourceId: id },
    });
  });
}
export async function fulfilPurchase(
  id: string,
  scenario: ConnectorScenario = "success",
) {
  return withPurchaseLease(id, () => fulfilLocked(id, scenario));
}
export async function withPurchaseLease<T>(
  id: string,
  callback: () => Promise<T>,
): Promise<T> {
  const claim = await db.purchase.updateMany({
    where: {
      id,
      OR: [{ processingUntil: null }, { processingUntil: { lt: new Date() } }],
    },
    data: { processingUntil: new Date(Date.now() + 5 * 60000) },
  });
  assert(
    claim.count,
    "PURCHASE_BUSY",
    "This purchase is already processing. Check its status shortly.",
    409,
  );
  try {
    return await callback();
  } finally {
    await db.purchase.update({
      where: { id },
      data: { processingUntil: null },
    });
  }
}
async function fulfilLocked(id: string, scenario: ConnectorScenario) {
  let p = await internalPurchase(id);
  if (
    ["captured", "refunded", "voided"].includes(p.paymentState) ||
    p.cancelledAt
  )
    return;
  assert(
    p.approvedAt,
    "APPROVAL_REQUIRED",
    "Buyer approval is required before fulfilment.",
    409,
  );
  try {
    if (
      p.mode === "sandbox" &&
      ["capture_pending", "reconciliation_required"].includes(p.paymentState)
    ) {
      const existingOrder = await paymentApi.order(p.paypalOrderId!);
      verifyOrder(existingOrder, id, p.quote);
      const priorCapture =
        existingOrder.purchase_units?.[0]?.payments?.captures?.find(
          (c) => c.status === "COMPLETED",
        );
      if (priorCapture) {
        await db.purchase.update({
          where: { id },
          data: { captureId: priorCapture.id },
        });
        await finalizeCapture(id, priorCapture);
        return;
      }
    }
    if (p.mode === "sandbox" && !p.authorizationId) {
      const order = await paymentApi.order(p.paypalOrderId!);
      verifyOrder(order, id, p.quote);
      let auth = order.purchase_units?.[0]?.payments?.authorizations?.[0];
      if (!auth) {
        const op = await operation(id, "authorize");
        const result = await paymentApi.authorize(
          p.paypalOrderId!,
          op.requestId,
        );
        await recordOperation(op.id, result);
        auth = result.purchase_units?.[0]?.payments?.authorizations?.[0];
      }
      assert(
        auth && ["CREATED", "AUTHORIZED"].includes(auth.status),
        "AUTHORIZATION_FAILED",
        "PayPal did not confirm the authorization.",
        409,
      );
      assert(
        auth.amount?.currency_code === "USD" &&
          auth.amount.value === (p.quote.totalCents / 100).toFixed(2),
        "AUTHORIZATION_MISMATCH",
        "Authorization amount is unexpected.",
        409,
      );
      await db.purchase.update({
        where: { id },
        data: { authorizationId: auth.id, paymentState: "authorized" },
      });
      p = await internalPurchase(id);
    }
    await db.purchase.update({
      where: { id },
      data: { fulfilmentState: "preparing" },
    });
    for (const line of p.quote.lines) {
      const existing = await db.providerExecution.findUnique({
        where: {
          purchaseId_quoteLineId: { purchaseId: id, quoteLineId: line.id },
        },
      });
      if (existing?.state === "validated" && existing.expiresAt > new Date())
        continue;
      const prepared = await prepareConnector(line, scenario);
      const encrypted = encrypt(prepared);
      const resultHash = hash(JSON.stringify(prepared));
      const expiresAt = new Date(
        Date.now() + Number(process.env.RESULT_RETENTION_HOURS || 24) * 3600000,
      );
      await db.providerExecution.upsert({
        where: {
          purchaseId_quoteLineId: { purchaseId: id, quoteLineId: line.id },
        },
        update: {
          state: "validated",
          encrypted,
          resultHash,
          checks: prepared.checks,
          expiresAt,
        },
        create: {
          purchaseId: id,
          quoteLineId: line.id,
          state: "validated",
          encrypted,
          resultHash,
          checks: prepared.checks,
          expiresAt,
        },
      });
    }
    await db.purchase.update({
      where: { id },
      data: { fulfilmentState: "validated", paymentState: "capture_pending" },
    });
    if (p.mode === "simulation")
      await finalizeCapture(id, {
        id: `SIM-CAPTURE-${id}`,
        status: "COMPLETED",
        amount: {
          currency_code: "USD",
          value: (p.quote.totalCents / 100).toFixed(2),
        },
      });
    else {
      const order = await paymentApi.order(p.paypalOrderId!);
      verifyOrder(order, id, p.quote);
      const known = order.purchase_units?.[0]?.payments?.captures?.find(
        (c) => c.status === "COMPLETED",
      );
      if (known) await finalizeCapture(id, known);
      else {
        const op = await operation(id, "capture");
        assert(
          Date.now() - op.createdAt.getTime() < 5 * 3600000,
          "MANUAL_RECONCILIATION",
          "Capture remains uncertain beyond the automated retry window. Manual reconciliation is required.",
          409,
        );
        const capture = await paymentApi.capture(
          p.authorizationId!,
          p.quote.totalCents,
          op.requestId,
        );
        await recordOperation(op.id, capture);
        if (capture.status === "COMPLETED") await finalizeCapture(id, capture);
        else
          throw new PayPalError(
            "Capture is pending. Results remain locked until PayPal confirms payment.",
            true,
          );
      }
    }
  } catch (error) {
    p = await internalPurchase(id);
    if (p.paymentState === "captured") throw error;
    const message = error instanceof Error ? error.message : "Purchase failed.";
    if (
      ["capture_pending", "reconciliation_required"].includes(p.paymentState) ||
      (error instanceof PayPalError && error.uncertain)
    ) {
      await db.purchase.update({
        where: { id },
        data: { paymentState: "reconciliation_required", error: message },
      });
      await enqueue("reconcile", id);
      throw error;
    }
    await db.purchase.update({
      where: { id },
      data: { fulfilmentState: "failed", error: message },
    });
    await voidPurchase(id);
    throw error;
  }
}
export async function voidPurchase(id: string) {
  const p = await internalPurchase(id);
  assert(
    !["captured", "refund_pending", "refunded"].includes(p.paymentState),
    "ALREADY_CAPTURED",
    "Captured payments require a refund, not a void.",
    409,
  );
  if (p.mode === "sandbox" && p.authorizationId) {
    await db.purchase.update({
      where: { id },
      data: { paymentState: "void_pending" },
    });
    const op = await operation(id, "void");
    try {
      const result = await paymentApi.void(p.authorizationId, op.requestId);
      await recordOperation(op.id, result);
    } catch (error) {
      await db.purchase.update({
        where: { id },
        data: {
          paymentState: "reconciliation_required",
          error: error instanceof Error ? error.message : "Void uncertain",
        },
      });
      await enqueue("void", id);
      throw error;
    }
  }
  await db.$transaction(async (tx) => {
    await tx.purchase.update({
      where: { id },
      data: { paymentState: "voided" },
    });
    await tx.providerExecution.updateMany({
      where: { purchaseId: id },
      data: { encrypted: null, state: "discarded" },
    });
    await releaseReservation(tx, p, false);
  });
}
export async function cancelPurchase(actor: Actor, id: string) {
  await getPurchase(actor, id);
  await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Purchase" WHERE id = ${id} FOR UPDATE`;
    const p = await tx.purchase.findUniqueOrThrow({ where: { id } });
    assert(
      ["created", "awaiting_approval"].includes(p.paymentState) &&
        !p.approvedAt,
      "CANNOT_CANCEL",
      "Processing has started. Reconcile the purchase before requesting a refund.",
      409,
    );
    await tx.purchase.update({
      where: { id },
      data: { cancelledAt: new Date() },
    });
  });
  await voidPurchase(id);
  return getPurchase(actor, id);
}
export async function getResult(actor: Actor, id: string) {
  const p = await getPurchase(actor, id);
  assert(
    p.paymentState === "captured" && p.entitlement && !p.entitlement.revokedAt,
    "RESULT_LOCKED",
    "A completed purchase and active entitlement are required.",
    403,
  );
  assert(
    p.entitlement.expiresAt > new Date(),
    "RESULT_EXPIRED",
    "The purchased result access period has expired.",
    410,
  );
  const executions = await db.providerExecution.findMany({
    where: { purchaseId: id, state: "validated" },
  });
  return {
    purchaseId: id,
    mode: p.mode,
    expiresAt: p.entitlement.expiresAt,
    sources: p.quote.lines.map((line) => {
      const result = executions.find((e) => e.quoteLineId === line.id);
      assert(
        result?.encrypted,
        "DELIVERY_RECOVERY",
        "Result delivery requires recovery.",
        503,
      );
      return {
        ...(line.snapshot as object),
        resultHash: result.resultHash,
        ...decrypt<PreparedResult>(result.encrypted),
      };
    }),
  };
}
