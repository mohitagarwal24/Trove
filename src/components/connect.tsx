"use client";
import { useEffect, useState } from "react";
import { Check, Copy, KeyRound, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { api, post } from "@/lib/client";
import { useTrove } from "./trove-app";
import { Badge, ExternalLink, Modal, Notice } from "./ui";
type Token = {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  expiresAt: string;
  revokedAt: string | null;
};
const toolDescriptions = [
  ["discover_data", "Match your agent’s exact data requirements"],
  ["search_offers", "Search free offer metadata"],
  ["get_offer", "Inspect fields, price, preview & terms"],
  ["create_quote", "Create an immutable exact-price plan"],
  ["create_purchase", "Reserve budget & return approval URL"],
  ["get_purchase", "Check payment, delivery & settlement"],
  ["get_result", "Retrieve entitled data without recharging"],
  ["get_receipt", "Get checks, provenance & payment references"],
];
export function Connect() {
  const { user, ensureAuth, notify } = useTrove();
  const [tokens, setTokens] = useState<Token[]>([]);
  const [name, setName] = useState("Research agent");
  const [client, setClient] = useState("codex");
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [value, setValue] = useState("");
  const [copyState, setCopyState] = useState("");
  const [scope, setScope] = useState("purchase");
  async function refresh() {
    setTokens(await api<Token[]>("/tokens"));
  }
  useEffect(() => {
    let active = true;
    setTokens([]);
    setValue("");
    if (user)
      api<Token[]>("/tokens")
        .then((items) => {
          if (active) setTokens(items);
        })
        .catch((e) => {
          if (active) notify(e.message, true);
        });
    return () => {
      active = false;
    };
  }, [user?.id]);
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost:3000";
  const configs: Record<
    string,
    { file: string; code: string; hint: string; docs: string }
  > = {
    codex: {
      file: "~/.codex/config.toml",
      code: `[mcp_servers.trove]\nurl = "${origin}/api/mcp"\nbearer_token_env_var = "TROVE_AGENT_TOKEN"`,
      hint: "Set TROVE_AGENT_TOKEN in the environment where you launch Codex.",
      docs: "https://developers.openai.com/codex/mcp",
    },
    claude: {
      file: ".mcp.json",
      code: JSON.stringify(
        {
          mcpServers: {
            trove: {
              type: "http",
              url: `${origin}/api/mcp`,
              headers: { Authorization: "Bearer ${TROVE_AGENT_TOKEN}" },
            },
          },
        },
        null,
        2,
      ),
      hint: "Set TROVE_AGENT_TOKEN in the environment where you launch Claude Code. This configuration contains no secret.",
      docs: "https://code.claude.com/docs/en/mcp",
    },
    desktop: {
      file: "claude_desktop_config.json",
      code: JSON.stringify(
        {
          mcpServers: {
            trove: {
              command: "/absolute/path/to/node",
              args: ["/absolute/path/to/Trove/scripts/mcp-bridge.mjs"],
              env: {
                TROVE_URL: origin,
                TROVE_AGENT_TOKEN: "PASTE_YOUR_TOKEN_HERE",
              },
            },
          },
        },
        null,
        2,
      ),
      hint: "Clone the Trove repository and run npm ci. Replace both absolute paths and the token in your private Claude Desktop configuration, then restart Claude. No database credentials are needed.",
      docs: "https://modelcontextprotocol.io/docs/develop/connect-local-servers",
    },
  };
  const config = configs[client];
  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopyState(key);
      setTimeout(() => setCopyState(""), 2000);
    } catch {
      notify(
        "Clipboard access is unavailable. Select and copy the text manually.",
        true,
      );
    }
  }
  async function create() {
    if (!(await ensureAuth())) return;
    setCreating(true);
    try {
      const token = await post<Token & { value: string }>("/tokens", {
        name,
        scopes: scope === "purchase" ? ["read", "purchase"] : ["read"],
      });
      setValue(token.value);
      await refresh();
    } catch (e) {
      notify((e as Error).message, true);
    } finally {
      setCreating(false);
    }
  }
  return (
    <div className="page-enter">
      <section className="page-heading compact-heading">
        <div>
          <h1>Connect your agent</h1>
          <p>Bring Trove’s data to Codex or Claude.</p>
        </div>
      </section>
      <div className="connect-layout">
        <div className="connect-main">
          <section className="panel setup-card token-setup">
            <div className="setup-heading">
              <span className="step-number">01</span>
              <div>
                <h2>Create an agent token</h2>
              </div>
            </div>
            <div className="token-list">
              {tokens.map((token) => (
                <div className="token-row" key={token.id}>
                  <span className="token-icon">
                    <KeyRound size={17} />
                  </span>
                  <div>
                    <strong>{token.name}</strong>
                    <small className="mono">
                      {token.prefix}•••• · {token.scopes.join(" + ")}
                    </small>
                  </div>
                  <Badge tone={token.revokedAt ? "neutral" : "green"}>
                    {token.revokedAt
                      ? "Revoked"
                      : new Date(token.expiresAt) < new Date()
                        ? "Expired"
                        : "Active"}
                  </Badge>
                  {!token.revokedAt && (
                    <button
                      className="icon-button"
                      aria-label={`Revoke ${token.name}`}
                      onClick={async () => {
                        try {
                          await api(`/tokens/${token.id}`, {
                            method: "DELETE",
                          });
                          await refresh();
                          notify("Token revoked.");
                        } catch (e) {
                          notify((e as Error).message, true);
                        }
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              className="button button-primary"
              onClick={async () => {
                if (await ensureAuth()) {
                  setValue("");
                  setShowCreate(true);
                }
              }}
            >
              <Plus size={15} />
              Create agent token
            </button>
          </section>
          <section className="panel setup-card client-setup">
            <div className="setup-heading">
              <span className="step-number">02</span>
              <div>
                <h2>Connect your client</h2>
              </div>
            </div>
            <label className="client-picker">
              Agent client
              <select
                value={client}
                onChange={(event) => setClient(event.target.value)}
              >
                <option value="codex">Codex</option>
                <option value="claude">Claude Code</option>
                <option value="desktop">Claude Desktop</option>
              </select>
            </label>
            <div className="code-block">
              <div>
                <span>{config.file}</span>
                <button
                  onClick={() => copy(config.code, "config")}
                  aria-label="Copy MCP configuration"
                >
                  {copyState === "config" ? (
                    <Check size={14} />
                  ) : (
                    <Copy size={14} />
                  )}{" "}
                  {copyState === "config" ? "Copied" : "Copy"}
                </button>
              </div>
              <pre>{config.code}</pre>
            </div>
            <p className="caption">{config.hint}</p>
            <ExternalLink href={config.docs}>Client setup guide</ExternalLink>
          </section>
          <section className="panel setup-card task-setup">
            <div className="setup-heading">
              <span className="step-number">03</span>
              <div>
                <h2>Give your agent a task</h2>
              </div>
            </div>
            <blockquote className="example-brief">
              “Find recent drug approvals and recall reasons. Keep the research
              under $10 and show me the price before I approve it.”
            </blockquote>
            <div className="policy-note">
              <ShieldCheck size={17} />
              <p>Purchases require your approval in a browser.</p>
            </div>
          </section>
          <details className="panel tool-reference">
            <summary>Available tools</summary>

            {toolDescriptions.map(([name, description]) => (
              <div className="tool-row" key={name}>
                <code>{name}</code>
                <span>{description}</span>
              </div>
            ))}
          </details>
        </div>
      </div>
      <Modal
        open={showCreate}
        onOpenChange={(open) => {
          setShowCreate(open);
          if (!open) setValue("");
        }}
        title={value ? "Your token is ready" : "Create an agent token"}
        description={
          value
            ? "Copy and save your token. It won’t be shown again."
            : "Choose the access your agent needs."
        }
      >
        {value ? (
          <div className="form-stack">
            <div className="secret-token">
              <code>{value}</code>
              <button
                className="icon-button"
                aria-label="Copy agent token"
                onClick={() => copy(value, "token")}
              >
                {copyState === "token" ? (
                  <Check size={16} />
                ) : (
                  <Copy size={16} />
                )}
              </button>
            </div>
            <Notice>
              Keep this token private. It expires in 30 days and can be revoked
              at any time.
            </Notice>
            <button
              className="button button-primary"
              onClick={() => {
                setShowCreate(false);
                setValue("");
              }}
            >
              I’ve saved my token
              <Check size={15} />
            </button>
          </div>
        ) : (
          <div className="form-stack">
            <label>
              Token name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
              />
            </label>
            <label>
              Allowed operations
              <select value={scope} onChange={(e) => setScope(e.target.value)}>
                <option value="purchase">Read + prepare purchases</option>
                <option value="read">Read only</option>
              </select>
            </label>
            <p className="caption">
              Preparing a purchase does not approve it. PayPal approval still
              requires the buyer.
            </p>
            <button
              className="button button-primary"
              disabled={!name.trim() || creating}
              onClick={create}
            >
              {creating ? "Creating…" : "Create token"}
              <KeyRound size={15} />
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
