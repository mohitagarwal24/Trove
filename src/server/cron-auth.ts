import { timingSafeEqual } from "node:crypto";
import { assert } from "@/lib/errors";
export function requireCron(request: Request) {
  const expected = process.env.CRON_SECRET || "";
  assert(
    expected.length >= 32,
    "CRON_NOT_CONFIGURED",
    "Scheduled maintenance is not configured.",
    503,
  );
  const supplied = request.headers.get("authorization") || "";
  const wanted = `Bearer ${expected}`;
  assert(
    Buffer.byteLength(supplied) === Buffer.byteLength(wanted) &&
      timingSafeEqual(Buffer.from(supplied), Buffer.from(wanted)),
    "UNAUTHORIZED",
    "A valid maintenance credential is required.",
    401,
  );
}
