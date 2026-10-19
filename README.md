# Trove

Trove is a data marketplace for researchers and their agents. Discover sources, compare exact prices, approve a purchase with PayPal, and receive a scoped dataset with a source-linked receipt. Providers publish encrypted datasets and manage immutable offer versions.

[Application](https://trove-mohit24.onrender.com) · [Manual testing](docs/MANUAL_TESTING.md) · [Free hosting and credentials](docs/OPERATIONS.md) · [Data research](docs/DATA_RESEARCH.md)

The initial catalogue contains six prepared regulatory-data products backed by real openFDA records. Payments use genuine PayPal APIs in Sandbox by default; there is no simulated checkout or canned AI response. The browser research composer requires a Gemini Free Tier key; connected agents use their own model and need only a Trove token. Provider identities and hackathon supply assumptions are disclosed in [PITCH.md](docs/PITCH.md). Source provenance and upstream rights remain accurate in every product.

## Run locally

Requires Node 22.9+ (24 recommended), npm and Docker.

```bash
npm ci
cp .env.example .env
# Set RESULT_ENCRYPTION_KEY to: openssl rand -hex 32
# Preserve this private key; changing it loses access to encrypted data.
docker compose up -d postgres
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Run `npm run worker` in another terminal, or choose `TROVE_JOB_MODE=embedded` before starting the app. Open http://localhost:3000 and create your own account. Seeding imports actual FDA data and creates no shared users. Internet access is required for the first source import. Later upstream failures preserve existing snapshots.

Without external credentials, registration, discovery, comparisons, provider publishing, account management and agent tokens work. AI research and checkout fail closed when unconfigured. Password recovery requires the email credentials in the operations guide.

## Implementation

Next.js 16, React 19, TypeScript, Prisma 6 and PostgreSQL. A durable PostgreSQL queue performs fulfilment, reconciliation, refunds, payouts, ingestion and retention. AES-256-GCM protects dataset and result payloads. Agents submit explicit requirements to Trove’s shared search/evaluation pipeline; Gemini only interprets natural-language requests from the browser workspace. PostgreSQL full-text search and server checks enforce fields, filters, price, licence, freshness, quantity and budget. MCP exposes eight scoped tools for Codex and Claude with human browser approval for every purchase.

Quotes bind an immutable source version, record indexes, fields, provenance, licence, delivery-cache period and total. All sources are prepared before capture. Confirmed capture grants access and writes balanced accounting and provider payables transactionally. Purchased batches can be reused across clients without another payment; an expired delivery cache is rebuilt from the original snapshot. Changed content or expanded scope requires a new quote. A refund revokes further access; a submitted payout requires separate recovery.

Optional Elasticsearch indexes public metadata only; PostgreSQL remains authoritative and provides search without it. Start local search with `docker compose --profile search up -d elasticsearch`, set `ELASTICSEARCH_URL=http://localhost:9201`, then run `npm run search:index`.

## Checks and operations

```bash
npm run typecheck
npm test
# Start the app first; Chrome defaults to /usr/bin/google-chrome.
npm run test:browser
npm run build
npm audit
npm run check:integrations
```

Backend tests require the local database and use isolated accounts plus controlled provider responses **inside tests only**. They never move money or consume AI quota. Browser tests register unique accounts and exercise real app endpoints. External buyer approval, signed webhook delivery, refunds and seller payouts require the manual credentialed checks; configured keys alone do not establish success.

Useful commands: `npm run data:sync`, `npm run provider:review -- <seller-id> approve|suspend [verified-payout-email]`, `npm run search:index`, `npm run worker`, `npm run mcp`. See [architecture](docs/ARCHITECTURE.md), [audit and validation](docs/AUDIT.md), [design](docs/DESIGN.md), and the [resource review](docs/RESOURCES.md). Source code is MIT; bundled fonts retain their OFL licences.
