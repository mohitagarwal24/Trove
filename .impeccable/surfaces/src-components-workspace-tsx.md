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
    "src/components/purchases.tsx",
    "src/components/owned-data.tsx",
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

## Research coverage and purchased-data access — 3 November 2026

This ordinary Operate extension retains the Technical Atlas system and its existing component vocabulary. Source comparisons now expose requested and available record counts, required-field coverage, and whether availability was checked. Native “Scope details” disclosures reveal the required fields and source snapshot date. Persisted discovery gaps explain incomplete coverage or insufficient budget; a “Set limit to” action explicitly edits and focuses the spending-limit field. It does not rerun discovery or approve payment. Meaningful scope or cap changes show a refresh notice and disable the existing purchase-review action until sources are found again.

“Reuse scope” opens an editable new draft from the owner's task, copying the brief or explicit requirements and spending cap. The copied-scope notice explains the next action; no new task or purchase is created until the user acts. The workspace retains its composer/output split and 1050px stack; up to 760px, the page heading and reuse action stack with a 16px gap.

Purchases now has “Your data” and “Purchase history” navigation, with a cobalt underline identifying the current view. The dashboard's “Open library” action opens `/purchases?view=data`. The library searches accessible purchased-source metadata by dataset or provider, with a labelled search field, loading feedback, retry, clear-search recovery, honest empty guidance, and incremental loading. It does not search paid record payloads. A single white divided inventory shows the purchased title/version, seller, purchase date, exact USD price, and native disclosure of record count, fields, intended use, and source snapshot. Each source separates “Open data”, “Evidence pack”, and “Receipt” actions. An available newer published version links to its factual catalogue preview; that link makes no claim of entitlement, changed purchased content, or a required new charge.

The library search has a 580px maximum width. Inventory rows place source information beside vertically arranged actions, separated by fine rules; up to 760px, rows stack and their actions wrap. Source headings use the existing 18px Manrope title treatment, while scope and supporting metadata use 12px working text. These measurements describe this surface, not new global tokens. Purchase results also expose the evidence-pack action beside the existing data download. Evidence export follows authorised purchased-result access and retains source identity, scope, rights, checks, fingerprints, and payment/receipt references.

Connected apps and advanced tokens now show the actual last successful tool and timestamp, or explicitly state that none has succeeded. Activity copy uses 12px text, a 1.7 line height, and wrapping for long values. The example request has a “Copy research task” control and copied feedback. Advanced tokens remain a full-width native disclosure whose open content flows below its summary. The browser purchase-approval reminder remains present; successful tool activity does not establish an external client session or payment.

The final local manifest is `.local/pre-demo/manifest.json`: 11 captures covering budget recovery, desktop/mobile field and record coverage, empty/populated library, short-height/tablet library, actual MCP activity, receipt, and purchased data. Current OAuth activity captures are `.local/research-oauth/connect-1366.png` and `connect-390.png`. The independent fresh finish review in `.local/pre-demo/finish-review.md` returned **ship** with no material fixes. These local states use isolated buyers, real prepared FDA rows, and controlled TEST_ONLY captured entitlements with no PayPal operation or ledger; they do not prove an external buyer payment. Actual successful MCP requests provide activity evidence. Hosted acceptance, real Google/email delivery, a PayPal Sandbox buyer operation, and an external client session remain separate acceptance work. No raster asset, visual-world replacement, system token, font, or detector suppression is introduced.
