/**
 * Core graph (`workflowToGraph`, @connethics/arazzo-core) → render model (model.ts).
 *
 * Pure and deterministic: same input, same output (node order matters for ELK MODEL_ORDER).
 */
import type {
  Diagnostic,
  GraphEdge as CoreEdge,
  GraphNode as CoreNode,
  WorkflowGraph,
} from '@connethics/arazzo-core';
import type {
  ActionSummary,
  Criterion,
  EdgeKind,
  GraphDiagnostic,
  OutputEntry,
  PortId,
  SelectorRef,
  ViewEdge,
  ViewGraph,
  ViewGroup,
  ViewNode,
} from './model';

export interface AdaptOptions {
  /**
   * Workflow-level `successActions` / `failureActions` (edges with `action.origin === 'workflow'`):
   * `banner` (default, UI-SPEC D-DEFAULTS) shows them once in a banner and marks the steps with ⓦ;
   * `edges` draws them on every step.
   */
  workflowActions?: 'banner' | 'edges';
  /** Diagnostics of `@connethics/arazzo-core` (`validate`), attached to nodes by JSON path. */
  diagnostics?: readonly Diagnostic[];
  /**
   * Graphs of local workflows to expand inline as collapsible groups (UI-SPEC §4.6), keyed by
   * workflowId. A `workflow-ref` node pointing to one of them is replaced by its steps.
   */
  subgraphs?: Record<string, WorkflowGraph>;
}

const TERMINALS = new Set(['output', 'end-success', 'end-failure']);

function exprType(t: unknown): { type?: string; version?: string } {
  if (typeof t === 'string') return { type: t };
  if (t && typeof t === 'object') {
    const o = t as { type?: unknown; version?: unknown };
    const r: { type?: string; version?: string } = {};
    if (typeof o.type === 'string') r.type = o.type;
    if (typeof o.version === 'string') r.version = o.version;
    return r;
  }
  return {};
}

export function toCriteria(list: unknown): Criterion[] {
  if (!Array.isArray(list)) return [];
  return list
    .filter((c): c is { condition: unknown; context?: unknown; type?: unknown } => !!c && typeof c === 'object')
    .map((c) => {
      const out: Criterion = { condition: typeof c.condition === 'string' ? c.condition : String(c.condition ?? '') };
      if (typeof c.context === 'string') out.context = c.context;
      Object.assign(out, exprType(c.type));
      return out;
    });
}

function toOutputs(rec: Record<string, unknown> | undefined): OutputEntry[] {
  return Object.entries(rec ?? {}).map(([name, v]) => {
    if (typeof v === 'string') return { name, expression: v };
    if (v && typeof v === 'object' && typeof (v as { selector?: unknown }).selector === 'string') {
      const s = v as { context?: unknown; selector: string; type?: unknown };
      const t = exprType(s.type);
      const sel: SelectorRef = { context: typeof s.context === 'string' ? s.context : '', selector: s.selector, type: t.type ?? '?' };
      if (t.version) sel.version = t.version;
      return { name, selector: sel };
    }
    return { name, expression: JSON.stringify(v) };
  });
}

function shortRef(id: string): string {
  const m = /^\$sourceDescriptions\.([^.]+)\.(.+)$/.exec(id);
  return m ? m[2]! : id;
}

function convertNode(n: CoreNode, workflowId: string, bannerMode: boolean): ViewNode {
  const base = { id: n.id, workflowId, label: n.label, core: n };
  switch (n.kind) {
    case 'input':
      return {
        ...base,
        kind: 'input',
        inputs: (n.properties ?? []).map((p) => ({ name: p.name, required: p.required, type: p.type, default: p.default, description: p.description })),
      };
    case 'output':
      return { ...base, kind: 'output', workflowOutputs: toOutputs(n.outputs as Record<string, unknown> | undefined) };
    case 'end-success':
      return { ...base, kind: 'end', endType: 'success' };
    case 'end-failure':
      return { ...base, kind: 'end', endType: 'failure' };
    case 'join':
      return { ...base, kind: 'junction' };
    case 'workflow-ref': {
      const r = n.ref;
      const v: ViewNode = {
        ...base,
        kind: 'workflow-ref',
        targetWorkflowId: r ? (r.sourceName ? `$sourceDescriptions.${r.sourceName}.${r.workflowId}` : r.workflowId) : n.label,
        external: r?.external,
      };
      if (r?.sourceName) v.source = r.sourceName;
      if (r?.stepCount !== undefined) v.innerStepCount = r.stepCount;
      if (r?.summary) v.summary = r.summary;
      return v;
    }
    default: {
      const s = n.step!;
      const stepKind = n.kind === 'step-async-send' ? 'async-send' : n.kind === 'step-async-receive' ? 'async-receive' : n.kind === 'step-workflow' ? 'workflow' : 'http';
      const v: ViewNode = {
        ...base,
        kind: 'step',
        stepId: s.stepId,
        stepKind,
        order: s.index + 1,
        criteria: toCriteria(s.successCriteria),
        stepOutputs: s.outputs,
        parameters: s.parameters,
        hasRequestBody: s.hasRequestBody,
        usesWorkflowDefaults: bannerMode && s.usesWorkflowActions,
      };
      if (s.description) v.summary = s.description.split('\n')[0]!.trim();
      if (s.operationId) v.operationId = s.operationId;
      if (s.operationPath) v.operationPath = s.operationPath;
      if (s.source?.name) v.source = s.source.name;
      if (s.channelPath) v.channel = s.channelPath;
      if (s.action) v.action = s.action;
      if (s.timeout !== undefined) v.timeoutMs = s.timeout;
      if (s.correlationId !== undefined) v.correlationId = typeof s.correlationId === 'string' ? s.correlationId : JSON.stringify(s.correlationId);
      if (s.dependsOn) v.dependsOn = s.dependsOn;
      if (s.workflowId) {
        v.targetWorkflowId = s.workflowId;
        v.external = !!s.external;
      }
      if (stepKind === 'http') {
        if (s.method) {
          v.method = s.method;
          v.methodSource = s.methodSource === 'operationPath' ? 'operationPath' : 'openapi';
        } else v.methodSource = 'unresolved';
        if (s.path) v.path = s.path;
      }
      return v;
    }
  }
}

function convertEdge(e: CoreEdge, nodes: Map<string, CoreNode>): ViewEdge {
  let kind: EdgeKind;
  let ports: [PortId, PortId];
  const failure = e.outcome === 'failure';
  switch (e.kind) {
    case 'sequence':
      kind = 'sequence';
      ports = ['out-next', 'in'];
      break;
    case 'success-goto':
      kind = e.transfer ? 'transfer' : 'success';
      ports = ['out-success', 'in'];
      break;
    case 'failure-goto':
      kind = e.transfer ? 'transfer' : 'failure';
      ports = ['out-failure', 'in'];
      break;
    case 'retry':
      kind = 'retry';
      ports = e.via ? ['out-failure', 'in'] : ['out-retry', 'in'];
      break;
    case 'end':
      kind = failure ? (e.implicit ? 'implicit-failure' : 'end-failure') : 'end-success';
      ports = failure ? ['out-failure', 'in'] : ['out-success', 'in'];
      break;
    case 'depends-on': {
      kind = 'depends-on';
      const t = nodes.get(e.target);
      ports = ['out-next', t?.kind === 'join' ? 'in' : 'in-deps'];
      break;
    }
    case 'workflow-call':
      kind = 'workflow-call';
      ports = ['out-call', 'in'];
      break;
    default:
      kind = 'sequence';
      ports = ['out-next', 'in'];
  }
  const v: ViewEdge = { id: e.id, kind, source: e.source, target: e.target, sourcePort: ports[0], targetPort: ports[1], core: e };
  if (e.action?.name) v.name = e.action.name;
  if (e.criteria?.length) v.criteria = toCriteria(e.criteria);
  if (e.retryLimit !== undefined) v.retryLimit = e.retryLimit;
  if (e.retryAfter !== undefined) v.retryAfter = e.retryAfter;
  if (e.retryLimitIsDefault) v.retryDefaults = true;
  if (e.action?.component) v.reference = e.action.component;
  const target = nodes.get(e.target);
  if (e.via || e.transfer || e.kind === 'workflow-call') {
    v.via = target?.ref ? (target.ref.sourceName ? `$sourceDescriptions.${target.ref.sourceName}.${target.ref.workflowId}` : target.ref.workflowId) : target?.step?.stepId ?? target?.label ?? e.target;
  }
  v.origin = e.action?.origin === 'workflow' ? 'workflowDefault' : e.implicit ? 'implicit' : e.kind === 'depends-on' ? 'dependsOn' : failure ? 'onFailure' : 'onSuccess';
  const s = nodes.get(e.source)?.step;
  const t = target?.step;
  if (s && t && e.source !== e.target && t.index <= s.index) v.backward = true;
  return v;
}

/** Attach core diagnostics (by JSON path) to nodes of one workflow. */
export function diagnosticsByNode(graph: WorkflowGraph, diagnostics: readonly Diagnostic[] | undefined): Map<string, GraphDiagnostic[]> {
  const out = new Map<string, GraphDiagnostic[]>();
  if (!diagnostics?.length) return out;
  const stepByIndex = new Map<number, string>();
  for (const n of graph.nodes) if (n.step) stepByIndex.set(n.step.index, n.id);
  const add = (id: string | undefined, d: Diagnostic) => {
    if (!id) return;
    const list = out.get(id) ?? [];
    list.push({ severity: d.severity, code: d.code, message: d.message });
    out.set(id, list);
  };
  for (const d of diagnostics) {
    const p = d.path;
    if (p[0] !== 'workflows' || p[1] !== graph.workflowIndex) continue;
    if (p[2] === 'steps' && typeof p[3] === 'number') add(stepByIndex.get(p[3]), d);
    else if (p[2] === 'inputs') add('input', d);
    else if (p[2] === 'outputs') add(graph.nodes.some((n) => n.id === 'output') ? 'output' : undefined, d);
  }
  return out;
}

function summarize(e: CoreEdge, nodes: Map<string, CoreNode>): ActionSummary {
  const t = nodes.get(e.target);
  const a: ActionSummary = { name: e.action?.name ?? '', type: e.action?.type ?? e.kind, outcome: e.outcome === 'failure' ? 'failure' : 'success' };
  if (e.criteria?.length) a.criteria = toCriteria(e.criteria);
  if (e.retryLimit !== undefined) a.retryLimit = e.retryLimit;
  if (e.retryAfter !== undefined) a.retryAfter = e.retryAfter;
  if (t && e.source !== e.target) a.target = t.step?.stepId ?? (t.ref ? shortRef(t.ref.workflowId) : t.label);
  return a;
}

/** Core graph → render model. */
export function toViewGraph(graph: WorkflowGraph, opts: AdaptOptions = {}): ViewGraph {
  const bannerMode = (opts.workflowActions ?? 'banner') === 'banner';
  const coreNodes = new Map(graph.nodes.map((n) => [n.id, n]));
  const diags = diagnosticsByNode(graph, opts.diagnostics);

  // Workflow-level actions: banner (deduplicated by outcome + name) or edges.
  const defaults = { successActions: [] as ActionSummary[], failureActions: [] as ActionSummary[] };
  const seen = new Set<string>();
  const coreEdges = graph.edges.filter((e) => {
    if (!bannerMode || e.action?.origin !== 'workflow') return true;
    const key = `${e.outcome}|${e.action.name}|${e.via ? 'via' : ''}`;
    if (!seen.has(key)) {
      seen.add(key);
      const s = summarize(e, coreNodes);
      if (!e.via) (s.outcome === 'failure' ? defaults.failureActions : defaults.successActions).push(s);
      else {
        // Fold "retry via" into the matching retry rule.
        const list = s.outcome === 'failure' ? defaults.failureActions : defaults.successActions;
        const r = list.find((x) => x.name === s.name);
        if (r) r.target = s.target;
        else list.push(s);
      }
    }
    return false;
  });

  // Node order (ELK MODEL_ORDER): input, [join, step]…, references, terminals (UI-SPEC M4).
  const joinsByTarget = new Map<string, CoreNode[]>();
  for (const e of coreEdges) {
    const s = coreNodes.get(e.source);
    if (e.kind === 'depends-on' && s?.kind === 'join') {
      const list = joinsByTarget.get(e.target) ?? [];
      if (!list.includes(s)) list.push(s);
      joinsByTarget.set(e.target, list);
    }
  }
  const ordered: CoreNode[] = [];
  const pushed = new Set<string>();
  const push = (n: CoreNode | undefined) => {
    if (n && !pushed.has(n.id)) {
      pushed.add(n.id);
      ordered.push(n);
    }
  };
  push(coreNodes.get('input'));
  for (const n of graph.nodes) {
    if (!n.step) continue;
    for (const j of joinsByTarget.get(n.id) ?? []) push(j);
    push(n);
  }
  for (const n of graph.nodes) if (n.kind === 'join' || n.kind === 'workflow-ref') push(n);
  for (const id of ['output', 'end-success', 'end-failure']) push(coreNodes.get(id));
  for (const n of graph.nodes) push(n);

  // Keep only nodes still connected (banner mode can orphan a terminal or a reference).
  const touched = new Set(coreEdges.flatMap((e) => [e.source, e.target]));
  let nodes: ViewNode[] = ordered
    .filter((n) => n.kind === 'input' || n.step || n.kind === 'output' || touched.has(n.id))
    .map((n) => {
      const v = convertNode(n, graph.workflowId, bannerMode);
      const d = diags.get(n.id);
      if (d) v.diagnostics = d;
      return v;
    });
  const nodeIds = new Set(nodes.map((n) => n.id));
  let edges: ViewEdge[] = coreEdges.filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target)).map((e) => convertEdge(e, coreNodes));
  const groups: ViewGroup[] = [];

  // Inline expansion of local sub-workflows (depth 1).
  for (const ref of graph.nodes) {
    if (ref.kind !== 'workflow-ref' || !ref.ref || ref.ref.external || ref.ref.stepId || !nodeIds.has(ref.id)) continue;
    const wf = ref.ref.workflowId;
    const sub = opts.subgraphs?.[wf];
    if (!sub || wf === graph.workflowId || edges.some((e) => e.source === ref.id)) continue;
    const subView = toViewGraph(sub, { workflowActions: opts.workflowActions });
    const groupId = `group:${wf}`;
    const prefix = `${groupId}/`;
    const members = subView.nodes.filter((n) => n.kind === 'step' || n.kind === 'junction' || n.kind === 'workflow-ref');
    const firstStep = members.find((n) => n.kind === 'step');
    if (!firstStep) continue;
    const memberIds = new Set(members.map((n) => n.id));
    const inner = subView.nodes
      .filter((n) => memberIds.has(n.id))
      .map((n) => ({ ...n, id: prefix + n.id, groupId, workflowId: wf }));
    const innerEdges = subView.edges
      .filter((e) => memberIds.has(e.source) && memberIds.has(e.target))
      .map((e) => ({ ...e, id: prefix + e.id, source: prefix + e.source, target: prefix + e.target }));
    const at = nodes.findIndex((n) => n.id === ref.id);
    nodes = [...nodes.slice(0, at), ...inner, ...nodes.slice(at + 1)];
    edges = [
      ...edges.map((e) => (e.target === ref.id ? { ...e, target: prefix + firstStep.id, targetPort: 'in' as const } : e)),
      ...innerEdges,
    ];
    groups.push({ id: groupId, kind: 'workflow', label: wf, workflowId: wf });
  }

  const sources = graph.groups
    .filter((g) => g.kind === 'source' && g.sourceName)
    .map((g) => (g.sourceType ? { name: g.sourceName!, type: g.sourceType } : { name: g.sourceName! }));

  const view: ViewGraph = {
    workflowId: graph.workflowId,
    title: graph.summary ?? graph.workflowId,
    sources,
    nodes,
    edges,
    groups,
  };
  if (graph.summary) view.summary = graph.summary;
  if (defaults.successActions.length || defaults.failureActions.length) view.defaults = defaults;
  return view;
}

export { TERMINALS };
