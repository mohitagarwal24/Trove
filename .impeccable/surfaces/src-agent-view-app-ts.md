---
version: 1
slug: src-agent-view-app-ts
primary_target: src/agent-view/app.ts
related_targets: [src/agent-view/app.css, src/components/purchases.tsx, src/components/authorize-connection.tsx, src/components/connect.tsx, src/app/globals.css]
---

# Research and purchase support inside an agent conversation

Mode: Operate. Extend Trove's established white/charcoal source-led interface into the MCP Apps host; inherit the host's theme, font variables and safe areas. No new visual identity or service.

THESIS: Let a buyer assess real source samples, exact scope and price in chat, then retrieve owned records or report a purchase problem without treating a chat message as payment authorization.

FIRST VIEWPORT: A concise title, the selected source and its exact USD price, dated snapshot and published sample records. Requested fields lead; other sources and licence/fee detail use native disclosures. Fixed samples are explicitly representative rather than a paid, filter-matched delivery. Field names are readable labels; identifiers and source record links remain intact.

PATH: Discovery → read-scoped exact quote → purchase-scoped request → existing PayPal web approval → authoritative capture → owned retrieval. Native ChatGPT checkout is not enabled for Trove. The view states this boundary before preparing checkout. No simulated payment sheet, payment credentials, or new financial permission is introduced.

SUPPORT: A captured purchase offers Report a problem. Category, a specific description and optional HTTPS evidence go to a durable case. Filing a case does not refund or revoke data. A human reviewer can request information, reject or approve; only processor confirmation completes an approved refund. The same case history and follow-up action are available inside chat with a separate support scope. This is Trove support, not a formal PayPal dispute.

QUALITY BAR: Selected evidence must be legible on desktop and phone without an unbounded sample table, prices must stay attached to the decision, disclosures must work by keyboard, and light/dark host contexts must remain readable. Loading, no-source, expired-quote, unavailable-sample, authentication failure and cancelled-action states remain truthful. Source strings use DOM text, safe links, no eval or arbitrary HTML. No new raster assets.

Validation uses the actual bundled MCP view and local API endpoints behind a test-only MCP Apps host bridge, plus isolated paid-state fixtures for support. Those fixtures do not establish actual ChatGPT rendering or a fresh PayPal transaction. Required capture sizes: chat 760px and 390px, web support 1440px and 390px. Support dialogs are viewport captures so fixed overlays are represented faithfully.


## Built extension and evidence — 5 November 2026

The bundled view applies host theme and style variables on initial context and updates, and passes safe-area insets into its layout. White/charcoal and dark fallbacks remain bounded to this surface. Selected sources lead; Other sources is expandable. Preview sample shows up to two fixed published records, requested fields and source record/documentation links, with long values disclosed. Sample records form two columns and stack below 580px. Quote review keeps the exact USD total attached to Prepare PayPal checkout and states the browser approval boundary; licence, included fee and expiry remain in Licence and price details. Native chat checkout remains unavailable.

Actual local captures are in `.local/chat-support/captures/`: discovery at 760px and 390px; quote at both widths in light and dark contexts; chat support at mobile width; and web support dialogs at desktop/mobile sizes. The whole-workflow extension adds comparison preview and visible needs-information recovery in `.local/whole-workflow/after/`. These are local bundled-view/bridge and TEST_ONLY support evidence, not actual ChatGPT rendering or external payment acceptance. Independent review approved the supplied current states; the separate closed-purchase web recovery delta is awaiting bounded recapture review at documentation handoff. No deployment of this extension is recorded here.
