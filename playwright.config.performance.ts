import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
const envFiles = [
  path.resolve(__dirname, '.env.test'),
  path.resolve(__dirname, '.env.local'),
  path.resolve(__dirname, '.env'),
];

for (const envFile of envFiles) {
  dotenv.config({ path: envFile, override: false });
}

/**
 * Playwright configuration for performance tests
 *
 * This configuration is optimized for running performance tests with:
 * - Single worker for consistent measurements
 * - No retries to avoid skewing results
 * - Detailed tracing and reporting
 */
export default defineConfig({
  testDir: './tests/performance',
  testMatch: '**/page-load.test.ts',

  // Run tests sequentially for accurate performance measurements
  fullyParallel: false,
  workers: 1,

  // No retries for performance tests
  retries: 0,

  // Increase timeout for performance tests
  timeout: 30000,

  // Detailed HTML report
  reporter: [
    ['html', { outputFolder: 'playwright-report-performance' }],
    ['list'],
  ],

  use: {
    baseURL: 'http://localhost:3000',

    // Always collect traces for performance analysis
    trace: 'on',

    // Capture screenshots on failure
    screenshot: 'only-on-failure',

    // Capture video for performance analysis
    video: 'retain-on-failure',

    // Use consistent viewport
    viewport: { width: 1280, height: 720 },

    // Disable animations for consistent measurements
    launchOptions: {
      args: ['--disable-blink-features=AutomationControlled'],
    },
  },

  // Test only on Chromium for consistent performance metrics
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Start dev server for performance tests
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120 * 1000,
  },
});
