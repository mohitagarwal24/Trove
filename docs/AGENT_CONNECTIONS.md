# Connect an agent

Trove's remote MCP URL is **https://trove-mohit24.onrender.com/api/mcp**. Add it in your client, choose OAuth when asked, sign in to Trove, and approve the permissions. No Trove access token, repository clone or config-file edit is required for this flow. Client availability depends on that client's account plan and workspace policy; Trove adds no paid authentication service.

| Client      | Setup                                                                                                                                                        |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ChatGPT     | Enable Developer mode in Settings → Apps, then create an app with the MCP URL and OAuth. Follow Trove's sign-in and consent.                                 |
| Claude      | Customize → Connectors → Add → Add custom connector. Enter the MCP URL, connect and authorize your Trove account. Claude Free supports one custom connector. |
| Codex       | Run `codex mcp add trove --url https://trove-mohit24.onrender.com/api/mcp`, then `codex mcp login trove`.                                                    |
| Claude Code | Run `claude mcp add --transport http trove https://trove-mohit24.onrender.com/api/mcp`, then authenticate Trove from `/mcp`.                                 |

Try: “Use Trove to find drug approval dates and active ingredients. Keep the quote under $10, and ask me before purchasing.” Your agent decides which fields, record filters, quantity and freshness it needs. Trove evaluates those exact requirements against real source availability and source rights, returns priced coverage or gaps, and reuses already-owned batches without another charge. Trove does not need a Gemini key for agent requests.

Connection consent permits `read` and optionally `purchase` and `offline_access`. Purchase permission lets the agent create quotes and purchase **requests**; the human still approves each exact USD payment in a browser. `offline_access` enables rotating renewal credentials for up to 30 days. Access credentials last one hour. Open Connect your agent → Connected apps → Disconnect to revoke the entire connection, including renewal. Password security changes and account closure also revoke connections.

Manual scoped tokens and the stdio bridge remain available under Advanced access tokens for clients that cannot use remote OAuth. They are optional and expire after 30 days.

## Protocol and acceptance

The server publishes RFC 9728 protected-resource discovery at `/.well-known/oauth-protected-resource/api/mcp` (and the root alias), plus authorization-server discovery at `/.well-known/oauth-authorization-server`. `/api/mcp` advertises discovery on its 401 challenge. Dynamic registration, PKCE S256 authorization codes, exact registered redirects, audience binding, token exchange, rotating refresh credentials and revocation run in Trove's existing PostgreSQL database. Registration supports public clients and registered `client_secret_post`/`client_secret_basic` clients. Trove does not fetch arbitrary client metadata URLs or support implicit/client-credentials grants.

Consent identifies the signed-in account and requested permissions and labels the client-supplied app name and callback host. Codes expire after five minutes, are hashed and consumed once transactionally. Refresh replay revokes its token family. MCP OAuth credentials are accepted only for the MCP resource. A read-only `get_profile` tool returns the authenticated account's stable identity. Nine tools are exposed; none can approve or capture payment.

Automated acceptance uses the actual MCP SDK OAuth client against local HTTP endpoints through registration, browser sign-in/consent, tools and refresh. This validates protocol interoperability, not an actual ChatGPT/Claude account connection. Complete the client setup above on your own account to verify its plan, workspace policy and connector UI.

Sources: [MCP authorization](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization), [OpenAI authentication](https://developers.openai.com/plugins/build/auth), [Codex MCP](https://developers.openai.com/codex/mcp), [Claude Code MCP](https://code.claude.com/docs/en/mcp), [Claude custom connectors](https://support.claude.com/en/articles/11175166-getting-started-with-custom-connectors-using-remote-mcp).
