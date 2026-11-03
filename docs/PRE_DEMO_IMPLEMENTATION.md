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
- [ ] Acceptance and deployment
