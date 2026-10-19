import { runJob, maintenance } from "../src/server/jobs";
let stopping = false;
process.on("SIGTERM", () => {
  stopping = true;
});
process.on("SIGINT", () => {
  stopping = true;
});
async function main() {
  let ticks = 0;
  console.log(
    "Trove worker started: durable jobs, reconciliation, settlement and retention.",
  );
  while (!stopping) {
    try {
      const ran = await runJob();
      if (++ticks % 30 === 0) await maintenance();
      if (!ran) await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(
        "Worker cycle:",
        error instanceof Error ? error.message : "failed",
      );
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
}
main();
