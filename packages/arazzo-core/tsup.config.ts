import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'es2020',
  platform: 'neutral',
  treeshake: true,
  minify: false,
  // yaml is a runtime dependency; the precompiled validators have no dependency.
  external: ['yaml'],
});
