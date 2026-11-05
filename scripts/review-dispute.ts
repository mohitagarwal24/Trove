import { db } from "../src/lib/db";
import { reviewDispute } from "../src/server/disputes";

async function main() {
  const [command, id, reviewer, ...words] = process.argv.slice(2);
  if (command === "list") {
    console.log(
      JSON.stringify(
        await db.purchaseDispute.findMany({
          where: { state: { in: ["open", "needs_information"] } },
          select: {
            id: true,
            purchaseId: true,
            category: true,
            state: true,
            createdAt: true,
          },
          orderBy: { createdAt: "asc" },
          take: 100,
        }),
        null,
        2,
      ),
    );
  } else if (command === "show" && id) {
    console.log(
      JSON.stringify(
        await db.purchaseDispute.findUniqueOrThrow({
          where: { id },
          include: {
            messages: { orderBy: { createdAt: "asc" } },
            refund: true,
          },
        }),
        null,
        2,
      ),
    );
  } else if (
    ["approve", "reject", "request_information"].includes(command) &&
    id &&
    reviewer
  ) {
    const result = await reviewDispute({
      id,
      reviewer,
      decision: command as "approve" | "reject" | "request_information",
      reason: words.join(" "),
    });
    console.log(JSON.stringify({ id: result.id, state: result.state }));
  } else
    throw new Error(
      "Usage: support:review list | show <case-id> | approve|reject|request_information <case-id> <reviewer> <evidence-based reason, at least 20 characters>",
    );
}
main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
