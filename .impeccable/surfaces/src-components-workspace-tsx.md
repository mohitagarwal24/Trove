---
version: 1
slug: "src-components-workspace-tsx"
primary_target: "src/components/workspace.tsx"
related_targets:
  [
    "src/components/research-requirements.tsx",
    "src/components/research-starts.tsx",
    "src/lib/research-starts.ts",
    "src/components/connect.tsx",
    "src/components/authorize-connection.tsx",
    "src/components/dashboard.tsx",
    "src/app/globals.css",
  ]
---

# Research requirements and account-based agent connection

Mode: Operate. Extend the existing Technical Atlas flow through code, preserving its identity. The user requested working research after a 503 and agent connection without manual token friction. Existing application provenance remains seed 2e59ff18; this extension adds no visual-world replacement or imagery.

## Direction contract

THESIS: Make real source discovery and scoped agent access directly usable while keeping exact-price payment approval explicit.

OWN-WORLD: Preserve ink navigation, chalk panels, cobalt actions and states, amber navigation highlights, Manrope headings, Inter controls, and tabular USD amounts. Requirements, client setup, connected apps, and consent reuse existing forms, panels, disclosures, and focus treatments. The CSS `--muted` alias uses the existing Slate Text value.

STORY: Choose categories and exact requirements → inspect matching source scope and quote → approve a purchase with PayPal. Alternatively, connect an agent through the MCP URL and Trove account → inspect requested access and destination → allow or cancel → manage the actual connected app. Connection consent never approves a payment.

FIRST VIEWPORT: Workspace retains its composer/output split and stacks at 1050px. A visible mode control puts explicit requirements beside optional AI briefs; category details disclose fields and filters. Connect pairs account-based client setup with connected apps, then advanced manual tokens, an example task, and the collapsed tool reference. Standalone consent uses a centered panel outside the rail, exposing account, permissions, client-provided name, callback host, and approval boundary. Mobile wraps long names, hosts, and app controls.

FORM: Code-led flow extension under the incumbent Technical Atlas authority. No concept roll, new font, or raster asset is introduced. Client choices are ChatGPT, Claude, Codex, and Claude Code; the URL or commands and guide follow the selected client.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Shipped behavior and evidence

Explicit requirements perform real discovery without Gemini or prefunding. Categories, record counts, age, intended use, required fields, and filters define source selection. Optional AI brief failures offer “Choose requirements” recovery. Spending caps explicitly describe limits, while quote scope, USD prices, and PayPal approval remain intact.

OAuth setup uses the MCP URL and Trove-account consent. Connected apps list actual names, scopes, expiry/revocation state, and Disconnect. Advanced manual tokens preserve the existing scoped creation and one-time secret flow. The dashboard recognizes active OAuth connections or legacy tokens and names account-based setup in its connection actions.

Consent shows the signed-in account, requested access, client-provided app name, and callback host. It states that connections cannot approve or capture payments. Invalid consent offers a return to connections.

The final capture manifest is `.impeccable/review/research-oauth/manifest.json`: 14 captures covering desktop, short-height, mobile expanded requirements, real results and quote review, empty/active connected apps, desktop/mobile dashboard connection copy, consent, and invalid consent. At that review, the mobile dashboard callout used a fixed icon column and flexible text column, with its action below the text; its later startup refinement is recorded below and in the landing/dashboard brief. Its records report no horizontal overflow or page errors; reduced motion settled captures. These checks used real local accounts, requirements, discovery, quotes, and consent, with no payment or model call. The independent fresh finish review initially returned **fix** for stale system descriptions and dashboard connection copy, then identified mobile callout wrapping. The final reviewer returned **ship**, with those original findings and the mobile callout regression resolved. This disposition covers that focused recheck, rather than a new full audit. The system record is `docs/DESIGN.md`, extended by `.impeccable/design.json`.


## Editable research starts — 29 October 2026

The workspace welcome region now uses left-aligned copy and the same three research starts as the dashboard and catalogue. Each preset sets a real category and concrete field list with quantity 10, maximum age 30 days, AI-inference use, and no filters. These values remain editable in the existing requirements composer. Choosing a start selects requirements mode, updates `/workspace?start=<id>`, and moves focus to the composer. It does not submit a task, generate a result, create a quote, or initiate payment.

An explicit owned `task` parameter takes precedence over `start`; otherwise a valid start opens new scope without resuming unrelated previous research. Loading copy reflects whether requirements or an optional brief is being read. The composer/output split remains; the welcome region is limited to 600px, with 56px 28px padding on desktop and 30px 4px on mobile. The agent connection and consent implementation is preserved.

The source authority is `src/lib/research-starts.ts` plus the workspace state flow. Review artifacts are under `.impeccable/review/startup-polish/final/`. Persistent custom templates, source update notifications, and the other next-work ideas in `docs/PRODUCT_REVIEW.md` remain proposals. Exact human payment approval remains required.
