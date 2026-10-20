"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDownUp,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  Clock3,
  Database,
  Filter,
  Layers3,
  Pill,
  Package,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Stethoscope,
  X,
} from "lucide-react";
import type { Offer, QuoteView } from "@/lib/types";
import { money } from "@/lib/types";
import { api, post } from "@/lib/client";
import { examplePrompts } from "@/lib/examples";
import { useTrove } from "./trove-app";
import { Badge, DataTable, EmptyState, Modal } from "./ui";
import { QuoteReview } from "./quote-review";
export function ageLabel(timestamp: string) {
  const hours = Math.max(
    0,
    Math.floor((Date.now() - new Date(timestamp).getTime()) / 3600000),
  );
  return hours < 1
    ? "Updated just now"
    : hours < 24
      ? `Updated ${hours}h ago`
      : `Updated ${Math.floor(hours / 24)}d ago`;
}
const categoryIcons: Record<string, typeof Database> = {
  "All data": Layers3,
  "Drug approvals": Pill,
  "Drug recalls": ShieldCheck,
  "Device recalls": Stethoscope,
};
export function Discover() {
  const { offers, ensureAuth, notify } = useTrove();
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (
        event.key === "/" &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        !target.closest("input, textarea, select, [contenteditable=true]")
      ) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All data");
  const [sort, setSort] = useState("recommended");
  const [freshOnly, setFreshOnly] = useState(false);
  const [found, setFound] = useState<Offer[]>(offers);
  const [selected, setSelected] = useState<string[]>([]);
  useEffect(() => {
    try {
      const stored: unknown = JSON.parse(
        sessionStorage.getItem("trove-comparison") || "[]",
      );
      if (Array.isArray(stored))
        setSelected(
          stored
            .filter(
              (id): id is string =>
                typeof id === "string" &&
                offers.some((offer) => offer.id === id),
            )
            .slice(0, 6),
        );
    } catch {
      /* Browser storage is optional. */
    }
  }, []);
  useEffect(() => {
    try {
      sessionStorage.setItem("trove-comparison", JSON.stringify(selected));
    } catch {
      /* Browser storage is optional. */
    }
  }, [selected]);
  const [detail, setDetail] = useState<Offer | null>(null);
  const [quote, setQuote] = useState<QuoteView | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [prompt, setPrompt] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    if (!query.trim()) {
      setFound(offers);
      return () => controller.abort();
    }
    const timer = setTimeout(() => {
      api<{ offers: Offer[] }>(
        `/offers?q=${encodeURIComponent(query)}&category=${encodeURIComponent(category)}`,
        { signal: controller.signal },
      )
        .then((d) => setFound(d.offers))
        .catch((e) => {
          if (!controller.signal.aborted) notify(e.message, true);
        });
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, category, offers]);
  const visible = (query.trim() ? found : offers)
    .filter((o) => category === "All data" || o.category === category)
    .filter(
      (o) =>
        !freshOnly ||
        Date.now() - new Date(o.freshnessAt).getTime() <= 30 * 86400000,
    )
    .sort((a, b) =>
      sort === "price"
        ? a.priceCents - b.priceCents
        : sort === "freshness"
          ? +new Date(b.freshnessAt) - +new Date(a.freshnessAt)
          : 0,
    );
  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id)
        ? prev.filter((v) => v !== id)
        : prev.length < 6
          ? [...prev, id]
          : prev,
    );
  }
  async function review() {
    try {
      if (!(await ensureAuth())) return;
      setQuoting(true);
      setQuote(await post<QuoteView>("/quotes", { offerIds: selected }));
    } catch (e) {
      notify((e as Error).message, true);
    } finally {
      setQuoting(false);
    }
  }
  function startResearch(text: string) {
    sessionStorage.setItem("trove-prompt", text || examplePrompts[0]);
    router.push("/workspace");
  }
  return (
    <div className="page-enter discover-page">
      <section className="page-heading">
        <div>
          <h1>
            Better data.
            <br />
            <span className="heading-soft">Clearer answers.</span>
          </h1>
          <p>Regulatory intelligence, ready for your research.</p>
        </div>
        <Link
          className="button button-secondary heading-action"
          href="/connect"
        >
          Bring your own agent
          <ArrowUpRight size={16} />
        </Link>
      </section>
      <div className="discovery-layout">
        <div className="catalog-column">
          <div className="catalog-toolbar">
            <div className="search-input">
              <Search size={18} />
              <input
                ref={searchRef}
                aria-label="Search data offers"
                placeholder="Search datasets, suppliers, or topics…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query ? (
                <button
                  className="icon-button"
                  aria-label="Clear search"
                  onClick={() => setQuery("")}
                >
                  <X size={14} />
                </button>
              ) : (
                <kbd>/</kbd>
              )}
            </div>
            <button
              className={`button button-filter ${freshOnly ? "filter-active" : ""}`}
              onClick={() => setFreshOnly((v) => !v)}
              aria-pressed={freshOnly}
            >
              <Filter size={16} />
              {freshOnly ? "Fresh only" : "Updated within 30 days"}
              {freshOnly && <span className="filter-count">1</span>}
            </button>
          </div>
          <div
            className="category-tabs"
            role="tablist"
            aria-label="Data categories"
          >
            {Object.entries(categoryIcons).map(([name, Icon]) => (
              <button
                key={name}
                role="tab"
                aria-selected={category === name}
                className={category === name ? "selected" : ""}
                onClick={() => setCategory(name)}
              >
                <Icon size={15} />
                {name}
                <span>
                  {name === "All data"
                    ? offers.length
                    : offers.filter((o) => o.category === name).length}
                </span>
              </button>
            ))}
          </div>
          <div className="catalog-label">
            <div>
              <h2>
                {query
                  ? "Search results"
                  : category === "All data"
                    ? "Explore the catalogue"
                    : category}
              </h2>
              <span>{visible.length} scoped offers</span>
            </div>
            <label className="sort-control">
              <ArrowDownUp size={13} />
              <select
                aria-label="Sort offers"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <option value="recommended">Featured</option>
                <option value="price">Lowest price</option>
                <option value="freshness">Most recent</option>
              </select>
            </label>
          </div>
          {visible.length ? (
            <div className="offer-grid">
              {visible.map((offer) => (
                <OfferCard
                  key={offer.id}
                  offer={offer}
                  selected={selected.includes(offer.id)}
                  onToggle={() => toggle(offer.id)}
                  onOpen={() => setDetail(offer)}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No matching offers"
              description="Try another topic or remove the freshness filter."
              action={
                <button
                  className="button button-secondary"
                  onClick={() => {
                    setQuery("");
                    setCategory("All data");
                    setFreshOnly(false);
                  }}
                >
                  Clear filters
                </button>
              }
            />
          )}
        </div>
        <aside className="research-aside">
          <div className="research-panel">
            <h2>
              What are you
              <br />
              working on?
            </h2>
            <p>Find the right sources. Approve an exact price.</p>
            <label className="sr-only" htmlFor="discover-prompt">
              Your research question
            </label>
            <textarea
              id="discover-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={"Find recent drug approvals and recall reasons…"}
              rows={5}
            />
            <div className="research-panel-meta">
              <ShieldCheck size={13} />
              <span>No purchase without your approval</span>
            </div>
            <button
              className="button button-primary research-submit"
              onClick={() => startResearch(prompt)}
            >
              <Sparkles size={16} />
              Start a research task
              <ArrowRight size={17} />
            </button>
            <div className="panel-divider" />
            <div className="suggestion-label">Try a starting point</div>
            <button
              className="prompt-suggestion"
              onClick={() => startResearch(examplePrompts[1])}
            >
              <Package size={16} />
              <span>Review drug recall risks</span>
              <ChevronRight size={15} />
            </button>
            <button
              className="prompt-suggestion"
              onClick={() => startResearch(examplePrompts[2])}
            >
              <TrendingUp size={16} />
              <span>Explore medical device recalls</span>
              <ChevronRight size={15} />
            </button>
          </div>
        </aside>
      </div>
      {selected.length > 0 && (
        <div className="comparison-tray" aria-label="Offer comparison">
          <div>
            <span className="tray-icon">
              <Layers3 size={18} />
            </span>
            <strong role="status" aria-live="polite" aria-atomic="true">
              <span key={selected.length} className="comparison-count">
                {selected.length} {selected.length === 1 ? "offer" : "offers"}{" "}
                selected
              </span>
            </strong>
            <span className="muted">
              {money(
                offers
                  .filter((o) => selected.includes(o.id))
                  .reduce((s, o) => s + o.priceCents, 0),
              )}{" "}
              total
            </span>
          </div>
          <div>
            <button className="text-button" onClick={() => setSelected([])}>
              Clear
            </button>
            <button
              className="button button-primary"
              onClick={review}
              disabled={quoting}
            >
              {quoting ? "Preparing quote…" : "Compare & review"}
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}
      <OfferDetail
        offer={detail}
        onClose={() => setDetail(null)}
        selected={!!detail && selected.includes(detail.id)}
        onToggle={() => detail && toggle(detail.id)}
      />
      <QuoteReview quote={quote} onClose={() => setQuote(null)} />
    </div>
  );
}
export function OfferCard({
  offer,
  selected,
  onToggle,
  onOpen,
}: {
  offer: Offer;
  selected: boolean;
  onToggle: () => void;
  onOpen: () => void;
}) {
  return (
    <article
      data-reveal
      className={`offer-card ${selected ? "offer-selected" : ""}`}
    >
      <div className="offer-card-top">
        <div className="provider">
          <span className={`provider-logo provider-${offer.seller.color}`}>
            {offer.seller.initials}
          </span>
          <span>{offer.seller.name}</span>
        </div>
        <button
          className={`select-offer ${selected ? "is-selected" : ""}`}
          aria-label={`${selected ? "Remove" : "Select"} ${offer.title}`}
          aria-pressed={selected}
          onClick={onToggle}
        >
          {selected ? <Check size={16} /> : <Plus size={16} />}
        </button>
      </div>
      <button className="offer-title-button" onClick={onOpen}>
        <h3>{offer.title}</h3>
      </button>
      <p>{offer.description}</p>
      <div className="offer-tags">
        <span>{offer.category}</span>
        {offer.accessClass === "summary_only" && <span>Aggregate only</span>}
      </div>
      <div className="offer-metadata">
        <Clock3 size={12} />
        <span>{ageLabel(offer.freshnessAt)}</span>
        <span className="small-dot">·</span>
        <span>Up to {offer.recordLimit} records</span>
      </div>
      <div className="offer-card-bottom">
        <div>
          <strong>{money(offer.priceCents)}</strong>
          <span>/ scoped batch</span>
        </div>
        <button
          className="offer-view"
          onClick={onOpen}
          aria-label={`View ${offer.title}`}
        >
          <ArrowUpRight size={18} />
        </button>
      </div>
    </article>
  );
}
export function OfferDetail({
  offer,
  onClose,
  selected,
  onToggle,
}: {
  offer: Offer | null;
  onClose: () => void;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <Modal
      open={!!offer}
      onOpenChange={(open) => !open && onClose()}
      title={offer?.title || "Offer details"}
      description="Source details and sample records."
      wide
    >
      {offer && (
        <div className="offer-detail">
          <div className="detail-provider">
            <div className="provider">
              <span className={`provider-logo provider-${offer.seller.color}`}>
                {offer.seller.initials}
              </span>
              <span>
                {offer.seller.name}
                <small>Data provider</small>
              </span>
            </div>
            <div className="detail-price">
              {money(offer.priceCents)}
              <small>USD / scoped batch</small>
            </div>
          </div>
          <p className="detail-description">{offer.description}</p>
          <div className="detail-facts">
            <div>
              <span>Coverage</span>
              <strong>{offer.coverage}</strong>
            </div>
            <div>
              <span>Declared snapshot</span>
              <strong>{new Date(offer.freshnessAt).toLocaleString()}</strong>
            </div>
            <div>
              <span>Scope</span>
              <strong>
                Up to {offer.recordLimit} records · v{offer.version}
              </strong>
            </div>
            <div>
              <span>Access</span>
              <strong>{offer.accessClass.replaceAll("_", " ")}</strong>
            </div>
          </div>
          {offer.sourceUrl && (
            <p className="caption">
              {offer.sourceAttribution}{" "}
              <a
                className="text-link"
                href={offer.sourceUrl}
                target="_blank"
                rel="noreferrer"
              >
                View original source <ArrowUpRight size={12} />
              </a>
            </p>
          )}
          <h4>Available fields</h4>
          <div className="field-chips">
            {offer.fields.map((f) => (
              <span key={f}>
                <Check size={12} />
                {f}
              </span>
            ))}
          </div>
          <h4>Restricted fields</h4>
          <div className="field-chips prohibited">
            {offer.prohibited.map((f) => (
              <span key={f}>
                <X size={12} />
                {f}
              </span>
            ))}
          </div>
          <div className="licence-box">
            <ShieldCheck size={18} />
            <div>
              <strong>Usage licence</strong>
              <p>{offer.license}</p>
              <small>Permitted purposes: {offer.purposes.join(", ")}</small>
            </div>
          </div>
          <h4>
            Approved public preview <Badge>2 sample rows</Badge>
          </h4>
          <DataTable rows={offer.preview as Record<string, unknown>[]} />
          <p className="caption">
            Preview only. Purchase to access the full scoped batch.
          </p>
          <div className="dialog-actions">
            <button className="button button-secondary" onClick={onClose}>
              Back to catalogue
            </button>
            <button className="button button-primary" onClick={onToggle}>
              {selected ? <Check size={16} /> : <Plus size={16} />}{" "}
              {selected ? "Added to comparison" : "Add to comparison"}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
