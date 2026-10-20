"use client";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Edit3,
  Plus,
  Save,
  Store,
  Wallet,
  Coins,
  Database,
} from "lucide-react";
import { api, post } from "@/lib/client";
import { categories, type DataRow } from "@/lib/catalogue";
import type { Offer } from "@/lib/types";
import { money } from "@/lib/types";
import { useTrove } from "./trove-context";
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
  status: string;
  offers: Offer[];
  payables: {
    id: string;
    amountCents: number;
    state: string;
    error: string | null;
    createdAt: string;
    purchase: { id: string; mode: string };
  }[];
};
export function SellerStudio() {
  const { user, ensureAuth, notify, refresh: refreshApp } = useTrove();
  const [seller, setSeller] = useState<SellerData | null>(null),
    [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  const [name, setName] = useState(""),
    [description, setDescription] = useState(""),
    [busy, setBusy] = useState(false),
    [consent, setConsent] = useState(false);
  const [editing, setEditing] = useState<Offer | null>(null),
    [price, setPrice] = useState(""),
    [available, setAvailable] = useState(true),
    [fields, setFields] = useState<string[]>([]),
    [purposes, setPurposes] = useState<string[]>([]),
    [publishing, setPublishing] = useState(false);
  const refresh = async () => setSeller(await api<SellerData>("/seller"));
  useEffect(() => {
    setSeller(null);
    setError("");
    if (user?.role !== "seller") return;
    setLoading(true);
    refresh()
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [user?.id, user?.role]);
  async function save() {
    if (!editing) return;
    setBusy(true);
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
      await Promise.all([refresh(), refreshApp()]);
      setEditing(null);
      notify("New version published.");
    } catch (e) {
      notify((e as Error).message, true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="seller-studio page-enter">
      <section className="page-heading compact-heading">
        <div>
          <h1>Seller studio</h1>
          <p>Publish data and manage your earnings.</p>
        </div>
        {seller && (
          <button
            className="button button-primary"
            onClick={() => setPublishing(true)}
          >
            <Plus size={16} />
            Publish dataset
          </button>
        )}
      </section>
      {error && <Notice kind="error">{error}</Notice>}
      {loading ? (
        <Loading />
      ) : !seller ? (
        <section className="panel onboarding-panel">
          <Store size={26} />
          <h2>Become a data provider</h2>
          <p>
            Set up your profile. We review publishing rights before your offers
            go live.
          </p>
          <form
            className="form-stack"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!(await ensureAuth())) return;
              setBusy(true);
              setError("");
              try {
                await post("/seller/onboard", {
                  name,
                  description,
                  rightsAttested: consent,
                });
                await refreshApp();
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              Provider name
              <input
                required
                minLength={2}
                maxLength={80}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label>
              What data do you provide?
              <textarea
                required
                minLength={20}
                maxLength={500}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>
            <label className="checkbox-row">
              <input
                type="checkbox"
                required
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />
              I have the rights to distribute the data I publish.
            </label>
            <button className="button button-primary" disabled={busy}>
              {busy ? "Submitting…" : "Create provider profile"}
              <ArrowRight size={15} />
            </button>
          </form>
        </section>
      ) : (
        <>
          {seller.status !== "active" && (
            <Notice>
              {seller.status === "pending"
                ? "Your profile is under review. You can prepare datasets; they will appear in search after approval."
                : "Publishing is paused. Contact support to resume."}
            </Notice>
          )}
          <div className="metric-grid">
            <Metric
              label="Outstanding earnings"
              value={money(
                seller.payables
                  .filter((p) =>
                    ["owed", "pending", "submitted"].includes(p.state),
                  )
                  .reduce((n, p) => n + p.amountCents, 0),
              )}
              detail="Awaiting settlement"
              icon={Wallet}
            />
            <Metric
              label="Paid out"
              value={money(
                seller.payables
                  .filter((p) => p.state === "paid")
                  .reduce((n, p) => n + p.amountCents, 0),
              )}
              detail="Confirmed payments"
              icon={Coins}
            />
            <Metric
              label="Published datasets"
              value={String(seller.offers.length)}
              detail={seller.name}
              icon={Database}
            />
          </div>
          <section className="panel">
            <div className="table-panel-heading">
              <h2>Your datasets</h2>
            </div>
            {!seller.offers.length ? (
              <EmptyState
                title="Publish your first dataset"
                description="Upload structured data with a source, licence and price."
                action={
                  <button
                    className="button button-secondary"
                    onClick={() => setPublishing(true)}
                  >
                    Publish dataset
                  </button>
                }
              />
            ) : (
              <div className="table-scroll">
                <table className="purchase-table seller-offers-table">
                  <thead>
                    <tr>
                      <th>Dataset</th>
                      <th>Price</th>
                      <th>Version</th>
                      <th>Status</th>
                      <th>
                        <span className="sr-only">Manage</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {seller.offers.map((offer) => (
                      <tr key={offer.id}>
                        <td>
                          <strong>{offer.title}</strong>
                          <small className="table-subtitle">
                            {offer.recordLimit} records · {offer.fields.length}{" "}
                            fields
                          </small>
                        </td>
                        <td>{money(offer.priceCents)}</td>
                        <td>v{offer.version}</td>
                        <td>
                          <Badge tone={offer.available ? "green" : "neutral"}>
                            {offer.available ? "Available" : "Paused"}
                          </Badge>
                        </td>
                        <td>
                          <button
                            className="button button-small button-secondary"
                            onClick={() => {
                              setEditing(offer);
                              setPrice((offer.priceCents / 100).toFixed(2));
                              setAvailable(offer.available);
                              setFields(offer.fields);
                              setPurposes(offer.purposes);
                            }}
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
            )}
          </section>
          <section className="panel seller-earnings">
            <div className="table-panel-heading">
              <h2>Earnings</h2>
              <button
                className="text-button"
                onClick={() => refresh().catch((e) => notify(e.message, true))}
              >
                Refresh
              </button>
            </div>
            {!seller.payables.length ? (
              <EmptyState
                title="No earnings yet"
                description="Earnings appear after completed purchases."
              />
            ) : (
              <div className="table-scroll">
                <table className="purchase-table">
                  <thead>
                    <tr>
                      <th>Purchase</th>
                      <th>Amount</th>
                      <th>Settlement</th>
                      <th>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {seller.payables.map((p) => (
                      <tr key={p.id}>
                        <td>
                          {shortId(p.purchase.id)}
                          <small className="table-subtitle">
                            {new Date(p.createdAt).toLocaleDateString()}
                          </small>
                        </td>
                        <td>{money(p.amountCents)}</td>
                        <td>
                          <Status value={p.state} />
                        </td>
                        <td>{p.error || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
      <Modal
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(null)}
        title="Update offer"
        description={editing?.title}
      >
        {editing && (
          <form
            className="form-stack"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <div className="form-row">
              <label>
                Batch price (USD)
                <input
                  type="number"
                  min="0.50"
                  max="1000"
                  step="0.01"
                  required
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
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
              <legend>Included fields</legend>
              <div className="checkbox-grid">
                {editing.fields.map((f) => (
                  <label key={f}>
                    <input
                      type="checkbox"
                      checked={fields.includes(f)}
                      onChange={() =>
                        setFields((v) =>
                          v.includes(f) ? v.filter((x) => x !== f) : [...v, f],
                        )
                      }
                    />
                    {f}
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend>Permitted uses</legend>
              {[
                "internal_business_analysis",
                "ai_inference",
                "academic_research",
              ].map((p) => (
                <label className="checkbox-row" key={p}>
                  <input
                    type="checkbox"
                    checked={purposes.includes(p)}
                    onChange={() =>
                      setPurposes((v) =>
                        v.includes(p) ? v.filter((x) => x !== p) : [...v, p],
                      )
                    }
                  />
                  {p.replaceAll("_", " ")}
                </label>
              ))}
            </fieldset>
            <p className="caption">
              Existing purchases retain their original terms.
            </p>
            <button
              className="button button-primary"
              disabled={busy || !fields.length || !purposes.length}
            >
              <Save size={15} />
              {busy ? "Saving…" : `Publish version ${editing.version + 1}`}
            </button>
          </form>
        )}
      </Modal>
      <PublishDataset
        open={publishing}
        onOpenChange={setPublishing}
        onPublished={async () => {
          await Promise.all([refresh(), refreshApp()]);
          notify("Dataset published.");
        }}
      />
    </div>
  );
}
function PublishDataset({
  open,
  onOpenChange,
  onPublished,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onPublished: () => Promise<void>;
}) {
  const [aiProcessing, setAiProcessing] = useState(false);
  const [title, setTitle] = useState(""),
    [description, setDescription] = useState(""),
    [category, setCategory] = useState<string>(categories[0]),
    [price, setPrice] = useState("2.00"),
    [sourceUrl, setSourceUrl] = useState(""),
    [licenseUrl, setLicenseUrl] = useState(""),
    [attribution, setAttribution] = useState(""),
    [updated, setUpdated] = useState(""),
    [rows, setRows] = useState<DataRow[]>([]),
    [filename, setFilename] = useState(""),
    [rights, setRights] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Publish a dataset"
      description="Set the data, source terms and batch price."
      wide
    >
      <form
        className="form-stack"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            await post("/seller/offers", {
              title,
              description,
              category,
              priceCents: Math.round(Number(price) * 100),
              sourceUrl,
              licenseUrl,
              attribution,
              sourceUpdatedAt: updated,
              rows,
              rightsAttested: rights,
              aiProcessing,
            });
            await onPublished();
            onOpenChange(false);
            setRows([]);
            setTitle("");
            setFilename("");
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {error && <Notice kind="error">{error}</Notice>}
        <label>
          Title
          <input
            required
            minLength={3}
            maxLength={100}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label>
          Description
          <textarea
            required
            minLength={20}
            maxLength={600}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <div className="form-row">
          <label>
            Category
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            Batch price (USD)
            <input
              required
              type="number"
              min="0.50"
              max="1000"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </label>
        </div>
        <label>
          Source URL
          <input
            required
            type="url"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="https://…"
          />
        </label>
        <label>
          Licence URL
          <input
            required
            type="url"
            value={licenseUrl}
            onChange={(e) => setLicenseUrl(e.target.value)}
            placeholder="https://…"
          />
        </label>
        <label>
          Attribution
          <input
            required
            minLength={3}
            maxLength={500}
            value={attribution}
            onChange={(e) => setAttribution(e.target.value)}
          />
        </label>
        <label>
          Source last updated
          <input
            required
            type="date"
            max={new Date().toISOString().slice(0, 10)}
            value={updated}
            onChange={(e) => setUpdated(e.target.value)}
          />
        </label>
        <label>
          Data file (JSON)
          <input
            type="file"
            accept="application/json,.json"
            required
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setError("");
              setRows([]);
              try {
                if (file.size > 2_000_000)
                  throw new Error("Choose a file smaller than 2 MB.");
                const data = JSON.parse(await file.text());
                if (
                  !Array.isArray(data) ||
                  data.length < 2 ||
                  data.length > 1000
                )
                  throw new Error("Upload an array of 2–1,000 records.");
                setRows(data);
                setFilename(`${file.name} · ${data.length} records`);
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          />
          <small>
            {filename ||
              "Consistent fields, with text or numeric values. No personal data."}
          </small>
        </label>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={aiProcessing}
            onChange={(e) => setAiProcessing(e.target.checked)}
          />
          Allow purchased records to be sent to an AI service for research
          summaries.
        </label>
        <label className="checkbox-row">
          <input
            type="checkbox"
            required
            checked={rights}
            onChange={(e) => setRights(e.target.checked)}
          />
          I have distribution rights and the source details are accurate.
        </label>
        <button
          className="button button-primary"
          disabled={busy || !rows.length || !rights}
        >
          {busy ? "Publishing…" : "Publish dataset"}
        </button>
      </form>
    </Modal>
  );
}
