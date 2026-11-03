import { db } from "@/lib/db";
import { paymentEnvironment } from "@/lib/config";
import type { Actor } from "./auth";
import type { LibraryEntry } from "@/lib/types";

export async function listLibrary(actor: Actor, query = "", cursor?: string) {
  const search = query.trim().slice(0, 200);
  const purchases = await db.purchase.findMany({
    where: {
      workspaceId: actor.workspaceId,
      mode: paymentEnvironment(),
      paymentState: "captured",
      entitlement: { is: { revokedAt: null } },
      ...(search
        ? {
            quote: {
              lines: {
                some: {
                  OR: [
                    {
                      offer: {
                        title: {
                          contains: search,
                          mode: "insensitive" as const,
                        },
                      },
                    },
                    {
                      offer: {
                        category: {
                          contains: search,
                          mode: "insensitive" as const,
                        },
                      },
                    },
                    {
                      offer: {
                        seller: {
                          name: {
                            contains: search,
                            mode: "insensitive" as const,
                          },
                        },
                      },
                    },
                    { fields: { has: search } },
                  ],
                },
              },
            },
          }
        : {}),
      ...(cursor ? { id: { lt: cursor } } : {}),
    },
    orderBy: { id: "desc" },
    take: 21,
    include: {
      quote: {
        include: {
          lines: { include: { offer: { include: { seller: true } } } },
        },
      },
    },
  });
  const page = purchases.slice(0, 20);
  const current = await db.offerVersion.findMany({
    where: {
      current: true,
      available: true,
      seller: { status: "active" },
      datasetId: { not: null },
      offerId: {
        in: page.flatMap((p) => p.quote.lines.map((l) => l.offer.offerId)),
      },
    },
    select: { id: true, offerId: true, version: true },
  });
  const items: LibraryEntry[] = page.flatMap((p) =>
    p.quote.lines
      .filter(
        (line) =>
          !search ||
          [
            line.offer.title,
            line.offer.category,
            line.offer.seller.name,
            ...line.fields,
          ].some((value) => value.toLowerCase().includes(search.toLowerCase())),
      )
      .map((line) => {
        const snapshot = line.snapshot as {
          title: string;
          sellerName: string;
          version: number;
          freshnessAt: string;
          sourceUrl?: string;
        };
        const latest = current.find(
          (o) =>
            o.offerId === line.offer.offerId && o.version > snapshot.version,
        );
        return {
          id: line.id,
          purchaseId: p.id,
          title: snapshot.title,
          category: line.offer.category,
          seller: snapshot.sellerName,
          purchasedAt: p.createdAt.toISOString(),
          version: snapshot.version,
          fields: line.fields,
          quantity: line.quantity,
          priceCents: line.priceCents,
          purpose: p.quote.purpose,
          sourceUrl: snapshot.sourceUrl || null,
          freshnessAt: snapshot.freshnessAt,
          currentVersion: latest
            ? { id: latest.id, version: latest.version }
            : null,
        };
      }),
  );
  return { items, nextCursor: purchases.length > 20 ? page.at(-1)!.id : null };
}
