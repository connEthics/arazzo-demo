import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  esbuild: { jsx: 'automatic' },
  resolve: {
    alias: {
      // Test against core sources (validators are generated and committed in core).
      '@connethics/arazzo-core': fileURLToPath(new URL('../arazzo-core/src/index.ts', import.meta.url)),
    },
  },
  test: {
    include: ['test/**/*.test.{ts,tsx}'],
    environment: 'node',
    setupFiles: ['test/setup.ts'],
    testTimeout: 30000,
  },
});
