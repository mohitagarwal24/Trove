---
version: 1
slug: src-components-workspace-tsx
primary_target: src/components/workspace.tsx
related_targets: [src/components/quote-review.tsx, src/components/account.tsx, src/components/research-requirements.tsx, src/components/research-starts.tsx, src/lib/research-starts.ts, src/components/connect.tsx, src/components/authorize-connection.tsx, src/components/dashboard.tsx, src/components/purchases.tsx, src/components/owned-data.tsx, src/app/globals.css]
---

# Research scope, purchased data and agent access

Mode: Operate. Explicit research and agent access stay inside the source-led system while preserving human payment approval.

## Direction contract

THESIS: Help the user set an exact scope, assess coverage and reuse purchased evidence without obscuring the purchase boundary.

OWN-WORLD: White and pale neutral groups, fine rules, compact Inter, charcoal primary actions, readable evidence and stable tabular prices. Human labels sit beside preserved technical values.

STORY: Editable requirements or optional brief → actual discovery → inspect source coverage and quote → approve exact price → independently check delivery/payment → access purchased data, rights, evidence and receipt. Agent setup uses account-based consent; consent never approves a purchase.

FIRST VIEWPORT: A centered single-column requirements composer, with category, record count and spending limit visible and Search options collapsed. A new request uses a (760px) maximum; the research workspace uses a (960px) maximum. After an actual request, source decisions replace the expanded composer; a compact scope summary keeps Edit requirements at hand. Mobile summaries and actions stack and keep readable scope width. Connection setup leads with a client choice, actual endpoint/configuration and one next instruction, with supporting help in native disclosures.

FORM: Code-led replacement in existing routes. Genuine discovery, immutable quotes, OAuth scopes, manual tokens and purchased-result access remain unchanged. No new service, key, account or paid dependency is required.

## Built behavior

Explicit requirements work without Gemini or prefunding. Category, records, freshness, purpose, fields and filters define discovery. Optional brief errors offer requirements recovery. Presets and Reuse scope open editable drafts and never submit or approve automatically. An owned task parameter takes precedence over a start parameter. Material scope/cap edits show refresh guidance and disable purchase review until discovery runs again. Budget-gap recovery edits and focuses the limit without rerunning research.

Results expose available/requested records, field coverage and actual availability checks. Native scope disclosures preserve field/snapshot detail. Quotes retain scope, licence, exact USD total, Sandbox context and explicit buyer approval. Payment, delivery and settlement remain independent. Purchased data separates source rows, source rights, evidence pack, original attribution, receipt and transaction references; source rights and delivery-check detail use readable (12px) supporting text. The AI research-summary surface appears only with configured AI capability or an already saved answer.

Your data and Purchase history use a charcoal active rule. The library searches accessible metadata, not paid payloads, with real loading/retry/empty/clear and incremental-loading states. Native scope disclosures and newer-version catalogue links do not claim new entitlement or change purchased content. Evidence exports follow the same authorised result access.

Agent setup offers ChatGPT, Claude, Codex and Claude Code with the real MCP URL and Trove-account consent. Consent identifies account, requested scopes, client-provided name and callback host, and separates connection from payment approval. Actual apps and advanced tokens expose revocation, expiry and last successful tool activity. Manual secrets retain the existing one-time flow. Copy task/setup actions provide feedback; no successful external client session is implied by local tool activity.

## Authority and status

The user’s Attio screenshots and `.impeccable/surfaces/trove-reference-revamp.md` replace the previous Technical Atlas/Data Convergence world. This is the existing working app, with its real services and routes. No seed roll or approved raster comp applies. Source styles are `src/app/globals.css` and `src/app/landing.css`; durable tokens are recorded in `docs/DESIGN.md` with extensions in `.impeccable/design.json`.

**Historical handoff — 3 November 2026.** The initial fresh finish review at `.local/ui-revamp/finish-review.md` returned **fix**. Its four corrections are implemented: mobile dashboard reading width, human field/purpose labels, removal of the source inspector’s decorative overline, and readable rights/check text. Same-reviewer recapture verdict and the final regression suite are pending at this documentation handoff. Do not inherit an earlier pass’s ship verdict. Current review evidence is under `.impeccable/review/reference-revamp/`; payment-result captures use controlled TEST_ONLY local entitlements and actual prepared FDA rows, not an external PayPal success.

## Current refinement — 5 November 2026

The user requested only the information needed for the next decision, retaining the existing Attio-derived white/charcoal identity. The empty output illustration and repeated composer heading are removed. Search options contains editable freshness, intended use, fields and filters; its summary retains current freshness and purpose. Required category, quantity and spending limit stay visible. Selected sources lead comparison; Other sources preserves rejected-source reasons and prices. When no source is selected, the source list remains visible. Material-edit invalidation, cap recovery and explicit buyer approval are unchanged.

Quote review keeps source, quantity, per-line price, purpose, expiry, exact USD total, Sandbox disclosure and PayPal action visible. Scope details, Price breakdown and Source licences and access expose the full supporting information. Purchased data uses the available content width and keeps independent payment/delivery status above its tabs. Source and usage terms is expandable; receipt/evidence downloads are on Receipt & provenance, with transaction references still expandable. Order details follows the result as a native disclosure, retaining the breakdown, licence context and captured-payment refund action.

The library retains source title, provider, purchase date, price, Open data and Receipt. Its scope summary shows records, fields and purpose; expanding it exposes fields, snapshot and evidence download. Aggregate library metrics are removed. The password form is collapsed under Change password while account export and closure remain reachable. Connect keeps the selected client, actual configuration and next instruction visible; Setup instructions, Advanced access tokens, Try a research task and Available tools remain expandable. Empty connected-app panels are omitted. No backend, schema or service behavior changed.

Evidence: current source and representative desktop/mobile captures in `.local/ui-essentials/confirmation/captures/` (`06-requirements`, `08-quote`, `10-agent-connect`, `12-account`, `14-mobile-research`, `16-owned-library`, `17-purchased-data`), compared with `.local/ui-essentials/before/captures/`. These are local rendering evidence. Paid result/receipt screenshots use TEST_ONLY fixtures and do not prove provider acceptance. Separately, a read-only check on 5 November confirmed one hosted PayPal Sandbox USD 1.40 capture as COMPLETED with active entitlement and receipt; private provider references are omitted. Production release and external review remain pending. The prior handoff above is historical, not the acceptance status of this refinement.
