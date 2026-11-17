/**
 * Demo / showcase of @connethics/arazzo-flow on the examples of app/public/workflows.
 * URL parameters: example, workflow, theme (light|dark|vscode-light|vscode-dark|vscode-hc),
 * lang (fr|en), lanes, dir, density, select, legend=1, list=1.
 */
import { StrictMode, useCallback, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { parse as parseYaml } from 'yaml';
import { parseArazzo, validate, type GraphNode } from '@connethics/arazzo-core';
import {
  ArazzoGraphFromDocument,
  createOpenApiResolver,
  type ArazzoGraphOptions,
  type DensityProp,
  type LanesMode,
  type LayoutStats,
  type SelectionInfo,
} from '@connethics/arazzo-flow';
import '@connethics/arazzo-flow/style.css';
import workerUrl from '@connethics/arazzo-flow/elk-worker.js?url';
import { applyVsCodeTheme } from './vscode-themes';
import './demo.css';

const ARAZZO = import.meta.glob('../../../../app/public/workflows/**/*.arazzo.yaml', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const OPENAPI = import.meta.glob(['../../../../app/public/workflows/**/openapi.yaml', '../../../../app/public/openapi/*.yaml'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const PREFIX = '../../../../app/public/workflows/';

/** Synthetic large workflow (perf / large-graph degradation): ?example=large-100. */
function largeDoc(n: number): string {
  const steps = Array.from({ length: n }, (_, i) => {
    const lines = [`      - stepId: s${i}`, `        operationPath: '{$sourceDescriptions.api.url}#/paths/~1items~1${i}/${i % 3 ? 'get' : 'post'}'`];
    if (i % 7 === 3) lines.push(`        onFailure:`, `          - name: retry${i}`, `            type: retry`, `            retryLimit: 2`, `            retryAfter: 1`);
    if (i % 11 === 5 && i > 6) lines.push(`        onSuccess:`, `          - name: back${i}`, `            type: goto`, `            stepId: s${i - 4}`, `            criteria:`, `              - condition: $statusCode == 202`);
    return lines.join('\n');
  });
  return `arazzo: 1.1.0\ninfo: { title: Large ${n}, version: 1.0.0 }\nsourceDescriptions:\n  - { name: api, url: ./api.yaml, type: openapi }\nworkflows:\n  - workflowId: large\n    steps:\n${steps.join('\n')}\n`;
}
ARAZZO[`${PREFIX}large-100.arazzo.yaml`] = largeDoc(100);
const EXAMPLES = Object.keys(ARAZZO)
  .sort()
  .map((p) => ({ id: p.slice(PREFIX.length).replace(/\/[^/]+$|\.arazzo\.yaml$/g, '').replace(/\.arazzo\.yaml$/, ''), path: p }));

function resolvePath(base: string, rel: string): string {
  const parts = base.split('/').slice(0, -1);
  for (const seg of rel.split('/')) {
    if (seg === '..') parts.pop();
    else if (seg !== '.') parts.push(seg);
  }
  return parts.join('/');
}

type ThemeId = 'light' | 'dark' | 'vscode-light' | 'vscode-dark' | 'vscode-hc';
const THEMES: { id: ThemeId; label: string }[] = [
  { id: 'light', label: 'ConnEthics clair' },
  { id: 'dark', label: 'ConnEthics sombre' },
  { id: 'vscode-light', label: 'VS Code Light+ (simulé)' },
  { id: 'vscode-dark', label: 'VS Code Dark+ (simulé)' },
  { id: 'vscode-hc', label: 'VS Code High Contrast (simulé)' },
];

const params = new URLSearchParams(location.search);
const param = (k: string) => params.get(k);

function App() {
  const [exampleId, setExampleId] = useState(param('example') ?? 'e2e-order-to-cash');
  const example = EXAMPLES.find((e) => e.id === exampleId) ?? EXAMPLES[0]!;
  const parsed = useMemo(() => parseArazzo(ARAZZO[example.path]!), [example.path]);
  const doc = parsed.doc as { info?: { title?: string }; workflows?: { workflowId: string }[]; sourceDescriptions?: { name: string; url: string; type?: string }[] } | undefined;
  const workflows = doc?.workflows?.map((w) => w.workflowId) ?? [];
  const [workflowId, setWorkflowId] = useState(param('workflow') ?? '');
  const wf = workflows.includes(workflowId) ? workflowId : workflows[0] ?? '';
  const [theme, setTheme] = useState<ThemeId>((param('theme') as ThemeId) ?? 'light');
  const [lang, setLang] = useState<'fr' | 'en'>((param('lang') as 'fr' | 'en') ?? 'fr');
  const [selected, setSelected] = useState<{ id: string; node: GraphNode; info: SelectionInfo } | null>(null);
  const [revealed, setRevealed] = useState<string | null>(null);
  const [stats, setStats] = useState<LayoutStats | null>(null);
  const [opts, setOpts] = useState<ArazzoGraphOptions | null>(null);

  const diagnostics = useMemo(() => (parsed.doc ? validate(parsed.doc, { yamlDoc: parsed.yamlDoc }) : []), [parsed]);
  const resolveOperation = useMemo(() => {
    const sources: Record<string, unknown> = {};
    for (const s of doc?.sourceDescriptions ?? []) {
      if (s.type && s.type !== 'openapi') continue;
      const text = OPENAPI[resolvePath(example.path, s.url)];
      if (text) sources[s.name] = parseYaml(text);
    }
    return createOpenApiResolver(sources);
  }, [doc, example.path]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme === 'dark' ? 'dark' : 'light';
    applyVsCodeTheme(theme === 'vscode-light' ? 'vscode-light' : theme === 'vscode-dark' ? 'vscode-dark' : theme === 'vscode-hc' ? 'vscode-high-contrast' : null);
    document.body.dataset.demoTheme = theme;
  }, [theme]);
  useEffect(() => setSelected(null), [example.path, wf]);
  useEffect(() => {
    if (!revealed) return;
    const t = setTimeout(() => setRevealed(null), 2500);
    return () => clearTimeout(t);
  }, [revealed]);

  const onSelect = useCallback((id: string | null, node: GraphNode | null, info: SelectionInfo | null) => setSelected(id && node && info ? { id, node, info } : null), []);
  const onReveal = useCallback((id: string, _n: GraphNode, info: SelectionInfo) => setRevealed(`step-selected → { stepId: ${id}, workflowId: ${info.workflowId} }`), []);
  const onReady = useCallback(() => {
    document.body.dataset.ready = String(Date.now());
  }, []);
  const vscode = theme.startsWith('vscode');

  return (
    <div className="demo">
      <header className="demo__header">
        <strong className="demo__brand">
          Arazzo <span>Flow</span> <small>by ConnEthics</small>
        </strong>
        <label>
          Exemple
          <select value={example.id} onChange={(e) => setExampleId(e.target.value)}>
            {EXAMPLES.map((e) => (
              <option key={e.id} value={e.id}>
                {e.id}
              </option>
            ))}
          </select>
        </label>
        <label>
          Workflow
          <select value={wf} onChange={(e) => setWorkflowId(e.target.value)}>
            {workflows.map((w) => (
              <option key={w}>{w}</option>
            ))}
          </select>
        </label>
        <label>
          Thème
          <select value={theme} onChange={(e) => setTheme(e.target.value as ThemeId)}>
            {THEMES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={() => setLang((l) => (l === 'fr' ? 'en' : 'fr'))}>
          {lang.toUpperCase()}
        </button>
      </header>
      <main className="demo__main">
        <section className="demo__graph">
          <ArazzoGraphFromDocument
            key={`${example.path}|${wf}`}
            doc={parsed.doc}
            workflowId={wf}
            resolveOperation={resolveOperation}
            diagnostics={diagnostics}
            theme={theme === 'light' ? 'connethics-light' : theme === 'dark' ? 'connethics-dark' : 'vscode'}
            lang={lang}
            layout={(param('dir') as 'TB' | 'LR') ?? 'TB'}
            lanes={(param('lanes') as LanesMode) ?? 'off'}
            density={(param('density') as DensityProp) ?? 'auto'}
            selectedStepId={param('select') ?? undefined}
            legendExpanded={param('legend') === '1'}
            showList={param('list') === '1'}
            elk={{ workerUrl }}
            onSelectStep={onSelect}
            onRevealStep={onReveal}
            onLayout={setStats}
            onOptionsChange={setOpts}
            onViewportReady={onReady}
            fallback={<p className="demo__empty">Workflow introuvable.</p>}
          />
        </section>
        <aside className="demo__side">
          <h1>{doc?.info?.title ?? example.id}</h1>
          <p className="demo__muted">
            <code>{wf}</code> · {diagnostics.filter((d) => d.severity === 'error').length} erreur(s), {diagnostics.filter((d) => d.severity === 'warning').length} avertissement(s)
          </p>
          {selected ? (
            <>
              <h2>{selected.id}</h2>
              <dl>
                <dt>Nœud</dt>
                <dd>
                  <code>{selected.info.nodeId}</code> ({selected.node.kind})
                </dd>
                <dt>Workflow</dt>
                <dd>{selected.info.workflowId}</dd>
                {selected.node.step?.operationId ? (
                  <>
                    <dt>operationId</dt>
                    <dd>
                      <code>{selected.node.step.operationId}</code>
                    </dd>
                  </>
                ) : null}
                {selected.node.step?.method ? (
                  <>
                    <dt>Méthode</dt>
                    <dd>
                      {selected.node.step.method} <code>{selected.node.step.path}</code> ({selected.node.step.methodSource})
                    </dd>
                  </>
                ) : null}
                {selected.node.step?.channelPath ? (
                  <>
                    <dt>Canal</dt>
                    <dd>
                      <code>{selected.node.step.channelPath}</code>
                    </dd>
                  </>
                ) : null}
                {selected.node.step?.successCriteria.length ? (
                  <>
                    <dt>Critères</dt>
                    <dd>
                      {selected.node.step.successCriteria.map((c, i) => (
                        <code key={i} className="demo__block">
                          {c.condition}
                        </code>
                      ))}
                    </dd>
                  </>
                ) : null}
              </dl>
            </>
          ) : (
            <p className="demo__muted">Cliquer une étape ; double-clic ou Entrée : « révéler dans l’éditeur ». Touche ? : raccourcis.</p>
          )}
          {revealed ? <p className="demo__toast" role="status">{revealed}</p> : null}
        </aside>
      </main>
      <footer className="demo__footer">
        <span>ELK : {stats ? (stats.mode === 'worker' ? 'Web Worker (workerUrl)' : 'thread principal') : '…'}</span>
        <span className="demo__layout-ms">{stats ? `${stats.ms} ms` : ''}</span>
        <span>{stats ? `${stats.nodes} nœuds · ${stats.edges} arêtes · densité ${stats.density}` : ''}</span>
        <span>{opts ? `${opts.layout} · couloirs ${opts.lanes}` : ''}</span>
        <span>thème {vscode ? 'vscode (--vscode-* simulées)' : theme}</span>
      </footer>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
