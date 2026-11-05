"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Cable, FileText, Clock3 } from "lucide-react";
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
          <h1>Welcome, {user?.name.split(" ")[0]}.</h1>
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
                  {connected ? "Agent connected" : "Work from your agent"}
                </h2>
              </div>
              <Link href="/connect" className="text-link">
                {connected ? "Manage connections" : "Connect an agent"}{" "}
                <ArrowUpRight size={16} />
              </Link>
            </aside>
          </div>
          {!!(tasks.length || available.length) && (
            <div className="dashboard-columns">
              {!!tasks.length && (
                <section className="dashboard-section">
                  <div className="dashboard-section-heading">
                    <h2>Recent research</h2>
                    <Link href="/workspace">
                      Open workspace <ArrowUpRight size={14} />
                    </Link>
                  </div>
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
                </section>
              )}
              {!!available.length && (
                <section className="dashboard-section">
                  <div className="dashboard-section-heading">
                    <h2>Your data</h2>
                    <Link href="/purchases?view=data">
                      Open library <ArrowUpRight size={14} />
                    </Link>
                  </div>
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
                </section>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
