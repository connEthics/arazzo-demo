/**
 * Post-build assets: dist/style.css (xyflow base + themes + component, minified) and
 * dist/elk-worker.js (classic worker script = elkjs/lib/elk-worker.min.js, EPL-2.0).
 */
import { build } from 'esbuild';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(join(root, 'package.json'));
const dist = join(root, 'dist');
mkdirSync(dist, { recursive: true });

await build({
  entryPoints: [join(root, 'src/styles/index.css')],
  bundle: true,
  minify: true,
  outfile: join(dist, 'style.css'),
  logLevel: 'warning',
  legalComments: 'none',
});
const css = readFileSync(join(dist, 'style.css'), 'utf8');
if (/tailwind|@tailwind|--tw-/i.test(css)) throw new Error('style.css must not contain Tailwind');

const elkDir = dirname(require.resolve('elkjs/package.json'));
copyFileSync(join(elkDir, 'lib/elk-worker.min.js'), join(dist, 'elk-worker.js'));
copyFileSync(join(elkDir, 'LICENSE.md'), join(dist, 'elk-worker.LICENSE.md'));
writeFileSync(
  join(dist, 'elk-worker.d.ts'),
  '// Classic Web Worker script (ELK layered, elkjs, EPL-2.0). Serve it and pass its URL as `elk.workerUrl`.\nexport {};\n',
);
const kb = (p) => `${(statSync(join(dist, p)).size / 1024).toFixed(1)} KB`;
console.log(`style.css ${kb('style.css')} · elk-worker.js ${kb('elk-worker.js')}`);
