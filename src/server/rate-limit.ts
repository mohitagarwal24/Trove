import { db } from "@/lib/db";
import { hash } from "@/lib/crypto";
import { assert } from "@/lib/errors";
export async function rateLimit(
  identity: string,
  action: string,
  limit: number,
  windowMs: number,
) {
  const key = hash(`${action}:${identity}`),
    resetAt = new Date(Date.now() + windowMs);
  const rows = await db.$queryRaw<
    { count: number }[]
  >`INSERT INTO "RateLimit" (key, count, "resetAt") VALUES (${key}, 1, ${resetAt}) ON CONFLICT (key) DO UPDATE SET count = CASE WHEN "RateLimit"."resetAt" < NOW() THEN 1 ELSE "RateLimit".count + 1 END, "resetAt" = CASE WHEN "RateLimit"."resetAt" < NOW() THEN ${resetAt} ELSE "RateLimit"."resetAt" END RETURNING count`;
  assert(
    rows[0].count <= limit,
    "RATE_LIMITED",
    "Too many requests. Please try again later.",
    429,
  );
}
