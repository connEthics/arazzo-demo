import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

// Demo of @connethics/arazzo-flow (uses the built package: run `npm run build` first).
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  base: './',
  esbuild: { jsx: 'automatic' },
  server: { fs: { allow: [fileURLToPath(new URL('../../..', import.meta.url))] } },
  build: { outDir: 'dist', emptyOutDir: true, chunkSizeWarningLimit: 4000 },
});
