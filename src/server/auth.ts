import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { hash, verifyPassword } from "@/lib/crypto";
import { assert } from "@/lib/errors";
import { appUrl } from "@/lib/config";
export type Actor = {
  id: string;
  name: string;
  email: string;
  role: string;
  sellerId: string | null;
  workspaceId: string;
  scopes: string[];
  viaToken: boolean;
};
export const sessionCookie = "trove_session";
export async function authenticate(
  request: Request,
  scope = "read",
): Promise<Actor> {
  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Bearer ")) {
    const token = await db.agentToken.findUnique({
      where: { hash: hash(authorization.slice(7)) },
      include: { user: true },
    });
    assert(
      token && !token.revokedAt && token.expiresAt > new Date(),
      "UNAUTHORIZED",
      "This agent token is invalid or expired.",
      401,
    );
    assert(
      token.scopes.includes(scope),
      "FORBIDDEN",
      "This token does not permit that operation.",
      403,
    );
    const member = await db.membership.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: token.workspaceId,
          userId: token.userId,
        },
      },
    });
    assert(member, "FORBIDDEN", "Workspace access was revoked.", 403);
    return {
      ...token.user,
      workspaceId: token.workspaceId,
      scopes: token.scopes,
      viaToken: true,
    };
  }
  const cookie = request.headers
    .get("cookie")
    ?.split(";")
    .map((x) => x.trim())
    .find((x) => x.startsWith(sessionCookie + "="))
    ?.slice(sessionCookie.length + 1);
  const session = cookie
    ? await db.session.findUnique({
        where: { id: hash(cookie) },
        include: { user: { include: { memberships: true } } },
      })
    : null;
  assert(
    session &&
      session.expiresAt > new Date() &&
      session.user.memberships.length,
    "UNAUTHORIZED",
    "Sign in to your Trove workspace.",
    401,
  );
  return {
    ...session.user,
    workspaceId: session.user.memberships[0].workspaceId,
    scopes: ["read", "purchase", "manage"],
    viaToken: false,
  };
}
export function checkOrigin(request: Request) {
  if (
    ["GET", "HEAD", "OPTIONS"].includes(request.method) ||
    request.headers.get("authorization")?.startsWith("Bearer ")
  )
    return;
  const origin = request.headers.get("origin");
  assert(
    !origin || origin === new URL(appUrl()).origin,
    "INVALID_ORIGIN",
    "Cross-origin changes are not allowed.",
    403,
  );
  if (request.headers.get("cookie"))
    assert(
      origin,
      "INVALID_ORIGIN",
      "An origin header is required for browser changes.",
      403,
    );
}
export async function login(email: string, password: string) {
  const user = await db.user.findUnique({
    where: { email: email.toLowerCase() },
  });
  assert(
    user && verifyPassword(password, user.passwordHash),
    "INVALID_CREDENTIALS",
    "Email or password is incorrect.",
    401,
  );
  const token = randomBytes(32).toString("base64url");
  await db.session.create({
    data: {
      id: hash(token),
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 86400000),
    },
  });
  return token;
}
export async function logoutSession(request: Request) {
  const token = request.headers
    .get("cookie")
    ?.split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith(sessionCookie + "="))
    ?.slice(sessionCookie.length + 1);
  if (token) await db.session.deleteMany({ where: { id: hash(token) } });
}
export function requireBrowser(actor: Actor) {
  assert(
    !actor.viaToken,
    "FORBIDDEN",
    "This action requires an authenticated browser session.",
    403,
  );
}
export async function issueToken(actor: Actor, name: string, scopes: string[]) {
  requireBrowser(actor);
  assert(
    scopes.length > 0 && scopes.every((s) => ["read", "purchase"].includes(s)),
    "INVALID_SCOPES",
    "Only read and purchase scopes may be delegated.",
  );
  const value = "trv_" + randomBytes(32).toString("base64url");
  const token = await db.agentToken.create({
    data: {
      userId: actor.id,
      workspaceId: actor.workspaceId,
      name,
      scopes,
      hash: hash(value),
      prefix: value.slice(0, 12),
      expiresAt: new Date(Date.now() + 30 * 86400000),
    },
  });
  return {
    id: token.id,
    name: token.name,
    prefix: token.prefix,
    scopes: token.scopes,
    expiresAt: token.expiresAt,
    value,
  };
}
