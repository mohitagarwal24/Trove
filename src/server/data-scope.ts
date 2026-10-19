import { assert } from "@/lib/errors";
import type { DataRow } from "@/lib/catalogue";
import type { DataFilter } from "@/lib/types";
export function scopedRows(
  rows: DataRow[],
  fields: string[],
  filters: DataFilter[],
) {
  assert(
    filters.length <= 10 && filters.every((f) => fields.includes(f.field)),
    "INVALID_FILTER",
    "A filter refers to a field outside this offer.",
  );
  for (const filter of filters) {
    assert(
      ["contains", "equals", "after", "before"].includes(filter.operator) &&
        filter.value.length <= 200,
      "INVALID_FILTER",
      "This filter is not supported.",
    );
    if (["after", "before"].includes(filter.operator))
      assert(
        /^\d{4}-\d{2}-\d{2}$/.test(filter.value) &&
          Number.isFinite(Date.parse(filter.value)) &&
          new Date(filter.value).toISOString().slice(0, 10) === filter.value,
        "INVALID_FILTER",
        "Date filters require a valid YYYY-MM-DD date.",
      );
  }
  return rows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) =>
      filters.every((filter) => {
        const value = String(row[filter.field] ?? "").toLowerCase(),
          expected = filter.value.toLowerCase();
        if (filter.operator === "contains") return value.includes(expected);
        if (filter.operator === "equals") return value === expected;
        const actual = Date.parse(value),
          target = Date.parse(expected);
        return (
          Number.isFinite(actual) &&
          (filter.operator === "after" ? actual >= target : actual <= target)
        );
      }),
    );
}
