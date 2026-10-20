import {
  createHmac,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from "node:crypto";
import { db } from "@/lib/db";
import { assert } from "@/lib/errors";
import { hash } from "@/lib/crypto";
import {
  createSession,
  requireBrowser,
  sessionCookie,
  type Actor,
} from "./auth";
import { emailConfigured, sendVerificationEmail } from "./mail";
import { rateLimit } from "./rate-limit";

const invalid =
  "This code is incorrect or expired. Try again or request a new code.";
function digest(userId: string, nonce: string, code: string) {
  // A keyed hash prevents offline guessing of a six-digit code from a database leak.
  const key = process.env.RESULT_ENCRYPTION_KEY;
  assert(
    key && /^[a-f0-9]{64}$/i.test(key),
    "EMAIL_UNAVAILABLE",
    "Email verification is temporarily unavailable.",
    503,
  );
  return createHmac("sha256", Buffer.from(key, "hex"))
    .update(`trove-email-verification:${userId}:${nonce}:${code}`)
    .digest("hex");
}
function browserSession(request: Request) {
  const value = request.headers
    .get("cookie")
    ?.split(";")
    .map((v) => v.trim())
    .find((v) => v.startsWith(sessionCookie + "="))
    ?.slice(sessionCookie.length + 1);
  assert(value, "UNAUTHORIZED", "Sign in to verify your email.", 401);
  return hash(value);
}
export async function verificationStatus(actor: Actor, request: Request) {
  requireBrowser(actor);
  const challenge = await db.emailVerification.findUnique({
    where: { userId: actor.id },
  });
  const current =
    challenge?.sessionId === browserSession(request) &&
    challenge.expiresAt > new Date();
  return {
    email: actor.email,
    verified: !!actor.emailVerified,
    sent: !!current,
    resendAt: challenge
      ? new Date(challenge.sentAt.getTime() + 60000).toISOString()
      : null,
  };
}
export async function requestEmailVerification(actor: Actor, request: Request) {
  requireBrowser(actor);
  if (actor.emailVerified)
    return { sent: false, verified: true, resendAt: null };
  assert(
    emailConfigured(),
    "EMAIL_UNAVAILABLE",
    "Email verification is temporarily unavailable. Please try again later.",
    503,
  );
  await rateLimit(actor.id, "email-verification-send", 5, 3600000);
  const sessionId = browserSession(request),
    code = String(randomInt(1000000)).padStart(6, "0"),
    nonce = randomBytes(32).toString("hex"),
    now = new Date();
  const candidate = {
    userId: actor.id,
    sessionId,
    nonce,
    digest: digest(actor.id, nonce, code),
    sentAt: now,
    expiresAt: new Date(now.getTime() + 10 * 60000),
    attempts: 0,
  };
  // Serialize requests per account, including requests from different browsers.
  const reserved = await db.$transaction(async (tx) => {
    const [user] = await tx.$queryRaw<
      { emailVerifiedAt: Date | null; disabledAt: Date | null }[]
    >`SELECT "emailVerifiedAt", "disabledAt" FROM "User" WHERE id=${actor.id} FOR UPDATE`;
    assert(
      user && !user.disabledAt,
      "UNAUTHORIZED",
      "Sign in to verify your email.",
      401,
    );
    if (user.emailVerifiedAt) return false;
    const prior = await tx.emailVerification.findUnique({
      where: { userId: actor.id },
    });
    assert(
      !prior || now.getTime() - prior.sentAt.getTime() >= 60000,
      "VERIFICATION_COOLDOWN",
      "Wait one minute before requesting another code.",
      429,
    );
    await tx.emailVerification.upsert({
      where: { userId: actor.id },
      create: candidate,
      update: candidate,
    });
    return true;
  });
  if (!reserved) return { sent: false, verified: true, resendAt: null };
  try {
    await sendVerificationEmail(actor.email, code);
  } catch {
    // Never leave an undelivered code active or erase a newer concurrent request.
    await db.emailVerification.deleteMany({
      where: { userId: actor.id, nonce },
    });
    assert(
      false,
      "EMAIL_UNAVAILABLE",
      "We couldn't send your code. Please try again later.",
      503,
    );
  }
  return {
    sent: true,
    verified: false,
    resendAt: new Date(now.getTime() + 60000).toISOString(),
  };
}
export async function verifyEmail(
  actor: Actor,
  request: Request,
  code: string,
) {
  requireBrowser(actor);
  assert(
    /^\d{6}$/.test(code),
    "INVALID_CODE",
    "Enter the six-digit code from your email.",
  );
  await rateLimit(actor.id, "email-verification-attempt", 20, 3600000);
  const sessionId = browserSession(request);
  const verified = await db.$transaction(async (tx) => {
    const [user] = await tx.$queryRaw<
      { emailVerifiedAt: Date | null; disabledAt: Date | null }[]
    >`SELECT "emailVerifiedAt", "disabledAt" FROM "User" WHERE id=${actor.id} FOR UPDATE`;
    if (!user || user.disabledAt || user.emailVerifiedAt) return false;
    const challenge = await tx.emailVerification.findUnique({
      where: { userId: actor.id },
    });
    if (
      !challenge ||
      challenge.sessionId !== sessionId ||
      challenge.expiresAt <= new Date() ||
      challenge.attempts >= 5
    )
      return false;
    // Wrong guesses commit; throwing inside this transaction would roll them back.
    await tx.emailVerification.update({
      where: { userId: actor.id },
      data: { attempts: { increment: 1 } },
    });
    const match = timingSafeEqual(
      Buffer.from(challenge.digest, "hex"),
      Buffer.from(digest(actor.id, challenge.nonce, code), "hex"),
    );
    if (!match) return false;
    await tx.user.update({
      where: { id: actor.id },
      data: { emailVerifiedAt: new Date() },
    });
    await tx.emailVerification.delete({ where: { userId: actor.id } });
    // A pending session must never become a usable workspace session implicitly.
    await tx.session.deleteMany({ where: { userId: actor.id } });
    await tx.agentAuthorizationCode.deleteMany({
      where: { userId: actor.id },
    });
    await tx.agentGrant.updateMany({
      where: { userId: actor.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await tx.agentToken.updateMany({
      where: { userId: actor.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return true;
  });
  assert(verified, "INVALID_CODE", invalid, 400);
  return createSession(actor.id);
}
