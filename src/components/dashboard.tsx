"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  ArrowRight,
  Cable,
  FileText,
  Search,
  Clock3,
} from "lucide-react";
import { useTrove } from "./trove-context";
import { api } from "@/lib/client";
import type { Task, PurchaseView } from "@/lib/types";
import { Loading, Notice, Status } from "./ui";
import { ResearchStarts } from "./research-starts";
export function Dashboard() {
  const { user } = useTrove();
  const [tasks, setTasks] = useState<Task[]>([]),
    [purchases, setPurchases] = useState<PurchaseView[]>([]),
    [connected, setConnected] = useState<boolean | null>(null),
    [busy, setBusy] = useState(true),
    [error, setError] = useState("");
  useEffect(() => {
    if (!user) return;
    const controller = new AbortController();
    Promise.all([
      api<Task[]>("/tasks", { signal: controller.signal }),
      api<PurchaseView[]>("/purchases", { signal: controller.signal }),
      api<{ revokedAt: string | null; expiresAt: string }[]>("/tokens", {
        signal: controller.signal,
      }),
      api<{ revokedAt: string | null; expiresAt: string }[]>("/connections", {
        signal: controller.signal,
      }),
    ])
      .then(([tasks, purchases, tokens, connections]) => {
        setTasks(tasks);
        setPurchases(purchases);
        setConnected(
          [...tokens, ...connections].some(
            (t) => !t.revokedAt && new Date(t.expiresAt) > new Date(),
          ),
        );
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });
    return () => controller.abort();
  }, [user?.workspaceId, user]);
  const attention = purchases.filter((p) =>
    [
      "created",
      "awaiting_approval",
      "authorized",
      "capture_pending",
      "reconciliation_required",
      "void_pending",
    ].includes(p.paymentState),
  );
  const available = purchases.filter(
    (p) =>
      p.paymentState === "captured" &&
      p.fulfilmentState === "available" &&
      !p.entitlement?.revokedAt,
  );
  return (
    <div className="dashboard-page page-enter">
      <header className="page-heading">
        <div>
          <h1>Overview</h1>
          <p>Welcome back, {user?.name.split(" ")[0]}.</p>
        </div>
        <Link href="/workspace" className="button button-primary">
          Start research <ArrowUpRight size={17} />
        </Link>
      </header>
      {error ? (
        <Notice kind="error">
          {error}{" "}
          <button className="text-button" onClick={() => location.reload()}>
            Try again
          </button>
        </Notice>
      ) : busy ? (
        <Loading />
      ) : (
        <>
          {!!attention.length && (
            <section className="dashboard-attention">
              <div>
                <Clock3 size={19} />
                <h2>Needs your attention</h2>
                <span>{attention.length}</span>
              </div>
              {attention.slice(0, 3).map((p) => (
                <Link key={p.id} href={`/purchases/${p.id}`}>
                  <span>
                    {p.quote.lines[0]?.snapshot.title || "Data purchase"}
                  </span>
                  <Status value={p.paymentState} />
                  <ArrowUpRight size={16} />
                </Link>
              ))}
            </section>
          )}
          <div className="dashboard-entry">
            <section className="dashboard-start">
              <div className="dashboard-section-heading">
                <h2>
                  {tasks.length
                    ? "Start something new"
                    : "What are you researching?"}
                </h2>
                <Link href="/discover">
                  Browse sources <ArrowUpRight size={14} />
                </Link>
              </div>
              <ResearchStarts />
            </section>
            <aside className="dashboard-agent">
              <Cable size={24} strokeWidth={1.5} />
              <div>
                <h2>
                  {connected
                    ? "Your agent is connected."
                    : "Your agent, with better context."}
                </h2>
                <p>
                  {connected
                    ? "Manage access to your Trove workspace."
                    : "Connect ChatGPT, Claude or Codex with your Trove account."}
                </p>
              </div>
              <Link href="/connect" className="button button-secondary">
                {connected ? "Manage connections" : "Connect an agent"}{" "}
                <ArrowUpRight size={16} />
              </Link>
            </aside>
          </div>
          <div className="dashboard-columns">
            <section className="dashboard-section">
              <div className="dashboard-section-heading">
                <h2>Recent research</h2>
                <Link href="/workspace">
                  Open workspace <ArrowUpRight size={14} />
                </Link>
              </div>
              {tasks.length ? (
                <div className="dashboard-list">
                  {tasks.slice(0, 5).map((t) => (
                    <Link
                      href={`/workspace?task=${encodeURIComponent(t.id)}`}
                      key={t.id}
                    >
                      <FileText size={19} />
                      <span>
                        <strong>{t.prompt}</strong>
                        <small>
                          {new Date(t.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}{" "}
                          · {t.decisions.filter((d) => d.selected).length}{" "}
                          sources shortlisted
                        </small>
                      </span>
                      <ArrowUpRight size={16} />
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="dashboard-empty">
                  <Search size={27} strokeWidth={1.4} />
                  <h3>No research yet.</h3>
                  <p>
                    Choose a starting point above to build your first shortlist.
                  </p>
                  <Link href="/workspace" className="text-link">
                    Start research <ArrowRight size={14} />
                  </Link>
                </div>
              )}
            </section>
            <section className="dashboard-section">
              <div className="dashboard-section-heading">
                <h2>Your data</h2>
                <Link href="/purchases">
                  All purchases <ArrowUpRight size={14} />
                </Link>
              </div>
              {available.length ? (
                <div className="dashboard-list">
                  {available.slice(0, 4).map((p) => (
                    <Link href={`/purchases/${p.id}`} key={p.id}>
                      <FileText size={19} />
                      <span>
                        <strong>
                          {p.quote.lines
                            .map((l) => l.snapshot.title)
                            .join(", ")}
                        </strong>
                        <small>
                          Purchased{" "}
                          {new Date(p.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </small>
                      </span>
                      <ArrowUpRight size={16} />
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="dashboard-empty">
                  <FileText size={27} strokeWidth={1.4} />
                  <h3>No purchased data yet.</h3>
                  <p>Purchased data and receipts appear here.</p>
                  <Link href="/discover" className="text-link">
                    Explore sources <ArrowRight size={14} />
                  </Link>
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
