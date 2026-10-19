import { AppError, assert } from "@/lib/errors";
import { capabilities, appUrl, paymentEnvironment } from "@/lib/config";
import type { FullQuote } from "./quotes";
export type PaymentResource = {
  id: string;
  status: string;
  amount?: { value: string; currency_code: string };
  final_capture?: boolean;
  seller_receivable_breakdown?: {
    paypal_fee?: { value: string; currency_code: string };
  };
  links?: { rel: string; href: string }[];
  purchase_units?: {
    custom_id?: string;
    invoice_id?: string;
    amount?: { value: string; currency_code: string };
    payee?: { merchant_id: string };
    payments?: {
      authorizations?: PaymentResource[];
      captures?: PaymentResource[];
    };
  }[];
  batch_header?: { payout_batch_id: string; batch_status: string };
  items?: {
    payout_item_id: string;
    transaction_status: string;
    payout_item?: {
      sender_item_id?: string;
      receiver?: string;
      amount?: { currency: string; value: string };
    };
    payout_item_fee?: { value: string; currency?: string };
    errors?: { name: string; message: string };
  }[];
  verification_status?: string;
};
export class PayPalError extends AppError {
  constructor(
    message: string,
    public uncertain: boolean,
    public debugId?: string,
  ) {
    super("PAYPAL_ERROR", message, 502);
  }
}
let cachedToken:
  { value: string; until: number; environment: string } | undefined;
const base = () =>
  paymentEnvironment() === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
async function accessToken() {
  assert(
    capabilities().paypal,
    "PAYPAL_NOT_CONFIGURED",
    "Checkout is temporarily unavailable. Please try again later.",
    503,
  );
  if (
    cachedToken &&
    cachedToken.environment === paymentEnvironment() &&
    cachedToken.until > Date.now()
  )
    return cachedToken.value;
  const result = await fetch(base() + "/v1/oauth2/token", {
    method: "POST",
    headers: {
      Authorization:
        "Basic " +
        Buffer.from(
          process.env.PAYPAL_CLIENT_ID + ":" + process.env.PAYPAL_CLIENT_SECRET,
        ).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    signal: AbortSignal.timeout(20000),
  });
  const data = await result.json();
  if (!result.ok || !data.access_token)
    throw new PayPalError(
      "PayPal could not connect. Please try again later.",
      false,
      data.debug_id,
    );
  cachedToken = {
    value: data.access_token,
    environment: paymentEnvironment(),
    until: Date.now() + (data.expires_in - 60) * 1000,
  };
  return cachedToken.value;
}
export async function paypalRequest(
  path: string,
  method = "GET",
  body?: unknown,
  requestId?: string,
): Promise<PaymentResource> {
  const token = await accessToken();
  let response: Response;
  try {
    response = await fetch(base() + path, {
      method,
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
        Prefer: "return=representation",
        ...(requestId ? { "PayPal-Request-Id": requestId } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(25000),
    });
  } catch {
    throw new PayPalError(
      "PayPal did not return a definitive response. Reconciliation is required; the budget remains reserved.",
      true,
    );
  }
  if (response.status === 204) return { id: "", status: "VOIDED" };
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const issue = data.details?.[0]?.issue || data.name || response.status;
    throw new PayPalError(
      `PayPal: ${issue}. ${data.message || "The operation could not be completed."}`,
      response.status >= 500 || response.status === 429,
      data.debug_id,
    );
  }
  return data;
}
export function orderBody(purchaseId: string, quote: FullQuote) {
  const amount = {
    currency_code: "USD",
    value: (quote.totalCents / 100).toFixed(2),
  };
  return {
    intent: "AUTHORIZE",
    purchase_units: [
      {
        reference_id: purchaseId,
        custom_id: quote.planHash,
        invoice_id: purchaseId,
        payee: { merchant_id: process.env.PAYPAL_MERCHANT_ID },
        amount: { ...amount, breakdown: { item_total: amount } },
        items: quote.lines.map((line) => ({
          name: (line.snapshot as { title: string }).title.slice(0, 127),
          quantity: "1",
          category: "DIGITAL_GOODS",
          unit_amount: {
            currency_code: "USD",
            value: (line.priceCents / 100).toFixed(2),
          },
          description: `${line.quantity} records; version ${(line.snapshot as { version: number }).version}`,
        })),
      },
    ],
    payment_source: {
      paypal: {
        experience_context: {
          brand_name: "Trove",
          shipping_preference: "NO_SHIPPING",
          user_action: "PAY_NOW",
          return_url: `${appUrl()}/purchases/${purchaseId}?paypal=return`,
          cancel_url: `${appUrl()}/purchases/${purchaseId}?paypal=cancel`,
        },
      },
    },
  };
}
export function verifyOrder(
  order: PaymentResource,
  purchaseId: string,
  quote: FullQuote,
) {
  const unit = order.purchase_units?.[0];
  assert(
    order.purchase_units?.length === 1 &&
      unit?.custom_id === quote.planHash &&
      unit.invoice_id === purchaseId,
    "ORDER_MISMATCH",
    "PayPal order does not match the approved purchase plan.",
    409,
  );
  assert(
    unit.amount?.currency_code === "USD" &&
      unit.amount.value === (quote.totalCents / 100).toFixed(2),
    "AMOUNT_MISMATCH",
    "PayPal order amount does not match this quote.",
    409,
  );
  assert(
    unit.payee?.merchant_id === process.env.PAYPAL_MERCHANT_ID,
    "MERCHANT_MISMATCH",
    "PayPal order has an unexpected collection merchant.",
    409,
  );
}
export const paymentApi = {
  create: (purchaseId: string, quote: FullQuote, requestId: string) =>
    paypalRequest(
      "/v2/checkout/orders",
      "POST",
      orderBody(purchaseId, quote),
      requestId,
    ),
  order: (id: string) =>
    paypalRequest(`/v2/checkout/orders/${encodeURIComponent(id)}`),
  authorize: (id: string, requestId: string) =>
    paypalRequest(
      `/v2/checkout/orders/${encodeURIComponent(id)}/authorize`,
      "POST",
      {},
      requestId,
    ),
  capture: (id: string, cents: number, requestId: string) =>
    paypalRequest(
      `/v2/payments/authorizations/${encodeURIComponent(id)}/capture`,
      "POST",
      {
        amount: { currency_code: "USD", value: (cents / 100).toFixed(2) },
        final_capture: true,
      },
      requestId,
    ),
  void: (id: string, requestId: string) =>
    paypalRequest(
      `/v2/payments/authorizations/${encodeURIComponent(id)}/void`,
      "POST",
      {},
      requestId,
    ),
  refund: (id: string, requestId: string, reason: string) =>
    paypalRequest(
      `/v2/payments/captures/${encodeURIComponent(id)}/refund`,
      "POST",
      { note_to_payer: reason.slice(0, 255) },
      requestId,
    ),
  getRefund: (id: string) =>
    paypalRequest(`/v2/payments/refunds/${encodeURIComponent(id)}`),
};
export async function verifyWebhook(headers: Headers, event: unknown) {
  assert(
    process.env.PAYPAL_WEBHOOK_ID,
    "WEBHOOK_NOT_CONFIGURED",
    "Configure PAYPAL_WEBHOOK_ID before accepting events.",
    503,
  );
  for (const key of [
    "paypal-auth-algo",
    "paypal-cert-url",
    "paypal-transmission-id",
    "paypal-transmission-sig",
    "paypal-transmission-time",
  ])
    assert(
      headers.get(key),
      "INVALID_WEBHOOK",
      "Webhook signature headers are missing.",
      401,
    );
  const result = await paypalRequest(
    "/v1/notifications/verify-webhook-signature",
    "POST",
    {
      auth_algo: headers.get("paypal-auth-algo"),
      cert_url: headers.get("paypal-cert-url"),
      transmission_id: headers.get("paypal-transmission-id"),
      transmission_sig: headers.get("paypal-transmission-sig"),
      transmission_time: headers.get("paypal-transmission-time"),
      webhook_id: process.env.PAYPAL_WEBHOOK_ID,
      webhook_event: event,
    },
    crypto.randomUUID(),
  );
  assert(
    result.verification_status === "SUCCESS",
    "INVALID_WEBHOOK",
    "PayPal rejected this webhook signature.",
    401,
  );
}
