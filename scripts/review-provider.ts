import { db } from "../src/lib/db";
// Explicit operator action: no public endpoint can approve a provider or change payout routing.
async function main() {
  const [id, action, payoutEmail] = process.argv.slice(2);
  if (!id || !["approve", "suspend"].includes(action))
    throw new Error(
      "Usage: provider:review <seller-id> approve|suspend [verified-payout-email]",
    );
  if (payoutEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payoutEmail))
    throw new Error("Invalid payout email");
  await db.$transaction(async (tx) => {
    await tx.seller.update({
      where: { id },
      data: {
        status: action === "approve" ? "active" : "suspended",
        ...(payoutEmail ? { payoutEmail } : {}),
      },
    });
    await tx.auditEvent.create({
      data: {
        actor: "operator",
        resourceId: id,
        action: `provider_${action}`,
        reason:
          "Provider identity, publishing rights and payout account reviewed by operator",
      },
    });
  });
  console.log(`Provider ${action} completed.`);
}
main()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
