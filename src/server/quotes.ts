import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { hash } from "@/lib/crypto";
import { assert } from "@/lib/errors";
import { eligibility, requiredFields } from "./catalog";
import type { Actor } from "./auth";
import type { Requirements } from "@/lib/types";
export const quoteInclude = {
  lines: { include: { offer: { include: { seller: true } } } },
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
    where: { id: { in: input.offerIds } },
    include: { seller: true },
  });
  assert(
    offers.length === input.offerIds.length,
    "NOT_FOUND",
    "One or more offers no longer exist.",
    404,
  );
  const bps = Number(process.env.PLATFORM_COMMISSION_BPS || 1000);
  assert(
    Number.isInteger(bps) && bps >= 0 && bps <= 10000,
    "INVALID_CONFIG",
    "Commission configuration is invalid.",
    500,
  );
  const lines = offers
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((offer) => {
      assert(
        offer.current && offer.available,
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
      const quantity = Math.min(
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
          synthetic: offer.seller.synthetic,
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
