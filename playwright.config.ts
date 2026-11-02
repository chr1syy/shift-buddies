import { defineConfig } from "@playwright/test";

export default defineConfig({
  // Full keyboard solution + 71 individual undo presses on a shared Linux host.
  timeout: 90_000,
  testDir: "./tests",
  testMatch: "browser.spec.ts",
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4174",
    viewport: { width: 1440, height: 1100 },
    headless: true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    launchOptions: process.env.PLAYWRIGHT_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH }
      : {},
  },
  webServer: {
    command: "npm run dev -- --port 4174 --strictPort",
    url: "http://127.0.0.1:4174",
    reuseExistingServer: false,
  },
});
