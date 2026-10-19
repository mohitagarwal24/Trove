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
        license: `Permitted purposes: ${input.purposes.join(", ")}. No training or redistribution. Attribute the provider. Synthetic demonstration data.`,
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
