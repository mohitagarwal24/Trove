# Trove reference revamp — design QA

Date: 3 November 2026. Mode: code-led adaptation of the user's Attio references, preserving Trove's real product workflows. This is not a pixel-for-pixel CRM clone.

## Source and comparison

- Visual authority: Attio screenshots supplied by the user, with an explicit instruction to apply that inspiration.
- Local reference: `.local/ui-revamp/references/attio-confirmed.png`, 1440 × 1024 pixels, DPR 1. Its header, typography, spacing and page framing are evidence; the partially empty animated CRM surface is not evidence of a finished product state.
- Extended source: `.local/ui-revamp/references/attio-firecrawl.png`, 1440 × 17957 pixels; branding extraction in `attio-branding.json` identifies Inter, white surfaces and charcoal actions.
- Implementation: `.impeccable/review/reference-revamp/desktop.png`, 1440 × 1000 CSS/pixel dimensions, DPR 1. The 24-pixel source/implementation height difference is retained, not distorted. This is an inspiration comparison, not an image-diff score.
- Browser-rendered full-view comparison: `.impeccable/review/reference-revamp/comparison.png`. Both screenshots use the same 870-pixel display width in the comparison, preserving their original aspect ratio. Browser viewport 1800 × 730, DPR 1.
- Focused evidence: individual source-browser, requirements, source-comparison, quote, authentication and connection captures in the same directory; boards are an index, not evidence of small-text legibility. Reference product styling and Trove implementation content are intentionally different.

## Coverage

The confirmation manifest records 31 screenshots; the supplementary manifest records nine additional working states. Required sizes: desktop 1440 × 1000, mobile 390 × 844, tablet 834 × 1112, short laptop 1366 × 610, plus 720 × 450 for the reflow equivalent of a 1440 × 900 browser at 200% zoom. The latter is a viewport/reflow test, not a claim that browser zoom was changed.

States include public entry, real catalogue selection, native chapter navigation, normal/reduced motion, graphic failure, sign-in, registration, password recovery, dashboard, editable scope, actual source comparison, insufficient budget, exact-price review, client setup, token form, account closure confirmation, seller onboarding/publish/edit forms, owned data, result/receipt/checks, refund confirmation, and narrow-screen navigation. No page errors or document-level horizontal overflow were recorded in either capture manifest.

Purchased-data and refund screenshots use local controlled `TEST_ONLY_` entitlements with actual prepared FDA data. They are not evidence of an external payment. Screenshots open the financial and seller dialogs without submitting payments, refunds, publication or token creation. Production Google, mail and PayPal acceptance remain operator checks with real accounts.

## Fidelity surfaces

- **Fonts and hierarchy:** locally hosted Inter throughout; Google Sans and Google's official G only on its authentication control. Application headings use 27–30 pixels, controls 12–14 pixels, mobile editable inputs 16 pixels. Landing display scales from 44 to 82 pixels with graphite secondary emphasis. The reference's Inter Display is approximated with Trove's existing licensed local Inter; no paid font or third-party brand asset is added.
- **Layout and spacing:** centered ruled marketing frame, compact white navigation, native sticky chapter index, one dark source-connection section. Working app has a 216-pixel light rail, 68-pixel collapsed rail, mobile drawer, and full-width results after research. Source cards share one inventory frame. Requirements reopen explicitly instead of occupying the screen after each search.
- **Colors and tokens:** white and pale neutral surfaces, #202124 primary action/text, #626b78 secondary text, fine gray boundaries, restrained blue for source/focus affordances. Semantic payment, warning and error states remain distinct. Secondary contrast was corrected after the first audit, including OAuth consent.
- **Images and assets:** original Trove mark and existing official Google brand asset retained. No Attio logos, screenshots, customer marks, testimonials or usage metrics ship. Connection geometry is procedural linework rather than a substituted illustration. Three.js and the unused Manrope font and licence were removed.
- **Copy and product truth:** shortened duplicate instructions and promotion; technical purpose keys become AI research / Academic research / Business analysis. Medical/regulatory sources use actual catalogue metadata; legal and financial data remain labelled Future domains. Scope, price, licensing, source attribution, buyer approval, refunds and account-deletion consequences remain available. Unconfigured AI no longer produces an empty summary panel.

## Comparison history and findings

First pass evidence: `.local/ui-revamp/implementation/`, 31 captures. Material findings:

1. P1 secondary labels failed contrast on white/pale surfaces and OAuth consent. Fixed by darkening secondary foregrounds; existing serious/critical Axe checks passed in the confirmation run.
2. P2 authentication repeated decorative positioning and password recovery retained the workspace shell. Fixed with focused authentication/recovery framing and removal of generic introductory copy. Confirmation: `03-live-sign-in.png`, `04-registration.png`, `04b-recovery.png`.
3. P2 purchased-data view led with an unavailable AI summary. Fixed to show this optional surface only when AI or a saved answer exists. Confirmation: `17-purchased-data.png`, `25-mobile-purchased-data.png`.
4. P2 research editor focus could be lost when switching to results or reopening requirements. Fixed with explicit focus transfer to comparison/composer. Budget recovery still edits and focuses the limit without submitting or charging.
5. P2 mobile dashboard agent text was squeezed alongside its action at initial handoff. Fixed in the independent review batch with a two-column icon/text grid and an action beneath. The same-path `29-mobile-dashboard-failure.png` is the post-fix evidence; `fix-recapture.json` measures 276 pixels of text width and correct action order. The existing regression assertion now passes.

Detector ran once: `.local/ui-revamp/detector.json` returned `[]`. Narrow existing Inter exception retained and its rationale updated to match the user's Attio reference. No file/rule suppressions added.

## Verification status

Build, typecheck and 74 server tests passed. Final browser run: **38 of 38 passed** in 4.7 minutes, recorded in `.local/ui-revamp/browser-final.log`. This includes authentication, verification, consent, private data boundaries, quote review, scope reuse, cache recovery, client connection/revocation, drawer focus, route-level serious/critical Axe checks, reverse scrolling, reduced motion, graphics failure, and the dedicated canvas offscreen-pause test. Dependency audit reports zero vulnerabilities.

## Independent review and correction

The fresh reviewer returned `fix` in `.local/ui-revamp/finish-review.md`. Its four material findings were corrected in one batch: mobile agent layout, humanized field/purpose labels, removal of the source eyebrow, and readable source-rights/check detail. Eight same-path originals were recaptured; `fix-recapture.json` records no page errors or horizontal overflow. The same reviewer scored all four **resolved**, disposition **ship**, in `.local/ui-revamp/finish-verdict.md`. That verdict covers those four scored fixes; it is not represented as a second full-surface review.

The documenter replaced `docs/DESIGN.md`, `.impeccable/design.json` and the affected surface briefs with the built source-led system. Documentation and visual review are complete. CI and hosted deployment are separate release gates; this report records local design acceptance, not external payment/provider certification.

Final result: passed

## Hosted release verification

Application commit: `b602685fcfc364e37c9a78078a872f79e90b3fee`.

[Application checks](https://github.com/mohitagarwal24/Trove/actions/runs/41680698754) passed on this exact commit. Render deployment `dep-dbl1a361egvs7399jsg0` went live at 17:10:19 UTC on 3 November 2026 on the existing free service. No schema change or additional account/key was introduced.

Twenty read-only hosted checks passed at 17:13:21 UTC on [Trove](https://trove-mohit24.onrender.com/), across desktop and mobile. These covered public entry/catalogue/authentication/agent setup/recovery/legal routes, protected dashboard redirection, source-preview dismissal, sidebar collapse and MCP resource metadata. No page errors or document-level horizontal overflow were recorded. Hosted screenshots and machine results are in `.local/ui-revamp/hosted/`. The production smoke pass performed no external login, message, model call or financial transaction.


## Essential interface refinement — 5 November 2026

The dated [audit record](docs/AUDIT.md) and current surface brief supersede earlier always-visible detail layouts. Fresh before/after/confirmation evidence is under `.local/ui-essentials/`; the final two manifests contain 41 valid captures, no page errors and no document overflow. The single correction batch fixed closed Connect-panel widths and reduced research form height. Independent finish review inspected all 41 captures, compared representative baselines and returned **ship**, with no material fixes. Supporting scope, fees, rights, setup, billing and security details remain accessible through named native disclosures; prices, approval, selected sources and downloaded data keep priority. Existing white/charcoal tokens and purposeful motion remain.

All 74 backend and 38 browser checks, types/build and dependency audit pass. Local paid screenshots use TEST_ONLY fixtures. Separate authenticated external evidence confirms actual PayPal Sandbox capture and zero-cost purchased-data retrieval through connected Trove AI tools, as bounded in AUDIT.md. No new detector ignores or paid resources were introduced. Application revision `b10ac7e2bfcf24e84b5f901163eefc9da3837cc2` passed CI and is deployed on the existing Render service; all 26 hosted read-only checks passed with no page errors or document overflow. Details remain in AUDIT.md.
