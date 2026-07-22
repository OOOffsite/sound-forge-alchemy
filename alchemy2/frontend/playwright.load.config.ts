/**
 * Playwright Load Testing Configuration
 *
 * @author Claude Code
 * @license MIT
 * @version 2.0.0
 *
 * Configuration for load and stress tests that validate system behavior
 * under concurrent users, high throughput, and resource constraints.
 *
 * Test Categories:
 * - concurrent-users: Multiple simultaneous user sessions
 * - api-throughput: High-frequency API request handling
 * - database-pool: Database connection pool behavior
 * - websocket-load: Realtime WebSocket message delivery
 * - stress-test: System behavior under extreme load
 *
 * Usage:
 *   npm run test:load              - Run all load tests
 *   npm run test:load:concurrent   - Run concurrent user tests only
 *   npm run test:load:api         - Run API throughput tests only
 *   npm run test:load:db          - Run database pool tests only
 *   npm run test:load:ws          - Run WebSocket tests only
 *   npm run test:load:stress      - Run stress tests only
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // Test directory
  testDir: './tests/load',

  // Test timeout (2 minutes for load tests)
  timeout: 120000,

  // Global timeout for entire test suite (30 minutes)
  globalTimeout: 1800000,

  // Expect timeout for assertions (30 seconds)
  expect: {
    timeout: 30000,
  },

  // Parallel execution
  // Load tests run sequentially to avoid interference
  fullyParallel: false,
  workers: 1,

  // Retries
  // No retries for load tests (results should be consistent)
  retries: 0,

  // Reporter
  reporter: [
    ['html', { outputFolder: 'load-test-report', open: 'never' }],
    ['json', { outputFile: 'load-test-results.json' }],
    ['list'],
    ['junit', { outputFile: 'load-test-results.xml' }],
  ],

  // Global test setup/teardown
  globalSetup: undefined,
  globalTeardown: undefined,

  // Use configuration
  use: {
    // Base URL for tests
    baseURL: 'http://localhost:5173',

    // Trace on failure only (load tests generate large traces)
    trace: 'retain-on-failure',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'retain-on-failure',

    // Navigation timeout
    navigationTimeout: 30000,

    // Action timeout
    actionTimeout: 15000,

    // Ignore HTTPS errors (for local testing)
    ignoreHTTPSErrors: true,

    // Extra HTTP headers
    extraHTTPHeaders: {
      'X-Test-Type': 'load-test',
    },
  },

  // Projects - different test suites
  projects: [
    {
      name: 'concurrent-users',
      testMatch: '**/concurrent-users.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
    },
    {
      name: 'api-throughput',
      testMatch: '**/api-throughput.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'database-pool',
      testMatch: '**/database-pool.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'websocket-load',
      testMatch: '**/websocket-load.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
    },
    {
      name: 'stress-test',
      testMatch: '**/stress-test.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
    },
  ],

  // Web server (frontend dev server)
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 120000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
