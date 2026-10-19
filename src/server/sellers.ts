import { randomUUID } from "node:crypto";
import { hash, encrypt } from "@/lib/crypto";
import type { DataRow } from "@/lib/catalogue";
import { db } from "@/lib/db";
import { assert } from "@/lib/errors";
import type { Actor } from "./auth";
import { requireBrowser } from "./auth";
export async function sellerDashboard(actor: Actor) {
  assert(
    actor.role === "seller" && actor.sellerId,
    "SELLER_REQUIRED",
    "Sign in with a seller account to manage your offers.",
    403,
  );
  const seller = await db.seller.findUniqueOrThrow({
    where: { id: actor.sellerId },
    include: {
      offers: { where: { current: true }, orderBy: { createdAt: "asc" } },
      payables: {
        include: {
          payout: true,
          purchase: {
            select: {
              id: true,
              mode: true,
              paymentState: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  return seller;
}
export async function editOffer(
  actor: Actor,
  id: string,
  input: {
    priceCents: number;
    available: boolean;
    fields: string[];
    purposes: string[];
  },
) {
  requireBrowser(actor);
  assert(
    actor.role === "seller" && actor.sellerId,
    "FORBIDDEN",
    "Seller access is required.",
    403,
  );
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "OfferVersion" WHERE id = ${id} FOR UPDATE`;
    const old = await tx.offerVersion.findFirst({
      where: { id, sellerId: actor.sellerId!, current: true },
    });
    assert(
      old,
      "NOT_FOUND",
      "Offer is not available in this seller account.",
      404,
    );
    assert(
      input.fields.length &&
        input.fields.every(
          (f) => old.fields.includes(f) && !old.prohibited.includes(f),
        ),
      "PROHIBITED_FIELD",
      "Only currently permitted fields may be retained. New field capabilities require an approved connector update.",
    );
    assert(
      input.purposes.length &&
        input.purposes.every((p) =>
          [
            "internal_business_analysis",
            "ai_inference",
            "academic_research",
          ].includes(p),
        ),
      "INVALID_PURPOSE",
      "Choose supported permitted uses.",
    );
    await tx.offerVersion.update({ where: { id }, data: { current: false } });
    const { id: _id, createdAt: _createdAt, ...data } = old;
    const schema = old.schema as {
      type: string;
      fields: { name: string; type: string }[];
    };
    const next = await tx.offerVersion.create({
      data: {
        ...data,
        ...input,
        current: true,
        version: old.version + 1,
        schema: {
          ...schema,
          fields: schema.fields.filter((f) => input.fields.includes(f.name)),
        },
        license: old.license,
        preview: (old.preview as Record<string, string | number>[]).map((row) =>
          Object.fromEntries(
            Object.entries(row).filter(([key]) => input.fields.includes(key)),
          ),
        ),
      },
    });
    await tx.auditEvent.create({
      data: {
        actor: actor.id,
        resourceId: next.id,
        action: "offer_version_created",
        reason: `Replaces ${id}`,
      },
    });
    if (process.env.ELASTICSEARCH_URL)
      await tx.job.create({
        data: { key: `index:${next.id}`, type: "index", resourceId: next.id },
      });
    return next;
  });
}

export async function onboardSeller(
  actor: Actor,
  input: { name: string; description: string; rightsAttested: boolean },
) {
  requireBrowser(actor);
  assert(
    input.rightsAttested,
    "RIGHTS_REQUIRED",
    "Confirm your right to distribute the data.",
  );
  assert(
    !actor.sellerId,
    "ALREADY_SELLER",
    "Your provider profile already exists.",
    409,
  );
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${actor.id} FOR UPDATE`;
    const user = await tx.user.findUniqueOrThrow({ where: { id: actor.id } });
    assert(
      !user.sellerId,
      "ALREADY_SELLER",
      "Your provider profile already exists.",
      409,
    );
    const seller = await tx.seller.create({
      data: {
        id: randomUUID(),
        name: input.name,
        description: input.description,
        initials: input.name
          .split(/\s+/)
          .map((n) => n[0])
          .slice(0, 2)
          .join("")
          .toUpperCase(),
        color: "blue",
        connectorId: "uploaded-dataset",
        status: "pending",
      },
    });
    await tx.user.update({
      where: { id: actor.id },
      data: { sellerId: seller.id, role: "seller" },
    });
    await tx.auditEvent.create({
      data: {
        actor: actor.id,
        resourceId: seller.id,
        action: "provider_review_requested",
      },
    });
    return { id: seller.id, status: seller.status };
  });
}
export async function publishDataset(
  actor: Actor,
  input: {
    title: string;
    description: string;
    category: string;
    priceCents: number;
    sourceUrl: string;
    licenseUrl: string;
    attribution: string;
    sourceUpdatedAt: string;
    rows: DataRow[];
    rightsAttested: boolean;
    aiProcessing?: boolean;
  },
) {
  requireBrowser(actor);
  assert(
    input.rightsAttested,
    "RIGHTS_REQUIRED",
    "Confirm your right to distribute the data.",
  );
  assert(
    actor.role === "seller" && actor.sellerId,
    "SELLER_REQUIRED",
    "Create a provider profile first.",
    403,
  );
  const fields = Object.keys(input.rows[0]);
  assert(
    fields.length <= 30 &&
      fields.every(
        (f) =>
          /^[a-z][a-z0-9_]{0,49}$/.test(f) &&
          ![
            "personal_email",
            "patient_id",
            "private_contact",
            "raw_identifiers",
          ].includes(f),
      ),
    "INVALID_FIELDS",
    "Use up to 30 lowercase field names. Personal data fields are not accepted.",
  );
  assert(
    input.rows.every(
      (row) =>
        Object.keys(row).length === fields.length &&
        fields.every(
          (f) =>
            Object.hasOwn(row, f) && typeof row[f] === typeof input.rows[0][f],
        ),
    ),
    "INVALID_DATASET",
    "Every row must have the same fields and value types.",
  );
  const sourceUpdatedAt = new Date(input.sourceUpdatedAt);
  assert(
    Number.isFinite(sourceUpdatedAt.getTime()) && sourceUpdatedAt <= new Date(),
    "INVALID_DATE",
    "Source date must be valid and cannot be in the future.",
  );
  const contentHash = hash(
    JSON.stringify({
      rows: input.rows,
      updated: sourceUpdatedAt.toISOString(),
    }),
  );
  return db.$transaction(async (tx) => {
    const seller = await tx.seller.findUniqueOrThrow({
      where: { id: actor.sellerId! },
    });
    const key = randomUUID();
    const dataset = await tx.datasetSnapshot.create({
      data: {
        sellerId: seller.id,
        sourceKey: key,
        sourceUrl: input.sourceUrl,
        licenseUrl: input.licenseUrl,
        attribution: input.attribution,
        retrievedAt: new Date(),
        sourceUpdatedAt,
        contentHash,
        rowCount: input.rows.length,
        encryptedData: encrypt(input.rows),
      },
    });
    const offer = await tx.offerVersion.create({
      data: {
        offerId: key,
        version: 1,
        sellerId: seller.id,
        title: input.title,
        description: input.description,
        category: input.category,
        tags: [],
        priceCents: input.priceCents,
        recordLimit: Math.min(100, input.rows.length),
        fields,
        prohibited: [
          "personal_email",
          "patient_id",
          "private_contact",
          "raw_identifiers",
        ],
        purposes: [
          "internal_business_analysis",
          "academic_research",
          ...(input.aiProcessing ? ["ai_inference"] : []),
        ],
        license: `Source terms: ${input.licenseUrl}. ${input.attribution}`,
        coverage: "Provider-declared coverage; see description",
        freshnessAt: sourceUpdatedAt,
        retrievedAt: dataset.retrievedAt,
        datasetId: dataset.id,
        sourceUrl: input.sourceUrl,
        sourceLicenseUrl: input.licenseUrl,
        sourceAttribution: input.attribution,
        schema: {
          type: "object",
          fields: fields.map((name) => ({
            name,
            type: typeof input.rows[0][name],
          })),
        },
        preview: input.rows
          .slice(0, 2)
          .map((row) =>
            Object.fromEntries(fields.slice(0, 4).map((f) => [f, row[f]])),
          ),
        available: true,
      },
    });
    await tx.auditEvent.create({
      data: {
        actor: actor.id,
        resourceId: offer.id,
        action: "dataset_published",
        reason:
          seller.status === "active"
            ? "Provider approved"
            : "Not discoverable until provider review",
      },
    });
    if (process.env.ELASTICSEARCH_URL)
      await tx.job.create({
        data: { key: `index:${offer.id}`, type: "index", resourceId: offer.id },
      });
    return offer;
  });
}
