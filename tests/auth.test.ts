import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createMcpServer } from "../src/server/mcp";
import { test, after, before } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { db } from "../src/lib/db";
import { hash } from "../src/lib/crypto";
import {
  register,
  login,
  authenticate,
  issueToken,
  requestPasswordReset,
  resetPassword,
  changePassword,
  closeAccount,
  sessionCookie,
  type Actor,
} from "../src/server/auth";
import { onboardSeller, publishDataset } from "../src/server/sellers";
import { searchOffers } from "../src/server/catalog";
const suffix = randomUUID(),
  users: string[] = [],
  workspaces: string[] = [],
  sellers: string[] = [],
  password = "a-secure-test-password-2026";
const request = (token: string) =>
  new Request("https://trove.test/api/bootstrap", {
    headers: { cookie: `${sessionCookie}=${token}` },
  });
async function account() {
  const email = `${randomUUID()}-${suffix}@example.com`,
    token = await register({ name: "Account test", email, password }),
    actor = await authenticate(request(token));
  users.push(actor.id);
  workspaces.push(actor.workspaceId);
  return { email, token, actor };
}
before(() =>
  assert(
    ["localhost", "127.0.0.1"].includes(
      new URL(process.env.DATABASE_URL!).hostname,
    ),
  ),
);
after(async () => {
  for (const id of sellers) {
    const offers = await db.offerVersion.findMany({
      where: { sellerId: id },
      select: { id: true },
    });
    await db.job.deleteMany({
      where: { resourceId: { in: offers.map((o) => o.id) } },
    });
    await db.offerVersion.deleteMany({ where: { sellerId: id } });
    await db.datasetSnapshot.deleteMany({ where: { sellerId: id } });
  }
  await db.agentToken.deleteMany({ where: { userId: { in: users } } });
  await db.passwordReset.deleteMany({ where: { userId: { in: users } } });
  await db.session.deleteMany({ where: { userId: { in: users } } });
  await db.membership.deleteMany({ where: { userId: { in: users } } });
  await db.user.deleteMany({ where: { id: { in: users } } });
  await db.workspace.deleteMany({ where: { id: { in: workspaces } } });
  await db.seller.deleteMany({ where: { id: { in: sellers } } });
  await db.auditEvent.deleteMany({ where: { actor: { in: users } } });
  await db.$disconnect();
});
test("registration creates a private workspace with a hashed session", async () => {
  const a = await account(),
    b = await account();
  assert.notEqual(a.actor.workspaceId, b.actor.workspaceId);
  const stored = await db.session.findUniqueOrThrow({
    where: { id: hash(a.token) },
  });
  assert.notEqual(stored.id, a.token);
  const user = await db.user.findUniqueOrThrow({ where: { id: a.actor.id } });
  assert(user.passwordHash && !user.passwordHash.includes(password));
  await assert.rejects(() => login(a.email, "wrong-password"), /incorrect/);
});
test("legacy shared passwords cannot authenticate", async () => {
  await assert.rejects(
    () => login("buyer@trove.test", "trove-demo-buyer"),
    /incorrect/,
  );
  await assert.rejects(
    () => register({ name: "Reserved", email: "pricing@trove.test", password }),
    /own email/,
  );
});
test("agent tokens cannot manage account or provider settings", async () => {
  const { actor } = await account();
  const token = await issueToken(actor, "Read only", ["read"]);
  const req = new Request("https://trove.test/api/mcp", {
    headers: { authorization: `Bearer ${token.value}` },
  });
  await assert.rejects(() => authenticate(req, "purchase"), /does not permit/);
  await assert.rejects(
    () => issueToken({ ...actor, viaToken: true }, "Escalation", ["purchase"]),
    /browser session/,
  );
  await assert.rejects(
    () =>
      changePassword({ ...actor, viaToken: true }, password, password + "new"),
    /browser session/,
  );
});
test("revocation stops an already connected agent session", async () => {
  const { actor } = await account();
  const token = await issueToken(actor, "Connected agent", ["read"]);
  const agent = await authenticate(
    new Request("http://localhost/api/mcp", {
      headers: { Authorization: `Bearer ${token.value}` },
    }),
  );
  const server = createMcpServer(agent),
    client = new Client({ name: "acceptance-client", version: "1" });
  const [serverTransport, clientTransport] =
    InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  try {
    assert(
      !(await client.callTool({ name: "search_offers", arguments: {} }))
        .isError,
    );
    await db.agentToken.update({
      where: { id: token.id },
      data: { revokedAt: new Date() },
    });
    assert(
      (await client.callTool({ name: "search_offers", arguments: {} })).isError,
    );
  } finally {
    await client.close();
    await server.close();
  }
});
test("password reset uses HTTPS email, hashes the token and rejects replay", async () => {
  const { email, actor, token } = await account();
  const oldFetch = globalThis.fetch,
    keys = [
      "GMAIL_CLIENT_ID",
      "GMAIL_CLIENT_SECRET",
      "GMAIL_REFRESH_TOKEN",
      "MAIL_FROM",
    ],
    old = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  Object.assign(process.env, {
    GMAIL_CLIENT_ID: "TEST",
    GMAIL_CLIENT_SECRET: "TEST",
    GMAIL_REFRESH_TOKEN: "TEST",
    MAIL_FROM: "test@example.com",
  });
  let raw = "",
    calls = 0;
  globalThis.fetch = async (url, init) => {
    calls++;
    if (String(url).includes("oauth2.googleapis.com"))
      return Response.json({ access_token: "TEST_ACCESS" });
    assert.equal(
      String(url),
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    );
    raw = Buffer.from(
      JSON.parse(String(init?.body)).raw,
      "base64url",
    ).toString();
    return Response.json({ id: "TEST_MAIL" });
  };
  try {
    await requestPasswordReset(email);
    assert.equal(calls, 2);
    const value = raw.match(/reset-password\?token=([A-Za-z0-9_-]+)/)![1];
    const reset = await db.passwordReset.findUniqueOrThrow({
      where: { id: hash(value) },
    });
    assert.equal(reset.userId, actor.id);
    assert.notEqual(reset.id, value);
    await resetPassword(value, password + "new");
    await assert.rejects(() => authenticate(request(token)), /Sign in/);
    await assert.rejects(
      () => resetPassword(value, password),
      /expired|already used/,
    );
    assert(await login(email, password + "new"));
  } finally {
    globalThis.fetch = oldFetch;
    for (const k of keys)
      if (old[k] === undefined) delete process.env[k];
      else process.env[k] = old[k];
  }
});
test("expired reset links cannot change a password", async () => {
  const { actor } = await account();
  const value = randomUUID();
  await db.passwordReset.create({
    data: { id: hash(value), userId: actor.id, expiresAt: new Date(0) },
  });
  await assert.rejects(() => resetPassword(value, password + "new"), /expired/);
});
test("password change revokes every session and agent token", async () => {
  const { actor, token, email } = await account();
  await issueToken(actor, "Agent", ["read"]);
  await changePassword(actor, password, password + "new");
  await assert.rejects(() => authenticate(request(token)), /Sign in/);
  assert.equal(await db.session.count({ where: { userId: actor.id } }), 0);
  assert.equal(
    await db.agentToken.count({ where: { userId: actor.id, revokedAt: null } }),
    0,
  );
  await assert.rejects(() => login(email, password), /incorrect/);
  assert(await login(email, password + "new"));
});
test("provider onboarding is owned by its user and requires operator approval", async () => {
  const { actor } = await account();
  const result = await onboardSeller(actor, {
    name: "Test publisher",
    description: "Legitimate research data for integration testing",
    rightsAttested: true,
  });
  sellers.push(result.id);
  assert.equal(result.status, "pending");
  const user = await db.user.findUniqueOrThrow({ where: { id: actor.id } });
  const sellerActor: Actor = {
    ...actor,
    role: "seller",
    sellerId: user.sellerId,
  };
  const offer = await publishDataset(sellerActor, {
    title: "Private approval data",
    description: "A protected upload that is not visible before review.",
    category: "Drug approvals",
    priceCents: 150,
    sourceUrl: "https://open.fda.gov/apis/drug/drugsfda/",
    licenseUrl: "https://open.fda.gov/license/",
    attribution: "FDA",
    sourceUpdatedAt: "2026-01-01",
    rows: [{ brand_name: "Test 1" }, { brand_name: "Test 2" }],
    rightsAttested: true,
    aiProcessing: false,
  });
  assert(!(await searchOffers()).offers.some((o) => o.id === offer.id));
  assert(!offer.purposes.includes("ai_inference"));
  const dataset = await db.datasetSnapshot.findUniqueOrThrow({
    where: { id: offer.datasetId! },
  });
  assert(!dataset.encryptedData.includes("Test 1"));
});
test("account closure redacts profile, revokes access and retains accounting identity", async () => {
  const { actor, token } = await account();
  await issueToken(actor, "Agent", ["read"]);
  await closeAccount(actor, password);
  const user = await db.user.findUniqueOrThrow({ where: { id: actor.id } });
  assert(user.disabledAt);
  assert.equal(user.name, "Closed account");
  assert(user.email.endsWith("@closed.invalid"));
  await assert.rejects(() => authenticate(request(token)), /Sign in/);
  assert.equal(
    await db.agentToken.count({ where: { userId: actor.id, revokedAt: null } }),
    0,
  );
});
