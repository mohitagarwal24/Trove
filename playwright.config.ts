import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  expect: { timeout: 15000 },
  reporter: [["list"], ["html", { open: "never" }]],
  webServer: process.env.CI
    ? {
        command: "npm start",
        url: "http://localhost:3000/api/health",
        timeout: 60000,
      }
    : undefined,
  use: {
    baseURL: process.env.TROVE_TEST_URL || "http://localhost:3000",
    viewport: { width: 1440, height: 1000 },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    launchOptions: {
      executablePath:
        process.env.CHROME_PATH ||
        (process.env.CI ? undefined : "/usr/bin/google-chrome"),
      args: ["--no-sandbox"],
    },
  },
});
