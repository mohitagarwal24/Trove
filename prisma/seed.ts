import { db } from "../src/lib/db";
import { passwordHash } from "../src/lib/crypto";
import { sellers, offerFixtures, fixtureRows } from "../src/lib/fixtures";
async function main() {
  const buyer = await db.user.upsert({
    where: { email: "buyer@trove.test" },
    update: {},
    create: {
      id: "demo-buyer",
      email: "buyer@trove.test",
      name: "Alex Morgan",
      passwordHash: passwordHash("trove-demo-buyer"),
    },
  });
  await db.workspace.upsert({
    where: { id: "workspace-demo" },
    update: {},
    create: { id: "workspace-demo", name: "Personal workspace" },
  });
  await db.membership.upsert({
    where: {
      workspaceId_userId: { workspaceId: "workspace-demo", userId: buyer.id },
    },
    update: {},
    create: { workspaceId: "workspace-demo", userId: buyer.id, role: "owner" },
  });
  const other = await db.user.upsert({
    where: { email: "researcher@trove.test" },
    update: {},
    create: {
      id: "demo-other",
      email: "researcher@trove.test",
      name: "Jamie Chen",
      passwordHash: passwordHash("trove-demo-buyer"),
    },
  });
  await db.workspace.upsert({
    where: { id: "workspace-other" },
    update: {},
    create: { id: "workspace-other", name: "Independent workspace" },
  });
  await db.membership.upsert({
    where: {
      workspaceId_userId: { workspaceId: "workspace-other", userId: other.id },
    },
    update: {},
    create: { workspaceId: "workspace-other", userId: other.id, role: "owner" },
  });
  for (const seller of sellers) {
    await db.seller.upsert({
      where: { id: seller.id },
      update: {},
      create: seller,
    });
    const email = seller.id.replace("seller-", "") + "@trove.test";
    const user = await db.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        name: seller.name,
        role: "seller",
        sellerId: seller.id,
        passwordHash: passwordHash("trove-demo-seller"),
      },
    });
    const workspaceId = "workspace-" + seller.id;
    await db.workspace.upsert({
      where: { id: workspaceId },
      update: {},
      create: { id: workspaceId, name: seller.name },
    });
    await db.membership.upsert({
      where: { workspaceId_userId: { workspaceId, userId: user.id } },
      update: {},
      create: { workspaceId, userId: user.id, role: "owner" },
    });
  }
  for (const item of offerFixtures) {
    const { ageHours, ...offer } = item;
    const seller = sellers.find((s) => s.id === item.sellerId)!;
    const rows = fixtureRows[
      seller.connectorId as keyof typeof fixtureRows
    ] as Record<string, string | number>[];
    const preview = rows
      .slice(0, 2)
      .map((row) =>
        Object.fromEntries(item.fields.slice(0, 4).map((f) => [f, row[f]])),
      );
    await db.offerVersion.upsert({
      where: { offerId_version: { offerId: item.offerId, version: 1 } },
      update: {},
      create: {
        id: item.offerId + "-v1",
        ...offer,
        version: 1,
        freshnessAt: new Date(Date.now() - ageHours * 3600000),
        prohibited: ["personal_email", "private_contact", "raw_identifiers"],
        license:
          "Internal analysis and AI inference only. No training or redistribution. Attribute the provider. Synthetic demonstration data.",
        schema: {
          type: "object",
          fields: item.fields.map((name) => ({
            name,
            type: [
              "price_usd",
              "minimum_order",
              "lead_time_days",
              "supplier_count",
              "demand_index",
              "median_price_usd",
              "sample_size",
            ].includes(name)
              ? "number"
              : "string",
          })),
        },
        preview,
      },
    });
  }
  console.log(
    "Seeded 3 fictional sellers, 8 versioned offers and isolated demonstration accounts. Existing seller edits preserved.",
  );
}
main().finally(() => db.$disconnect());
