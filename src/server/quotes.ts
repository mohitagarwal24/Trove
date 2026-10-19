import { resultRetentionHours } from "@/lib/config";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { scopedRows } from "./data-scope";
import type { DataRow } from "@/lib/catalogue";
import { hash, decrypt } from "@/lib/crypto";
import { assert } from "@/lib/errors";
import { eligibility, requiredFields, publicSeller } from "./catalog";
import type { Actor } from "./auth";
import type { Requirements } from "@/lib/types";
export const quoteInclude = {
  lines: {
    include: { offer: { include: { seller: { select: publicSeller } } } },
  },
} satisfies Prisma.QuoteInclude;
export type FullQuote = Prisma.QuoteGetPayload<{
  include: typeof quoteInclude;
}>;
export async function getQuote(actor: Actor, id: string) {
  const quote = await db.quote.findFirst({
    where: { id, workspaceId: actor.workspaceId },
    include: quoteInclude,
  });
  assert(quote, "NOT_FOUND", "Quote not found in this workspace.", 404);
  return quote;
}
export async function createQuote(
  actor: Actor,
  input: {
    offerIds: string[];
    taskId?: string;
    quantity?: number;
    fieldsByOffer?: Record<string, string[]>;
    purpose?: string;
  },
) {
  assert(
    input.offerIds.length > 0 &&
      input.offerIds.length <= 6 &&
      new Set(input.offerIds).size === input.offerIds.length,
    "INVALID_SELECTION",
    "Choose between one and six distinct offers.",
  );
  const task = input.taskId
    ? await db.taskRun.findFirst({
        where: { id: input.taskId, workspaceId: actor.workspaceId },
      })
    : null;
  assert(!input.taskId || task, "NOT_FOUND", "Task not found.", 404);
  const requirements = task?.requirements as unknown as
    Requirements | undefined;
  const purpose =
    requirements?.purpose || input.purpose || "internal_business_analysis";
  const offers = await db.offerVersion.findMany({
    where: {
      id: { in: input.offerIds },
      current: true,
      seller: { status: "active" },
      datasetId: { not: null },
    },
    include: { seller: { select: publicSeller } },
  });
  assert(
    offers.length === input.offerIds.length,
    "NOT_FOUND",
    "One or more offers no longer exist.",
    404,
  );
  if (requirements) {
    const advertised = await db.offerVersion.findMany({
      where: {
        current: true,
        available: true,
        category: { in: requirements.categories },
        seller: { status: "active" },
      },
      select: { fields: true },
    });
    const known = new Set(advertised.flatMap((o) => o.fields));
    assert(
      requirements.fields.every((f) => known.has(f)),
      "UNSUPPORTED_FIELDS",
      "The requested fields are not available from these sources.",
    );
  }
  const bps = Number(process.env.PLATFORM_COMMISSION_BPS || 1000);
  assert(
    Number.isInteger(bps) && bps >= 0 && bps <= 10000,
    "INVALID_CONFIG",
    "Commission configuration is invalid.",
    500,
  );
  const datasets = await db.datasetSnapshot.findMany({
    where: {
      id: { in: offers.flatMap((o) => (o.datasetId ? [o.datasetId] : [])) },
    },
  });
  const lines = offers
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((offer) => {
      assert(
        offer.current && offer.available && !!offer.datasetId,
        "OFFER_UNAVAILABLE",
        "An offer changed or is unavailable. Review a new quote.",
      );
      assert(
        offer.purposes.includes(purpose),
        "LICENCE_RESTRICTED",
        "This offer does not permit your intended use.",
      );
      if (requirements) {
        const reason = eligibility(offer, requirements);
        assert(
          !reason,
          "INELIGIBLE_OFFER",
          reason || "Offer does not satisfy the task.",
        );
      }
      const fields =
        input.fieldsByOffer?.[offer.id] ||
        (requirements
          ? requiredFields(offer.category, requirements)
          : offer.fields);
      const effectiveFields = fields.length
        ? [...new Set(fields)]
        : offer.fields;
      assert(
        effectiveFields.every(
          (f) => offer.fields.includes(f) && !offer.prohibited.includes(f),
        ),
        "PROHIBITED_FIELD",
        "Requested fields are not permitted by the seller.",
      );
      const dataset = datasets.find((d) => d.id === offer.datasetId);
      assert(
        dataset,
        "DATASET_UNAVAILABLE",
        "Source data is temporarily unavailable.",
        503,
      );
      const filters = (requirements?.filters || []).filter(
        (f) => f.category === offer.category,
      );
      const matched = scopedRows(
        decrypt<DataRow[]>(dataset.encryptedData),
        offer.fields,
        filters,
      );
      assert(
        matched.length > 0,
        "NO_MATCHING_DATA",
        "No records match this request in the available source batch. No purchase was created.",
        422,
      );
      const quantity = Math.min(
        matched.length,
        input.quantity || requirements?.quantity || offer.recordLimit,
        offer.recordLimit,
      );
      assert(
        Number.isInteger(quantity) && quantity > 0,
        "INVALID_QUANTITY",
        "Quantity must be a positive bounded integer.",
      );
      return {
        offerVersionId: offer.id,
        sellerId: offer.sellerId,
        fields: effectiveFields,
        quantity,
        priceCents: offer.priceCents,
        sellerCents:
          offer.priceCents - Math.round((offer.priceCents * bps) / 10000),
        snapshot: {
          title: offer.title,
          sellerName: offer.seller.name,
          version: offer.version,
          license: offer.license,
          freshnessAt: offer.freshnessAt.toISOString(),
          coverage: offer.coverage,
          accessHours: resultRetentionHours(),
          datasetId: offer.datasetId,
          contentHash: dataset.contentHash,
          rowIndexes: matched.slice(0, quantity).map((r) => r.index),
          filters,
          purpose,
          sourceUrl: offer.sourceUrl,
          sourceLicenseUrl: offer.sourceLicenseUrl,
          sourceAttribution: offer.sourceAttribution,
          retrievedAt: offer.retrievedAt?.toISOString(),
          schema: offer.schema,
        },
      };
    });
  const totalCents = lines.reduce((s, l) => s + l.priceCents, 0);
  assert(
    !task ||
      totalCents <= task.budgetCents - task.spentCents - task.reservedCents,
    "BUDGET_EXCEEDED",
    "This quote exceeds the remaining task budget.",
  );
  const expiresAt = new Date(Date.now() + 5 * 60000);
  return db.quote.create({
    data: {
      workspaceId: actor.workspaceId,
      taskId: task?.id,
      purpose,
      totalCents,
      commissionCents: lines.reduce(
        (s, l) => s + l.priceCents - l.sellerCents,
        0,
      ),
      expiresAt,
      planHash: hash(JSON.stringify({ lines, purpose, totalCents, expiresAt })),
      lines: { create: lines },
    },
    include: quoteInclude,
  });
}
