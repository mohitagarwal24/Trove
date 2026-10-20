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
    "Bring the missing",
  );
  await expect(page.locator(".story-chapter")).toHaveCount(4);
  await expect(page.getByText("Future domains", { exact: true })).toHaveCount(
    2,
  );
  await page.locator(".fragment-legal summary").click();
  await expect(page.locator(".fragment-legal")).toContainText(
    "not currently in the catalogue",
  );
  await page.locator(".fragment-medical summary").click();
  await expect(page.locator(".fragment-medical a").first()).toHaveAttribute(
    "href",
    "/discover",
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
  await page.locator(".chapter-3").scrollIntoViewIfNeeded();
  await expect(page.locator(".convergence-story")).toHaveAttribute(
    "data-stage",
    "3",
  );
  await page.locator("#landing-exit").scrollIntoViewIfNeeded();
  const sceneBounds = await page.locator(".convergence-stage").boundingBox();
  const exitBounds = await page.locator("#landing-exit").boundingBox();
  expect(sceneBounds!.y + sceneBounds!.height).toBeLessThanOrEqual(
    exitBounds!.y + 1,
  );

  await page.evaluate(() => scrollTo(0, 0));
  await expect(page.locator(".convergence-story")).toHaveAttribute(
    "data-stage",
    "0",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".landing")).toHaveAttribute(
    "data-graphics",
    "reduced",
  );
  await expect(page.locator(".convergence-stage")).toHaveCSS(
    "position",
    "relative",
  );
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: string,
      ...args: unknown[]
    ) {
      if (type.startsWith("webgl")) return null;
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
  await expect(
    page.getByRole("heading", { name: "Your research starts here." }),
  ).toBeVisible();
  await expect(
    page.getByText("Make your first connection.", { exact: true }),
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
