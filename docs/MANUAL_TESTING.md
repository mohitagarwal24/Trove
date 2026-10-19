# Manual acceptance

App: https://trove-mohit24.onrender.com. Use a new private Trove account and fictitious PayPal Sandbox funds. No shared passwords or simulation mode exist.

## Discover and compare

1. Open Discover. Expect six regulatory-data offers across drug approvals, drug recalls and device recalls. Search and category filters should work on desktop and mobile.
2. Open a product. Check fields, actual source update/retrieval dates, source attribution/licence and the two-row public preview. Prices cover preparation/delivery; raw source rights remain unchanged.
3. Add one or two products to comparison. Choose Compare & review. If signed out, create your own account; the interrupted action should continue into the exact-price quote.
4. Check price, quantity, fields, purpose and five-minute expiry. Canceling the review creates no payment. Expired quotes must be replaced.

## Research and genuine checkout

1. With Gemini configured, open Research workspace and try an example. Keep the $10 limit or reduce it to test insufficient budget. The output must use actual AI, permitted fields and available source coverage. Missing configuration/quota must produce an error with no purchase.
2. Review selected sources and any record filters. A request with no matching records must not create a payable purchase. These are bounded batches, not an exhaustive database search.
3. Continue with PayPal. Verify Sandbox is visible, then approve the exact amount using a personal Sandbox buyer from your PayPal Developer dashboard.
4. Returning from approval alone is not proof of payment. Wait for validated delivery and confirmed capture. Inspect actual order, authorization and capture references in the receipt and PayPal dashboard.
5. Download result and receipt. Reload/retrieve again: the same capture reference and data remain; no second charge. Find the same scope from a new task or agent: expect an owned source at $0 and no checkout. Change fields/quantity or use a genuinely updated batch: expect a new quote. Reopening an expired delivery cache restores the original batch without a new payment. Another private account cannot open the purchase URL or result API.
6. Summarise with AI only if source terms permit it. This sends the purchased subset to Gemini. The response should cite sources and acknowledge coverage limits; it is not clinical advice.
7. Request a refund with a reason. Wait for authoritative completion; new data retrieval must stop. Previously downloaded files cannot be recalled.

## Provider and account flows

1. Create a separate private account, open Seller studio, enter provider details and attest distribution rights. The profile should be pending review.
2. Publish a JSON array with 2–1000 consistently shaped rows, lowercase field names, real HTTPS source/licence links and an actual source date. Explicitly choose whether AI processing is allowed. Do not upload patient or other sensitive personal data.
3. The dataset stays unlisted while pending. An operator reviews rights/identity/routing using the operations guide. No customer endpoint can self-approve or change payout recipients.
4. Once approved, edit price, fields, permitted uses or availability. Each edit creates a new version; old quotes retain their approved price/version.
5. Check earnings: owed is not paid. Test actual Sandbox Payouts only after recipient configuration and approved API access. A refund after payout requires separate seller recovery.
6. In Account, change the name and reload, export account records, and test password change. It should sign out all sessions and revoke tokens. Test recovery only once HTTPS email is configured; a reset link works once for 30 minutes.
7. Close a disposable account. Further login, sessions and tokens should fail; accounting records remain and profile details are redacted.

## Navigation and Google sign-in

Collapse the desktop sidebar using the button beside the breadcrumb. Reload and navigate: the icon rail should persist, with labelled navigation and a usable account menu. Resize to mobile: open the full drawer, close with Escape, then return to desktop and expand. At 100% laptop zoom, the expanded agent callout and account should fit.

Select a source and observe its checkmark and the comparison dock; adding another should update the count without changing card positions or animating prices. Change categories, open a source, and close with Escape: keyboard focus should return to the opener. Enable the operating system’s reduced-motion preference and repeat; state feedback remains immediate with no movement.

Once Google credentials exist, choose Continue with Google in sign-in, complete consent, and expect a new private account. An existing email/password account must sign in normally and connect Google explicitly in Account. Test Google login again, cancelled consent, stale callbacks, and Google-only account closure after confirming identity. Automated tests validate the callback boundaries; they do not replace actual Google consent.

## Agent and recovery checks

Create a scoped token in Connect your agent. Initialize `/api/mcp`, list eight tools and call `discover_data` with explicit needs, fields, filters, quantity, purpose, maxAgeDays and budgetCents. Read-only scope cannot create quotes/purchases; no tool approves or captures payment. Use the Codex/Claude configuration in Connect; the agent should choose its requirements, let Trove find data, and follow the browser approval URL before retrieving paid rows. Revoke its token and confirm HTTP 401 on the next request, including an already-running Desktop bridge.

Verify genuine signed PayPal webhooks at the public endpoint and replay one: persist once, reconcile once. Controlled automated tests cover missing fields, corrupt source payloads, concurrent budget reservations, capture uncertainty, replay and encryption tampering; those test doubles are not product modes. Do not intentionally interrupt a live financial operation on the public service without a controlled test plan.

Report route/purchase ID, action and exact visible error. Never include keys, cookies, passwords or agent tokens. Record actual external financial references privately before claiming end-to-end integration success.
