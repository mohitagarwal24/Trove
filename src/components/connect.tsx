"use client";
import { useEffect, useState } from "react";
import {
  Cable,
  Check,
  CheckCheck,
  ChevronRight,
  Code2,
  Copy,
  ExternalLink as ExternalIcon,
  KeyRound,
  LockKeyhole,
  Plus,
  ShieldCheck,
  Terminal,
  Trash2,
} from "lucide-react";
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
  ["search_offers", "Search free offer metadata"],
  ["get_offer", "Inspect fields, price, preview & terms"],
  ["create_quote", "Create an immutable exact-price plan"],
  ["create_purchase", "Reserve budget & return approval URL"],
  ["get_purchase", "Check payment, delivery & settlement"],
  ["get_result", "Retrieve entitled data without recharging"],
  ["get_receipt", "Get checks, provenance & payment references"],
];
export function Connect() {
  const { user, capabilities, ensureAuth, notify } = useTrove();
  const [tokens, setTokens] = useState<Token[]>([]);
  const [name, setName] = useState("Codex research agent");
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [value, setValue] = useState("");
  const [copyState, setCopyState] = useState("");
  const [scope, setScope] = useState("purchase");
  async function refresh() {
    setTokens(await api<Token[]>("/tokens"));
  }
  useEffect(() => {
    if (user) refresh().catch((e) => notify(e.message, true));
  }, [user?.id]);
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost:3000";
  const config = `[mcp_servers.trove]\nurl = "${origin}/api/mcp"\nbearer_token_env_var = "TROVE_AGENT_TOKEN"`;
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
          <div className="section-eyebrow">
            <span className="eyebrow-line" />
            BUILT FOR YOUR EXISTING AGENT
          </div>
          <h1>
            Your workflow.
            <br />
            <span className="heading-soft">A world of better data.</span>
          </h1>
          <p>
            Connect through MCP. Keep the conversation where you already work.
          </p>
        </div>
        <span className="large-connect-icon">
          <Cable size={34} />
        </span>
      </section>
      <div className="connect-layout">
        <div className="connect-main">
          <section className="panel setup-card">
            <div className="setup-heading">
              <span className="step-number">01</span>
              <div>
                <h2>Create a scoped agent token</h2>
                <p>
                  Revocable access to this workspace. Payment approval stays in
                  your browser.
                </p>
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
                    {token.revokedAt ? "Revoked" : "Active"}
                  </Badge>
                  {!token.revokedAt && (
                    <button
                      className="icon-button"
                      aria-label={`Revoke ${token.name}`}
                      onClick={async () => {
                        await api(`/tokens/${token.id}`, { method: "DELETE" });
                        await refresh();
                        notify(
                          "Token revoked. Further requests will be denied.",
                        );
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
          <section className="panel setup-card">
            <div className="setup-heading">
              <span className="step-number">02</span>
              <div>
                <h2>Add Trove to Codex</h2>
                <p>
                  Set your token in the client environment, then add this MCP
                  configuration.
                </p>
              </div>
            </div>
            <div className="code-block">
              <div>
                <span>config.toml</span>
                <button
                  onClick={() => copy(config, "config")}
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
              <pre>{config}</pre>
            </div>
            <p className="caption">
              Set TROVE_AGENT_TOKEN outside your repository. Never commit a
              bearer token. The README also documents the local stdio transport.
            </p>
            <ExternalLink href="https://developers.openai.com/codex/mcp">
              Codex MCP setup
            </ExternalLink>
          </section>
          <section className="panel setup-card">
            <div className="setup-heading">
              <span className="step-number">03</span>
              <div>
                <h2>Give your agent a task</h2>
                <p>
                  Discover and compare first. Approve an exact purchase only
                  when it is useful.
                </p>
              </div>
            </div>
            <blockquote className="example-brief">
              “Find current product prices and supplier capabilities. Compare
              permitted sources, keep the task under $10, and show me the exact
              purchase plan before I approve it.”
            </blockquote>
            <div className="policy-note">
              <ShieldCheck size={17} />
              <p>
                Agents cannot approve payments, choose payout recipients, or
                alter server-enforced budgets. Each purchase returns a human
                approval URL.
              </p>
            </div>
          </section>
          <section className="panel tool-reference">
            <div className="panel-title">
              <Code2 size={18} />
              <h2>Seven bounded tools</h2>
              <Badge>MCP</Badge>
            </div>
            {toolDescriptions.map(([name, description]) => (
              <div className="tool-row" key={name}>
                <code>{name}</code>
                <span>{description}</span>
              </div>
            ))}
          </section>
        </div>
        <aside className="connect-aside">
          <section className="panel integration-card">
            <div className="panel-title">
              <span className="status-dot" />
              <h2>Integration readiness</h2>
            </div>
            <p>
              Configuration is separate from successful end-to-end verification.
            </p>
            {[
              {
                name: "PayPal Sandbox",
                on: capabilities.paypal,
                detail: "Exact approval, authorisation & capture",
              },
              {
                name: "Seller payouts",
                on: capabilities.payouts,
                detail: "Requires sandbox access, recipients & funds",
              },
              {
                name: "Gemini planner",
                on: capabilities.ai,
                detail: "Free-tier model · bounded structured output",
              },
              {
                name: "Elasticsearch",
                on: capabilities.elastic,
                detail: "Approved free offer metadata only",
              },
            ].map((item) => (
              <div className="integration-row" key={item.name}>
                <div>
                  <strong>{item.name}</strong>
                  <span>{item.detail}</span>
                </div>
                <Badge tone={item.on ? "blue" : "neutral"}>
                  {item.on ? "Configured" : "Not connected"}
                </Badge>
              </div>
            ))}
            <div className="integration-footer">
              <LockKeyhole size={14} />
              Credentials stay on the server.
            </div>
          </section>
          <section className="panel resources-card">
            <div className="section-eyebrow">IMPLEMENTATION RESOURCES</div>
            <h3>Built with the right context.</h3>
            <p>
              Official references and hackathon resources guide the integration.
            </p>
            <ExternalLink href="https://developer.paypal.com/dashboard/applications/sandbox">
              PayPal credentials
            </ExternalLink>
            <ExternalLink href="https://paypalaihackathon.devpost.com/details/apimatic">
              APIMatic Context Plugin
            </ExternalLink>
            <ExternalLink href="https://paypalaihackathon.devpost.com/details/elastic">
              Elastic hackathon resources
            </ExternalLink>
            <ExternalLink href="https://paypalaihackathon.devpost.com/details/render">
              Render deployment resources
            </ExternalLink>
            <ExternalLink href="https://www.postman.com/paypal">
              PayPal Postman workspace
            </ExternalLink>
          </section>
          <div className="connection-note">
            <Terminal size={20} />
            <p>
              Try the browser research workspace before connecting an external
              client. Both use the same quote and purchase services.
            </p>
          </div>
        </aside>
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
            ? "Copy this token now. Trove stores only a hash and cannot show it again."
            : "Choose a name and the smallest useful scope."
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
