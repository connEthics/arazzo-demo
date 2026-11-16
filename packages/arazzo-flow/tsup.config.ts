import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'es2020',
  platform: 'browser',
  splitting: true,
  treeshake: true,
  minify: false,
  // dependencies and peerDependencies stay external (React, xyflow, elkjs, html-to-image, core).
  external: ['react', 'react-dom', 'react/jsx-runtime', '@xyflow/react', 'elkjs', 'html-to-image', '@connethics/arazzo-core'],
  esbuildOptions(o) {
    o.jsx = 'automatic';
  },
});
