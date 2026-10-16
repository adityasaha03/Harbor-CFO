import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    globalSetup: ["./vitest.global-setup.ts"],
    setupFiles: ['./vitest.setup.ts'],
    testTimeout: 120000,
    hookTimeout: 180000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
