"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  FileText,
  Scale,
  ChartNoAxesCombined,
  Fingerprint,
  Layers3,
  Check,
  Cable,
} from "lucide-react";
import { Logo } from "./ui";
import { api } from "@/lib/client";
import type { Offer, UserView } from "@/lib/types";
const chapters = [
  {
    title: (
      <>
        Bring the missing
        <br />
        pieces <em>together.</em>
      </>
    ),
    copy: "Find research data. Approve the price. Give your agent better context.",
  },
  {
    title: (
      <>
        A question.
        <br />
        <em>A direction.</em>
      </>
    ),
    copy: "Tell Trove what your agent needs. Find sources that fit the task.",
  },
  {
    title: (
      <>
        More context.
        <br />
        <em>Less guesswork.</em>
      </>
    ),
    copy: "See the scope, the source, and the price. You decide what comes next.",
  },
  {
    title: (
      <>
        Good sources.
        <br />
        <em>Stronger beginnings.</em>
      </>
    ),
    copy: "Put the right data to work in your agent. Keep a clear path back to its source.",
  },
];
export function Landing() {
  const story = useRef<HTMLElement>(null),
    canvas = useRef<HTMLCanvasElement>(null),
    progress = useRef(0);
  const [stage, setStage] = useState(0),
    [mode, setMode] = useState("loading"),
    [offer, setOffer] = useState<Offer | null>(null),
    [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    api<{ offers: Offer[]; user: UserView | null }>("/bootstrap", {
      signal: controller.signal,
    })
      .then((data) => {
        setOffer(
          data.offers.find((o) => o.category === "Drug recalls") ||
            data.offers[0] ||
            null,
        );
        setSignedIn(!!data.user);
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);
  useEffect(() => {
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    let disposed = false,
      cleanup: (() => void) | undefined,
      generation = 0,
      frame = 0;
    const update = () => {
      frame = 0;
      if (!story.current) return;
      const r = story.current.getBoundingClientRect(),
        range = Math.max(1, r.height - innerHeight);
      progress.current = Math.max(0, Math.min(1, -r.top / range));
      story.current.style.setProperty("--gather", String(progress.current));
      setStage(Math.min(3, Math.floor(progress.current * 3.99)));
    };
    const scroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const configure = async () => {
      const run = ++generation;
      cleanup?.();
      cleanup = undefined;
      if (preference.matches) {
        setMode("reduced");
        return;
      }
      setMode("loading");
      try {
        const { mountConvergence } = await import("./convergence-scene");
        if (disposed || run !== generation || !canvas.current) return;
        cleanup = mountConvergence(
          canvas.current,
          () => progress.current,
          () => {
            cleanup?.();
            setMode("fallback");
          },
        );
        setMode("ready");
      } catch {
        if (!disposed && run === generation) setMode("fallback");
      }
    };
    window.addEventListener("scroll", scroll, { passive: true });
    window.addEventListener("resize", scroll);
    preference.addEventListener("change", configure);
    configure();
    update();
    return () => {
      disposed = true;
      generation++;
      cancelAnimationFrame(frame);
      cleanup?.();
      window.removeEventListener("scroll", scroll);
      window.removeEventListener("resize", scroll);
      preference.removeEventListener("change", configure);
    };
  }, []);
  const destination = signedIn ? "/dashboard" : "/sign-in";
  return (
    <div className="landing" data-graphics={mode}>
      <a href="#landing-exit" className="skip-link">
        Skip the story
      </a>
      <header className="landing-nav">
        <Link href="/" aria-label="Trove home">
          <Logo />
        </Link>
        <nav aria-label="Main navigation">
          <Link href="#chapter-question" className="landing-about">
            How it connects
          </Link>
          <Link href={destination}>{signedIn ? "Dashboard" : "Sign in"}</Link>
          <Link href={destination} className="landing-cta">
            {signedIn ? "Open workspace" : "Get started"}
            <ArrowUpRight size={16} />
          </Link>
        </nav>
      </header>
      <main>
        <section
          ref={story}
          className="convergence-story"
          data-stage={stage}
          aria-label="From scattered sources to connected context"
        >
          <div className="convergence-stage">
            <canvas
              ref={canvas}
              aria-hidden="true"
              className="convergence-canvas"
            />
            <div className="scene-guide" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <div className="source-fragments">
              <details className="source-fragment fragment-medical">
                <summary>
                  <span className="fragment-icon">
                    <FileText size={19} />
                  </span>
                  <span>
                    Medical & regulatory<small>Available today</small>
                    {offer && (
                      <small className="fragment-record">
                        {offer.fields
                          .slice(0, 2)
                          .map((f) => f.replaceAll("_", " "))
                          .join(" · ")}
                      </small>
                    )}
                  </span>
                  <ArrowUpRight size={14} />
                  <span className="fragment-hover-source" aria-hidden="true">
                    {offer?.sourceAttribution || "Public regulatory sources"}
                  </span>
                </summary>
                <div className="fragment-detail">
                  <strong>
                    {offer?.title || "Regulatory research sources"}
                  </strong>
                  <p>
                    {offer
                      ? `${offer.recordLimit} records per scoped batch · ${offer.fields
                          .slice(0, 2)
                          .map((f) => f.replaceAll("_", " "))
                          .join(", ")}`
                      : "Browse the catalogue for source scope and availability."}
                  </p>
                  <Link href="/discover">
                    View available sources <ArrowUpRight size={13} />
                  </Link>
                  {offer?.sourceUrl && (
                    <a href={offer.sourceUrl} target="_blank" rel="noreferrer">
                      Original source <ArrowUpRight size={13} />
                    </a>
                  )}
                </div>
              </details>
              <details className="source-fragment fragment-legal">
                <summary>
                  <span className="fragment-icon">
                    <Scale size={19} />
                  </span>
                  <span>
                    Legal intelligence<small>Future domains</small>
                  </span>
                  <ArrowUpRight size={14} />
                </summary>
                <div className="fragment-detail">
                  <p>
                    Case law, decisions, and filings. A future direction for
                    Trove; not currently in the catalogue.
                  </p>
                </div>
              </details>
              <details className="source-fragment fragment-finance">
                <summary>
                  <span className="fragment-icon">
                    <ChartNoAxesCombined size={19} />
                  </span>
                  <span>
                    Financial research<small>Future domains</small>
                  </span>
                  <ArrowUpRight size={14} />
                </summary>
                <div className="fragment-detail">
                  <p>
                    Market disclosures and financial records. A future direction
                    for Trove; not currently in the catalogue.
                  </p>
                </div>
              </details>
              <div className="context-bundle" aria-hidden="true">
                <Layers3 size={26} />
                <div>
                  <strong>Context, connected.</strong>
                  <span>Scoped. Source-linked. Yours to approve.</span>
                </div>
                <Check size={18} />
              </div>
            </div>
            <div className="story-progress" aria-hidden="true">
              <span>
                {
                  [
                    "Scattered sources",
                    "A question creates direction",
                    "Context takes shape",
                    "Ready for your agent",
                  ][stage]
                }
              </span>
              <div>
                {chapters.map((_, i) => (
                  <b key={i} className={stage === i ? "active" : ""} />
                ))}
              </div>
            </div>
          </div>
          <div className="story-chapters">
            {chapters.map((chapter, i) => (
              <section className={`story-chapter chapter-${i}`} key={i}>
                <div className="chapter-content">
                  {i === 0 ? (
                    <h1>{chapter.title}</h1>
                  ) : (
                    <h2>{chapter.title}</h2>
                  )}
                  <p>{chapter.copy}</p>
                  {i === 0 ? (
                    <>
                      <Link href={destination} className="landing-cta">
                        {signedIn ? "Open dashboard" : "Get started"}
                        <ArrowUpRight size={18} />
                      </Link>
                      <a href="#landing-exit" className="story-skip">
                        Skip the story <ArrowRight size={14} />
                      </a>
                    </>
                  ) : i === 1 ? (
                    <blockquote>
                      “Find recent drug recalls and the reasons behind them.”
                    </blockquote>
                  ) : i === 2 ? (
                    <div className="story-approval">
                      <Fingerprint size={20} />
                      <span>
                        Source and scope first.
                        <br />
                        <strong>
                          Nothing purchased without your approval.
                        </strong>
                      </span>
                    </div>
                  ) : (
                    <Link href={destination} className="landing-cta">
                      {signedIn ? "Open dashboard" : "Start your research"}
                      <ArrowUpRight size={18} />
                    </Link>
                  )}
                </div>
                {i === 0 && (
                  <a className="story-scroll" href="#chapter-question">
                    <ArrowDown size={15} />
                    Scroll to connect the dots
                  </a>
                )}
                {i === 1 && (
                  <span id="chapter-question" className="chapter-anchor" />
                )}
              </section>
            ))}
          </div>
        </section>
        <section className="landing-exit" id="landing-exit">
          <div>
            <Cable size={31} strokeWidth={1.3} />
            <h2>
              Your agent.
              <br />
              <em>Better informed.</em>
            </h2>
            <p>A clearer path from the source to your next step.</p>
            <Link href={destination} className="landing-cta">
              {signedIn ? "Open dashboard" : "Get started"}
              <ArrowUpRight size={18} />
            </Link>
          </div>
          <div className="landing-principles">
            <article>
              <FileText size={21} />
              <h3>Know the source.</h3>
              <p>Inspect scope, provenance, and licence before you buy.</p>
            </article>
            <article>
              <Fingerprint size={21} />
              <h3>Stay in control.</h3>
              <p>Review an exact price. Approve each purchase yourself.</p>
            </article>
            <article>
              <Cable size={21} />
              <h3>Use your own agent.</h3>
              <p>Connect Codex or Claude with scoped, revocable access.</p>
            </article>
          </div>
        </section>
      </main>
      <footer className="landing-footer">
        <Link href="/" aria-label="Trove home">
          <Logo small />
        </Link>
        <span>Many sources. A clearer starting point.</span>
        <nav aria-label="Legal">
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/discover">
            Catalogue <ArrowUpRight size={13} />
          </Link>
        </nav>
      </footer>
    </div>
  );
}
