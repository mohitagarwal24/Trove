import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { hash, verifyPassword, passwordHash } from "@/lib/crypto";
import { assert } from "@/lib/errors";
import { rateLimit } from "./rate-limit";
import { sendResetEmail, emailConfigured } from "./mail";
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
  tokenId?: string;
  hasPassword?: boolean;
  googleConnected?: boolean;
  emailVerified?: boolean;
  authenticatedAt?: Date;
  authProvider?: string;
};
export const sessionCookie = "trove_session";
export async function authenticate(
  request: Request,
  scope = "read",
  allowUnverified = false,
): Promise<Actor> {
  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Bearer ")) {
    const token = await db.agentToken.findUnique({
      where: { hash: hash(authorization.slice(7)) },
      include: { user: true },
    });
    assert(
      token &&
        !token.user.disabledAt &&
        !token.revokedAt &&
        token.expiresAt > new Date(),
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
    requireVerifiedEmail(profile(token.user));
    return {
      ...profile(token.user),
      workspaceId: token.workspaceId,
      scopes: token.scopes,
      viaToken: true,
      tokenId: token.id,
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
      !session.user.disabledAt &&
      session.expiresAt > new Date() &&
      session.user.memberships.length,
    "UNAUTHORIZED",
    "Sign in to your Trove workspace.",
    401,
  );
  if (!allowUnverified) requireVerifiedEmail(profile(session.user));
  return {
    ...profile(session.user),
    authenticatedAt: session.authenticatedAt,
    authProvider: session.authProvider,
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
  await rateLimit(email.trim().toLowerCase(), "login", 10, 15 * 60000);
  const user = await db.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  });
  assert(
    user &&
      !user.disabledAt &&
      (await verifyPassword(password, user.passwordHash)),
    "INVALID_CREDENTIALS",
    "Email or password is incorrect.",
    401,
  );
  return createSession(user.id);
}
export async function createSession(userId: string, authProvider = "password") {
  const token = randomBytes(32).toString("base64url");
  await db.session.create({
    data: {
      id: hash(token),
      userId,
      authProvider,
      expiresAt: new Date(Date.now() + 7 * 86400000),
    },
  });
  return token;
}
function profile(user: {
  id: string;
  name: string;
  email: string;
  role: string;
  sellerId: string | null;
  passwordHash: string | null;
  googleSubject: string | null;
  emailVerifiedAt: Date | null;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    sellerId: user.sellerId,
    hasPassword: !!user.passwordHash,
    googleConnected: !!user.googleSubject,
    emailVerified: !!user.emailVerifiedAt,
  };
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
  requireVerifiedEmail(actor);
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
export function requireVerifiedEmail(actor: { emailVerified?: boolean }) {
  assert(
    actor.emailVerified,
    "EMAIL_NOT_VERIFIED",
    "Verify your email before using your workspace.",
    403,
  );
}

export async function register(input: {
  name: string;
  email: string;
  password: string;
}) {
  const email = input.email.trim().toLowerCase();
  assert(
    !email.endsWith("@trove.test"),
    "INVALID_EMAIL",
    "Use your own email address.",
  );
  await rateLimit(email, "register", 3, 3600000);
  const digest = await passwordHash(input.password);
  try {
    await db.user.create({
      data: {
        email,
        name: input.name.trim(),
        passwordHash: digest,
        memberships: {
          create: {
            role: "owner",
            workspace: { create: { name: `${input.name.trim()}'s workspace` } },
          },
        },
      },
    });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002")
      assert(
        false,
        "ACCOUNT_EXISTS",
        "An account with this email already exists. Sign in instead.",
        409,
      );
    throw error;
  }
  return login(email, input.password);
}
export async function requestPasswordReset(email: string) {
  await rateLimit(email.toLowerCase(), "password-reset", 3, 3600000);
  assert(
    emailConfigured(),
    "EMAIL_UNAVAILABLE",
    "Password recovery is temporarily unavailable. Please contact support.",
    503,
  );
  const user = await db.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  });
  if (user && !user.disabledAt) {
    const token = randomBytes(32).toString("base64url");
    await db.passwordReset.create({
      data: {
        id: hash(token),
        userId: user.id,
        expiresAt: new Date(Date.now() + 30 * 60000),
      },
    });
    try {
      await sendResetEmail(
        user.email,
        `${appUrl()}/reset-password?token=${token}`,
      );
    } catch {
      await db.passwordReset.delete({ where: { id: hash(token) } });
      assert(
        false,
        "EMAIL_UNAVAILABLE",
        "Password recovery is temporarily unavailable. Please try again later.",
        503,
      );
    }
  }
}
export async function resetPassword(token: string, password: string) {
  const digest = await passwordHash(password);
  await db.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<
      { userId: string }[]
    >`UPDATE "PasswordReset" SET "usedAt" = NOW() WHERE id = ${hash(token)} AND "usedAt" IS NULL AND "expiresAt" > NOW() RETURNING "userId"`;
    assert(
      rows[0],
      "RESET_EXPIRED",
      "This link has expired or was already used. Request another reset link.",
      400,
    );
    await tx.user.update({
      where: { id: rows[0].userId },
      data: { passwordHash: digest, emailVerifiedAt: new Date() },
    });
    await tx.session.deleteMany({ where: { userId: rows[0].userId } });
    await tx.agentToken.updateMany({
      where: { userId: rows[0].userId },
      data: { revokedAt: new Date() },
    });
    await tx.passwordReset.updateMany({
      where: { userId: rows[0].userId, usedAt: null },
      data: { usedAt: new Date() },
    });
    await tx.emailVerification.deleteMany({
      where: { userId: rows[0].userId },
    });
  });
}
export async function updateProfile(actor: Actor, name: string) {
  requireBrowser(actor);
  await db.user.update({ where: { id: actor.id }, data: { name } });
}
export async function changePassword(
  actor: Actor,
  currentPassword: string,
  password: string,
) {
  requireBrowser(actor);
  await rateLimit(actor.id, "password-change", 5, 3600000);
  const user = await db.user.findUniqueOrThrow({ where: { id: actor.id } });
  assert(
    await verifyPassword(currentPassword, user.passwordHash),
    "INVALID_CREDENTIALS",
    "Current password is incorrect.",
    401,
  );
  const digest = await passwordHash(password);
  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: actor.id },
      data: { passwordHash: digest },
    });
    await tx.session.deleteMany({ where: { userId: actor.id } });
    await tx.agentToken.updateMany({
      where: { userId: actor.id },
      data: { revokedAt: new Date() },
    });
    await tx.passwordReset.deleteMany({ where: { userId: actor.id } });
    await tx.emailVerification.deleteMany({ where: { userId: actor.id } });
  });
}
export async function closeAccount(actor: Actor, password?: string) {
  requireBrowser(actor);
  await rateLimit(actor.id, "account-close", 5, 3600000);
  const user = await db.user.findUniqueOrThrow({ where: { id: actor.id } });
  assert(
    user.passwordHash
      ? await verifyPassword(password || "", user.passwordHash)
      : actor.authProvider === "google" &&
          !!actor.authenticatedAt &&
          Date.now() - actor.authenticatedAt.getTime() < 5 * 60000,
    "INVALID_CREDENTIALS",
    user.passwordHash
      ? "Password is incorrect."
      : "Confirm your Google identity again before closing your account.",
    401,
  );
  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: actor.id },
      data: {
        name: "Closed account",
        email: `${actor.id}@closed.invalid`,
        disabledAt: new Date(),
        passwordHash: "disabled",
        googleSubject: null,
        emailVerifiedAt: null,
      },
    });
    await tx.session.deleteMany({ where: { userId: actor.id } });
    await tx.agentToken.updateMany({
      where: { userId: actor.id },
      data: { revokedAt: new Date() },
    });
    await tx.passwordReset.deleteMany({ where: { userId: actor.id } });
    await tx.emailVerification.deleteMany({ where: { userId: actor.id } });
    await tx.workspace.update({
      where: { id: actor.workspaceId },
      data: { name: "Closed workspace" },
    });
    if (actor.sellerId)
      await tx.seller.update({
        where: { id: actor.sellerId },
        data: { status: "suspended" },
      });
    await tx.auditEvent.create({
      data: {
        actor: actor.id,
        resourceId: actor.workspaceId,
        action: "account_closed",
        reason: "Personal profile redacted; financial records retained",
      },
    });
  });
}
