import { defineConfig, devices } from '@playwright/test';

// The site is served under /fix-my-cloud/ on purpose: GitHub Pages is not at the domain root.
const PORT = 4173;
const BASE = '/fix-my-cloud/';

export default defineConfig({
  testDir: 'e2e',
  timeout: 90_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: { baseURL: `http://localhost:${PORT}${BASE}`, trace: 'off' },
  webServer: {
    command: 'node scripts/serve.mjs',
    env: { PORT: String(PORT), BASE },
    url: `http://localhost:${PORT}${BASE}`,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
