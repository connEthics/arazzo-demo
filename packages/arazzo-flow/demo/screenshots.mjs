/**
 * Playwright screenshots of the demo (Chromium preinstalled; never runs `playwright install`).
 * Usage: npm run build && npm run demo:build && node demo/screenshots.mjs [filter]
 */
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { preview } from 'vite';

const require = createRequire(import.meta.url);
let playwright;
try {
  playwright = require('playwright');
} catch {
  playwright = require('/opt/node-tools/node_modules/playwright');
}
const here = fileURLToPath(new URL('.', import.meta.url));
const outDir = `${here}screenshots`;
await mkdir(outDir, { recursive: true });
const filter = process.argv[2] ?? '';

export const SHOTS = [
  { name: 'order-to-cash-light', q: 'example=e2e-order-to-cash&theme=light&legend=1' },
  { name: 'order-to-cash-dark', q: 'example=e2e-order-to-cash&theme=dark&select=awaitOrderConfirmation' },
  { name: 'order-to-cash-vscode-dark', q: 'example=e2e-order-to-cash&theme=vscode-dark' },
  { name: 'order-to-cash-vscode-hc', q: 'example=e2e-order-to-cash&theme=vscode-hc&select=capturePayment' },
  { name: 'order-to-cash-vscode-light', q: 'example=e2e-order-to-cash&theme=vscode-light&lanes=lanes' },
  { name: 'session-renewal-light', q: 'example=e2e-session-renewal&workflow=listUnpaidInvoices&theme=light&select=getInvoice' },
  { name: 'session-renewal-vscode-dark', q: 'example=e2e-session-renewal&workflow=listUnpaidInvoices&theme=vscode-dark&list=1' },
  { name: 'pet-adoption-light', q: 'example=pet-adoption&theme=light' },
];

const server = await preview({ configFile: `${here}vite.config.ts`, preview: { port: 4179, strictPort: false } });
const base = server.resolvedUrls.local[0];
const browser = await playwright.chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
let failures = 0;
for (const s of SHOTS.filter((x) => x.name.includes(filter))) {
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && errors.push(`${m.type()}: ${m.text()}`));
  await page.goto(`${base}?${s.q}`);
  await page.waitForFunction(() => !!document.body.dataset.ready, null, { timeout: 30000 });
  await page.waitForTimeout(500);
  const footer = (await page.locator('.demo__footer').textContent())?.replace(/\s+/g, ' ');
  await page.screenshot({ path: `${outDir}/${s.name}.png` });
  console.log(`${s.name}.png  ${footer}${errors.length ? `\n  ERRORS: ${errors.join(' | ')}` : ''}`);
  failures += errors.filter((e) => !e.startsWith('warning')).length;
  await page.close();
}
// Pan performance on 100 steps (UI-SPEC budget: 60 fps).
if (!filter || 'large-100'.includes(filter)) {
  const page = await ctx.newPage();
  await page.goto(`${base}?example=large-100&theme=light`);
  await page.waitForFunction(() => !!document.body.dataset.ready, null, { timeout: 60000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${outDir}/large-100-light.png` });
  const box = await page.locator('.react-flow__pane').boundingBox();
  await page.evaluate(() => {
    window.__frames = [];
    const tick = (t) => {
      window.__frames.push(t);
      if (window.__frames.length < 400) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let i = 0; i < 120; i++) await page.mouse.move(x + Math.sin(i / 10) * 300, y + Math.cos(i / 10) * 200);
  await page.mouse.up();
  const frames = await page.evaluate(() => window.__frames);
  const d = frames.slice(1).map((t, i) => t - frames[i]).filter((v) => v > 0);
  const avg = d.reduce((a, b) => a + b, 0) / d.length;
  const p95 = d.sort((a, b) => a - b)[Math.floor(d.length * 0.95)];
  const nodes = await page.locator('.react-flow__node').count();
  console.log(`large-100 pan: ${nodes} rendered nodes, ${(1000 / avg).toFixed(0)} fps avg, p95 frame ${p95.toFixed(1)} ms`);
  await page.close();
}
await browser.close();
server.httpServer.close();
process.exit(failures ? 1 : 0);
