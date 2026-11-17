import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { workflowToGraph } from '@connethics/arazzo-core';
import { dataUrlToBlob, toMermaid } from '../src/export';
import { createOpenApiResolver } from '../src/openapi';
import { EDGE_KINDS } from '../src/model';
import { CATALOGUE } from './fixtures';

const styles = (f: string) => readFileSync(join(__dirname, '..', 'src', 'styles', f), 'utf8');
const css = styles('arazzo-flow.css').replace(/\/\*[\s\S]*?\*\//g, '');
const srcFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? srcFiles(join(dir, n)) : /\.tsx?$/.test(n) ? [join(dir, n)] : []));

describe('stylesheet', () => {
  it('has no Tailwind and only af- classes (plus React Flow ones)', () => {
    expect(css).not.toMatch(/@tailwind|--tw-|@apply/);
    const classes = [...css.matchAll(/\.([a-zA-Z][\w-]*)/g)].map((m) => m[1]!).filter((c) => !/^\d/.test(c));
    for (const c of new Set(classes)) expect(c.startsWith('af-') || c.startsWith('react-flow'), c).toBe(true);
    for (const f of srcFiles(join(__dirname, '..', 'src'))) {
      const text = readFileSync(f, 'utf8');
      for (const m of text.matchAll(/className=(?:"([^"]+)"|\{`([^`]+)`\})/g)) {
        const names = (m[1] ?? m[2]!).replace(/\$\{[^}]*\}/g, ' ').split(/\s+/).filter((x) => x && !x.startsWith('-') && !x.startsWith('--'));
        for (const n of names) expect(n.startsWith('af-') || ['nodrag', 'nopan'].includes(n), `${f}: ${n}`).toBe(true);
      }
    }
  });

  it('wraps the toolbar in a narrow pane instead of overflowing the canvas', () => {
    const row = /\.af-toolbar__row \{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(row).toMatch(/flex-wrap: wrap;/);
    // …and the search box (top left) moves under the toolbar instead of being covered.
    expect(/\.af-canvas \{[^}]*container-type: inline-size;/.test(css)).toBe(true);
    expect(css).toMatch(/@container \(max-width: 900px\) \{\s*\.react-flow__panel\.af-search \{\s*margin-top: 58px;/);
  });

  it('gives every edge kind a distinct stroke signature (dash, width, double line)', () => {
    const sig = (k: string) => {
      const rule = new RegExp(`\\.af-edge--${k} \\{([^}]*)\\}`).exec(css)?.[1] ?? '';
      const dash = /--dash: ([^;]+);/.exec(rule)?.[1] ?? 'none';
      const w = /--w: ([^;]+);/.exec(rule)?.[1] ?? '';
      const color = /--edge: ([^;]+);/.exec(rule)?.[1] ?? '';
      return { dash, w, color };
    };
    const sigs = EDGE_KINDS.map((k) => ({ k, ...sig(k) }));
    const dashed = sigs.filter((s) => s.dash !== 'none');
    // Every dashed kind has its own --af-dash-<kind> token.
    for (const s of dashed) expect(s.dash).toBe(`var(--af-dash-${s.k})`);
    expect(dashed.map((s) => s.k).sort()).toEqual(['depends-on', 'end-failure', 'failure', 'implicit-failure', 'retry', 'transfer']);
    // Token values are pairwise distinct (no more dependsOn/failure collision).
    const theme = styles('theme-connethics.css');
    const values = dashed.map((s) => new RegExp(`--ce-graph-dash-${s.k}: ([^;]+);`).exec(theme)![1]);
    expect(new Set(values).size).toBe(values.length);
    expect(values).toContain('0.5 4.5');
    // Solid kinds differ by width/colour; workflow-call is a double line.
    const solid = sigs.filter((s) => s.dash === 'none').map((s) => `${s.w}|${s.color}`);
    expect(new Set(solid).size).toBe(solid.length);
    expect(css).toMatch(/\.af-edge--workflow-call \.af-edge__line \{\s*stroke: var\(--af-canvas-bg\)/);
  });

  it('vscode theme maps semantic colours on --vscode-* and handles high contrast', () => {
    const vs = styles('theme-vscode.css');
    for (const v of ['--vscode-testing-iconPassed', '--vscode-testing-iconFailed', '--vscode-errorForeground', '--vscode-charts-orange', '--vscode-charts-purple', '--vscode-charts-blue', '--vscode-charts-yellow', '--vscode-editor-background', '--vscode-focusBorder', '--vscode-contrastBorder', '--vscode-contrastActiveBorder'])
      expect(vs, v).toContain(v);
  });
});

describe('exports', () => {
  it('Mermaid is delegated to core graphToMermaid (direction, lanes, failures)', () => {
    const g = workflowToGraph(CATALOGUE, 'main');
    expect(toMermaid(g)).toMatch(/^flowchart TB/);
    const lr = toMermaid(g, { direction: 'LR', lanes: 'lanes', hideFailures: true });
    expect(lr).toMatch(/^flowchart LR/);
    expect(lr).toContain('subgraph');
    expect(lr).not.toContain('timedOut');
  });

  it('dataUrlToBlob decodes base64 and URI-encoded data URLs without fetch', async () => {
    const png = dataUrlToBlob('data:image/png;base64,iVBORw0KGgo=');
    expect(png.type).toBe('image/png');
    expect(png.size).toBe(8);
    const svg = dataUrlToBlob('data:image/svg+xml;charset=utf-8,%3Csvg%3E%3C%2Fsvg%3E');
    expect(svg.type).toBe('image/svg+xml');
    expect(await svg.text()).toBe('<svg></svg>');
  });
});

describe('createOpenApiResolver', () => {
  it('resolves qualified and plain operationIds, and webhooks', () => {
    const r = createOpenApiResolver({
      api: { paths: { '/orders': { post: { operationId: 'createOrder' } }, '/orders/{id}': { get: { operationId: 'getOrder' } } }, webhooks: { shipped: { post: { operationId: 'onShipped' } } } },
    });
    expect(r({ stepId: 'a', operationId: '$sourceDescriptions.api.createOrder' }, undefined)).toEqual({ method: 'POST', path: '/orders' });
    expect(r({ stepId: 'b', operationId: 'getOrder' }, { name: 'api', url: 'x' })).toEqual({ method: 'GET', path: '/orders/{id}' });
    expect(r({ stepId: 'c', operationId: 'onShipped' }, undefined)).toEqual({ method: 'POST', path: 'webhook shipped' });
    expect(r({ stepId: 'd', operationId: 'nope' }, undefined)).toBeUndefined();
  });
});
