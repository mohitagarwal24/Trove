import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { db } from "../src/lib/db";
import { hash } from "../src/lib/crypto";
import {
  authenticate,
  createSession,
  sessionCookie,
  type Actor,
} from "../src/server/auth";
import {
  authorizeAgent,
  validateAuthorization,
  registerAgentClient,
  exchangeAgentToken,
  revokeGrant,
  revokeAgentCredentials,
  mcpResource,
  authorizationMetadata,
  protectedMetadata,
  OAuthError,
} from "../src/server/agent-oauth";
import { createMcpServer } from "../src/server/mcp";
const ids: string[] = [],
  clientIds: string[] = [];
let actor: Actor, workspaceId: string;
const verifier = () => randomBytes(32).toString("base64url");
const rejected = (code: string) => (e: unknown) =>
  e instanceof OAuthError && e.code === code;
before(async () => {
  assert(
    ["localhost", "127.0.0.1"].includes(
      new URL(process.env.DATABASE_URL!).hostname,
    ),
  );
  const user = await db.user.create({
    data: {
      name: "OAuth test",
      email: `oauth-${randomUUID()}@example.com`,
      emailVerifiedAt: new Date(),
      memberships: {
        create: {
          role: "owner",
          workspace: { create: { name: "OAuth test workspace" } },
        },
      },
    },
  });
  ids.push(user.id);
  const session = await createSession(user.id);
  actor = await authenticate(
    new Request(mcpResource(), {
      headers: { cookie: `${sessionCookie}=${session}` },
    }),
  );
  workspaceId = actor.workspaceId;
});
after(async () => {
  await db.agentAuthorizationCode.deleteMany({
    where: { userId: { in: ids } },
  });
  await db.agentToken.deleteMany({ where: { userId: { in: ids } } });
  await db.agentClient.deleteMany({ where: { id: { in: clientIds } } });
  await db.auditEvent.deleteMany({ where: { actor: { in: ids } } });
  await db.membership.deleteMany({ where: { userId: { in: ids } } });
  await db.user.deleteMany({ where: { id: { in: ids } } });
  await db.workspace.deleteMany({ where: { id: workspaceId } });
  await db.$disconnect();
});
async function setup(
  scope = "read purchase offline_access",
  method: "none" | "client_secret_post" | "client_secret_basic" = "none",
) {
  const client = await registerAgentClient({
    client_name: "OAuth test client",
    redirect_uris: ["http://127.0.0.1:49152/callback"],
    token_endpoint_auth_method: method,
  });
  clientIds.push(client.client_id);
  const v = verifier();
  const request = {
    client_id: client.client_id,
    redirect_uri: client.redirect_uris[0],
    response_type: "code",
    code_challenge_method: "S256",
    code_challenge: createHash("sha256").update(v).digest("base64url"),
    resource: mcpResource(),
    scope,
    state: randomUUID(),
  };
  const redirect = new URL(
    await authorizeAgent(actor, request, true, actor.id),
  );
  const body = new URLSearchParams({
    client_id: client.client_id,
    code: redirect.searchParams.get("code")!,
    code_verifier: v,
    redirect_uri: request.redirect_uri,
    resource: mcpResource(),
    grant_type: "authorization_code",
  });
  let authorization: string | null = null;
  if (method === "client_secret_post")
    body.set("client_secret", client.client_secret!);
  if (method === "client_secret_basic")
    authorization = `Basic ${Buffer.from(`${client.client_id}:${client.client_secret}`).toString("base64")}`;
  return { client, request, body, redirect, authorization };
}
async function exchange(scope?: string) {
  const s = await setup(scope),
    t = await exchangeAgentToken(s.body, null);
  assert(t);
  const access = await db.agentToken.findUniqueOrThrow({
    where: { hash: hash(t.access_token) },
  });
  return { ...s, t, grantId: access.grantId! };
}
const bearer = (token: string, path = mcpResource()) =>
  new Request(path, { headers: { authorization: `Bearer ${token}` } });
const refresh = (
  s: Awaited<ReturnType<typeof exchange>>,
  token = s.t.refresh_token!,
) =>
  new URLSearchParams({
    client_id: s.client.client_id,
    refresh_token: token,
    grant_type: "refresh_token",
    resource: mcpResource(),
  });
test("OAuth metadata advertises PKCE, DCR and exact MCP audience; registration validates callbacks", async () => {
  assert.deepEqual(authorizationMetadata().code_challenge_methods_supported, [
    "S256",
  ]);
  assert.equal(protectedMetadata().resource, mcpResource());
  for (const uri of [
    "http://example.com/callback",
    "javascript:alert(1)",
    "https://example.com/callback#fragment",
    "https://user:password@example.com/callback",
  ]) {
    await assert.rejects(
      () => registerAgentClient({ redirect_uris: [uri] }),
      rejected("invalid_client_metadata"),
    );
  }
  await assert.rejects(
    () =>
      registerAgentClient({
        redirect_uris: ["https://example.com/callback"],
        grant_types: ["implicit"],
      }),
    rejected("invalid_client_metadata"),
  );
});
test("authorization rejects unregistered redirects, wrong audience, missing PKCE and unexpected account", async () => {
  const s = await setup();
  for (const patch of [
    { redirect_uri: "https://attacker.example/cb" },
    { resource: "https://other.example/mcp" },
    { code_challenge_method: "plain" },
    { scope: "read manage" },
  ]) {
    await assert.rejects(
      () => validateAuthorization({ ...s.request, ...patch }),
      (e) => e instanceof OAuthError,
    );
  }
  await assert.rejects(
    () => authorizeAgent(actor, s.request, true, "different-user"),
    rejected("access_denied"),
  );
  await assert.rejects(
    () =>
      authorizeAgent({ ...actor, viaToken: true }, s.request, true, actor.id),
    /browser/,
  );
  const cancelled = new URL(
    await authorizeAgent(actor, s.request, false, actor.id),
  );
  assert.equal(cancelled.searchParams.get("error"), "access_denied");
  assert.equal(cancelled.searchParams.get("state"), s.request.state);
  assert.equal(cancelled.searchParams.has("code"), false);
});
test("code exchange binds PKCE, exact redirect and audience and consumes the code only once", async () => {
  const s = await setup("read");
  for (const [key, value, code] of [
    ["code_verifier", verifier(), "invalid_grant"],
    ["redirect_uri", "http://127.0.0.1:49152/other", "invalid_grant"],
    ["resource", "https://other.example/mcp", "invalid_target"],
  ]) {
    const b = new URLSearchParams(s.body);
    b.set(key, value);
    await assert.rejects(() => exchangeAgentToken(b, null), rejected(code));
  }
  const t = await exchangeAgentToken(s.body, null);
  assert(t);
  assert.equal(t.refresh_token, undefined);
  assert.equal(t.expires_in, 3600);
  const a = await authenticate(bearer(t.access_token));
  assert.deepEqual(a.scopes, ["read"]);
  await assert.rejects(
    () => authenticate(bearer(t.access_token), "purchase"),
    /does not permit/,
  );
  await assert.rejects(
    () =>
      authenticate(
        bearer(t.access_token, new URL("/api/tasks", mcpResource()).toString()),
      ),
    /different resource/,
  );
  await assert.rejects(
    () => exchangeAgentToken(s.body, null),
    rejected("invalid_grant"),
  );
});
test("concurrent code exchange grants exactly one token family and expired codes fail", async () => {
  const s = await setup();
  const results = await Promise.allSettled([
    exchangeAgentToken(s.body, null),
    exchangeAgentToken(s.body, null),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  const expired = await setup();
  await db.agentAuthorizationCode.update({
    where: { id: hash(expired.body.get("code")!) },
    data: { expiresAt: new Date(0) },
  });
  await assert.rejects(
    () => exchangeAgentToken(expired.body, null),
    rejected("invalid_grant"),
  );
});
test("refresh rotates tokens and replay revokes every descendant, including the new access token", async () => {
  const s = await exchange();
  const next = await exchangeAgentToken(refresh(s), null);
  assert(next?.refresh_token);
  assert.notEqual(next.refresh_token, s.t.refresh_token);
  assert.notEqual(next.access_token, s.t.access_token);
  await authenticate(bearer(next.access_token));
  await assert.rejects(
    () => exchangeAgentToken(refresh(s), null),
    rejected("invalid_grant"),
  );
  await assert.rejects(
    () => authenticate(bearer(next.access_token)),
    /invalid|expired/,
  );
  await assert.rejects(
    () => exchangeAgentToken(refresh(s, next.refresh_token), null),
    rejected("invalid_grant"),
  );
});
test("refresh cannot change scope, cross client boundaries, outlive membership or revive security-revoked tokens", async () => {
  const s = await exchange("read offline_access"),
    other = await setup();
  const widened = refresh(s);
  widened.set("scope", "read purchase offline_access");
  await assert.rejects(
    () => exchangeAgentToken(widened, null),
    rejected("invalid_scope"),
  );
  const crossed = refresh(s);
  crossed.set("client_id", other.client.client_id);
  await assert.rejects(
    () => exchangeAgentToken(crossed, null),
    rejected("invalid_grant"),
  );
  await db.membership.delete({
    where: { workspaceId_userId: { workspaceId, userId: actor.id } },
  });
  await assert.rejects(
    () => exchangeAgentToken(refresh(s), null),
    rejected("invalid_grant"),
  );
  await db.membership.create({
    data: { workspaceId, userId: actor.id, role: "owner" },
  });
  await db.agentToken.updateMany({
    where: { grantId: s.grantId },
    data: { revokedAt: new Date() },
  });
  await assert.rejects(
    () => exchangeAgentToken(refresh(s), null),
    rejected("invalid_grant"),
  );
});
test("disconnect and RFC7009 revocation invalidate access and refresh credentials", async () => {
  const s = await exchange();
  await revokeGrant(s.grantId);
  await assert.rejects(
    () => authenticate(bearer(s.t.access_token)),
    /invalid|expired/,
  );
  await assert.rejects(
    () => exchangeAgentToken(refresh(s), null),
    rejected("invalid_grant"),
  );
  const r = await exchange();
  await revokeAgentCredentials(
    new URLSearchParams({
      client_id: r.client.client_id,
      token: r.t.refresh_token!,
    }),
    null,
  );
  await assert.rejects(
    () => authenticate(bearer(r.t.access_token)),
    /invalid|expired/,
  );
  await revokeAgentCredentials(
    new URLSearchParams({ client_id: r.client.client_id, token: "unknown" }),
    null,
  );
});
test("confidential clients use their registered authentication method and secrets are stored as hashes", async () => {
  for (const method of ["client_secret_post", "client_secret_basic"] as const) {
    const s = await setup(undefined, method);
    const stored = await db.agentClient.findUniqueOrThrow({
      where: { id: s.client.client_id },
    });
    assert.notEqual(stored.secretHash, s.client.client_secret);
    assert.equal(stored.secretHash, hash(s.client.client_secret!));
    await assert.rejects(
      () =>
        exchangeAgentToken(
          new URLSearchParams({
            ...Object.fromEntries(s.body),
            client_secret: "wrong",
          }),
          null,
        ),
      rejected("invalid_client"),
    );
    assert(await exchangeAgentToken(s.body, s.authorization));
  }
});
test("disabled and unverified accounts cannot exchange previously authorized codes", async () => {
  for (const patch of [{ disabledAt: new Date() }, { emailVerifiedAt: null }]) {
    const s = await setup();
    await db.user.update({ where: { id: actor.id }, data: patch });
    await assert.rejects(
      () => exchangeAgentToken(s.body, null),
      rejected("invalid_grant"),
    );
    await db.user.update({
      where: { id: actor.id },
      data: { disabledAt: null, emailVerifiedAt: new Date() },
    });
  }
});
test("MCP connects through an OAuth actor without exposing any payment approval tool", async () => {
  const s = await exchange(),
    a = await authenticate(bearer(s.t.access_token));
  assert.equal(a.id, actor.id);
  assert.equal(a.workspaceId, workspaceId);
  const server = createMcpServer(a);
  await server.close();
  assert.equal(await db.purchase.count({ where: { workspaceId } }), 0);
});
