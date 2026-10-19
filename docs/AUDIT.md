# Implementation audit — 19 October 2026

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
- `docs/previews/discover-desktop.png` — Replaced stale screenshot with current production-build capture.
- `docs/previews/discover-mobile.png` — Replaced stale screenshot with current production-build capture.
- `docs/previews/workspace-desktop.png` — Replaced stale screenshot with current production-build capture.
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
- `scripts/mcp.ts` — Reviewed operator/deployment entry point, private configuration handling and bounded operations.
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
