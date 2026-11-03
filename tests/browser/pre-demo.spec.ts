import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdirSync, readFileSync } from "node:fs";
import { buyer, ownedDataFixture } from "./fixtures";
const captures = ".local/pre-demo/captures";
mkdirSync(captures, { recursive: true });

test("research gaps persist, cap recovery is explicit, and reused scope creates an editable draft", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await buyer(page);
  await page.goto("/workspace?start=drug-recalls");
  await page.getByLabel("Records per category").fill("2");
  await page.getByLabel("Task spending limit").fill("0.50");
  const response = page.waitForResponse(
    (r) => r.url().endsWith("/api/tasks") && r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Find sources", exact: true }).click();
  const body = await (await response).json();
  const min = body.discovery.minimumCompleteTotalCents;
  expect(min).toBeGreaterThan(50);
  const setLimit = page.getByRole("button", {
    name: `Set limit to $${(min / 100).toFixed(2)}`,
    exact: true,
  });
  await expect(setLimit).toBeVisible();
  await expect(
    page.getByText(
      "Requirements changed. Find sources again to refresh this comparison.",
    ),
  ).toHaveCount(0);
  await page.screenshot({
    path: `${captures}/01-budget-gap-desktop.png`,
    fullPage: true,
  });
  await page.goto(`/workspace?task=${body.task.id}`);
  await expect(setLimit).toBeVisible();
  let submissions = 0;
  page.on("request", (r) => {
    if (r.method() === "POST" && r.url().endsWith("/api/tasks")) submissions++;
  });
  await setLimit.click();
  await expect(page.getByLabel("Task spending limit")).toHaveValue(
    (min / 100).toFixed(2),
  );
  await expect(page.getByLabel("Task spending limit")).toBeFocused();
  expect(submissions).toBe(0);
  const retry = page.waitForResponse(
    (r) => r.url().endsWith("/api/tasks") && r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Find sources", exact: true }).click();
  const next = await (await retry).json();
  await expect(
    page.getByRole("button", { name: "Review purchase plan", exact: true }),
  ).toBeEnabled();
  await expect(page.locator(".decision-coverage").first()).toContainText(
    "2 requested · 50 available · 5/5 required fields",
  );
  await page.screenshot({
    path: `${captures}/02-coverage-desktop.png`,
    fullPage: true,
  });
  await page.getByLabel("Records per category").fill("3");
  await expect(
    page.getByRole("button", { name: "Review purchase plan", exact: true }),
  ).toBeDisabled();
  await page.getByRole("link", { name: "Reuse scope", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`from=${next.task.id}`));
  await expect(page.getByLabel("Records per category")).toHaveValue("2");
  await expect(page.locator(".source-decision")).toHaveCount(0);
  expect(submissions).toBe(1);
  expect(await (await page.request.get("/api/purchases")).json()).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/workspace?task=${next.task.id}`);
  await expect(page.locator(".decision-coverage").first()).toBeVisible();
  await page.screenshot({
    path: `${captures}/03-coverage-mobile.png`,
    fullPage: true,
  });
  await page.goto("/purchases?view=data");
  await expect(
    page.getByRole("heading", { name: "Your library starts with a purchase" }),
  ).toBeVisible();
  await page.screenshot({
    path: `${captures}/04-library-empty-mobile.png`,
    fullPage: true,
  });
});

test("owned sources export actual entitled evidence and two scoped agent clients reuse the same result", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await buyer(page);
  const fixture = await ownedDataFixture(page);
  await page.goto("/purchases?view=data");
  await expect(page.locator(".owned-source")).toHaveCount(1);
  await expect(page.locator(".owned-source")).toContainText(fixture.title);
  await page.screenshot({
    path: `${captures}/05-library-desktop.png`,
    fullPage: true,
  });
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Evidence pack", exact: true })
    .click();
  const file = await download;
  const evidence = JSON.parse(readFileSync((await file.path())!, "utf8"));
  expect(evidence.payment.captureId).toBe(fixture.captureId);
  expect(evidence.sources[0].rows).toHaveLength(2);
  expect(evidence.sources[0].content.fingerprint).toMatch(/^[a-f0-9]{64}$/);
  await page.getByLabel("Search purchased sources").fill("no-match");
  await expect(
    page.getByRole("heading", { name: "No matching sources" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear search", exact: true }).click();
  await expect(page.locator(".owned-source")).toHaveCount(1);
  await page.getByRole("link", { name: "Receipt", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Receipt & provenance" }),
  ).toHaveClass("active");
  await page.screenshot({
    path: `${captures}/10-receipt-desktop.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: /^Purchased data/ }).click();
  await expect(
    page.getByRole("button", { name: "Evidence pack", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: `${captures}/11-purchased-data-desktop.png`,
    fullPage: true,
  });
  const origin = new URL(page.url()).origin;
  for (const name of ["Research client A", "Research client B"]) {
    const token = await (
      await page.request.post("/api/tokens", {
        headers: { Origin: origin },
        data: { name, scopes: ["read"] },
      })
    ).json();
    const headers = {
      Authorization: `Bearer ${token.value}`,
      Accept: "application/json, text/event-stream",
    };
    const call = (id: number, method: string, params: object) =>
      page.request.post("/api/mcp", {
        headers,
        data: { jsonrpc: "2.0", id, method, params },
      });
    expect(
      (
        await call(1, "initialize", {
          protocolVersion: "2025-03-26",
          capabilities: {},
          clientInfo: { name, version: "1" },
        })
      ).ok(),
    ).toBeTruthy();
    const result = await (
      await call(2, "tools/call", {
        name: "get_result",
        arguments: { purchaseId: fixture.purchaseId },
      })
    ).json();
    expect(result.result.isError).not.toBe(true);
    expect(
      JSON.parse(result.result.content[0].text).sources[0].rows,
    ).toHaveLength(2);
    const before = (await (await page.request.get("/api/tokens")).json()).find(
      (t: { id: string }) => t.id === token.id,
    );
    expect(before.lastTool).toBe("get_result");
    await call(3, "tools/call", {
      name: "get_result",
      arguments: { purchaseId: "unavailable-workspace-purchase" },
    });
    const after = (await (await page.request.get("/api/tokens")).json()).find(
      (t: { id: string }) => t.id === token.id,
    );
    expect(after.lastUsedAt).toBe(before.lastUsedAt);
  }
  expect((await (await page.request.get("/api/purchases")).json()).length).toBe(
    1,
  );
  await page.goto("/connect");
  await page.getByText("Advanced access tokens", { exact: true }).click();
  await expect(page.locator(".agent-activity")).toHaveCount(2);
  await expect(page.locator(".agent-activity").first()).toContainText(
    "get result",
  );
  await page.screenshot({
    path: `${captures}/06-agent-activity-desktop.png`,
    fullPage: true,
  });
  await page.setViewportSize({ width: 1366, height: 610 });
  await page.goto("/purchases?view=data");
  await expect(page.locator(".owned-source")).toBeVisible();
  await page.screenshot({
    path: `${captures}/08-library-short.png`,
    fullPage: true,
  });
  await page.setViewportSize({ width: 1000, height: 768 });
  await page.screenshot({
    path: `${captures}/09-library-tablet.png`,
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/purchases?view=data");
  await expect(page.locator(".owned-source")).toBeVisible();
  await page.screenshot({
    path: `${captures}/07-library-mobile.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  // Footer wordmark is a logotype (WCAG contrast exemption); content and controls remain measured.
  const violations = (
    await new AxeBuilder({ page }).exclude(".app-footer .brand-small").analyze()
  ).violations.filter((v) => ["serious", "critical"].includes(v.impact || ""));
  expect(violations).toEqual([]);
});
