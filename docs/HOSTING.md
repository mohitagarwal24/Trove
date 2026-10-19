# Free hosting and first run

The deployment uses one Render **Free** web service and a separate Neon **Free** project. No paid worker, Render database, persistent disk, domain or AI subscription is required. Local Elasticsearch is optional; hosted search defaults to PostgreSQL.

## Deployment shape

- Render build: `npm ci --include=dev && npm run build`.
- Render start: `npm run start:hosted`. This validates encryption configuration, applies migrations, preserves existing fixture edits and starts Next.js.
- Set `TROVE_JOB_MODE=embedded`: the web service drains the existing PostgreSQL queue after authenticated mutations, purchase reads and verified webhook ingestion. Actual pending work schedules another bounded drain; there is no idle one-second database polling.
- Per-purchase leases, database job claims, payment idempotency and reconciliation remain authoritative. A timer is only a latency optimization and can disappear on Render sleep/restart.
- Durable data, results and jobs live in Neon. The web service stores no durable data in its filesystem.
- `/api/health` checks web-process liveness only and does not query Neon. A health ping therefore does not prevent database scale-to-zero.
- Hourly maintenance reissues the explicitly synthetic fixture scenarios when their scenario timestamps are over a day old. This creates new immutable offer versions and preserves seller edits and historical quotes. Archive scenarios retain their intended age. It does not claim that fresh real-world evidence was collected.

For a fresh manual deployment, create a Free Neon project in Singapore with minimum compute and autosuspend, then create the Free Render service from `render.yaml`. Set the exact HTTPS origin as `APP_URL`, use the pooled Neon URI for `DATABASE_URL` (connection limit 3) and the direct URI for `DIRECT_URL`. Keep both URI values private.

`RESULT_ENCRYPTION_KEY` must be 64 hex characters from `openssl rand -hex 32`. Generate `CRON_SECRET` separately with the same command. Preserve the encryption key across redeployments. Hosting credentials and generated app secrets are distinct from PayPal/Gemini API keys.

## Scheduled work and keep-awake

The repository contains two workflows, using standard GitHub-hosted runners for a public repository:

| Workflow                    | Schedule                                        | Repository configuration                                          |
| --------------------------- | ----------------------------------------------- | ----------------------------------------------------------------- |
| Hosted queue maintenance    | Hourly, minute 17 UTC                           | Variable `TROVE_HOSTED_URL`; secret `CRON_SECRET` matching Render |
| Optional hosted health ping | Every ten minutes, minutes 7/17/27/37/47/57 UTC | Variable `TROVE_KEEP_AWAKE=true` plus `TROVE_HOSTED_URL`          |

Maintenance sends an authenticated POST to `/api/ops/tick`, runs expiry/retention and drains queued work. A buyer cookie or agent token cannot authenticate this endpoint. The script retries cold starts and never prints secrets or provider response bodies. The public health endpoint cannot process jobs or change payment state.

A ping can reduce idle spin-down under Render's documented inbound-traffic behavior. It cannot guarantee uptime, bypass resource limits or compensate for failed deployments. Free hours are **750 per workspace per calendar month, shared by all its free web services**. One continuously awake service can consume almost the whole allowance. Do not assume each service receives 750 hours. Workflow schedules can be delayed; automatic scheduled workflows in inactive public repositories can also be disabled by GitHub.

Retain Free plans and do not enable Gemini billing. Free quotas may cause rate limits, suspended services or delayed jobs. Promotional credits are unnecessary for this topology. Review account billing settings before adding a payment method; a budget notification alone is not a hard spending cap.

## API keys for the first real AI/payment run

The first hosted guided simulation requires **no external AI/payment API keys**. For the credentialed run, add these server-side variables through Render's Environment screen and restart/redeploy:

| Variable               | Source                                                          | Purpose                                      |
| ---------------------- | --------------------------------------------------------------- | -------------------------------------------- |
| `GEMINI_API_KEY`       | Google AI Studio, project marked Free Tier without billing      | Live planner and purchased-data summary      |
| `PAYPAL_CLIENT_ID`     | Sandbox REST application on Trove's business collection account | Checkout and server authentication           |
| `PAYPAL_CLIENT_SECRET` | Same sandbox REST application                                   | Server authentication; never browser code    |
| `PAYPAL_MERCHANT_ID`   | Same sandbox business account                                   | Exact receiving-merchant verification        |
| `PAYPAL_WEBHOOK_ID`    | Webhook created on that REST application                        | Verify signatures for `/api/webhooks/paypal` |

Use `GEMINI_MODEL=gemini-3.8-flash` or the permitted Flash-Lite alternative. Provider free quotas vary; the app also enforces five API requests per minute and 30 per UTC day across the shared demo by default. A research task can use two calls. `GEMINI_DAILY_REQUEST_LIMIT` can reduce the daily allowance. Failed attempts consume the app allowance; requests never switch to a paid provider.

For sandbox seller payouts, additionally create three seller recipient accounts and set `SELLER_PRICING_PAYOUT_EMAIL`, `SELLER_SUPPLIERS_PAYOUT_EMAIL`, and `SELLER_MARKET_PAYOUT_EMAIL`. Enable `PAYPAL_PAYOUTS_ENABLED=true` only after sandbox Payouts access and fictitious balance are configured. A personal sandbox buyer is also needed for checkout. Account passwords are not server API variables.

Never commit API keys, database URIs, encryption keys or cron secrets. The ignored `.local/hosting.env`, if present, is private deployment state with restrictive permissions. It is not a template for public sharing.

Complete [SANDBOX.md](SANDBOX.md) after keys are added. Hosted simulation success does not prove a real PayPal sandbox capture, signed webhook, payout or Gemini call.
