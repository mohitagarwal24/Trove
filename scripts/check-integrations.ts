import { emailConfigured } from "../src/server/mail";
import { db } from "../src/lib/db";
import { capabilities, paymentEnvironment } from "../src/lib/config";
import { searchOffers } from "../src/server/catalog";
async function main() {
  await db.$queryRaw`SELECT 1`;
  const caps = capabilities();
  const search = await searchOffers({ query: "recall" });
  console.log(
    JSON.stringify(
      {
        database: "connected",
        googleSignIn: caps.googleAuth ? "configured_requires_consent_test" : "not_configured",
        offers: await db.offerVersion.count({
          where: {
            current: true,
            seller: { status: "active" },
            datasetId: { not: null },
          },
        }),
        passwordRecovery: emailConfigured()
          ? "configured_requires_delivery_test"
          : "not_configured",
        searchEngine: search.engine,
        paymentEnvironment: paymentEnvironment(),
        paypal: caps.paypal
          ? "configured_not_transaction_verified"
          : "missing_client_id_secret_or_merchant_id",
        payouts: caps.payouts
          ? "enabled_requires_approved_access_funds_and_recipients"
          : "not_enabled",
        ai: caps.ai ? "configured_not_model_call_verified" : "not_configured",
        webhook: process.env.PAYPAL_WEBHOOK_ID
          ? "configured_requires_public_endpoint_test"
          : "not_configured",
        encryption: /^[a-f0-9]{64}$/i.test(
          process.env.RESULT_ENCRYPTION_KEY || "",
        )
          ? "configured"
          : "missing_32_byte_hex_key",
        note: "This check never creates charges or payouts. Complete docs/OPERATIONS.md to verify financial operations.",
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
