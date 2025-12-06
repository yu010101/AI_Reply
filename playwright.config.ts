import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// Read from default .env file (優先順位: .env.test > .env.local > .env)
const envFiles = [
  path.resolve(__dirname, '.env.test'),
  path.resolve(__dirname, '.env.local'),
  path.resolve(__dirname, '.env'),
];

for (const envFile of envFiles) {
  dotenv.config({ path: envFile, override: false });
}

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true, // 既存のサーバーを再利用
    timeout: 120 * 1000,
  },
});
