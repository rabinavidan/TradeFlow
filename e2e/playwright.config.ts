import { defineConfig, devices, type ReporterDescription } from '@playwright/test';

const CLIENT_URL = 'http://localhost:5183';
const API_URL = 'http://localhost:4099/api';

const reporters: ReporterDescription[] = process.env.CI
  ? [
      ['github'],
      ['html', { outputFolder: './playwright-report', open: 'never' }],
    ]
  : [['list']];

// Allure is opt-in via GENERATE_ALLURE, not tied to CI generally — the
// per-PR e2e job doesn't need it (the html/github reporters cover that),
// it's only turned on for the nightly Allure run and local report
// generation (`npm run test:e2e:allure`).
if (process.env.GENERATE_ALLURE === 'true') {
  // Unlike the html reporter's outputFolder, allure-playwright resolves
  // resultsDir relative to process.cwd() at invocation, not this config
  // file's directory — both the npm script and the nightly CI job always
  // invoke Playwright from the repo root, so the path is written that way.
  reporters.push(['allure-playwright', { resultsDir: 'e2e/allure-results' }]);
}

export default defineConfig({
  testDir: './tests',
  outputDir: './test-results',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 60_000,
  reporter: reporters,

  use: {
    baseURL: CLIENT_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // Only override the browser path when explicitly told to (e.g. a dev
    // sandbox with a pre-installed Chromium at a fixed, non-standard
    // path). Leaving this unset elsewhere lets Playwright find the
    // browser it manages itself — which is what a normal CI runner
    // (after `playwright install`) and most local dev machines expect.
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
      : {},
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: [
    {
      command: 'npx tsx src/tests/e2eServer.ts',
      cwd: '../server',
      url: `${API_URL}/health`,
      timeout: 60_000,
      reuseExistingServer: !process.env.CI,
      env: { PORT: '4099', CORS_ORIGIN: CLIENT_URL },
    },
    {
      command: 'npx vite --port 5183 --strictPort',
      cwd: '../client',
      url: CLIENT_URL,
      timeout: 30_000,
      reuseExistingServer: !process.env.CI,
      env: { VITE_API_URL: API_URL },
    },
  ],
});
