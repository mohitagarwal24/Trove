# Current submission readiness — 5 November 2026

The core purchase-and-reuse path has real external evidence: a hosted PayPal Sandbox payment of **USD 1.40** returned `COMPLETED`, with captured payment, available data, active entitlement and receipt. An authenticated connected Trove AI client subsequently discovered the owned scope at **zero cost** and retrieved the same ten source records twice. No extra quote or purchase was created. Local UI payment captures are separately marked `TEST_ONLY`; they are not the basis for this claim.

Previous release checks: **74 backend tests and 38 browser tests passed**, strict types and production build passed, dependency audit reports zero vulnerabilities. UI refinement removes repeated instructions, empty dashboard panels and purchase metrics; exact price/approval remains prominent while scope, fees, rights and developer details use named disclosures. Independent review returned ship across 41 captures. The exact passing [CI revision](https://github.com/mohitagarwal24/Trove/actions/runs/42045695490) is deployed, with all 26 hosted checks passing; details are maintained in [AUDIT.md](AUDIT.md).

**Operator-confirmed authentication acceptance:** on 5 November, the project owner confirmed personally completing Google sign-in, delivered email verification and password recovery on the hosted application. These checks are complete based on that confirmation; they are separate from the agent's automated tests.

Current extension: read [the 5 November workflow audit](UX_AUDIT_2026-11-05.md) and [purchase-support policy](PURCHASE_SUPPORT.md). The new inline agent view shows public samples and exact quotes, with scoped purchase/support actions. Fully native ChatGPT checkout remains gated by OpenAI enablement; demonstrate the honest browser PayPal approval. [Clean-database CI](https://github.com/mohitagarwal24/Trove/actions/runs/42082928202) passed 82 backend and 43 browser tests; the exact application revision is live with 27 hosted checks passing. Release evidence is recorded in AUDIT.md. Reconnect TroveAI before the external chat walkthrough: its existing connection reported a missing refresh token.

Before submitting:

- Verify signed PayPal webhook delivery and refund completion with a disposable Sandbox purchase if those capabilities will be demonstrated. No matching persisted webhook event was found for the verified purchase; successful capture alone does not establish webhook delivery. Do not refund the research batch needed for the demonstration.
- Record the real agent → discovery → exact-price PayPal approval → delivered data → free reuse flow. Optional Gemini briefs are separate from the verified external-agent path. Payouts remain disabled and must not be represented as completed seller payments.
- Finish the project story, tool descriptions, source/provider disclosure and a working demo link. The public repository already has a detected MIT licence. Give judges clear access and Sandbox testing instructions without publishing private merchant credentials.
- Add the YouTube demonstration, under three minutes, and submit the Devpost entry. The [official rules](https://paypalaihackathon.devpost.com/rules) list **12 November 2026, noon Pacific** as the submission deadline and require meaningful PayPal + AI use, functional access, public licensed source, description and video. Keep judge access available through the judging period ending 15 December.

This is a verified hackathon core, not a claim of unrestricted live-commerce launch readiness. Real provider contracts, merchant approval, support and payout operations remain commercial-launch work.

---

# Pre-demo implementation plan

Scope authorised 3 November 2026: complete the remaining product implementation before recording the demo. Preserve exact-price human approval, actual public source data, private workspaces, revocation and the established interface. Use existing free services; no new API keys or dependencies.

## Implementation sequence

1. **Purchased-scope ownership.** Match canonical purchased fields and record occurrences rather than requiring unrelated snapshot content to be identical. Preserve seller, licence, purpose, environment and refund boundaries. Changed purchased values or expanded scope remain chargeable. Add lifecycle regressions.
2. **Persistent source explanations.** Save coverage, counts, gaps and minimum complete price on task decisions/requirements JSON, expose them in research and retain them on resume. Budget recovery offers an explicit user action, never silently increases a cap or relaxes scope.
3. **Owned-data view.** Extend Purchases with a searchable Your data tab over accessible workspace entitlements. Show purchased scope/version, original receipt and result links, evidence download, and a factual link to a newer published source version. Preserve purchase history and deep links.
4. **Evidence export.** Add an authenticated export using the existing authorised result retrieval path. Include purchased rows, exact scope, stable content fingerprints, provenance, source dates/rights, checks and receipt/payment references. Refund/revocation and workspace isolation apply equally to downloads.
5. **Research reuse.** Add a new-research action for an existing owned task, copying its requirements and cap into an editable draft while keeping task history and the original purchase intact.
6. **Agent readiness.** Record actual successful MCP tool activity on the authenticated token, aggregate it per OAuth connection, and provide a copyable first research request. Additive nullable activity columns require a forward migration. No prompts, secrets or returned data enter activity metadata.
7. **Acceptance.** Meaningful backend/browser coverage, clean build/types/audit, desktop/mobile/short-height screenshots, independent finish review and design documentation. Publish a CI-verified commit to the existing Render service and run hosted read-only acceptance.

## Definition of done

- An unrelated source-row/column update cannot force payment for unchanged purchased content.
- Research explains required fields, matching record counts and a minimum required budget; no financial operation occurs on scope selection/reuse.
- Accessible owned data can be found and exported, including after result-cache expiry; another workspace and a revoked entitlement cannot use these paths.
- Source-version notices use actual current offers; they do not imply that a version number by itself warrants another charge.
- OAuth/manual-token activity reflects successful tools and respects revocation and workspace boundaries.
- Existing authentication, payment approval/capture, retries, receipt/refund and seller flows retain their behaviour.

## Separate external acceptance

Actual Google consent, delivered OTP/recovery mail, a PayPal Sandbox buyer approval/capture/refund and an external agent-client session require the operator's accounts and consent. Complete application implementation first, then use the real acceptance runbook. Never replace those checks with fabricated success or a production mock path.

## Deferred

Automatic spending/wallets, custom named-template management, record-level incremental pricing, additional data domains and sponsor-only integrations. Version notices and scope reuse are useful bounded improvements; they do not claim these larger systems exist. Do not modify unrelated hosted applications or their keep-awake settings.

## Progress

- [x] Purchased-scope ownership
- [x] Persistent source explanations
- [x] Owned-data view and version notices
- [x] Evidence export
- [x] Research reuse
- [x] Agent readiness
- [x] Automated/local acceptance and hosted deployment

## Release evidence

Application commit `fc4c66fc787cf0b562f68969239e430412c9c84d` is live at https://trove-mohit24.onrender.com, Render deployment `dep-dbkuv8ui0phs73bcaog0`. [Fresh-database CI](https://github.com/mohitagarwal24/Trove/actions/runs/41653656328) passed 74 backend tests, 37 browser tests, build, types and dependency audit (zero reported vulnerabilities). The additive agent-activity migration applied successfully. Independent UI review returned ship; the documenter preserved the existing system and updated its affected surface record.

All 21 hosted read-only checks passed: health, desktop/mobile routes, private Dashboard redirect, signed-out library/evidence protection, MCP authorization discovery, six public offers and a source preview with Escape dismissal. Inspected documents fit their viewport and reported no page errors. Hosted checks did not authenticate a buyer, send mail, invoke AI or execute payment. Local captures and detailed evidence are recorded in `docs/AUDIT.md`.

Before recording, complete the separate external acceptance above using `docs/MANUAL_TESTING.md`: actual sign-in/email delivery, a fresh PayPal Sandbox buyer approval/capture/delivery/refund, and an actual external agent OAuth session. These are acceptance tasks for operator accounts, not replaced by the local controlled fixtures.
