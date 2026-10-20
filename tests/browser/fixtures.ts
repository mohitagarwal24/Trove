import { PrismaClient } from "@prisma/client";
import {
  createHash,
  createHmac,
  randomBytes,
  randomUUID,
  scryptSync,
} from "node:crypto";
import { test, expect, type Page } from "@playwright/test";

process.loadEnvFile(".env");
const db = new PrismaClient();
export const password = "Browser acceptance password 42";
function localDatabase() {
  if (
    !["localhost", "127.0.0.1"].includes(
      new URL(process.env.DATABASE_URL!).hostname,
    ) ||
    !["localhost", "127.0.0.1"].includes(
      new URL(process.env.TROVE_TEST_URL || "http://localhost:3000").hostname,
    )
  )
    throw new Error(
      "Account fixtures require a local app and isolated local database.",
    );
}
export async function verifiedAccount() {
  localDatabase();
  const email = `browser-${randomUUID()}@example.com`,
    salt = randomBytes(16).toString("hex");
  await db.user.create({
    data: {
      email,
      name: "Acceptance Buyer",
      emailVerifiedAt: new Date(),
      passwordHash: `${salt}:${scryptSync(password, salt, 64).toString("hex")}`,
      memberships: {
        create: {
          role: "owner",
          workspace: { create: { name: "Acceptance workspace" } },
        },
      },
    },
  });
  return email;
}
export async function buyer(page: Page) {
  const email = await verifiedAccount();
  const response = await page.request.post("/api/auth/login", {
    data: { email, password },
  });
  expect(response.ok()).toBeTruthy();
  expect((await response.json()).signedIn).toBe(true);
  return email;
}
export async function verificationDelivery(page: Page) {
  localDatabase();
  const code = "401829";
  // Test-only delivered-code fixture. The production confirmation endpoint is real;
  // external Gmail sending is exercised separately at its HTTPS boundary.
  await page.route("**/api/auth/verification/send", async (route) => {
    const cookie = (await page.context().cookies()).find(
      (c) => c.name === "trove_session",
    )!;
    const sessionId = createHash("sha256").update(cookie.value).digest("hex");
    const session = await db.session.findUniqueOrThrow({
      where: { id: sessionId },
    });
    const nonce = randomBytes(32).toString("hex"),
      sentAt = new Date();
    const digest = createHmac(
      "sha256",
      Buffer.from(process.env.RESULT_ENCRYPTION_KEY!, "hex"),
    )
      .update(`trove-email-verification:${session.userId}:${nonce}:${code}`)
      .digest("hex");
    const data = {
      sessionId,
      nonce,
      digest,
      sentAt,
      expiresAt: new Date(Date.now() + 600000),
      attempts: 0,
    };
    await db.emailVerification.upsert({
      where: { userId: session.userId },
      create: { userId: session.userId, ...data },
      update: data,
    });
    await route.fulfill({
      json: {
        sent: true,
        verified: false,
        resendAt: new Date(sentAt.getTime() + 60000).toISOString(),
      },
    });
  });
  return code;
}
test.afterAll(async () => {
  await db.$disconnect();
});
