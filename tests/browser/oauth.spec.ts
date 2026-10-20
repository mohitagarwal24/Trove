import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  auth,
  type OAuthClientProvider,
} from "@modelcontextprotocol/sdk/client/auth.js";
import type {
  OAuthClientInformationMixed,
  OAuthTokens,
} from "@modelcontextprotocol/sdk/shared/auth.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { buyer, password, verifiedAccount } from "./fixtures";
import { randomUUID } from "node:crypto";

class BrowserOAuth implements OAuthClientProvider {
  redirectUrl = "http://127.0.0.1:49152/callback";
  clientMetadata = {
    client_name: "Acceptance agent",
    redirect_uris: [this.redirectUrl],
    token_endpoint_auth_method: "none" as const,
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    scope: "read purchase offline_access",
  };
  registration?: OAuthClientInformationMixed;
  savedTokens?: OAuthTokens;
  authorizationUrl?: URL;
  verifier = "";
  nonce = randomUUID();
  state() {
    return this.nonce;
  }
  clientInformation() {
    return this.registration;
  }
  saveClientInformation(v: OAuthClientInformationMixed) {
    this.registration = v;
  }
  tokens() {
    return this.savedTokens;
  }
  saveTokens(v: OAuthTokens) {
    this.savedTokens = v;
  }
  redirectToAuthorization(url: URL) {
    this.authorizationUrl = url;
  }
  saveCodeVerifier(v: string) {
    this.verifier = v;
  }
  codeVerifier() {
    return this.verifier;
  }
}
for (const width of [1366, 390]) {
  test(`MCP OAuth discovers, signs in, consents, refreshes and disconnects at ${width}px`, async ({
    page,
    baseURL,
  }) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 768 });
    const resource = new URL("/api/mcp", baseURL!),
      provider = new BrowserOAuth();
    const challenge = await page.request.post(resource.toString(), {
      data: {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-11-25",
          capabilities: {},
          clientInfo: { name: "oauth-acceptance", version: "1" },
        },
      },
    });
    expect(challenge.status()).toBe(401);
    expect(challenge.headers()["www-authenticate"]).toContain(
      "resource_metadata",
    );
    expect(await auth(provider, { serverUrl: resource })).toBe("REDIRECT");
    expect(
      provider.authorizationUrl?.searchParams.get("code_challenge_method"),
    ).toBe("S256");
    const email = await verifiedAccount();
    await page.route("http://127.0.0.1:49152/callback**", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: "Connection callback received",
      }),
    );
    await page.goto(provider.authorizationUrl!.toString());
    await expect(page).toHaveURL(/\/sign-in\?returnTo=/);
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Connect Acceptance agent?" }),
    ).toBeVisible();
    await expect(page.getByText(email, { exact: true })).toBeVisible();
    await expect(
      page.getByText(/cannot approve or capture payments/),
    ).toBeVisible();
    await page.screenshot({
      path: `.local/research-oauth/consent-${width}.png`,
    });
    expect(
      (await new AxeBuilder({ page }).analyze()).violations.filter((v) =>
        ["serious", "critical"].includes(v.impact || ""),
      ),
    ).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    await page
      .getByRole("button", { name: "Allow connection", exact: true })
      .click();
    await expect(page).toHaveURL(/127\.0\.0\.1:49152\/callback\?/);
    const callback = new URL(page.url());
    expect(callback.searchParams.get("state")).toBe(provider.nonce);
    expect(
      await auth(provider, {
        serverUrl: resource,
        authorizationCode: callback.searchParams.get("code")!,
      }),
    ).toBe("AUTHORIZED");
    expect(provider.savedTokens?.refresh_token).toBeTruthy();
    const oldRefresh = provider.savedTokens!.refresh_token;
    const client = new Client({ name: "OAuth acceptance", version: "1" }),
      transport = new StreamableHTTPClientTransport(resource, {
        authProvider: provider,
      });
    await client.connect(transport);
    expect((await client.listTools()).tools).toHaveLength(9);
    const profile = await client.callTool({
      name: "get_profile",
      arguments: {},
    });
    expect(profile.structuredContent).toMatchObject({ email });
    const found = await client.callTool({
      name: "discover_data",
      arguments: {
        query: "Drug approvals",
        needs: [
          {
            category: "Drug approvals",
            fields: ["brand_name", "approval_date"],
            quantity: 2,
            maxAgeDays: 3650,
            filters: [],
          },
        ],
        purpose: "ai_inference",
        budgetCents: 1000,
      },
    });
    expect(found.isError).not.toBe(true);
    expect(await auth(provider, { serverUrl: resource })).toBe("AUTHORIZED");
    expect(provider.savedTokens!.refresh_token).not.toBe(oldRefresh);
    await page.goto("/connect");
    await expect(
      page.getByText("Acceptance agent", { exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: `.local/research-oauth/connect-${width}.png`,
    });
    await page
      .getByRole("button", { name: "Disconnect Acceptance agent", exact: true })
      .click();
    await expect(page.getByText("Disconnected", { exact: true })).toBeVisible();
    const denied = await page.request.post(resource.toString(), {
      headers: {
        Authorization: `Bearer ${provider.savedTokens!.access_token}`,
      },
      data: { jsonrpc: "2.0", id: 3, method: "tools/list", params: {} },
    });
    expect(denied.status()).toBe(401);
    expect((await page.request.get("/api/purchases")).ok()).toBe(true);
    expect(await (await page.request.get("/api/purchases")).json()).toEqual([]);
    await client.close();
  });
}
test("direct browser research creates a real quote without model access or pre-funding", async ({
  page,
}) => {
  await buyer(page);
  await page.goto("/workspace");
  await page
    .getByRole("button", { name: "Choose requirements", exact: true })
    .click();
  await expect(page.getByText(/limit, not a balance/)).toBeVisible();
  await page.getByLabel("Records per category").fill("2");
  await page.getByLabel("Snapshot age (days)").fill("3650");
  expect(
    (
      await new AxeBuilder({ page }).include(".task-composer").analyze()
    ).violations.filter((v) =>
      ["serious", "critical"].includes(v.impact || ""),
    ),
  ).toEqual([]);
  await page.screenshot({ path: ".local/research-oauth/research-desktop.png" });
  await page.getByRole("button", { name: "Find sources", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Spending cap", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Source search", { exact: true })).toBeVisible();
  expect(await (await page.request.get("/api/purchases")).json()).toEqual([]);
  expect((await (await page.request.get("/api/tasks")).json()).length).toBe(1);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: ".local/research-oauth/research-mobile.png" });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.goto("/dashboard");
  const callout = page.locator(".dashboard-agent");
  await expect(callout).toBeVisible();
  const text = await callout.locator(":scope > div").boundingBox();
  const action = await callout
    .getByRole("link", { name: "Connect an agent" })
    .boundingBox();
  expect(text!.width).toBeGreaterThan(200);
  expect(action!.y).toBeGreaterThanOrEqual(text!.y + text!.height - 1);
});
test("anonymous verification status is a normal empty result, while protected actions still require sign-in", async ({
  page,
}) => {
  const status = await page.request.get("/api/auth/verification");
  expect(status.status()).toBe(200);
  expect(await status.json()).toEqual({
    email: null,
    verified: false,
    sent: false,
    resendAt: null,
  });
  expect(
    (
      await page.request.post("/api/auth/verification/send", {
        headers: { Origin: "http://localhost:3000" },
      })
    ).status(),
  ).toBe(401);
});
test("a failed brief offers an explicit direct-search path without silently interpreting it", async ({
  page,
}) => {
  await buyer(page);
  const bootstrap = await (await page.request.get("/api/bootstrap")).json();
  test.skip(
    bootstrap.capabilities.ai,
    "Uses the isolated unconfigured-provider server; never call a real model.",
  );
  await page.route("**/api/bootstrap", async (route) => {
    const response = await route.fetch(),
      body = await response.json();
    body.capabilities.ai = true; // UI capability fixture; the real server still rejects unconfigured AI.
    await route.fulfill({ response, json: body });
  });
  await page.goto("/workspace");
  await page
    .getByRole("button", { name: "Describe a brief", exact: true })
    .click();
  await page.getByRole("button", { name: "Find sources", exact: true }).click();
  await expect(page.locator('.notice[role="alert"]')).toContainText(
    "temporarily unavailable",
  );
  await page
    .getByRole("button", { name: /Choose requirements to continue/ })
    .click();
  await page.getByLabel("Records per category").fill("2");
  await page.getByLabel("Snapshot age (days)").fill("3650");
  await page.getByRole("button", { name: "Find sources", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Spending cap", exact: true }),
  ).toBeVisible();
  expect(await (await page.request.get("/api/purchases")).json()).toEqual([]);
});
test("invalid consent cannot redirect visitors, and OAuth endpoints reject oversized and ambiguous requests", async ({
  page,
  baseURL,
}) => {
  await page.goto(
    "/oauth/authorize?client_id=unregistered&redirect_uri=https://outside.example/callback",
  );
  await expect(
    page.getByRole("heading", { name: "Connection unavailable", exact: true }),
  ).toBeVisible();
  expect(new URL(page.url()).origin).toBe(new URL(baseURL!).origin);
  const large = await page.request.post("/oauth/register", {
    headers: { "Content-Type": "application/json" },
    data: "x".repeat(17000),
  });
  expect(large.status()).toBe(413);
  const duplicate = await page.request.post("/oauth/token", {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    data: "client_id=a&client_id=b",
  });
  expect(duplicate.status()).toBe(400);
  expect((await duplicate.json()).error).toBe("invalid_request");
});
