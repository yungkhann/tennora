import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";
if (existsSync(".env.test.local")) process.loadEnvFile(".env.test.local");
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  workers: 3,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: { baseURL: "http://127.0.0.1:3000", trace: "retain-on-failure" },
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
  projects: [
    {
      name: "chromium",
      testIgnore: /auth\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile",
      testIgnore: /auth\.spec\.ts/,
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
    {
      name: "auth",
      testMatch: /auth\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
