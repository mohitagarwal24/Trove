import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { decrypt, hash } from "@/lib/crypto";
import { assert } from "@/lib/errors";
import { paymentEnvironment } from "@/lib/config";
import type { DataRow } from "@/lib/catalogue";
import type { ReusedSource } from "@/lib/types";

type Scope = {
  sellerId: string;
  fields: string[];
  snapshot: Prisma.JsonValue | Record<string, unknown>;
};
type Binding = {
  datasetId?: string;
  rowIndexes?: number[];
  purpose?: string;
  license?: string;
  title?: string;
};

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, v]) => `${JSON.stringify(key)}:${canonical(v)}`)
      .join(",")}}`;
  return JSON.stringify(value) ?? "null";
}

/** Retrieval dates, row/key order and offer prices do not change the identity of a data batch. */
export function batchFingerprint(rows: DataRow[]) {
  return hash(
    rows
      .map((row) => hash(canonical(row)))
      .sort()
      .join("\n"),
  );
}

export async function ownershipMatcher(
  workspaceId: string,
  client: Prisma.TransactionClient = db,
  includePending = false,
) {
  const purchases = await client.purchase.findMany({
    where: {
      workspaceId,
      mode: paymentEnvironment(),
      cancelledAt: null,
      OR: [
        { paymentState: "captured", entitlement: { is: { revokedAt: null } } },
        ...(includePending
          ? [
              {
                paymentState: {
                  in: [
                    "awaiting_approval",
                    "authorized",
                    "capture_pending",
                    "reconciliation_required",
                    "void_pending",
                  ],
                },
              },
            ]
          : []),
      ],
    },
    include: { quote: { include: { lines: true } } },
    orderBy: { createdAt: "asc" },
  });
  const cache = new Map<
    string,
    { rows: DataRow[]; fingerprint: string } | null
  >();
  async function source(id: string | undefined) {
    if (!id) return null;
    if (!cache.has(id)) {
      const snapshot = await client.datasetSnapshot.findUnique({
        where: { id },
      });
      const rows = snapshot ? decrypt<DataRow[]>(snapshot.encryptedData) : null;
      cache.set(
        id,
        rows ? { rows, fingerprint: batchFingerprint(rows) } : null,
      );
    }
    return cache.get(id)!;
  }
  return async function match(
    scope: Scope,
  ): Promise<(ReusedSource & { pending: boolean }) | null> {
    const binding = scope.snapshot as Binding;
    const requested = await source(binding.datasetId);
    if (!requested || !binding.rowIndexes?.length) return null;
    const requestedHashes = binding.rowIndexes.map((i) =>
      hash(canonical(requested.rows[i])),
    );
    for (const purchase of purchases) {
      for (const line of purchase.quote.lines) {
        const owned = line.snapshot as Binding;
        if (
          line.sellerId !== scope.sellerId ||
          owned.purpose !== binding.purpose ||
          owned.license !== binding.license ||
          !scope.fields.every((f) => line.fields.includes(f))
        )
          continue;
        const original = await source(owned.datasetId);
        if (!original || original.fingerprint !== requested.fingerprint)
          continue;
        // Count duplicates: owning one occurrence must not grant an unpurchased second occurrence.
        const counts = new Map<string, number>();
        for (const index of owned.rowIndexes || []) {
          const key = hash(canonical(original.rows[index]));
          counts.set(key, (counts.get(key) || 0) + 1);
        }
        if (
          !requestedHashes.every((key) => {
            const count = counts.get(key) || 0;
            counts.set(key, count - 1);
            return count > 0;
          })
        )
          continue;
        return {
          offerVersionId: line.offerVersionId,
          purchaseId: purchase.id,
          title: binding.title || "Purchased source",
          fields: scope.fields,
          quantity: binding.rowIndexes.length,
          pending: purchase.paymentState !== "captured",
        };
      }
    }
    return null;
  };
}

export async function assertReusable(
  workspaceId: string,
  references: Prisma.JsonValue,
  client: Prisma.TransactionClient = db,
) {
  const reused = references as unknown as ReusedSource[];
  for (const reference of reused) {
    const purchase = await client.purchase.findFirst({
      where: {
        id: reference.purchaseId,
        workspaceId,
        mode: paymentEnvironment(),
        paymentState: "captured",
        entitlement: { is: { revokedAt: null } },
      },
    });
    assert(
      purchase,
      "OWNERSHIP_CHANGED",
      "A previously owned source is no longer available. Review a new quote.",
      409,
    );
  }
}
