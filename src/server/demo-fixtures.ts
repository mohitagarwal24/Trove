import { db } from "@/lib/db";
import { offerFixtures } from "@/lib/fixtures";
import { Prisma } from "@prisma/client";

/** Reissue explicitly synthetic scenarios daily, preserving historical quote versions and seller edits. */
export async function refreshDemoFixtures(now = new Date()) {
  if (process.env.TROVE_DEMO_ENABLED !== "true") return 0;
  let published = 0;
  for (const fixture of offerFixtures) {
    const declared = new Date(now.getTime() - fixture.ageHours * 3600000);
    const cutoff = new Date(declared.getTime() - 86400000);
    const changed = await db.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<
        { id: string }[]
      >`SELECT id FROM "OfferVersion" WHERE "offerId" = ${fixture.offerId} AND current = true AND "freshnessAt" < ${cutoff} FOR UPDATE`;
      if (!rows[0]) return false;
      const old = await tx.offerVersion.findUniqueOrThrow({
        where: { id: rows[0].id },
        include: { seller: true },
      });
      if (!old.seller.synthetic) return false;
      const { id: _id, seller: _seller, createdAt: _created, ...data } = old;
      await tx.offerVersion.update({
        where: { id: old.id },
        data: { current: false },
      });
      const next = await tx.offerVersion.create({
        data: {
          ...data,
          version: old.version + 1,
          freshnessAt: declared,
          schema: old.schema as Prisma.InputJsonValue,
          preview: old.preview as Prisma.InputJsonValue,
        },
      });
      await tx.auditEvent.create({
        data: {
          actor: "synthetic-fixture-generator",
          resourceId: next.id,
          action: "synthetic_scenario_reissued",
          reason:
            "Daily synthetic scenario refresh; no claim of new real-world evidence.",
        },
      });
      if (process.env.ELASTICSEARCH_URL)
        await tx.job.create({
          data: { key: `index:${next.id}`, type: "index", resourceId: next.id },
        });
      return true;
    });
    if (changed) published++;
  }
  return published;
}
