/**
 * Vitest Configuration for Supabase Infrastructure Tests
 *
 * @module tests/infrastructure/vitest.config
 * @author Claude Code
 * @license MIT
 * @version 1.0.0
 */

import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./setup.ts'],
    testTimeout: 30000, // Infrastructure tests may take longer
    hookTimeout: 30000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'helpers/',
        '**/*.config.*',
        'setup.ts'
      ],
      thresholds: {
        lines: 90, // Infrastructure testing: 90% minimum
        functions: 90,
        branches: 90,
        statements: 90,
      },
    },
    include: [
      '**/*.test.ts'
    ],
    sequence: {
      // Run tests sequentially to avoid database conflicts
      concurrent: false
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../../'),
    },
  },
});
