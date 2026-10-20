import { safeReturnPath as safeReturnTo } from "@/lib/routes";
import { randomBytes } from "node:crypto";
import { OAuth2Client, CodeChallengeMethod } from "google-auth-library";
import { db } from "@/lib/db";
import { encrypt, decrypt, hash } from "@/lib/crypto";
import { assert } from "@/lib/errors";
import { appUrl, capabilities } from "@/lib/config";
import { authenticate, requireBrowser, createSession } from "./auth";
import { rateLimit } from "./rate-limit";
export const googleCookie = "trove_google";
const callbackUrl = () => new URL("/api/auth/google/callback", appUrl()).href;
const client = () =>
  new OAuth2Client({
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: callbackUrl(),
    transporterOptions: { timeout: 15000, retry: false },
  });
export const googleApi = {
  async exchange(code: string, verifier: string) {
    const oauth = client();
    const { tokens } = await oauth.getToken({ code, codeVerifier: verifier });
    assert(
      tokens.id_token,
      "GOOGLE_AUTH_FAILED",
      "Google did not confirm your identity.",
      401,
    );
    const ticket = await oauth.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID!,
    });
    return ticket.getPayload();
  },
};
export { safeReturnPath as safeReturnTo } from "@/lib/routes";
export async function beginGoogle(
  request: Request,
  returnTo: string | null,
  link = false,
) {
  assert(
    capabilities().googleAuth,
    "GOOGLE_NOT_CONFIGURED",
    "Google sign-in is unavailable.",
    503,
  );
  await rateLimit(
    request.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() ||
      "local",
    "google-start",
    30,
    60000,
  );
  const actor = link ? await authenticate(request) : null;
  if (actor) {
    requireBrowser(actor);
    assert(
      actor.authenticatedAt &&
        Date.now() - actor.authenticatedAt.getTime() < 5 * 60000,
      "REAUTH_REQUIRED",
      "Sign in again before connecting a Google account.",
      401,
    );
  }
  const state = randomBytes(32).toString("base64url"),
    browser = randomBytes(32).toString("base64url"),
    nonce = randomBytes(32).toString("base64url");
  const oauth = client(),
    { codeVerifier, codeChallenge } = await oauth.generateCodeVerifierAsync();
  await db.oAuthAttempt.create({
    data: {
      id: hash(state),
      browserHash: hash(browser),
      nonceHash: hash(nonce),
      encryptedVerifier: encrypt(codeVerifier),
      expiresAt: new Date(Date.now() + 10 * 60000),
      returnTo: safeReturnTo(returnTo),
      linkUserId: actor?.id,
    },
  });
  const url = new URL(
    oauth.generateAuthUrl({
      scope: ["openid", "email", "profile"],
      state,
      code_challenge: codeChallenge,
      code_challenge_method: CodeChallengeMethod.S256,
      prompt: "select_account",
    }),
  );
  url.searchParams.set("nonce", nonce);
  return { url: url.href, browser };
}
export async function finishGoogle(
  request: Request,
  input: { state: string; code: string; browser: string },
) {
  assert(
    capabilities().googleAuth,
    "GOOGLE_NOT_CONFIGURED",
    "Google sign-in is unavailable.",
    503,
  );
  // Consume before exchanging code: replay, cross-browser and expired callbacks cannot establish a session.
  const rows = await db.$queryRaw<
    {
      encryptedVerifier: string;
      nonceHash: string;
      returnTo: string;
      linkUserId: string | null;
    }[]
  >`DELETE FROM "OAuthAttempt" WHERE id=${hash(input.state)} AND "browserHash"=${hash(input.browser)} AND "expiresAt">NOW() RETURNING "encryptedVerifier","nonceHash","returnTo","linkUserId"`;
  const attempt = rows[0];
  assert(
    attempt,
    "GOOGLE_STATE_INVALID",
    "This sign-in request expired. Please try again.",
    401,
  );
  const payload = await googleApi.exchange(
    input.code,
    decrypt<string>(attempt.encryptedVerifier),
  );
  const nonce = (payload as { nonce?: string } | undefined)?.nonce;
  assert(
    payload?.sub &&
      payload.email &&
      payload.email_verified === true &&
      nonce &&
      hash(nonce) === attempt.nonceHash,
    "GOOGLE_IDENTITY_INVALID",
    "Google could not verify this sign-in.",
    401,
  );
  let linkActor = null;
  if (attempt.linkUserId) {
    linkActor = await authenticate(request);
    requireBrowser(linkActor);
    assert(
      linkActor.id === attempt.linkUserId &&
        !!linkActor.authenticatedAt &&
        Date.now() - linkActor.authenticatedAt.getTime() < 5 * 60000,
      "GOOGLE_LINK_INVALID",
      "Sign in to the original account before connecting Google.",
      401,
    );
  }
  const user = await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${"google:" + payload.sub}))::text`;
    const connected = await tx.user.findUnique({
      where: { googleSubject: payload.sub },
    });
    if (connected) {
      assert(
        !connected.disabledAt,
        "ACCOUNT_DISABLED",
        "This account is unavailable.",
        403,
      );
      assert(
        !linkActor || connected.id === linkActor.id,
        "GOOGLE_ALREADY_LINKED",
        "This Google account is already connected to another account.",
        409,
      );
      return connected;
    }
    const email = payload.email!.trim().toLowerCase();
    if (linkActor) {
      const target = await tx.user.findUniqueOrThrow({
        where: { id: linkActor.id },
      });
      assert(
        !target.disabledAt && !target.googleSubject,
        "GOOGLE_ALREADY_LINKED",
        "Your account already has a Google sign-in.",
        409,
      );
      return tx.user.update({
        where: { id: target.id },
        data: {
          googleSubject: payload.sub,
          emailVerifiedAt:
            email === target.email ? new Date() : target.emailVerifiedAt,
        },
      });
    }
    const existing = await tx.user.findUnique({ where: { email } });
    assert(
      !existing,
      "GOOGLE_LINK_REQUIRED",
      "Sign in with your password, then connect Google from Account settings.",
      409,
    );
    const name = payload.name?.trim().slice(0, 80) || "Researcher";
    return tx.user.create({
      data: {
        email,
        name,
        googleSubject: payload.sub,
        emailVerifiedAt: new Date(),
        passwordHash: null,
        memberships: {
          create: {
            role: "owner",
            workspace: { create: { name: `${name}'s workspace` } },
          },
        },
      },
    });
  });
  return {
    token: await createSession(user.id, "google"),
    returnTo: attempt.returnTo,
  };
}
