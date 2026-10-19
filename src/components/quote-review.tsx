"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  Clock3,
  FlaskConical,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import type { PurchaseView, QuoteView } from "@/lib/types";
import { money } from "@/lib/types";
import { post } from "@/lib/client";
import { useTrove } from "./trove-app";
import { Badge, Modal, Notice } from "./ui";
export function QuoteReview({
  quote,
  onClose,
}: {
  quote: QuoteView | null;
  onClose: () => void;
}) {
  const { capabilities, notify } = useTrove();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!quote) return;
    const update = () =>
      setSeconds(
        Math.max(
          0,
          Math.floor((new Date(quote.expiresAt).getTime() - Date.now()) / 1000),
        ),
      );
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [quote]);
  async function checkout(mode: "sandbox" | "simulation") {
    if (!quote) return;
    try {
      setBusy(true);
      const { purchase } = await post<{ purchase: PurchaseView }>(
        "/purchases",
        { quoteId: quote.id, mode, idempotencyKey: `${mode}:${quote.id}` },
      );
      onClose();
      router.push(`/purchases/${purchase.id}`);
    } catch (e) {
      notify((e as Error).message, true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      open={!!quote}
      onOpenChange={(open) => !open && onClose()}
      title="Review your purchase plan"
      description="A fixed scope. An exact amount. Your explicit approval."
      wide
    >
      {quote && (
        <div className="quote-review">
          <div className="quote-meta">
            <Badge tone="green">
              <LockKeyhole size={11} />
              Immutable quote
            </Badge>
            <span className={seconds === 0 ? "error-text" : "muted"}>
              <Clock3 size={13} />
              {seconds
                ? `Expires in ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`
                : "Quote expired"}
            </span>
          </div>
          <div className="quote-lines">
            {quote.lines.map((line) => (
              <div className="quote-line" key={line.id}>
                <span
                  className={`provider-logo provider-${line.offer.seller.color}`}
                >
                  {line.offer.seller.initials}
                </span>
                <div>
                  <strong>{line.snapshot.title}</strong>
                  <span>
                    {line.snapshot.sellerName} · Version {line.snapshot.version}{" "}
                    · {line.quantity} records
                  </span>
                  <small>{line.fields.join(" · ")}</small>
                  <span className="quote-license">
                    <ShieldCheck size={12} />
                    {quote.purpose.replaceAll("_", " ")}
                  </span>
                </div>
                <strong>{money(line.priceCents)}</strong>
              </div>
            ))}
          </div>
          <div className="quote-breakdown">
            <div>
              <span>Seller earnings</span>
              <span>{money(quote.totalCents - quote.commissionCents)}</span>
            </div>
            <div>
              <span>
                Trove commission <small>(included, illustrative)</small>
              </span>
              <span>{money(quote.commissionCents)}</span>
            </div>
            <div className="quote-total">
              <span>Total approval amount</span>
              <span>
                {money(quote.totalCents)} <small>USD</small>
              </span>
            </div>
          </div>
          <div className="approval-promises">
            <span>
              <Check size={14} />
              All results checked before capture
            </span>
            <span>
              <Check size={14} />
              No substitutions without a new approval
            </span>
            <span>
              <Check size={14} />A source-linked, itemised receipt
            </span>
          </div>
          <p className="caption">
            All selected providers and datasets are synthetic. Checks confirm
            the delivery contract, not the truth of the information. The task
            budget is a Trove limit; this approval covers only{" "}
            {money(quote.totalCents)}.
          </p>
          {!capabilities.paypal && (
            <Notice>
              PayPal Sandbox is not connected yet. Real sandbox checkout becomes
              available after the collection account credentials are configured.
            </Notice>
          )}
          <button
            className="button button-paypal"
            disabled={!capabilities.paypal || busy || seconds === 0}
            onClick={() => checkout("sandbox")}
          >
            <span className="paypal-wordmark">PayPal</span>
            <span>Continue to sandbox checkout</span>
            <ArrowRight size={17} />
          </button>
          {capabilities.simulation && (
            <div className="simulation-option">
              <div>
                <FlaskConical size={16} />
                <span>Explore the complete flow without credentials.</span>
              </div>
              <button
                className="button button-secondary"
                disabled={busy || seconds === 0}
                onClick={() => checkout("simulation")}
              >
                {busy ? "Preparing…" : "Continue in simulation"}
                <ArrowRight size={15} />
              </button>
              <small>
                No PayPal transaction. Simulated references and earnings only.
              </small>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
