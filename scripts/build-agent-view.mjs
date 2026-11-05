import { build } from "esbuild";
import { readFile, mkdir, writeFile } from "node:fs/promises";

const result = await build({
  entryPoints: ["src/agent-view/app.ts"],
  bundle: true,
  minify: true,
  write: false,
  format: "iife",
  platform: "browser",
  target: "es2022",
});
const script = result.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");
const css = await readFile("src/agent-view/app.css", "utf8");
await mkdir(".generated", { recursive: true });
await writeFile(
  ".generated/agent-view.html",
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Trove research</title><style>${css}</style></head><body><main id="app" aria-label="Trove research"><p role="status">Loading Trove…</p></main><script>${script}</script></body></html>`,
);
