export function capabilities() {
  return {
    paypal: !!(
      process.env.PAYPAL_CLIENT_ID &&
      process.env.PAYPAL_CLIENT_SECRET &&
      process.env.PAYPAL_MERCHANT_ID
    ),
    paypalClientId: process.env.PAYPAL_CLIENT_ID || null,
    payouts: process.env.PAYPAL_PAYOUTS_ENABLED === "true",
    ai: !!process.env.GEMINI_API_KEY,
    elastic: !!process.env.ELASTICSEARCH_URL,
    demo: process.env.TROVE_DEMO_ENABLED === "true",
    simulation: process.env.TROVE_SIMULATION_ENABLED === "true",
  };
}
export const appUrl = () => process.env.APP_URL || "http://localhost:3000";
