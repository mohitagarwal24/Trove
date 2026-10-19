import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "../src/lib/db";
import { encrypt, decrypt, hash } from "../src/lib/crypto";
import { type Actor } from "../src/server/auth";
import { createQuote, getQuote } from "../src/server/quotes";
import {
  createPurchase,
  createPayPalOrder,
  approvePurchase,
  getResult,
  getPurchase,
  fulfilPurchase,
  cancelPurchase,
} from "../src/server/purchases";
import {
  requestRefund,
  processRefund,
  settlePurchase,
} from "../src/server/settlement";
import {
  paymentApi,
  PayPalError,
  verifyWebhook,
  type PaymentResource,
} from "../src/server/paypal";
import { prepareConnector } from "../src/server/connectors";
import { eligibility, searchOffers } from "../src/server/catalog";
import { editOffer } from "../src/server/sellers";
import { generateText } from "../src/server/ai";
import { planTask } from "../src/server/planner";
import { requireCron } from "../src/server/cron-auth";
import { persistVerifiedWebhook } from "../src/server/webhooks";
import { syncSources, normalizeSource } from "../src/server/datasets";
import { rateLimit } from "../src/server/rate-limit";
const suffix = randomUUID(),
  workspaceId = `test-${suffix}`,
  otherWorkspaceId = `test-other-${suffix}`,
  sellerId = `test-seller-${suffix}`;
const actor: Actor = {
  id: `test-user-${suffix}`,
  name: "Integration buyer",
  email: `${suffix}@example.com`,
  role: "buyer",
  sellerId: null,
  workspaceId,
  scopes: ["read", "purchase"],
  viaToken: false,
};
const other = {
  ...actor,
  id: `test-other-${suffix}`,
  workspaceId: otherWorkspaceId,
};
let offerId: string,
  sourceRows: Record<string, string | number>[],
  datasetId: string;
const originals = { ...paymentApi },
  originalFetch = globalThis.fetch,
  envKeys = [
    "PAYPAL_CLIENT_ID",
    "PAYPAL_CLIENT_SECRET",
    "PAYPAL_MERCHANT_ID",
    "PAYPAL_ENVIRONMENT",
    "GEMINI_API_KEY",
    "GEMINI_MODEL",
    "PAYPAL_PAYOUTS_ENABLED",
  ];
const oldEnv = Object.fromEntries(envKeys.map((k) => [k, process.env[k]]));
const orders = new Map<string, PaymentResource>(),
  owners = new Map<string, string>();
let captureCalls = 0;
before(async () => {
  assert(
    ["localhost", "127.0.0.1"].includes(
      new URL(process.env.DATABASE_URL!).hostname,
    ),
    "Lifecycle tests require a local database",
  );
  Object.assign(process.env, {
    PAYPAL_CLIENT_ID: "TEST_ONLY",
    PAYPAL_CLIENT_SECRET: "TEST_ONLY",
    PAYPAL_MERCHANT_ID: "TEST_MERCHANT",
    PAYPAL_ENVIRONMENT: "sandbox",
    PAYPAL_PAYOUTS_ENABLED: "false",
  });
  delete process.env.GEMINI_API_KEY;
  globalThis.fetch = async () => {
    throw new Error("External requests are forbidden in lifecycle tests");
  };
  await db.workspace.createMany({
    data: [
      { id: workspaceId, name: "Integration test" },
      { id: otherWorkspaceId, name: "Isolation test" },
    ],
  });
  const source = await db.offerVersion.findFirstOrThrow({
    where: { offerId: "drug-approvals-full", current: true },
    include: { dataset: true },
  });
  assert(source.dataset);
  sourceRows = decrypt(source.dataset.encryptedData);
  await db.seller.create({
    data: {
      id: sellerId,
      name: "Integration provider",
      initials: "I",
      color: "blue",
      description: "Test-isolated data provider",
      connectorId: "uploaded-dataset",
      status: "active",
    },
  });
  const dataset = await db.datasetSnapshot.create({
    data: {
      sellerId,
      sourceKey: suffix,
      sourceUrl: source.dataset.sourceUrl,
      licenseUrl: source.dataset.licenseUrl,
      attribution: source.dataset.attribution,
      retrievedAt: source.dataset.retrievedAt,
      sourceUpdatedAt: source.dataset.sourceUpdatedAt,
      contentHash: source.dataset.contentHash,
      rowCount: sourceRows.length,
      encryptedData: source.dataset.encryptedData,
    },
  });
  datasetId = dataset.id;
  const {
    id: _id,
    sellerId: _seller,
    dataset: _dataset,
    createdAt: _at,
    datasetId: _data,
    ...data
  } = source;
  const offer = await db.offerVersion.create({
    data: {
      ...data,
      schema: data.schema as Prisma.InputJsonValue,
      preview: data.preview as Prisma.InputJsonValue,
      offerId: `test-${suffix}`,
      version: 1,
      sellerId,
      datasetId,
    },
  });
  offerId = offer.id;
  paymentApi.create = async (id, q) => {
    const orderId = `TEST-ORDER-${id}`;
    owners.set(`TEST-AUTH-${id}`, orderId);
    orders.set(orderId, {
      id: orderId,
      status: "APPROVED",
      purchase_units: [
        {
          custom_id: q.planHash,
          invoice_id: id,
          amount: {
            currency_code: "USD",
            value: (q.totalCents / 100).toFixed(2),
          },
          payee: { merchant_id: "TEST_MERCHANT" },
          payments: {},
        },
      ],
    });
    return { id: orderId, status: "CREATED" };
  };
  paymentApi.order = async (id) => structuredClone(orders.get(id)!);
  paymentApi.authorize = async (id) => {
    const o = orders.get(id)!;
    o.purchase_units![0].payments = {
      authorizations: [
        {
          id: `TEST-AUTH-${o.purchase_units![0].invoice_id}`,
          status: "CREATED",
          amount: o.purchase_units![0].amount,
        },
      ],
    };
    return structuredClone(o);
  };
  paymentApi.capture = async (id, cents) => {
    captureCalls++;
    const o = orders.get(owners.get(id)!)!;
    const capture = {
      id: `TEST-CAPTURE-${o.purchase_units![0].invoice_id}`,
      status: "COMPLETED",
      amount: { currency_code: "USD", value: (cents / 100).toFixed(2) },
    };
    o.purchase_units![0].payments!.captures = [capture];
    return capture;
  };
  paymentApi.void = async (id) => ({ id, status: "VOIDED" });
  paymentApi.refund = async (id) => {
    const p = await db.purchase.findFirstOrThrow({
      where: { captureId: id },
      include: { quote: true },
    });
    return {
      id: `TEST-REFUND-${p.id}`,
      status: "COMPLETED",
      amount: {
        currency_code: "USD",
        value: (p.quote.totalCents / 100).toFixed(2),
      },
    };
  };
});
after(async () => {
  Object.assign(paymentApi, originals);
  globalThis.fetch = originalFetch;
  for (const k of envKeys)
    if (oldEnv[k] === undefined) delete process.env[k];
    else process.env[k] = oldEnv[k];
  const purchases = await db.purchase.findMany({
      where: { workspaceId },
      select: { id: true },
    }),
    ids = purchases.map((p) => p.id);
  await db.$transaction(async (tx) => {
    await tx.job.deleteMany({
      where: {
        OR: [
          { resourceId: { in: ids } },
          { resourceId: { startsWith: `test-${suffix}` } },
        ],
      },
    });
    await tx.webhookEvent.deleteMany({ where: { id: `test-${suffix}` } });
    await tx.auditEvent.deleteMany({
      where: {
        OR: [
          { actor: actor.id },
          { resourceId: { in: [...ids, datasetId, offerId] } },
        ],
      },
    });
    await tx.payoutAttempt.deleteMany({
      where: { payable: { purchaseId: { in: ids } } },
    });
    for (const model of [
      tx.sellerPayable,
      tx.ledgerEntry,
      tx.refund,
      tx.receipt,
      tx.resultEntitlement,
      tx.providerExecution,
      tx.paymentAttempt,
      tx.budgetReservation,
    ] as any[])
      await model.deleteMany({ where: { purchaseId: { in: ids } } });
    await tx.purchase.deleteMany({ where: { id: { in: ids } } });
    await tx.quoteLine.deleteMany({ where: { quote: { workspaceId } } });
    await tx.quote.deleteMany({ where: { workspaceId } });
    await tx.taskRun.deleteMany({ where: { workspaceId } });
    await tx.offerVersion.deleteMany({ where: { sellerId } });
    await tx.datasetSnapshot.deleteMany({ where: { sellerId } });
    await tx.seller.delete({ where: { id: sellerId } });
    await tx.workspace.deleteMany({
      where: { id: { in: [workspaceId, otherWorkspaceId] } },
    });
  });
  await db.$disconnect();
});
async function quote(taskId?: string) {
  return createQuote(actor, { offerIds: [offerId], taskId });
}
async function purchase() {
  const q = await quote();
  return (await createPurchase(actor, q.id, randomUUID())).purchase;
}
async function approve(id: string) {
  const { orderId } = await createPayPalOrder(actor, id);
  await approvePurchase(actor, id, orderId);
  await fulfilPurchase(id);
}
async function aiOutput<T>(outputs: unknown[], call: () => Promise<T>) {
  const prior = globalThis.fetch;
  process.env.GEMINI_API_KEY = "TEST_ONLY";
  process.env.GEMINI_MODEL = "gemini-3.8-flash";
  let calls = 0;
  globalThis.fetch = async (url, init) => {
    assert.equal(
      String(url),
      "https://generativelanguage.googleapis.com/v1beta/interactions",
    );
    assert.equal(JSON.parse(String(init?.body)).store, false);
    return Response.json({
      status: "completed",
      steps: [
        {
          type: "model_output",
          content: [{ type: "text", text: JSON.stringify(outputs[calls++]) }],
        },
      ],
    });
  };
  try {
    return await call();
  } finally {
    globalThis.fetch = prior;
    delete process.env.GEMINI_API_KEY;
    await db.auditEvent.deleteMany({
      where: { actor: actor.id, action: "ai_request_reserved" },
    });
  }
}
test("catalogue exposes metadata and two-row previews, never encrypted data or payout routing", async () => {
  const result = await searchOffers();
  assert(result.offers.length >= 6);
  const body = JSON.stringify(result);
  assert(!body.includes("encryptedData"));
  assert(!body.includes("payoutEmail"));
  assert(result.offers.every((o) => (o.preview as unknown[]).length <= 2));
});
test("planner uses real model responses, enforces fields and creates no payment", async () => {
  const before = await db.purchase.count({ where: { workspaceId } });
  const result = await aiOutput(
    [
      {
        categories: ["Drug approvals"],
        fields: ["brand_name", "active_ingredients"],
        purpose: "internal_business_analysis",
        maxAgeDays: 3650,
        quantity: 6,
      },
      {
        selectedOfferIds: [offerId],
        explanations: [{ offerId, reason: "Approval fields match." }],
      },
    ],
    () =>
      planTask(actor, {
        prompt: "Compare drug approvals and active ingredients",
        budgetCents: 1000,
      }),
  );
  assert.equal(result.task.planner, "gemini");
  assert.equal(result.quote?.lines[0].offerVersionId, offerId);
  assert.equal(await db.purchase.count({ where: { workspaceId } }), before);
});
test("stale, paused and incomplete sources are ineligible", async () => {
  const offer = await db.offerVersion.findUniqueOrThrow({
    where: { id: offerId },
    include: { seller: true },
  });
  const r = {
    categories: ["Drug approvals"],
    fields: ["brand_name", "active_ingredients"],
    purpose: "internal_business_analysis",
    maxAgeDays: 1,
    quantity: 2,
  };
  assert.match(
    eligibility({ ...offer, freshnessAt: new Date(0) }, r)!,
    /older/,
  );
  assert.match(eligibility({ ...offer, available: false }, r)!, /paused/);
  assert.match(
    eligibility(
      { ...offer, fields: ["brand_name"], freshnessAt: new Date() },
      r,
    )!,
    /Required fields/,
  );
});
test("prohibited fields cannot be purchased at any price", async () => {
  await assert.rejects(
    () =>
      createQuote(actor, {
        offerIds: [offerId],
        fieldsByOffer: { [offerId]: ["patient_id"] },
      }),
    /not permitted/,
  );
});
test("approval binds exact fields, provenance, quantity and dataset version", async () => {
  const q = await quote();
  const binding = q.lines[0].snapshot as any;
  assert.equal(binding.datasetId, datasetId);
  assert(binding.sourceUrl);
  assert(binding.sourceLicenseUrl);
  const prepared = await prepareConnector(q.lines[0]);
  assert.equal(prepared.rows.length, q.lines[0].quantity);
  assert(prepared.checks.every((c) => c.passed));
});
test("filtered quotes bind matching record indexes and reject empty batches", async () => {
  const selected = sourceRows.find(
    (r, i) =>
      i > 5 && r.brand_name && r.brand_name !== sourceRows[0].brand_name,
  )!;
  assert(selected);
  const task = await db.taskRun.create({
    data: {
      workspaceId,
      prompt: "Find a specific approved product",
      budgetCents: 1000,
      requirements: {
        categories: ["Drug approvals"],
        fields: ["brand_name"],
        purpose: "internal_business_analysis",
        maxAgeDays: 3650,
        quantity: 2,
        filters: [
          {
            category: "Drug approvals",
            field: "brand_name",
            operator: "equals",
            value: selected.brand_name,
          },
        ],
      },
      decisions: [],
      planner: "gemini",
    },
  });
  const q = await createQuote(actor, { offerIds: [offerId], taskId: task.id });
  const result = await prepareConnector(q.lines[0]);
  assert(result.rows.every((r) => r.brand_name === selected.brand_name));
  assert(
    (q.lines[0].snapshot as any).rowIndexes.every(
      (i: number) => sourceRows[i].brand_name === selected.brand_name,
    ),
  );
  await db.taskRun.update({
    where: { id: task.id },
    data: {
      requirements: {
        ...(task.requirements as object),
        filters: [
          {
            category: "Drug approvals",
            field: "brand_name",
            operator: "equals",
            value: "NO-SUCH-PRODUCT-ACCEPTANCE",
          },
        ],
      },
    },
  });
  const before = await db.purchase.count({ where: { workspaceId } });
  await assert.rejects(
    () => createQuote(actor, { offerIds: [offerId], taskId: task.id }),
    /No records match/,
  );
  assert.equal(await db.purchase.count({ where: { workspaceId } }), before);
});
test("row-locked budgets reject concurrent overspending", async () => {
  const task = await db.taskRun.create({
    data: {
      workspaceId,
      prompt: "Concurrent purchase",
      budgetCents: 330,
      requirements: {
        categories: ["Drug approvals"],
        fields: ["brand_name"],
        purpose: "internal_business_analysis",
        maxAgeDays: 3650,
        quantity: 2,
      },
      decisions: [],
      planner: "test",
    },
  });
  const [a, b] = await Promise.all([quote(task.id), quote(task.id)]);
  const results = await Promise.allSettled([
    createPurchase(actor, a.id, randomUUID()),
    createPurchase(actor, b.id, randomUUID()),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  const actual = await db.taskRun.findUniqueOrThrow({ where: { id: task.id } });
  assert(actual.reservedCents <= actual.budgetCents);
});
test("concurrent identical requests reserve one purchase", async () => {
  const q = await quote(),
    key = randomUUID();
  const results = await Promise.all([
    createPurchase(actor, q.id, key),
    createPurchase(actor, q.id, key),
  ]);
  assert.equal(results[0].purchase.id, results[1].purchase.id);
  assert.equal(await db.purchase.count({ where: { quoteId: q.id } }), 1);
});
test("repeated fulfilment and retrieval cannot charge twice", async () => {
  const p = await purchase(),
    calls = captureCalls;
  await approve(p.id);
  await fulfilPurchase(p.id);
  await getResult(actor, p.id);
  await getResult(actor, p.id);
  assert.equal(captureCalls, calls + 1);
  assert.equal(await db.receipt.count({ where: { purchaseId: p.id } }), 1);
  const ledger = await db.ledgerEntry.findMany({
    where: { groupId: `capture:${p.id}` },
  });
  assert.equal(
    ledger.reduce((n, e) => n + e.amountCents, 0),
    0,
  );
});
test("source corruption stops delivery before capture and releases the reservation", async () => {
  const source = await db.datasetSnapshot.findUniqueOrThrow({
    where: { id: datasetId },
  });
  const p = await purchase(),
    calls = captureCalls;
  await db.datasetSnapshot.update({
    where: { id: datasetId },
    data: { encryptedData: encrypt(sourceRows.slice(0, 1)) },
  });
  try {
    await assert.rejects(() => approve(p.id), /delivery checks/);
    const actual = await getPurchase(actor, p.id);
    assert.equal(actual.paymentState, "voided");
    assert.equal(captureCalls, calls);
    assert.equal(actual.payables.length, 0);
    assert.equal(
      (
        await db.budgetReservation.findUniqueOrThrow({
          where: { purchaseId: p.id },
        })
      ).state,
      "released",
    );
  } finally {
    await db.datasetSnapshot.update({
      where: { id: datasetId },
      data: { encryptedData: source.encryptedData },
    });
  }
});
test("private data is locked before payment and isolated after payment", async () => {
  const p = await purchase();
  await assert.rejects(() => getResult(actor, p.id), /completed purchase/);
  await approve(p.id);
  await assert.rejects(() => getResult(other, p.id), /not found/);
  await assert.rejects(() => getQuote(other, p.quoteId), /not found/);
  assert((await getResult(actor, p.id)).sources[0].rows.length > 0);
});
test("cancellation releases budget and blocks late approval", async () => {
  const p = await purchase();
  const { orderId } = await createPayPalOrder(actor, p.id);
  await cancelPurchase(actor, p.id);
  await assert.rejects(
    () => approvePurchase(actor, p.id, orderId),
    /does not belong/,
  );
  assert.equal(
    (
      await db.budgetReservation.findUniqueOrThrow({
        where: { purchaseId: p.id },
      })
    ).state,
    "released",
  );
});
test("source and result encryption reject tampering", () => {
  const value = encrypt({ sensitive: "private-value" });
  assert(!value.includes("private-value"));
  assert.deepEqual(decrypt(value), { sensitive: "private-value" });
  const parts = value.split(".");
  parts[1] = Buffer.alloc(16).toString("base64");
  assert.throws(() => decrypt(parts.join(".")));
});
test("expired result access is denied without a second charge", async () => {
  const p = await purchase();
  await approve(p.id);
  await db.resultEntitlement.update({
    where: { purchaseId: p.id },
    data: { expiresAt: new Date(0) },
  });
  await assert.rejects(() => getResult(actor, p.id), /expired/);
  assert.equal((await getPurchase(actor, p.id)).paymentState, "captured");
});
test("refund is idempotent, revokes access and balances the ledger", async () => {
  const p = await purchase();
  await approve(p.id);
  await requestRefund(actor, p.id, "Refund this research purchase");
  await processRefund(p.id);
  await processRefund(p.id);
  assert.equal((await getPurchase(actor, p.id)).paymentState, "refunded");
  await assert.rejects(() => getResult(actor, p.id));
  const entries = await db.ledgerEntry.findMany({
    where: { groupId: `refund:${p.id}` },
  });
  assert.equal(
    entries.reduce((n, e) => n + e.amountCents, 0),
    0,
  );
  assert.equal(await db.refund.count({ where: { purchaseId: p.id } }), 1);
});
test("a mismatched refund cannot revoke access or finalize accounting", async () => {
  const p = await purchase();
  await approve(p.id);
  await requestRefund(actor, p.id, "Verify exact refund amount");
  const original = paymentApi.refund;
  paymentApi.refund = async () => ({
    id: "TEST-WRONG-REFUND",
    status: "COMPLETED",
    amount: { currency_code: "USD", value: "0.01" },
  });
  try {
    await assert.rejects(
      () => processRefund(p.id),
      /refund amount does not match/,
    );
    assert.equal(
      await db.ledgerEntry.count({ where: { groupId: `refund:${p.id}` } }),
      0,
    );
    assert.equal(
      (
        await db.resultEntitlement.findUniqueOrThrow({
          where: { purchaseId: p.id },
        })
      ).revokedAt,
      null,
    );
    assert.notEqual(
      (await db.refund.findUniqueOrThrow({ where: { purchaseId: p.id } }))
        .state,
      "completed",
    );
  } finally {
    paymentApi.refund = original;
  }
});
test("refund after payout requires seller recovery", async () => {
  const p = await purchase();
  await approve(p.id);
  await db.sellerPayable.updateMany({
    where: { purchaseId: p.id },
    data: { state: "paid" },
  });
  await requestRefund(actor, p.id, "Refund after seller payout");
  await processRefund(p.id);
  assert.equal(
    (await getPurchase(actor, p.id)).settlementState,
    "recovery_required",
  );
});
test("disabled payouts remain owed and never become paid", async () => {
  const p = await purchase();
  await approve(p.id);
  await settlePurchase(p.id);
  assert.equal((await getPurchase(actor, p.id)).settlementState, "owed");
  assert.equal(
    await db.payoutAttempt.count({ where: { payable: { purchaseId: p.id } } }),
    0,
  );
});
test("payout reconciliation verifies the recipient and reuses a single batch", async () => {
  const p = await purchase();
  await approve(p.id);
  const payable = await db.sellerPayable.findFirstOrThrow({
    where: { purchaseId: p.id },
  });
  await db.seller.update({
    where: { id: sellerId },
    data: { payoutEmail: "verified-sandbox@example.com" },
  });
  process.env.PAYPAL_PAYOUTS_ENABLED = "true";
  const oldFetch = globalThis.fetch;
  let matches = false,
    returned = false,
    submissions = 0;
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.endsWith("/v1/oauth2/token"))
      return Response.json({ access_token: "TEST_ONLY", expires_in: 3600 });
    if (url.endsWith("/v1/payments/payouts") && init?.method === "POST") {
      submissions++;
      return Response.json({
        batch_header: {
          payout_batch_id: "TEST-BATCH",
          batch_status: "PENDING",
        },
      });
    }
    assert(url.includes("/v1/payments/payouts/TEST-BATCH"));
    return Response.json({
      batch_header: { payout_batch_id: "TEST-BATCH", batch_status: "SUCCESS" },
      items: [
        {
          payout_item_id: "TEST-ITEM",
          transaction_status: returned ? "RETURNED" : "SUCCESS",
          payout_item: {
            sender_item_id: payable.id,
            receiver: matches
              ? "verified-sandbox@example.com"
              : "wrong-recipient@example.com",
            amount: {
              currency: "USD",
              value: (payable.amountCents / 100).toFixed(2),
            },
          },
          payout_item_fee: { currency: "USD", value: "0.25" },
        },
      ],
    });
  };
  try {
    await assert.rejects(() => settlePurchase(p.id), /payout does not match/);
    assert.notEqual(
      (await db.sellerPayable.findUniqueOrThrow({ where: { id: payable.id } }))
        .state,
      "paid",
    );
    assert.equal(
      await db.ledgerEntry.count({
        where: { groupId: `payout:${payable.id}` },
      }),
      0,
    );
    matches = true;
    await settlePurchase(p.id);
    assert.equal(
      (await db.sellerPayable.findUniqueOrThrow({ where: { id: payable.id } }))
        .state,
      "paid",
    );
    assert.equal(submissions, 1);
    await db.seller.update({
      where: { id: sellerId },
      data: { payoutEmail: "replacement@example.com" },
    });
    returned = true;
    process.env.PAYPAL_PAYOUTS_ENABLED = "false";
    await settlePurchase(p.id);
    await settlePurchase(p.id);
    assert.equal(
      (await db.sellerPayable.findUniqueOrThrow({ where: { id: payable.id } }))
        .state,
      "returned",
    );
    assert.equal(
      await db.ledgerEntry.count({
        where: { groupId: `payout-return:${payable.id}` },
      }),
      2,
    );
    assert.equal(submissions, 1);
    const entries = await db.ledgerEntry.findMany({
      where: { purchaseId: p.id },
    });
    assert.equal(
      entries.reduce((sum, row) => sum + row.amountCents, 0),
      0,
    );
  } finally {
    globalThis.fetch = oldFetch;
    process.env.PAYPAL_PAYOUTS_ENABLED = "false";
    await db.seller.update({
      where: { id: sellerId },
      data: { payoutEmail: null },
    });
  }
});
test("immutable seller versions preserve existing quoted prices and data", async () => {
  const q = await quote();
  const old = await db.offerVersion.findUniqueOrThrow({
    where: { id: offerId },
  });
  const next = await editOffer(
    { ...actor, role: "seller", sellerId },
    offerId,
    {
      priceCents: old.priceCents + 20,
      available: true,
      fields: old.fields,
      purposes: old.purposes,
    },
  );
  assert.notEqual(next.id, old.id);
  assert.equal(next.datasetId, old.datasetId);
  assert.deepEqual(
    (await getQuote(actor, q.id)).lines[0].snapshot,
    q.lines[0].snapshot,
  );
  offerId = next.id;
});
test("foreign sellers cannot edit an offer", async () => {
  await assert.rejects(
    () =>
      editOffer({ ...actor, role: "seller", sellerId: "foreign" }, offerId, {
        priceCents: 100,
        available: true,
        fields: ["brand_name"],
        purposes: ["internal_business_analysis"],
      }),
    /not available/,
  );
});
test("capture timeout reconciles the known upstream capture without a second charge", async () => {
  const p = await purchase();
  const { orderId } = await createPayPalOrder(actor, p.id);
  await approvePurchase(actor, p.id, orderId);
  const capture = paymentApi.capture;
  let attempts = 0;
  paymentApi.capture = async (...args) => {
    attempts++;
    await capture(...args);
    throw new PayPalError("Timeout after capture", true);
  };
  try {
    await assert.rejects(() => fulfilPurchase(p.id), /Timeout/);
    assert.equal(
      (await getPurchase(actor, p.id)).paymentState,
      "reconciliation_required",
    );
    await fulfilPurchase(p.id);
    assert.equal((await getPurchase(actor, p.id)).paymentState, "captured");
    assert.equal(attempts, 1);
  } finally {
    paymentApi.capture = capture;
  }
});
test("forged order identities cannot approve another quote", async () => {
  const p = await purchase();
  await createPayPalOrder(actor, p.id);
  await assert.rejects(
    () => approvePurchase(actor, p.id, "wrong-order"),
    /does not belong/,
  );
});
test("live environment creates a live purchase without making a payment", async () => {
  process.env.PAYPAL_ENVIRONMENT = "live";
  try {
    const p = await purchase();
    assert.equal(p.mode, "live");
    assert.equal(p.paymentState, "awaiting_approval");
    assert.equal(p.captureId, null);
  } finally {
    process.env.PAYPAL_ENVIRONMENT = "sandbox";
  }
});
test("payment environment changes fail closed", async () => {
  const p = await purchase();
  process.env.PAYPAL_ENVIRONMENT = "live";
  try {
    await assert.rejects(
      () => fulfilPurchase(p.id),
      /different payment environment/,
    );
  } finally {
    process.env.PAYPAL_ENVIRONMENT = "sandbox";
  }
});
test("expired quote cannot reserve budget", async () => {
  const q = await quote();
  await db.quote.update({
    where: { id: q.id },
    data: { expiresAt: new Date(0) },
  });
  await assert.rejects(
    () => createPurchase(actor, q.id, randomUUID()),
    /expired/,
  );
  assert.equal(await db.purchase.count({ where: { quoteId: q.id } }), 0);
});
test("unconfigured AI fails with no fallback or purchase", async () => {
  await assert.rejects(
    () =>
      planTask(actor, { prompt: "Research drug approvals", budgetCents: 1000 }),
    /temporarily unavailable/,
  );
});
test("model policy rejects paid model fallback before calling a provider", async () => {
  process.env.GEMINI_API_KEY = "TEST_ONLY";
  process.env.GEMINI_MODEL = "paid-model";
  try {
    await assert.rejects(
      () => generateText(actor, "Test", "Data"),
      /supported free-tier/,
    );
  } finally {
    delete process.env.GEMINI_API_KEY;
    process.env.GEMINI_MODEL = "gemini-3.8-flash";
  }
});
test("AI quota failures start no purchase and reveal no provider response body", async () => {
  const prior = globalThis.fetch;
  process.env.GEMINI_API_KEY = "TEST_ONLY";
  globalThis.fetch = async () =>
    Response.json({ error: "private-provider-body" }, { status: 429 });
  const before = await db.purchase.count({ where: { workspaceId } });
  try {
    await assert.rejects(
      () =>
        planTask(actor, {
          prompt: "Research drug approvals",
          budgetCents: 1000,
        }),
      (e) =>
        e instanceof Error &&
        /rate-limited/.test(e.message) &&
        !e.message.includes("private-provider"),
    );
    assert.equal(await db.purchase.count({ where: { workspaceId } }), before);
  } finally {
    globalThis.fetch = prior;
    delete process.env.GEMINI_API_KEY;
    await db.auditEvent.deleteMany({
      where: { actor: actor.id, action: "ai_request_reserved" },
    });
  }
});
test("unsigned webhooks fail before persistence", async () => {
  await assert.rejects(() => verifyWebhook(new Headers(), { id: "forged" }));
});
test("verified webhook replays persist once", async () => {
  const event = {
    id: `test-${suffix}`,
    event_type: "PAYMENT.CAPTURE.COMPLETED",
    resource: { id: "TEST_RESOURCE" },
  };
  await Promise.all(
    Array.from({ length: 5 }, () => persistVerifiedWebhook(event)),
  );
  assert.equal(await db.webhookEvent.count({ where: { id: event.id } }), 1);
  assert.equal(
    await db.job.count({ where: { key: `webhook:${event.id}:` } }),
    1,
  );
});
test("maintenance credentials cannot be replaced by a buyer token", () => {
  const original = process.env.CRON_SECRET;
  process.env.CRON_SECRET = "a".repeat(64);
  try {
    assert.throws(() =>
      requireCron(
        new Request("https://trove.test/api/ops/tick", {
          headers: { authorization: "Bearer trv_invalid" },
        }),
      ),
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
test("rate limits are atomic across concurrent requests", async () => {
  const key = `test-${suffix}`;
  const results = await Promise.allSettled(
    Array.from({ length: 8 }, () => rateLimit(key, "test", 3, 60000)),
  );
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 3);
  await db.rateLimit.delete({ where: { key: hash(`test:${key}`) } });
});
test("source outages preserve existing snapshots and never fabricate freshness", async () => {
  const old = await db.offerVersion.findMany({
    where: { current: true, sellerId: { not: sellerId } },
    select: { id: true, freshnessAt: true, datasetId: true },
  });
  const result = await syncSources(true);
  assert(result.every((r) => r.error));
  const after = await db.offerVersion.findMany({
    where: { id: { in: old.map((o) => o.id) } },
    select: { id: true, freshnessAt: true, datasetId: true },
  });
  assert.deepEqual(
    after.sort((a, b) => a.id.localeCompare(b.id)),
    old.sort((a, b) => a.id.localeCompare(b.id)),
  );
});
test("normalization preserves actual dates and excludes third-party device taxonomy", () => {
  const rows = normalizeSource("device-recalls", [
    {
      res_event_number: "123",
      product_description: "Device",
      event_date_initiated: "20250101",
      gmdn_name: "Excluded",
    },
  ]);
  assert.equal(rows[0].event_date_initiated, "2025-01-01");
  assert(!("gmdn_name" in rows[0]));
});
