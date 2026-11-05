import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { encrypt, decrypt, hash } from "@/lib/crypto";
import { assert } from "@/lib/errors";
import {
  providerDefinitions,
  sourceDefinitions,
  sourceAttribution,
  sourceLicenseUrl,
  dataLicense,
  type DataRow,
} from "@/lib/catalogue";
const scalar = (v: unknown): string =>
  typeof v === "string" ? v : typeof v === "number" ? String(v) : "";
const date = (v: unknown) => {
  const s = scalar(v);
  return /^\d{8}$/.test(s)
    ? `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`
    : s;
};
type Raw = Record<string, any>;
// Publish a better fixed sample from the same stored snapshot, even when an upstream
// source is down. Preserve all dates, prices, licences and historical quote versions.
export async function upgradeSourcePreviews(
  source: (typeof sourceDefinitions)[number],
) {
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Seller" WHERE id = ${source.sellerId} FOR UPDATE`;
    let changed = false;
    for (const spec of source.offers) {
      const old = await tx.offerVersion.findFirst({
        where: { offerId: spec.key, sellerId: source.sellerId, current: true },
        include: { dataset: true },
      });
      if (!old?.dataset || old.dataset.sourceKey !== source.key) continue;
      const rows = decrypt<DataRow[]>(old.dataset.encryptedData);
      assert(
        hash(
          JSON.stringify({
            rows,
            updated: old.dataset.sourceUpdatedAt.toISOString(),
          }),
        ) === old.dataset.contentHash,
        "SOURCE_INVALID",
        "Stored source integrity check failed.",
        502,
      );
      const preview = rows
        .slice(0, 2)
        .map((row) =>
          Object.fromEntries(old.fields.map((field) => [field, row[field]])),
        );
      if (JSON.stringify(old.preview) === JSON.stringify(preview)) continue;
      const last = await tx.offerVersion.findFirstOrThrow({
        where: { offerId: spec.key },
        orderBy: { version: "desc" },
      });
      const { id: _id, createdAt: _created, dataset: _dataset, ...data } = old;
      await tx.offerVersion.update({
        where: { id: old.id },
        data: { current: false },
      });
      await tx.offerVersion.create({
        data: {
          ...data,
          version: last.version + 1,
          schema: data.schema as Prisma.InputJsonValue,
          preview: preview as Prisma.InputJsonValue,
        },
      });
      changed = true;
    }
    if (changed)
      await tx.auditEvent.create({
        data: {
          actor: "source-ingestion",
          resourceId: source.key,
          action: "source_preview_updated",
          reason:
            "Published fixed two-row samples from existing source snapshots; freshness and delivery data unchanged.",
        },
      });
    return changed;
  });
}
export function normalizeSource(key: string, records: Raw[]): DataRow[] {
  const rows: DataRow[] = [];
  for (const r of records) {
    if (key === "drug-approvals") {
      const approval =
        (r.submissions || [])
          .filter(
            (s: Raw) =>
              s.submission_type === "ORIG" && s.submission_status === "AP",
          )
          .map((s: Raw) => scalar(s.submission_status_date))
          .sort()[0] || "";
      for (const product of r.products || [])
        rows.push({
          application_number: scalar(r.application_number),
          sponsor_name: scalar(r.sponsor_name),
          brand_name: scalar(product.brand_name),
          active_ingredients: (product.active_ingredients || [])
            .map((a: Raw) => `${scalar(a.name)} ${scalar(a.strength)}`.trim())
            .join("; "),
          dosage_form: scalar(product.dosage_form),
          route: scalar(product.route),
          marketing_status: scalar(product.marketing_status),
          approval_date: date(approval),
          source_url: `https://api.fda.gov/drug/drugsfda.json?search=application_number:${encodeURIComponent(scalar(r.application_number))}`,
        });
    } else if (key === "drug-recalls") {
      rows.push(
        Object.fromEntries(
          [
            "recall_number",
            "product_description",
            "recalling_firm",
            "classification",
            "status",
            "reason_for_recall",
            "recall_initiation_date",
            "report_date",
            "distribution_pattern",
          ].map((f) => [f, f.endsWith("date") ? date(r[f]) : scalar(r[f])]),
        ) as DataRow,
      );
      rows[rows.length - 1].source_url =
        `https://api.fda.gov/drug/enforcement.json?search=recall_number:${encodeURIComponent(scalar(r.recall_number))}`;
    } else {
      rows.push({
        event_id: scalar(r.res_event_number || r.event_id || r.id),
        product_description: scalar(r.product_description),
        firm_name: scalar(r.recalling_firm || r.firm_name),
        product_code: scalar(r.product_code),
        reason_for_recall: scalar(r.reason_for_recall),
        root_cause: scalar(r.root_cause_description),
        event_date_initiated: date(r.event_date_initiated),
        action: scalar(r.action),
        source_url: `https://api.fda.gov/device/recall.json?search=res_event_number:${encodeURIComponent(scalar(r.res_event_number))}`,
      });
    }
  }
  const unique = new Map(rows.map((row) => [hash(JSON.stringify(row)), row]));
  return [...unique.values()].slice(0, 200);
}
export async function syncSources(force = false) {
  const results: {
    source: string;
    rows?: number;
    changed?: boolean;
    error?: string;
  }[] = [];
  for (const provider of providerDefinitions)
    await db.seller.upsert({
      where: { id: provider.id },
      update: {},
      create: { ...provider, status: "active" },
    });
  for (const source of sourceDefinitions) {
    try {
      const previewUpdated = await upgradeSourcePreviews(source);
      const latest = await db.datasetSnapshot.findFirst({
        where: { sourceKey: source.key, sellerId: source.sellerId },
        orderBy: { retrievedAt: "desc" },
      });
      const previewsCurrent = await db.offerVersion.findMany({
        where: {
          offerId: { in: source.offers.map((offer) => offer.key) },
          current: true,
        },
        select: { fields: true, preview: true },
      });
      const completePreviews =
        previewsCurrent.length === source.offers.length &&
        previewsCurrent.every((offer) => {
          const preview = offer.preview;
          return (
            Array.isArray(preview) &&
            preview.length > 0 &&
            preview[0] !== null &&
            typeof preview[0] === "object" &&
            offer.fields.every((field) =>
              Object.hasOwn(preview[0] as object, field),
            )
          );
        });
      if (
        !force &&
        completePreviews &&
        latest &&
        Date.now() - latest.retrievedAt.getTime() < 24 * 3600000
      ) {
        if (previewUpdated)
          results.push({
            source: source.key,
            changed: true,
            rows: latest.rowCount,
          });
        continue;
      }
      const response = await fetch(source.endpoint, {
        signal: AbortSignal.timeout(30000),
        headers: { Accept: "application/json" },
      });
      assert(
        response.ok,
        "SOURCE_UNAVAILABLE",
        `Source request failed (${response.status}).`,
        502,
      );
      const body = await response.json();
      assert(
        Array.isArray(body.results) && body.results.length > 0,
        "SOURCE_INVALID",
        "Source returned no records.",
        502,
      );
      const rows = normalizeSource(source.key, body.results);
      assert(
        rows.length >= 2,
        "SOURCE_INVALID",
        "Not enough records to publish.",
        502,
      );
      const retrievedAt = new Date(),
        updated = new Date(date(body.meta?.last_updated));
      assert(
        Number.isFinite(updated.getTime()) && updated <= retrievedAt,
        "SOURCE_INVALID",
        "Source update timestamp is missing or invalid.",
        502,
      );
      const contentHash = hash(
        JSON.stringify({ rows, updated: updated.toISOString() }),
      );
      if (latest?.contentHash === contentHash && completePreviews) {
        results.push({ source: source.key, rows: rows.length, changed: false });
        continue;
      }
      await db.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM "Seller" WHERE id = ${source.sellerId} FOR UPDATE`;
        const dataset = await tx.datasetSnapshot.upsert({
          where: {
            sellerId_sourceKey_contentHash: {
              sellerId: source.sellerId,
              sourceKey: source.key,
              contentHash,
            },
          },
          update: {},
          create: {
            sellerId: source.sellerId,
            sourceKey: source.key,
            sourceUrl: source.documentation,
            licenseUrl: sourceLicenseUrl,
            attribution: sourceAttribution,
            retrievedAt,
            sourceUpdatedAt: updated,
            contentHash,
            rowCount: rows.length,
            encryptedData: encrypt(rows),
          },
        });
        for (const spec of source.offers) {
          const old = await tx.offerVersion.findFirst({
            where: { offerId: spec.key, current: true },
          });
          const fields =
            old?.fields ||
            (spec.fields.length ? [...spec.fields] : [...source.fields]);
          // A fixed two-row sample is published with the offer, independent of buyer filters.
          const preview = rows
            .slice(0, 2)
            .map((row) =>
              Object.fromEntries(fields.map((field) => [field, row[field]])),
            );
          if (
            old?.datasetId === dataset.id &&
            JSON.stringify(old.preview) === JSON.stringify(preview)
          )
            continue;
          const last = await tx.offerVersion.findFirst({
            where: { offerId: spec.key },
            orderBy: { version: "desc" },
          });
          if (old)
            await tx.offerVersion.update({
              where: { id: old.id },
              data: { current: false },
            });
          await tx.offerVersion.create({
            data: {
              offerId: spec.key,
              sellerId: source.sellerId,
              version: (last?.version || 0) + 1,
              title: spec.title,
              description: spec.description,
              category: source.category,
              tags: [
                "Regulatory intelligence",
                "United States",
                "Source-linked",
              ],
              priceCents: old?.priceCents ?? spec.priceCents,
              recordLimit: Math.min(rows.length, spec.limit),
              fields,
              prohibited: [
                "personal_email",
                "patient_id",
                "private_contact",
                "raw_identifiers",
              ],
              purposes: old?.purposes || [
                "internal_business_analysis",
                "ai_inference",
                "academic_research",
              ],
              license: dataLicense,
              coverage: "United States",
              freshnessAt: updated,
              retrievedAt,
              sourceUrl: source.documentation,
              sourceLicenseUrl,
              sourceAttribution,
              datasetId: dataset.id,
              available: old?.available ?? true,
              schema: {
                type: "object",
                fields: fields.map((name) => ({ name, type: "string" })),
              },
              preview: preview as Prisma.InputJsonValue,
            },
          });
        }
        await tx.auditEvent.create({
          data: {
            actor: "source-ingestion",
            resourceId: dataset.id,
            action: "source_snapshot_imported",
            reason: `${source.key}: ${rows.length} records; ${contentHash}`,
          },
        });
      });
      results.push({ source: source.key, rows: rows.length, changed: true });
    } catch (error) {
      // Preserve the last valid immutable snapshot; never manufacture freshness or fallback rows.
      results.push({
        source: source.key,
        error: error instanceof Error ? error.message : "Source unavailable",
      });
    }
  }
  return results;
}
