import { defineConfig, devices } from '@playwright/test';
import { config as loadEnv } from 'dotenv';

// .env.local'i yükle (TEST_ADMIN_PASSWORD vb. için)
loadEnv({ path: '.env.local' });

/**
 * Disiplan E2E testleri.
 *
 * Yerel koşum:
 *   npm run test:e2e         # CI mode (headless)
 *   npm run test:e2e:ui      # UI mode (browser görünür)
 *   npm run test:e2e -- admin-subscriptions
 *
 * Önkoşul:
 *   - .env.local'da SUPABASE_SERVICE_ROLE_KEY + TEST_ADMIN_EMAIL/PASSWORD
 *   - Admin dev server (3001), web app server (8082) testler tarafından otomatik
 *     başlatılır (webServer config aşağıda).
 */
export default defineConfig({
  testDir: './tests/e2e',
  // Auth setup tüm testlerden önce koşar (storage state'i kaydeder)
  globalSetup: './tests/global-setup.ts',
  fullyParallel: false, // shared DB state için sequential
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1, // shared DB → tek worker
  reporter: process.env.CI ? [['github'], ['html']] : 'list',
  use: {
    baseURL: 'http://localhost:3001',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
  },
  projects: [
    {
      name: 'admin',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/.auth/admin.json',
        baseURL: 'http://localhost:3001',
      },
      testMatch: /admin-.*\.spec\.ts/,
    },
    {
      name: 'web',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/.auth/web.json',
        baseURL: 'http://localhost:8082',
      },
      testMatch: /web-.*\.spec\.ts/,
    },
  ],
  webServer: [
    {
      command: 'npm run dev',
      url: 'http://localhost:3001/login',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      command: 'cd .. && python3 -m http.server 8082',
      url: 'http://localhost:8082/index.html',
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
  ],
});
