import { indexCatalog } from "../src/server/catalog";
import { db } from "../src/lib/db";
indexCatalog()
  .then((count) =>
    console.log(
      `Indexed ${count} public metadata documents. No purchased payloads were indexed.`,
    ),
  )
  .finally(() => db.$disconnect());
