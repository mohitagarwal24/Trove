import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { TokenPayload } from "google-auth-library";
import { db } from "../src/lib/db";
import { hash } from "../src/lib/crypto";
import {
  beginGoogle,
  finishGoogle,
  googleApi,
  safeReturnTo,
} from "../src/server/google-auth";
import {
  authenticate,
  register,
  login,
  sessionCookie,
  closeAccount,
} from "../src/server/auth";
const suffix = randomUUID(),
  users: string[] = [],
  workspaces: string[] = [],
  attempts: string[] = [];
const previous = {
  exchange: googleApi.exchange,
  id: process.env.GOOGLE_CLIENT_ID,
  secret: process.env.GOOGLE_CLIENT_SECRET,
};
const request = (session?: string) =>
  new Request("http://localhost:3000/api/auth/google", {
    headers: session ? { cookie: `${sessionCookie}=${session}` } : {},
  });
before(() => {
  assert(
    ["localhost", "127.0.0.1"].includes(
      new URL(process.env.DATABASE_URL!).hostname,
    ),
  );
  process.env.GOOGLE_CLIENT_ID = "TEST_ONLY";
  process.env.GOOGLE_CLIENT_SECRET = "TEST_ONLY";
});
after(async () => {
  googleApi.exchange = previous.exchange;
  if (previous.id === undefined) delete process.env.GOOGLE_CLIENT_ID;
  else process.env.GOOGLE_CLIENT_ID = previous.id;
  if (previous.secret === undefined) delete process.env.GOOGLE_CLIENT_SECRET;
  else process.env.GOOGLE_CLIENT_SECRET = previous.secret;
  await db.oAuthAttempt.deleteMany({ where: { id: { in: attempts } } });
  await db.auditEvent.deleteMany({ where: { actor: { in: users } } });
  await db.session.deleteMany({ where: { userId: { in: users } } });
  await db.membership.deleteMany({ where: { userId: { in: users } } });
  await db.user.deleteMany({ where: { id: { in: users } } });
  await db.workspace.deleteMany({ where: { id: { in: workspaces } } });
  await db.$disconnect();
});
async function attempt(session?: string, link = false) {
  const start = await beginGoogle(request(session), "/account", link),
    url = new URL(start.url);
  const state = url.searchParams.get("state")!;
  attempts.push(hash(state));
  const payload = {
    iss: "https://accounts.google.com",
    aud: "TEST_ONLY",
    sub: `${suffix}-${randomUUID()}`,
    email: `${randomUUID()}@example.com`,
    email_verified: true,
    name: "Google researcher",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
    nonce: url.searchParams.get("nonce"),
  };
  // A controlled provider adapter; production always uses Google's signed ID-token verifier.
  googleApi.exchange = async () => payload as TokenPayload;
  return {
    start,
    url,
    payload,
    input: { state, code: "TEST_ONLY_CODE", browser: start.browser },
  };
}
async function track(session: string) {
  const actor = await authenticate(request(session));
  users.push(actor.id);
  workspaces.push(actor.workspaceId);
  return actor;
}
test("Google creates a private account with no password and a provider-authenticated session", async () => {
  const a = await attempt();
  assert.equal(a.url.searchParams.get("code_challenge_method"), "S256");
  assert.equal(
    a.url.searchParams.get("redirect_uri"),
    "http://localhost:3000/api/auth/google/callback",
  );
  const result = await finishGoogle(request(), a.input),
    actor = await track(result.token);
  assert.equal(actor.hasPassword, false);
  assert.equal(actor.googleConnected, true);
  assert.equal(actor.authProvider, "google");
  assert.equal(
    (await db.user.findUniqueOrThrow({ where: { id: actor.id } })).passwordHash,
    null,
  );
  await assert.rejects(() => login(actor.email, "anything"), /incorrect/);
  await assert.rejects(() => finishGoogle(request(), a.input), /expired/);
  await closeAccount(actor);
});
test("Google callbacks reject cross-browser, expired and nonce-mismatched requests", async () => {
  const a = await attempt();
  await assert.rejects(
    () => finishGoogle(request(), { ...a.input, browser: "another-browser" }),
    /expired/,
  );
  a.payload.nonce = "wrong-nonce";
  await assert.rejects(() => finishGoogle(request(), a.input), /verify/);
  const expired = await attempt();
  await db.oAuthAttempt.update({
    where: { id: hash(expired.input.state) },
    data: { expiresAt: new Date(0) },
  });
  await assert.rejects(() => finishGoogle(request(), expired.input), /expired/);
  const unverified = await attempt();
  unverified.payload.email_verified = false;
  await assert.rejects(
    () => finishGoogle(request(), unverified.input),
    /verify/,
  );
});
test("an existing email never silently links Google; an authenticated account can explicitly link", async () => {
  const email = `${suffix}@example.com`,
    session = await register({
      name: "Existing researcher",
      email,
      password: "existing-account-password-2026",
    });
  await db.user.update({
    where: { email },
    data: { emailVerifiedAt: new Date() },
  });
  const actor = await track(session);
  const collision = await attempt();
  collision.payload.email = email;
  await assert.rejects(
    () => finishGoogle(request(), collision.input),
    /password/,
  );
  assert.equal(
    (await db.user.findUniqueOrThrow({ where: { id: actor.id } }))
      .googleSubject,
    null,
  );
  const link = await attempt(session, true);
  link.payload.email = email;
  const result = await finishGoogle(request(session), link.input),
    connected = await authenticate(request(result.token));
  assert.equal(connected.id, actor.id);
  assert.equal(connected.googleConnected, true);
  assert.equal(connected.hasPassword, true);
});
test("Google return paths cannot redirect outside Trove", () => {
  for (const path of [
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "/api/auth/google",
    "/%2f%2fevil.example",
  ])
    assert.equal(safeReturnTo(path), "/dashboard");
  assert.equal(safeReturnTo("/account?close=1"), "/account?close=1");
});

test("landing destinations use the same safe browser and OAuth return paths", () => {
  for (const path of [
    "/dashboard",
    "/discover",
    "/workspace?task=owned-task",
    "/purchases/receipt-id",
  ])
    assert.equal(safeReturnTo(path), path);
  for (const path of [
    "/",
    "/sign-in",
    "//outside.example",
    "/\\outside.example",
  ])
    assert.equal(safeReturnTo(path), "/dashboard");
});
