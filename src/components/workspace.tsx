"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  CheckCheck,
  Clock3,
  FileCheck2,
  ListFilter,
  Play,
  Plus,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { api, post } from "@/lib/client";
import { examplePrompts } from "@/lib/examples";
import type { QuoteView, Task, PurchaseView } from "@/lib/types";
import { money } from "@/lib/types";
import { useTrove } from "./trove-app";
import { Badge, EmptyState, Notice, Status } from "./ui";
import { QuoteReview } from "./quote-review";
export function Workspace() {
  const { user, capabilities, ensureAuth, notify, offers } = useTrove();
  const [prompt, setPrompt] = useState(examplePrompts[0]);
  const [budget, setBudget] = useState("10.00");
  const [mode, setMode] = useState<"demo" | "live">(
    capabilities.ai ? "live" : "demo",
  );
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
    if (!user) return;
    api<PurchaseView[]>("/purchases")
      .then(setPurchases)
      .catch(() => {});
    const id = sessionStorage.getItem("trove-task-id");
    if (id && !task)
      api<Task>(`/tasks/${id}`)
        .then(setTask)
        .catch(() => sessionStorage.removeItem("trove-task-id"));
  }, [user]);
  async function run() {
    try {
      if (!(await ensureAuth())) return;
      setRunning(true);
      const result = await post<{ task: Task; quote: QuoteView | null }>(
        "/tasks",
        { prompt, budgetCents: Math.round(Number(budget) * 100), mode },
      );
      setTask(result.task);
      setQuote(result.quote);
      sessionStorage.setItem("trove-task-id", result.task.id);
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
          <div className="section-eyebrow">
            <span className="eyebrow-line" />
            RESEARCH WORKSPACE
          </div>
          <h1>
            From a question
            <br />
            <span className="heading-soft">to a better answer.</span>
          </h1>
          <p>
            A focused task, the right sources, and a spending limit you control.
          </p>
        </div>
        <Badge tone={mode === "live" ? "green" : "amber"}>
          {mode === "live" ? "Live AI planner" : "Deterministic guided demo"}
        </Badge>
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
                Example {i + 1}
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
            <label>
              Research mode
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as "demo" | "live")}
              >
                <option value="demo">Guided demo</option>
                <option value="live" disabled={!capabilities.ai}>
                  Live AI {capabilities.ai ? "" : "(not connected)"}
                </option>
              </select>
            </label>
          </div>
          <div className="policy-note">
            <ShieldCheck size={16} />
            <p>
              This is a task allowance, not a payment. You approve each exact
              purchase separately.
            </p>
          </div>
          <button
            className="button button-primary research-submit"
            onClick={run}
            disabled={
              running ||
              prompt.trim().length < 10 ||
              !Number.isFinite(Number(budget))
            }
          >
            {running ? (
              <span className="button-spinner" />
            ) : (
              <Sparkles size={16} />
            )}{" "}
            {running
              ? "Comparing permitted sources…"
              : mode === "live"
                ? "Find sources with the agent"
                : "Run guided research"}
            <ArrowRight size={16} />
          </button>
          {mode === "demo" && (
            <p className="caption">
              A reproducible, rules-based walkthrough. This mode does not call
              an AI model.
            </p>
          )}
        </section>
        <section className="task-output">
          {!task && !running ? (
            <div className="workspace-welcome">
              <div className="orbit-illustration" aria-hidden="true">
                <div className="orbit-ring orbit-one" />
                <div className="orbit-ring orbit-two" />
                <div className="orbit-center">
                  <LayersMark />
                </div>
                <span className="orbit-node node-one">
                  <ListFilter size={18} />
                </span>
                <span className="orbit-node node-two">
                  <ShieldCheck size={18} />
                </span>
                <span className="orbit-node node-three">
                  <FileCheck2 size={18} />
                </span>
              </div>
              <h2>
                Good research starts
                <br />
                with the right questions.
              </h2>
              <p>
                Describe your task. Trove will compare eligible offers, explain
                the trade-offs, and prepare an exact purchase plan.
              </p>
              <div className="welcome-steps">
                <span>
                  <b>01</b>Discover
                </span>
                <span>
                  <b>02</b>Compare
                </span>
                <span>
                  <b>03</b>Approve
                </span>
                <span>
                  <b>04</b>Receive
                </span>
              </div>
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
              ].map((t, i) => (
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
                    <span className="section-eyebrow">TASK ALLOWANCE</span>
                    <Badge>
                      {task.planner === "gemini" ? "Live AI" : "Guided demo"}
                    </Badge>
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
                  <p className="panel-subtitle">
                    Concrete trade-offs, before any money moves.
                  </p>
                  <div className="source-decision-list">
                    {task.decisions.map((d) => (
                      <div
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
                            {p.mode === "simulation"
                              ? "Simulation"
                              : "PayPal Sandbox"}
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
function LayersMark() {
  return (
    <svg width="35" height="38" viewBox="0 0 32 32" fill="none">
      <path d="m16 2 13 7.5L16 17 3 9.5 13-7.5Z" fill="currentColor" />
      <path
        d="m3 15 13 7.5L29 15v7.5L16 30 3 22.5V15Z"
        fill="currentColor"
        opacity=".7"
      />
    </svg>
  );
}
