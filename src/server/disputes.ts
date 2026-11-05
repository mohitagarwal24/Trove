import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { assert } from "@/lib/errors";
import { paymentEnvironment } from "@/lib/config";
import type { Actor } from "./auth";
import { getPurchase, internalPurchase, withPurchaseLease } from "./purchases";

export const disputeCategories = [
  "missing_data",
  "wrong_scope",
  "damaged_data",
  "duplicate_charge",
  "licence_issue",
  "other",
] as const;
const evidenceUrls = z
  .array(
    z
      .string()
      .url()
      .max(1000)
      .refine((value) => {
        const url = new URL(value);
        return url.protocol === "https:" && !url.username && !url.password;
      }, "Use an HTTPS evidence link without login credentials."),
  )
  .max(5)
  .default([]);
export const disputeSchema = z.object({
  category: z.enum(disputeCategories),
  description: z.string().trim().min(20).max(3000),
  evidenceUrls,
});
export const disputeReplySchema = z.object({
  message: z.string().trim().min(10).max(3000),
  evidenceUrls,
});
const messages = { orderBy: { createdAt: "asc" as const } };

function maySubmit(actor: Actor) {
  assert(
    !actor.viaToken || actor.scopes.includes("support"),
    "INSUFFICIENT_SCOPE",
    "Allow support access to submit a purchase issue.",
    403,
  );
}
export async function getDispute(actor: Actor, purchaseId: string) {
  await getPurchase(actor, purchaseId);
  return db.purchaseDispute.findUnique({
    where: { purchaseId },
    include: { messages },
  });
}

export async function openDispute(
  actor: Actor,
  purchaseId: string,
  value: z.input<typeof disputeSchema>,
) {
  maySubmit(actor);
  const input = disputeSchema.parse(value);
  await getPurchase(actor, purchaseId);
  return withPurchaseLease(purchaseId, async () => {
    const p = await internalPurchase(purchaseId);
    assert(
      p.workspaceId === actor.workspaceId,
      "NOT_FOUND",
      "Purchase not found in this workspace.",
      404,
    );
    const existing = await db.purchaseDispute.findUnique({
      where: { purchaseId },
      include: { messages },
    });
    if (existing) return existing;
    assert(
      p.captureId && p.paymentState === "captured",
      "INVALID_STATE",
      "Only a completed, captured purchase can be reviewed for a refund.",
      409,
    );
    // Snapshot the original promise and delivery checks; never copy full paid records,
    // access tokens, payout routing, or arbitrary fetched evidence into a case.
    const evidence = JSON.parse(
      JSON.stringify({
        paymentState: p.paymentState,
        fulfilmentState: p.fulfilmentState,
        captureId: p.captureId,
        mode: p.mode,
        quoteId: p.quoteId,
        totalCents: p.quote.totalCents,
        currency: p.quote.currency,
        planHash: p.quote.planHash,
        lines: p.quote.lines.map((line) => ({
          fields: line.fields,
          quantity: line.quantity,
          priceCents: line.priceCents,
          snapshot: line.snapshot,
        })),
        delivery: p.executions.map((execution) => ({
          state: execution.state,
          checks: execution.checks,
          resultHash: execution.resultHash,
        })),
        receiptId: p.receipt?.id || null,
      }),
    ) as Prisma.InputJsonValue;
    return db.$transaction(async (tx) => {
      const result = await tx.purchaseDispute.create({
        data: {
          purchaseId,
          openedBy: actor.id,
          ...input,
          evidence,
          messages: {
            create: {
              author: actor.id,
              kind: "buyer",
              body: input.description,
              evidenceUrls: input.evidenceUrls,
            },
          },
        },
        include: { messages },
      });
      await tx.auditEvent.create({
        data: {
          actor: actor.id,
          resourceId: purchaseId,
          action: "dispute_opened",
          reason: `${result.id}: ${input.category}`,
        },
      });
      return result;
    });
  });
}

export async function replyToDispute(
  actor: Actor,
  purchaseId: string,
  value: z.input<typeof disputeReplySchema>,
) {
  maySubmit(actor);
  const input = disputeReplySchema.parse(value);
  await getPurchase(actor, purchaseId);
  return withPurchaseLease(purchaseId, async () =>
    db.$transaction(async (tx) => {
      const dispute = await tx.purchaseDispute.findUnique({
        where: { purchaseId },
      });
      assert(dispute, "NOT_FOUND", "No purchase issue has been opened.", 404);
      assert(
        ["open", "needs_information", "rejected"].includes(dispute.state),
        "INVALID_STATE",
        "This case has already been approved for refund.",
        409,
      );
      await tx.disputeMessage.create({
        data: {
          disputeId: dispute.id,
          author: actor.id,
          kind: "buyer",
          body: input.message,
          evidenceUrls: input.evidenceUrls,
        },
      });
      await tx.auditEvent.create({
        data: {
          actor: actor.id,
          resourceId: purchaseId,
          action: "dispute_evidence_added",
          reason: dispute.id,
        },
      });
      return tx.purchaseDispute.update({
        where: { id: dispute.id },
        data: { state: "open" },
        include: { messages },
      });
    }),
  );
}

// Operator-only entry point. Deliberately not exposed through HTTP, MCP, or a buyer role.
// The private CLI requires an identified reviewer and a written evidence-based decision.
export async function reviewDispute(input: {
  id: string;
  reviewer: string;
  decision: "approve" | "reject" | "request_information";
  reason: string;
}) {
  const reviewer = z.string().trim().min(3).max(120).parse(input.reviewer);
  const reason = z.string().trim().min(20).max(3000).parse(input.reason);
  const decision = z
    .enum(["approve", "reject", "request_information"])
    .parse(input.decision);
  const record = await db.purchaseDispute.findUniqueOrThrow({
    where: { id: input.id },
  });
  return withPurchaseLease(record.purchaseId, async () =>
    db.$transaction(async (tx) => {
      const dispute = await tx.purchaseDispute.findUniqueOrThrow({
        where: { id: record.id },
      });
      if (["approved", "resolved_refund"].includes(dispute.state)) {
        assert(
          decision === "approve",
          "INVALID_STATE",
          "A refund decision is already committed.",
          409,
        );
        return dispute;
      }
      const p = await tx.purchase.findUniqueOrThrow({
        where: { id: dispute.purchaseId },
      });
      assert(
        p.mode === paymentEnvironment(),
        "PAYMENT_ENVIRONMENT_MISMATCH",
        "Purchase payment environment does not match.",
        409,
      );
      assert(
        p.paymentState === "captured",
        "INVALID_STATE",
        "The capture is no longer available for this decision.",
        409,
      );
      const state =
        decision === "approve"
          ? "approved"
          : decision === "reject"
            ? "rejected"
            : "needs_information";
      const result = await tx.purchaseDispute.update({
        where: { id: dispute.id },
        data: {
          state,
          reviewedBy: reviewer,
          decisionReason: reason,
          reviewedAt: new Date(),
          messages: {
            create: {
              author: reviewer,
              kind: state,
              body: reason,
              evidenceUrls: [],
            },
          },
        },
      });
      await tx.auditEvent.create({
        data: {
          actor: `reviewer:${reviewer}`,
          resourceId: p.id,
          action: `dispute_${state}`,
          reason: `${dispute.id}: ${reason}`,
        },
      });
      if (decision === "approve") {
        await tx.refund.create({
          data: {
            purchaseId: p.id,
            requestId: randomUUID(),
            reason,
            disputeId: dispute.id,
            approvalBasis: "dispute_review",
          },
        });
        await tx.purchase.update({
          where: { id: p.id },
          data: { paymentState: "refund_pending" },
        });
        await tx.sellerPayable.updateMany({
          where: { purchaseId: p.id, state: { in: ["owed", "failed"] } },
          data: {
            state: "cancelled",
            error: "Refund approved following purchase issue review.",
          },
        });
        await tx.sellerPayable.updateMany({
          where: {
            purchaseId: p.id,
            state: { in: ["submitted", "pending", "paid", "returned"] },
          },
          data: {
            state: "recovery_required",
            error:
              "A submitted payout is not recalled by a refund. Seller recovery requires review.",
          },
        });
        await tx.job.upsert({
          where: { key: `refund:${p.id}:` },
          update: {},
          create: { key: `refund:${p.id}:`, type: "refund", resourceId: p.id },
        });
      } else if (decision === "reject") {
        await tx.job.upsert({
          where: { key: `settle:${p.id}:` },
          update: {
            state: "pending",
            runAt: new Date(),
            attempts: 0,
            error: null,
          },
          create: { key: `settle:${p.id}:`, type: "settle", resourceId: p.id },
        });
      }
      return result;
    }),
  );
}
