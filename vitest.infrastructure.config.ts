/**
 * Vitest Configuration for Infrastructure Tests
 * Specialized configuration for Docker and infrastructure testing
 *
 * @author Claude Code (TDD Agent)
 * @version 1.0.0
 * @license MIT
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'infrastructure',
    include: ['tests/infrastructure/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],

    // Extended timeouts for Docker operations
    testTimeout: 600000, // 10 minutes
    hookTimeout: 30000,  // 30 seconds

    // Sequential execution to avoid Docker resource conflicts
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        maxThreads: 2, // Limit concurrent Docker builds
        minThreads: 1
      }
    },

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['tests/infrastructure/**/*.ts'],
      exclude: [
        'tests/infrastructure/**/*.test.ts',
        'tests/infrastructure/**/README.md'
      ],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 90,
        statements: 90
      }
    },

    // Reporters
    reporters: ['default', 'verbose'],

    // Global setup/teardown
    globalSetup: './tests/infrastructure/setup.ts',

    // Environment
    environment: 'node',

    // Retry failed tests (Docker builds can be flaky)
    retry: 1,

    // Output
    outputFile: {
      json: './tests/infrastructure/results.json',
      html: './tests/infrastructure/results.html'
    }
  }
});
