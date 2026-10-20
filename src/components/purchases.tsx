"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCheck,
  ChevronRight,
  Download,
  FileCheck2,
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
      setItems([]);
      setLoading(false);
      return;
    }
    api<PurchaseView[]>("/purchases")
      .then(setItems)
      .catch((e) => notify(e.message, true))
      .finally(() => setLoading(false));
  }, [user]);
  const captured = items.filter((p) => p.paymentState === "captured");
  const visible = items.filter(
    (p) => filter === "all" || p.paymentState === filter,
  );
  return (
    <div className="page-enter">
      <section className="page-heading compact-heading">
        <div>
          <h1>Purchases</h1>
          <p>Your data, downloads and receipts.</p>
        </div>
        <Link href="/" className="button button-secondary">
          Explore data
          <ArrowRight size={16} />
        </Link>
      </section>
      {user && items.length > 0 && (
        <div className="metric-grid">
          <Metric
            label="Total purchased"
            value={money(captured.reduce((s, p) => s + p.quote.totalCents, 0))}
            detail={`${captured.length} completed purchases`}
            icon={Wallet}
          />
          <Metric
            label="Ready to download"
            value={String(
              captured.filter((p) => p.entitlement && !p.entitlement.revokedAt)
                .length,
            )}
            detail="Available from your purchases"
            icon={PackageCheck}
          />
          <Metric
            label="Purchase plans"
            value={String(items.length).padStart(2, "0")}
            detail="Across this workspace"
            icon={ReceiptText}
          />
        </div>
      )}
      <section className="panel purchase-table-panel">
        <div className="table-panel-heading">
          <div>
            <h2>Purchase history</h2>
          </div>
          <select
            aria-label="Filter purchases"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All purchases</option>
            <option value="captured">Completed</option>
            <option value="awaiting_approval">Awaiting payment</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>
        {loading ? (
          <Loading />
        ) : !user ? (
          <EmptyState
            title="Your purchases live here"
            description="Sign in to access your purchases."
            action={
              <button
                className="button button-primary"
                onClick={() => ensureAuth()}
              >
                Sign in
                <ArrowRight size={16} />
              </button>
            }
          />
        ) : !visible.length ? (
          <EmptyState
            title={items.length ? "No matching purchases" : "A clean slate"}
            description={
              items.length
                ? "Try a different payment status."
                : "Your first purchase will appear here."
            }
            action={
              items.length ? (
                <button
                  className="button button-secondary"
                  onClick={() => setFilter("all")}
                >
                  Show all purchases
                </button>
              ) : (
                <Link href="/" className="button button-secondary">
                  Discover data
                  <ArrowRight size={15} />
                </Link>
              )
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
                            {p.mode === "live" ? "PayPal" : "Sandbox"} ·{" "}
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
      !p.entitlement.revokedAt
    ) {
      try {
        const data = await api<Result>(`/purchases/${id}/result`);
        setResult(data);
        setError("");
        if (data.expiresAt !== p.entitlement.expiresAt)
          setPurchase({
            ...p,
            entitlement: { ...p.entitlement, expiresAt: data.expiresAt },
          });
      } catch (e) {
        setError((e as Error).message);
      }
    } else setResult(null);
  }
  useEffect(() => {
    if (!user) {
      setPurchase(null);
      setResult(null);
      setAnswer(null);
      setLoading(false);
      return;
    }
    refresh()
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
    const timer = setInterval(() => {
      if (!document.hidden) refresh().catch(() => {});
    }, 10000);
    return () => clearInterval(timer);
  }, [id, user]);
  async function action(type: string, body = {}) {
    setBusy(true);
    try {
      await post(`/purchases/${id}/${type}`, body);
      await refresh();
      notify(type === "refund" ? "Refund requested." : "Purchase updated.");
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
            Sign in
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
          <h1>
            {completed
              ? "Your data is ready"
              : p.paymentState === "refunded"
                ? "Refund completed"
                : failed
                  ? "Purchase stopped"
                  : "Review and approve"}
          </h1>
          <p>
            {p.quote.lines.length}{" "}
            {p.quote.lines.length === 1 ? "source" : "sources"} · Created{" "}
            {new Date(p.createdAt).toLocaleString()}
          </p>
        </div>
        {p.mode === "sandbox" && <Badge tone="amber">PayPal Sandbox</Badge>}
      </section>
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
                  done: !!p.approvedAt,
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
                  done: !!p.entitlement && !p.entitlement.revokedAt,
                  Icon: PackageCheck,
                },
              ].map((s) => (
                <div
                  className={`progress-step ${s.done ? "step-done" : ""}`}
                  key={s.label}
                >
                  <span>
                    {s.done ? <Check size={16} /> : <s.Icon size={16} />}
                  </span>
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
            </div>
          </div>
          {p.paymentState === "awaiting_approval" && (
            <section className="panel checkout-panel">
              <div className="panel-title">
                <LockKeyhole size={18} />
                <h2>Approve purchase</h2>
              </div>
              <p>Approve {money(p.quote.totalCents)} to receive your data.</p>
              {new Date(p.quote.expiresAt) < new Date() ? (
                <Notice kind="error">
                  This quote expired. Cancel this purchase and create a new
                  quote from the catalogue or workspace.
                </Notice>
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
                      <h3>Research summary</h3>
                    </div>
                    <button
                      className="button button-small button-secondary"
                      disabled={
                        drafting ||
                        !capabilities.ai ||
                        !p.quote.lines.every((line) =>
                          line.offer.purposes.includes("ai_inference"),
                        )
                      }
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
                      {drafting ? "Drafting…" : "Summarise with AI"}
                      <ArrowRight size={13} />
                    </button>
                    {answer && (
                      <div className="answer-text">
                        <Badge
                          tone={answer.mode === "gemini" ? "blue" : "amber"}
                        >
                          AI research summary
                        </Badge>
                        <p>{answer.text}</p>
                      </div>
                    )}
                  </div>
                  <div className="result-ready">
                    <span>
                      <Check size={15} />
                      Purchased · download again at no charge
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
                  {!!p.quote.reusedSources?.length && (
                    <div className="source-result">
                      <h3>Previously purchased sources</h3>
                      {p.quote.reusedSources.map((source) => (
                        <p
                          key={`${source.purchaseId}:${source.offerVersionId}`}
                        >
                          <Link
                            className="text-link"
                            href={`/purchases/${source.purchaseId}`}
                          >
                            {source.title}
                          </Link>
                        </p>
                      ))}
                    </div>
                  )}
                  {result.sources.map((source, i) => (
                    <div className="source-result" key={i}>
                      <div className="source-result-heading">
                        <span className="source-number">0{i + 1}</span>
                        <div>
                          <h3>{source.title}</h3>
                          <p>
                            {source.sellerName} · v{source.version}
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
                      ? "Restoring purchased data"
                      : p.paymentState === "refunded"
                        ? "Access revoked after refund"
                        : "The result stays protected"
                  }
                  description="Your data appears after payment and delivery checks."
                />
              ))}
            {tab === "receipt" && (
              <div className="receipt-content">
                <div className="receipt-sheet">
                  <div className="receipt-sheet-head">
                    <ReceiptText size={22} />
                    <span>Purchase record</span>
                    {p.mode === "sandbox" && (
                      <Badge tone="amber">Sandbox</Badge>
                    )}
                  </div>
                  <h3>
                    {money(p.quote.totalCents)} <span>USD</span>
                  </h3>
                  <details className="receipt-references">
                    <summary>Transaction references</summary>
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
                        <dt>Trove fee (included)</dt>
                        <dd>{money(p.quote.commissionCents)}</dd>
                      </div>
                    </dl>
                  </details>
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
                      <details className="integrity-reference">
                        <summary>Source fingerprint</summary>
                        <p className="caption hash-value">
                          SHA-256: {execution.resultHash}
                        </p>
                      </details>
                    </div>
                  ))
                ) : (
                  <EmptyState
                    title="Checks have not completed"
                    description="Data and source checks run before payment is captured."
                  />
                )}
                <Notice>
                  Checks confirm the agreed scope and source integrity, not the
                  accuracy of the original data.
                </Notice>
              </div>
            )}
          </section>
        </div>
        <aside className="purchase-summary panel">
          <h2>Purchase summary</h2>
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
            <span>Data preparation</span>
            <strong>
              {money(p.quote.totalCents - p.quote.commissionCents)}
            </strong>
          </div>
          <div className="summary-price-row">
            <span>Trove fee (included)</span>
            <strong>{money(p.quote.commissionCents)}</strong>
          </div>
          <div className="summary-total">
            <span>Total</span>
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
              See source licence for usage rights.
            </p>
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
        description="A full refund revokes access to the purchased data."
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
let paypalScriptPromise: Promise<void> | undefined;
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
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    setError("");
    if (!capabilities.paypal || !capabilities.paypalClientId) return;
    let disposed = false;
    async function setup() {
      try {
        if (!window.paypal) {
          if (!paypalScriptPromise)
            paypalScriptPromise = new Promise<void>((resolve, reject) => {
              const script = document.createElement("script");
              const timeout = setTimeout(() => fail(), 20000);
              const fail = () => {
                clearTimeout(timeout);
                script.remove();
                paypalScriptPromise = undefined;
                reject(new Error("PayPal could not load. Try again."));
              };
              script.src =
                capabilities.paymentEnvironment === "live"
                  ? "https://www.paypal.com/web-sdk/v6/core"
                  : "https://www.sandbox.paypal.com/web-sdk/v6/core";
              script.async = true;
              script.onload = () => {
                clearTimeout(timeout);
                if (window.paypal) resolve();
                else fail();
              };
              script.onerror = fail;
              document.head.appendChild(script);
            });
          await paypalScriptPromise;
        }
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
            "PayPal is unavailable for this account. Try another PayPal account.",
          );
        const session = sdk.createPayPalOneTimePaymentSession({
          onApprove: async ({ orderId }) => {
            await post(`/purchases/${purchase.id}/approve`, { orderId });
            notify("Approved. Preparing your data.");
            await onApproved();
          },
          onCancel: () => notify("Checkout closed. You have not been charged."),
          onError: (error) => setError(error.message),
        });
        const button = document.createElement("paypal-button");
        button.setAttribute("type", "pay");
        button.className = "paypal-gold";
        button.setAttribute("aria-label", "Approve with PayPal");
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
  }, [
    purchase.id,
    attempt,
    capabilities.paypalClientId,
    capabilities.paymentEnvironment,
  ]);
  if (!capabilities.paypal)
    return (
      <Notice>
        Checkout is temporarily unavailable. Please try again later.
      </Notice>
    );
  return (
    <div className="paypal-checkout">
      {error ? (
        <Notice kind="error">
          {error}{" "}
          <button
            className="text-button"
            onClick={() => setAttempt((n) => n + 1)}
          >
            Try again
          </button>
        </Notice>
      ) : (
        <>
          <div ref={container} />
          <p className="caption">
            PayPal · Total {money(purchase.quote.totalCents)} USD
          </p>
        </>
      )}
    </div>
  );
}
