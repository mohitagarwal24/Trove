# Manual acceptance checklist

App: https://trove-mohit24.onrender.com

On 19 October 2026 the public readiness response reported Gemini and PayPal configured, payouts disabled, and eight offers. Configuration is not proof of a successful provider call. All data suppliers and records currently remain synthetic.

## Accounts

You do not need additional Render, Neon, search or data-provider accounts to test this deployment. Keep the Google AI Studio project on Free Tier without billing. Use PayPal Sandbox exclusively.

### PayPal accounts

All of these are fictitious sandbox accounts managed under your existing PayPal Developer login, not separate real PayPal registrations:

| Role                     | Type     | Needed for                                              |
| ------------------------ | -------- | ------------------------------------------------------- |
| Buyer                    | Personal | Approving checkout                                      |
| Trove collection account | Business | The REST app, client ID/secret, merchant ID and webhook |
| Northstar recipient      | Business | Pricing-seller payout test                              |
| Atlas recipient          | Business | Supplier-seller payout test                             |
| Meridian recipient       | Business | Market-seller payout test                               |

Buyer plus Trove are sufficient for checkout/refund. Add the three recipient accounts for complete seller settlement. In the Developer Dashboard, use Testing Tools → Sandbox Accounts → Create Account. Retrieve generated logins through ⋮ → View/Edit Account. Default personal/business accounts may already exist. Use the personal sandbox credentials in PayPal checkout, not your Developer Dashboard credentials. The recipients do not each need a REST app or API secret.

### Trove logins

These are pre-created shared fixture accounts. Open the sidebar account menu → Sign in / switch account. No signup is required.

| Role                                | Email                 | Password          |
| ----------------------------------- | --------------------- | ----------------- |
| Buyer                               | buyer@trove.test      | trove-demo-buyer  |
| Separate buyer for isolation checks | researcher@trove.test | trove-demo-buyer  |
| Northstar seller                    | pricing@trove.test    | trove-demo-seller |
| Atlas seller                        | suppliers@trove.test  | trove-demo-seller |
| Meridian seller                     | market@trove.test     | trove-demo-seller |

A Trove seller login manages an offer; its mapped PayPal recipient account receives a payout. Logging in with a seller does not itself configure a payment destination. Use separate browser profiles/incognito sessions to keep buyer, seller and PayPal logins distinct.

## Test 1: reproducible purchase, without external AI/payment requests

1. Open Discover. Expect eight current offers, fictional-provider labels, search/filter controls and exact USD batch prices.
2. Sign in as the Trove buyer. Open Research workspace and explicitly choose **Guided demo**, even if Live AI is selected by default.
3. Enter this prompt, with a $10 task spending limit:

   > Compare current product prices and supplier capabilities for consumer electronics in the United States. Only use data licensed for internal business analysis.

4. Click **Run guided research**. Expect the current Northstar retail offer ($2.40) and Atlas supplier directory ($3.20). Review rejections for stale archives, missing required fields and unsuitable licences. With unchanged fixture prices the bundle is $5.60; six records per source. The $10 allowance is a task policy, not a top-up or authorization to charge $10.
5. Click **Review purchase plan**. Check fields, quantities, source versions, purpose, seller attribution, included illustrative commission and five-minute expiry. The illustrative $0.56 commission is included in $5.60.
6. Choose **Continue in simulation**, then **Successful delivery checks → Run simulated purchase**.
7. Expect **Your evidence is ready**, **Simulation — no money moved**, payment `captured`, delivery `available`, data from both sources and references beginning `SIM-`. Seller earnings remain simulated and unsettled.
8. Inspect **Purchased data**, **Delivery checks**, and **Receipt & provenance**. Download the result and receipt JSON. Reload the page: the same purchase and result remain accessible, with the same capture reference. No second purchase is needed to read the result again.

With Gemini configured, the result page's **Draft with AI** is a separate external API action. Leave it for the next test if this first pass should consume no model quota.

## Test 2: live Gemini, independently from PayPal

Create a new task using the same prompt and choose **Live AI → Find sources with the agent**. Expect structured source decisions and an eligible quote within the task limit. Selection can vary; do not require identical wording or price if the chosen permitted scope differs.

Continue in simulation to isolate AI from payment testing. Once results are available, click **Draft with AI**. Expect a source-linked draft marked as synthetic evidence, with limitations. A successful draft does not establish real-world data accuracy.

Planning can use two API calls; drafting uses another. The app defaults to five requests per minute and 30 per UTC day across the shared demo, and the provider has its own free quota. A quota error should leave payment untouched and should not switch to a paid model.

## Test 3: actual PayPal sandbox checkout

1. Use Guided demo for a reproducible quote, or Live AI after Test 2 succeeds.
2. Create a fresh purchase plan, then choose **Continue to sandbox checkout**.
3. On the purchase page approve using **PayPal Sandbox**, signing in with the personal sandbox buyer account.
4. Approve only the displayed exact bundle total. Returning from the popup does not alone mean capture succeeded.
5. Keep the purchase page open. The worker authorizes the order, prepares and validates every source, encrypts the staged results, then captures and grants access. Data should appear only after confirmed capture.
6. Expect payment `captured`, delivery `available`, actual PayPal sandbox order/authorization/capture references, and no `SIM-` capture ID.
7. In the sandbox business account, confirm the corresponding transaction, amount, currency and receiving account. Check Developer Dashboard webhook deliveries. Reload/retrieve the same result several times: the capture reference and captured amount must remain unchanged.

PayPal moves fictitious funds from the buyer to Trove's collection account. Seller earnings are recorded separately after delivery; the checkout is not an immediate PayPal split payment. With payouts currently disabled, settlement should remain `owed` with a clear explanation. That does not mean buyer checkout failed.

If status is uncertain or `reconciliation_required`, use **Reconcile status** on the existing purchase. Record the purchase ID and message before starting another checkout.

## Test 4: seller console and separate settlement

1. Switch to the appropriate Trove seller account and open Seller studio. Expect only that seller's offers and earnings; simulation and PayPal sandbox earnings are separate.
2. Edit an offer and publish a new version. The catalogue should show one current version; an old receipt retains its approved version and price. Record your original settings and publish another version to restore them after the test.
3. For payout testing, map the three sandbox recipient emails in Render:

   ```text
   SELLER_PRICING_PAYOUT_EMAIL
   SELLER_SUPPLIERS_PAYOUT_EMAIL
   SELLER_MARKET_PAYOUT_EMAIL
   ```

4. After sandbox Payouts access and fictitious collection-account balance are available, set `PAYPAL_PAYOUTS_ENABLED=true` and redeploy. Never add real funds for this demonstration.
5. Create a fresh captured sandbox purchase. Alternatively use **Reconcile status** on an existing captured purchase to queue its settlement again.
6. Check the seller console and recipient sandbox account. Only a successful payout item should show `paid`. A pending batch, failed attempt or owed balance is not a completed payout. With the original $5.60 two-source quote and 10% illustrative commission, Northstar earns $2.16 and Atlas $2.88. Provider fees are accounted for separately.

## Test 5: failure, access and recovery checks

| Test                | Action                                                                  | Expected result                                                                                                 |
| ------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Missing field       | New simulated purchase → Required field missing                         | Bundle stopped; no capture, result access or seller payable                                                     |
| Connector outage    | New simulated purchase → Seller connector unavailable                   | Bundle stopped; authorization voided and task reservation released after confirmed void                         |
| Timestamp mismatch  | New simulated purchase → Source timestamp mismatch                      | Delivery validation fails before capture                                                                        |
| Insufficient budget | Original current-data prompt with $1, Guided demo                       | No suitable full-price offer selected; no checkout or charge                                                    |
| Expired quote       | Wait beyond five minutes before continuing                              | Quote rejected; create a fresh plan                                                                             |
| Cancellation        | Create a purchase but do not approve, then cancel it                    | No capture and no later approval on that cancelled purchase                                                     |
| Refund              | Captured purchase → Request a refund → reason → Confirm                 | Wait for `refunded`; new result retrieval is blocked and unpaid seller settlement stops                         |
| Refund after payout | Refund a purchase whose seller was paid                                 | Buyer refund tracked separately; seller settlement requires recovery rather than pretending payout was recalled |
| Buyer isolation     | Copy purchase URL; sign in as researcher@trove.test                     | Another buyer's purchase and results are unavailable                                                            |
| Token revocation    | Connect your agent → create token → use it in an MCP client → revoke it | After the UI confirms Revoked, further token calls fail with HTTP 401                                           |

Refund revocation blocks further access from Trove; it cannot erase JSON you already downloaded. Test expiry or refunds on a disposable purchase, not the one you still need for the main walkthrough.

## Useful failure reports

Record the test number, purchase URL/ID, Guided/Live AI mode, Simulation/PayPal Sandbox mode, displayed payment/delivery/settlement states, and exact visible error. Never include API keys, account passwords, agent tokens or cookies.

Sources for external account setup: [PayPal sandbox accounts](https://developer.paypal.com/sandbox-testing/accounts), [PayPal Payouts overview](https://developer.paypal.com/payouts/use-payouts/overview/), [Gemini billing tiers](https://ai.google.dev/gemini-api/docs/billing). The app-specific behavior above follows the repository implementation; credentialed provider acceptance remains to be established by these tests.
