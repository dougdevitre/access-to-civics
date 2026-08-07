import { defineConfig } from '@playwright/test';

// Local runs (sandboxes with a system chromium) can point PLAYWRIGHT_CHROMIUM_PATH at the
// binary; CI uses the standard `npx playwright install chromium` layout.
const executablePath = process.env['PLAYWRIGHT_CHROMIUM_PATH'];

export default defineConfig({
  testDir: 'tests',
  testMatch: '**/*.pw.ts',
  timeout: 60_000,
  use: {
    baseURL: 'http://localhost:4173',
    ...(executablePath ? { launchOptions: { executablePath } } : {}),
  },
  webServer: {
    command: 'npm run preview -- --port 4173 --strictPort',
    port: 4173,
    reuseExistingServer: true,
  },
});
