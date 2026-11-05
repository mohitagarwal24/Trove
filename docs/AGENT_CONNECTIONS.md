# Connect an agent

Trove's remote MCP URL is **https://trove-mohit24.onrender.com/api/mcp**. Add it in your client, choose OAuth when asked, sign in to Trove, and approve the permissions. No Trove access token, repository clone or config-file edit is required for this flow. Client availability depends on that client's account plan and workspace policy; Trove adds no paid authentication service.

| Client      | Setup                                                                                                                                                        |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ChatGPT     | Enable Developer mode in Settings → Apps, then create an app with the MCP URL and OAuth. Follow Trove's sign-in and consent.                                 |
| Claude      | Customize → Connectors → Add → Add custom connector. Enter the MCP URL, connect and authorize your Trove account. Claude Free supports one custom connector. |
| Codex       | Run `codex mcp add trove --url https://trove-mohit24.onrender.com/api/mcp`, then `codex mcp login trove`.                                                    |
| Claude Code | Run `claude mcp add --transport http trove https://trove-mohit24.onrender.com/api/mcp`, then authenticate Trove from `/mcp`.                                 |

Try: “Use Trove to find drug approval dates and active ingredients. Keep the quote under $10, and ask me before purchasing.” Your agent decides which fields, record filters, quantity and freshness it needs. Trove evaluates those exact requirements against real source availability and source rights, returns priced coverage or gaps, and reuses already-owned batches without another charge. Trove does not need a Gemini key for agent requests.

Connection consent permits `read` and optionally `purchase`, `support` and `offline_access`. Read access includes published samples and exact quotes; those actions never charge. Purchase permission lets the agent create purchase **requests**; the human still approves each exact USD payment in a browser. `support` allows buyer-confirmed issue reports and evidence replies, never a refund approval. A tool missing its permission returns an OAuth challenge rather than silently widening a grant. `offline_access` enables rotating renewal credentials for up to 30 days. Access credentials last one hour. Open Connect your agent → Connected apps → Disconnect to revoke the entire connection, including renewal. Password security changes and account closure also revoke connections.

Manual scoped tokens and the stdio bridge remain available under Advanced access tokens for clients that cannot use remote OAuth. They are optional and expire after 30 days.

Connect your agent offers a Copy research task action. After a successful tool request, Connected apps (or Advanced access tokens) shows the actual tool and time. A token merely existing is not proof of a working connection. Failed requests do not advance this activity; prompts and returned data are not retained in it.

A workspace entitlement applies across clients. A second authorised client can retrieve the same original purchase without checkout. Use the owned purchase reference rather than trusting the agent to remember it. A revoked connection loses access; a refund revokes the entitlement for every client.

## Protocol and acceptance

The server publishes RFC 9728 protected-resource discovery at `/.well-known/oauth-protected-resource/api/mcp` (and the root alias), plus authorization-server discovery at `/.well-known/oauth-authorization-server`. `/api/mcp` advertises discovery on its 401 challenge. Dynamic registration, PKCE S256 authorization codes, exact registered redirects, audience binding, token exchange, rotating refresh credentials and revocation run in Trove's existing PostgreSQL database. Registration supports public clients and registered `client_secret_post`/`client_secret_basic` clients. Trove does not fetch arbitrary client metadata URLs or support implicit/client-credentials grants.

Consent identifies the signed-in account and requested permissions and labels the client-supplied app name and callback host. Codes expire after five minutes, are hashed and consumed once transactionally. Refresh replay revokes its token family. MCP OAuth credentials are accepted only for the MCP resource. A read-only `get_profile` tool returns the authenticated account's stable identity. Twelve tools are exposed; none can approve or capture payment.

Automated acceptance uses the actual MCP SDK OAuth client against local HTTP endpoints through registration, browser sign-in/consent, tools and refresh. This validates protocol interoperability, not an actual ChatGPT/Claude account connection. Complete the client setup above on your own account to verify its plan, workspace policy and connector UI.

Sources: [MCP authorization](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization), [OpenAI authentication](https://developers.openai.com/plugins/build/auth), [Codex MCP](https://developers.openai.com/codex/mcp), [Claude Code MCP](https://code.claude.com/docs/en/mcp), [Claude custom connectors](https://support.claude.com/en/articles/11175166-getting-started-with-custom-connectors-using-remote-mcp).


## Chat previews and payment boundary

Compatible MCP Apps hosts can display Trove's versioned `ui://trove/research-v1.html` resource. It is self-contained, uses the standard Apps SDK bridge, respects host light/dark themes and safe areas, and contains no access token, payment credential field, external script or nested checkout frame. Other clients receive the same structured tool results plus text.

Discovery returns a fixed, supplier-published two-record sample, explicit field coverage, source URLs, a snapshot date, eligibility/gaps and a USD total. Quotes pin the actual requested scope and price. Samples are representative; they are not a filtered paid delivery and do not change to reveal arbitrary requested rows. The built-in regulatory samples include recall reasons/statuses and record-level source links. Historical purchases keep their original snapshot and entitlement; improving a public preview does not alter that delivery or invent a new date.

Trove has only a custom MCP connection. It has **not** received OpenAI enablement for digital-data commerce or native embedded checkout. OpenAI's current monetization documentation limits native checkout to selected partners and requires explicit approval for digital-commerce use cases. A PayPal integration, test mode, widget or plain-language chat confirmation cannot grant that access. Trove therefore clearly identifies its existing external PayPal approval boundary and does not simulate a native payment sheet. The entirely in-chat paid-purchase requirement remains blocked on that platform access.

After deployment, refresh the existing TroveAI app's tool definitions in ChatGPT (reconnect if its UI does not offer a refresh), then start a new chat and select it. Expect twelve tools, including `get_dispute`, `open_dispute` and `reply_to_dispute`. Existing grants remain at their authorized scopes. A read-only connection can assess and quote; a purchase or support action requests its own added permission through OAuth. Do not paste credentials into the conversation.

Try: “Find two drug recall records with recall number, classification, status, reason for recall and source URL. Require source snapshots within 30 days and cap spending at $10. Reuse owned data first. Show me the fixed samples, coverage and exact price before any checkout. Do not relax my requirements.”

For purchase problems, ask: “Show the review for purchase PURCHASE_ID,” or describe the specific issue and confirm you want it sent for review. A case is Trove support, not a formal PayPal dispute. Filing it does not issue a refund. See [the evidence review policy and private reviewer commands](PURCHASE_SUPPORT.md).

References checked for this implementation: [OpenAI chat UI](https://developers.openai.com/plugins/build/chatgpt-ui), [authentication and permission challenges](https://developers.openai.com/plugins/build/auth), [commerce and checkout eligibility](https://developers.openai.com/plugins/build/monetization), [MCP Apps server helpers](https://github.com/modelcontextprotocol/ext-apps), [OpenAI MCP extensions](https://github.com/openai/mcp-extensions/blob/main/docs/spec.md), [PayPal refund status](https://developer.paypal.com/api/payments/v2/refunds-get), and [PayPal webhook events](https://developer.paypal.com/api/rest/webhooks/event-names/).
