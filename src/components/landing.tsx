"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Database,
  FileText,
  Fingerprint,
  Cable,
} from "lucide-react";
import { Logo } from "./ui";
import { api } from "@/lib/client";
import type { Offer, UserView } from "@/lib/types";
import { money } from "@/lib/types";

const steps = [
  {
    id: "find",
    label: "Find the right sources",
    title: "A better starting point.",
    copy: "Set the fields, freshness, and scope you need. Compare sources against your actual requirements.",
  },
  {
    id: "approve",
    label: "Approve the scope",
    title: "Your research. Your decision.",
    copy: "Review the records, licence, and total price before you approve a purchase.",
  },
  {
    id: "reuse",
    label: "Keep what you buy",
    title: "Good data stays yours.",
    copy: "Return to your purchased scope without paying again. Buy an updated version when you need it.",
  },
  {
    id: "connect",
    label: "Work with your agent",
    title: "Context, wherever you work.",
    copy: "Connect your Trove account to ChatGPT, Claude, or Codex through MCP.",
  },
];
const fieldLabel = (s: string) => s.replaceAll("_", " ");

export function Landing() {
  const [sources, setSources] = useState<Offer[]>([]);
  const [selected, setSelected] = useState(0);
  const [category, setCategory] = useState("All sources");
  const [signedIn, setSignedIn] = useState(false);
  const [active, setActive] = useState("find");
  const [graphics, setGraphics] = useState("loading");
  const scene = useRef<HTMLElement>(null),
    canvas = useRef<HTMLCanvasElement>(null),
    progress = useRef(0);
  useEffect(() => {
    const controller = new AbortController();
    api<{ offers: Offer[]; user: UserView | null }>("/bootstrap", {
      signal: controller.signal,
    })
      .then((data) => {
        setSources(data.offers.filter((o) => o.available));
        setSignedIn(!!data.user);
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);
  useEffect(() => {
    const chapters = steps.map((s) => document.getElementById(`step-${s.id}`));
    let frame = 0;
    const update = () => {
      frame = 0;
      const current = [...chapters]
        .reverse()
        .find(
          (el) => el && el.getBoundingClientRect().top <= innerHeight * 0.45,
        );
      setActive(current?.id.replace("step-", "") || "find");
      if (scene.current) {
        const r = scene.current.getBoundingClientRect();
        progress.current = Math.max(
          0,
          Math.min(1, (innerHeight - r.top) / (innerHeight + r.height)),
        );
      }
    };
    const scroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    addEventListener("scroll", scroll, { passive: true });
    addEventListener("resize", scroll);
    update();
    return () => {
      cancelAnimationFrame(frame);
      removeEventListener("scroll", scroll);
      removeEventListener("resize", scroll);
    };
  }, []);
  useEffect(() => {
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    let disposed = false,
      generation = 0,
      cleanup: (() => void) | undefined;
    const configure = async () => {
      const run = ++generation;
      cleanup?.();
      cleanup = undefined;
      if (preference.matches) {
        setGraphics("reduced");
        return;
      }
      try {
        const { mountConvergence } = await import("./convergence-scene");
        if (disposed || run !== generation || !canvas.current) return;
        cleanup = mountConvergence(
          canvas.current,
          () => progress.current,
          () => setGraphics("fallback"),
        );
        setGraphics("ready");
      } catch {
        if (!disposed && run === generation) setGraphics("fallback");
      }
    };
    configure();
    preference.addEventListener("change", configure);
    return () => {
      disposed = true;
      generation++;
      cleanup?.();
      preference.removeEventListener("change", configure);
    };
  }, []);
  const destination = signedIn ? "/dashboard" : "/sign-in";
  const filtered = sources.filter(
    (o) => category === "All sources" || o.category === category,
  );
  const offer = filtered[selected] || filtered[0];
  return (
    <div className="landing" data-graphics={graphics}>
      <a className="skip-link" href="#landing-exit">
        Skip the story
      </a>
      <header className="landing-nav">
        <div className="landing-nav-inner">
          <Link href="/" aria-label="Trove home">
            <Logo />
          </Link>
          <nav aria-label="Main navigation">
            <a className="landing-about" href="#sources">
              Sources
            </a>
            <a className="landing-about" href="#how-it-works">
              How it works
            </a>
            <Link className="landing-about" href="/connect">
              For agents
            </Link>
          </nav>
          <div className="landing-nav-actions">
            <Link href={destination} className="landing-signin">
              {signedIn ? "Dashboard" : "Sign in"}
            </Link>
            <Link href={destination} className="landing-cta">
              {signedIn ? "Open workspace" : "Get started"}
              <ArrowUpRight size={15} />
            </Link>
          </div>
        </div>
      </header>
      <main>
        <section className="landing-hero landing-frame">
          <h1>
            Better sources.
            <br />
            <span>Sharper research.</span>
          </h1>
          <p>
            Find the data your agent is missing.
            <br />
            Choose the scope. Approve the price. Put it to work.
          </p>
          <div className="landing-actions">
            <Link href={destination} className="landing-cta">
              Get started <ArrowRight size={16} />
            </Link>
            <a href="#sources" className="landing-text-link">
              Explore sources <ArrowDownIcon />
            </a>
          </div>
          <div className="hero-connectors" aria-hidden="true">
            <span>Research question</span>
            <i />
            <span>Source discovery</span>
            <i />
            <span>Better context</span>
          </div>
        </section>
        <section
          id="sources"
          className="landing-frame landing-catalogue"
          aria-labelledby="source-heading"
        >
          <div className="landing-section-label">
            <span id="source-heading">Explore the source layer</span>
            <Link href="/discover">
              Open catalogue <ArrowUpRight size={14} />
            </Link>
          </div>
          <div className="landing-browser">
            <div
              className="landing-source-categories"
              aria-label="Source categories"
            >
              {["All sources", ...new Set(sources.map((o) => o.category))].map(
                (c) => (
                  <button
                    key={c}
                    onClick={() => {
                      setCategory(c);
                      setSelected(0);
                    }}
                    aria-pressed={category === c}
                  >
                    {c}
                    <span>
                      {c === "All sources"
                        ? sources.length
                        : sources.filter((o) => o.category === c).length}
                    </span>
                  </button>
                ),
              )}
              <div className="source-category-note">
                <Database size={17} />
                <span>
                  Medical & regulatory
                  <br />
                  <small>Available today</small>
                </span>
              </div>
            </div>
            <div className="landing-source-main">
              <div
                className="landing-source-table"
                aria-label="Available sources"
              >
                <div className="source-table-head">
                  <span>Source</span>
                  <span>Scope</span>
                  <span>Price</span>
                </div>
                {filtered.length ? (
                  filtered.map((o, index) => (
                    <button
                      key={o.id}
                      aria-pressed={offer?.id === o.id}
                      onClick={() => setSelected(index)}
                    >
                      <span>
                        <FileText size={16} />
                        <span>
                          <strong>{o.title}</strong>
                          <small>{o.seller.name}</small>
                        </span>
                      </span>
                      <span>{o.recordLimit} records</span>
                      <span>
                        {money(o.priceCents)}
                        <ArrowUpRight size={13} />
                      </span>
                    </button>
                  ))
                ) : (
                  <p className="landing-source-loading">
                    Browse the catalogue to see current availability.
                  </p>
                )}
              </div>
              {offer && (
                <div className="landing-source-inspector" key={offer.id}>
                  <div>
                    <h2>{offer.title}</h2>
                    <p>{offer.description}</p>
                  </div>
                  <div className="landing-field-list">
                    {offer.fields.slice(0, 5).map((f) => (
                      <span key={f}>
                        <Check size={12} />
                        {fieldLabel(f)}
                      </span>
                    ))}
                  </div>
                  <div className="landing-source-list">
                    <Link
                      href={`/discover?source=${encodeURIComponent(offer.id)}`}
                    >
                      Preview source <ArrowUpRight size={15} />
                    </Link>
                    <span>{offer.sourceAttribution}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="landing-domain-note">
            <span>Built for research that needs a source.</span>
            <span>
              Legal & financial data <small>Future domains</small>
            </span>
          </div>
        </section>
        <section id="how-it-works" className="landing-frame landing-workflow">
          <div className="landing-intro">
            <h2>
              Let your agent ask.
              <br />
              <span>Give it something worth knowing.</span>
            </h2>
          </div>
          <div
            className="landing-chapters"
            data-stage={steps.findIndex((s) => s.id === active)}
          >
            <nav
              className="landing-chapter-index"
              aria-label="Research workflow"
            >
              {steps.map((s) => (
                <a
                  key={s.id}
                  href={`#step-${s.id}`}
                  aria-current={active === s.id ? "step" : undefined}
                >
                  {s.label}
                </a>
              ))}
            </nav>
            <div className="landing-chapter-content">
              {steps.map((step, index) => (
                <article
                  id={`step-${step.id}`}
                  className="landing-chapter"
                  key={step.id}
                >
                  <div className="landing-chapter-copy">
                    <span className="chapter-number">0{index + 1}</span>
                    <h3>
                      {step.title} <span>{step.copy}</span>
                    </h3>
                  </div>
                  <div className={`landing-product-scene scene-${step.id}`}>
                    {index === 0 ? (
                      <div className="landing-scope-surface">
                        <div className="surface-toolbar">
                          <FileText size={15} />
                          Research requirements
                        </div>
                        <div className="scope-row">
                          <span>Domain</span>
                          <strong>Drug recalls</strong>
                        </div>
                        <div className="scope-row">
                          <span>Required fields</span>
                          <strong>Classification, reason, source</strong>
                        </div>
                        <div className="scope-row">
                          <span>Freshness</span>
                          <strong>Within 30 days</strong>
                        </div>
                        <Link href="/workspace?start=drug-recalls">
                          Set your requirements <ArrowRight size={14} />
                        </Link>
                      </div>
                    ) : index === 1 ? (
                      <div className="approval-scene">
                        <div className="approval-scope">
                          <Fingerprint size={26} strokeWidth={1} />
                          <strong>Only the scope you choose.</strong>
                          <span>Records · Fields · Permitted use</span>
                        </div>
                        <div className="approval-check">
                          <Check size={18} />
                          <span>
                            Review first.
                            <br />
                            <strong>Approve when you’re ready.</strong>
                          </span>
                        </div>
                      </div>
                    ) : index === 2 ? (
                      <div className="reuse-scene">
                        <div>
                          <Database size={22} />
                          <strong>Your data library</strong>
                          <span>Purchased scope & source version</span>
                        </div>
                        <div className="reuse-route">
                          <span>Same purchased scope</span>
                          <strong>Reuse</strong>
                          <Check size={15} />
                        </div>
                        <div className="reuse-route">
                          <span>Updated source version</span>
                          <strong>Review price</strong>
                          <ArrowRight size={15} />
                        </div>
                      </div>
                    ) : (
                      <div className="agent-scene">
                        <div className="agent-clients">
                          <span>ChatGPT</span>
                          <span>Claude</span>
                          <span>Codex</span>
                        </div>
                        <div className="agent-route">
                          <i />
                          <Cable size={22} />
                          <i />
                        </div>
                        <div className="agent-trove">
                          <Logo small />
                          <span>Your sources. Your account.</span>
                        </div>
                        <Link href="/connect">
                          Connect through MCP <ArrowUpRight size={14} />
                        </Link>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
        <section
          ref={scene}
          className="landing-context"
          aria-labelledby="context-heading"
        >
          <div className="landing-frame context-frame">
            <h2 id="context-heading">
              Every piece.
              <br />
              <span>A clearer picture.</span>
            </h2>
            <p>
              Source, scope, and provenance.
              <br />
              Together with the data you put to work.
            </p>
            <div className="connection-art" aria-hidden="true">
              <canvas ref={canvas} />
              <div className="connection-static" />
              <span className="context-center">
                <Logo small />
              </span>
              <span className="context-node node-a">Source</span>
              <span className="context-node node-b">Scope</span>
              <span className="context-node node-c">Provenance</span>
              <span className="context-node node-d">Your agent</span>
            </div>
            <div className="context-principles">
              <span>
                <Fingerprint size={19} />
                Traceable to its source.
              </span>
              <span>
                <Check size={19} />
                Approved by you.
              </span>
              <span>
                <Database size={19} />
                Ready to use again.
              </span>
            </div>
          </div>
        </section>
        <section id="landing-exit" className="landing-frame landing-finale">
          <h2>
            Your next question.
            <br />
            <span>A stronger starting point.</span>
          </h2>
          <Link href={destination} className="landing-cta">
            Get started <ArrowUpRight size={16} />
          </Link>
        </section>
      </main>
      <footer className="landing-frame landing-footer">
        <Logo small />
        <div>
          <Link href="/discover">Sources</Link>
          <Link href="/connect">Connect an agent</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </div>
        <span>© {new Date().getFullYear()} Trove</span>
      </footer>
    </div>
  );
}
function ArrowDownIcon() {
  return <ArrowRight className="arrow-down" size={15} />;
}
