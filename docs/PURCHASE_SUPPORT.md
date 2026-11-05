# Purchase issues and refund review

Buyers use **Purchases → purchase → Order details → Report a problem**, or ask their connected agent to open an issue. The report needs a category and a specific description; up to five HTTPS evidence links are optional. Trove stores the original quote, agreed fields/quantity, snapshot binding, delivery checks and payment reference as case evidence. It does not copy all paid records or fetch submitted URLs.

Opening a case leaves payment captured and data available. It creates no refund, refund job or entitlement revocation. New seller payouts are held during review; already submitted payouts can still be reconciled. Reporting an issue is not sufficient evidence to approve it. Completing the research or changing one's mind alone does not establish failed delivery.

The reviewer checks the promise against delivery and the buyer's evidence. Valid concerns include missing or unusable records, wrong scope, duplicate charges or licensing problems. Review can request information, decline with a reason, or approve a full refund. Buyers can submit further evidence, including after a rejection. Messages and decisions remain in the case history. This human review has no automatic AI verdict or guaranteed response-time claim.

## Private operator workflow

Use the existing private application environment and database access. No buyer API or MCP tool can call these review actions. Supply an identifiable reviewer and an evidence-based reason of at least 20 characters. Do not use this command to test an actual customer's captured purchase.

```sh
npm run support:review -- list
npm run support:review -- show CASE_ID
npm run support:review -- request_information CASE_ID reviewer@example.com "Please identify the affected record and the field that differs from the quote."
npm run support:review -- reject CASE_ID reviewer@example.com "The cited record and all agreed fields match the delivered snapshot; explain the evidence reviewed."
npm run support:review -- approve CASE_ID reviewer@example.com "The delivery evidence confirms the agreed records are unusable; explain the verified failure."
```

**Approval is a financial action.** It queues the existing durable PayPal refund worker. It does not mean PayPal has completed the refund. The worker independently checks approval, payment environment, refund currency/amount and authoritative processor status. Only confirmed completion changes the purchase to refunded, revokes future access and writes the balanced reversal ledger. It cannot erase data already downloaded. Submitted/paid seller payouts require separate recovery.

Repeated approval does not queue a second refund. Existing obligations accepted before this policy were explicitly migrated as `legacy_authorized`; new records default to `review_required` and the processor rejects them without a decision. The old `/refund` endpoint now files an issue for review and cannot bypass the policy.

Trove support is separate from PayPal's formal dispute process and does not limit rights available through PayPal or applicable law. Verified full-refund events can reconcile money already returned outside Trove using a read-only PayPal status check; this never initiates a second refund. Automatic reconciliation requires an exact full-purchase USD amount and a matching capture reference. Partial refunds, chargebacks and other provider outcomes require separate operator reconciliation; do not claim those workflows have been verified.

## Acceptance

Use an isolated local database for automated tests. Verify that filing and evidence replies leave capture/access intact, cross-workspace reads fail, support scope is required for agent writes, decisions are logged, new payouts are held, and unapproved refunds cannot reach PayPal. Review approved-refund idempotency, amount mismatches, accounting and revocation. Actual signed webhook delivery and PayPal refund completion need a disposable Sandbox purchase and a separate approved case; unit responses and UI fixtures do not establish those external results.
