"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Download, Search } from "lucide-react";
import { api } from "@/lib/client";
import type { LibraryPage } from "@/lib/types";
import { purposeLabel, money } from "@/lib/types";
import { useTrove } from "./trove-context";
import { Badge, downloadJson, EmptyState, Loading, Notice } from "./ui";

export function PurchaseViews({ data = false }: { data?: boolean }) {
  return (
    <nav className="purchase-views" aria-label="Data and purchases">
      <Link
        href="/purchases?view=data"
        aria-current={data ? "page" : undefined}
      >
        Your data
      </Link>
      <Link href="/purchases" aria-current={!data ? "page" : undefined}>
        Purchase history
      </Link>
    </nav>
  );
}

export function EvidenceDownload({ purchaseId }: { purchaseId: string }) {
  const { notify } = useTrove();
  const [busy, setBusy] = useState(false);
  return (
    <button
      className="button button-secondary"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          downloadJson(
            await api(`/purchases/${purchaseId}/evidence`),
            `trove-evidence-${purchaseId}.json`,
          );
        } catch (error) {
          notify((error as Error).message, true);
        } finally {
          setBusy(false);
        }
      }}
    >
      <Download size={15} />
      {busy ? "Preparing…" : "Evidence pack"}
    </button>
  );
}

export function OwnedData() {
  const { user, ensureAuth } = useTrove();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState<LibraryPage>({
    items: [],
    nextCursor: null,
  });
  const [busy, setBusy] = useState(true),
    [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const pending = useRef<AbortController | null>(null);
  async function load(cursor?: string) {
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true);
    setError("");
    try {
      const search = new URLSearchParams({ query });
      if (cursor) search.set("cursor", cursor);
      const result = await api<LibraryPage>(`/library?${search}`, {
        signal: controller.signal,
      });
      if (!controller.signal.aborted)
        setPage((old) => ({
          ...result,
          items: cursor ? [...old.items, ...result.items] : result.items,
        }));
    } catch (e) {
      if (!controller.signal.aborted) setError((e as Error).message);
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  useEffect(() => {
    pending.current?.abort();
    setPage({ items: [], nextCursor: null });
    setError("");
    if (!user) {
      setBusy(false);
      return;
    }
    setBusy(true);
    const timer = setTimeout(() => void load(), query ? 200 : 0);
    return () => {
      clearTimeout(timer);
      pending.current?.abort();
    };
  }, [user?.workspaceId, query, revision]);
  return (
    <div className="page-enter">
      <section className="page-heading compact-heading">
        <div>
          <h1>Your data</h1>
          <p>Purchased sources, ready to use again.</p>
        </div>
        <Link className="button button-secondary" href="/discover">
          Explore data <ArrowRight size={16} />
        </Link>
      </section>
      <PurchaseViews data />
      {!user ? (
        <EmptyState
          title="Your data lives here"
          description="Sign in to access your purchased sources."
          action={
            <button
              className="button button-primary"
              onClick={() => ensureAuth()}
            >
              Sign in
            </button>
          }
        />
      ) : (
        <>
          <label className="search-input library-search">
            <Search size={18} />
            <span className="sr-only">Search purchased sources</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              maxLength={200}
              placeholder="Search datasets or providers…"
            />
          </label>
          {error && (
            <Notice kind="error">
              {error}{" "}
              <button
                className="text-button"
                onClick={() => setRevision((n) => n + 1)}
              >
                Try again
              </button>
            </Notice>
          )}
          {busy && !page.items.length ? (
            <Loading label="Loading your data…" />
          ) : !error && !page.items.length ? (
            <EmptyState
              title={
                query
                  ? "No matching sources"
                  : "Your library starts with a purchase"
              }
              description={
                query
                  ? "Try a dataset or provider name."
                  : "Purchased data stays linked to its original scope and receipt."
              }
              action={
                query ? (
                  <button
                    className="button button-secondary"
                    onClick={() => setQuery("")}
                  >
                    Clear search
                  </button>
                ) : (
                  <Link className="button button-primary" href="/discover">
                    Browse sources <ArrowRight size={15} />
                  </Link>
                )
              }
            />
          ) : (
            <section
              className="panel owned-data-list"
              aria-label="Purchased sources"
            >
              {page.items.map((item) => (
                <article className="owned-source" key={item.id}>
                  <div className="owned-source-info">
                    <div className="owned-source-title">
                      <h2>
                        <Link href={`/purchases/${item.purchaseId}`}>
                          {item.title}
                        </Link>
                      </h2>
                      <Badge>v{item.version}</Badge>
                    </div>
                    <p>
                      {item.seller} · Purchased{" "}
                      {new Date(item.purchasedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}{" "}
                      · {money(item.priceCents)}
                    </p>
                    <details className="owned-source-scope">
                      <summary>
                        {item.quantity} records · {item.fields.length} fields ·{" "}
                        {purposeLabel(item.purpose)}
                      </summary>
                      <p>
                        {item.fields
                          .map((f) => f.replaceAll("_", " "))
                          .join(" · ")}
                      </p>
                      <p>
                        Source snapshot:{" "}
                        {new Date(item.freshnessAt).toLocaleDateString("en-US")}
                      </p>
                    </details>
                    {item.currentVersion && (
                      <Link
                        className="text-link source-version-link"
                        href={`/discover?source=${item.currentVersion.id}`}
                      >
                        Preview source version {item.currentVersion.version}{" "}
                        <ArrowUpRight size={14} />
                      </Link>
                    )}
                  </div>
                  <div className="owned-source-actions">
                    <Link
                      href={`/purchases/${item.purchaseId}`}
                      className="button button-primary"
                    >
                      Open data <ArrowRight size={15} />
                    </Link>
                    <EvidenceDownload purchaseId={item.purchaseId} />
                    <Link
                      href={`/purchases/${item.purchaseId}?tab=receipt`}
                      className="text-link"
                    >
                      Receipt <ArrowUpRight size={14} />
                    </Link>
                  </div>
                </article>
              ))}
            </section>
          )}
          {page.nextCursor && (
            <button
              className="button button-secondary library-more"
              disabled={busy}
              onClick={() => load(page.nextCursor!)}
            >
              {busy ? "Loading…" : "Load more sources"}
            </button>
          )}
        </>
      )}
    </div>
  );
}
