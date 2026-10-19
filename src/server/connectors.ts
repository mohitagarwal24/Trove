import { z } from "zod";
import { fixtureRows } from "@/lib/fixtures";
import { assert } from "@/lib/errors";
import type { FullQuote } from "./quotes";
export type ConnectorScenario =
  "success" | "outage" | "missing_field" | "stale";
type Line = FullQuote["lines"][number];
type Row = Record<string, string | number>;
export interface PreparedResult {
  rows: Row[];
  declaredFreshness: string;
  offerVersionId: string;
  checks: { name: string; passed: boolean }[];
}
function productAdapter(line: Line) {
  return {
    rows: fixtureRows["product-pricing"]
      .slice(0, line.quantity)
      .map((row) => ({ ...row })),
  };
}
function supplierAdapter(line: Line) {
  return {
    suppliers: fixtureRows["supplier-directory"]
      .slice(0, line.quantity)
      .map((row) => ({ commercial: { ...row } })),
  };
}
function marketAdapter(line: Line) {
  return {
    series: fixtureRows["market-indicators"]
      .slice(0, line.quantity)
      .map((row) => ({
        dimensions: {
          period: row.period,
          category: row.category,
          region: row.region,
        },
        measures: {
          demand_index: row.demand_index,
          median_price_usd: row.median_price_usd,
          sample_size: row.sample_size,
        },
      })),
  };
}
export async function prepareConnector(
  line: Line,
  scenario: ConnectorScenario = "success",
): Promise<PreparedResult> {
  assert(
    scenario !== "outage",
    "CONNECTOR_UNAVAILABLE",
    "The seller connector is temporarily unavailable.",
    502,
  );
  const connectorId = line.offer.seller.connectorId;
  let raw: Row[];
  if (connectorId === "product-pricing") raw = productAdapter(line).rows;
  else if (connectorId === "supplier-directory")
    raw = supplierAdapter(line).suppliers.map((s) => s.commercial);
  else if (connectorId === "market-indicators")
    raw = marketAdapter(line).series.map((s) => ({
      ...s.dimensions,
      ...(line.offer.offerId === "meridian-archive"
        ? { period: s.dimensions.period.replace("2026", "2025") }
        : {}),
      ...s.measures,
    }));
  else throw new Error("Unapproved connector adapter.");
  const rows = raw.map(
    (row) => Object.fromEntries(line.fields.map((f) => [f, row[f]])) as Row,
  );
  if (scenario === "missing_field" && rows.length)
    delete rows[0][line.fields[0]];
  const snapshot = line.snapshot as { freshnessAt: string };
  const declaredFreshness =
    scenario === "stale" ? new Date(0).toISOString() : snapshot.freshnessAt;
  const schemaFields = (
    line.offer.schema as { fields: { name: string; type: string }[] }
  ).fields;
  const fieldsPass = rows.every(
    (row) =>
      line.fields.every((f) => Object.hasOwn(row, f) && row[f] !== undefined) &&
      Object.keys(row).every(
        (f) => line.fields.includes(f) && !line.offer.prohibited.includes(f),
      ),
  );
  const schemaPass = rows.every((row) =>
    line.fields.every((f) => {
      const spec = schemaFields.find((s) => s.name === f);
      return (
        spec &&
        typeof row[f] === spec.type &&
        (typeof row[f] !== "number" || Number.isFinite(row[f]))
      );
    }),
  );
  const checks = [
    { name: "Approved fields only", passed: fieldsPass },
    { name: "Output schema", passed: schemaPass },
    { name: "Exact scoped quantity", passed: rows.length === line.quantity },
    {
      name: "Quoted source timestamp",
      passed: declaredFreshness === snapshot.freshnessAt,
    },
    { name: "Permitted purpose and licence", passed: true },
  ];
  assert(
    checks.every((c) => c.passed),
    "VALIDATION_FAILED",
    "The prepared result failed the approved delivery checks.",
    422,
  );
  z.array(z.record(z.string(), z.union([z.string(), z.number()]))).parse(rows);
  return {
    rows,
    declaredFreshness,
    offerVersionId: line.offerVersionId,
    checks,
  };
}
