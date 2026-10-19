import { db } from "@/lib/db";
import { decrypt, hash } from "@/lib/crypto";
import { assert } from "@/lib/errors";
import type { DataRow } from "@/lib/catalogue";
import type { FullQuote } from "./quotes";
export interface PreparedResult {
  rows: DataRow[];
  declaredFreshness: string;
  offerVersionId: string;
  checks: { name: string; passed: boolean }[];
}
export async function prepareConnector(
  line: FullQuote["lines"][number],
): Promise<PreparedResult> {
  assert(
    line.offer.datasetId,
    "DATASET_UNAVAILABLE",
    "This source version is unavailable.",
    503,
  );
  const snapshot = await db.datasetSnapshot.findUnique({
    where: { id: line.offer.datasetId },
  });
  assert(
    snapshot && snapshot.sellerId === line.sellerId,
    "DATASET_UNAVAILABLE",
    "The approved source is unavailable.",
    503,
  );
  const raw = decrypt<DataRow[]>(snapshot.encryptedData);
  const contentHash = hash(
    JSON.stringify({
      rows: raw,
      updated: snapshot.sourceUpdatedAt.toISOString(),
    }),
  );
  const binding = line.snapshot as {
    freshnessAt: string;
    datasetId?: string;
    contentHash?: string;
    purpose?: string;
    rowIndexes?: number[];
  };
  const selection = binding.rowIndexes || [];
  assert(
    selection.length === line.quantity &&
      new Set(selection).size === selection.length &&
      selection.every((i) => Number.isInteger(i) && i >= 0 && i < raw.length),
    "VALIDATION_FAILED",
    "The source selection did not pass delivery checks.",
    422,
  );
  const rows = selection
    .map((i) => raw[i])
    .map((row) =>
      Object.fromEntries(line.fields.map((field) => [field, row[field]])),
    );
  const schema = (
    line.offer.schema as { fields: { name: string; type: string }[] }
  ).fields;
  const checks = [
    {
      name: "Source integrity",
      passed:
        contentHash === snapshot.contentHash &&
        (!binding.contentHash || binding.contentHash === contentHash),
    },
    {
      name: "Approved source version",
      passed: binding.datasetId === snapshot.id,
    },
    {
      name: "Approved fields only",
      passed: rows.every((row) =>
        line.fields.every(
          (f) =>
            Object.hasOwn(row, f) &&
            row[f] !== undefined &&
            !line.offer.prohibited.includes(f),
        ),
      ),
    },
    {
      name: "Output schema",
      passed: rows.every((row) =>
        line.fields.every((f) => {
          const type = schema.find((s) => s.name === f)?.type;
          return (
            type &&
            typeof row[f] === type &&
            (typeof row[f] !== "number" || Number.isFinite(row[f]))
          );
        }),
      ),
    },
    { name: "Exact scoped quantity", passed: rows.length === line.quantity },
    {
      name: "Quoted source timestamp",
      passed: binding.freshnessAt === snapshot.sourceUpdatedAt.toISOString(),
    },
    {
      name: "Usage permissions",
      passed:
        !!binding.purpose && line.offer.purposes.includes(binding.purpose),
    },
  ];
  assert(
    checks.every((c) => c.passed),
    "VALIDATION_FAILED",
    "The source did not pass delivery checks. No payment will be captured.",
    422,
  );
  return {
    rows,
    declaredFreshness: binding.freshnessAt,
    offerVersionId: line.offerVersionId,
    checks,
  };
}
