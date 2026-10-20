"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ShieldCheck, Check } from "lucide-react";
import { Logo, Notice } from "./ui";
import { post } from "@/lib/client";
type Connection = {
  name: string;
  redirectUri: string;
  email: string;
  userId: string;
  scopes: string[];
  request: Record<string, string | undefined>;
};
export function AuthorizeConnection({
  connection,
  error: initialError,
}: {
  connection?: Connection;
  error?: string;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(initialError || "");
  async function decide(allow: boolean) {
    if (!connection) return;
    setBusy(true);
    setError("");
    try {
      const result = await post<{ redirectTo: string }>("/oauth/authorize", {
        request: connection.request,
        allow,
        userId: connection.userId,
      });
      window.location.assign(result.redirectTo);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <main className="authorization-page">
      <div className="authorization-content">
        <Link href="/" aria-label="Trove home">
          <Logo />
        </Link>
        <section className="panel authorization-card">
          <ShieldCheck size={30} aria-hidden="true" />
          <h1>
            {connection
              ? `Connect ${connection.name}?`
              : "Connection unavailable"}
          </h1>
          {error && <Notice kind="error">{error}</Notice>}
          {connection ? (
            <>
              <p>
                Signed in as <strong>{connection.email}</strong>.
              </p>
              <ul className="connection-permissions">
                <li>
                  <Check size={17} /> Search sources and access your purchased
                  data
                </li>
                {connection.scopes.includes("purchase") && (
                  <li>
                    <Check size={17} /> Create quotes and request purchases for
                    your approval
                  </li>
                )}
                {connection.scopes.includes("offline_access") && (
                  <li>
                    <Check size={17} /> Stay connected for up to 30 days
                  </li>
                )}
              </ul>
              <div className="policy-note">
                <ShieldCheck size={17} />
                <p>
                  You approve each payment in Trove. This connection cannot
                  approve or capture payments.
                </p>
              </div>
              <p className="caption connection-destination">
                App name provided by the client. You will return to{" "}
                <strong>{new URL(connection.redirectUri).host}</strong>.
              </p>
              <div className="authorization-actions">
                <button
                  className="button button-ghost"
                  disabled={busy}
                  onClick={() => decide(false)}
                >
                  Cancel
                </button>
                <button
                  className="button button-primary"
                  disabled={busy}
                  onClick={() => decide(true)}
                >
                  {busy ? "Connecting…" : "Allow connection"}
                  <ArrowRight size={16} />
                </button>
              </div>
              <p className="caption">
                You can disconnect this app in Connect your agent.
              </p>
            </>
          ) : (
            <Link className="button button-primary" href="/connect">
              Back to connections
            </Link>
          )}
        </section>
      </div>
    </main>
  );
}
