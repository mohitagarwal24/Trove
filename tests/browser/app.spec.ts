import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { randomUUID } from "node:crypto";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { resolve } from "node:path";
import { buyer, verifiedAccount, password } from "./fixtures";
test("catalogue filtering, public preview and authenticated purchase review", async ({
  page,
}) => {
  const email = await verifiedAccount();
  await page.goto("/discover");
  await expect(page.locator(".offer-card")).toHaveCount(6);
  await page.getByRole("tab", { name: /Drug recalls/ }).click();
  await expect(page.locator(".offer-card")).toHaveCount(2);
  await page.getByRole("tab", { name: /All data/ }).click();
  await page
    .getByRole("textbox", { name: "Search data offers" })
    .fill("Drug approval dossiers");
  await expect(page.locator(".offer-card")).toHaveCount(1);
  await page
    .locator(".offer-card")
    .getByRole("button", { name: /^View / })
    .click();
  await expect(page.getByRole("dialog").locator("tbody tr")).toHaveCount(2);
  await expect(page.getByRole("dialog")).toContainText("openFDA");
  await page.getByRole("button", { name: "Add to comparison" }).click();
  await page.getByRole("button", { name: "Back to catalogue" }).click();
  await page.getByRole("button", { name: "Compare & review" }).click();
  await expect(page.getByRole("dialog")).toContainText("Welcome back");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page
    .getByRole("button", { name: "Sign in", exact: true })
    .last()
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "Review your purchase plan",
  );
  await expect(page.getByRole("dialog")).toContainText("$3.20");
  const { capabilities } = await (
    await page.request.get("/api/bootstrap")
  ).json();
  const checkout = page.getByRole("button", { name: /Continue with PayPal/ });
  if (capabilities.paypal) await expect(checkout).toBeEnabled();
  else await expect(checkout).toBeDisabled();
  // Buyer approval is intentionally manual; this test never moves money.
});
test("account profile persists and private purchases start empty", async ({
  page,
}) => {
  const email = await buyer(page);
  await page.goto("/account");
  await expect(page.getByText(email, { exact: true }).first()).toBeVisible();
  await page.getByLabel("Name", { exact: true }).fill("Updated Buyer");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByRole("status")).toContainText("Profile updated");
  await page.reload();
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue(
    "Updated Buyer",
  );
  await page.goto("/purchases");
  await expect(
    page.getByRole("heading", { name: "A clean slate" }),
  ).toBeVisible();
});
test("provider onboarding and encrypted upload remain pending review", async ({
  page,
}) => {
  await buyer(page);
  await page.goto("/seller");
  await page
    .getByLabel("Provider name")
    .fill(`Acceptance Provider ${randomUUID().slice(0, 8)}`);
  await page
    .getByLabel("What data do you provide?")
    .fill("Regulatory data prepared for independent research teams.");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create provider profile" }).click();
  await expect(page.getByText(/Your profile is under review/)).toBeVisible();
  await page
    .getByRole("button", { name: "Publish dataset", exact: true })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Publish dataset", exact: true }).last(),
  ).toBeDisabled();
  await expect(page.getByRole("dialog").getByRole("checkbox")).toHaveCount(2);
  const source = (
    await (await page.request.get("/api/offers")).json()
  ).offers.find(
    (o: { offerId: string }) => o.offerId === "drug-approvals-full",
  );
  const title = `Acceptance data ${randomUUID().slice(0, 8)}`;
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Title", { exact: true }).fill(title);
  await dialog
    .getByLabel("Description", { exact: true })
    .fill("Source-linked regulatory records prepared for acceptance testing.");
  await dialog.getByLabel("Source URL", { exact: true }).fill(source.sourceUrl);
  await dialog
    .getByLabel("Licence URL", { exact: true })
    .fill(source.sourceLicenseUrl);
  await dialog
    .getByLabel("Attribution", { exact: true })
    .fill(source.sourceAttribution);
  await dialog
    .getByLabel("Source last updated", { exact: true })
    .fill(source.freshnessAt.slice(0, 10));
  await dialog.getByLabel("Data file (JSON)").setInputFiles({
    name: "fda-records.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(source.preview)),
  });
  await dialog
    .getByRole("checkbox", { name: /I have distribution rights/ })
    .check();
  await dialog
    .getByRole("button", { name: "Publish dataset", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  await expect(page.locator(".seller-offers-table")).toContainText(title);
  const catalogue = await (await page.request.get("/api/offers")).json();
  expect(
    catalogue.offers.some((o: { title: string }) => o.title === title),
  ).toBeFalsy();
});
test("MCP uses a scoped revocable token and never delegates payment approval", async ({
  page,
}) => {
  await buyer(page);
  await page.goto("/connect");
  await page.getByText("Advanced access tokens", { exact: true }).click();
  await page.getByRole("button", { name: "Create agent token" }).click();
  await page.getByRole("button", { name: "Create token", exact: true }).click();
  const token = await page.locator(".secret-token code").innerText();
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json, text/event-stream",
    "Content-Type": "application/json",
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
        clientInfo: { name: "acceptance-client", version: "1" },
      })
    ).ok(),
  ).toBeTruthy();
  const listing = await (await call(2, "tools/list", {})).json();
  expect(listing.result.tools).toHaveLength(9);
  expect(
    listing.result.tools.map((t: { name: string }) => t.name),
  ).not.toContain("capture_payment");
  const search = await (
    await call(3, "tools/call", {
      name: "search_offers",
      arguments: { query: "Drug approval" },
    })
  ).json();
  expect(search.result.content[0].text).toContain("Drug approval");
  const discovery = await (
    await call(4, "tools/call", {
      name: "discover_data",
      arguments: {
        query: "Drug approvals",
        purpose: "ai_inference",
        budgetCents: 1000,
        needs: [
          {
            category: "Drug approvals",
            fields: ["brand_name"],
            quantity: 2,
            maxAgeDays: 3650,
            filters: [],
          },
        ],
      },
    })
  ).json();
  const discovered = JSON.parse(discovery.result.content[0].text);
  expect(discovered.selectedOfferIds.length).toBeGreaterThan(0);
  expect(discovered.nextAction).toBe("create_quote");
  const bridge = new Client({ name: "desktop-acceptance", version: "1" });
  const stdio = new StdioClientTransport({
    command: process.execPath,
    args: [resolve("scripts/mcp-bridge.mjs")],
    env: { TROVE_URL: new URL(page.url()).origin, TROVE_AGENT_TOKEN: token },
    stderr: "pipe",
  });
  await bridge.connect(stdio);
  expect((await bridge.listTools()).tools).toHaveLength(9);
  const bridged = await bridge.callTool({
    name: "discover_data",
    arguments: {
      query: "Drug recalls",
      purpose: "ai_inference",
      budgetCents: 1000,
      needs: [
        {
          category: "Drug recalls",
          fields: ["reason_for_recall"],
          quantity: 2,
          maxAgeDays: 3650,
          filters: [],
        },
      ],
    },
  });
  expect(bridged.isError).not.toBe(true);
  await page.getByRole("button", { name: "I’ve saved my token" }).click();
  await page.getByRole("button", { name: "Revoke Research agent" }).click();
  await expect(page.getByText("Revoked", { exact: true })).toBeVisible();
  expect((await call(4, "tools/list", {})).status()).toBe(401);
  await expect(
    bridge.callTool({ name: "search_offers", arguments: {} }),
  ).rejects.toThrow();
  await bridge.close();
  await page.getByLabel("Agent client").selectOption("claude");
  await expect(page.locator(".code-block pre")).toContainText(
    "claude mcp add --transport http trove",
  );
  await page.getByLabel("Agent client").selectOption("desktop");
  await expect(page.locator(".code-block pre")).toContainText("/api/mcp");
  await expect(page.locator(".code-block pre")).not.toContainText(
    "TROVE_AGENT_TOKEN",
  );
});
test("research availability follows real configuration", async ({ page }) => {
  await buyer(page);
  const { capabilities } = await (
    await page.request.get("/api/bootstrap")
  ).json();
  await page.goto("/workspace");
  const run = page.getByRole("button", { name: "Find sources", exact: true });
  await page
    .getByRole("button", { name: "Choose requirements", exact: true })
    .click();
  await expect(run).toBeEnabled();
  const brief = page.getByRole("button", {
    name: "Describe a brief",
    exact: true,
  });
  if (capabilities.ai) {
    await brief.click();
    await expect(run).toBeEnabled();
  } else await expect(brief).toBeDisabled();
  await expect(
    page.getByRole("combobox", { name: /Research mode/ }),
  ).toHaveCount(0);
});
test("mobile navigation stays within the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/discover");
  await expect(page.locator(".offer-card")).toHaveCount(6);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page
    .getByRole("link", { name: "Research workspace", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Find sources", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
});
test("catalogue and account have no serious accessibility violations", async ({
  page,
}) => {
  await buyer(page);
  for (const route of [
    "/discover",
    "/dashboard",
    "/account",
    "/seller",
    "/connect",
  ]) {
    await page.goto(route);
    await expect(page.locator("h1")).toBeVisible();
    // Measure readable, settled content rather than an intermediate arrival frame.
    await expect(page.locator(".page-enter").first()).toHaveCSS("opacity", "1");
    const result = await new AxeBuilder({ page }).analyze();
    expect(
      result.violations
        .filter((v) => v.impact === "serious" || v.impact === "critical")
        .map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) })),
    ).toEqual([]);
  }
});
