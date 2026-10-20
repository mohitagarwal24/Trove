import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { db } from "../src/lib/db";
import { hash } from "../src/lib/crypto";
import {
  authenticate,
  register,
  issueToken,
  login,
  requestPasswordReset,
  resetPassword,
  sessionCookie,
} from "../src/server/auth";
import {
  requestEmailVerification,
  verificationStatus,
  verifyEmail,
} from "../src/server/email-verification";

const users: string[] = [],
  workspaces: string[] = [],
  password = "OTP acceptance password 2026";
const keys = [
  "GMAIL_CLIENT_ID",
  "GMAIL_CLIENT_SECRET",
  "GMAIL_REFRESH_TOKEN",
  "MAIL_FROM",
];
const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]])),
  originalFetch = globalThis.fetch;
let mail = "",
  failDelivery = false;
const request = (token: string) =>
  new Request("http://localhost:3000/api/auth/verification", {
    headers: { cookie: `${sessionCookie}=${token}` },
  });
before(() => {
  assert(
    ["localhost", "127.0.0.1"].includes(
      new URL(process.env.DATABASE_URL!).hostname,
    ),
  );
  Object.assign(process.env, {
    GMAIL_CLIENT_ID: "TEST_ONLY",
    GMAIL_CLIENT_SECRET: "TEST_ONLY",
    GMAIL_REFRESH_TOKEN: "TEST_ONLY",
    MAIL_FROM: "sender@example.com",
  });
  // Only the external Gmail boundary is controlled; hashing, SQL, sessions and limits are real.
  globalThis.fetch = async (url, init) => {
    if (String(url) === "https://oauth2.googleapis.com/token")
      return Response.json({ access_token: "TEST_ONLY" });
    assert.equal(
      String(url),
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    );
    mail = Buffer.from(
      JSON.parse(String(init?.body)).raw,
      "base64url",
    ).toString();
    return Response.json(
      { id: "TEST_ONLY" },
      { status: failDelivery ? 503 : 200 },
    );
  };
});
after(async () => {
  globalThis.fetch = originalFetch;
  for (const key of keys) {
    if (previous[key] === undefined) delete process.env[key];
    else process.env[key] = previous[key];
  }
  await db.agentToken.deleteMany({ where: { userId: { in: users } } });
  await db.passwordReset.deleteMany({ where: { userId: { in: users } } });
  await db.session.deleteMany({ where: { userId: { in: users } } });
  await db.membership.deleteMany({ where: { userId: { in: users } } });
  await db.user.deleteMany({ where: { id: { in: users } } });
  await db.workspace.deleteMany({ where: { id: { in: workspaces } } });
  await db.rateLimit.deleteMany({
    where: {
      key: {
        in: users.flatMap((id) =>
          ["email-verification-send", "email-verification-attempt"].map(
            (action) => hash(`${action}:${id}`),
          ),
        ),
      },
    },
  });
  await db.$disconnect();
});
async function pending() {
  const email = `otp-${randomUUID()}@example.com`,
    token = await register({ name: "Email researcher", email, password });
  const actor = await authenticate(request(token), "read", true);
  users.push(actor.id);
  workspaces.push(actor.workspaceId);
  return { actor, token, email, req: request(token) };
}
function code() {
  return mail.match(/\n(\d{6})\n/)![1];
}
test("password signup is restricted until a real email code is consumed; sessions rotate", async () => {
  const a = await pending();
  await assert.rejects(() => authenticate(a.req), /Verify your email/);
  await assert.rejects(
    () => issueToken(a.actor, "Agent", ["read"]),
    /Verify your email/,
  );
  const legacy = `trv_${randomUUID()}`;
  await db.agentToken.create({
    data: {
      userId: a.actor.id,
      workspaceId: a.actor.workspaceId,
      name: "Legacy token",
      hash: hash(legacy),
      prefix: legacy.slice(0, 12),
      scopes: ["read"],
      expiresAt: new Date(Date.now() + 60000),
    },
  });
  await assert.rejects(
    () =>
      authenticate(
        new Request("http://localhost:3000/api/mcp", {
          headers: { Authorization: `Bearer ${legacy}` },
        }),
        "read",
        true,
      ),
    /Verify your email/,
  );
  const sent = await requestEmailVerification(a.actor, a.req),
    value = code();
  assert(sent.sent);
  assert(mail.includes(`To: ${a.email}`));
  assert(mail.includes("expires in 10 minutes"));
  const stored = await db.emailVerification.findUniqueOrThrow({
    where: { userId: a.actor.id },
  });
  assert.match(stored.digest, /^[a-f0-9]{64}$/);
  assert.notEqual(stored.digest, hash(value));
  assert.equal(stored.sessionId, hash(a.token));
  assert((await verificationStatus(a.actor, a.req)).sent);
  const token = await verifyEmail(a.actor, a.req, value);
  assert.notEqual(token, a.token);
  assert((await authenticate(request(token))).emailVerified);
  await assert.rejects(() => authenticate(a.req, "read", true), /Sign in/);
  await assert.rejects(
    () => verifyEmail(a.actor, a.req, value),
    /incorrect or expired/,
  );
  assert.equal(
    await db.emailVerification.count({ where: { userId: a.actor.id } }),
    0,
  );
});
test("wrong guesses persist, lock after five, and resends cannot reset the hourly guess budget", async () => {
  const a = await pending();
  await requestEmailVerification(a.actor, a.req);
  const value = code();
  const wrong = value === "000000" ? "000001" : "000000";
  for (let n = 1; n <= 5; n++) {
    await assert.rejects(
      () => verifyEmail(a.actor, a.req, wrong),
      /incorrect or expired/,
    );
    assert.equal(
      (
        await db.emailVerification.findUniqueOrThrow({
          where: { userId: a.actor.id },
        })
      ).attempts,
      n,
    );
  }
  await assert.rejects(
    () => verifyEmail(a.actor, a.req, value),
    /incorrect or expired/,
  );
  await db.rateLimit.update({
    where: { key: hash(`email-verification-attempt:${a.actor.id}`) },
    data: { count: 20 },
  });
  await assert.rejects(() => verifyEmail(a.actor, a.req, value), /Too many/);
});
test("codes are browser-bound, expire and enforce resend cooldown; replacing a code invalidates it", async () => {
  const a = await pending();
  await requestEmailVerification(a.actor, a.req);
  const first = code();
  const other = request(await login(a.email, password));
  await assert.rejects(
    () => verifyEmail(a.actor, other, first),
    /incorrect or expired/,
  );
  await assert.rejects(
    () => requestEmailVerification(a.actor, a.req),
    /one minute/,
  );
  await db.emailVerification.update({
    where: { userId: a.actor.id },
    data: { expiresAt: new Date(0), sentAt: new Date(Date.now() - 61000) },
  });
  await assert.rejects(
    () => verifyEmail(a.actor, a.req, first),
    /incorrect or expired/,
  );
  await requestEmailVerification(a.actor, a.req);
  const second = code();
  // A six-digit replacement may randomly equal its predecessor; expiry and nonce still differ.
  if (first !== second)
    await assert.rejects(
      () => verifyEmail(a.actor, a.req, first),
      /incorrect or expired/,
    );
  assert(await verifyEmail(a.actor, a.req, second));
});
test("concurrent confirmation consumes the code exactly once", async () => {
  const a = await pending();
  await requestEmailVerification(a.actor, a.req);
  const value = code();
  const results = await Promise.allSettled([
    verifyEmail(a.actor, a.req, value),
    verifyEmail(a.actor, a.req, value),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
});
test("password recovery proves a pending email and invalidates codes and sessions", async () => {
  const a = await pending();
  await requestEmailVerification(a.actor, a.req);
  await requestPasswordReset(a.email);
  const token = mail.match(/reset-password\?token=([A-Za-z0-9_-]+)/)![1];
  await resetPassword(token, password + "updated");
  assert.equal(
    await db.emailVerification.count({ where: { userId: a.actor.id } }),
    0,
  );
  await assert.rejects(() => authenticate(a.req), /Sign in/);
  assert(
    (await authenticate(request(await login(a.email, password + "updated"))))
      .emailVerified,
  );
});
test("missing mail configuration and provider failures never verify an account or expose a code", async () => {
  const a = await pending();
  delete process.env.GMAIL_CLIENT_ID;
  await assert.rejects(
    () => requestEmailVerification(a.actor, a.req),
    /temporarily unavailable/,
  );
  process.env.GMAIL_CLIENT_ID = "TEST_ONLY";
  failDelivery = true;
  try {
    await assert.rejects(
      () => requestEmailVerification(a.actor, a.req),
      /couldn't send/,
    );
  } finally {
    failDelivery = false;
  }
  assert.equal(
    await db.emailVerification.count({ where: { userId: a.actor.id } }),
    0,
  );
  assert.equal(
    (await db.user.findUniqueOrThrow({ where: { id: a.actor.id } }))
      .emailVerifiedAt,
    null,
  );
  await assert.rejects(() => authenticate(a.req), /Verify your email/);
});
