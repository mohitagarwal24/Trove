import { Prisma } from "@prisma/client";
import { Client } from "@elastic/elasticsearch";
import { db } from "@/lib/db";
import { assert } from "@/lib/errors";
import { sourceDefinitions } from "@/lib/catalogue";
import type { Requirements } from "@/lib/types";
export const publicSeller = {
  id: true,
  name: true,
  initials: true,
  color: true,
  description: true,
} as const;
const elastic = () =>
  process.env.ELASTICSEARCH_URL
    ? new Client({
        node: process.env.ELASTICSEARCH_URL,
        requestTimeout: 1200,
        maxRetries: 0,
        ...(process.env.ELASTICSEARCH_API_KEY
          ? { auth: { apiKey: process.env.ELASTICSEARCH_API_KEY } }
          : {}),
      })
    : null;
export async function rankMetadata(query: string) {
  if (!query.trim()) return [];
  return db.$queryRaw<{ id: string; rank: number }[]>(Prisma.sql`
    SELECT o.id, ts_rank_cd(to_tsvector('english', o.title || ' ' || o.description || ' ' || o.category || ' ' || o.coverage), websearch_to_tsquery('english', ${query}))::float8 AS rank
    FROM "OfferVersion" o JOIN "Seller" s ON s.id=o."sellerId"
    WHERE o.current=true AND o."datasetId" IS NOT NULL AND s.status='active'
      AND (to_tsvector('english', o.title || ' ' || o.description || ' ' || o.category || ' ' || o.coverage) @@ websearch_to_tsquery('english', ${query})
        OR o.title ILIKE ${"%" + query + "%"} OR s.name ILIKE ${"%" + query + "%"} OR ${query}=ANY(o.fields))
    ORDER BY rank DESC, o.id LIMIT 200`);
}
export async function searchOffers(
  input: { query?: string; category?: string } = {},
) {
  let ids: string[] | undefined;
  let engine = "postgres";
  const client = elastic();
  if (client && input.query) {
    try {
      const result = await client.search({
        index: process.env.ELASTICSEARCH_INDEX || "trove-offers",
        size: 100,
        query: {
          multi_match: {
            query: input.query,
            fields: ["title^3", "description", "tags", "coverage"],
            type: "best_fields",
            operator: "and",
          },
        },
      });
      if (result.hits.hits.length) {
        ids = result.hits.hits.map((hit) => hit._id!);
        engine = "elasticsearch";
      } else engine = "postgres_fallback";
    } catch {
      engine = "postgres_fallback";
    }
  }
  if (!ids && input.query)
    ids = (await rankMetadata(input.query)).map((r) => r.id);
  const offers = await db.offerVersion.findMany({
    where: {
      current: true,
      seller: { status: "active" },
      datasetId: { not: null },
      ...(input.category && input.category !== "All data"
        ? { category: input.category }
        : {}),
      ...(ids ? { id: { in: ids } } : {}),
    },
    include: { seller: { select: publicSeller } },
    orderBy: { createdAt: "asc" },
  });
  if (ids) {
    const order = new Map(ids.map((id, index) => [id, index]));
    offers.sort((a, b) => order.get(a.id)! - order.get(b.id)!);
  }
  return { offers, engine };
}
export const getOffer = async (id: string) => {
  const offer = await db.offerVersion.findFirst({
    where: {
      id,
      current: true,
      seller: { status: "active" },
      datasetId: { not: null },
    },
    include: { seller: { select: publicSeller } },
  });
  assert(offer, "NOT_FOUND", "This offer does not exist.", 404);
  return offer;
};
const categoryFields: Record<string, readonly string[]> = Object.fromEntries(
  sourceDefinitions.map((s) => [s.category, s.fields]),
);
export function requiredFields(category: string, requirements: Requirements) {
  const scoped = requirements.needs?.find((need) => need.category === category);
  if (scoped) return scoped.fields;
  return requirements.fields.filter(
    (f) =>
      categoryFields[category]?.includes(f) ||
      !Object.values(categoryFields).some((fields) => fields.includes(f)),
  );
}
export function eligibility(
  offer: Awaited<ReturnType<typeof getOffer>>,
  requirements: Requirements,
  now = Date.now(),
) {
  const maxAgeDays =
    requirements.needs?.find((n) => n.category === offer.category)
      ?.maxAgeDays ?? requirements.maxAgeDays;
  if (!offer.available) return "Seller has paused this offer.";
  if (!offer.purposes.includes(requirements.purpose))
    return "Licence does not permit the requested business use.";
  if (now - offer.freshnessAt.getTime() > maxAgeDays * 86400000)
    return `Declared snapshot is older than the ${maxAgeDays}-day freshness requirement.`;
  const filterFields = (requirements.filters || [])
    .filter((f) => f.category === offer.category)
    .map((f) => f.field);
  if (filterFields.some((f) => !offer.fields.includes(f)))
    return "Required filter fields are not included in this offer.";
  const missing = requiredFields(offer.category, requirements).filter(
    (f) => !offer.fields.includes(f),
  );
  if (missing.length)
    return `Required fields unavailable: ${missing.join(", ")}.`;
  if (requirements.fields.some((f) => offer.prohibited.includes(f)))
    return "The requested field is prohibited and cannot be purchased.";
  return null;
}
export async function indexCatalog() {
  const client = elastic();
  assert(
    client,
    "NOT_CONFIGURED",
    "Set ELASTICSEARCH_URL before indexing.",
    503,
  );
  const index = process.env.ELASTICSEARCH_INDEX || "trove-offers";
  if (!(await client.indices.exists({ index })))
    await client.indices.create({
      index,
      mappings: {
        dynamic: "strict",
        properties: {
          title: { type: "text" },
          description: { type: "text" },
          tags: { type: "text" },
          category: { type: "keyword" },
          coverage: { type: "text" },
          priceCents: { type: "integer" },
          purposes: { type: "keyword" },
          freshnessAt: { type: "date" },
        },
      },
    });
  const offers = await db.offerVersion.findMany({
    where: {
      current: true,
      seller: { status: "active" },
      datasetId: { not: null },
    },
  });
  const result = await client.bulk({
    refresh: true,
    operations: offers.flatMap((o) => [
      { index: { _index: index, _id: o.id } },
      {
        title: o.title,
        description: o.description,
        tags: o.tags,
        category: o.category,
        coverage: o.coverage,
        priceCents: o.priceCents,
        purposes: o.purposes,
        freshnessAt: o.freshnessAt.toISOString(),
      },
    ]),
  });
  assert(
    !result.errors,
    "INDEX_FAILED",
    "Elasticsearch rejected one or more metadata documents.",
    502,
  );
  return offers.length;
}
