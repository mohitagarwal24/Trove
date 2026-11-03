import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const hash = (value) => createHash("sha256").update(value).digest("hex");
const canonical = (value) =>
  Array.isArray(value)
    ? `[${value.map(canonical).join(",")}]`
    : value && typeof value === "object"
      ? `{${Object.entries(value)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, v]) => `${JSON.stringify(key)}:${canonical(v)}`)
          .join(",")}}`
      : (JSON.stringify(value) ?? "null");

try {
  if (!process.argv[2])
    throw Error("Usage: node scripts/verify-evidence.mjs <evidence.json>");
  const evidence = JSON.parse(readFileSync(process.argv[2], "utf8"));
  if (
    evidence.format !== "trove.evidence.v1" ||
    !Array.isArray(evidence.sources) ||
    !evidence.sources.length
  )
    throw Error("Unsupported or empty evidence pack");
  for (const source of evidence.sources) {
    if (
      !Array.isArray(source.rows) ||
      source.rows.length !== source.scope?.quantity ||
      !Array.isArray(source.scope?.fields)
    )
      throw Error("Record count or scope is invalid");
    if (
      source.rows.some(
        (row) =>
          canonical(Object.keys(row).sort()) !==
          canonical([...source.scope.fields].sort()),
      )
    )
      throw Error("Exported fields do not match the scope");
    const fingerprints = source.rows.map((row) => hash(canonical(row)));
    if (
      source.content?.algorithm !== "SHA-256" ||
      source.content?.fingerprint !==
        hash([...fingerprints].sort().join("\n")) ||
      canonical(source.content?.records) !==
        canonical(
          fingerprints.map((fingerprint, index) => ({ index, fingerprint })),
        )
    )
      throw Error(
        "Content fingerprints do not match; the pack may have changed",
      );
  }
  console.log(
    `Verified content in ${evidence.sources.length} source(s). This checks internal consistency, not publisher identity or payment settlement.`,
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
