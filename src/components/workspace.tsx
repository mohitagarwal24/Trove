"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  FileCheck2,
  ListFilter,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { api, post } from "@/lib/client";
import { examplePrompts } from "@/lib/examples";
import type { QuoteView, Task, PurchaseView } from "@/lib/types";
import { money } from "@/lib/types";
import { useTrove } from "./trove-app";
import { Badge, Notice, Status } from "./ui";
import { QuoteReview } from "./quote-review";
export function Workspace() {
  const { user, capabilities, ensureAuth, notify, offers } = useTrove();
  const [prompt, setPrompt] = useState(examplePrompts[0]);
  const [budget, setBudget] = useState("10.00");
  const [running, setRunning] = useState(false);
  const [task, setTask] = useState<Task | null>(null);
  const [quote, setQuote] = useState<QuoteView | null>(null);
  const [review, setReview] = useState(false);
  const [purchases, setPurchases] = useState<PurchaseView[]>([]);
  useEffect(() => {
    const saved = sessionStorage.getItem("trove-prompt");
    if (saved) {
      setPrompt(saved);
      sessionStorage.removeItem("trove-prompt");
    }
  }, []);
  useEffect(() => {
    let active = true;
    setTask(null);
    setQuote(null);
    setReview(false);
    setPurchases([]);
    if (!user) return;
    const key = `trove-task:${user.workspaceId}`;
    api<PurchaseView[]>("/purchases")
      .then((items) => {
        if (active) setPurchases(items);
      })
      .catch(() => {});
    const id = sessionStorage.getItem(key);
    if (id)
      api<Task>(`/tasks/${id}`)
        .then((item) => {
          if (active) setTask(item);
        })
        .catch(() => sessionStorage.removeItem(key));
    return () => {
      active = false;
    };
  }, [user?.workspaceId]);
  async function run() {
    try {
      if (!(await ensureAuth())) return;
      setRunning(true);
      const result = await post<{ task: Task; quote: QuoteView | null }>(
        "/tasks",
        { prompt, budgetCents: Math.round(Number(budget) * 100) },
      );
      setTask(result.task);
      setQuote(result.quote);
      if (user)
        sessionStorage.setItem(
          `trove-task:${user.workspaceId}`,
          result.task.id,
        );
      if (!result.quote)
        notify(
          "No permitted offer meets these requirements within budget. Nothing was purchased.",
        );
    } catch (e) {
      notify((e as Error).message, true);
    } finally {
      setRunning(false);
    }
  }
  async function requote() {
    if (!task) return;
    try {
      const selected = task.decisions
        .filter((d) => d.selected)
        .map((d) => d.offerId);
      const q = await post<QuoteView>("/quotes", {
        offerIds: selected,
        taskId: task.id,
      });
      setQuote(q);
      setReview(true);
    } catch (e) {
      notify((e as Error).message, true);
    }
  }
  const taskPurchases = purchases.filter((p) => p.taskId === task?.id);
  return (
    <div className="page-enter">
      <section className="page-heading compact-heading">
        <div>
          <h1>Research workspace</h1>
          <p>Describe your research. Set a budget. Review the sources.</p>
        </div>
      </section>
      <div className="workspace-layout">
        <section className="task-composer panel">
          <div className="panel-title">
            <span className="sparkle-box">
              <Sparkles size={17} />
            </span>
            <h2>Your research brief</h2>
          </div>
          <label htmlFor="task-prompt">What would you like to find out?</label>
          <textarea
            id="task-prompt"
            rows={7}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the information you need…"
          />
          <div className="composer-examples">
            {examplePrompts.map((p, i) => (
              <button key={i} onClick={() => setPrompt(p)}>
                {["Approvals", "Drug recalls", "Device recalls"][i]}
                <ArrowRight size={11} />
              </button>
            ))}
          </div>
          <div className="form-row">
            <label>
              Task spending limit
              <div className="money-input">
                <span>$</span>
                <input
                  type="number"
                  min="0.50"
                  max="1000"
                  step="0.50"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                />
                <span>USD</span>
              </div>
            </label>
          </div>
          <div className="policy-note">
            <ShieldCheck size={16} />
            <p>You approve each purchase before payment.</p>
          </div>
          <button
            className="button button-primary research-submit"
            onClick={run}
            disabled={
              running ||
              prompt.trim().length < 10 ||
              !capabilities.ai ||
              !Number.isFinite(Number(budget)) ||
              Number(budget) < 0.5 ||
              Number(budget) > 1000
            }
          >
            {running ? (
              <span className="button-spinner" />
            ) : (
              <Sparkles size={16} />
            )}{" "}
            {running ? "Comparing permitted sources…" : "Find sources"}
            <ArrowRight size={16} />
          </button>
          {!capabilities.ai && (
            <p className="caption">
              Research is currently unavailable. You can still{" "}
              <Link href="/">browse and compare sources</Link>.
            </p>
          )}
        </section>
        <section className="task-output">
          {!task && !running ? (
            <div className="workspace-welcome">
              <ListFilter size={28} aria-hidden="true" />
              <h2>Your source shortlist</h2>
              <p>Run a brief to compare matching data and prices.</p>
            </div>
          ) : running ? (
            <div className="planning-state panel">
              <Sparkles className="pulse" size={28} />
              <h2>Finding a suitable path.</h2>
              <p>
                Checking available fields, declared freshness, licences, and
                prices.
              </p>
              {[
                "Interpreting the research brief",
                "Checking permitted sources",
                "Calculating a bounded quote",
              ].map((t) => (
                <div className="planning-step" key={t}>
                  <span className="button-spinner" />
                  {t}
                </div>
              ))}
            </div>
          ) : (
            task && (
              <>
                <div className="task-budget panel">
                  <div className="task-budget-header">
                    <h2>Task allowance</h2>
                    <Badge>AI research</Badge>
                  </div>
                  <div className="budget-figures">
                    <div>
                      <span>Available</span>
                      <strong>
                        {money(
                          task.budgetCents -
                            task.spentCents -
                            task.reservedCents,
                        )}
                      </strong>
                    </div>
                    <div>
                      <span>Reserved</span>
                      <strong>{money(task.reservedCents)}</strong>
                    </div>
                    <div>
                      <span>Charged</span>
                      <strong>{money(task.spentCents)}</strong>
                    </div>
                  </div>
                  <div className="budget-track">
                    <span
                      style={{
                        width: `${Math.min(100, (task.spentCents / task.budgetCents) * 100)}%`,
                      }}
                    />
                    <span
                      className="reserved-track"
                      style={{
                        width: `${Math.min(100, (task.reservedCents / task.budgetCents) * 100)}%`,
                      }}
                    />
                  </div>
                  <p>{money(task.budgetCents)} limit · Fees included · USD</p>
                </div>
                <div className="panel source-decisions">
                  <div className="panel-title">
                    <ListFilter size={18} />
                    <h2>Source comparison</h2>
                    <span className="count-pill">{task.decisions.length}</span>
                  </div>
                  <div className="source-decision-list">
                    {task.decisions.map((d) => (
                      <div
                        data-reveal
                        className={`source-decision ${d.selected ? "decision-selected" : ""}`}
                        key={d.offerId}
                      >
                        <span className="decision-icon">
                          {d.selected ? <Check size={15} /> : <X size={14} />}
                        </span>
                        <div>
                          <strong>{d.title}</strong>
                          <p>{d.reason}</p>
                        </div>
                        <span className="decision-price">
                          {money(
                            offers.find((o) => o.id === d.offerId)
                              ?.priceCents || 0,
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                  {task.decisions.some((d) => d.selected) ? (
                    <div className="decision-summary">
                      <div>
                        <span>
                          {task.decisions.filter((d) => d.selected).length}{" "}
                          suitable sources
                        </span>
                        <strong>
                          {quote
                            ? money(quote.totalCents)
                            : "Exact quote available"}
                        </strong>
                      </div>
                      <button
                        className="button button-primary"
                        onClick={() =>
                          quote && new Date(quote.expiresAt) > new Date()
                            ? setReview(true)
                            : requote()
                        }
                      >
                        Review purchase plan
                        <ArrowRight size={16} />
                      </button>
                    </div>
                  ) : (
                    <Notice>
                      No suitable purchase is available. Adjust the scope,
                      permitted use, or spending limit and run a new task.
                    </Notice>
                  )}
                </div>
                {taskPurchases.length > 0 && (
                  <div className="panel">
                    <div className="panel-title">
                      <FileCheck2 size={18} />
                      <h2>Purchase activity</h2>
                    </div>
                    {taskPurchases.map((p) => (
                      <Link
                        href={`/purchases/${p.id}`}
                        key={p.id}
                        className="activity-link"
                      >
                        <div>
                          <strong>
                            {p.quote.lines
                              .map((l) => l.snapshot.title)
                              .join(" + ")}
                          </strong>
                          <span>
                            {money(p.quote.totalCents)} ·{" "}
                            {p.mode === "live" ? "PayPal" : "Sandbox"}
                          </span>
                        </div>
                        <Status value={p.paymentState} />
                        <ArrowRight size={15} />
                      </Link>
                    ))}
                  </div>
                )}
              </>
            )
          )}
        </section>
      </div>
      <QuoteReview
        quote={review ? quote : null}
        onClose={() => setReview(false)}
      />
    </div>
  );
}
