"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCheck,
  ChevronRight,
  Clock3,
  CreditCard,
  Download,
  FileCheck2,
  FlaskConical,
  LockKeyhole,
  PackageCheck,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  Wallet,
  X,
} from "lucide-react";
import type { PurchaseView } from "@/lib/types";
import { money } from "@/lib/types";
import { api, post } from "@/lib/client";
import { useTrove } from "./trove-app";
import {
  Badge,
  DataTable,
  downloadJson,
  EmptyState,
  Loading,
  Modal,
  Notice,
  shortId,
  Status,
} from "./ui";
export function Purchases() {
  const { user, ensureAuth, notify } = useTrove();
  const [items, setItems] = useState<PurchaseView[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    api<PurchaseView[]>("/purchases")
      .then(setItems)
      .catch((e) => notify(e.message, true))
      .finally(() => setLoading(false));
  }, [user]);
  const captured = items.filter((p) => p.paymentState === "captured");
  const simulated = captured.filter((p) => p.mode === "simulation");
  const real = captured.filter((p) => p.mode === "sandbox");
  const visible = items.filter((p) => filter === "all" || p.mode === filter);
  return (
    <div className="page-enter">
      <section className="page-heading compact-heading">
        <div>
          <div className="section-eyebrow">
            <span className="eyebrow-line" />
            PURCHASES & RECEIPTS
          </div>
          <h1>
            Every purchase.
            <br />
            <span className="heading-soft">Accounted for.</span>
          </h1>
          <p>Follow the money, access your results, and keep the source.</p>
        </div>
        <Link href="/" className="button button-secondary">
          Explore data
          <ArrowRight size={16} />
        </Link>
      </section>
      <div className="metric-grid">
        <Metric
          label="Sandbox captured"
          value={money(real.reduce((s, p) => s + p.quote.totalCents, 0))}
          detail={`${real.length} actual sandbox captures`}
          icon={Wallet}
        />
        <Metric
          label="Simulation total"
          value={money(simulated.reduce((s, p) => s + p.quote.totalCents, 0))}
          detail="No money moved"
          icon={FlaskConical}
        />
        <Metric
          label="Purchase plans"
          value={String(items.length).padStart(2, "0")}
          detail="Across this workspace"
          icon={ReceiptText}
        />
      </div>
      <section className="panel purchase-table-panel">
        <div className="table-panel-heading">
          <div>
            <h2>Purchase history</h2>
            <p>Payment, delivery, and settlement are tracked independently.</p>
          </div>
          <select
            aria-label="Filter payment mode"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All purchase modes</option>
            <option value="sandbox">PayPal Sandbox</option>
            <option value="simulation">Simulation only</option>
          </select>
        </div>
        {loading ? (
          <Loading />
        ) : !user ? (
          <EmptyState
            title="Your purchases live here"
            description="Open a demo workspace or sign in to see your purchase history."
            action={
              <button
                className="button button-primary"
                onClick={() => ensureAuth()}
              >
                Open workspace
                <ArrowRight size={16} />
              </button>
            }
          />
        ) : !visible.length ? (
          <EmptyState
            title="A clean slate"
            description="Compare a few offers or run a research task. Your first purchase will appear here."
            action={
              <Link href="/" className="button button-secondary">
                Discover data
                <ArrowRight size={15} />
              </Link>
            }
          />
        ) : (
          <div className="table-scroll">
            <table className="purchase-table">
              <thead>
                <tr>
                  <th>Purchase</th>
                  <th>Amount</th>
                  <th>Payment</th>
                  <th>Delivery</th>
                  <th>Settlement</th>
                  <th>
                    <span className="sr-only">Open purchase</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link
                        href={`/purchases/${p.id}`}
                        className="purchase-name"
                      >
                        <span className="receipt-icon">
                          <ReceiptText size={18} />
                        </span>
                        <span>
                          <strong>
                            {p.quote.lines.length === 1
                              ? p.quote.lines[0].snapshot.title
                              : `${p.quote.lines.length}-source research bundle`}
                          </strong>
                          <small>
                            {p.mode === "simulation"
                              ? "SIMULATION"
                              : "PAYPAL SANDBOX"}{" "}
                            ·{" "}
                            {new Date(p.createdAt).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                            })}{" "}
                            · {shortId(p.id)}
                          </small>
                        </span>
                      </Link>
                    </td>
                    <td className="amount-cell">
                      {money(p.quote.totalCents)}
                      <small>USD</small>
                    </td>
                    <td>
                      <Status value={p.paymentState} />
                    </td>
                    <td>
                      <Status value={p.fulfilmentState} />
                    </td>
                    <td>
                      <Status value={p.settlementState} />
                    </td>
                    <td>
                      <Link
                        href={`/purchases/${p.id}`}
                        className="icon-button"
                        aria-label={`Open purchase ${shortId(p.id)}`}
                      >
                        <ChevronRight size={17} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
export function Metric({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Wallet;
}) {
  return (
    <div className="metric-card">
      <div>
        <span>{label}</span>
        <Icon size={17} />
      </div>
      <strong>{value}</strong>
      <p>{detail}</p>
    </div>
  );
}
type Result = {
  purchaseId: string;
  mode: string;
  expiresAt: string;
  sources: {
    title: string;
    sellerName: string;
    version: number;
    license: string;
    resultHash: string;
    declaredFreshness: string;
    rows: Record<string, unknown>[];
  }[];
};
export function PurchaseDetail({ id }: { id: string }) {
  const { user, capabilities, ensureAuth, notify } = useTrove();
  const [purchase, setPurchase] = useState<PurchaseView | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [scenario, setScenario] = useState("success");
  const [tab, setTab] = useState("result");
  const [answer, setAnswer] = useState<{ mode: string; text: string } | null>(
    null,
  );
  const [drafting, setDrafting] = useState(false);
  const [refund, setRefund] = useState(false);
  const [reason, setReason] = useState("");
  async function refresh() {
    const p = await api<PurchaseView>(`/purchases/${id}`);
    setPurchase(p);
    if (
      p.paymentState === "captured" &&
      p.entitlement &&
      new Date(p.entitlement.expiresAt) > new Date() &&
      !p.entitlement.revokedAt
    ) {
      try {
        setResult(await api<Result>(`/purchases/${id}/result`));
      } catch (e) {
        setError((e as Error).message);
      }
    } else setResult(null);
  }
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    refresh()
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
    const timer = setInterval(() => refresh().catch(() => {}), 2500);
    return () => clearInterval(timer);
  }, [id, user]);
  async function action(type: string, body = {}) {
    setBusy(true);
    try {
      await post(`/purchases/${id}/${type}`, body);
      await refresh();
      notify(
        type === "simulate"
          ? "Simulation completed. No PayPal transaction occurred."
          : type === "refund"
            ? "Refund requested. Completion is tracked separately."
            : "Purchase status updated.",
      );
      setRefund(false);
    } catch (e) {
      notify((e as Error).message, true);
      await refresh().catch(() => {});
    } finally {
      setBusy(false);
    }
  }
  if (loading) return <Loading label="Loading the purchase record…" />;
  if (!user)
    return (
      <EmptyState
        title="Sign in to view this purchase"
        description="Purchase records and data are private to their buyer workspace."
        action={
          <button
            className="button button-primary"
            onClick={() => ensureAuth()}
          >
            Open workspace
          </button>
        }
      />
    );
  if (!purchase)
    return (
      <Notice kind="error">
        {error || "Purchase not found in your workspace."}
      </Notice>
    );
  const p = purchase;
  const completed = p.paymentState === "captured";
  const failed = p.paymentState === "voided" || p.fulfilmentState === "failed";
  return (
    <div className="page-enter">
      <Link href="/purchases" className="back-link">
        <ArrowLeft size={15} />
        All purchases
      </Link>
      <section className="purchase-detail-heading">
        <div>
          <div className="section-eyebrow">PURCHASE {shortId(p.id)}</div>
          <h1>
            {completed
              ? "Your evidence is ready."
              : p.paymentState === "refunded"
                ? "Refund completed."
                : failed
                  ? "This purchase was stopped."
                  : "A clear plan. Your approval."}
          </h1>
          <p>
            {p.quote.lines.length}{" "}
            {p.quote.lines.length === 1 ? "source" : "sources"} · Created{" "}
            {new Date(p.createdAt).toLocaleString()}
          </p>
        </div>
        <Badge tone={p.mode === "simulation" ? "amber" : "blue"}>
          {p.mode === "simulation" ? (
            <FlaskConical size={12} />
          ) : (
            <CreditCard size={12} />
          )}{" "}
          {p.mode === "simulation"
            ? "Simulation — no money moved"
            : "PayPal Sandbox"}
        </Badge>
      </section>
      {p.mode === "simulation" && (
        <Notice>
          This is a simulated purchase using synthetic data. Payment references,
          charges, and seller earnings below are simulated. No PayPal call or
          real payout is made.
        </Notice>
      )}
      {p.error && <Notice kind={failed ? "error" : "info"}>{p.error}</Notice>}
      <div className="purchase-detail-layout">
        <div className="purchase-detail-main">
          <div className="panel purchase-progress">
            <div className="panel-title">
              <ShieldCheck size={18} />
              <h2>Purchase progress</h2>
            </div>
            <div className="progress-steps">
              {[
                { label: "Plan created", done: true, Icon: FileCheck2 },
                {
                  label: "Buyer approval",
                  done: !["created", "awaiting_approval"].includes(
                    p.paymentState,
                  ),
                  Icon: CheckCheck,
                },
                {
                  label: "Delivery checks",
                  done: ["validated", "available", "access_expired"].includes(
                    p.fulfilmentState,
                  ),
                  Icon: ShieldCheck,
                },
                {
                  label: "Payment captured",
                  done: ["captured", "refund_pending", "refunded"].includes(
                    p.paymentState,
                  ),
                  Icon: Wallet,
                },
                {
                  label: "Result available",
                  done:
                    !!p.entitlement &&
                    !p.entitlement.revokedAt &&
                    new Date(p.entitlement.expiresAt) > new Date(),
                  Icon: PackageCheck,
                },
              ].map((s, i) => (
                <div
                  className={`progress-step ${s.done ? "step-done" : ""}`}
                  key={s.label}
                >
                  <span>
                    {s.done ? <Check size={16} /> : <s.Icon size={16} />}
                  </span>
                  <small>{String(i + 1).padStart(2, "0")}</small>
                  <strong>{s.label}</strong>
                </div>
              ))}
            </div>
            <div className="independent-states">
              <span>
                Payment <Status value={p.paymentState} />
              </span>
              <span>
                Delivery <Status value={p.fulfilmentState} />
              </span>
              <span>
                Settlement <Status value={p.settlementState} />
              </span>
            </div>
          </div>
          {p.paymentState === "awaiting_approval" && (
            <section className="panel checkout-panel">
              <div className="panel-title">
                <LockKeyhole size={18} />
                <h2>
                  {p.mode === "simulation"
                    ? "Confirm the simulation"
                    : "Approve the exact purchase"}
                </h2>
              </div>
              <p>
                Only the {money(p.quote.totalCents)} purchase plan below can be
                fulfilled. Your task allowance does not authorise other charges.
              </p>
              {new Date(p.quote.expiresAt) < new Date() ? (
                <Notice kind="error">
                  This quote expired. Cancel this purchase and create a new
                  quote from the catalogue or workspace.
                </Notice>
              ) : p.mode === "simulation" ? (
                <>
                  <label className="scenario-label">
                    Demonstration scenario
                    <select
                      value={scenario}
                      onChange={(e) => setScenario(e.target.value)}
                    >
                      <option value="success">
                        Successful delivery checks
                      </option>
                      <option value="outage">
                        Seller connector unavailable
                      </option>
                      <option value="missing_field">
                        Required field missing
                      </option>
                      <option value="stale">Source timestamp mismatch</option>
                    </select>
                  </label>
                  <button
                    className="button button-primary"
                    disabled={busy}
                    onClick={() => action("simulate", { scenario })}
                  >
                    <FlaskConical size={16} />
                    {busy ? "Running simulation…" : "Run simulated purchase"}
                    <ArrowRight size={16} />
                  </button>
                </>
              ) : (
                <PayPalCheckout purchase={p} onApproved={refresh} />
              )}
              <button
                className="text-button cancel-purchase"
                disabled={busy}
                onClick={() => action("cancel")}
              >
                Cancel this purchase
              </button>
            </section>
          )}
          <section className="panel result-panel">
            <div className="result-tabs">
              <button
                className={tab === "result" ? "active" : ""}
                onClick={() => setTab("result")}
              >
                Purchased data
                {result && (
                  <span>
                    {result.sources.reduce(
                      (s, source) => s + source.rows.length,
                      0,
                    )}
                  </span>
                )}
              </button>
              <button
                className={tab === "receipt" ? "active" : ""}
                onClick={() => setTab("receipt")}
              >
                Receipt & provenance
              </button>
              <button
                className={tab === "checks" ? "active" : ""}
                onClick={() => setTab("checks")}
              >
                Delivery checks
              </button>
            </div>
            {tab === "result" &&
              (result ? (
                <div className="results-content">
                  <div className="research-answer">
                    <div>
                      <h3>Put the evidence to work.</h3>
                      <p>
                        Draft a source-linked answer from this purchased subset.
                      </p>
                    </div>
                    <button
                      className="button button-small button-secondary"
                      disabled={drafting}
                      onClick={async () => {
                        setDrafting(true);
                        try {
                          setAnswer(await post(`/purchases/${id}/answer`));
                        } catch (e) {
                          notify((e as Error).message, true);
                        } finally {
                          setDrafting(false);
                        }
                      }}
                    >
                      {drafting
                        ? "Drafting…"
                        : capabilities.ai
                          ? "Draft with AI"
                          : "Summarise demo data"}
                      <ArrowRight size={13} />
                    </button>
                    {answer && (
                      <div className="answer-text">
                        <Badge
                          tone={answer.mode === "gemini" ? "blue" : "amber"}
                        >
                          {answer.mode === "gemini"
                            ? "AI draft · synthetic evidence"
                            : "Deterministic demo summary"}
                        </Badge>
                        <p>{answer.text}</p>
                      </div>
                    )}
                  </div>
                  <div className="result-ready">
                    <span>
                      <Check size={15} />
                      Accessible until{" "}
                      {new Date(result.expiresAt).toLocaleString()}
                    </span>
                    <button
                      className="button button-small button-secondary"
                      onClick={() =>
                        downloadJson(result, `trove-result-${id}.json`)
                      }
                    >
                      <Download size={14} />
                      Download JSON
                    </button>
                  </div>
                  {result.sources.map((source, i) => (
                    <div className="source-result" key={i}>
                      <div className="source-result-heading">
                        <span className="source-number">0{i + 1}</span>
                        <div>
                          <h3>{source.title}</h3>
                          <p>
                            {source.sellerName} · v{source.version} · Synthetic
                            data
                          </p>
                        </div>
                        <Badge>{source.rows.length} records</Badge>
                      </div>
                      <DataTable rows={source.rows} />
                      <p className="caption">
                        Declared snapshot:{" "}
                        {new Date(source.declaredFreshness).toLocaleString()}.{" "}
                        {source.license}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title={
                    p.fulfilmentState === "access_expired"
                      ? "Result access has expired"
                      : p.paymentState === "refunded"
                        ? "Access revoked after refund"
                        : "The result stays protected"
                  }
                  description="Purchased data is released only after all delivery checks and an authoritative completed capture."
                />
              ))}
            {tab === "receipt" && (
              <div className="receipt-content">
                <div className="receipt-sheet">
                  <div className="receipt-sheet-head">
                    <ReceiptText size={22} />
                    <span className="section-eyebrow">
                      TROVE PURCHASE RECORD
                    </span>
                    <Badge tone={p.mode === "simulation" ? "amber" : "blue"}>
                      {p.mode === "simulation" ? "Simulation" : "Sandbox"}
                    </Badge>
                  </div>
                  <h3>
                    {money(p.quote.totalCents)} <span>USD</span>
                  </h3>
                  <dl>
                    <div>
                      <dt>Purchase ID</dt>
                      <dd>{p.id}</dd>
                    </div>
                    <div>
                      <dt>Quote fingerprint</dt>
                      <dd className="hash-value">{p.quote.planHash}</dd>
                    </div>
                    <div>
                      <dt>Order reference</dt>
                      <dd>{p.paypalOrderId || "Not created"}</dd>
                    </div>
                    <div>
                      <dt>Authorisation</dt>
                      <dd>{p.authorizationId || "Not authorised"}</dd>
                    </div>
                    <div>
                      <dt>Capture</dt>
                      <dd>{p.captureId || "Not captured"}</dd>
                    </div>
                    <div>
                      <dt>Included commission</dt>
                      <dd>{money(p.quote.commissionCents)} · Illustrative</dd>
                    </div>
                  </dl>
                  <p className="caption">
                    A receipt is issued only after confirmed capture. These
                    references describe{" "}
                    {p.mode === "simulation"
                      ? "a simulation, not a PayPal transaction"
                      : "a PayPal sandbox transaction"}
                    .
                  </p>
                  {p.receipt && (
                    <button
                      className="button button-secondary"
                      onClick={async () => {
                        try {
                          downloadJson(
                            await api(`/purchases/${id}/receipt`),
                            `trove-receipt-${id}.json`,
                          );
                        } catch (e) {
                          notify((e as Error).message, true);
                        }
                      }}
                    >
                      <Download size={15} />
                      Download receipt
                    </button>
                  )}
                </div>
              </div>
            )}
            {tab === "checks" && (
              <div className="checks-content">
                {p.executions.length ? (
                  p.executions.map((execution, i) => (
                    <div className="execution-checks" key={execution.id}>
                      <h3>
                        Source {i + 1}
                        <Status value={execution.state} />
                      </h3>
                      {execution.checks.map((check) => (
                        <div className="check-item" key={check.name}>
                          {check.passed ? <Check size={15} /> : <X size={15} />}
                          <span>{check.name}</span>
                          <small>{check.passed ? "Passed" : "Failed"}</small>
                        </div>
                      ))}
                      <p className="caption hash-value">
                        SHA-256: {execution.resultHash}
                      </p>
                    </div>
                  ))
                ) : (
                  <EmptyState
                    title="Checks have not completed"
                    description="The worker validates the exact approved fields, quantity, schema, and quoted timestamp before capture."
                  />
                )}
                <Notice>
                  Passing these checks confirms conformance to the purchase
                  plan. It does not independently verify the accuracy of
                  seller-provided information.
                </Notice>
              </div>
            )}
          </section>
        </div>
        <aside className="purchase-summary panel">
          <div className="section-eyebrow">YOUR PURCHASE PLAN</div>
          <h2>
            {p.quote.lines.length === 1
              ? "A focused data purchase."
              : "One bundle. Clear terms."}
          </h2>
          <div className="summary-lines">
            {p.quote.lines.map((line) => (
              <div key={line.id}>
                <div>
                  <span
                    className={`provider-logo provider-${line.offer.seller.color}`}
                  >
                    {line.offer.seller.initials}
                  </span>
                  <strong>{line.snapshot.title}</strong>
                </div>
                <p>
                  {line.quantity} records · {line.snapshot.sellerName}
                </p>
                <span>{money(line.priceCents)}</span>
              </div>
            ))}
          </div>
          <div className="summary-price-row">
            <span>Seller earnings</span>
            <strong>
              {money(p.quote.totalCents - p.quote.commissionCents)}
            </strong>
          </div>
          <div className="summary-price-row">
            <span>Included commission</span>
            <strong>{money(p.quote.commissionCents)}</strong>
          </div>
          <div className="summary-total">
            <span>
              {p.mode === "simulation" ? "Simulated total" : "Exact approval"}
            </span>
            <strong>
              {money(p.quote.totalCents)}
              <small> USD</small>
            </strong>
          </div>
          <div className="policy-note">
            <ShieldCheck size={17} />
            <p>
              {p.quote.purpose.replaceAll("_", " ")}
              <br />
              No training or redistribution.
            </p>
          </div>
          <div className="settlement-explainer">
            <strong>Seller settlement</strong>
            <Status value={p.settlementState} />
            <p>
              {p.mode === "simulation"
                ? "Simulated earnings only. No payout has been submitted."
                : "Seller earnings become payable after confirmed capture and durable result access. Payout status is tracked separately."}
            </p>
            {p.payables.map(
              (payable) =>
                payable.error && (
                  <p className="settlement-error" key={payable.id}>
                    {payable.error}
                  </p>
                ),
            )}
          </div>
          {p.paymentState === "captured" && (
            <button
              className="button button-secondary"
              onClick={() => setRefund(true)}
            >
              Request a refund
            </button>
          )}
          {[
            "authorized",
            "capture_pending",
            "reconciliation_required",
          ].includes(p.paymentState) && (
            <button
              className="button button-secondary"
              disabled={busy}
              onClick={() => action("retry")}
            >
              <RefreshCw size={14} />
              Reconcile status
            </button>
          )}
        </aside>
      </div>
      <Modal
        open={refund}
        onOpenChange={setRefund}
        title={`Refund ${money(p.quote.totalCents)}?`}
        description={
          p.mode === "simulation"
            ? "This will simulate a full refund and revoke result access. No money moves."
            : "Request a full sandbox refund for this captured purchase. Result access will be revoked on completion."
        }
      >
        <div className="form-stack">
          <label>
            Reason
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe why this purchase should be refunded…"
            />
          </label>
          <Notice>
            Unpaid seller settlement will stop. A payout already submitted or
            completed may require separate seller recovery.
          </Notice>
          <button
            className="button button-primary"
            disabled={reason.trim().length < 10 || busy}
            onClick={() => action("refund", { reason })}
          >
            {busy ? "Requesting…" : "Confirm refund request"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
type SDK = {
  findEligibleMethods: (options: {
    currencyCode: string;
    amount: string;
  }) => Promise<{ isEligible: (method: string) => boolean }>;
  createPayPalOneTimePaymentSession: (callbacks: {
    onApprove: (data: { orderId: string }) => Promise<void>;
    onCancel: () => void;
    onError: (error: Error) => void;
  }) => {
    start: (
      options: { presentationMode: string },
      order: Promise<{ orderId: string }>,
    ) => Promise<void>;
  };
};
declare global {
  interface Window {
    paypal?: {
      createInstance: (options: {
        clientId: string;
        components: string[];
      }) => Promise<SDK>;
    };
  }
}
function PayPalCheckout({
  purchase,
  onApproved,
}: {
  purchase: PurchaseView;
  onApproved: () => Promise<void>;
}) {
  const { capabilities, notify } = useTrove();
  const container = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!capabilities.paypal || !capabilities.paypalClientId) return;
    let disposed = false;
    async function setup() {
      try {
        if (!window.paypal)
          await new Promise<void>((resolve, reject) => {
            let script = document.querySelector<HTMLScriptElement>(
              "script[data-trove-paypal]",
            );
            if (!script) {
              script = document.createElement("script");
              script.src = "https://www.sandbox.paypal.com/web-sdk/v6/core";
              script.async = true;
              script.dataset.trovePaypal = "true";
              document.head.appendChild(script);
            }
            script.addEventListener("load", () => resolve(), { once: true });
            script.addEventListener(
              "error",
              () => reject(new Error("PayPal Sandbox SDK could not load.")),
              { once: true },
            );
          });
        const sdk = await window.paypal!.createInstance({
          clientId: capabilities.paypalClientId!,
          components: ["paypal-payments"],
        });
        const methods = await sdk.findEligibleMethods({
          currencyCode: "USD",
          amount: (purchase.quote.totalCents / 100).toFixed(2),
        });
        if (!methods.isEligible("paypal"))
          throw new Error(
            "PayPal is not eligible for this sandbox buyer or merchant configuration.",
          );
        const session = sdk.createPayPalOneTimePaymentSession({
          onApprove: async ({ orderId }) => {
            await post(`/purchases/${purchase.id}/approve`, { orderId });
            notify(
              "PayPal approval received. The worker will authorise, validate and capture the exact purchase.",
            );
            await onApproved();
          },
          onCancel: () =>
            notify("PayPal checkout closed. Nothing is assumed paid."),
          onError: (error) => setError(error.message),
        });
        const button = document.createElement("paypal-button");
        button.setAttribute("type", "pay");
        button.className = "paypal-gold";
        button.setAttribute("aria-label", "Approve with PayPal Sandbox");
        button.addEventListener("click", () => {
          session
            .start(
              { presentationMode: "auto" },
              post<{ orderId: string }>(`/purchases/${purchase.id}/order`),
            )
            .catch((e) => setError(e.message));
        });
        if (!disposed && container.current)
          container.current.replaceChildren(button);
      } catch (e) {
        if (!disposed) setError((e as Error).message);
      }
    }
    setup();
    return () => {
      disposed = true;
      if (container.current) container.current.replaceChildren();
    };
  }, [purchase.id, capabilities.paypalClientId]);
  if (!capabilities.paypal)
    return (
      <Notice>
        PayPal Sandbox credentials are not configured. Checkout is unavailable
        until the collection account is connected.
      </Notice>
    );
  return (
    <div className="paypal-checkout">
      {error ? (
        <Notice kind="error">{error}</Notice>
      ) : (
        <>
          <div ref={container} />
          <p className="caption">
            PayPal Sandbox · An explicit approval for{" "}
            {money(purchase.quote.totalCents)} USD
          </p>
        </>
      )}
    </div>
  );
}
