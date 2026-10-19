import { after, before, test } from "node:test";
import nodeAssert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { db } from "../src/lib/db";
import { encrypt, decrypt } from "../src/lib/crypto";
import type { Actor } from "../src/server/auth";
import { createQuote } from "../src/server/quotes";
import { planTask } from "../src/server/planner";
import {
  createPurchase,
  simulateApproval,
  getResult,
  getPurchase,
  fulfilPurchase,
  internalPurchase,
  cancelPurchase,
} from "../src/server/purchases";
import { requestRefund, processRefund } from "../src/server/settlement";
import { paymentApi, PayPalError, verifyWebhook } from "../src/server/paypal";
import { prepareConnector } from "../src/server/connectors";
import { capabilities } from "../src/lib/config";
import { persistVerifiedWebhook } from "../src/server/webhooks";
import { editOffer } from "../src/server/sellers";
import { generateText } from "../src/server/ai";
import { requireCron } from "../src/server/cron-auth";
import { refreshDemoFixtures } from "../src/server/demo-fixtures";
const suffix = randomUUID();
const workspaceId = "test-" + suffix;
const otherWorkspaceId = "test-other-" + suffix;
const actor: Actor = {
  id: "test-user-" + suffix,
  name: "Test buyer",
  email: "test@trove.test",
  role: "buyer",
  sellerId: null,
  workspaceId,
  scopes: ["read", "purchase"],
  viaToken: false,
};
const other: Actor = {
  ...actor,
  id: "test-other",
  workspaceId: otherWorkspaceId,
};
let offerId: string;
before(async () => {
  await db.workspace.createMany({
    data: [
      { id: workspaceId, name: "Integration test" },
      { id: otherWorkspaceId, name: "Isolation test" },
    ],
  });
  offerId = (
    await db.offerVersion.findFirstOrThrow({
      where: { offerId: "northstar-current", current: true },
    })
  ).id;
});
after(async () => {
  const purchases = await db.purchase.findMany({
    where: { workspaceId },
    select: { id: true },
  });
  const ids = purchases.map((p) => p.id);
  await db.$transaction(async (tx) => {
    await tx.job.deleteMany({
      where: { resourceId: { in: [...ids, `test-event-${suffix}`] } },
    });
    await tx.webhookEvent.deleteMany({ where: { id: `test-event-${suffix}` } });
    await tx.auditEvent.deleteMany({
      where: { OR: [{ resourceId: { in: ids } }, { actor: actor.id }] },
    });
    await tx.payoutAttempt.deleteMany({
      where: { payable: { purchaseId: { in: ids } } },
    });
    await tx.sellerPayable.deleteMany({ where: { purchaseId: { in: ids } } });
    await tx.ledgerEntry.deleteMany({ where: { purchaseId: { in: ids } } });
    await tx.refund.deleteMany({ where: { purchaseId: { in: ids } } });
    await tx.receipt.deleteMany({ where: { purchaseId: { in: ids } } });
    await tx.resultEntitlement.deleteMany({
      where: { purchaseId: { in: ids } },
    });
    await tx.providerExecution.deleteMany({
      where: { purchaseId: { in: ids } },
    });
    await tx.paymentAttempt.deleteMany({ where: { purchaseId: { in: ids } } });
    await tx.budgetReservation.deleteMany({
      where: { purchaseId: { in: ids } },
    });
    await tx.purchase.deleteMany({ where: { id: { in: ids } } });
    await tx.quoteLine.deleteMany({ where: { quote: { workspaceId } } });
    await tx.quote.deleteMany({ where: { workspaceId } });
    await tx.taskRun.deleteMany({ where: { workspaceId } });
    await tx.workspace.deleteMany({
      where: { id: { in: [workspaceId, otherWorkspaceId] } },
    });
  });
  await db.$disconnect();
});
async function quote(taskId?: string) {
  return createQuote(actor, { offerIds: [offerId], taskId });
}
async function purchase(mode: "simulation" | "sandbox" = "simulation") {
  const q = await quote();
  return (await createPurchase(actor, q.id, mode, randomUUID())).purchase;
}
test("planner rejects stale, insufficient-field and prohibited-purpose offers", async () => {
  const result = await planTask(actor, {
    prompt:
      "Compare current product prices and supplier capabilities for internal business analysis.",
    budgetCents: 1000,
    mode: "demo",
  });
  nodeAssert.equal(result.task.planner, "deterministic_demo");
  nodeAssert.equal(result.quote?.lines.length, 2);
  const decisions = result.task.decisions as unknown as {
    selected: boolean;
    reason: string;
  }[];
  nodeAssert(decisions.some((d) => !d.selected && /freshness/.test(d.reason)));
  nodeAssert(
    decisions.some((d) => !d.selected && /Required fields/.test(d.reason)),
  );
  nodeAssert(decisions.some((d) => !d.selected && /Licence/.test(d.reason)));
});
test("prohibited fields cannot be unlocked with a larger budget", async () => {
  await nodeAssert.rejects(
    () =>
      createQuote(actor, {
        offerIds: [offerId],
        fieldsByOffer: { [offerId]: ["private_contact"] },
      }),
    /not permitted/,
  );
});
test("aggregate offer succeeds, but named company records remain unavailable", async () => {
  const summary = await db.offerVersion.findFirstOrThrow({
    where: { offerId: "atlas-summary", current: true },
  });
  await nodeAssert.rejects(
    () =>
      createQuote(actor, {
        offerIds: [summary.id],
        fieldsByOffer: { [summary.id]: ["company"] },
      }),
    /not permitted/,
  );
  const q = await createQuote(actor, { offerIds: [summary.id] });
  const p = (await createPurchase(actor, q.id, "simulation", randomUUID()))
    .purchase;
  await simulateApproval(actor, p.id);
  const result = await getResult(actor, p.id);
  nodeAssert(result.sources[0].rows.every((row) => !("company" in row)));
});
test("row-locked reservations prevent concurrent overspending", async () => {
  const offer = await db.offerVersion.findUniqueOrThrow({
    where: { id: offerId },
  });
  const task = await db.taskRun.create({
    data: {
      workspaceId,
      prompt: "Concurrent budget test",
      budgetCents: offer.priceCents + 10,
      requirements: {
        categories: [offer.category],
        fields: ["product"],
        purpose: "internal_business_analysis",
        maxAgeDays: 7,
        quantity: 2,
      },
      decisions: [],
      planner: "test",
    },
  });
  const [a, b] = await Promise.all([quote(task.id), quote(task.id)]);
  const results = await Promise.allSettled([
    createPurchase(actor, a.id, "simulation", randomUUID()),
    createPurchase(actor, b.id, "simulation", randomUUID()),
  ]);
  nodeAssert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  const updated = await db.taskRun.findUniqueOrThrow({
    where: { id: task.id },
  });
  nodeAssert.equal(updated.reservedCents, offer.priceCents);
  nodeAssert(updated.reservedCents <= updated.budgetCents);
});
test("duplicate purchase identity and repeated result retrieval do not double-charge", async () => {
  const q = await quote();
  const key = randomUUID();
  const p = (await createPurchase(actor, q.id, "simulation", key)).purchase;
  const repeated = await createPurchase(actor, q.id, "simulation", key);
  nodeAssert.equal(repeated.purchase.id, p.id);
  await simulateApproval(actor, p.id);
  await simulateApproval(actor, p.id);
  await getResult(actor, p.id);
  await getResult(actor, p.id);
  nodeAssert.equal(await db.receipt.count({ where: { purchaseId: p.id } }), 1);
  const entries = await db.ledgerEntry.findMany({
    where: { groupId: `capture:${p.id}` },
  });
  nodeAssert.equal(
    entries.reduce((s, e) => s + e.amountCents, 0),
    0,
  );
  nodeAssert.equal(entries.length, 3);
});
test("failed bundle validation voids the purchase and creates no seller payable", async () => {
  const second = await db.offerVersion.findFirstOrThrow({
    where: { offerId: "atlas-directory", current: true },
  });
  const q = await createQuote(actor, { offerIds: [offerId, second.id] });
  const p = (await createPurchase(actor, q.id, "simulation", randomUUID()))
    .purchase;
  await nodeAssert.rejects(
    () => simulateApproval(actor, p.id, "missing_field"),
    /delivery checks/,
  );
  const result = await getPurchase(actor, p.id);
  nodeAssert.equal(result.paymentState, "voided");
  nodeAssert.equal(result.captureId, null);
  nodeAssert.equal(result.payables.length, 0);
  await nodeAssert.rejects(() => getResult(actor, p.id), /completed purchase/);
});
test("connector outages never produce captures or paid access", async () => {
  const p = await purchase();
  await nodeAssert.rejects(
    () => simulateApproval(actor, p.id, "outage"),
    /unavailable/,
  );
  nodeAssert.equal((await getPurchase(actor, p.id)).paymentState, "voided");
  await nodeAssert.rejects(() => getResult(actor, p.id));
});
test("pending approval and another buyer cannot retrieve private results", async () => {
  const p = await purchase();
  await nodeAssert.rejects(() => getResult(actor, p.id), /completed purchase/);
  await simulateApproval(actor, p.id);
  await nodeAssert.rejects(() => getResult(other, p.id), /not found/i);
  await nodeAssert.rejects(() => getPurchase(other, p.id), /not found/i);
});
test("cancellation releases the reservation and blocks later approval", async () => {
  const p = await purchase();
  await cancelPurchase(actor, p.id);
  await nodeAssert.rejects(
    () => simulateApproval(actor, p.id),
    /Only simulated purchases/,
  );
  const r = await db.budgetReservation.findUniqueOrThrow({
    where: { purchaseId: p.id },
  });
  nodeAssert.equal(r.state, "released");
});
test("result staging is authenticated encryption, not readable database JSON", async () => {
  const value = encrypt({ records: ["private-purchased-value"] });
  nodeAssert(!value.includes("private-purchased-value"));
  nodeAssert.deepEqual(decrypt(value), {
    records: ["private-purchased-value"],
  });
  const parts = value.split(".");
  parts[1] = Buffer.alloc(16).toString("base64");
  nodeAssert.throws(() => decrypt(parts.join(".")));
});
test("expired result access is denied without a second charge", async () => {
  const p = await purchase();
  await simulateApproval(actor, p.id);
  await db.resultEntitlement.update({
    where: { purchaseId: p.id },
    data: { expiresAt: new Date(0) },
  });
  await nodeAssert.rejects(() => getResult(actor, p.id), /expired/);
  nodeAssert.equal((await getPurchase(actor, p.id)).paymentState, "captured");
});
test("refund is idempotent, revokes access, stops settlement, and balances", async () => {
  const p = await purchase();
  await simulateApproval(actor, p.id);
  await requestRefund(actor, p.id, "Integration test refund request");
  await processRefund(p.id);
  await processRefund(p.id);
  const result = await getPurchase(actor, p.id);
  nodeAssert.equal(result.paymentState, "refunded");
  nodeAssert(result.payables.every((x) => x.state === "cancelled"));
  await nodeAssert.rejects(() => getResult(actor, p.id));
  const entries = await db.ledgerEntry.findMany({
    where: { groupId: `refund:${p.id}` },
  });
  nodeAssert.equal(
    entries.reduce((s, e) => s + e.amountCents, 0),
    0,
  );
  nodeAssert.equal(await db.refund.count({ where: { purchaseId: p.id } }), 1);
});
test("refund after seller payout explicitly requires recovery", async () => {
  const p = await purchase();
  await simulateApproval(actor, p.id);
  await db.sellerPayable.updateMany({
    where: { purchaseId: p.id },
    data: { state: "paid" },
  });
  await requestRefund(actor, p.id, "Test refund after a submitted payout");
  await processRefund(p.id);
  nodeAssert.equal(
    (await getPurchase(actor, p.id)).settlementState,
    "recovery_required",
  );
});
test("seller version updates cannot rewrite an existing quote snapshot", async () => {
  const q = await quote();
  const original = q.lines[0].snapshot;
  const cents = q.totalCents;
  await db.offerVersion.update({
    where: { id: offerId },
    data: { priceCents: cents + 20 },
  });
  try {
    const reloaded = await db.quote.findUniqueOrThrow({
      where: { id: q.id },
      include: { lines: true },
    });
    nodeAssert.equal(reloaded.totalCents, cents);
    nodeAssert.deepEqual(reloaded.lines[0].snapshot, original);
  } finally {
    await db.offerVersion.update({
      where: { id: offerId },
      data: { priceCents: cents },
    });
  }
});
test("capture timeout reconciles a known capture without a second call or released budget", async () => {
  const originalEnv = {
    id: process.env.PAYPAL_CLIENT_ID,
    secret: process.env.PAYPAL_CLIENT_SECRET,
    merchant: process.env.PAYPAL_MERCHANT_ID,
  };
  process.env.PAYPAL_CLIENT_ID = "TEST_ONLY";
  process.env.PAYPAL_CLIENT_SECRET = "TEST_ONLY";
  process.env.PAYPAL_MERCHANT_ID = "TEST_MERCHANT";
  const originals = { order: paymentApi.order, capture: paymentApi.capture };
  let captures = 0;
  let recorded = false;
  try {
    const p = await purchase("sandbox");
    await db.purchase.update({
      where: { id: p.id },
      data: {
        paypalOrderId: `TEST-ORDER-${p.id}`,
        authorizationId: `TEST-AUTH-${p.id}`,
        approvedAt: new Date(),
        paymentState: "authorized",
      },
    });
    const capture = {
      id: `TEST-CAPTURE-${p.id}`,
      status: "COMPLETED",
      amount: {
        currency_code: "USD",
        value: (p.quote.totalCents / 100).toFixed(2),
      },
    };
    paymentApi.order = async () => ({
      id: `TEST-ORDER-${p.id}`,
      status: "COMPLETED",
      purchase_units: [
        {
          custom_id: p.quote.planHash,
          invoice_id: p.id,
          amount: capture.amount,
          payee: { merchant_id: "TEST_MERCHANT" },
          payments: { ...(recorded ? { captures: [capture] } : {}) },
        },
      ],
    });
    paymentApi.capture = async () => {
      captures++;
      recorded = true;
      throw new PayPalError(
        "Test network timeout after upstream capture",
        true,
      );
    };
    await nodeAssert.rejects(
      () => fulfilPurchase(p.id),
      /Test network timeout/,
    );
    const pending = await internalPurchase(p.id);
    nodeAssert.equal(pending.paymentState, "reconciliation_required");
    nodeAssert.equal(pending.entitlement, null);
    nodeAssert.equal(
      (
        await db.budgetReservation.findUniqueOrThrow({
          where: { purchaseId: p.id },
        })
      ).state,
      "reserved",
    );
    await fulfilPurchase(p.id);
    const recovered = await getPurchase(actor, p.id);
    nodeAssert.equal(recovered.paymentState, "captured");
    nodeAssert.equal(captures, 1);
    nodeAssert(recovered.entitlement);
    await getResult(actor, p.id);
  } finally {
    paymentApi.order = originals.order;
    paymentApi.capture = originals.capture;
    for (const [key, value] of [
      ["PAYPAL_CLIENT_ID", originalEnv.id],
      ["PAYPAL_CLIENT_SECRET", originalEnv.secret],
      ["PAYPAL_MERCHANT_ID", originalEnv.merchant],
    ]) {
      if (value) process.env[key!] = value;
      else delete process.env[key!];
    }
  }
});
test("unsigned webhooks fail before any event can be trusted", async () => {
  await nodeAssert.rejects(() =>
    verifyWebhook(new Headers(), {
      id: "forged",
      event_type: "PAYMENT.CAPTURE.COMPLETED",
    }),
  );
});
test("unconfigured live payments and AI fail closed", async () => {
  if (!capabilities().paypal) {
    const q = await quote();
    await nodeAssert.rejects(
      () => createPurchase(actor, q.id, "sandbox", randomUUID()),
      /credentials|Connect PayPal/i,
    );
  }
  if (!capabilities().ai)
    await nodeAssert.rejects(
      () =>
        planTask(actor, {
          prompt: "Research current product prices",
          budgetCents: 1000,
          mode: "live",
        }),
      /GEMINI_API_KEY/,
    );
});
test("Gemini structured planning is bounded and paid-provider fallback is absent", async () => {
  const oldKey = process.env.GEMINI_API_KEY;
  const oldModel = process.env.GEMINI_MODEL;
  const oldFetch = globalThis.fetch;
  process.env.GEMINI_API_KEY = "fixture-key-never-sent-to-a-provider";
  process.env.GEMINI_MODEL = "gemini-3.8-flash";
  let calls = 0;
  globalThis.fetch = async (url, init) => {
    calls++;
    nodeAssert.equal(
      String(url),
      "https://generativelanguage.googleapis.com/v1beta/interactions",
    );
    nodeAssert.equal(
      new Headers(init?.headers).get("x-goog-api-key"),
      process.env.GEMINI_API_KEY,
    );
    const body = JSON.parse(String(init?.body));
    nodeAssert.equal(body.store, false);
    nodeAssert.equal(body.response_format.mime_type, "application/json");
    const output =
      calls === 1
        ? {
            categories: ["Product pricing"],
            fields: ["product", "price_usd", "retailer", "availability"],
            purpose: "internal_business_analysis",
            maxAgeDays: 7,
            quantity: 6,
          }
        : {
            selectedOfferIds: [offerId],
            explanations: [
              { offerId, reason: "Required retail fields are present." },
            ],
          };
    return Response.json({
      status: "completed",
      steps: [
        {
          type: "model_output",
          content: [{ type: "text", text: JSON.stringify(output) }],
        },
      ],
    });
  };
  try {
    const result = await planTask(actor, {
      prompt: "Research current product prices",
      budgetCents: 1000,
      mode: "live",
    });
    nodeAssert.equal(result.task.planner, "gemini");
    nodeAssert.equal(result.quote?.lines[0].offerVersionId, offerId);
    nodeAssert.equal(calls, 2);
    process.env.GEMINI_MODEL = "paid-model-not-permitted";
    await nodeAssert.rejects(
      () => generateText(actor, "Summary", "Fixture"),
      /supported free-tier/,
    );
    nodeAssert.equal(calls, 2);
  } finally {
    globalThis.fetch = oldFetch;
    if (oldKey) process.env.GEMINI_API_KEY = oldKey;
    else delete process.env.GEMINI_API_KEY;
    if (oldModel) process.env.GEMINI_MODEL = oldModel;
    else delete process.env.GEMINI_MODEL;
    await db.auditEvent.deleteMany({
      where: { actor: actor.id, action: "ai_request_reserved" },
    });
  }
});
test("a Gemini quota response never starts a purchase or switches providers", async () => {
  const oldKey = process.env.GEMINI_API_KEY,
    oldFetch = globalThis.fetch;
  process.env.GEMINI_API_KEY = "fixture-only";
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return Response.json(
      { error: { message: "private-provider-details" } },
      { status: 429 },
    );
  };
  const before = await db.purchase.count({ where: { workspaceId } });
  try {
    await nodeAssert.rejects(
      () =>
        planTask(actor, {
          prompt: "Research current product prices",
          budgetCents: 1000,
          mode: "live",
        }),
      /free quota/,
    );
    nodeAssert.equal(calls, 1);
    nodeAssert.equal(
      await db.purchase.count({ where: { workspaceId } }),
      before,
    );
  } finally {
    globalThis.fetch = oldFetch;
    if (oldKey) process.env.GEMINI_API_KEY = oldKey;
    else delete process.env.GEMINI_API_KEY;
    await db.auditEvent.deleteMany({
      where: { actor: actor.id, action: "ai_request_reserved" },
    });
  }
});
test("maintenance requires its own credential, not a buyer or agent bearer", () => {
  const original = process.env.CRON_SECRET;
  process.env.CRON_SECRET = "a".repeat(64);
  try {
    nodeAssert.throws(
      () => requireCron(new Request("https://trove.test/api/ops/tick")),
      /valid maintenance/,
    );
    nodeAssert.throws(
      () =>
        requireCron(
          new Request("https://trove.test/api/ops/tick", {
            headers: { authorization: "Bearer trv_fixture" },
          }),
        ),
      /valid maintenance/,
    );
    requireCron(
      new Request("https://trove.test/api/ops/tick", {
        headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
      }),
    );
  } finally {
    if (original) process.env.CRON_SECRET = original;
    else delete process.env.CRON_SECRET;
  }
});
test("verified webhook replays produce one durable event and one job", async () => {
  const event = {
    id: `test-event-${suffix}`,
    event_type: "PAYMENT.CAPTURE.COMPLETED",
    resource: { id: "TEST_RESOURCE" },
  };
  await Promise.all(
    Array.from({ length: 5 }, () => persistVerifiedWebhook(event)),
  );
  nodeAssert.equal(await db.webhookEvent.count({ where: { id: event.id } }), 1);
  nodeAssert.equal(
    await db.job.count({ where: { key: `webhook:${event.id}:` } }),
    1,
  );
  nodeAssert.equal(
    (await db.webhookEvent.findUniqueOrThrow({ where: { id: event.id } }))
      .processedAt,
    null,
  );
});
test("a seller cannot edit another seller's offer", async () => {
  const offer = await db.offerVersion.findFirstOrThrow({
    where: { offerId: "atlas-directory", current: true },
  });
  const pricingSeller = {
    ...actor,
    role: "seller",
    sellerId: "seller-pricing",
  };
  await nodeAssert.rejects(
    () =>
      editOffer(pricingSeller, offer.id, {
        priceCents: 100,
        available: true,
        fields: ["company"],
        purposes: ["internal_business_analysis"],
      }),
    /not available in this seller account/,
  );
  nodeAssert.equal(
    (await db.offerVersion.findUniqueOrThrow({ where: { id: offer.id } }))
      .priceCents,
    offer.priceCents,
  );
});
test("an expired quote cannot reserve budget or begin checkout", async () => {
  const q = await quote();
  await db.quote.update({
    where: { id: q.id },
    data: { expiresAt: new Date(0) },
  });
  await nodeAssert.rejects(
    () => createPurchase(actor, q.id, "simulation", randomUUID()),
    /expired/,
  );
  nodeAssert.equal(await db.purchase.count({ where: { quoteId: q.id } }), 0);
});
test("synthetic refresh preserves seller terms and old quote snapshots while archives remain old", async () => {
  const originals = await db.offerVersion.findMany({
    where: { current: true },
  });
  const current = originals.find((o) => o.offerId === "northstar-current")!;
  const approved = await createQuote(actor, { offerIds: [current.id] });
  const future = new Date(Date.now() + 3 * 86400000);
  let nextIds: string[] = [];
  try {
    nodeAssert.equal(await refreshDemoFixtures(future), 8);
    const next = await db.offerVersion.findMany({ where: { current: true } });
    nextIds = next.map((o) => o.id);
    const updated = next.find((o) => o.offerId === current.offerId)!;
    nodeAssert.notEqual(updated.id, current.id);
    nodeAssert.equal(updated.priceCents, current.priceCents);
    nodeAssert.deepEqual(updated.fields, current.fields);
    nodeAssert.equal(
      (
        await db.offerVersion.findUniqueOrThrow({ where: { id: current.id } })
      ).freshnessAt.toISOString(),
      current.freshnessAt.toISOString(),
    );
    const line = await db.quoteLine.findFirstOrThrow({
      where: { quoteId: approved.id },
    });
    nodeAssert.deepEqual(line.snapshot, approved.lines[0].snapshot);
    const archive = next.find((o) => o.offerId === "northstar-archive")!;
    nodeAssert(future.getTime() - archive.freshnessAt.getTime() > 7 * 86400000);
  } finally {
    if (nextIds.length)
      await db.$transaction(async (tx) => {
        await tx.offerVersion.updateMany({
          where: { id: { in: nextIds } },
          data: { current: false },
        });
        await tx.offerVersion.updateMany({
          where: { id: { in: originals.map((o) => o.id) } },
          data: { current: true },
        });
        await tx.auditEvent.deleteMany({
          where: {
            resourceId: { in: nextIds },
            action: "synthetic_scenario_reissued",
          },
        });
        await tx.job.deleteMany({
          where: { type: "index", resourceId: { in: nextIds } },
        });
        await tx.offerVersion.deleteMany({ where: { id: { in: nextIds } } });
      });
  }
});
