import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { hash } from "@/lib/crypto";
import { appUrl } from "@/lib/config";
import { requireBrowser, requireVerifiedEmail, type Actor } from "./auth";
import { rateLimit } from "./rate-limit";

export class OAuthError extends Error {
  constructor(
    public code: string,
    description: string,
    public status = 400,
  ) {
    super(description);
  }
}
function fail(code: string, message: string, status = 400): never {
  throw new OAuthError(code, message, status);
}
const secret = () => randomBytes(32).toString("base64url");
const origin = () => new URL(appUrl()).origin;
export const mcpResource = () => `${origin()}/api/mcp`;
export const metadataUrl = () =>
  `${origin()}/.well-known/oauth-protected-resource/api/mcp`;
export const oauthScopes = ["read", "purchase", "offline_access"];
export function authChallenge(error = "invalid_token") {
  return `Bearer resource_metadata="${metadataUrl()}", error="${error}", scope="read"`;
}
export function authorizationMetadata() {
  return {
    issuer: origin(),
    authorization_endpoint: `${origin()}/oauth/authorize`,
    token_endpoint: `${origin()}/oauth/token`,
    registration_endpoint: `${origin()}/oauth/register`,
    revocation_endpoint: `${origin()}/oauth/revoke`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: [
      "none",
      "client_secret_post",
      "client_secret_basic",
    ],
    scopes_supported: oauthScopes,
  };
}
export function protectedMetadata() {
  return {
    resource: mcpResource(),
    authorization_servers: [origin()],
    scopes_supported: oauthScopes,
    bearer_methods_supported: ["header"],
    resource_documentation: `${origin()}/connect`,
  };
}
function scopes(value: string | undefined) {
  const result = [...new Set((value || "read").split(" ").filter(Boolean))];
  if (!result.includes("read") || result.some((s) => !oauthScopes.includes(s)))
    fail(
      "invalid_scope",
      "Request read access, with optional purchase and offline_access scopes.",
    );
  return result;
}
function redirectUri(value: string) {
  let u: URL;
  try {
    u = new URL(value);
  } catch {
    return false;
  }
  return (
    !u.hash &&
    !u.username &&
    !u.password &&
    (u.protocol === "https:" ||
      (u.protocol === "http:" &&
        ["localhost", "127.0.0.1", "[::1]"].includes(u.hostname)))
  );
}
const registrationSchema = z.object({
  client_name: z.string().trim().min(1).max(80).default("Research agent"),
  redirect_uris: z
    .array(z.string().max(2048).refine(redirectUri))
    .min(1)
    .max(10),
  token_endpoint_auth_method: z
    .enum(["none", "client_secret_post", "client_secret_basic"])
    .default("none"),
  grant_types: z
    .array(z.enum(["authorization_code", "refresh_token"]))
    .optional(),
  response_types: z.array(z.literal("code")).optional(),
  scope: z.string().max(200).optional(),
});
export async function registerAgentClient(input: unknown) {
  const parsed = registrationSchema.safeParse(input);
  if (!parsed.success)
    fail(
      "invalid_client_metadata",
      "Use HTTPS redirect URLs (HTTP is allowed only for loopback clients), authorization code and supported authentication methods.",
    );
  const v = parsed.data;
  if (v.scope) scopes(v.scope);
  const value = v.token_endpoint_auth_method === "none" ? null : secret();
  const client = await db.agentClient.create({
    data: {
      id: `trv_client_${secret()}`,
      name: v.client_name,
      redirectUris: [...new Set(v.redirect_uris)],
      authMethod: v.token_endpoint_auth_method,
      secretHash: value ? hash(value) : null,
    },
  });
  return {
    client_id: client.id,
    client_name: client.name,
    redirect_uris: client.redirectUris,
    token_endpoint_auth_method: client.authMethod,
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    scope: v.scope || "read",
    client_id_issued_at: Math.floor(client.createdAt.getTime() / 1000),
    ...(value ? { client_secret: value, client_secret_expires_at: 0 } : {}),
  };
}
const authorizationSchema = z.object({
  client_id: z.string().max(200),
  redirect_uri: z.string().max(2048),
  response_type: z.literal("code"),
  code_challenge: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  code_challenge_method: z.literal("S256"),
  resource: z.string().max(2048),
  scope: z.string().max(200).optional(),
  state: z.string().max(2048).optional(),
});
export async function validateAuthorization(input: unknown) {
  const parsed = authorizationSchema.safeParse(input);
  if (!parsed.success)
    fail(
      "invalid_request",
      "This connection request is incomplete. Restart the connection from your agent.",
    );
  const v = parsed.data;
  const client = await db.agentClient.findUnique({
    where: { id: v.client_id },
  });
  if (!client || !client.redirectUris.includes(v.redirect_uri))
    fail(
      "invalid_request",
      "The client or redirect address is not registered. Restart the connection from your agent.",
    );
  if (v.resource !== mcpResource())
    fail("invalid_target", "This request is for a different MCP server.");
  return { request: v, client, scopes: scopes(v.scope) };
}
export async function authorizeAgent(
  actor: Actor,
  input: unknown,
  allow: boolean,
  expectedUserId: string,
) {
  requireBrowser(actor);
  requireVerifiedEmail(actor);
  if (actor.id !== expectedUserId)
    fail(
      "access_denied",
      "Your signed-in account changed. Reload this request before connecting.",
    );
  const v = await validateAuthorization(input);
  await rateLimit(actor.id, "oauth-consent", 30, 60000);
  const url = new URL(v.request.redirect_uri);
  if (v.request.state !== undefined)
    url.searchParams.set("state", v.request.state);
  url.searchParams.set("iss", origin());
  if (!allow) {
    url.searchParams.set("error", "access_denied");
    return url.toString();
  }
  const code = secret();
  await db.agentAuthorizationCode.create({
    data: {
      id: hash(code),
      clientId: v.client.id,
      userId: actor.id,
      workspaceId: actor.workspaceId,
      redirectUri: v.request.redirect_uri,
      challenge: v.request.code_challenge,
      scopes: v.scopes,
      resource: v.request.resource,
      expiresAt: new Date(Date.now() + 5 * 60000),
    },
  });
  url.searchParams.set("code", code);
  return url.toString();
}
async function clientFor(body: URLSearchParams, authorization: string | null) {
  let id = body.get("client_id"),
    value = body.get("client_secret"),
    method = value ? "client_secret_post" : "none";
  if (authorization) {
    if (!authorization.startsWith("Basic ") || value)
      fail("invalid_client", "Unsupported client authentication.", 401);
    const decoded = Buffer.from(authorization.slice(6), "base64").toString(
        "utf8",
      ),
      i = decoded.indexOf(":");
    if (i < 0) fail("invalid_client", "Invalid client authentication.", 401);
    try {
      const basicId = decodeURIComponent(decoded.slice(0, i)),
        basicSecret = decodeURIComponent(decoded.slice(i + 1));
      if (id && id !== basicId)
        fail("invalid_client", "Conflicting client identities.", 401);
      id = basicId;
      value = basicSecret;
      method = "client_secret_basic";
    } catch {
      fail("invalid_client", "Invalid client authentication.", 401);
    }
  }
  const client = id ? await db.agentClient.findUnique({ where: { id } }) : null;
  if (!client || client.authMethod !== method)
    fail("invalid_client", "Client authentication failed.", 401);
  if (
    client.secretHash &&
    (!value ||
      !timingSafeEqual(
        Buffer.from(client.secretHash),
        Buffer.from(hash(value)),
      ))
  )
    fail("invalid_client", "Client authentication failed.", 401);
  return client;
}
async function eligible(
  tx: Prisma.TransactionClient,
  userId: string,
  workspaceId: string,
) {
  const member = await tx.membership.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
    include: { user: true },
  });
  if (!member || member.user.disabledAt || !member.user.emailVerifiedAt)
    fail("invalid_grant", "This account no longer permits the connection.");
}
async function tokens(
  tx: Prisma.TransactionClient,
  grant: {
    id: string;
    userId: string;
    workspaceId: string;
    scopes: string[];
    expiresAt: Date;
  },
  name: string,
) {
  const access = `trv_oauth_${secret()}`,
    refresh = secret();
  await tx.agentToken.create({
    data: {
      grantId: grant.id,
      userId: grant.userId,
      workspaceId: grant.workspaceId,
      name,
      hash: hash(access),
      prefix: access.slice(0, 18),
      scopes: grant.scopes.filter((s) => s !== "offline_access"),
      expiresAt: new Date(Date.now() + 3600000),
    },
  });
  if (grant.scopes.includes("offline_access"))
    await tx.agentRefresh.create({
      data: {
        id: hash(refresh),
        grantId: grant.id,
        expiresAt: grant.expiresAt,
      },
    });
  return {
    access_token: access,
    token_type: "Bearer",
    expires_in: 3600,
    scope: grant.scopes.join(" "),
    ...(grant.scopes.includes("offline_access")
      ? { refresh_token: refresh }
      : {}),
  };
}
export async function exchangeAgentToken(
  body: URLSearchParams,
  authorization: string | null,
) {
  const client = await clientFor(body, authorization),
    resource = body.get("resource");
  if (resource !== mcpResource())
    fail("invalid_target", "The token must be bound to Trove's MCP resource.");
  const type = body.get("grant_type");
  if (type === "authorization_code") {
    const code = body.get("code"),
      verifier = body.get("code_verifier");
    if (!code || !verifier || !/^[A-Za-z0-9._~-]{43,128}$/.test(verifier))
      fail("invalid_grant", "A valid code and PKCE verifier are required.");
    return db.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<
        { id: string }[]
      >`SELECT id FROM "AgentAuthorizationCode" WHERE id=${hash(code)} FOR UPDATE`;
      const c = rows.length
        ? await tx.agentAuthorizationCode.findUnique({
            where: { id: hash(code) },
          })
        : null;
      if (
        !c ||
        c.consumedAt ||
        c.expiresAt <= new Date() ||
        c.clientId !== client.id ||
        c.redirectUri !== body.get("redirect_uri") ||
        c.resource !== resource ||
        c.challenge !==
          createHash("sha256").update(verifier).digest("base64url")
      )
        fail(
          "invalid_grant",
          "The authorization code is invalid, expired or already used.",
        );
      await eligible(tx, c.userId, c.workspaceId);
      await tx.agentAuthorizationCode.update({
        where: { id: c.id },
        data: { consumedAt: new Date() },
      });
      const grant = await tx.agentGrant.create({
        data: {
          clientId: client.id,
          userId: c.userId,
          workspaceId: c.workspaceId,
          scopes: c.scopes,
          resource: c.resource,
          expiresAt: new Date(Date.now() + 30 * 86400000),
        },
      });
      return tokens(tx, grant, client.name);
    });
  }
  if (type === "refresh_token") {
    const refresh = body.get("refresh_token");
    if (!refresh) fail("invalid_grant", "A refresh token is required.");
    const result = await db.$transaction(async (tx) => {
      const current = await tx.agentRefresh.findUnique({
        where: { id: hash(refresh) },
      });
      if (!current) fail("invalid_grant", "The refresh token is invalid.");
      // Serialize the entire token family. Reuse revokes its descendants and must commit.
      await tx.$queryRaw`SELECT id FROM "AgentGrant" WHERE id=${current.grantId} FOR UPDATE`;
      const r = await tx.agentRefresh.findUniqueOrThrow({
        where: { id: current.id },
        include: { grant: true },
      });
      const g = r.grant;
      if (g.clientId !== client.id || g.resource !== resource)
        fail(
          "invalid_grant",
          "The refresh token belongs to another client or resource.",
        );
      if (r.usedAt) {
        await tx.agentGrant.update({
          where: { id: g.id },
          data: { revokedAt: new Date() },
        });
        await tx.agentToken.updateMany({
          where: { grantId: g.id },
          data: { revokedAt: new Date() },
        });
        return null;
      }
      if (g.revokedAt || g.expiresAt <= new Date() || r.expiresAt <= new Date())
        fail(
          "invalid_grant",
          "This connection has expired or been disconnected.",
        );
      if (
        body.has("scope") &&
        [...new Set(body.get("scope")!.split(" ").filter(Boolean))]
          .sort()
          .join(" ") !== [...g.scopes].sort().join(" ")
      )
        fail(
          "invalid_scope",
          "Reconnect to change this connection's permissions.",
        );
      await eligible(tx, g.userId, g.workspaceId);
      // Password/security changes already revoke agent tokens. Never resurrect that grant.
      if (
        !(await tx.agentToken.findFirst({
          where: { grantId: g.id, revokedAt: null },
        }))
      )
        fail("invalid_grant", "This connection was revoked. Connect again.");
      await tx.agentRefresh.update({
        where: { id: r.id },
        data: { usedAt: new Date() },
      });
      return tokens(tx, g, client.name);
    });
    if (!result)
      fail(
        "invalid_grant",
        "This refresh token was already used. The connection has been revoked.",
      );
    return result;
  }
  fail("unsupported_grant_type", "Use authorization_code or refresh_token.");
}
export async function revokeAgentCredentials(
  body: URLSearchParams,
  authorization: string | null,
) {
  const client = await clientFor(body, authorization),
    token = body.get("token");
  if (!token) fail("invalid_request", "A token is required.");
  const digest = hash(token),
    access = await db.agentToken.findUnique({
      where: { hash: digest },
      include: { grant: true },
    }),
    refresh = await db.agentRefresh.findUnique({
      where: { id: digest },
      include: { grant: true },
    });
  const grant = access?.grant || refresh?.grant;
  if (grant?.clientId === client.id) await revokeGrant(grant.id);
}
export async function revokeGrant(id: string) {
  await db.$transaction([
    db.agentGrant.updateMany({
      where: { id },
      data: { revokedAt: new Date() },
    }),
    db.agentToken.updateMany({
      where: { grantId: id },
      data: { revokedAt: new Date() },
    }),
  ]);
}
