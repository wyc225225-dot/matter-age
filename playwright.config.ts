import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  use: { baseURL: "http://127.0.0.1:4173", headless: true },
  webServer: [
    {
      command: "npm run dev -- --port 4173",
      url: "http://127.0.0.1:4173",
      reuseExistingServer: true,
    },
    {
      command: "npm run preview -- --port 4174",
      url: "http://127.0.0.1:4174",
      reuseExistingServer: true,
    },
  ],
  reporter: "list",
});
