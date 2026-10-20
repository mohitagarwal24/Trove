# Free hosting and credentials

Trove runs on one Render Free web service and Neon Free PostgreSQL. PostgreSQL supplies hosted search and the job queue; Elasticsearch and a separate worker are optional local tools. Do not create paid resources or enable AI billing for the hackathon.

Current service: https://trove-mohit24.onrender.com, Render `srv-dbaq5t3bc2fs73cc3qk0`, Singapore. Source: https://github.com/mohitagarwal24/Trove. Neon project: `lucky-wildflower-32427743`. Auto-deploy is off; deploy an explicitly validated commit.

Application release `20fca36` is deployed; the [acceptance record](AUDIT.md) includes hosted motion/reduced-motion and keyboard checks alongside the preceding agent-discovery and duplicate-purchase acceptance. The preceding release verified genuine Sandbox order creation and SDK eligibility. Buyer approval/capture, signed webhook delivery, refund and payout remain manual acceptance steps. Google sign-in awaits its OAuth client credentials; password recovery awaits sender credentials.

## Deployment

`render.yaml` defines the Free service. Build runs `npm ci --include=dev && npm run build`; startup validates the encryption key, applies migrations, imports source data if needed and starts Next.js. Migration history disables the retired shared accounts and removes their active sessions/tokens while preserving financial history. Never reset the hosted database to apply this revision.

Configure these server environment variables:

| Variable                | Value/source                                                        |
| ----------------------- | ------------------------------------------------------------------- |
| `DATABASE_URL`          | Neon pooled connection string, low connection limit (3 recommended) |
| `DIRECT_URL`            | Neon direct connection string for migrations                        |
| `APP_URL`               | Exact public HTTPS origin                                           |
| `RESULT_ENCRYPTION_KEY` | Stable 64-character hexadecimal secret; `openssl rand -hex 32`      |
| `CRON_SECRET`           | Separate random secret of at least 32 characters                    |
| `TROVE_JOB_MODE`        | `embedded` for the free service                                     |
| `PAYPAL_ENVIRONMENT`    | `sandbox` for free fictitious-funds testing                         |

Keep secret values in Render Environment or ignored local `.env` files. Preserve the encryption key across restarts and backups; rotating it requires re-encrypting active snapshots/results. A different key makes existing ciphertext unreadable.

The GitHub workflows use `TROVE_HOSTED_URL` and the secret `CRON_SECRET`. Hourly protected maintenance drains jobs and enqueues daily real source imports. An optional ten-minute health ping is enabled with `TROVE_KEEP_AWAKE=true`; it queries no database. Pings can reduce idle sleep but cannot guarantee uptime. [Render Free](https://render.com/docs/free) hours are shared across all free web services in the workspace. GitHub schedules can be delayed. No paid disk, database or background worker is required.

## Keys for actual research and checkout

| Credentials                                | How to obtain                                                                                                                                                                                                                                              |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GEMINI_API_KEY`                           | Create a key in [Google AI Studio](https://aistudio.google.com/api-keys) using a Free Tier project with billing disabled. Keep `GEMINI_MODEL=gemini-3.8-flash`; the app rejects models outside its free allowlist and never falls back to a paid provider. |
| `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` | In [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/), choose Sandbox → Apps & Credentials, create a REST app attached to Trove's sandbox business account.                                                                             |
| `PAYPAL_MERCHANT_ID`                       | Merchant/account ID of that same sandbox business account. It must match the order's receiving merchant.                                                                                                                                                   |
| `PAYPAL_WEBHOOK_ID`                        | Add `https://trove-mohit24.onrender.com/api/webhooks/paypal` as the REST application's webhook. Subscribe to relevant checkout approval, authorization, capture, refund and payout events. Save the registration ID.                                       |

Create a separate **personal Sandbox buyer** under Testing Tools → Sandbox Accounts. Use its generated credentials at checkout. Do not use the developer login as a buyer or real funds. These sandbox accounts do not require additional real PayPal registrations. Buyer plus business collection account suffice for checkout/refund testing.

Run `npm run check:integrations` for a secret-free configuration check. A configured key does not establish successful provider acceptance. Browser research uses one model call for requirement extraction; summary uses another. Agent `discover_data` calls use no Trove model quota. Shared minute/day limits protect free quota but cannot guarantee provider availability.

## Google sign-in (free)

In [Google Cloud Console](https://console.cloud.google.com/auth/clients), configure Google Auth Platform branding/audience, then create a **Web application** OAuth client. Add authorized redirect URIs exactly:

- `http://localhost:3000/api/auth/google/callback`
- `https://trove-mohit24.onrender.com/api/auth/google/callback`

Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` privately on the server. Only OpenID `openid email profile` scopes are requested; no billing or Gmail access is needed for sign-in. Configure audience/test users as required by your Google project, then test both new signup and existing-account linking in Account. The Google option appears only when both credentials exist. Password accounts require email confirmation before workspace access. Login credentials are separate from the sender’s Gmail API credentials below. Follow the complete [Google and Gmail setup guide](GOOGLE_AUTH_SETUP.md).

## Agent clients

Connect defaults to the hosted MCP URL plus Trove-account OAuth for ChatGPT, Claude, Codex and Claude Code. No OpenAI/Anthropic key is stored by Trove and no new OAuth service account or signing key is needed. Apply the additive agent-OAuth migration through `npm run db:migrate`; startup does this on Render. Keep `APP_URL` equal to the public origin so discovery, audience checks and callbacks agree. See [agent setup and protocol](AGENT_CONNECTIONS.md). Follow the client’s account/plan limits; no new paid service is provisioned. Advanced manual tokens and `scripts/mcp-bridge.mjs` remain compatible for older stdio clients; the bridge uses `TROVE_URL` and `TROVE_AGENT_TOKEN`, without `.env` or database access.

## Email verification and recovery over free HTTPS email

Render Free blocks outbound SMTP ports, so verification and recovery use the [Gmail HTTPS send API](https://developers.google.com/workspace/gmail/api/guides/sending). No email is simulated. Until configured, email endpoints return an unavailable error and send nothing. Pending password accounts cannot access private workspaces, purchases or agent tokens. Signups and previously unverified password accounts confirm a browser-bound six-digit code, valid for ten minutes and five attempts. Resends have a 60-second cooldown and five-per-hour limit; guesses have a separate twenty-per-hour limit across replacements. Codes are stored as keyed hashes. Successful verification rotates the session; successful password recovery also proves email ownership and revokes existing sessions/tokens. Expired codes are removed by maintenance.

Use an operator-controlled Gmail account. In a Google Cloud project, enable Gmail API, configure OAuth consent, and create a Web OAuth client. Authorize **that sender account only** with `https://www.googleapis.com/auth/gmail.send`, requesting offline access. Exchange the authorization code for a refresh token using your own OAuth client; [OAuth Playground](https://developers.google.com/oauthplayground/) can do this with “Use your own OAuth credentials” and its redirect URI.

Set `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`, and `MAIL_FROM` (the authorized sender email). Store all privately; never paste tokens into this repository. Testing-mode OAuth grants can expire, so use an appropriate durable consent configuration before relying on recovery. Google account/API quotas and consent requirements still apply. A dedicated production sender/domain can be considered later; it is not required or purchased for this hackathon.

## Providers and settlement

A user creates a provider profile in Seller studio, attests publishing rights and uploads a real dataset with attribution, source/licence links and an actual source date. New providers are pending and unlisted. Uploaded rows are encrypted immediately.

After checking identity, publishing rights and ownership of the payout account, an operator runs:

```bash
npm run provider:review -- <seller-id> approve <verified-sandbox-recipient-email>
# Pause discovery:
npm run provider:review -- <seller-id> suspend
```

Run against the intended database through a private environment. Do not print connection strings or use a browser endpoint for approval. An approved seller may publish new data; rights review is an ongoing operator responsibility.

Payouts are separate from buyer capture. Keep `PAYPAL_PAYOUTS_ENABLED=false` until Sandbox Payouts access, funded fictitious balance and verified recipient accounts exist. Provider earnings remain owed otherwise. Enable only for a deliberate end-to-end payout test. Only a successful **item** counts as paid; pending/failed/returned and refund recovery are distinct states. Live marketplace approval, contracts, tax treatment and dispute operations are separate launch requirements.

## Maintenance and recovery

- `npm run data:sync`: force three source fetches, preserve last good snapshots on failure. Review errors and actual source freshness.
- `npm run search:index`: rebuild optional public metadata search.
- Protected `POST /api/ops/tick`: run expiry/retention and bounded durable jobs. Use the existing script/workflow; never publish its bearer secret.
- Pending/uncertain payments: reconcile the existing purchase identity. Never create a replacement charge to resolve uncertainty.
- Back up Neon through its available free export tools and keep the encryption key separately. A restore must include source snapshots, results, accounting and jobs consistently.
- Review failed jobs, payout recovery and upstream import errors. Free hosting cannot provide guaranteed settlement latency.

Before real customers, supply the actual operator's legal identity and a private support channel, validate email delivery and account recovery, complete merchant/provider approvals, and perform the credentialed acceptance checks. The implementation does not invent those approvals or business details.

## Research and buyer funding

Choose requirements in Research workspace works without an AI credential. Optional Describe a brief uses Gemini and fails explicitly on missing configuration, provider errors, quota or timeout. It offers direct requirements entry without inventing an interpretation or purchase. Provider diagnostics log only an error code and HTTP status, never provider response bodies, prompts or credentials.

A task cap is not a wallet balance or a PayPal mandate. Research and quotes need no deposit and no connected buyer funding account. A positive quote proceeds to the existing exact-price PayPal approval flow in USD. Trove has no USDC or crypto dependency. In Sandbox, use a personal buyer account from PayPal Developer → Testing Tools → Sandbox Accounts → View/Edit Account. Use that account's generated credentials and fictitious test balance; do not spend real money. The business sandbox account represents Trove's merchant. You do not connect or top up a wallet in Trove. See [PayPal sandbox accounts](https://developer.paypal.com/sandbox-testing/accounts) and [sandbox overview](https://developer.paypal.com/sandbox-testing/overview/).
