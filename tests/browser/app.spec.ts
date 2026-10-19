import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
async function buyer(page: import("@playwright/test").Page) {
  await page.request.post("/api/auth/demo", { data: { account: "buyer" } });
}
test("catalogue filtering, offer previews and immutable comparison", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".offer-card")).toHaveCount(8);
  await page.getByRole("tab", { name: /Suppliers/ }).click();
  await expect(page.locator(".offer-card")).toHaveCount(3);
  await page.getByRole("tab", { name: /All data/ }).click();
  await page
    .getByRole("textbox", { name: "Search data offers" })
    .fill("Current retail price intelligence");
  await expect(page.locator(".offer-card")).toHaveCount(1);
  await page
    .getByRole("button", {
      name: "View Current retail price intelligence",
      exact: true,
    })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByText("Approved public preview")).toBeVisible();
  await expect(page.getByRole("dialog").locator("tbody tr")).toHaveCount(2);
  await page.getByRole("button", { name: "Add to comparison" }).click();
  await page.getByRole("button", { name: "Back to catalogue" }).click();
  await page.getByRole("button", { name: "Compare & review" }).click();
  await expect(page.getByRole("dialog")).toContainText("$2.40");
  const { capabilities } = await (
    await page.request.get("/api/bootstrap")
  ).json();
  // Configuration controls availability; this test never starts PayPal checkout.
  const checkout = page.getByRole("button", {
    name: /Continue to sandbox checkout/,
  });
  if (capabilities.paypal) await expect(checkout).toBeEnabled();
  else await expect(checkout).toBeDisabled();
});
test("research task completes a labelled simulation and preserves results on reload", async ({
  page,
}) => {
  await buyer(page);
  await page.goto("/workspace");
  await page
    .getByRole("combobox", { name: /^Research mode/ })
    .selectOption("demo");
  await page.getByRole("button", { name: "Run guided research" }).click();
  await page.getByRole("button", { name: "Review purchase plan" }).click();
  await page.getByRole("button", { name: "Continue in simulation" }).click();
  await page.getByRole("button", { name: "Run simulated purchase" }).click();
  await expect(
    page.getByRole("heading", { name: "Your evidence is ready." }),
  ).toBeVisible();
  await expect(page.getByText("Simulation — no money moved")).toBeVisible();
  await expect(page.locator(".source-result")).toHaveCount(2);
  await page.reload();
  await expect(page.locator(".source-result")).toHaveCount(2);
  const { capabilities } = await (
    await page.request.get("/api/bootstrap")
  ).json();
  if (!capabilities.ai) {
    await page.getByRole("button", { name: "Summarise demo data" }).click();
    await expect(page.locator(".answer-text")).toContainText(
      "without an AI model call",
    );
    await expect(page.locator(".answer-text")).toContainText("Atlas Supply");
  }
  await page.getByRole("button", { name: "Receipt & provenance" }).click();
  await expect(page.locator(".receipt-sheet")).toContainText("SIM-CAPTURE-");
  await page.getByRole("button", { name: "Delivery checks" }).click();
  await expect(page.locator(".execution-checks")).toHaveCount(2);
  await page.getByRole("button", { name: "Request a refund" }).click();
  await page
    .getByLabel("Reason", { exact: true })
    .fill(
      "Browser acceptance test of the simulated refund and access revocation.",
    );
  await page.getByRole("button", { name: "Confirm refund request" }).click();
  await expect(page.locator(".independent-states")).toContainText("refunded");
  await page
    .getByRole("button", { name: "Purchased data", exact: true })
    .click();
  await expect(page.getByText("Access revoked after refund")).toBeVisible();
  await expect(page.locator(".source-result")).toHaveCount(0);
});
test("failed connector checks stop a bundle without a charge", async ({
  page,
}) => {
  await buyer(page);
  await page.goto("/workspace");
  await page
    .getByRole("combobox", { name: /^Research mode/ })
    .selectOption("demo");
  await page.getByRole("button", { name: "Run guided research" }).click();
  await page.getByRole("button", { name: "Review purchase plan" }).click();
  await page.getByRole("button", { name: "Continue in simulation" }).click();
  await page.getByLabel("Demonstration scenario").selectOption("missing_field");
  await page.getByRole("button", { name: "Run simulated purchase" }).click();
  await expect(
    page.getByRole("heading", { name: "This purchase was stopped." }),
  ).toBeVisible();
  await expect(page.locator(".independent-states")).toContainText("voided");
  await expect(page.locator(".source-result")).toHaveCount(0);
});
test("seller edits create a new version in an isolated seller account", async ({
  page,
}) => {
  await page.request.post("/api/auth/demo", { data: { account: "pricing" } });
  await page.goto("/seller");
  const row = page.locator(".seller-offers-table tbody tr").first();
  const oldVersion = await row.locator(".badge").first().innerText();
  await row.getByRole("button", { name: "Edit offer" }).click();
  await page.getByRole("button", { name: /Publish version/ }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  const offers = await (await page.request.get("/api/offers")).json();
  expect(
    offers.offers.filter(
      (o: { offerId: string }) => o.offerId === "northstar-current",
    ),
  ).toHaveLength(1);
  expect(
    offers.offers.find(
      (o: { offerId: string }) => o.offerId === "northstar-current",
    ).version,
  ).toBeGreaterThan(Number(oldVersion.replace("v", "")));
});
test("MCP uses a scoped revocable token and never delegates approval", async ({
  page,
}) => {
  await buyer(page);
  await page.goto("/connect");
  await page.getByRole("button", { name: "Create agent token" }).click();
  await page.getByRole("button", { name: "Create token", exact: true }).click();
  const token = await page.locator(".secret-token code").innerText();
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json, text/event-stream",
    "Content-Type": "application/json",
  };
  const initialized = await page.request.post("/api/mcp", {
    headers,
    data: {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-03-26",
        capabilities: {},
        clientInfo: { name: "playwright-external-client", version: "1.0" },
      },
    },
  });
  expect(initialized.ok()).toBeTruthy();
  const listing = await page.request.post("/api/mcp", {
    headers,
    data: { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} },
  });
  const tools = await listing.json();
  expect(tools.result.tools).toHaveLength(7);
  expect(tools.result.tools.map((t: { name: string }) => t.name)).not.toContain(
    "capture_payment",
  );
  const search = await page.request.post("/api/mcp", {
    headers,
    data: {
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: { name: "search_offers", arguments: { query: "current retail" } },
    },
  });
  expect((await search.json()).result.content[0].text).toContain(
    "Current retail price intelligence",
  );
  await page.getByRole("button", { name: "I’ve saved my token" }).click();
  const tokenRow = page
    .locator(".token-row")
    .filter({ hasText: token.slice(0, 12) });
  await tokenRow
    .getByRole("button", { name: "Revoke Codex research agent" })
    .click();
  await expect(tokenRow.getByText("Revoked", { exact: true })).toBeVisible();
  const revoked = await page.request.post("/api/mcp", {
    headers,
    data: { jsonrpc: "2.0", id: 4, method: "tools/list", params: {} },
  });
  expect(revoked.status()).toBe(401);
});
test("mobile layout stays within the viewport and navigation remains usable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator(".offer-card")).toHaveCount(8);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page
    .getByRole("link", { name: "Research workspace", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: /^Research mode/ })
    .selectOption("demo");
  await expect(
    page.getByRole("button", { name: "Run guided research" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
});
test("catalogue accessibility has no serious or critical violations", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".offer-card")).toHaveCount(8);
  const result = await new AxeBuilder({ page }).analyze();
  const failures = result.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  expect(
    failures.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => ({
        target: n.target,
        summary: n.failureSummary,
      })),
    })),
  ).toEqual([]);
});
