import { test, expect } from "@playwright/test";
import { buyer, purchaseDisplayFixture } from "./fixtures";

test("category changes never leave offers from the previous category clickable", async ({
  page,
}) => {
  await page.goto("/discover");
  await expect(page.locator(".offer-card")).toHaveCount(6);
  for (const category of ["Drug recalls", "Device recalls", "Drug approvals"]) {
    await page.getByRole("tab", { name: new RegExp(category) }).click();
    const labels = await page
      .locator(".offer-card .offer-tags")
      .allTextContents();
    expect(labels).toHaveLength(2);
    expect(labels.every((label) => label.includes(category))).toBe(true);
  }
  await page.goto("/account");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  const password = page.getByLabel("Password", { exact: true });
  await password.fill("A password I can inspect");
  await page
    .getByRole("button", { name: "Show password", exact: true })
    .click();
  await expect(password).toHaveAttribute("type", "text");
  await page
    .getByRole("button", { name: "Hide password", exact: true })
    .click();
  await expect(password).toHaveAttribute("type", "password");
  await expect(password).toHaveValue("A password I can inspect");
});
test("purchase status replaces the timeline without hiding approval, receipts or delivery checks", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1192, height: 507 });
  await buyer(page);
  for (const state of ["voided", "awaiting_approval"] as const) {
    const id = await purchaseDisplayFixture(page, state);
    await page.goto(`/purchases/${id}`);
    await expect(page.locator(".purchase-statuses")).toContainText(
      state.replaceAll("_", " "),
    );
    await expect(page.locator(".purchase-statuses")).toContainText("pending");
    await expect(
      page.getByRole("heading", { name: "Purchase progress", exact: true }),
    ).toHaveCount(0);
    await expect(page.locator(".progress-steps, .scroll-progress")).toHaveCount(
      0,
    );
    if (state === "awaiting_approval")
      await expect(
        page.getByRole("heading", { name: "Approve purchase", exact: true }),
      ).toBeVisible();
    else
      await expect(
        page.getByRole("heading", { name: "Purchase stopped", exact: true }),
      ).toBeVisible();
    await page
      .getByRole("button", { name: "Receipt & provenance", exact: true })
      .click();
    await expect(page.locator(".receipt-sheet")).toBeVisible();
    await page
      .getByRole("button", { name: "Delivery checks", exact: true })
      .click();
    await expect(page.locator(".result-tabs button.active")).toHaveText(
      "Delivery checks",
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/purchases");
  await expect(page.locator(".purchase-table tbody tr")).toHaveCount(2);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.locator(".purchase-table-panel .table-scroll").evaluate((el) => {
    el.scrollLeft = el.scrollWidth;
  });
  await expect(
    page.locator(".purchase-table tbody tr").first().getByRole("link").last(),
  ).toBeInViewport();

});

for (const reducedMotion of ["no-preference", "reduce"] as const) {
  test(`source reveal respects motion preference without a scroll bar: ${reducedMotion}`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion });
    await page.addInitScript(() => {
      const state = window as typeof window & { inventoryAnimations: number };
      state.inventoryAnimations = 0;
      const animate = Element.prototype.animate;
      Element.prototype.animate = function (keyframes, options) {
        if (this.matches("[data-reveal]")) state.inventoryAnimations++;
        return animate.call(this, keyframes, options);
      };
    });
    await page.goto("/discover");
    await expect(page.locator(".offer-card")).toHaveCount(6);
    await page.locator(".offer-card").last().scrollIntoViewIfNeeded();
    await expect(page.locator(".topbar")).toHaveAttribute(
      "data-scrolled",
      "true",
    );
    await expect(page.locator(".scroll-progress")).toHaveCount(0);
    const count = await page.evaluate(
      () =>
        (window as typeof window & { inventoryAnimations: number })
          .inventoryAnimations,
    );
    if (reducedMotion === "reduce") expect(count).toBe(0);
    else expect(count).toBeGreaterThan(0);
    await page.evaluate(() => scrollTo(0, 0));
    await expect(page.locator(".topbar")).toHaveAttribute(
      "data-scrolled",
      "false",
    );
  });
}

test("long mobile dialogs keep their heading, close control and final action reachable", async ({
  page,
}) => {
  await buyer(page);
  const onboard = await page.request.post("/api/seller/onboard", {
    headers: {
      Origin: new URL(
        page.url() === "about:blank" ? "http://localhost:3000" : page.url(),
      ).origin,
    },
    data: {
      name: "Dialog Review",
      description: "A local test of structured dataset publishing controls.",
      rightsAttested: true,
    },
  });
  expect(onboard.ok()).toBe(true);
  await page.setViewportSize({ width: 390, height: 700 });
  await page.goto("/seller");
  await page
    .getByRole("button", { name: "Publish dataset", exact: true })
    .first()
    .click();
  const heading = page.getByRole("heading", {
    name: "Publish a dataset",
    exact: true,
  });
  await expect(heading).toBeVisible();
  await page.getByRole("dialog").evaluate(async (el) => {
    await Promise.all(
      el.getAnimations().map((animation) => animation.finished.catch(() => {})),
    );
  });
  const before = await heading.boundingBox();
  await page.locator(".dialog-body").evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  await expect(
    page.getByRole("button", { name: "Publish dataset", exact: true }).last(),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Close dialog", exact: true }),
  ).toBeVisible();
  const after = await heading.boundingBox();
  expect(after?.y).toBe(before?.y);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
