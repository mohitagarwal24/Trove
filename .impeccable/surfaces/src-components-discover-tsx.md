---
version: 1
slug: src-components-discover-tsx
primary_target: src/components/discover.tsx
related_targets: [src/app/globals.css, src/components/trove-app.tsx, src/components/research-starts.tsx, src/components/ui.tsx, src/components/seller-studio.tsx]
---

# Catalogue and shared application shell

Mode: Operate. A quiet source inventory with explicit selection and real previews; the shared shell carries the same restrained system across existing routes.

## Direction contract

THESIS: Give source names, scope and exact prices readable space while keeping orientation and next actions compact.

OWN-WORLD: Light neutral rail, white canvas, fine gray rules, Inter headings and controls, charcoal primary actions and restrained blue focus/selection. Tabular financial values remain stable.

STORY: Search/filter inventory → inspect source scope, sample data, rights and attribution → compare selection → review an immutable exact-price quote → explicit approval.

FIRST VIEWPORT: A light rail (216px, or 68px collapsed), compact (60px) utility bar, (30px) page heading, searchable divided two-column inventory. The mobile full-content drawer is (248px); inventory becomes one column and heading becomes (27px). The old right-side promotional guide is removed. The comparison tray carries selected sources above the page edge.

FORM: Existing catalogue and shared controls implemented directly; source content and underlying permissions remain authoritative. Source field and purpose identifiers become readable display labels without changing API values.

## Built behavior

Catalogue search, category filters, source preview, scope, rights, exact price and comparison remain connected to the existing backend. Unknown source IDs disclose no private detail. Shared primary buttons are charcoal; secondary controls and dialogs are white with fine borders. Fields use (13px) desktop values and (16px) mobile values; their supporting labels remain adjacent. Shared account, seller, consent, token, receipt, refund and purchase flows remain reachable.

Expanded navigation uses a scrollable middle and separate account footer for short laptops. Desktop collapse retains labelled route icons and account access; the mobile drawer keeps full navigation regardless of desktop preference. The account menu and focused dialogs preserve native focus and viewport-bounded scrolling. Search and tables retain narrow-width containment. Real source-rights details and delivery-check support text use (12px) type with wrapping. Human names are shown in seller field selection and source purpose lists while the submitted values remain unchanged.

Motion uses brief hover/selection/overlay feedback with reduced-motion alternatives. Content remains visible by default; the public chapter index is functional progress, while the old decorative shell progress line remains absent. Sandbox payment disclosure remains visible where relevant; no provider verification, model output or payment state is fabricated.

## Authority and status

The user’s Attio screenshots and `.impeccable/surfaces/trove-reference-revamp.md` replace the previous Technical Atlas/Data Convergence world. This is the existing working app, with its real services and routes. No seed roll or approved raster comp applies. Source styles are `src/app/globals.css` and `src/app/landing.css`; durable tokens are recorded in `docs/DESIGN.md` with extensions in `.impeccable/design.json`.

The initial fresh finish review at `.local/ui-revamp/finish-review.md` returned **fix**. Its four corrections are implemented: mobile dashboard reading width, human field/purpose labels, removal of the source inspector’s decorative overline, and readable rights/check text. Same-reviewer recapture verdict and the final regression suite are pending at this documentation handoff. Do not inherit an earlier pass’s ship verdict. Current review evidence is under `.impeccable/review/reference-revamp/`; payment-result captures use controlled TEST_ONLY local entitlements and actual prepared FDA rows, not an external PayPal success.
