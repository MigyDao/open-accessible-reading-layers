import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? "line" : "list",
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure"
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: {
          width: 1280,
          height: 800
        }
      }
    }
  ],
  webServer: [
    {
      command:
        "bash -lc 'bash ../../scripts/build-demo-epub.sh; READIUM_BIN=\"$(bash ../../scripts/install-readium-cli.sh)\"; exec \"$READIUM_BIN\" serve --file-directory ../../examples/demo-book/dist --address 127.0.0.1 --port 15080'",
      url: "http://127.0.0.1:15080/health",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000
    },
    {
      command:
        "node ../../node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3000",
      url: "http://127.0.0.1:3000",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000
    }
  ]
});
