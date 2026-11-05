# Current interface acceptance — 5 November 2026

1. Open the public home page on desktop, tablet, phone and a short 1366×610 laptop. Explore the real source browser, follow the Find / Approve / Reuse / Connect chapters in both directions, and use Get started to sign in. Legal and financial material remains labelled Future domains. Reduced motion and graphics failure must leave the page readable.
2. A new dashboard should show three research starting points and one agent connection action. Recent research and purchased data appear when those records exist; there are no empty promotional cards. Direct `/dashboard` access while signed out must return to sign-in with a safe return destination.
3. Choose Drug recalls. Category, quantity and spending cap are visible. Expand **Search options** for freshness, intended use, required fields and record filters. This navigation does not submit or purchase anything. Find sources performs the actual search.
4. A successful comparison leads with selected sources. Expand **Other sources** for alternatives and rejection reasons, or **Scope details** for matching evidence. Insufficient-budget recovery remains visible. Edit requirements changes the draft and disables stale purchase review.
5. In purchase review, verify the exact total and source quantity. Expand **Scope details**, **Price breakdown**, and **Source licences and access** as needed. Sandbox disclosure stays visible. Nothing is charged until separate PayPal approval and confirmed capture.
6. Purchased data uses the full result width with **Download JSON** first. Open **Receipt & provenance** for the payment capture reference, receipt and evidence export; **Delivery checks** for validation; **Order details** for billing and refund. Source usage terms remain available below the data. In Your data, expand the purchased scope to export evidence.
7. Connect shows the chosen client's URL or commands, a short next step, and optional **Setup instructions**. The example research task, advanced tokens and tool reference are disclosures. An empty connection list does not pretend an agent is connected. Account keeps **Change password** collapsed until requested.
8. Repeat with keyboard navigation and reduced motion. Native disclosures must open with Enter/Space. Sidebar collapse persists on desktop; mobile has a focus-contained drawer. Wide tables scroll inside the page. Prices and action targets must not move on hover.

# Manual acceptance

App: https://trove-mohit24.onrender.com. Use a new private Trove account and fictitious PayPal Sandbox funds. No shared passwords or simulation mode exist.

## Discover and compare

1. Open Discover. Expect six regulatory-data offers across drug approvals, drug recalls and device recalls. Search and category filters should work on desktop and mobile.
2. Open a product. Check fields, actual source update/retrieval dates, source attribution/licence and the two-row public preview. Prices cover preparation/delivery; raw source rights remain unchanged.
3. Add one or two products to comparison. Choose Compare & review. If signed out, create your own account and confirm its email with the six-digit code, or use Google sign-in when configured. Email confirmation should resume the interrupted action into the exact-price quote.
4. Check price, quantity, fields, purpose and five-minute expiry. Canceling the review creates no payment. Expired quotes must be replaced.

## Research and genuine checkout

1. Open Research workspace → Choose requirements. Select categories and record counts; expand Search options for fields, freshness and intended use; optionally add explicit record filters. Find sources must work without Gemini or a funded account. Keep the $10 spending cap or reduce it to test insufficient budget. It is a policy limit, not a deposited balance. With Gemini configured, try Describe a brief as well; a provider error must expose Choose requirements to continue, with no inferred fallback and no purchase.
2. Review selected sources and any record filters. A request with no matching records must not create a payable purchase. These are bounded batches, not an exhaustive database search.
3. Continue with PayPal. Verify Sandbox is visible, then approve the exact amount using a personal Sandbox buyer from your PayPal Developer dashboard.
4. Returning from approval alone is not proof of payment. Wait for validated delivery and confirmed capture. Inspect actual order, authorization and capture references in the receipt and PayPal dashboard.
5. Download result and receipt. Reload/retrieve again: the same capture reference and data remain; no second charge. Find the same scope from a new task or agent: expect an owned source at $0 and no checkout. Change fields/quantity or use a genuinely updated batch: expect a new quote. Reopening an expired delivery cache restores the original batch without a new payment. Another private account cannot open the purchase URL or result API.
6. Summarise with AI only if source terms permit it. This sends the purchased subset to Gemini. The response should cite sources and acknowledge coverage limits; it is not clinical advice.
7. Request a refund with a reason. Wait for authoritative completion; new data retrieval must stop. Previously downloaded files cannot be recalled.

## Coverage, library and evidence

1. Set a $0.50 cap for two drug-recall records. Find sources should retain an insufficient-budget explanation, required-field coverage and available record counts after reload. Set limit edits and focuses the cap only; Find sources submits the revised request. Editing scope disables review of an old quote.
2. Reuse scope from an owned research task. Expect the same editable requirements/cap in a new draft, no results or purchase yet, and the original task unchanged. Another account cannot copy a private task.
3. After a genuine captured purchase, open Purchases → Your data (also linked from Dashboard). Search title/provider/category/field; inspect the original quantity, fields, version, source date and receipt. Cache expiry must not remove the entry. A newer published version links to its actual preview without buying it. An unrelated row or unrequested column update must not charge again for unchanged purchased values; an additional identical row occurrence is additional scope.
4. Download Evidence pack from expanded scope in Your data, or the purchase’s Receipt & provenance tab. Run `node scripts/verify-evidence.mjs <downloaded-file.json>`: expect consistent fingerprints. Edit one exported value and expect a nonzero verification failure. This is content consistency, not signed provenance or a PayPal settlement check. Mixed-purchase reused sources link to their original purchases; export those separately.
5. Use two authorised external clients on the same account to retrieve the original purchase. Expect the same paid result and one purchase, with actual successful activity shown for each connection. Failed tools must not advance it. Revoke one connection and confirm it cannot retrieve; refund the purchase and confirm the library/export path is unavailable to both. Automated local tests cover the server contract; record actual external-client acceptance separately.

## Provider and account flows

1. Create a separate private account, open Seller studio, enter provider details and attest distribution rights. The profile should be pending review.
2. Publish a JSON array with 2–1000 consistently shaped rows, lowercase field names, real HTTPS source/licence links and an actual source date. Explicitly choose whether AI processing is allowed. Do not upload patient or other sensitive personal data.
3. The dataset stays unlisted while pending. An operator reviews rights/identity/routing using the operations guide. No customer endpoint can self-approve or change payout recipients.
4. Once approved, edit price, fields, permitted uses or availability. Each edit creates a new version; old quotes retain their approved price/version.
5. Check earnings: owed is not paid. Test actual Sandbox Payouts only after recipient configuration and approved API access. A refund after payout requires separate seller recovery.
6. In Account, change the name and reload, export account records, and expand Change password to test the password flow. It should sign out all sessions and revoke tokens. Test recovery only once HTTPS email is configured; a reset link works once for 30 minutes.
7. Close a disposable account. Further login, sessions and tokens should fail; accounting records remain and profile details are redacted.

## Navigation and Google sign-in

Configure credentials with [Google and Gmail setup](GOOGLE_AUTH_SETUP.md). Password signup and previously unverified password accounts require email confirmation before private workspace access. Check code delivery to a mailbox you control, wrong/expired codes, one-minute resend cooldown, replacement-code invalidation, browser binding, pending-step resume after reload and switching accounts. Successful verification works once and rotates the session. Until delivery is configured, the app must report an error and keep the account restricted. Google-verified addresses do not need an extra email code.

Collapse the desktop sidebar using the button beside the breadcrumb. Reload and navigate: the icon rail should persist, with labelled navigation and a usable account menu. Resize to mobile: open the full drawer, close with Escape, then return to desktop and expand. At 100% laptop zoom, agent navigation and the account control should fit.

Select a source and observe its checkmark and the comparison dock; adding another should update the count without changing card positions or animating prices. Change categories, open a source, and close with Escape: keyboard focus should return to the opener. Enable the operating system’s reduced-motion preference and repeat; state feedback remains immediate with no movement.

Scroll through Discover and longer pages: source rows settle into view without a progress bar. Hover controls and verify feedback without shifting prices or card geometry. With reduced motion enabled, the scripted inventory reveals stop. Category changes should immediately show only the selected category, even before a text search completes.

In sign-in, confirm the full-color Google mark appears when configured. Use Show/Hide password and verify the value is preserved. At a 610px laptop height the sign-in dialog, account control and agent navigation should remain reachable. On a narrow phone, open Publish dataset and scroll to its final action: the dialog title and close button should remain in place.

In purchased data, expand a long value and compare it with the downloaded JSON. The table scrolls independently instead of stretching the entire page. Open Transaction references and Source fingerprint when needed. A quote for entirely owned data should show Already purchased with direct access links and no payment action; mixed plans should retain an exact total for new scope.

Once Google credentials exist, choose Continue with Google in sign-in, complete consent, and expect a new private account. An existing email/password account must sign in normally and connect Google explicitly in Account. Test Google login again, cancelled consent, stale callbacks, and Google-only account closure after confirming identity. Automated tests validate the callback boundaries; they do not replace actual Google consent.

## Agent and recovery checks

Follow [agent setup](AGENT_CONNECTIONS.md) using the MCP URL and OAuth. Confirm the browser signs in to the intended account, shows permissions and callback host, and returns to the client only after Allow connection. Cancel must issue no code. List nine tools and call `get_profile` and `discover_data` with explicit needs, fields, filters, quantity, purpose, maxAgeDays and budgetCents. The account must be stable across refresh; no tool approves or captures payment. Disconnect in Trove and confirm the next tool request fails. Read-only consent cannot create quotes/purchases. Advanced manual tokens remain compatible; revoke one and confirm HTTP 401, including an already-running stdio bridge.

Verify genuine signed PayPal webhooks at the public endpoint and replay one: persist once, reconcile once. Controlled automated tests cover missing fields, corrupt source payloads, concurrent budget reservations, capture uncertainty, replay and encryption tampering; those test doubles are not product modes. Do not intentionally interrupt a live financial operation on the public service without a controlled test plan.

Report route/purchase ID, action and exact visible error. Never include keys, cookies, passwords or agent tokens. Record actual external financial references privately before claiming end-to-end integration success.
