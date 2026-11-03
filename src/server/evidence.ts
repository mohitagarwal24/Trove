import type { Actor } from "./auth";
import { getPurchase, getResult } from "./purchases";
import { assert } from "@/lib/errors";
import { batchFingerprint, canonical } from "./ownership";
import { hash } from "@/lib/crypto";

export async function getEvidence(actor: Actor, id: string) {
  const result = await getResult(actor, id);
  const purchase = await getPurchase(actor, id);
  assert(
    purchase.paymentState === "captured" &&
      purchase.entitlement &&
      !purchase.entitlement.revokedAt,
    "RESULT_LOCKED",
    "This purchase no longer grants access.",
    403,
  );
  return {
    format: "trove.evidence.v1",
    exportedAt: new Date().toISOString(),
    purchaseId: id,
    payment: {
      environment: purchase.mode,
      currency: purchase.quote.currency,
      totalCents: purchase.quote.totalCents,
      state: purchase.paymentState,
      orderId: purchase.paypalOrderId,
      captureId: purchase.captureId,
    },
    scope: {
      purpose: purchase.quote.purpose,
      planHash: purchase.quote.planHash,
    },
    receipt: purchase.receipt?.document || null,
    reusedSources: purchase.quote.reusedSources,
    sources: result.sources.map((source) => {
      const line = purchase.quote.lines.find(
        (candidate) => candidate.offerVersionId === source.offerVersionId,
      );
      assert(
        line,
        "EVIDENCE_SCOPE",
        "The original source scope is unavailable.",
        503,
      );
      return {
        ...source,
        scope: {
          fields: line.fields,
          quantity: line.quantity,
          filters: (line.snapshot as { filters?: unknown[] }).filters || [],
        },
        content: {
          algorithm: "SHA-256",
          canonicalisation:
            "Sorted object keys; unordered batch with duplicate occurrences preserved",
          fingerprint: batchFingerprint(source.rows),
          records: source.rows.map((row, i) => ({
            index: i,
            fingerprint: hash(canonical(row)),
          })),
        },
      };
    }),
    notice:
      "Fingerprints identify the exported content; they are not a digital signature. Source rights and attribution remain applicable. Access is checked at export; a later refund cannot recall downloaded copies.",
  };
}
