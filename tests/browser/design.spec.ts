import { test, expect } from "@playwright/test";

test("laptop sidebar keeps the agent panel and account within the viewport", async ({
  page,
}) => {
  for (const viewport of [
    { width: 1366, height: 768 },
    { width: 1280, height: 720 },
    { width: 1708, height: 960 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await expect(page.locator(".offer-card")).toHaveCount(6);
    for (const selector of [".agent-callout", ".profile"]) {
      const box = await page.locator(selector).boundingBox();
      expect(box).not.toBeNull();
      expect(box!.y).toBeGreaterThanOrEqual(0);
      expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height + 1);
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
  }
  // A heavily zoomed/short viewport may scroll the middle, but never lose controls.
  await page.setViewportSize({ width: 960, height: 480 });
  await page.locator(".agent-callout a").focus();
  await expect(page.locator(".agent-callout a")).toBeInViewport();
  await expect(page.locator(".profile")).toBeInViewport();
});

test("search shortcut works without interrupting text entry", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".offer-card")).toHaveCount(6);
  await page.keyboard.press("/");
  const search = page.getByRole("textbox", { name: "Search data offers" });
  await expect(search).toBeFocused();
  await page.keyboard.type("retail/");
  await expect(search).toHaveValue("retail/");
  await search.fill("");
  await expect(page.locator(".offer-card")).toHaveCount(6);
  await page.locator(".select-offer").first().click();
  await expect(page.locator(".comparison-tray")).toContainText(
    "1 offer selected",
  );
  await expect(page.locator(".offer-selected")).toHaveCount(1);
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  await expect(page.locator(".comparison-tray")).toHaveCount(0);
});

test("mobile drawer contains keyboard focus and restores it on Escape", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator(".offer-card")).toHaveCount(6);
  const trigger = page.getByRole("button", { name: "Open navigation" });
  await trigger.click();
  await expect(
    page.getByRole("dialog", { name: "Workspace navigation" }),
  ).toHaveAttribute("aria-modal", "true");
  await expect(page.locator(".main-shell")).toHaveAttribute("inert", "");
  const close = page.locator(".mobile-nav-close");
  await expect(close).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(page.locator(".profile")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(close).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator(".sidebar")).toHaveAttribute("inert", "");
  await expect(page.locator(".main-shell")).not.toHaveAttribute("inert", "");
});
