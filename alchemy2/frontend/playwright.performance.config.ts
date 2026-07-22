/**
 * Playwright Performance Testing Configuration
 *
 * @author Claude Code
 * @license MIT
 * @version 2.0.0
 *
 * Sequential execution with accurate measurements for performance testing.
 * No retries to ensure consistent performance metrics.
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/performance',

  // Performance test settings
  timeout: 60000, // 1 minute per test
  retries: 0, // No retries for performance tests
  workers: 1, // Sequential execution for accurate measurements

  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'performance-report' }],
    ['json', { outputFile: 'performance-results.json' }],
    ['list']
  ],

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    // Performance-specific settings
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },

  projects: [
    {
      name: 'chromium-performance',
      use: {
        ...devices['Desktop Chrome'],
        // Performance testing browser settings
        launchOptions: {
          args: [
            '--enable-precise-memory-info',
            '--enable-gpu-benchmarking',
            '--enable-performance-navigation-timing'
          ]
        }
      }
    }
  ],

  // Dev server configuration
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000
  }
});
