import { spawn } from "node:child_process";
const key = process.env.RESULT_ENCRYPTION_KEY || "";
if (!/^[a-f0-9]{64}$/i.test(key)) {
  console.error(
    "Set RESULT_ENCRYPTION_KEY to openssl rand -hex 32 before starting.",
  );
  process.exit(1);
}
for (const command of [
  ["node_modules/prisma/build/index.js", "migrate", "deploy"],
  ["--import", "tsx", "--env-file-if-exists=.env", "prisma/seed.ts"],
]) {
  const code = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, command, {
      stdio: "inherit",
      env: process.env,
    });
    child.once("error", reject);
    child.once("exit", resolve);
  });
  if (code !== 0) process.exit(typeof code === "number" ? code : 1);
}
const child = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "start", "--hostname", "0.0.0.0"],
  { stdio: "inherit", env: process.env },
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));
child.on("error", () => process.exit(1));
child.on("exit", (code) => process.exit(code ?? 1));
