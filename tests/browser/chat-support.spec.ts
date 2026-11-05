import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync, mkdirSync } from "node:fs";
import { buyer, ownedDataFixture } from "./fixtures";

const captures = ".local/chat-support/captures";
mkdirSync(captures, { recursive: true });
const request = {
  query: "Recall reasons and status with source links",
  needs: [
    {
      category: "Drug recalls",
      fields: [
        "recall_number",
        "classification",
        "status",
        "reason_for_recall",
        "source_url",
      ],
      quantity: 2,
      maxAgeDays: 30,
      filters: [],
    },
  ],
  budgetCents: 1000,
  purpose: "ai_inference",
};
async function host(
  page: Page,
  initialTool: string,
  args: object,
  scopes = ["read"],
) {
  const created = await page.request.post("/api/tokens", {
    headers: {
      Origin: new URL(process.env.TROVE_TEST_URL || "http://localhost:3000")
        .origin,
    },
    data: { name: "Local chat UI acceptance", scopes },
  });
  expect(created.ok()).toBe(true);
  const { value } = await created.json();
  const calls: string[] = [];
  const call = async (name: string, args: object) => {
    calls.push(name);
    const response = await page.request.post("/api/mcp", {
      headers: {
        Authorization: `Bearer ${value}`,
        Accept: "application/json, text/event-stream",
      },
      data: {
        jsonrpc: "2.0",
        id: calls.length,
        method: "tools/call",
        params: { name, arguments: args },
      },
    });
    expect(response.ok()).toBe(true);
    return (await response.json()).result;
  };
  const initial = await call(initialTool, args);
  await page.exposeFunction("troveTestCall", call);
  await page.route("**/__test/agent-view", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: readFileSync(".generated/agent-view.html", "utf8"),
    }),
  );
  await page.route("**/__test/chat-host", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<!doctype html><html lang="en"><head><title>Local MCP Apps host acceptance</title><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0"><iframe title="Trove research" src="/__test/agent-view" style="width:100%;height:1800px;border:0"></iframe><script>
  let ready = false;
  window.addEventListener('message', async event => {
    if(event.source !== document.querySelector('iframe').contentWindow) return;
    const msg = event.data;
    if(msg.method === 'ui/initialize') event.source.postMessage({jsonrpc:'2.0',id:msg.id,result:{protocolVersion:msg.params.protocolVersion,hostInfo:{name:'Test-only MCP Apps host',version:'1'},hostCapabilities:{serverTools:{},openLinks:{},updateModelContext:{structuredContent:{}}},hostContext:{theme:'light',displayMode:'inline'}}}, location.origin);
    else if(msg.method === 'ui/notifications/size-changed') document.querySelector('iframe').style.height=Math.max(200,msg.params.height)+'px';
    else if(msg.method === 'ui/notifications/initialized') { ready=true; window.dispatchEvent(new Event('widget-ready')); }
    else if(msg.method === 'tools/call') {
      const result=await window.troveTestCall(msg.params.name,msg.params.arguments);
      event.source.postMessage({jsonrpc:'2.0',id:msg.id,result}, location.origin);
    } else if(msg.id !== undefined) event.source.postMessage({jsonrpc:'2.0',id:msg.id,result:{}}, location.origin);
  });
  window.troveWidgetReady=()=>ready;
  </script></body></html>`,
    }),
  );
  await page.goto("/__test/chat-host");
  await page.waitForFunction(() => (window as any).troveWidgetReady());
  await page.evaluate(
    (result) =>
      document.querySelector("iframe")!.contentWindow!.postMessage(
        {
          jsonrpc: "2.0",
          method: "ui/notifications/tool-result",
          params: result,
        },
        location.origin,
      ),
    initial,
  );
  return {
    calls,
    frame: page.frameLocator("iframe"),
    initial,
    push: async (name: string, args: object) => {
      const result = await call(name, args);
      await page.evaluate(
        (result) =>
          document
            .querySelector("iframe")!
            .contentWindow!.postMessage(
              {
                jsonrpc: "2.0",
                method: "ui/notifications/tool-result",
                params: result,
              },
              location.origin,
            ),
        result,
      );
    },
  };
}

for (const width of [760, 390])
  test(`inline chat previews, exact quotes and truthful checkout boundary at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await buyer(page);
    const { frame, calls, initial } = await host(
      page,
      "discover_data",
      request,
    );
    expect(initial.isError).not.toBe(true);
    await expect(
      frame.getByRole("heading", { name: "Your sources, in view" }),
    ).toBeVisible();
    await expect(frame.locator(".sample-record:visible")).toHaveCount(2);
    await expect(
      frame.locator("dt").filter({ hasText: "reason for recall" }).first(),
    ).toBeVisible();
    await expect(
      frame.getByText("Total $2.80 USD", { exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: `${captures}/chat-discovery-${width}.png`,
      fullPage: true,
    });
    await frame.getByRole("button", { name: "Review exact quote" }).click();
    await expect(
      frame.getByRole("heading", { name: "Review your purchase", exact: true }),
    ).toBeVisible();
    await expect(
      frame.getByText("No charge has occurred.", { exact: true }),
    ).toBeVisible();
    await expect(
      frame.getByText(
        "PayPal approval opens on Trove. Checkout inside this chat is not enabled.",
        { exact: true },
      ),
    ).toBeVisible();
    expect(calls).toEqual(["discover_data", "create_quote"]);
    await page.screenshot({
      path: `${captures}/chat-quote-${width}.png`,
      fullPage: true,
    });
    expect(
      await frame
        .locator("body")
        .evaluate((body) => body.scrollWidth <= innerWidth),
    ).toBe(true);
    // Read-only assessment succeeded without permission escalation or a purchase.
    const purchases = await (await page.request.get("/api/purchases")).json();
    expect(purchases).toHaveLength(0);
    const a11y = await new AxeBuilder({ page }).include("iframe").analyze();
    expect(a11y.violations).toEqual([]);
    await page.evaluate(() =>
      document.querySelector("iframe")!.contentWindow!.postMessage(
        {
          jsonrpc: "2.0",
          method: "ui/notifications/host-context-changed",
          params: { theme: "dark" },
        },
        location.origin,
      ),
    );
    await expect(frame.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(
      frame.getByRole("button", { name: "Prepare PayPal checkout" }),
    ).toBeEnabled();
    const darkA11y = await new AxeBuilder({ page }).include("iframe").analyze();
    expect(darkA11y.violations).toEqual([]);
    await page.screenshot({
      path: `${captures}/chat-quote-dark-${width}.png`,
      fullPage: true,
    });
  });

test("buyers submit and follow up on an actual local support case without initiating a refund", async ({
  page,
}) => {
  await buyer(page);
  const fixture = await ownedDataFixture(page);
  await page.goto(`/purchases/${fixture.purchaseId}`);
  await page.locator(".purchase-summary > summary").click();
  await page
    .getByRole("button", { name: "Report a problem", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("button", { name: "Send for review" }),
  ).toBeDisabled();
  await dialog
    .getByLabel("Details", { exact: true })
    .fill("The expected product fields seem to be missing from these records.");
  await dialog
    .getByLabel("Evidence link")
    .fill("https://example.com/issue-evidence");
  await page.screenshot({
    path: `${captures}/web-issue-desktop.png`,
    fullPage: false,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: `${captures}/web-issue-mobile.png`,
    fullPage: false,
  });
  await dialog.getByRole("button", { name: "Send for review" }).click();
  await expect(dialog).toHaveCount(0);
  const p = await (
    await page.request.get(`/api/purchases/${fixture.purchaseId}`)
  ).json();
  expect(p.paymentState).toBe("captured");
  expect(p.refunds).toHaveLength(0);
  expect(p.dispute.state).toBe("open");
  expect(
    (
      await page.request.get(`/api/purchases/${fixture.purchaseId}/result`)
    ).ok(),
  ).toBe(true);
  await page.locator(".purchase-support > summary").click();
  await expect(
    page.getByText(
      "The expected product fields seem to be missing from these records.",
      { exact: true },
    ),
  ).toBeVisible();
  await page.screenshot({
    path: `${captures}/web-issue-open-mobile.png`,
    fullPage: true,
  });
  const { frame } = await host(
    page,
    "get_dispute",
    { purchaseId: fixture.purchaseId },
    ["read", "support"],
  );
  await expect(frame.getByText("Under review", { exact: true })).toBeVisible();
  await frame.getByText("Add information", { exact: true }).first().click();
  await frame
    .getByLabel("Additional information", { exact: true })
    .fill(
      "The affected record is the second product. Please review its field values.",
    );
  await frame.getByRole("button", { name: "Send for review" }).click();
  await expect(
    frame.getByText(
      "The affected record is the second product. Please review its field values.",
      { exact: true },
    ),
  ).toBeVisible();
  await page.screenshot({
    path: `${captures}/chat-issue-mobile.png`,
    fullPage: true,
  });
  const after = await (
    await page.request.get(`/api/purchases/${fixture.purchaseId}`)
  ).json();
  expect(after.paymentState).toBe("captured");
  expect(after.refunds).toHaveLength(0);
  expect(after.dispute.messages).toHaveLength(2);
});

test("inline views render untrusted source text literally and reject executable links", async ({
  page,
}) => {
  await buyer(page);
  const { frame } = await host(page, "get_offer", {
    offerId: (await (await page.request.get("/api/offers")).json()).offers[0]
      .id,
  });
  await page.evaluate(() =>
    document.querySelector("iframe")!.contentWindow!.postMessage(
      {
        jsonrpc: "2.0",
        method: "ui/notifications/tool-result",
        params: {
          structuredContent: {
            title: '<img src=x onerror="window.bad=true">',
            priceCents: 100,
            sourceUrl: "javascript:alert(1)",
            fields: ["reason_for_recall"],
            preview: [
              {
                reason_for_recall: "<script>window.bad=true</script>",
                source_url: "javascript:alert(1)",
              },
            ],
          },
          _meta: { troveTool: "get_offer" },
        },
      },
      location.origin,
    ),
  );
  await expect(
    frame.getByRole("heading", {
      name: '<img src=x onerror="window.bad=true">',
      exact: true,
    }),
  ).toBeVisible();
  await expect(frame.locator("img")).toHaveCount(0);
  await expect(frame.locator('a[href^="javascript:"]')).toHaveCount(0);
  expect(
    await frame.locator("body").evaluate(() => (window as any).bad),
  ).toBeUndefined();
});

test("inline purchased records and receipts keep their own actions and identities", async ({
  page,
}) => {
  await buyer(page);
  const fixture = await ownedDataFixture(page);
  const { frame, push } = await host(page, "get_purchase", {
    purchaseId: fixture.purchaseId,
  });
  await expect(
    frame.getByRole("heading", { name: "Your data is ready" }),
  ).toBeVisible();
  await frame.getByRole("button", { name: "View purchased data" }).click();
  await expect(
    frame.getByRole("heading", { name: "Purchased data", exact: true }),
  ).toBeVisible();
  await expect(frame.locator("tbody tr")).toHaveCount(2);
  await push("get_receipt", { purchaseId: fixture.purchaseId });
  await expect(
    frame.getByRole("heading", { name: "Purchase receipt", exact: true }),
  ).toBeVisible();
  await expect(
    frame.getByRole("button", { name: "View purchased data" }),
  ).toHaveCount(0);
});
