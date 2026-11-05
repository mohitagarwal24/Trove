import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  buyer,
  password,
  verifiedAccount,
  verificationDelivery,
} from "./fixtures";

test("public story exposes honest domains, working source disclosures and a direct sign-in path", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Better sources.",
  );
  await expect(page.locator(".landing-chapter")).toHaveCount(4);
  await expect(page.getByText("Future domains", { exact: true })).toBeVisible();
  await expect(page.locator(".landing-source-table > button")).toHaveCount(6);
  const source = page.locator(".landing-source-table > button").nth(1);
  const sourceTitle = await source.locator("strong").innerText();
  await source.click();
  await expect(source).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".landing-source-inspector h2")).toHaveText(
    sourceTitle,
  );
  const violations = (
    await new AxeBuilder({ page }).analyze()
  ).violations.filter((v) => ["serious", "critical"].includes(v.impact || ""));
  expect(violations).toEqual([]);
  await page
    .locator(".landing-nav")
    .getByRole("link", { name: "Get started", exact: true })
    .click();
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(
    page.getByRole("heading", { name: "Welcome back" }),
  ).toBeVisible();
});

test("landing scene follows scroll in both directions and survives reduced motion and graphics failure", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".landing")).toHaveAttribute(
    "data-graphics",
    /ready|fallback/,
  );
  await page.locator("#step-connect").scrollIntoViewIfNeeded();
  await expect(page.locator(".landing-chapters")).toHaveAttribute(
    "data-stage",
    "3",
  );
  await page.locator("#landing-exit").scrollIntoViewIfNeeded();
  const sceneBounds = await page.locator(".landing-context").boundingBox();
  const exitBounds = await page.locator("#landing-exit").boundingBox();
  expect(sceneBounds!.y + sceneBounds!.height).toBeLessThanOrEqual(
    exitBounds!.y + 1,
  );

  await page.evaluate(() => scrollTo(0, 0));
  await expect(page.locator(".landing-chapters")).toHaveAttribute(
    "data-stage",
    "0",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".landing")).toHaveAttribute(
    "data-graphics",
    "reduced",
  );
  await expect(page.locator(".connection-static")).toHaveCSS("opacity", "1");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: string,
      ...args: unknown[]
    ) {
      if (type === "2d") return null;
      return original.apply(this, [type, ...args] as never);
    } as typeof original;
  });
  await page.reload();
  await expect(page.locator(".landing")).toHaveAttribute(
    "data-graphics",
    "fallback",
  );
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page
    .locator(".landing-nav")
    .getByRole("link", { name: "Get started", exact: true })
    .click();
  await expect(page).toHaveURL(/\/sign-in$/);
});

test("verified email login reaches a private dashboard and preserves safe return destinations", async ({
  page,
}) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/sign-in\?returnTo=/);
  const email = await verifiedAccount();
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: /^Welcome,/ })).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "What are you researching?",
      exact: true,
    }),
  ).toBeVisible();
  await page.goto("/sign-in?returnTo=https://outside.example");
  await expect(page).toHaveURL(/\/dashboard$/);
  const r = await page.request.post("/api/auth/logout", {
    headers: { Origin: "http://localhost:3000" },
  });
  expect(r.ok()).toBeTruthy();
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/sign-in/);
});

test("standalone registration retains OTP verification and pending signup resume", async ({
  page,
}) => {
  const fixture = await verificationDelivery(page);
  await page.goto("/sign-in");
  await page
    .getByRole("button", { name: "Create an account", exact: true })
    .click();
  await page.getByLabel("Name", { exact: true }).fill("Landing Researcher");
  await page
    .getByLabel("Email", { exact: true })
    .fill(`landing-${crypto.randomUUID()}@example.com`);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Verify your email" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Verify your email" }),
  ).toBeVisible();
  await page.getByLabel("Verification code", { exact: true }).fill(fixture);
  await page.getByRole("button", { name: "Verify email", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
});

test("dashboard resumes only workspace-owned research", async ({ page }) => {
  await buyer(page);
  const discovery = await page.request.post("/api/discovery", {
    headers: { Origin: "http://localhost:3000" },
    data: {
      purpose: "internal_business_analysis",
      budgetCents: 1000,
      needs: [
        {
          category: "Drug recalls",
          fields: ["reason_for_recall"],
          quantity: 3,
          maxAgeDays: 3650,
          filters: [],
        },
      ],
    },
  });
  // Use the actual structured discovery API; no model call or financial operation.
  expect(discovery.ok()).toBeTruthy();
  const { task } = await discovery.json();
  await page.goto("/dashboard");
  await page.locator(`a[href="/workspace?task=${task.id}"]`).click();
  await expect(page.locator(".source-decision").first()).toBeVisible();
  await page.goto("/workspace?task=unavailable-other-workspace");
  await expect(
    page.getByText(
      "This research is unavailable or belongs to another workspace.",
    ),
  ).toBeVisible();
});

test("dashboard calls out reconciliation and pending voids without implying success", async ({
  page,
}) => {
  await buyer(page);
  await page.route("**/api/purchases", (route) =>
    route.fulfill({
      json: ["reconciliation_required", "void_pending"].map(
        (paymentState, i) => ({
          id: `uncertain-${i}`,
          paymentState,
          fulfilmentState: "pending",
          quote: {
            lines: [{ snapshot: { title: `Purchase requiring review ${i}` } }],
          },
        }),
      ),
    }),
  );
  await page.goto("/dashboard");
  await expect(page.locator(".dashboard-attention a")).toHaveCount(2);
  await expect(page.locator(".dashboard-attention")).toContainText(
    /reconciliation required/i,
  );
  await expect(page.locator(".dashboard-attention")).toContainText(
    /void pending/i,
  );
  await expect(page.locator(".dashboard-attention a").first()).toHaveAttribute(
    "href",
    "/purchases/uncertain-0",
  );
});

test("live catalogue previews open their source and dismiss cleanly", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const preview = page.locator(".landing-source-list > a").first();
  await expect(preview).toBeVisible();
  const href = await preview.getAttribute("href");
  const title = await page.locator(".landing-source-inspector h2").innerText();
  await preview.click();
  await expect(page).toHaveURL(new RegExp(href!.replace("?", "\\?")));
  await expect(page.getByRole("dialog")).toContainText(title);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page).toHaveURL(/\/discover$/);
  await page.evaluate((url) => history.pushState(null, "", url), href!);
  await expect(page.getByRole("dialog")).toContainText(title);
  await page.goBack();
  await expect(page).toHaveURL(/\/discover$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.goto("/discover?source=unknown-source");
  await expect(page.locator(".offer-card").first()).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("research starting points select editable scope without submitting or charging", async ({
  page,
}) => {
  await buyer(page);
  let submissions = 0;
  page.on("request", (request) => {
    if (
      request.method() === "POST" &&
      /\/api\/(discovery|tasks|quotes|purchases)(?:$|\/)/.test(
        new URL(request.url()).pathname,
      )
    )
      submissions++;
  });
  await page.goto("/dashboard");
  await page
    .locator('.research-starts a[href="/workspace?start=drug-recalls"]')
    .click();
  await expect(page.getByLabel("Drug recalls", { exact: true })).toBeChecked();
  await expect(
    page.getByLabel("Drug approvals", { exact: true }),
  ).not.toBeChecked();
  await page.getByLabel("Records per category").fill("3");
  expect(submissions).toBe(0);
  const response = page.waitForResponse(
    (r) => r.url().endsWith("/api/tasks") && r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Find sources", exact: true }).click();
  const result = await response;
  expect(result.ok()).toBeTruthy();
  expect(result.request().postDataJSON().requirements.needs[0]).toMatchObject({
    category: "Drug recalls",
    quantity: 3,
  });
  await expect(page.locator(".source-decision").first()).toBeVisible();
  await page.goto("/workspace?start=device-recalls");
  await expect(
    page.getByLabel("Device recalls", { exact: true }),
  ).toBeChecked();
  await expect(
    page.getByLabel("Drug recalls", { exact: true }),
  ).not.toBeChecked();
  await expect(page.locator(".source-decision")).toHaveCount(0);
});

test("connection drawing pauses offscreen and stops for reduced motion", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const state = window as typeof window & { connectionDraws: number };
    state.connectionDraws = 0;
    const clear = CanvasRenderingContext2D.prototype.clearRect;
    CanvasRenderingContext2D.prototype.clearRect = function (...args) {
      if (this.canvas.closest(".connection-art")) state.connectionDraws++;
      return clear.apply(this, args);
    };
  });
  await page.goto("/");
  await expect(page.locator(".landing")).toHaveAttribute(
    "data-graphics",
    "ready",
  );
  const draws = () =>
    page.evaluate(
      () =>
        (window as typeof window & { connectionDraws: number }).connectionDraws,
    );
  expect(await draws()).toBe(0);
  await page.locator(".connection-art").scrollIntoViewIfNeeded();
  await expect.poll(draws).toBeGreaterThan(0);
  await page.evaluate(() => scrollTo(0, 0));
  await expect(page.locator(".landing-chapters")).toHaveAttribute(
    "data-stage",
    "0",
  );
  // Let the queued final frame settle before measuring the offscreen pause.
  await page.waitForTimeout(100);
  const paused = await draws();
  await page.waitForTimeout(150);
  expect(await draws()).toBe(paused);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.locator(".connection-art").scrollIntoViewIfNeeded();
  await expect(page.locator(".landing")).toHaveAttribute(
    "data-graphics",
    "reduced",
  );
  expect(await draws()).toBe(paused);
});
