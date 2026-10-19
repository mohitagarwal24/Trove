import { db } from "../src/lib/db";
import { syncSources } from "../src/server/datasets";
syncSources(true)
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
    if (result.some((r) => r.error)) process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
