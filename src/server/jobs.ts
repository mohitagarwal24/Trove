import { db } from "@/lib/db";
import {
  fulfilPurchase,
  internalPurchase,
  voidPurchase,
  enqueue,
} from "./purchases";
import { settlePurchase, processRefund } from "./settlement";
import { indexCatalog } from "./catalog";
import { syncSources } from "./datasets";
export async function runJob() {
  const jobs = await db.$queryRaw<
    { id: string; type: string; resourceId: string; attempts: number }[]
  >`
    UPDATE "Job" SET state = 'running', "lockedAt" = NOW(), attempts = attempts + 1
    WHERE id = (SELECT id FROM "Job" WHERE (state = 'pending' AND "runAt" <= NOW()) OR (state = 'running' AND "lockedAt" < NOW() - INTERVAL '6 minutes') ORDER BY "runAt" ASC FOR UPDATE SKIP LOCKED LIMIT 1)
    RETURNING id, type, "resourceId", attempts`;
  const job = jobs[0];
  if (!job) return false;
  try {
    if (["fulfil", "reconcile"].includes(job.type))
      await fulfilPurchase(job.resourceId);
    else if (job.type === "settle") await settlePurchase(job.resourceId);
    else if (job.type === "refund") await processRefund(job.resourceId);
    else if (job.type === "void") await voidPurchase(job.resourceId);
    else if (job.type === "webhook") await reconcileWebhook(job.resourceId);
    else if (job.type === "index") await indexCatalog();
    else if (job.type === "sources") {
      const results = await syncSources();
      if (results.some((r) => r.error))
        throw new Error("One or more upstream sources are unavailable.");
      if (process.env.ELASTICSEARCH_URL) await indexCatalog();
    } else throw new Error("Unknown job type");
    await db.job.update({
      where: { id: job.id },
      data: { state: "completed", lockedAt: null, error: null },
    });
  } catch (error) {
    await db.job.update({
      where: { id: job.id },
      data: {
        state: job.attempts >= 10 ? "failed" : "pending",
        lockedAt: null,
        runAt: new Date(
          Date.now() + Math.min(300000, 1000 * 2 ** job.attempts),
        ),
        error: error instanceof Error ? error.message : "Job failed",
      },
    });
  }
  return true;
}
async function reconcileWebhook(eventId: string) {
  const event = await db.webhookEvent.findUniqueOrThrow({
    where: { id: eventId },
  });
  const payload = event.payload as {
    resource?: {
      id?: string;
      supplementary_data?: { related_ids?: { order_id?: string } };
      batch_header?: { payout_batch_id?: string };
      payout_batch_id?: string;
    };
  };
  const orderId = payload.resource?.supplementary_data?.related_ids?.order_id;
  const batchId =
    payload.resource?.batch_header?.payout_batch_id ||
    payload.resource?.payout_batch_id;
  if (batchId) {
    const payout = await db.payoutAttempt.findFirst({
      where: { batchId },
      include: { payable: true },
    });
    if (payout) {
      const p = await internalPurchase(payout.payable.purchaseId);
      if (p.paymentState === "captured") await settlePurchase(p.id);
    }
  } else {
    const p = await db.purchase.findFirst({
      where: {
        OR: [
          { paypalOrderId: orderId || "__missing__" },
          { captureId: event.resourceId || "__missing__" },
          { authorizationId: event.resourceId || "__missing__" },
        ],
      },
    });
    if (
      p &&
      ["capture_pending", "reconciliation_required", "authorized"].includes(
        p.paymentState,
      ) &&
      p.approvedAt
    )
      await fulfilPurchase(p.id);
    if (p?.paymentState === "refund_pending") await processRefund(p.id);
  }
  await db.webhookEvent.update({
    where: { id: eventId },
    data: { processedAt: new Date() },
  });
}
export async function maintenance() {
  const day = new Date().toISOString().slice(0, 10);
  await enqueue("sources", day);
  await db.oAuthAttempt.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  await db.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  await db.passwordReset.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  await db.rateLimit.deleteMany({
    where: { resetAt: { lt: new Date(Date.now() - 86400000) } },
  });
  const expired = await db.purchase.findMany({
    where: {
      paymentState: "awaiting_approval",
      approvedAt: null,
      quote: { expiresAt: { lt: new Date() } },
    },
    take: 50,
  });
  for (const p of expired) {
    const cancelled = await db.purchase.updateMany({
      where: { id: p.id, approvedAt: null, paymentState: "awaiting_approval" },
      data: { cancelledAt: new Date() },
    });
    if (cancelled.count) await enqueue("void", p.id);
  }
  await db.providerExecution.updateMany({
    where: {
      expiresAt: { lt: new Date() },
      purchase: {
        paymentState: { in: ["captured", "voided", "refunded", "failed"] },
      },
    },
    data: { encrypted: null },
  });
  await db.purchase.updateMany({
    where: {
      fulfilmentState: "available",
      entitlement: { expiresAt: { lt: new Date() } },
    },
    data: { fulfilmentState: "access_expired" },
  });
}
