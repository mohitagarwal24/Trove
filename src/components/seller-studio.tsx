"use client";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  Coins,
  Edit3,
  Layers3,
  Plus,
  Save,
  ShieldCheck,
  Store,
  Wallet,
} from "lucide-react";
import { api } from "@/lib/client";
import type { Offer } from "@/lib/types";
import { money } from "@/lib/types";
import { useTrove } from "./trove-app";
import {
  Badge,
  EmptyState,
  Loading,
  Modal,
  Notice,
  shortId,
  Status,
} from "./ui";
import { Metric } from "./purchases";
type SellerData = {
  id: string;
  name: string;
  initials: string;
  color: string;
  description: string;
  offers: Offer[];
  payables: {
    id: string;
    amountCents: number;
    state: string;
    error: string | null;
    createdAt: string;
    payout: {
      batchId: string | null;
      itemId: string | null;
      state: string;
    } | null;
    purchase: {
      id: string;
      mode: string;
      paymentState: string;
      createdAt: string;
    };
  }[];
};
export function SellerStudio() {
  const {
    user,
    capabilities,
    switchAccount,
    notify,
    refresh: refreshApp,
  } = useTrove();
  const [seller, setSeller] = useState<SellerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Offer | null>(null);
  const [price, setPrice] = useState("");
  const [available, setAvailable] = useState(true);
  const [fields, setFields] = useState<string[]>([]);
  const [purposes, setPurposes] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  async function refresh() {
    setSeller(await api<SellerData>("/seller"));
  }
  useEffect(() => {
    if (user?.role !== "seller") {
      setSeller(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    refresh()
      .catch((e) => notify(e.message, true))
      .finally(() => setLoading(false));
  }, [user?.id]);
  function edit(offer: Offer) {
    setEditing(offer);
    setPrice((offer.priceCents / 100).toFixed(2));
    setAvailable(offer.available);
    setFields(offer.fields);
    setPurposes(offer.purposes);
  }
  async function save() {
    if (!editing) return;
    setSaving(true);
    try {
      await api(`/seller/offers/${editing.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          priceCents: Math.round(Number(price) * 100),
          available,
          fields,
          purposes,
        }),
      });
      await refresh();
      await refreshApp();
      setEditing(null);
      notify(
        "A new immutable offer version has been published. Existing quotes keep their approved terms.",
      );
    } catch (e) {
      notify((e as Error).message, true);
    } finally {
      setSaving(false);
    }
  }
  const real =
    seller?.payables.filter((p) => p.purchase.mode === "sandbox") || [];
  const simulated =
    seller?.payables.filter((p) => p.purchase.mode === "simulation") || [];
  return (
    <div className="page-enter">
      <section className="page-heading compact-heading">
        <div>
          <div className="section-eyebrow">
            <span className="eyebrow-line" />
            SELLER STUDIO
          </div>
          <h1>
            Your data.
            <br />
            <span className="heading-soft">Your terms.</span>
          </h1>
          <p>Shape your offers, control access, and follow every earning.</p>
        </div>
        {seller && (
          <div className="seller-account">
            <span className={`provider-logo provider-${seller.color}`}>
              {seller.initials}
            </span>
            <div>
              <strong>{seller.name}</strong>
              <small>Fictional provider account</small>
            </div>
          </div>
        )}
      </section>
      {loading ? (
        <Loading />
      ) : !seller ? (
        <div className="panel seller-gate">
          <div className="empty-icon">
            <Store size={27} />
          </div>
          <h2>A dedicated space for your offers.</h2>
          <p>
            Seller controls require a separate seller account. Buyer credentials
            never grant access to another provider’s prices, terms, or
            settlement details.
          </p>
          {capabilities.demo && (
            <>
              <button
                className="button button-primary"
                onClick={() =>
                  switchAccount("pricing").catch((e) => notify(e.message, true))
                }
              >
                Open Northstar seller demo
                <ArrowRight size={16} />
              </button>
              <div className="other-seller-options">
                <button onClick={() => switchAccount("suppliers")}>
                  Atlas Supply
                  <ArrowUpRight size={12} />
                </button>
                <button onClick={() => switchAccount("market")}>
                  Meridian Research
                  <ArrowUpRight size={12} />
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="metric-grid">
            <Metric
              label="Outstanding sandbox earnings"
              value={money(
                real
                  .filter((p) =>
                    ["owed", "pending", "submitted"].includes(p.state),
                  )
                  .reduce((s, p) => s + p.amountCents, 0),
              )}
              detail="Payable is separate from paid"
              icon={Wallet}
            />
            <Metric
              label="Completed sandbox payouts"
              value={money(
                real
                  .filter((p) => p.state === "paid")
                  .reduce((s, p) => s + p.amountCents, 0),
              )}
              detail="Confirmed payout items only"
              icon={Coins}
            />
            <Metric
              label="Simulated earnings"
              value={money(
                simulated
                  .filter((p) => p.state !== "cancelled")
                  .reduce((s, p) => s + p.amountCents, 0),
              )}
              detail="No actual funds or payouts"
              icon={Layers3}
            />
          </div>
          <section className="panel">
            <div className="table-panel-heading">
              <div>
                <h2>Your published offers</h2>
                <p>
                  Changes create a new version. Approved quotes keep their exact
                  scope.
                </p>
              </div>
              <Badge>{seller.offers.length} offers</Badge>
            </div>
            <div className="table-scroll">
              <table className="purchase-table seller-offers-table">
                <thead>
                  <tr>
                    <th>Data offer</th>
                    <th>Price / batch</th>
                    <th>Version</th>
                    <th>Availability</th>
                    <th>Manage</th>
                  </tr>
                </thead>
                <tbody>
                  {seller.offers.map((offer) => (
                    <tr key={offer.id}>
                      <td>
                        <strong>{offer.title}</strong>
                        <small className="table-subtitle">
                          {offer.fields.length} fields · Up to{" "}
                          {offer.recordLimit} records
                        </small>
                      </td>
                      <td className="amount-cell">{money(offer.priceCents)}</td>
                      <td>
                        <Badge>v{offer.version}</Badge>
                      </td>
                      <td>
                        <Badge tone={offer.available ? "green" : "neutral"}>
                          <span className="status-dot" />
                          {offer.available ? "Available" : "Paused"}
                        </Badge>
                      </td>
                      <td>
                        <button
                          className="button button-small button-secondary"
                          onClick={() => edit(offer)}
                        >
                          <Edit3 size={13} />
                          Edit offer
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section className="panel seller-earnings">
            <div className="table-panel-heading">
              <div>
                <h2>Earnings & settlement</h2>
                <p>
                  Each entry is tied to a fulfilled purchase and its payment
                  mode.
                </p>
              </div>
              <button
                className="text-button"
                onClick={() => refresh().catch((e) => notify(e.message, true))}
              >
                Refresh
              </button>
            </div>
            {!seller.payables.length ? (
              <EmptyState
                title="Your first earning starts with a purchase"
                description="Successful fulfilled purchases create a payable. Payouts are submitted and tracked separately."
              />
            ) : (
              <div className="table-scroll">
                <table className="purchase-table">
                  <thead>
                    <tr>
                      <th>Purchase reference</th>
                      <th>Mode</th>
                      <th>Seller earning</th>
                      <th>Settlement</th>
                      <th>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {seller.payables.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <strong className="mono">
                            {shortId(p.purchase.id)}
                          </strong>
                          <small className="table-subtitle">
                            {new Date(p.createdAt).toLocaleDateString()}
                          </small>
                        </td>
                        <td>
                          <Badge
                            tone={
                              p.purchase.mode === "simulation"
                                ? "amber"
                                : "blue"
                            }
                          >
                            {p.purchase.mode === "simulation"
                              ? "Simulation"
                              : "PayPal Sandbox"}
                          </Badge>
                        </td>
                        <td className="amount-cell">{money(p.amountCents)}</td>
                        <td>
                          <Status value={p.state} />
                        </td>
                        <td className="settlement-detail">
                          {p.error ||
                            (p.payout?.itemId
                              ? `Item ${p.payout.itemId}`
                              : "Awaiting settlement worker")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          <div className="seller-integrity-note">
            <ShieldCheck size={20} />
            <p>
              Only your offers and payables are visible here. The illustrative
              platform commission is included in each listed gross price. Actual
              processor expenses are accounted for separately.
            </p>
          </div>
        </>
      )}
      <Modal
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(null)}
        title="Publish a new offer version"
        description={
          editing?.title || "Edit seller-controlled pricing and permissions."
        }
      >
        {editing && (
          <div className="form-stack">
            <div className="form-row">
              <label>
                Gross batch price (USD)
                <div className="money-input">
                  <span>$</span>
                  <input
                    type="number"
                    min="0.50"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                  />
                  <span>USD</span>
                </div>
              </label>
              <label>
                Availability
                <select
                  value={available ? "available" : "paused"}
                  onChange={(e) => setAvailable(e.target.value === "available")}
                >
                  <option value="available">Available</option>
                  <option value="paused">Paused</option>
                </select>
              </label>
            </div>
            <fieldset>
              <legend>Permitted result fields</legend>
              <div className="checkbox-grid">
                {editing.fields.map((field) => (
                  <label key={field}>
                    <input
                      type="checkbox"
                      checked={fields.includes(field)}
                      onChange={() =>
                        setFields((v) =>
                          v.includes(field)
                            ? v.filter((f) => f !== field)
                            : [...v, field],
                        )
                      }
                    />
                    <span>{field}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend>Permitted purposes</legend>
              {[
                "internal_business_analysis",
                "ai_inference",
                "academic_research",
              ].map((purpose) => (
                <label className="checkbox-row" key={purpose}>
                  <input
                    type="checkbox"
                    checked={purposes.includes(purpose)}
                    onChange={() =>
                      setPurposes((v) =>
                        v.includes(purpose)
                          ? v.filter((p) => p !== purpose)
                          : [...v, purpose],
                      )
                    }
                  />
                  {purpose.replaceAll("_", " ")}
                </label>
              ))}
            </fieldset>
            <Notice>
              Publishing creates version {editing.version + 1}. New fields or
              restored connector capabilities require an approved adapter
              update. Existing approved plans are not rewritten.
            </Notice>
            <button
              className="button button-primary"
              disabled={
                saving ||
                !fields.length ||
                !purposes.length ||
                Number(price) < 0.5
              }
              onClick={save}
            >
              <Save size={15} />
              {saving
                ? "Publishing…"
                : `Publish version ${editing.version + 1}`}
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
