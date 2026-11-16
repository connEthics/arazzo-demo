/**
 * ELK layered in a Web Worker, compatible with a strict CSP (VS Code webview with nonce):
 * no `eval`, no `new Function`, no inline worker source in the main bundle.
 *
 * Worker resolution order:
 *   1. `createWorker()` injected by the host (e.g. a Blob URL built from fetched text);
 *   2. `workerUrl` (URL of `dist/elk-worker.js`, served by the host). If the browser refuses a
 *      cross-origin worker (VS Code webview resources), the script is fetched and started from a
 *      `blob:` URL — requires `worker-src blob:` and `connect-src` for the resource origin;
 *   3. default: `new URL('./elk-worker.js', import.meta.url)` (sibling file in `dist/`, picked up
 *      by Vite / webpack 5 / esbuild worker patterns).
 * Fallback (worker error, 8 s timeout, no `Worker` global, or `mode: 'main-thread'`): the same
 * ELK code runs on the main thread through the `FakeWorker` exported by `elkjs/lib/elk-worker`,
 * loaded on demand (separate chunk), so ELK is never duplicated in the main bundle.
 */
import ELKApi from 'elkjs/lib/elk-api.js';
import type { ELK, ElkNode } from 'elkjs/lib/elk-api';

export type ElkMode = 'worker' | 'main-thread';

/** Minimal ELK-like engine (mockable in tests). */
export interface LayoutEngine {
  layout(graph: ElkNode): Promise<ElkNode>;
}

export interface ElkConfig {
  /** URL of the worker script (`@connethics/arazzo-flow/elk-worker.js`). */
  workerUrl?: string | URL;
  /** Factory returning a started Worker running `elk-worker.js` (takes precedence over workerUrl). */
  createWorker?: () => Worker;
  /** `auto` (default): worker then main-thread fallback; `main-thread`: never start a worker. */
  mode?: 'auto' | 'main-thread';
  /** Worker timeout before falling back to the main thread (ms, default 8000). */
  timeoutMs?: number;
  /** Fully custom engine (tests, server-side layout): bypasses workers. */
  engine?: LayoutEngine;
}

type ElkCtor = new (o: { workerFactory?: (url?: string) => Worker; workerUrl?: string }) => ELK;
const ElkApiCtor = ((ELKApi as unknown as { default?: unknown }).default ?? ELKApi) as ElkCtor;

interface Instance {
  key: string;
  elk: LayoutEngine & { terminateWorker?: () => void };
  mode: ElkMode;
  failed?: Promise<never>;
}

let instance: Instance | null = null;

function terminate(i: Instance | null): void {
  if (i?.mode !== 'worker') return;
  try {
    i.elk.terminateWorker?.();
  } catch {
    /* already gone */
  }
}

function configKey(c: ElkConfig): string {
  return [c.mode ?? 'auto', c.workerUrl ? String(c.workerUrl) : '', c.createWorker ? 'factory' : '', c.engine ? 'engine' : ''].join('|');
}

async function mainThreadElk(): Promise<ELK> {
  const mod = (await import('elkjs/lib/elk-worker.min.js')) as unknown as Record<string, unknown>;
  const pick = (m: unknown): unknown => (m && typeof m === 'object' ? (m as Record<string, unknown>).Worker ?? pick((m as Record<string, unknown>).default) : m);
  const FakeWorker = pick(mod) as new () => Worker;
  return new ElkApiCtor({ workerFactory: () => new FakeWorker() });
}

function defaultWorkerUrl(): URL | null {
  try {
    return new URL('./elk-worker.js', import.meta.url);
  } catch {
    return null;
  }
}

async function blobWorkerFrom(url: string | URL): Promise<Worker> {
  const res = await fetch(String(url));
  if (!res.ok) throw new Error(`elk-worker-fetch-${res.status}`);
  const text = await res.text();
  const blob = URL.createObjectURL(new Blob([text], { type: 'text/javascript' }));
  return new Worker(blob, { name: 'arazzo-elk' });
}

/** Start the worker (sync when possible) and wire error reporting. */
async function workerElk(c: ElkConfig): Promise<Instance> {
  let rejectFailed: (e: Error) => void = () => {};
  const failed = new Promise<never>((_, reject) => {
    rejectFailed = reject;
  });
  failed.catch(() => {});
  const watch = (w: Worker) => {
    w.addEventListener('error', (ev) => {
      ev.preventDefault?.();
      rejectFailed(new Error('elk-worker-error'));
    });
    return w;
  };
  let worker: Worker;
  if (c.createWorker) worker = c.createWorker();
  else {
    const url = c.workerUrl ?? defaultWorkerUrl();
    if (!url) throw new Error('elk-worker-no-url');
    try {
      worker = new Worker(url, { name: 'arazzo-elk' });
    } catch (err) {
      // Cross-origin script (VS Code webview resource): fetch + blob: URL.
      if (err instanceof Error && /SecurityError|cross|origin/i.test(`${err.name} ${err.message}`)) worker = await blobWorkerFrom(url);
      else throw err;
    }
  }
  watch(worker);
  const elk = new ElkApiCtor({ workerFactory: () => worker });
  return { key: configKey(c), elk, mode: 'worker', failed };
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('elk-timeout')), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

async function getInstance(c: ElkConfig): Promise<Instance> {
  const key = configKey(c);
  if (instance && instance.key === key) return instance;
  terminate(instance);
  if (c.engine) instance = { key, elk: c.engine, mode: 'main-thread' };
  else if (c.mode === 'main-thread' || typeof Worker === 'undefined') instance = { key, elk: await mainThreadElk(), mode: 'main-thread' };
  else {
    try {
      instance = await workerElk(c);
    } catch {
      instance = { key, elk: await mainThreadElk(), mode: 'main-thread' };
    }
  }
  return instance;
}

/** Warm up the engine (start the worker, GWT init) before the first layout. */
export async function prewarmElk(c: ElkConfig = {}): Promise<ElkMode> {
  const i = await getInstance(c);
  if (i.mode === 'worker') {
    try {
      await runElk({ id: 'warmup', children: [], edges: [] }, c);
    } catch {
      /* fallback handled by runElk */
    }
  }
  return (instance ?? i).mode;
}

export function elkMode(): ElkMode | null {
  return instance?.mode ?? null;
}

/** Forget the current engine (tests, config change). */
export function resetElk(): void {
  terminate(instance);
  instance = null;
}

export async function runElk(graph: ElkNode, c: ElkConfig = {}): Promise<{ result: ElkNode; mode: ElkMode }> {
  const i = await getInstance(c);
  try {
    const run = i.failed ? Promise.race([i.elk.layout(graph), i.failed]) : i.elk.layout(graph);
    const result = await withTimeout(run, i.mode === 'worker' ? c.timeoutMs ?? 8000 : 120000);
    return { result, mode: i.mode };
  } catch (err) {
    if (i.mode === 'worker' && err instanceof Error && /^elk-(timeout|worker-error)$/.test(err.message)) {
      terminate(i);
      instance = { key: i.key, elk: await mainThreadElk(), mode: 'main-thread' };
      return { result: await instance.elk.layout(graph), mode: 'main-thread' };
    }
    throw err;
  }
}
