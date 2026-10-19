export const paymentEnvironment = (): "sandbox" | "live" =>
  process.env.PAYPAL_ENVIRONMENT === "live" ? "live" : "sandbox";
export function capabilities() {
  return {
    paypal: !!(
      process.env.PAYPAL_CLIENT_ID &&
      process.env.PAYPAL_CLIENT_SECRET &&
      process.env.PAYPAL_MERCHANT_ID
    ),
    paypalClientId: process.env.PAYPAL_CLIENT_ID || null,
    paymentEnvironment: paymentEnvironment(),
    payouts: process.env.PAYPAL_PAYOUTS_ENABLED === "true",
    ai: !!process.env.GEMINI_API_KEY,
  };
}
export const appUrl = () => process.env.APP_URL || "http://localhost:3000";

export function resultRetentionHours() {
  const hours = Number(process.env.RESULT_RETENTION_HOURS || 24);
  if (!Number.isInteger(hours) || hours < 1 || hours > 168)
    throw new Error("RESULT_RETENTION_HOURS must be between 1 and 168.");
  return hours;
}
