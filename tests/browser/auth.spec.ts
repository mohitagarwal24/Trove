import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { randomUUID } from "node:crypto";
import { password, verificationDelivery } from "./fixtures";

for (const width of [1366, 390]) {
  test(`email verification resumes signup and returns to purchase review at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 768 });
    const code = await verificationDelivery(page);
    await page.goto("/discover");
    await page.locator(".select-offer").first().click();
    await page.getByRole("button", { name: "Compare & review" }).click();
    await page
      .getByRole("button", { name: "Create an account", exact: true })
      .click();
    const email = `browser-otp-${randomUUID()}@example.com`;
    await page.getByLabel("Name", { exact: true }).fill("Email Researcher");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page
      .getByRole("button", { name: "Create account", exact: true })
      .click();
    const dialog = page.getByRole("dialog"),
      input = page.getByLabel("Verification code");
    await expect(dialog).toContainText("Verify your email");
    await expect(dialog).toContainText(email);
    await expect(input).toBeFocused();
    await expect(dialog.getByRole("status")).toContainText("Code sent");
    await expect(
      page.getByRole("button", { name: /Resend in/ }),
    ).toBeDisabled();
    const pending = await (await page.request.get("/api/bootstrap")).json();
    expect(pending.user).toBeNull();
    expect((await page.request.get("/api/purchases")).status()).toBe(403);
    const blocked = await page.request.post("/api/tokens", {
      headers: { Origin: new URL(page.url()).origin },
      data: { name: "Blocked", scopes: ["read"] },
    });
    expect(blocked.status()).toBe(403);
    expect((await blocked.json()).error.code).toBe("EMAIL_NOT_VERIFIED");
    await input.fill("000000");
    await page
      .getByRole("button", { name: "Verify email", exact: true })
      .click();
    await expect(dialog.getByRole("alert")).toContainText(
      "incorrect or expired",
    );
    await page.screenshot({ path: `.local/verification-${width}.png` });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    const violations = (
      await new AxeBuilder({ page }).include('[role="dialog"]').analyze()
    ).violations.filter((v) =>
      ["serious", "critical"].includes(v.impact || ""),
    );
    expect(violations).toEqual([]);
    await input.fill(code);
    await page
      .getByRole("button", { name: "Verify email", exact: true })
      .click();
    await expect(dialog).toContainText("Review your purchase plan");
    expect(
      (await (await page.request.get("/api/bootstrap")).json()).user.email,
    ).toBe(email);
  });
}
test("a pending email step survives reload and can switch accounts", async ({
  page,
}) => {
  await verificationDelivery(page);
  const email = `browser-resume-${randomUUID()}@example.com`;
  await page.request.post("/api/auth/register", {
    data: { name: "Pending Researcher", email, password },
  });
  await page.goto("/account");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Verify your email");
  await page.getByRole("button", { name: "Send code", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Code sent");
  await page.reload();
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(email);
  await page
    .getByRole("button", { name: "Use another account", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("Welcome back");
  expect(
    (await page.context().cookies()).some((c) => c.name === "trove_session"),
  ).toBe(false);
});
