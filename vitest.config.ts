import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./src/setupTests.ts'],
    coverage: {
      reporter: ['text', 'html', 'lcov'],
      provider: 'v8',
      exclude: [
        '**/node_modules/**',
          '**/dist/**',
          '**/build/**',
          '**/coverage/**',
        '**/*.cjs',
        '**/*.config.{js,ts,cjs}',
        '**/*.d.ts',
        '**/*.test.{js,ts,tsx}',
        '**/*.spec.{js,ts,tsx}',
        '**/backend/**'
      ],
    },
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
