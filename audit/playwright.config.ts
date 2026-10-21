import { defineConfig, devices } from '@playwright/test';

/**
 * The audit runs against the production server (npm run build, then server/index.ts), exactly as a
 * user gets it. audit/run.mjs builds first; these servers only start it.
 *
 *   8790  the app with the real Google AI key from .env
 *   8791  the app pointed at a failing mock Google AI (Part 4 error handling)
 *   8792  the app behind an access password (security checks)
 *   8799  the mock Google AI
 */
export const APP = 'http://localhost:8790';
export const FAILING = 'http://localhost:8791';
export const GATED = 'http://localhost:8792';
export const MOCK = 'http://localhost:8799';
const server = (port: number, env: Record<string, string> = {}) => ({
  command: 'node server/index.ts',
  cwd: '..',
  url: `http://localhost:${port}/`,
  env: { PORT: String(port), ...env },
  reuseExistingServer: !!process.env.AUDIT_REUSE,
  timeout: 60_000,
});

export default defineConfig({
  testDir: './tests',
  outputDir: './report/artifacts',
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 2,
  retries: 0,
  reporter: [['list'], ['json', { outputFile: './report/results.json' }], ['html', { outputFolder: './report/playwright-html', open: 'never' }]],
  use: { baseURL: APP, actionTimeout: 10_000, navigationTimeout: 30_000, viewport: { width: 1440, height: 900 }, screenshot: 'only-on-failure', trace: 'retain-on-failure', permissions: ['clipboard-read'] },
  webServer: [
    { command: 'node audit/mock-google.mjs', cwd: '..', url: `${MOCK}/__calls`, reuseExistingServer: !!process.env.AUDIT_REUSE, timeout: 20_000 },
    server(8790),
    server(8791, { GEMINI_API_BASE: MOCK, GEMINI_TIMEOUT_MS: '6000' }),
    server(8792, { ACCESS_PASSWORD: 'audit-pass' }),
  ],
  projects: [
    { name: 'inventory', testMatch: /00-inventory\.spec\.ts/ },
    { name: 'chromium', testIgnore: /00-inventory|\.slow\.spec|\.browsers\.spec/, dependencies: ['inventory'], use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'flows', testMatch: /\.slow\.spec\.ts/, dependencies: ['inventory'], timeout: 30 * 60_000, use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'firefox', testMatch: /\.browsers\.spec\.ts/, use: { ...devices['Desktop Firefox'], viewport: { width: 1440, height: 900 } } },
    { name: 'webkit', testMatch: /\.browsers\.spec\.ts/, use: { ...devices['Desktop Safari'], viewport: { width: 1440, height: 900 } } },
    { name: 'chromium-browsers', testMatch: /\.browsers\.spec\.ts/, use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
  ],
});
