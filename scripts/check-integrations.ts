import { db } from "../src/lib/db";
import { capabilities } from "../src/lib/config";
import { searchOffers } from "../src/server/catalog";
async function main() {
  await db.$queryRaw`SELECT 1`;
  const caps = capabilities();
  const search = await searchOffers({ query: "current retail" });
  console.log(
    JSON.stringify(
      {
        database: "connected",
        offers: await db.offerVersion.count({ where: { current: true } }),
        searchEngine: search.engine,
        paymentEnvironment: "sandbox_only",
        paypal: caps.paypal
          ? "configured_not_transaction_verified"
          : "missing_client_id_secret_or_merchant_id",
        payouts: caps.payouts
          ? "enabled_requires_approved_access_funds_and_recipients"
          : "not_enabled",
        ai: caps.ai ? "configured_not_model_call_verified" : "guided_demo_only",
        webhook: process.env.PAYPAL_WEBHOOK_ID
          ? "configured_requires_public_endpoint_test"
          : "not_configured",
        encryption: /^[a-f0-9]{64}$/i.test(
          process.env.RESULT_ENCRYPTION_KEY || "",
        )
          ? "configured"
          : "missing_32_byte_hex_key",
        simulation: caps.simulation,
        note: "This check never creates charges or payouts. Complete the documented sandbox runbook to verify financial operations.",
      },
      null,
      2,
    ),
  );
}
main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
