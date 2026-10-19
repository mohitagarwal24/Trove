"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Clock3, LockKeyhole, ShieldCheck } from "lucide-react";
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
  async function checkout() {
    if (!quote) return;
    try {
      setBusy(true);
      const { purchase } = await post<{ purchase: PurchaseView }>(
        "/purchases",
        { quoteId: quote.id, idempotencyKey: `paypal:${quote.id}` },
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
      description="Confirm the data, price and access terms."
      wide
    >
      {quote && (
        <div className="quote-review">
          <div className="quote-meta">
            <Badge tone="green">
              <LockKeyhole size={11} />
              Price reserved
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
                  {!!line.snapshot.filters?.length && (
                    <small>
                      {line.snapshot.filters
                        .map(
                          (f) =>
                            `${f.field.replaceAll("_", " ")} ${f.operator} ${f.value}`,
                        )
                        .join(" · ")}
                    </small>
                  )}
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
              <span>Data preparation</span>
              <span>{money(quote.totalCents - quote.commissionCents)}</span>
            </div>
            <div>
              <span>
                Trove fee <small>(included)</small>
              </span>
              <span>{money(quote.commissionCents)}</span>
            </div>
            <div className="quote-total">
              <span>Total</span>
              <span>
                {money(quote.totalCents)} <small>USD</small>
              </span>
            </div>
          </div>
          <details className="purchase-terms">
            <summary>Source licences and access</summary>
            {quote.lines.map((line) => (
              <p key={line.id}>
                <strong>{line.snapshot.title}</strong> — {line.snapshot.license}
              </p>
            ))}
            <p>
              Results are available for{" "}
              {quote.lines[0]?.snapshot.accessHours || 24} hours after delivery.
              You can download them during that period.
            </p>
          </details>
          {capabilities.paymentEnvironment === "sandbox" && (
            <p className="caption">PayPal Sandbox — no real money moves.</p>
          )}
          {!capabilities.paypal && (
            <Notice>
              Checkout is temporarily unavailable. Please try again later.
            </Notice>
          )}
          <button
            className="button button-paypal"
            disabled={!capabilities.paypal || busy || seconds === 0}
            onClick={checkout}
          >
            <span className="paypal-wordmark">PayPal</span>
            <span>Continue with PayPal</span>
            <ArrowRight size={17} />
          </button>
        </div>
      )}
    </Modal>
  );
}
