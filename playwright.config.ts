import { defineConfig } from "@playwright/test";
import { assertTestDatabase } from "./tests/helpers/database";
assertTestDatabase(process.env.TEST_DATABASE_URL);
const testPort = Number(process.env.TEST_APP_PORT ?? 3100);
if (!Number.isSafeInteger(testPort) || testPort < 1024 || testPort > 65535) throw new Error('Porta de testes inválida.');
const baseURL = `http://127.0.0.1:${testPort}`;
if (
  process.env.DATABASE_URL !== process.env.TEST_DATABASE_URL ||
  process.env.DIRECT_URL !== process.env.TEST_DATABASE_URL
) {
  throw new Error(
    "Execute Playwright por npm run test:e2e para isolar as conexões.",
  );
}
export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/setup.ts",
  globalTeardown: "./tests/e2e/teardown.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: !!process.env.CI,
  timeout: 240_000,
  expect: { timeout: 45_000 },
  reporter: [
    ["list"],
    ["html", { open: "never" }],
    ["json", { outputFile: "test-results/results.json" }],
  ],
  use: {
    browserName: "chromium",
    baseURL,
    trace: "on",
    screenshot: "only-on-failure",
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : {},
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 900 } } },
    {
      name: "mobile",
      use: {
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command:
      `node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port ${testPort}`,
    url: baseURL,
    reuseExistingServer: false,
    // O servidor de teste sabe que é e2e local (trava dos jogos de sonda em lib/probe-guard exige isto).
    env: { ...(process.env as Record<string, string>), TEST_APP_PORT: String(testPort) },
    timeout: 120_000,
  },
});
