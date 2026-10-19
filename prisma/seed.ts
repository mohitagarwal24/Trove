import { db } from "../src/lib/db";
import { syncSources } from "../src/server/datasets";
async function main() {
  const result = await syncSources();
  console.log(JSON.stringify(result));
  if (
    !(await db.offerVersion.count({
      where: { current: true, datasetId: { not: null } },
    }))
  )
    throw new Error(
      "No source data available. Check upstream availability and retry data:sync.",
    );
}
main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
