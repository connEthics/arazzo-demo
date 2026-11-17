import type { ViewEdge, ViewGraph, ViewNode } from './model';
import type { Messages } from './messages';

export type Density = 'compact' | 'standard' | 'detailed';
export type Direction = 'TB' | 'LR';

/** 6000 → « 6 s », 1500 → « 1,5 s », 250 → « 250 ms ». */
export function formatTimeout(ms: number, lang: 'fr' | 'en' = 'fr'): string {
  if (ms < 1000) return `${ms} ms`;
  const s = Math.round((ms / 1000) * 10) / 10;
  return `${lang === 'fr' ? String(s).replace('.', ',') : s} s`;
}

export function formatSeconds(s: number, lang: 'fr' | 'en' = 'fr'): string {
  return `${lang === 'fr' ? String(s).replace('.', ',') : s} s`;
}

export function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

export function shortWorkflow(id: string): string {
  const m = /^\$sourceDescriptions\.([^.]+)\.(.+)$/.exec(id);
  return m ? m[2]! : id;
}

/** `$sourceDescriptions.commerce.createInvoice` → `createInvoice` (the source is shown elsewhere). */
export function shortOperationId(id: string): string {
  return id.replace(/^\$sourceDescriptions\.[^.]+\./, '');
}

/**
 * Readable operation of a step, for the node's secondary line and detail panels:
 * `METHOD /path` when the operation is resolved (operationPath or OpenAPI), otherwise the
 * operationId without its `$sourceDescriptions.<source>.` prefix, otherwise nothing.
 */
export function operationLabel(n: { method?: string; methodSource?: string; path?: string; operationId?: string }): string | undefined {
  if (n.method && n.path && n.methodSource !== 'unresolved') return `${n.method} ${n.path}`;
  if (n.operationId) return shortOperationId(n.operationId) || undefined;
  return undefined;
}

/** Edge label (chip). Runtime expressions are kept verbatim. */
export function edgeLabelText(e: ViewEdge, density: Density, lang: 'fr' | 'en' = 'fr'): string {
  const crit = e.criteria?.[0]?.condition;
  const withCrit = (base: string) => (density === 'detailed' && crit ? `${base} · ${truncate(crit, 24)}` : base);
  const end = lang === 'fr' ? 'fin' : 'end';
  switch (e.kind) {
    case 'sequence':
    case 'depends-on':
      return '';
    case 'success':
      return withCrit(`✓ ${e.name ?? truncate(crit ?? '', 24)}${e.backward ? ' ↺' : ''}`);
    case 'failure':
      return withCrit(`✗ ${e.name ?? truncate(crit ?? '', 24)}${e.backward ? ' ↺' : ''}`);
    case 'retry':
      if (e.via) return `↻ via ${shortWorkflow(e.via)}`;
      return withCrit(`↻ ×${e.retryLimit ?? 1}${e.retryAfter ? ` · ${formatSeconds(e.retryAfter, lang)}` : ''}`);
    case 'end-success':
      return e.criteria?.length ? withCrit(`✓ ${e.name ?? end}`) : '';
    case 'end-failure':
      return withCrit(`✗ ${e.name ?? end}`);
    case 'implicit-failure':
      return lang === 'fr' ? 'échec non géré' : 'unhandled failure';
    case 'workflow-call':
      return `⇢ ${shortWorkflow(e.via ?? '')}`;
    case 'transfer':
      return `${e.origin === 'onFailure' ? '✗' : '✓'} ↗ ${shortWorkflow(e.via ?? '')}`;
  }
}

/* ---------- Deterministic sizes (no DOM measurement before layout) ---------- */

export const NODE_WIDTH = { TB: 240, LR: 220 } as const;
export const HEIGHTS = { compact: 44, standard: 96, line: 18, maxLines: 5 } as const;

export function detailLines(n: ViewNode): number {
  if (n.kind === 'step') return Math.min(n.criteria?.length ?? 0, HEIGHTS.maxLines);
  if (n.kind === 'input') return Math.min(n.inputs?.length ?? 0, HEIGHTS.maxLines);
  if (n.kind === 'output') return Math.min(n.workflowOutputs?.length ?? 0, HEIGHTS.maxLines);
  return 0;
}

export function nodeSize(n: ViewNode, density: Density, dir: Direction): { width: number; height: number } {
  switch (n.kind) {
    case 'end':
      return { width: 72, height: 50 };
    case 'junction':
      return { width: 28, height: 28 };
    case 'workflow-ref':
      return { width: 200, height: 36 };
    default: {
      const width = NODE_WIDTH[dir];
      if (density === 'compact') return { width, height: HEIGHTS.compact };
      if (density === 'standard') return { width, height: HEIGHTS.standard };
      const lines = detailLines(n);
      return { width, height: HEIGHTS.standard + (lines ? 8 + lines * HEIGHTS.line : 0) };
    }
  }
}

/* ---------- Text measurement (edge labels) ---------- */

let ctx: CanvasRenderingContext2D | null | undefined;
export const LABEL_FONT = '500 11px Inter, ui-sans-serif, system-ui, sans-serif';

/** Width reserved for an edge label chip: 2D canvas when available, deterministic estimate otherwise (Node, jsdom). */
export function measureLabel(text: string): { width: number; height: number } {
  if (!text) return { width: 0, height: 0 };
  try {
    if (ctx === undefined) {
      ctx = typeof document !== 'undefined' && typeof navigator !== 'undefined' && !/jsdom/i.test(navigator.userAgent) ? document.createElement('canvas').getContext('2d') : null;
    }
    if (ctx) {
      ctx.font = LABEL_FONT;
      return { width: Math.ceil(ctx.measureText(text).width) + 16, height: 20 };
    }
  } catch {
    ctx = null;
  }
  return { width: Math.ceil(text.length * 6.4) + 16, height: 20 };
}

/* ---------- Accessible text ---------- */

export function methodText(n: ViewNode): string {
  if (n.stepKind === 'async-send') return 'SEND';
  if (n.stepKind === 'async-receive') return 'RECEIVE';
  if (n.stepKind === 'workflow') return 'WORKFLOW';
  if (n.methodSource === 'unresolved' || !n.method) return 'OP';
  return n.method;
}

export function badgeClass(n: ViewNode): string {
  const k = n.stepKind;
  if (k === 'async-send') return 'send';
  if (k === 'async-receive') return 'receive';
  if (k === 'workflow') return 'workflow';
  const t = methodText(n);
  return t === 'OP' ? 'op' : t.toLowerCase();
}

export function kindText(n: ViewNode, m: Messages): string {
  switch (n.stepKind) {
    case 'async-send':
      return m.kindSend(n.channel ?? '?');
    case 'async-receive':
      return m.kindReceive(n.channel ?? '?', n.timeoutMs != null ? formatTimeout(n.timeoutMs, m.lang) : undefined, n.correlationId);
    case 'workflow':
      return m.kindWorkflow(shortWorkflow(n.targetWorkflowId ?? '?'), n.collapsed, n.innerStepCount);
    default:
      return m.kindHttp(methodText(n), n.path);
  }
}

export function nodeName(n: ViewNode | undefined, m: Messages, fallback = '?'): string {
  if (!n) return fallback;
  if (n.kind === 'end') return n.endType === 'failure' ? m.endFailure : m.endSuccess;
  if (n.kind === 'output') return m.outputs;
  if (n.kind === 'input') return m.inputs;
  if (n.kind === 'junction') return m.junction;
  if (n.kind === 'workflow-ref') return shortWorkflow(n.targetWorkflowId ?? n.label);
  return n.label;
}

export function exitText(e: ViewEdge, target: ViewNode | undefined, m: Messages): string {
  const endName =
    m.lang === 'fr' ? (target?.endType === 'failure' ? 'la fin en échec' : 'la fin') : target?.endType === 'failure' ? 'the failure end' : 'the end';
  const t = target ? (target.kind === 'end' ? endName : target.kind === 'output' || target.kind === 'junction' ? nodeName(target, m).toLowerCase() : nodeName(target, m)) : e.target;
  switch (e.kind) {
    case 'success':
    case 'end-success':
      return m.exitSuccess(t);
    case 'failure':
    case 'end-failure':
    case 'implicit-failure':
      return m.exitFailure(t);
    case 'transfer':
      return e.origin === 'onFailure' ? m.exitFailure(t) : m.exitSuccess(t);
    case 'retry':
      return m.exitRetry(e.retryLimit ?? 1, e.retryAfter ?? 0, e.via ? shortWorkflow(e.via) : undefined);
    case 'workflow-call':
      return m.exitCall(t);
    case 'depends-on':
      return m.exitDepends(t);
    default:
      return m.exitNext(t);
  }
}

export function edgeTitle(e: ViewEdge, target: ViewNode | undefined, m: Messages, label: string): string {
  const parts = [label || (e.kind === 'sequence' ? m.then : e.kind), exitText(e, target, m)];
  if (e.criteria?.length) parts.push(`${m.if} ${e.criteria.map((c) => c.condition).join(` ${m.and} `)}`);
  if (e.reference) parts.push(m.reusable(e.reference));
  if (e.retryDefaults) parts.push(m.defaultValues);
  return parts.join(' — ');
}

export function ariaLabelFor(n: ViewNode, g: ViewGraph, m: Messages, byId?: Map<string, ViewNode>): string {
  const ids = byId ?? new Map(g.nodes.map((x) => [x.id, x]));
  const out = g.edges.filter((e) => e.source === n.id);
  switch (n.kind) {
    case 'step': {
      const total = g.nodes.filter((x) => x.kind === 'step' && x.workflowId === n.workflowId).length;
      return m.ariaStep({
        order: n.order,
        total,
        id: n.label,
        kindText: kindText(n, m),
        source: n.source,
        exits: out.map((e) => exitText(e, ids.get(e.target), m)),
        diagnostics: n.diagnostics?.length ?? 0,
      });
    }
    case 'input': {
      const ins = n.inputs ?? [];
      return m.ariaInputs(ins.length, ins.filter((i) => i.required).length, ins.map((i) => i.name));
    }
    case 'output':
      return m.ariaOutputs((n.workflowOutputs ?? []).map((o) => o.name));
    case 'end':
      return m.ariaEnd(n.endType === 'failure', new Set(g.edges.filter((e) => e.target === n.id).map((e) => e.source)).size);
    case 'junction': {
      const target = out[0] ? nodeName(ids.get(out[0].target), m) : '?';
      const deps = g.edges.filter((e) => e.target === n.id).map((e) => nodeName(ids.get(e.source), m, e.source));
      return m.ariaJunction(target, deps);
    }
    case 'workflow-ref':
      return m.ariaRef(shortWorkflow(n.targetWorkflowId ?? n.label), n.source);
  }
}
