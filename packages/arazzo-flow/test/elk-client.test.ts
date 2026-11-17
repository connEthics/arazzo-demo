import { afterEach, describe, expect, it, vi } from 'vitest';
import { elkMode, prewarmElk, resetElk, runElk } from '../src/layout/elk-client';

const tiny = {
  id: 'root',
  layoutOptions: { 'org.eclipse.elk.algorithm': 'layered' },
  children: [
    { id: 'a', width: 10, height: 10 },
    { id: 'b', width: 10, height: 10 },
  ],
  edges: [{ id: 'e', sources: ['a'], targets: ['b'] }],
};

/** In-process "Worker" running the real ELK FakeWorker: same protocol as a Web Worker. */
async function inProcessWorkerClass(opts: { fail?: boolean } = {}) {
  const mod = (await import('elkjs/lib/elk-worker.min.js')) as unknown as { Worker?: new () => Worker; default?: { Worker?: new () => Worker } };
  const Fake = (mod.Worker ?? mod.default?.Worker) as new () => { postMessage(m: unknown): void; onmessage: ((e: { data: unknown }) => void) | null };
  const created: string[] = [];
  class W {
    private inner = new Fake();
    private listeners: ((e: Event) => void)[] = [];
    onmessage: ((e: { data: unknown }) => void) | null = null;
    constructor(url: string | URL) {
      created.push(String(url));
      this.inner.onmessage = (e) => this.onmessage?.(e);
      if (opts.fail) setTimeout(() => this.listeners.forEach((l) => l(Object.assign(new Event('error'), { preventDefault() {} }))), 5);
    }
    postMessage(m: unknown) {
      if (!opts.fail) this.inner.postMessage(m);
    }
    addEventListener(type: string, l: (e: Event) => void) {
      if (type === 'error') this.listeners.push(l);
    }
    terminate() {}
  }
  return { W, created };
}

afterEach(() => {
  resetElk();
  vi.unstubAllGlobals();
});

describe('ELK engine selection', () => {
  it('falls back to the main thread when Worker is not available (Node)', async () => {
    const { result, mode } = await runElk(tiny);
    expect(mode).toBe('main-thread');
    expect(result.children!.find((c) => c.id === 'b')!.y).toBeGreaterThan(0);
  });

  it('uses workerUrl when given', async () => {
    const { W, created } = await inProcessWorkerClass();
    vi.stubGlobal('Worker', W);
    const { mode } = await runElk(tiny, { workerUrl: 'https://cdn.example/elk-worker.js' });
    expect(mode).toBe('worker');
    expect(created).toEqual(['https://cdn.example/elk-worker.js']);
    expect(elkMode()).toBe('worker');
  });

  it('uses the injected createWorker factory (CSP: blob: URL built by the host)', async () => {
    const { W } = await inProcessWorkerClass();
    const createWorker = vi.fn(() => new W('blob:host') as unknown as Worker);
    expect(await prewarmElk({ createWorker })).toBe('worker');
    const { mode } = await runElk(tiny, { createWorker });
    expect(mode).toBe('worker');
    expect(createWorker).toHaveBeenCalledTimes(1);
  });

  it('defaults to the sibling dist/elk-worker.js URL', async () => {
    const { W, created } = await inProcessWorkerClass();
    vi.stubGlobal('Worker', W);
    await runElk(tiny);
    expect(created[0]).toMatch(/elk-worker\.js$/);
  });

  it('falls back to the main thread when the worker errors (CSP refusal, 404)', async () => {
    const { W } = await inProcessWorkerClass({ fail: true });
    vi.stubGlobal('Worker', W);
    const { mode, result } = await runElk(tiny, { workerUrl: '/missing.js' });
    expect(mode).toBe('main-thread');
    expect(result.children).toHaveLength(2);
  });

  it('falls back on timeout', async () => {
    class Silent {
      constructor() {}
      postMessage() {}
      addEventListener() {}
      terminate() {}
    }
    vi.stubGlobal('Worker', Silent);
    const { mode } = await runElk(tiny, { workerUrl: '/slow.js', timeoutMs: 50 });
    expect(mode).toBe('main-thread');
  });

  it('mode main-thread never starts a worker; a custom engine bypasses ELK', async () => {
    const W = vi.fn();
    vi.stubGlobal('Worker', W);
    expect((await runElk(tiny, { mode: 'main-thread' })).mode).toBe('main-thread');
    expect(W).not.toHaveBeenCalled();
    const engine = { layout: vi.fn(async (g: typeof tiny) => g) };
    await runElk(tiny, { engine });
    expect(engine.layout).toHaveBeenCalledOnce();
  });
});
