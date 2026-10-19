import { test, expect } from "@playwright/test";

for (const reducedMotion of ["no-preference", "reduce"] as const) {
  test(`selection and dialog focus work with motion preference: ${reducedMotion}`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion });
    await page.goto("/");
    await expect(page.locator(".offer-card")).toHaveCount(6);
    const first = page.locator(".select-offer").first();
    await first.focus();
    await page.keyboard.press("Space");
    await expect(first).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("status")).toHaveText("1 offer selected");
    const tray = page.locator(".comparison-tray");
    if (reducedMotion === "reduce") {
      await expect(tray).toHaveCSS("animation-name", "none");
      await expect(tray).toHaveCSS("translate", "none");
    }
    await page.locator(".select-offer").nth(1).click();
    await expect(page.getByRole("status")).toHaveText("2 offers selected");
    await page.getByRole("button", { name: "Clear", exact: true }).click();
    await expect(tray).toHaveCount(0);
    const source = page.locator(".offer-view").first();
    await source.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    if (reducedMotion === "reduce")
      await expect(page.getByRole("dialog")).toHaveCSS(
        "animation-name",
        "none",
      );
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(source).toBeFocused();
    await page.getByRole("tab", { name: /Drug recalls/ }).click();
    await page.getByRole("tab", { name: /Device recalls/ }).click();
    await page.getByRole("tab", { name: /All data/ }).click();
    await expect(page.locator(".offer-card")).toHaveCount(6);
  });
}

test("desktop sidebar collapses, persists and becomes a full mobile drawer", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".offer-card")).toHaveCount(6);
  const main = page.locator(".main-shell");
  await expect(main).toHaveCSS("margin-left", "232px");
  await page.getByRole("button", { name: "Collapse sidebar" }).click();
  await expect(main).toHaveCSS("margin-left", "76px");
  await expect(
    page.getByRole("button", { name: "Expand sidebar" }),
  ).toHaveAttribute("aria-expanded", "false");
  await expect(
    page.getByRole("link", { name: "Research workspace", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(main).toHaveCSS("margin-left", "76px");
  await page.getByRole("button", { name: "Guest account menu" }).click();
  await expect(
    page.locator(".account-menu").getByRole("button", { name: "Sign in" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(main).toHaveCSS("margin-left", "0px");
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(page.locator(".agent-callout")).toBeVisible();
  await expect(page.locator(".nav-link").first()).toContainText("Discover");
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 1366, height: 768 });
  await expect(main).toHaveCSS("margin-left", "76px");
  await page.getByRole("button", { name: "Expand sidebar" }).click();
  await expect(main).toHaveCSS("margin-left", "232px");
});

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
