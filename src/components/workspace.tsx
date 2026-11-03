"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
import { useTrove } from "./trove-context";
import { Badge, Notice, Status } from "./ui";
import { QuoteReview } from "./quote-review";
import {
  ResearchRequirements,
  initialRequirements,
} from "./research-requirements";
import { taskRequirementsSchema, requirementsKey } from "@/lib/research";
import { requirementsForStart } from "@/lib/research-starts";
import { ResearchStarts } from "./research-starts";
export function Workspace() {
  const params = useSearchParams();
  const router = useRouter();
  const requestedTask = params.get("task");
  const requestedStart = params.get("start");
  const requestedFrom =
    !requestedTask && !requestedStart ? params.get("from") : null;
  const [copiedScope, setCopiedScope] = useState(false);
  const [resumeError, setResumeError] = useState("");
  const { user, capabilities, ensureAuth, notify, offers } = useTrove();
  const [prompt, setPrompt] = useState(examplePrompts[0]);
  const [mode, setMode] = useState<"brief" | "requirements">("requirements");
  const [requirements, setRequirements] = useState(initialRequirements);
  const [researchError, setResearchError] = useState("");
  const [budget, setBudget] = useState("10.00");
  const [running, setRunning] = useState(false);
  const [task, setTask] = useState<Task | null>(null);
  const [quote, setQuote] = useState<QuoteView | null>(null);
  const [review, setReview] = useState(false);
  const [purchases, setPurchases] = useState<PurchaseView[]>([]);
  useEffect(() => {
    let active = true;
    setTask(null);
    setQuote(null);
    setReview(false);
    setPurchases([]);
    setResumeError("");
    setCopiedScope(false);
    const start = !requestedTask && requirementsForStart(requestedStart);
    if (start) {
      setMode("requirements");
      setRequirements(start);
      setResearchError("");
      return;
    }
    if (!user) return;
    const key = `trove-task:${user.workspaceId}`;
    api<PurchaseView[]>("/purchases")
      .then((items) => {
        if (active) setPurchases(items);
      })
      .catch(() => {});
    const id = requestedTask || requestedFrom || sessionStorage.getItem(key);
    setResumeError("");
    if (id)
      api<Task>(`/tasks/${id}`)
        .then((item) => {
          if (active) {
            if (requestedFrom) {
              setCopiedScope(true);
              setTask(null);
              setPrompt(item.prompt);
              setBudget((item.budgetCents / 100).toFixed(2));
              if (item.requirements.needs) {
                setMode("requirements");
                setRequirements({
                  needs: item.requirements.needs,
                  purpose: item.requirements
                    .purpose as typeof requirements.purpose,
                });
              } else setMode("brief");
              return;
            }
            setTask(item);
            setPrompt(item.prompt);
            if (item.planner !== "gemini" && item.requirements.needs) {
              setMode("requirements");
              setRequirements({
                needs: item.requirements.needs,
                purpose: item.requirements
                  .purpose as typeof requirements.purpose,
              });
            }
            setBudget((item.budgetCents / 100).toFixed(2));
            if (requestedTask) sessionStorage.setItem(key, item.id);
          }
        })
        .catch(() => {
          if (!requestedFrom) sessionStorage.removeItem(key);
          setResumeError(
            "This research is unavailable or belongs to another workspace.",
          );
        });
    return () => {
      active = false;
    };
  }, [user?.workspaceId, requestedTask, requestedStart, requestedFrom]);
  async function run() {
    try {
      if (!(await ensureAuth())) return;
      setRunning(true);
      setResearchError("");
      const result = await post<{ task: Task; quote: QuoteView | null }>(
        "/tasks",
        {
          prompt:
            mode === "brief"
              ? prompt
              : `${requirements.needs.map((n) => n.category).join(" and ")} · ${requirements.needs[0]?.quantity} records per category`,
          budgetCents: Math.round(Number(budget) * 100),
          ...(mode === "requirements" ? { requirements } : {}),
        },
      );
      setTask(result.task);
      setQuote(result.quote);
      if (user)
        sessionStorage.setItem(
          `trove-task:${user.workspaceId}`,
          result.task.id,
        );
    } catch (e) {
      setResearchError((e as Error).message);
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
  const scopeChanged =
    !!task &&
    (Math.round(Number(budget) * 100) !== task.budgetCents ||
      (mode === "brief"
        ? prompt.trim() !== task.prompt.trim()
        : !!task.requirements.needs &&
          requirementsKey(requirements) !==
            requirementsKey({
              needs: task.requirements.needs,
              purpose: task.requirements.purpose,
            })));
  const summary = task?.requirements.discovery;
  const decisionPrice = (decision: Task["decisions"][number]) => {
    const cents =
      decision.priceCents ??
      offers.find((o) => o.id === decision.offerId)?.priceCents;
    return cents == null ? "Quote required" : money(cents);
  };
  const taskPurchases = purchases.filter((p) => p.taskId === task?.id);
  return (
    <div className="page-enter">
      <section className="page-heading compact-heading workspace-heading">
        <div>
          <h1>Research workspace</h1>
          <p>Define the scope. Find sources that fit.</p>
        </div>
        {task && (
          <Link
            className="button button-secondary"
            href={`/workspace?from=${task.id}`}
          >
            Reuse scope <ArrowRight size={15} />
          </Link>
        )}
      </section>
      {copiedScope && (
        <Notice>
          Requirements copied. Edit them and find sources to start new research.
        </Notice>
      )}
      {resumeError && <Notice kind="error">{resumeError}</Notice>}
      <div className="workspace-layout">
        <section
          className="task-composer panel"
          id="research-composer"
          tabIndex={-1}
        >
          <div className="panel-title">
            <span className="sparkle-box">
              <Sparkles size={17} />
            </span>
            <h2>
              {mode === "brief"
                ? "Your research brief"
                : "Your data requirements"}
            </h2>
          </div>
          <div
            className="research-mode"
            role="group"
            aria-label="Research input"
          >
            <button
              aria-pressed={mode === "requirements"}
              onClick={() => {
                setMode("requirements");
                setResearchError("");
              }}
            >
              Choose requirements
            </button>
            <button
              aria-pressed={mode === "brief"}
              disabled={!capabilities.ai}
              onClick={() => {
                setMode("brief");
                setResearchError("");
              }}
            >
              Describe a brief
            </button>
          </div>
          {mode === "requirements" ? (
            <ResearchRequirements
              value={requirements}
              onChange={setRequirements}
            />
          ) : (
            <>
              <label htmlFor="task-prompt">
                What would you like to find out?
              </label>
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
            </>
          )}
          <div className="form-row">
            <label>
              Task spending limit
              <div className="money-input">
                <span>$</span>
                <input
                  id="task-budget"
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
            <p>
              This is a limit, not a balance. Pay with PayPal when you approve a
              purchase.
            </p>
          </div>
          {researchError && (
            <Notice kind="error">
              {researchError}
              {mode === "brief" && (
                <button
                  className="text-link"
                  onClick={() => setMode("requirements")}
                >
                  Choose requirements to continue <ArrowRight size={14} />
                </button>
              )}
            </Notice>
          )}
          <button
            className="button button-primary research-submit"
            onClick={run}
            disabled={
              running ||
              (mode === "brief"
                ? prompt.trim().length < 10 || !capabilities.ai
                : !taskRequirementsSchema.safeParse(requirements).success) ||
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
        </section>
        <section className="task-output">
          {!task && !running ? (
            <div className="workspace-welcome">
              <ListFilter size={28} aria-hidden="true" />
              <h2>Your next question starts here.</h2>
              <p>Set your requirements, or choose a starting point.</p>
              <ResearchStarts
                onChoose={(id) => {
                  const next = requirementsForStart(id);
                  if (!next) return;
                  setRequirements(next);
                  setMode("requirements");
                  setResearchError("");
                  router.replace(`/workspace?start=${id}`, { scroll: false });
                  document.getElementById("research-composer")?.focus();
                }}
              />
              <p className="workspace-welcome-note">
                You review every source and price before purchasing.
              </p>
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
                mode === "brief"
                  ? "Interpreting the research brief"
                  : "Reading your requirements",
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
                    <h2>Spending cap</h2>
                    <Badge>
                      {task.planner === "gemini"
                        ? "AI research"
                        : "Source search"}
                    </Badge>
                  </div>
                  <div className="budget-figures">
                    <div>
                      <span>Remaining cap</span>
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
                  {scopeChanged && (
                    <Notice>
                      Requirements changed. Find sources again to refresh this
                      comparison.
                    </Notice>
                  )}
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
                          <p>{d.reason.replaceAll("_", " ")}</p>
                          {d.requestedRecords !== undefined && (
                            <p className="decision-coverage">
                              {d.availabilityChecked
                                ? `${d.requestedRecords} requested · ${d.availableRecords} available`
                                : "Availability not checked"}{" "}
                              ·{" "}
                              {d.requiredFields!.length -
                                (d.missingFields?.length || 0)}
                              /{d.requiredFields!.length} required fields
                              {d.acquisition === "owned" &&
                                " · Already purchased"}
                            </p>
                          )}
                          {!!d.requiredFields?.length && (
                            <details className="decision-fields">
                              <summary>Scope details</summary>
                              <p>
                                {d.requiredFields
                                  .map((f) => f.replaceAll("_", " "))
                                  .join(" · ")}
                              </p>
                              {d.freshnessAt && (
                                <p>
                                  Source snapshot:{" "}
                                  {new Date(d.freshnessAt).toLocaleDateString(
                                    "en-US",
                                  )}
                                </p>
                              )}
                            </details>
                          )}
                        </div>
                        <span className="decision-price">
                          {decisionPrice(d)}
                        </span>
                      </div>
                    ))}
                  </div>
                  {task.decisions.some((d) => d.selected) ? (
                    <div className="decision-summary">
                      <div>
                        <span>
                          {task.decisions.filter((d) => d.selected).length}{" "}
                          suitable{" "}
                          {task.decisions.filter((d) => d.selected).length === 1
                            ? "source"
                            : "sources"}
                        </span>
                        <strong>
                          {quote
                            ? money(quote.totalCents)
                            : summary?.minimumCompleteTotalCents != null
                              ? money(summary.minimumCompleteTotalCents)
                              : "Review price"}
                        </strong>
                      </div>
                      <button
                        className="button button-primary"
                        disabled={scopeChanged || running}
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
                    <div className="discovery-gaps">
                      {summary?.gaps.length ? (
                        summary.gaps.map((gap) => (
                          <Notice key={`${gap.category}:${gap.code}`}>
                            {gap.message}
                          </Notice>
                        ))
                      ) : (
                        <Notice>
                          No suitable purchase is available. Adjust the scope,
                          permitted use, or spending limit and run a new task.
                        </Notice>
                      )}
                      {summary?.minimumCompleteTotalCents != null &&
                        summary.minimumCompleteTotalCents >
                          task.budgetCents && (
                          <button
                            className="button button-secondary"
                            onClick={() => {
                              setBudget(
                                (
                                  summary.minimumCompleteTotalCents! / 100
                                ).toFixed(2),
                              );
                              document.getElementById("task-budget")?.focus();
                            }}
                          >
                            Set limit to{" "}
                            {money(summary.minimumCompleteTotalCents)}
                          </button>
                        )}
                    </div>
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
