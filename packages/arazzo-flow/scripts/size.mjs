/**
 * Measured bundle sizes (minified, gzip) of a consumer importing <ArazzoGraph>.
 * Run after `npm run build`. React / react-dom are always excluded (host).
 */
import { build } from 'esbuild';
import { gzipSync } from 'node:zlib';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const entry = `import { ArazzoGraph } from ${JSON.stringify(join(root, 'dist/index.js'))}; console.log(ArazzoGraph);`;
const react = ['react', 'react-dom', 'react/jsx-runtime', 'react-dom/client'];

async function measure(label, external) {
  const r = await build({
    stdin: { contents: entry, resolveDir: root, loader: 'js' },
    bundle: true, minify: true, format: 'esm', splitting: true, outdir: '/tmp/af-size', write: false,
    platform: 'browser', external, metafile: true, logLevel: 'silent', define: { 'process.env.NODE_ENV': '"production"' },
  });
  const files = r.outputFiles.filter((f) => f.path.endsWith('.js'));
  const main = files.find((f) => f.path.includes('stdin')) ?? files[0];
  const lazy = files.filter((f) => f !== main);
  const fmt = (b) => `${(b.length / 1024).toFixed(1)} KB min · ${(gzipSync(b).length / 1024).toFixed(1)} KB gzip`;
  console.log(`${label.padEnd(58)} ${fmt(main.contents)}`);
  for (const f of lazy) console.log(`  lazy chunk ${f.path.split('/').pop()?.padEnd(45)} ${fmt(f.contents)}`);
}

await measure('arazzo-flow alone (deps external)', [...react, '@xyflow/react', 'elkjs', 'html-to-image', '@connethics/arazzo-core']);
await measure('+ @xyflow/react + elk-api + core (no React, no ELK engine)', [...react, 'elkjs/lib/elk-worker.min.js']);
const css = readFileSync(join(root, 'dist/style.css'));
console.log(`${'dist/style.css'.padEnd(58)} ${(css.length / 1024).toFixed(1)} KB min · ${(gzipSync(css).length / 1024).toFixed(1)} KB gzip`);
const w = readFileSync(join(root, 'dist/elk-worker.js'));
console.log(`${'dist/elk-worker.js (ELK engine, worker or fallback)'.padEnd(58)} ${(w.length / 1024).toFixed(1)} KB · ${(gzipSync(w).length / 1024).toFixed(1)} KB gzip`);
