import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30_000,
  reporter: [['list'], ['html', { open: 'never' }]],
  outputDir: 'test-results',
  use: {
    baseURL: 'http://127.0.0.1:5186',
    channel: process.env.MPMS_TEST_BROWSER || undefined,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop-chromium', use: { viewport: { width: 1440, height: 1000 } } },
    { name: 'mobile-chromium', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
  webServer: [
    { command: 'node e2e/start-api.mjs', url: 'http://127.0.0.1:5187/__qa/health', reuseExistingServer: false, timeout: 120_000 },
    { command: 'npm run dev -- --config e2e/vite.config.ts --host 127.0.0.1 --port 5186 --strictPort', url: 'http://127.0.0.1:5186', reuseExistingServer: false, timeout: 60_000 },
  ],
})
