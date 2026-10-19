// Never log secrets, response bodies or cookie headers.
const mode = process.argv[2];
if (!["health", "maintenance"].includes(mode))
  throw new Error("Choose health or maintenance.");
const base = new URL(process.env.TROVE_HOSTED_URL || "");
if (
  base.protocol !== "https:" &&
  !["localhost", "127.0.0.1"].includes(base.hostname)
)
  throw new Error("Use an HTTPS deployment URL.");
const secret = process.env.CRON_SECRET || "";
if (mode === "maintenance" && secret.length < 32)
  throw new Error("Set CRON_SECRET in repository secrets.");
let success = false;
for (let attempt = 1; attempt <= 6; attempt++) {
  try {
    const response = await fetch(
      new URL(mode === "health" ? "/api/health" : "/api/ops/tick", base),
      {
        method: mode === "health" ? "GET" : "POST",
        headers: mode === "health" ? {} : { Authorization: `Bearer ${secret}` },
        signal: AbortSignal.timeout(30000),
        redirect: "error",
      },
    );
    if ([401, 403].includes(response.status)) throw new Error("AUTH_FAILED");
    const body = await response.json();
    if (response.ok && body.status === "ok") {
      success = true;
      break;
    }
  } catch (error) {
    if (error.message === "AUTH_FAILED") {
      console.error("Maintenance authentication failed.");
      process.exit(1);
    }
  }
  console.log(`Hosted ${mode} not ready; attempt ${attempt}/6.`);
  if (attempt < 6) await new Promise((resolve) => setTimeout(resolve, 10000));
}
if (!success) {
  console.error(`Hosted ${mode} did not become ready.`);
  process.exit(1);
}
console.log(`Hosted ${mode} passed.`);
