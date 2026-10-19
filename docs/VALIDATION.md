# Validation and acceptance status

Validated locally on 18 October 2026 with Node 24.21.0, PostgreSQL 17, Elasticsearch 9.2.0 and Chromium. The current version is a working synthetic-data MVP. External payment, payout, webhook-delivery and model acceptance remain pending credentials.

## Completed checks

| Check               | Observed result                                                                                                                                                                                                                                                   |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TypeScript          | `npm run typecheck` passed.                                                                                                                                                                                                                                       |
| Production build    | `npm run build` compiled, type-checked and generated routes successfully.                                                                                                                                                                                         |
| Backend lifecycle   | `npm test`: 20 passed. Uses real PostgreSQL, fixture adapters and controlled payment doubles.                                                                                                                                                                     |
| Browser suite       | `npm run test:browser`: all 7 passed. The successful-purchase test was subsequently extended and passed again for summary generation, asynchronous simulated refund and result revocation.                                                                        |
| Accessibility       | Catalogue axe check: no serious or critical violations. Additional local checks of workspace, purchases, connect and the buyer-facing seller entry screen found none at these severities. This is automated evidence, not a complete accessibility certification. |
| Responsive layout   | Browser test at 390 × 844: no page-level horizontal overflow; mobile navigation works.                                                                                                                                                                            |
| MCP external client | Authenticated HTTP initialize, list of seven tools, offer search and revoked-token rejection passed. No financial approval tool exposed.                                                                                                                          |
| Postman/Newman      | Guided-simulation folder: 8 requests and 8 assertions passed, including result and receipt retrieval. No PayPal requests made.                                                                                                                                    |
| Elasticsearch       | Local metadata index populated with 8 current offers; actual Elastic search exercised by application and browser checks.                                                                                                                                          |
| Dependencies        | `npm audit` and `npm audit --omit=dev`: 0 reported vulnerabilities at validation time.                                                                                                                                                                            |

Backend coverage includes concurrent budget reservations, duplicate purchase identity, private-result isolation, immutable snapshots, licence/field/freshness rejection, connector failure before capture, authenticated encryption, access expiry, cancellation, balanced refund reversal, seller recovery after payout, capture-uncertainty reconciliation, concurrent webhook deduplication, missing credentials and seller ownership.

Tests create labelled simulated purchase history in the shared local buyer account. Browser seller validation publishes a same-price version; the catalogue still contains eight current offers. Backend test workspaces are cleaned up. No real customer/provider records were used.

The production server started cleanly with `npm start`; the catalogue returned HTTP 200 and `/api/health` returned `{"status":"ok","environment":"sandbox"}`. Preview web servers and the local worker were stopped after verification. The local database and search containers retain the seeded demonstration data.

## Pending external acceptance

- Actual PayPal sandbox order creation, personal-buyer approval, authorisation, capture and refund, with dashboard/API reconciliation.
- Signed webhook delivery to a public HTTPS endpoint. Local tests cover forged-signature rejection and deduplication after the verification boundary.
- Funded, enabled PayPal Payouts with seller recipient accounts; batch and item status reconciliation. Local settlement tests do not prove external delivery.
- Gemini Interactions planner and answer generation using a Free Tier account key. The working guided mode is explicitly deterministic.
- Hosted deployment acceptance is recorded in HOSTING.md. No live PayPal or Gemini API calls are implied by hosting the deterministic demo.
- A real data supplier with contractual permission for preparation before capture, data resale and the offered usage terms. All three implemented adapters currently serve synthetic fixtures.

Follow [SANDBOX.md](SANDBOX.md) for credentialed verification. Do not describe this repository as an approved production PayPal marketplace or the deterministic walkthrough as a verified live AI agent.

## Visual evidence

- [Desktop catalogue](previews/discover-desktop.png)
- [Research workspace](previews/workspace-desktop.png)
- [Mobile catalogue](previews/discover-mobile.png)

The design rationale and interaction rules are in [DESIGN.md](DESIGN.md). The complete supplied-resource review and sponsor decisions are in [RESOURCES.md](RESOURCES.md).

## Free hosting revision — 19 October 2026

- All 25 backend tests pass, including Gemini transport doubles, paid-model rejection, provider quota failure, cron authentication, health checks that never query the database, and synthetic scenario refresh preserving historical quotes. No real Gemini request was made.
- All seven browser tests passed with `TROVE_JOB_MODE=embedded` and no standalone worker process, including asynchronous refund and access revocation.
- TypeScript and the production build pass; production dependency audit reports zero known vulnerabilities.
- Live deployment verification and first-run credentials are recorded in [HOSTING.md](HOSTING.md).
