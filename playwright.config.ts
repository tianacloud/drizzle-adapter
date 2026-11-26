import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser', workers: 1, timeout: 90_000,
  expect: { timeout: 25_000 },
  use: {
    baseURL: process.env.TIANA_TEST_URL,
    storageState: process.env.TIANA_TEST_STORAGE_STATE,
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit-mobile', use: { ...devices['iPhone 13'] } },
  ],
});
