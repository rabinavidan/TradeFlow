import { defineConfig, devices } from '@playwright/test';

const CLIENT_URL = 'http://localhost:5183';
const API_URL = 'http://localhost:4099/api';

export default defineConfig({
  testDir: './tests',
  outputDir: './test-results',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 60_000,
  reporter: process.env.CI
    ? [['github'], ['html', { outputFolder: './playwright-report', open: 'never' }]]
    : [['list']],

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
