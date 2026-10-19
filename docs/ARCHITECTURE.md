# Architecture

One Next.js application and a PostgreSQL database serve browser, JSON API and MCP clients. Shared services under `src/server` own authorization and business rules. Render Free runs the web app and an embedded queue drain; local development can use a standalone worker. There is no paid hosted worker or filesystem dependency.

## Source to delivery

1. An allowlisted importer fetches real FDA records, normalizes whitelisted fields, validates dates and encrypts an immutable `DatasetSnapshot`. Provider uploads use the same storage contract. Public offers expose metadata and a fixed two-row/four-field preview only.
2. A Gemini research task produces structured requirements and permitted candidate selections. No key or quota produces a real error, never a deterministic replacement. Filters execute server-side against private data before quoting.
3. A quote pins source/version/hash, selected record indexes and fields, purpose, licence, freshness, access hours, commission and exact USD total. It expires after five minutes. Provider edits create new versions and cannot mutate existing quotes.
4. Purchase creation locks the quote and task budget, reserves only the exact total, and persists an idempotency key. The browser obtains genuine PayPal buyer approval. MCP cannot approve, capture or alter recipients.
5. The worker authorizes the order, prepares every approved dataset and validates the complete bundle before capture. Prepared results are encrypted. Authoritative completed capture then creates the entitlement, receipt, balanced ledger and seller payables in one transaction.
6. Reconciliation uses persisted payment identities after uncertain responses. It never retries a charge with a new identity. Refund completion revokes further access and reverses accounting. Submitted/paid payouts are flagged for separate recovery.

## Identity and isolation

Registration creates a private user and workspace. Scrypt passwords, hashed expiring session/agent tokens, cookie Origin checks, browser-only account/provider actions, atomic database rate limits and server ownership checks protect each boundary. Password recovery uses single-use hashed tokens and genuine HTTPS email. Password change/reset revokes sessions and agent tokens. Account closure disables access, redacts profile details and retains accounting identities.

Provider onboarding is pending until an operator reviews identity, rights and payment routing. Public clients cannot self-approve or change payout recipients. Uploaded data remains encrypted and unlisted while pending. Declared publishing rights require actual operator review; a checkbox cannot prove a legal entitlement.

## Durable operations

PostgreSQL is authoritative for jobs, leases, budgets and financial state. Embedded timers improve latency only. Verified webhooks are persisted uniquely with an outbox job before acknowledgement; jobs reconcile external resources rather than applying event labels blindly. Protected hourly maintenance recovers work after restarts, imports sources daily and purges expired terminal results. Health checks never query the database.

Payment, fulfilment and settlement are separate states. Sandbox and live environments cannot operate on each other's purchases. Results default to 24-hour access, pinned in the quote. Source snapshots and financial history are retained to preserve previously approved versions. Optional Elasticsearch contains public metadata only; database filtering rechecks visibility and current availability.

## Practical limits

Free hosting can sleep and scheduled jobs can be delayed. No uptime guarantee is implied. There is no stored wallet balance, escrow, reusable spending mandate or automatic split checkout. Live marketplace operation still requires merchant approval, provider contracts and operational policies. The current integration defaults to PayPal Sandbox; enabling live mode is an explicit configuration and business decision.
