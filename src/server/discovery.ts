import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import type { DataRow } from "@/lib/catalogue";
import { discoverySchema, type DiscoveryRequest } from "@/lib/research";
import { searchOffers, rankMetadata } from "./catalog";
import { scopedRows } from "./data-scope";
import { ownershipMatcher } from "./ownership";
import type { Actor } from "./auth";
import type { Decision, Requirements } from "@/lib/types";

/** Agents own the requirements. Trove evaluates availability and minimizes the cost of satisfying every need. */
export async function discoverData(
  actor: Actor,
  input: DiscoveryRequest,
  planner = "trove-search",
) {
  const request = discoverySchema.parse(input);
  const [{ offers, engine }, ranked] = await Promise.all([
    searchOffers(),
    rankMetadata(request.query),
  ]);
  const relevant = offers.filter((o) =>
    request.needs.some((n) => n.category === o.category),
  );
  const snapshots = await db.datasetSnapshot.findMany({
    where: {
      id: {
        in: [
          ...new Set(
            relevant.flatMap((o) => (o.datasetId ? [o.datasetId] : [])),
          ),
        ],
      },
    },
  });
  const rows = new Map<string, DataRow[]>();
  const terms = request.query.toLowerCase().match(/[a-z0-9_]+/g) || [];
  const matchOwned = await ownershipMatcher(actor.workspaceId);
  const candidates = (
    await Promise.all(
      relevant.map(async (offer) => {
        const need = request.needs.find((n) => n.category === offer.category)!;
        const missingFields = need.fields.filter(
          (f) => !offer.fields.includes(f) || offer.prohibited.includes(f),
        );
        let reason: string | null = null,
          code: string | null = null,
          availableRecords = 0;
        if (!offer.available) {
          code = "PAUSED";
          reason = "Provider has paused this offer.";
        } else if (!offer.purposes.includes(request.purpose)) {
          code = "LICENCE_RESTRICTED";
          reason = "Source terms do not permit the requested use.";
        } else if (missingFields.length) {
          code = "MISSING_FIELDS";
          reason = `Missing permitted fields: ${missingFields.join(", ")}.`;
        } else if (need.filters.some((f) => !offer.fields.includes(f.field))) {
          code = "UNSUPPORTED_FILTER";
          reason = "Required filter fields are unavailable.";
        } else if (
          Date.now() - offer.freshnessAt.getTime() >
          need.maxAgeDays * 86400000
        ) {
          code = "STALE";
          reason = `Source snapshot exceeds ${need.maxAgeDays} days.`;
        } else {
          try {
            const snapshot = snapshots.find((d) => d.id === offer.datasetId);
            if (!snapshot) throw new Error("Missing source snapshot");
            if (!rows.has(snapshot.id))
              rows.set(snapshot.id, decrypt<DataRow[]>(snapshot.encryptedData));
            const matches = scopedRows(
              rows.get(snapshot.id)!,
              offer.fields,
              need.filters.map((f) => ({ ...f, category: need.category })),
            );
            availableRecords = Math.min(matches.length, offer.recordLimit);
            if (availableRecords < need.quantity) {
              code = "INSUFFICIENT_RECORDS";
              reason = `Can deliver ${availableRecords} of the ${need.quantity} requested records.`;
            }
          } catch {
            code = "SOURCE_UNAVAILABLE";
            reason =
              "Source cannot currently be checked. No purchase is recommended.";
          }
        }
        const document = [
          offer.title,
          offer.description,
          offer.category,
          ...offer.fields,
          ...offer.tags,
        ]
          .join(" ")
          .toLowerCase();
        const owned =
          !reason && offer.datasetId
            ? await matchOwned({
                sellerId: offer.sellerId,
                fields: need.fields,
                snapshot: {
                  datasetId: offer.datasetId,
                  title: offer.title,
                  license: offer.license,
                  purpose: request.purpose,
                  rowIndexes: scopedRows(
                    rows.get(offer.datasetId)!,
                    offer.fields,
                    need.filters.map((f) => ({
                      ...f,
                      category: need.category,
                    })),
                  )
                    .slice(0, need.quantity)
                    .map((r) => r.index),
                },
              })
            : null;
        return {
          offerVersionId: offer.id,
          title: offer.title,
          category: offer.category,
          priceCents: owned ? 0 : offer.priceCents,
          listedPriceCents: offer.priceCents,
          acquisition: owned ? "owned" : "purchase",
          ownedPurchaseId: owned?.purchaseId || null,
          fields: offer.fields,
          sourceUrl: offer.sourceUrl,
          sourceLicenseUrl: offer.sourceLicenseUrl,
          freshnessAt: offer.freshnessAt,
          availableRecords,
          eligible: !reason,
          code,
          reason,
          metadataRelevance:
            (ranked.find((r) => r.id === offer.id)?.rank || 0) +
            terms.reduce((s, t) => s + Number(document.includes(t)), 0),
        };
      }),
    )
  ).sort(
    (a, b) =>
      Number(b.eligible) - Number(a.eligible) ||
      a.priceCents - b.priceCents ||
      b.metadataRelevance - a.metadataRelevance ||
      +b.freshnessAt - +a.freshnessAt ||
      a.offerVersionId.localeCompare(b.offerVersionId),
  );
  const chosen = request.needs
    .map((n) => candidates.find((c) => c.category === n.category && c.eligible))
    .filter((c): c is (typeof candidates)[number] => !!c);
  const gaps: { category: string; code: string; message: string }[] =
    request.needs
      .filter((n) => !chosen.some((c) => c.category === n.category))
      .map((n) => ({
        category: n.category,
        code: "NO_SUITABLE_SOURCE",
        message: `No available offer satisfies all requested ${n.category.toLowerCase()} fields, filters, freshness and quantity.`,
      }));
  const minimumTotalCents = chosen.reduce((sum, c) => sum + c.priceCents, 0);
  if (!gaps.length && minimumTotalCents > request.budgetCents)
    gaps.push({
      category: "Budget",
      code: "BUDGET_EXCEEDED",
      message: `Complete coverage costs $${(minimumTotalCents / 100).toFixed(2)}, above the $${(request.budgetCents / 100).toFixed(2)} limit. Request a larger budget or explicitly revise the requirements.`,
    });
  const selected = gaps.length ? [] : chosen;
  const decisions: Decision[] = candidates.map((c) => ({
    offerId: c.offerVersionId,
    title: c.title,
    selected: selected.some((s) => s.offerVersionId === c.offerVersionId),
    reason:
      c.reason ||
      (gaps.length
        ? "No complete purchase plan fits the current request."
        : selected.some((s) => s.offerVersionId === c.offerVersionId)
          ? c.ownedPurchaseId
            ? "Already purchased: reuse at no charge."
            : "Lowest-priced offer satisfying the exact requested scope."
          : "A lower-priced offer satisfies this category."),
  }));
  const requirements: Requirements = {
    categories: request.needs.map((n) => n.category),
    fields: [...new Set(request.needs.flatMap((n) => n.fields))],
    purpose: request.purpose,
    maxAgeDays: Math.max(...request.needs.map((n) => n.maxAgeDays)),
    quantity: Math.max(...request.needs.map((n) => n.quantity)),
    filters: request.needs.flatMap((n) =>
      n.filters.map((f) => ({ ...f, category: n.category })),
    ),
    needs: request.needs,
  };
  const task = await db.taskRun.create({
    data: {
      workspaceId: actor.workspaceId,
      prompt: request.query || "Agent-specified data requirements",
      budgetCents: request.budgetCents,
      requirements: requirements as unknown as Prisma.InputJsonValue,
      decisions,
      planner,
    },
  });
  return {
    task,
    engine,
    request,
    candidates,
    selectedOfferIds: selected.map((c) => c.offerVersionId),
    reusableSources: selected
      .filter((c) => c.ownedPurchaseId)
      .map((c) => ({
        offerVersionId: c.offerVersionId,
        purchaseId: c.ownedPurchaseId,
      })),
    totalCents: selected.length ? minimumTotalCents : null,
    minimumCompleteTotalCents:
      chosen.length === request.needs.length ? minimumTotalCents : null,
    gaps,
    nextAction: gaps.length
      ? "revise_requirements"
      : minimumTotalCents === 0
        ? "get_result"
        : "create_quote",
    notice:
      "Discovery returns metadata and availability only. No paid records are exposed and no payment is created.",
  };
}
