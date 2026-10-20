# Catalogue screenshot corrections — 20 October 2026

User screenshots exposed two defects missed by the earlier checks: an empty decorative circle overlapping provider initials, and the document-progress line positioned against the viewport rather than the utility header. Removed the unused circle markup/style and gave the header its containing-block position. Provider badges now use plain initials consistently with source details; scrolling cannot paint a blue line across the catalogue.

Production build/types and both normal/reduced-motion scroll checks pass. Extended the existing browser regression to measure progress-line geometry against the header after scrolling. Chrome evidence at 1366px, 1000px and 390px confirms the header owns the line, all six decorative circles are gone, and no horizontal document overflow occurs. No typography, tokens, business behavior or hook exceptions changed.

Fix commit `8bb792c` is live, Render deploy `dep-dbbk5h0473hc73ckr66g`. [Fresh-database CI](https://github.com/mohitagarwal24/Trove/actions/runs/39408147384) passed all 59 backend and 20 browser checks. Hosted desktop/tablet/mobile geometry checks and both hosted normal/reduced-motion regressions pass.

# Shared interface refinement — 20 October 2026

Reviewed forty-one desktop/mobile/short-laptop states across the existing application, then refined shared forms, authentication branding, Account, Connect, source inventory, purchase results and dialogs. Long source values now expand on demand; receipt references remain accessible without dominating the default view. Fixed stale category results, misleading approval progress on stopped purchases, mobile sign-in/drawer handoff and unnecessary checkout chrome for wholly owned data. Source licences, scoped prices, human approval, refund consequences and the actual payment environment remain visible where required.

Motion now includes source-row arrivals, scroll-position feedback and shared route/hover/dialog transitions with a reduced-motion alternative and visible-default content. The Google mark is the official sourced asset; its Google Sans label uses a self-hosted 4KB subset with an OFL licence. The font was added to the design record rather than ignored. No new hook ignore was added; the intentional Inter body exception remains.

Types, production build, all 59 backend checks, all 20 browser checks and dependency audit pass. The mobile-dialog confirmation waits for its arrival animation before measuring fixed-header geometry. Additional Axe checks report no serious/critical findings on the inspected pages and authentication/refund dialogs. A 1366×610 check confirms sign-in fits and the sidebar account/callout remain reachable. Financial states were inspected using private local fixtures; no payment, refund, payout, AI request or email was initiated. See [UI review and state coverage](UI_REVIEW.md) for findings, evidence and limits. The independent full review requested one material fix for seller-table clipping; its post-fix verdict was **disposition: ship**, covering the scored fix, with no visible regressions. Documentation verification confirmed no additional system changes were needed. Hosted release acceptance follows below.

## Shared-interface hosted acceptance

Application commit `20f8454` is live at [Trove](https://trove-mohit24.onrender.com), Render deploy `dep-dbbh0cfavr4c73drpaug`. [Fresh-database CI passed](https://github.com/mohitagarwal24/Trove/actions/runs/39382912526), including 59 backend checks, all 20 browser checks, strict types, production build and dependency audit with zero reported vulnerabilities.

Hosted read-only checks passed on nine public/guest routes and verified the official Google mark/font, password visibility, complete sign-in at 1366×610, reachable sidebar callout/account, immediate category filtering, scroll feedback, reduced motion and the mobile drawer-to-sign-in handoff. No page errors or document overflow occurred on those inspected routes. The smoke script was corrected to recognize guest empty-state headings and to open the mobile profile menu before choosing Sign in; these were test assumptions, with no application changes required.

All six Google/mail configuration values were already present; no credential was displayed, replaced or changed. Startup deployed the prior email-verification migration alongside this interface update. No real OAuth consent, mailbox delivery, payment, refund or model request was attempted. Four private local review accounts and their financial fixtures were removed after verification, preserving existing sellers and source datasets. No new paid resource was used.

# Email verification and credential setup — 20 October 2026

Password accounts now require proof of email ownership before browser or MCP workspace access. The shared authentication dialog sends a real six-digit code through the existing Gmail HTTPS sender, supports pending-session resume, and continues the requested action after confirmation. Codes use a keyed hash and random nonce, expire after ten minutes, allow five attempts, and have separate account-level resend/guess limits. Confirmation consumes the code atomically, revokes pending sessions and legacy tokens, then issues a new session. Google-verified identities need no extra code; successful email password recovery also verifies ownership and clears pending codes. Missing sender configuration and provider failures keep access restricted.

Added a forward migration, expired-challenge maintenance, shared transactional email delivery and the step-by-step [Google/Gmail credential guide](GOOGLE_AUTH_SETUP.md). Setup and implementation docs now reflect the verified-account requirement. No production test mode, plaintext OTP storage, external email sends or paid resources were introduced. Browser fixtures are limited to a local app/database; controlled mail responses exist only in tests.

Local verification: types, production build and dependency audit pass; 59 backend checks pass. All 16 browser checks passed across the full run and a catalogue confirmation rerun after overlapping backend fixtures were removed from the shared local database. Desktop/mobile signup checks use real registration/confirmation endpoints with a test-only delivered-code fixture, cover denied unverified access, wrong codes, session resume, switching accounts and interrupted purchase review, and report no serious/critical dialog accessibility violations. Backend tests control only external Gmail HTTPS responses while exercising actual SQL, hashing, limits and session rotation. No actual Google consent or mailbox delivery is claimed.

Independent Impeccable review returned **disposition: ship** with no material fixes. Documentation handoff updated the account-flow description while preserving existing tokens, palette, fonts and controls. No new hook suppressions were added. The live app still needs the operator's Google/Gmail credentials and deployment of this revision; unconfigured password verification is intentionally fail-closed.

# Motion refinement — 19 October 2026

Added an authored selection confirmation: the existing checkmark draws in and the comparison dock settles into place in 220ms. Category, count, menu, dialog, arrow and mobile-drawer feedback stays brief. Prices remain stationary and exact; cards retain their geometry. No dependencies or shipping raster assets were added. Mobbin reference retrieval was unavailable because its MCP requires a paid plan; the implementation uses the incumbent design system and native CSS.

Consolidated duplicate reduced-motion rules into one complete alternative: spatial/transition effects stop while selection, color, labels and live status update immediately. Corrected existing controlled-dialog focus restoration, including protection against stealing focus during the sign-in-to-quote handoff.

Production build/types and all 13 browser checks passed across the final confirmation and targeted account-check rerun. Repeated local test signups reached the existing rate limit; only the exhausted localhost counter was cleared, with no production-policy change. Actual browser animation evidence confirmed 220ms exponential selection/dock arrivals, zero card bounding-box movement, restored opener focus, zero animations under reduced motion and no page errors. The two bounded capture rounds covered desktop, mobile, selected sources, source dialog and drawer.

Independent motion review found no material visual or interaction issue; its sole requested correction was synchronizing persisted motion records with the implementation. The documentation correction was scored resolved with **disposition: ship**, covering that fix; no further capture pass was required. No new hook suppressions were added.

Motion release `20fca36` is live at [Trove](https://trove-mohit24.onrender.com), Render deploy `dep-dbb2ojk9v7es73ag3cqg`. [Fresh-database CI passed](https://github.com/mohitagarwal24/Trove/actions/runs/39271330367) with 53 backend and 13 browser checks. All six hosted navigation/motion checks passed, including normal/reduced-motion selection, dialog focus restoration, persistent sidebar, laptop bounds and mobile focus containment. No credentials changed, no paid resources were added, and no payment/model operation was performed.

---

# Follow-up review — 19 October 2026

Added a persistent desktop sidebar toggle with accessible icon navigation; mobile keeps the full focus-contained drawer. Google OpenID Connect signup/linking is implemented and waits for real Google OAuth credentials. Codex, Claude Code and a database-free Claude Desktop bridge share eight MCP tools. `discover_data` accepts the agent’s exact requirements; Trove owns metadata search, matching counts, eligibility, cheapest complete coverage and gaps. Browser natural-language research uses the same evaluator after one Gemini extraction call.

Purchase history now authoritatively grants reuse of the same provider/batch/purpose/licence/field/record scope across tasks and clients. Quotes remove owned sources from their total; zero-total plans cannot create a payment. Acquisition locks block duplicate in-flight purchases across different quotes. Expired delivery caches rebuild from pinned snapshots without capture or accounting writes. Refunds remove eligibility for reuse. Updated content or additional scope requires a new quote. Historical purchases participate without a separate ownership backfill.

Cleanup: replaced `scripts/mcp.ts` (which needed local database credentials) with the remote-only bridge. Removed three unreferenced `docs/previews/*.png` snapshots; they were listed only in the old inventory. Import reachability found no orphan source files among 64 code entries at that check. Retained migrations, font licences, operator scripts, optional Elastic search and Postman because they remain used. The previous file-by-file review is retained below with removed entries omitted.

Validation: 53 backend checks, 11 Chrome browser checks, strict types, production build, dependency audit (zero reported vulnerabilities), and configured-secret scan passed. Browser coverage includes real HTTP MCP and the stdio-to-HTTP bridge without database credentials, token revocation, exact requirement discovery, client configuration selection, sidebar persistence/resizing and axe checks. The independent Impeccable navigation/Connect finish review returned **disposition: ship** with no material fixes. The existing intentional Inter exception is retained; no new findings were suppressed. Google provider consent and actual Codex/Claude model sessions still require the user’s credentials/client setup; protocol tests do not claim those external acceptances.

## Follow-up hosted acceptance

Application commit `2ffad84` is live at [trove-mohit24.onrender.com](https://trove-mohit24.onrender.com), Render deploy `dep-dbb2fqvf3r2c7381bkf0`. Startup applied all four forward migrations without resetting the database or changing existing credentials. [Fresh-database CI passed](https://github.com/mohitagarwal24/Trove/actions/runs/39268518284), including 53 backend and 11 browser checks.

All four navigation/search regression checks passed against the hosted application. A new private hosted account completed structured discovery, exact-price quoting, pending-duplicate rejection across separate quotes, cancellation before PayPal, eight-tool MCP discovery with read-only scope, and immediate token revocation. Validation accounts were closed. No payment was approved or captured and no real model request was made. Free-reuse, updated-batch charging and recovery remain covered by the controlled financial lifecycle tests; genuine buyer capture/refund acceptance remains a manual step.

Google credentials are absent, so the Google option correctly stays hidden. The signed-token verification adapter and state/nonce/linking boundaries are implemented and tested, but actual Google consent requires `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. Gmail sender configuration and prior external launch requirements below remain outstanding.

New retained files: `src/lib/research.ts` owns the shared request schema; `src/server/discovery.ts` owns exact requirement evaluation; `src/server/google-auth.ts` owns OpenID Connect; `src/server/ownership.ts` derives reusable rights from captured purchases; `scripts/mcp-bridge.mjs` provides remote stdio access; `tests/google-auth.test.ts` verifies callback boundaries. Four forward migrations add metadata search, Google identity/state, reused-source quote bindings, and safe authentication-age handling for pre-existing sessions. No migration history was rewritten.

---

# Previous implementation audit — 19 October 2026

This revision replaces the application's shared demonstration paths with private account, provider, research and payment workflows. It is an implementation review and validation record, not a certification of merchant approval, legal compliance or market demand.

## Changes and cleanup

- Removed runtime generated datasets, deterministic research, shared-account shortcuts and simulated purchase/refund/payout paths. The current catalogue uses 400 imported FDA rows in six paid preparation/delivery products. Current source storage has no synthetic-provider flag.
- Added private registration, account settings/export/closure, password change and genuine HTTPS email recovery. Sessions and tokens are hashed; reset tokens are expiring and single-use. Password changes/recovery revoke access. Already-connected agent sessions recheck revocation for every operation.
- Added reviewed provider onboarding, actual encrypted JSON uploads, explicit AI-processing permission, immutable offer editing and operator-controlled approval/payout routing.
- Bound quotes to immutable dataset hashes, matching record indexes, fields, filters, licence, purpose, price and access hours. Empty filtered batches cannot become purchases. Delivery checks precede authoritative payment capture.
- Hardened concurrent quote/purchase identities, environment isolation, capture recovery, exact refund validation, atomic refund accounting, pinned payout recipients, returned-payout accounting and result-access timing. No customer or agent endpoint can self-approve a payment or alter payout routing.
- Simplified catalogue, workspace, checkout and Connect copy. Account and provider forms share the existing controls. Kept the working ink/cobalt/amber identity and short-laptop navigation. Removed 118 unused CSS selectors and 339 superseded declarations, then verified the resulting layouts.
- Removed unused Radix dropdown/tooltip dependencies and consolidated overlapping setup/demo/validation documents. Replaced the Postman simulation collection with private-account and real-approval requests; removed its redundant one-variable environment file.
- Added CI for fresh migrations/source import, types, backend checks, build, dependency audit and real-endpoint browser tests. CI uses an isolated local database and no payment/AI credentials.

Migration history remains append-only. Historic disabled-account records and financial receipts are preserved; an old SQL migration can therefore still contain retired field/mode names. New application routes only create genuine sandbox/live purchases. No runtime simulation switch or shared-user seed remains.

## Verification

- `npm run typecheck`: passes with unused locals/parameters rejected.
- `npm test`: 45 passing checks against local PostgreSQL. Financial/model/email responses are controlled **inside tests only**; no test moves money or consumes model quota.
- `npm run test:browser`: 10 passing checks using Chrome and actual application endpoints. Covers private registration with interrupted purchase-review continuation, profile persistence, actual provider upload remaining unlisted, scoped MCP/revocation, configuration-dependent research, mobile navigation, laptop bounds and accessibility.
- `npm run build`: production compilation and route generation pass.
- `npm audit`: zero reported vulnerabilities at this check; this is point-in-time evidence.
- Batched production screenshots cover desktop/mobile catalogue, workspace, provider onboarding, Connect, account, purchase review and privacy. No browser page errors were observed. Paid-result presentation still requires the manual genuine Sandbox purchase described below.
- Axe found no serious/critical violations on catalogue, account, provider entry and Connect. This is automated evidence, not comprehensive accessibility certification.
- Independent Impeccable finish review: **disposition: ship**, after resolving stale design documentation. Intentional Inter body typography remains the existing narrow exception; no additional hook suppressions were added. Small inherited metadata/utility-label treatments remain documented rather than expanded.

Backend coverage includes source integrity/licensing boundaries, non-first-row filtered delivery, no-match rejection, immutable terms, tenant isolation, concurrent budgets/idempotence, staged encryption, capture uncertainty, exact refund validation, entitlement expiry/revocation, payout identity/recipient pinning/returned-item accounting, webhook replay, cron credentials, source outages and cross-process rate limits.

## Hosted release acceptance

Application commit `977a2c0` is deployed at [trove-mohit24.onrender.com](https://trove-mohit24.onrender.com), Render deploy `dep-dbb09t4s728c739ud4r0`. Startup applied the four forward migrations and successfully imported 200 approval products, 100 drug recalls and 100 device recalls. Existing hosted keys were preserved; retired demo flags were removed from the private hosted configuration.

Hosted checks passed private registration/profile update/export/closure, immutable two-record quoting, cancellation before payment, locked paid payloads, unlisted provider publication, seven MCP tools and revoked-token rejection. Validation accounts were closed afterward. The three laptop/search/mobile-navigation regression checks also passed against the hosted service, with no page errors in the functional walkthrough.

A **genuine PayPal Sandbox order** was created through the configured REST application and the v6 SDK rendered an eligible PayPal button. The order was never approved or captured; its Trove purchase was cancelled. This verifies order creation and SDK initialization, not the remaining authorization/capture/refund/payout chain. No real funds moved and no Gemini request was made.

[GitHub CI passed](https://github.com/mohitagarwal24/Trove/actions/runs/39248268003) after correcting Docker health-command quoting: fresh database migrations/import, 45 backend checks, production build, zero-vulnerability dependency audit and all 10 browser checks. The CI-only correction is commit `6666660`; it does not change the deployed application.

## External acceptance still required

The existing hosted PayPal/Gemini keys are preserved. Configuration checks do not prove successful provider calls. Complete [manual testing](MANUAL_TESTING.md) with actual Sandbox buyer approval, signed webhook delivery, captured data retrieval, refund and (only when enabled) successful seller payout. No new actual financial transaction or AI request was performed during this revision.

Password recovery needs four free sender credentials: `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`, `MAIL_FROM`. See [operations](OPERATIONS.md). No mail is silently simulated. Payouts remain disabled until approved API access, fictitious Sandbox funds and verified recipient accounts exist.

Before actual customers: supply the operator's legal identity/private support channel; validate email delivery, provider rights/contracts, merchant/platform approval, backup/restore and incident handling. Signup does not automatically verify email ownership; provider identity and distribution rights are reviewed by the operator. Prices/commission are illustrative and must be checked against processor/payout costs, tax treatment and refund economics before live operation. Public source availability does not establish demand or exclusive resale rights. Free hosting may sleep and delay durable work.

## Removed files

| File                                     | Disposition                                                                                       |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `src/lib/fixtures.ts`                    | Generated source rows/shared fixture definitions removed; actual registry/importer replaces them. |
| `src/server/demo-fixtures.ts`            | Fabricated freshness refresh removed; real source ingestion replaces it.                          |
| `docs/DEMO.md`                           | Replaced by pitch/supply disclosure and real walkthrough in PITCH.md.                             |
| `docs/SANDBOX.md`                        | Merged into OPERATIONS.md and MANUAL_TESTING.md.                                                  |
| `docs/HOSTING.md`                        | Consolidated into OPERATIONS.md; stale simulation setup removed.                                  |
| `docs/VALIDATION.md`                     | Replaced by this current audit and refreshed screenshots.                                         |
| `postman/Local.postman_environment.json` | Redundant base URL now lives in the collection; users keep credentials privately.                 |

## Retained-file review inventory

The list below records the review boundary, including unchanged configuration, migrations and licences. Source modules were reviewed for ownership, data/payment boundaries, current behavior and dead code; generated lock/type files were checked structurally through install/build/audit rather than treated as handwritten implementation. Bundled font metadata and licences were preserved. Temporary build/test/browser evidence remains ignored.

- `.env.example` — Updated: real integration keys, free HTTPS mail, no retired demo flags.
- `.github/workflows/ci.yml` — Added: isolated application CI without external AI/payment credentials.
- `.github/workflows/keep-awake.yml` — Retained: optional liveness only; no database query.
- `.github/workflows/maintenance.yml` — Retained: authenticated bounded durable maintenance.
- `.gitignore` — Retained: excludes secrets, build/test output and private review artifacts.
- `.impeccable/config.json` — Retained: existing narrow intentional Inter exception; no new ignores.
- `.impeccable/design.json` — Refreshed by documenter from current implementation.
- `.impeccable/surfaces/src-components-discover-tsx.md` — Updated refinement contract and product truth; incumbent identity retained.
- `AGENTS.md` — Retained Next.js-specific coding guidance.
- `LICENSE` — Retained MIT source-code licence; no transfer of third-party data rights.
- `PRODUCT.md` — Updated real-data/product constraints and source-rights principles.
- `README.md` — Rewritten single entry point for actual setup, behavior and limits.
- `compose.yaml` — Retained local PostgreSQL and optional search; no paid service.
- `docs/ARCHITECTURE.md` — Reviewed/updated current research, system, operations, acceptance or disclosure documentation.
- `docs/AUDIT.md` — Reviewed/updated current research, system, operations, acceptance or disclosure documentation.
- `docs/DATA_RESEARCH.md` — Reviewed/updated current research, system, operations, acceptance or disclosure documentation.
- `docs/DESIGN.md` — Reviewed/updated current research, system, operations, acceptance or disclosure documentation.
- `docs/MANUAL_TESTING.md` — Reviewed/updated current research, system, operations, acceptance or disclosure documentation.
- `docs/OPERATIONS.md` — Reviewed/updated current research, system, operations, acceptance or disclosure documentation.
- `docs/PITCH.md` — Reviewed/updated current research, system, operations, acceptance or disclosure documentation.
- `docs/RESOURCES.md` — Reviewed/updated current research, system, operations, acceptance or disclosure documentation.
- `next-env.d.ts` — Retained Next-generated declarations; validated by compiler.
- `next.config.ts` — Retained security headers and framework configuration.
- `package-lock.json` — Regenerated after dependency cleanup; pinned installation and audit checked.
- `package.json` — Updated commands/version; removed unused UI dependencies.
- `playwright.config.ts` — Updated CI browser/startup support; local installed Chrome retained.
- `postcss.config.mjs` — Retained Tailwind/PostCSS integration.
- `postman/Trove.postman_collection.json` — Replaced demo requests; real account/quote/manual approval workflow.
- `prisma/migrations/20261018134851_initial/migration.sql` — Preserved applied migration history and financial guards; reviewed schema/index/foreign-key effects.
- `prisma/migrations/20261018135504_purchase_processing_lease/migration.sql` — Preserved applied migration history and financial guards; reviewed schema/index/foreign-key effects.
- `prisma/migrations/20261018144000_financial_guards/migration.sql` — Preserved applied migration history and financial guards; reviewed schema/index/foreign-key effects.
- `prisma/migrations/20261019090000_real_catalogue/migration.sql` — Added forward-only migration; applied locally; preserves historical financial records.
- `prisma/migrations/20261019090100_seller_review/migration.sql` — Added forward-only migration; applied locally; preserves historical financial records.
- `prisma/migrations/20261019090200_payment_environments/migration.sql` — Added forward-only migration; applied locally; preserves historical financial records.
- `prisma/migrations/20261019090300_payout_recipient/migration.sql` — Added forward-only migration; applied locally; preserves historical financial records.
- `prisma/migrations/migration_lock.toml` — Retained PostgreSQL migration provider lock.
- `prisma/schema.prisma` — Added encrypted snapshots, account lifecycle, rate limits, provider review and payout recipient pinning.
- `prisma/seed.ts` — Replaced shared users/generated data with idempotent real source import.
- `public/fonts/INTER-LICENSE.txt` — Retained self-hosted font asset/licence; family metadata and OFL attribution checked.
- `public/fonts/MANROPE-LICENSE.txt` — Retained self-hosted font asset/licence; family metadata and OFL attribution checked.
- `public/fonts/inter.ttf` — Retained self-hosted font asset/licence; family metadata and OFL attribution checked.
- `public/fonts/manrope.ttf` — Retained self-hosted font asset/licence; family metadata and OFL attribution checked.
- `public/icon.svg` — Retained code-native brand geometry; no raster asset dependency.
- `render.yaml` — Updated free hosting configuration; Sandbox explicit; retired flags removed.
- `scripts/check-integrations.ts` — Reviewed operator/deployment entry point, private configuration handling and bounded operations.
- `scripts/hosted-request.mjs` — Reviewed operator/deployment entry point, private configuration handling and bounded operations.
- `scripts/hosted-start.mjs` — Reviewed operator/deployment entry point, private configuration handling and bounded operations.
- `scripts/index-search.ts` — Reviewed operator/deployment entry point, private configuration handling and bounded operations.
- `scripts/mcp-bridge.mjs` — Replaces the database-backed stdio entry with a remote-only MCP bridge.
- `scripts/review-provider.ts` — Reviewed operator/deployment entry point, private configuration handling and bounded operations.
- `scripts/sync-data.ts` — Reviewed operator/deployment entry point, private configuration handling and bounded operations.
- `scripts/worker.ts` — Reviewed operator/deployment entry point, private configuration handling and bounded operations.
- `src/app/[[...slug]]/page.tsx` — Validated supported application routes; unknown paths return 404.
- `src/app/api/[...path]/route.ts` — Reviewed all API branches; added bounded inputs/private lifecycle; removed demo endpoints.
- `src/app/api/mcp/route.ts` — Retained authenticated stateless transport; added request limits.
- `src/app/globals.css` — Removed obsolete styles and duplicates; added current form/responsive rules.
- `src/app/layout.tsx` — Retained root metadata, language and stylesheet entry.
- `src/components/account.tsx` — Reviewed/updated working customer flow, state recovery, concise copy and responsive controls.
- `src/components/auth.tsx` — Reviewed/updated working customer flow, state recovery, concise copy and responsive controls.
- `src/components/connect.tsx` — Reviewed/updated working customer flow, state recovery, concise copy and responsive controls.
- `src/components/discover.tsx` — Reviewed/updated working customer flow, state recovery, concise copy and responsive controls.
- `src/components/legal.tsx` — Reviewed/updated working customer flow, state recovery, concise copy and responsive controls.
- `src/components/purchases.tsx` — Reviewed/updated working customer flow, state recovery, concise copy and responsive controls.
- `src/components/quote-review.tsx` — Reviewed/updated working customer flow, state recovery, concise copy and responsive controls.
- `src/components/seller-studio.tsx` — Reviewed/updated working customer flow, state recovery, concise copy and responsive controls.
- `src/components/trove-app.tsx` — Reviewed/updated working customer flow, state recovery, concise copy and responsive controls.
- `src/components/ui.tsx` — Retained shared accessible dialogs, tables, status, loading and download primitives.
- `src/components/workspace.tsx` — Reviewed/updated working customer flow, state recovery, concise copy and responsive controls.
- `src/lib/catalogue.ts` — Reviewed shared types/configuration, domain registry, cryptography or client error contract; removed obsolete flags/imports.
- `src/lib/client.ts` — Reviewed shared types/configuration, domain registry, cryptography or client error contract; removed obsolete flags/imports.
- `src/lib/config.ts` — Reviewed shared types/configuration, domain registry, cryptography or client error contract; removed obsolete flags/imports.
- `src/lib/crypto.ts` — Reviewed shared types/configuration, domain registry, cryptography or client error contract; removed obsolete flags/imports.
- `src/lib/db.ts` — Reviewed shared types/configuration, domain registry, cryptography or client error contract; removed obsolete flags/imports.
- `src/lib/errors.ts` — Reviewed shared types/configuration, domain registry, cryptography or client error contract; removed obsolete flags/imports.
- `src/lib/examples.ts` — Reviewed shared types/configuration, domain registry, cryptography or client error contract; removed obsolete flags/imports.
- `src/lib/types.ts` — Reviewed shared types/configuration, domain registry, cryptography or client error contract; removed obsolete flags/imports.
- `src/server/ai.ts` — Reviewed shared service authorization, source/payment integrity, failure/recovery and current integration behavior.
- `src/server/answers.ts` — Reviewed shared service authorization, source/payment integrity, failure/recovery and current integration behavior.
- `src/server/auth.ts` — Reviewed shared service authorization, source/payment integrity, failure/recovery and current integration behavior.
- `src/server/catalog.ts` — Reviewed shared service authorization, source/payment integrity, failure/recovery and current integration behavior.
- `src/server/connectors.ts` — Reviewed shared service authorization, source/payment integrity, failure/recovery and current integration behavior.
- `src/server/cron-auth.ts` — Reviewed shared service authorization, source/payment integrity, failure/recovery and current integration behavior.
- `src/server/data-scope.ts` — Reviewed shared service authorization, source/payment integrity, failure/recovery and current integration behavior.
- `src/server/datasets.ts` — Reviewed shared service authorization, source/payment integrity, failure/recovery and current integration behavior.
- `src/server/embedded-jobs.ts` — Reviewed shared service authorization, source/payment integrity, failure/recovery and current integration behavior.
- `src/server/jobs.ts` — Reviewed shared service authorization, source/payment integrity, failure/recovery and current integration behavior.
- `src/server/mail.ts` — Reviewed shared service authorization, source/payment integrity, failure/recovery and current integration behavior.
- `src/server/mcp.ts` — Reviewed shared service authorization, source/payment integrity, failure/recovery and current integration behavior.
- `src/server/paypal.ts` — Reviewed shared service authorization, source/payment integrity, failure/recovery and current integration behavior.
- `src/server/planner.ts` — Reviewed shared service authorization, source/payment integrity, failure/recovery and current integration behavior.
- `src/server/purchases.ts` — Reviewed shared service authorization, source/payment integrity, failure/recovery and current integration behavior.
- `src/server/quotes.ts` — Reviewed shared service authorization, source/payment integrity, failure/recovery and current integration behavior.
- `src/server/rate-limit.ts` — Reviewed shared service authorization, source/payment integrity, failure/recovery and current integration behavior.
- `src/server/sellers.ts` — Reviewed shared service authorization, source/payment integrity, failure/recovery and current integration behavior.
- `src/server/settlement.ts` — Reviewed shared service authorization, source/payment integrity, failure/recovery and current integration behavior.
- `src/server/webhooks.ts` — Reviewed shared service authorization, source/payment integrity, failure/recovery and current integration behavior.
- `tests/auth.test.ts` — Reviewed/updated meaningful integration or browser acceptance coverage; provider doubles restricted to tests.
- `tests/browser/app.spec.ts` — Reviewed/updated meaningful integration or browser acceptance coverage; provider doubles restricted to tests.
- `tests/browser/design.spec.ts` — Reviewed/updated meaningful integration or browser acceptance coverage; provider doubles restricted to tests.
- `tests/health.test.ts` — Reviewed/updated meaningful integration or browser acceptance coverage; provider doubles restricted to tests.
- `tests/lifecycle.test.ts` — Reviewed/updated meaningful integration or browser acceptance coverage; provider doubles restricted to tests.
- `tsconfig.json` — Retained strict typing; added unused-code enforcement.
