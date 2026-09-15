import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  testMatch: /browser\.e2e\.ts/,
  timeout: 60_000,
  use: { baseURL: process.env.TEST_URL || 'http://127.0.0.1:4173', trace: 'retain-on-failure' },
  webServer: process.env.TEST_URL ? undefined : { command: 'npm run preview', port: 4173, reuseExistingServer: true },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
