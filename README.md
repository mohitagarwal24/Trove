# Trove

A data marketplace where research agents discover, compare, and purchase precisely scoped information. Buyers approve exact bundle amounts; sellers control versioned offers and usage terms. The interface includes a catalogue, browser research workspace, purchase approvals, encrypted results, source-linked receipts, seller studio, and scoped MCP connections.

[Open the hosted demo](https://trove-mohit24.onrender.com) · [Hosting and first-run credentials](docs/HOSTING.md). The hosted environment uses synthetic fixtures and labelled simulated payments until sandbox credentials are configured.

Follow [the manual testing checklist](docs/MANUAL_TESTING.md) for buyer/seller accounts, guided and live AI research, PayPal sandbox checkout, separate seller payouts, refunds and failure scenarios.

**Current external verification:** no PayPal or Gemini credentials were supplied during implementation. The local simulation is functional and explicitly labelled. Actual sandbox buyer payments, signature-verified webhook delivery, model calls, and seller payouts are implemented but require credentialed end-to-end validation. This repository does not claim live marketplace approval.

## Local setup

Requires Node 22.9+ (24 recommended), npm and Docker. PostgreSQL runs on port 5434 so an existing local database is not disturbed.

```bash
npm ci
cp .env.example .env
# Set RESULT_ENCRYPTION_KEY to the output of: openssl rand -hex 32
docker compose up -d postgres
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

In another terminal:

```bash
npm run worker
```

Visit http://localhost:3000. Click **Start a research task**, run guided research, review the exact quote, choose **Continue in simulation**, then confirm the simulation. Switch to a seller fixture account through the account menu or Seller studio. Seeding is repeatable and does not overwrite seller edits.

No PayPal SDK is loaded when the integration is unconfigured. Simulation never calls PayPal, uses `SIM-` references, and never submits real payouts. Its deterministic planner is labelled separately from live AI.

### Optional local Elasticsearch

```bash
docker compose --profile search up -d elasticsearch
# In .env, set ELASTICSEARCH_URL=http://localhost:9201
npm run search:index
```

Only public offer metadata is indexed. PostgreSQL remains authoritative; search falls back to PostgreSQL if Elastic is unavailable. Seller edits enqueue a metadata indexing job for the worker; the command above can also rebuild the index manually. No purchased payloads, staging ciphertext, payout destinations or credentials are indexed.

### Accounts

Fixture account shortcuts are available only with `TROVE_DEMO_ENABLED=true`.

| Account                              | Email                 | Local fixture password |
| ------------------------------------ | --------------------- | ---------------------- |
| Buyer                                | buyer@trove.test      | trove-demo-buyer       |
| Independent buyer (isolation checks) | researcher@trove.test | trove-demo-buyer       |
| Pricing seller                       | pricing@trove.test    | trove-demo-seller      |
| Supplier seller                      | suppliers@trove.test  | trove-demo-seller      |
| Market seller                        | market@trove.test     | trove-demo-seller      |

These accounts are for shared synthetic demonstrations, not confidential customer data. A public real-customer release needs private account provisioning, credential rotation and demo access disabled. Session cookies are HttpOnly and SameSite; passwords use scrypt; bearer tokens are hashed, scoped, expiring and revocable.

## Credentials to add later

Keep credentials in `.env` locally or the hosting environment. Never paste them into tracked files or commit them.

- `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`: REST app on the Trove sandbox business collection account.
- `PAYPAL_MERCHANT_ID`: that same business account's merchant ID; verified against the PayPal order.
- `PAYPAL_WEBHOOK_ID`: the webhook registration belonging to this REST app.
- Seller sandbox recipient emails; enable `PAYPAL_PAYOUTS_ENABLED=true` only after configuring access and funding.
- `GEMINI_API_KEY`: enables the live research planner using a Free Tier project with billing disabled. `GEMINI_MODEL` selects an explicitly permitted model; there is no paid-provider fallback.
- Elastic URL/API key for a cloud cluster, or the local Docker cluster above.
- One stable `RESULT_ENCRYPTION_KEY` shared by web and worker. Rotating it without re-encrypting active results makes them unreadable.

Run `npm run check:integrations` for a secret-free readiness report. Then follow [the sandbox verification runbook](docs/SANDBOX.md). Configured does not mean tested.

## Architecture

Next.js 16.4.2, React 19.3.1, Tailwind 4, Prisma 6.19.3, PostgreSQL, a PostgreSQL outbox worker, optional Elasticsearch 9, MCP SDK 1.32.1 and the Gemini Interactions API. Dependencies are pinned in package-lock.json. A patched deepmerge-ts override addresses the Prisma CLI dependency advisory; schema generation and migrations are validated with it.

- `src/server`: shared catalogue, planner, quote, purchase, settlement, auth, job and MCP services.
- `src/components`: independent buyer/seller flows and accessible reusable UI primitives.
- `prisma`: schema, deployable migrations and deterministic fixture seeding.
- `scripts/worker.ts`: durable fulfilment, reconciliation, refunds, payouts, expiry and retention.
- `docs/DESIGN.md`: visual system, screen purposes and interaction rules.
- `docs/ARCHITECTURE.md`: state and financial invariants.
- `docs/RESOURCES.md`: all supplied links, observed redirects and sponsor decisions.
- `postman/Trove.postman_collection.json`: reproducible API workflow.

Three adapters normalize different provider response shapes: product pricing, supplier capabilities and market indicators. Eight seeded offers have real differences in fields, purposes, freshness and prices. Every provider and record is synthetic. No affiliation with a real data provider is implied.

Quotes pin source versions, selected fields, quantity, declared timestamps, purpose, licence and exact total. A configurable illustrative commission is included in the gross price. Task reservations use PostgreSQL row locks. Result subsets are encrypted before capture; entitlement, accounting and seller payables are written transactionally after confirmed capture. Payment, fulfilment and settlement have independent states. Refunds stop unpaid settlement and explicitly flag submitted/paid settlement for recovery.

## MCP and API

Create a scoped token in **Connect your agent**. HTTP transport is at `/api/mcp` and requires `Authorization: Bearer ...`. It is stateless Streamable HTTP, with no unrestricted financial tools.

```toml
[mcp_servers.trove]
url = "http://localhost:3000/api/mcp"
bearer_token_env_var = "TROVE_AGENT_TOKEN"
```

Local stdio alternative, with `TROVE_AGENT_TOKEN` in the client's environment:

```bash
npm run mcp
```

Tools: `search_offers`, `get_offer`, `create_quote`, `create_purchase`, `get_purchase`, `get_result`, `get_receipt`. A read-only token cannot prepare purchases. Human approval remains in the browser. A token cannot choose capture amounts, manage sellers, issue refunds or set payout destinations.

The browser and MCP share services. JSON API routes include `/api/offers`, `/api/tasks`, `/api/quotes`, `/api/purchases`, `/api/purchases/:id/result`, `/api/purchases/:id/receipt`, `/api/seller`, and `/api/tokens`. Ownership is checked server-side. Cookie-authenticated mutations require a matching Origin; bearer clients use scoped credentials.

## Checks

```bash
npm run typecheck
npm test
npm run test:browser
npm run build
```

Run lifecycle tests with the separate worker stopped; they use isolated test workspaces and controlled payment doubles, then clean up their records. Browser tests require the app and worker running and a Chromium binary at `/usr/bin/google-chrome`, or `CHROME_PATH`. They use shared fixture accounts, create labelled simulations, revoke their token and publish a same-price seller offer version.

No automated local test constitutes a real PayPal sandbox payment or payout. See [validation evidence and remaining acceptance](docs/VALIDATION.md).

With the web app and worker running, import the collection and environment into Postman, or run the local simulation through Newman:

```bash
npx newman run postman/Trove.postman_collection.json \
  -e postman/Local.postman_environment.json \
  --folder 'Guided simulation — no PayPal transaction' --delay-request 1000
```

Desktop and mobile screenshots are linked in the validation document.

## Free hosted deployment

The repository now targets one **Render Free web service** with **Neon Free PostgreSQL**. `render.yaml` provisions no paid worker, database or disk. The embedded queue runner wakes after authenticated purchase activity and verified webhooks, then stops polling when idle. Health pings never query the database.

`npm run start:hosted` applies migrations, idempotently seeds fixture data and starts Next.js. On the free plan these run at startup because a separate paid predeploy phase is not required. Configure pooled `DATABASE_URL`, direct `DIRECT_URL`, a stable 64-character hex `RESULT_ENCRYPTION_KEY`, `CRON_SECRET`, the exact HTTPS `APP_URL` and `TROVE_JOB_MODE=embedded`.

Two GitHub Actions workflows provide hourly authenticated queue maintenance and an optional ten-minute health ping. The ping consumes Render workspace hours but does not keep Neon compute active. Free instances can still sleep, restart or hit shared quotas; durable jobs are recovered on subsequent activity. See [the complete hosting and first-run guide](docs/HOSTING.md).

All app data and staging ciphertext are in PostgreSQL, never Render's ephemeral filesystem. Hosted search uses the existing database implementation by default, so Elastic Cloud is unnecessary. Local Elasticsearch remains an optional working integration.

For the three-minute demo, follow [docs/DEMO.md](docs/DEMO.md). The repository uses MIT; locally hosted fonts have their own OFL licences in `public/fonts`.
