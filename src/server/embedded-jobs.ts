import { db } from "@/lib/db";
import { maintenance, runJob } from "./jobs";

type State = {
  running?: Promise<{ processed: number }>;
  timer?: ReturnType<typeof setTimeout>;
  maintenanceAt: number;
};
const globalJobs = globalThis as unknown as { troveJobs?: State };
const state = (globalJobs.troveJobs ||= { maintenanceAt: 0 });
export const embeddedJobsEnabled = () =>
  process.env.TROVE_JOB_MODE === "embedded";

/** The database is the queue. Timers are only a latency optimization and may disappear on sleep/redeploy. */
export async function drainJobs(forceMaintenance = false) {
  if (state.running) return state.running;
  if (state.timer) {
    clearTimeout(state.timer);
    state.timer = undefined;
  }
  state.running = (async () => {
    if (forceMaintenance || Date.now() - state.maintenanceAt >= 3600000) {
      await maintenance();
      state.maintenanceAt = Date.now();
    }
    let processed = 0;
    const started = Date.now();
    while (processed < 10 && Date.now() - started < 12000 && (await runJob()))
      processed++;
    // No idle polling: health pings must not keep Neon compute awake.
    const [pending, running] = await Promise.all([
      db.job.findFirst({
        where: { state: "pending" },
        orderBy: { runAt: "asc" },
        select: { runAt: true },
      }),
      db.job.findFirst({
        where: { state: "running", lockedAt: { not: null } },
        orderBy: { lockedAt: "asc" },
        select: { lockedAt: true },
      }),
    ]);
    const next = Math.min(
      pending?.runAt.getTime() ?? Infinity,
      running?.lockedAt ? running.lockedAt.getTime() + 360000 : Infinity,
    );
    if (Number.isFinite(next) && embeddedJobsEnabled()) {
      state.timer = setTimeout(
        () => {
          void drainJobs().catch(logFailure);
        },
        Math.max(250, next - Date.now()),
      );
      state.timer.unref();
    }
    return { processed };
  })();
  try {
    return await state.running;
  } finally {
    state.running = undefined;
  }
}
function logFailure(error: unknown) {
  console.error(
    "Embedded queue cycle failed:",
    error instanceof Error ? error.name : "unknown",
  );
}
export async function wakeEmbeddedJobs() {
  if (embeddedJobsEnabled()) await drainJobs().catch(logFailure);
}
export function stopEmbeddedJobs() {
  if (state.timer) clearTimeout(state.timer);
  state.timer = undefined;
}
