"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Check,
  FileCheck2,
  ListFilter,
  Sparkles,
  X,
} from "lucide-react";
import { api, post } from "@/lib/client";
import { examplePrompts } from "@/lib/examples";
import type { Offer, QuoteView, Task, PurchaseView } from "@/lib/types";
import { money } from "@/lib/types";
import { useTrove } from "./trove-context";
import { Notice, Status } from "./ui";
import { QuoteReview } from "./quote-review";
import { OfferDetail } from "./discover";
import {
  ResearchRequirements,
  initialRequirements,
} from "./research-requirements";
import { taskRequirementsSchema, requirementsKey } from "@/lib/research";
import { requirementsForStart } from "@/lib/research-starts";
export function Workspace() {
  const params = useSearchParams();
  const requestedTask = params.get("task");
  const requestedStart = params.get("start");
  const requestedFrom =
    !requestedTask && !requestedStart ? params.get("from") : null;
  const [editingScope, setEditingScope] = useState(true);
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
  const [preview, setPreview] = useState<Offer | null>(null);
  const [purchases, setPurchases] = useState<PurchaseView[]>([]);
  useEffect(() => {
    let active = true;
    setTask(null);
    setEditingScope(true);
    setQuote(null);
    setReview(false);
    setPreview(null);
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
            setEditingScope(false);
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
      setEditingScope(false);
      requestAnimationFrame(() =>
        document.getElementById("source-comparison")?.focus(),
      );
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
  async function previewSource(id: string) {
    try {
      const pinned = quote?.lines.find((line) => line.offer.id === id)?.offer;
      setPreview(pinned || (await api<Offer>(`/offers/${id}`)));
    } catch (error) {
      notify((error as Error).message, true);
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
  const spendingLimit = (
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
  );
  return (
    <div
      className={`page-enter workspace-page ${!task ? "workspace-new" : ""}`}
    >
      <section className="page-heading compact-heading workspace-heading">
        <div>
          <h1>{task ? "Your research" : "What data do you need?"}</h1>
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
      <div
        className={`workspace-layout ${task && !editingScope ? "results-focused" : "scope-focused"}`}
      >
        {task && !editingScope && (
          <section
            className="scope-summary"
            aria-label="Current research scope"
          >
            <div>
              <strong>{task.prompt}</strong>
              <span>
                {task.requirements.needs
                  ?.map(
                    (n) =>
                      `${n.fields.length} fields · within ${n.maxAgeDays} days`,
                  )
                  .join(" / ") || "Research brief"}{" "}
                · {money(task.budgetCents)} limit
              </span>
            </div>
            <button
              className="button button-secondary button-small"
              onClick={() => {
                setEditingScope(true);
                requestAnimationFrame(() =>
                  document.getElementById("research-composer")?.focus(),
                );
              }}
            >
              Edit requirements
            </button>
          </section>
        )}
        {(editingScope || !task) && (
          <section
            className="task-composer panel"
            id="research-composer"
            tabIndex={-1}
          >
            {(capabilities.ai || mode === "brief") && (
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
            )}
            {mode === "requirements" ? (
              <ResearchRequirements
                value={requirements}
                onChange={setRequirements}
                spendingLimit={spendingLimit}
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
            {mode === "brief" && (
              <div className="form-row">{spendingLimit}</div>
            )}
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
            <p className="composer-payment-note">
              Searching is free. You approve any purchase.
            </p>
          </section>
        )}
        <section className="task-output">
          {running ? (
            <div className="planning-state panel" role="status">
              <span className="button-spinner" />
              <h2>Comparing sources</h2>
              <p>Checking scope, freshness, permitted use, and price.</p>
            </div>
          ) : (
            task && (
              <>
                {(task.spentCents > 0 || task.reservedCents > 0) && (
                  <div className="research-spend" aria-label="Task spending">
                    <span>{money(task.budgetCents)} limit</span>
                    <span>{money(task.reservedCents)} reserved</span>
                    <span>{money(task.spentCents)} charged</span>
                  </div>
                )}
                <div
                  className="panel source-decisions"
                  id="source-comparison"
                  tabIndex={-1}
                >
                  <div className="panel-title">
                    <ListFilter size={18} />
                    <h2>Source comparison</h2>
                  </div>
                  {scopeChanged && (
                    <Notice>
                      Requirements changed. Find sources again to refresh this
                      comparison.
                    </Notice>
                  )}
                  <div className="source-decision-list">
                    {task.decisions
                      .filter(
                        (d) =>
                          d.selected ||
                          !task.decisions.some((item) => item.selected),
                      )
                      .map((d) => (
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
                            <button
                              className="text-link decision-preview"
                              onClick={() => previewSource(d.offerId)}
                            >
                              Preview source <ArrowRight size={12} />
                            </button>
                            {!d.selected && (
                              <p>{d.reason.replaceAll("_", " ")}</p>
                            )}
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
                                <p>{d.reason.replaceAll("_", " ")}</p>
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
                  {task.decisions.some((d) => d.selected) &&
                    task.decisions.some((d) => !d.selected) && (
                      <details className="other-sources disclosure">
                        <summary>
                          Other sources{" "}
                          <span>
                            {task.decisions.filter((d) => !d.selected).length}
                          </span>
                        </summary>
                        {task.decisions
                          .filter((d) => !d.selected)
                          .map((d) => (
                            <div className="alternative-source" key={d.offerId}>
                              <div>
                                <strong>{d.title}</strong>
                                <p>{d.reason.replaceAll("_", " ")}</p>
                              </div>
                              <span>{decisionPrice(d)}</span>
                            </div>
                          ))}
                      </details>
                    )}
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
                              setEditingScope(true);
                              requestAnimationFrame(() =>
                                document.getElementById("task-budget")?.focus(),
                              );
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
      <OfferDetail
        offer={preview}
        onClose={() => setPreview(null)}
        backLabel="Back to comparison"
      />
    </div>
  );
}
