// ═══════════════════════════════════════════════════════════════════════════════
// Renderer-agnostic workflow graph (R5 § 4.3-4.7) and Mermaid export.
// ═══════════════════════════════════════════════════════════════════════════════
import {
  asArray,
  asObj,
  effectiveActions,
  findWorkflow,
  isObj,
  resolveInputsSchema,
  resolveParameters,
  resolveStepSource,
  sourcesOf,
} from './model.js';
import type { ResolvedSource } from './model.js';
import type {
  AsyncAction,
  Criterion,
  FailureAction,
  OutputValue,
  SourceDescription,
  SourceDescriptionType,
  Step,
  SuccessAction,
} from './types.js';

export type GraphNodeKind =
  | 'input'
  | 'step-http'
  | 'step-async-send'
  | 'step-async-receive'
  | 'step-workflow'
  | 'join'
  | 'output'
  | 'end-success'
  | 'end-failure'
  /** Target of a `goto workflowId`, of a workflow step, or of a cross-workflow dependsOn (R5 "Référence de workflow"). */
  | 'workflow-ref';

export type GraphEdgeKind = 'sequence' | 'success-goto' | 'failure-goto' | 'retry' | 'end' | 'depends-on' | 'workflow-call';

export interface StepInfo {
  stepId: string;
  /** 0-based position in `steps`. */
  index: number;
  description?: string;
  operationId?: string;
  operationPath?: string;
  channelPath?: string;
  workflowId?: string;
  /** Source description the step talks to (never guessed across several sources). */
  source?: { name: string; type?: SourceDescriptionType; how: NonNullable<ResolvedSource['how']> };
  /** HTTP method in upper case, only when known (operationPath or resolver) — never inferred from the operationId. */
  method?: string;
  /** HTTP path template (`/pets/{id}`), when known. */
  path?: string;
  methodSource?: 'operationPath' | 'resolver';
  action?: AsyncAction;
  correlationId?: unknown;
  /** Milliseconds. */
  timeout?: number;
  dependsOn?: string[];
  successCriteria: Criterion[];
  outputs: string[];
  parameters: { name: string; in?: string }[];
  hasRequestBody: boolean;
  /** Workflow-level success/failure actions apply to this step. */
  usesWorkflowActions: boolean;
  /** For workflow steps: the called workflow lives in another document. */
  external?: boolean;
}

export interface InputProperty {
  name: string;
  required: boolean;
  type?: string;
  description?: string;
  default?: unknown;
}

export interface GraphNode {
  id: string;
  kind: GraphNodeKind;
  label: string;
  /** Lane / cluster ({@link GraphGroup.id}). */
  group: string;
  step?: StepInfo;
  /** `input` nodes. */
  properties?: InputProperty[];
  /** `output` nodes: output name → expression or Selector. */
  outputs?: Record<string, OutputValue>;
  /** `join` nodes: ids of the nodes waited for. */
  waitsFor?: string[];
  /** `workflow-ref` nodes. */
  ref?: { workflowId: string; stepId?: string; sourceName?: string; external: boolean; resolved: boolean; summary?: string; stepCount?: number };
}

export interface GraphEdge {
  id: string;
  kind: GraphEdgeKind;
  source: string;
  target: string;
  /** Default short label (renderers may build their own from the data). */
  label?: string;
  /** For `end`, goto and retry edges. */
  outcome?: 'success' | 'failure';
  /** The action behind the edge (resolved from `$components` when needed). */
  action?: { name: string; type: string; origin: 'step' | 'workflow'; component?: string };
  criteria?: Criterion[];
  /** True when the edge only applies if its criteria match. */
  conditional: boolean;
  /** `retry` edges: effective limit (default 1 per § 5.8.8.1) and delay in seconds. */
  retryLimit?: number;
  retryAfter?: number;
  retryLimitIsDefault?: boolean;
  /** `retry` edge towards the step/workflow executed before retrying (the self-loop is a separate edge). */
  via?: boolean;
  /** goto to another workflow. */
  transfer?: boolean;
  /** Implicit failure (no onFailure): only with `includeImplicitFailures`. */
  implicit?: boolean;
}

export interface GraphGroup {
  id: string;
  kind: 'source' | 'workflow' | 'unknown';
  label: string;
  sourceName?: string;
  sourceType?: SourceDescriptionType;
  nodeIds: string[];
}

export interface WorkflowGraph {
  workflowId: string;
  /**
   * Position of the workflow in `workflows` (document order). Lets consumers map
   * diagnostics paths (`['workflows', workflowIndex, 'steps', step.index, …]`) onto nodes.
   */
  workflowIndex: number;
  summary?: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  /** Lanes by sourceDescription (document order), plus the neutral "workflow" lane. */
  groups: GraphGroup[];
}

export interface OperationInfo {
  method?: string;
  path?: string;
}

export interface GraphOptions {
  /** Resolve the HTTP method / path of a step from the loaded OpenAPI document (consumer side). */
  resolveOperation?: (step: Step, source: SourceDescription | undefined) => OperationInfo | undefined;
  /** Draw workflow-level successActions / failureActions on each step (default true). Edges carry `action.origin`. */
  includeWorkflowActions?: boolean;
  /** Draw an implicit failure edge to "end-failure" for steps without failure actions (default false). */
  includeImplicitFailures?: boolean;
}

export const WORKFLOW_LANE = 'lane:workflow';
export const UNKNOWN_LANE = 'lane:unknown';
const HTTP_METHODS = new Set(['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace', 'query']);

/** `{$sourceDescriptions.x.url}#/paths/~1pets~1{id}/get` → `{ method: 'GET', path: '/pets/{id}' }`. */
export function operationFromPath(operationPath: string): OperationInfo | undefined {
  const hash = operationPath.indexOf('#');
  if (hash < 0) return undefined;
  let ptr = operationPath.slice(hash + 1);
  try {
    ptr = decodeURIComponent(ptr);
  } catch {
    /* keep raw */
  }
  const segs = ptr.split('/').slice(1).map((s) => s.replace(/~1/g, '/').replace(/~0/g, '~'));
  if (segs.length < 3 || (segs[0] !== 'paths' && segs[0] !== 'webhooks')) return undefined;
  const method = segs[segs.length - 1]!.toLowerCase();
  if (!HTTP_METHODS.has(method)) return undefined;
  return { method: method.toUpperCase(), path: segs[0] === 'paths' ? segs.slice(1, -1).join('/') : undefined };
}

const noCriteria = (c: unknown): boolean => !Array.isArray(c) || c.length === 0;

/**
 * Build the graph of one workflow. Throws when the workflow does not exist.
 */
export function workflowToGraph(doc: unknown, workflowId: string, opts: GraphOptions = {}): WorkflowGraph {
  const wf = findWorkflow(doc, workflowId);
  if (!wf) throw new Error(`Workflow not found: ${workflowId}`);
  const includeWfActions = opts.includeWorkflowActions !== false;
  const sources = sourcesOf(doc);
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const nodeById = new Map<string, GraphNode>();
  let edgeSeq = 0;

  const addNode = (n: GraphNode): GraphNode => {
    const existing = nodeById.get(n.id);
    if (existing) return existing;
    nodes.push(n);
    nodeById.set(n.id, n);
    return n;
  };
  const addEdge = (e: Omit<GraphEdge, 'id'>): GraphEdge => {
    const edge: GraphEdge = { id: `e${edgeSeq++}:${e.kind}:${e.source}->${e.target}`, ...e };
    edges.push(edge);
    return edge;
  };

  // ── Input node
  const inputSchema = resolveInputsSchema(doc, wf.inputs);
  const required = new Set(asArray(inputSchema?.required).filter((x): x is string => typeof x === 'string'));
  const properties: InputProperty[] = Object.entries(asObj(inputSchema?.properties)).map(([name, raw]) => {
    const p = resolveInputsSchema(doc, raw) ?? {};
    const prop: InputProperty = { name, required: required.has(name) };
    if (typeof p.type === 'string') prop.type = p.type;
    else if (Array.isArray(p.type)) prop.type = p.type.join(' | ');
    if (typeof p.description === 'string') prop.description = p.description;
    if ('default' in p) prop.default = p.default;
    return prop;
  });
  addNode({ id: 'input', kind: 'input', label: 'Inputs', group: WORKFLOW_LANE, properties });

  // ── Step nodes
  const steps = asArray(wf.steps).filter(isObj) as unknown as Step[];
  const stepNodeId = new Map<string, string>();
  const ids: string[] = [];
  steps.forEach((step, index) => {
    const sid = typeof step.stepId === 'string' ? step.stepId : `#${index}`;
    const id = stepNodeId.has(sid) ? `step:${sid}~${index}` : `step:${sid}`;
    if (!stepNodeId.has(sid)) stepNodeId.set(sid, id);
    ids.push(id);
    const src = resolveStepSource(doc, step);
    const info: StepInfo = {
      stepId: sid,
      index,
      successCriteria: asArray(step.successCriteria).filter(isObj) as unknown as Criterion[],
      outputs: Object.keys(asObj(step.outputs)),
      parameters: resolveParameters(doc, step.parameters)
        .map((r) => r.value)
        .filter((p) => typeof p.name === 'string')
        .map((p) => (p.in ? { name: p.name, in: p.in } : { name: p.name })),
      hasRequestBody: step.requestBody !== undefined,
      usesWorkflowActions: false,
    };
    for (const f of ['description', 'operationId', 'operationPath', 'channelPath', 'workflowId'] as const) {
      if (typeof step[f] === 'string') info[f] = step[f];
    }
    if (src.name && src.how) info.source = { name: src.name, type: src.type, how: src.how };
    if (step.action === 'send' || step.action === 'receive') info.action = step.action;
    if (step.correlationId !== undefined) info.correlationId = step.correlationId;
    if (typeof step.timeout === 'number') info.timeout = step.timeout;
    if (Array.isArray(step.dependsOn)) info.dependsOn = step.dependsOn.filter((d): d is string => typeof d === 'string');
    const op =
      (typeof step.operationPath === 'string' ? operationFromPath(step.operationPath) : undefined) ??
      undefined;
    if (op) {
      info.method = op.method;
      if (op.path) info.path = op.path;
      info.methodSource = 'operationPath';
    } else if (opts.resolveOperation && step.workflowId === undefined && step.channelPath === undefined) {
      const r = opts.resolveOperation(step, src.name ? sources.find((s) => s.name === src.name) : undefined);
      if (r?.method) info.method = r.method.toUpperCase();
      if (r?.path) info.path = r.path;
      if (r && (r.method || r.path)) info.methodSource = 'resolver';
    }

    let kind: GraphNodeKind;
    if (typeof step.workflowId === 'string') {
      kind = 'step-workflow';
      info.external = step.workflowId.startsWith('$sourceDescriptions.');
    } else if (step.action === 'send') kind = 'step-async-send';
    else if (step.action === 'receive' || step.channelPath !== undefined || src.type === 'asyncapi') kind = 'step-async-receive';
    else kind = 'step-http';

    const lane = src.name ? `lane:${src.name}` : kind === 'step-workflow' ? WORKFLOW_LANE : UNKNOWN_LANE;
    addNode({ id, kind, label: sid, group: lane, step: info });
  });

  // ── Terminal nodes (created on demand)
  const hasOutputs = isObj(wf.outputs) && Object.keys(wf.outputs).length > 0;
  const successTerminal = (): string => {
    if (hasOutputs) return addNode({ id: 'output', kind: 'output', label: 'Outputs', group: WORKFLOW_LANE, outputs: wf.outputs as Record<string, OutputValue> }).id;
    return addNode({ id: 'end-success', kind: 'end-success', label: 'End', group: WORKFLOW_LANE }).id;
  };
  const failureTerminal = (): string => addNode({ id: 'end-failure', kind: 'end-failure', label: 'Failure', group: WORKFLOW_LANE }).id;
  const workflowRef = (ref: string, stepId?: string): string => {
    const m = /^\$sourceDescriptions\.([^.]+)\.(.+)$/.exec(ref);
    const external = !!m;
    const targetWf = external ? undefined : findWorkflow(doc, ref);
    const id = `ref:${ref}${stepId ? `/steps/${stepId}` : ''}`;
    const node: GraphNode = {
      id,
      kind: 'workflow-ref',
      label: stepId ? `${m ? m[2] : ref} › ${stepId}` : m ? m[2]! : ref,
      group: m && sources.some((s) => s.name === m[1]) ? `lane:${m[1]}` : WORKFLOW_LANE,
      ref: { workflowId: m ? m[2]! : ref, external, resolved: external ? false : !!targetWf },
    };
    if (stepId) node.ref!.stepId = stepId;
    if (m) node.ref!.sourceName = m[1];
    if (targetWf?.summary) node.ref!.summary = targetWf.summary;
    if (targetWf) node.ref!.stepCount = asArray(targetWf.steps).length;
    return addNode(node).id;
  };

  if (steps.length === 0) addEdge({ kind: 'sequence', source: 'input', target: successTerminal(), conditional: false });
  else addEdge({ kind: 'sequence', source: 'input', target: ids[0]!, conditional: false });

  const wfActionsDeclared = asArray(wf.successActions).length + asArray(wf.failureActions).length > 0;

  steps.forEach((step, i) => {
    const id = ids[i]!;
    const node = nodeById.get(id)!;
    const successActions = effectiveActions<SuccessAction>(doc, wf, step, 'success').filter((a) => includeWfActions || a.origin === 'step');
    const failureActions = effectiveActions<FailureAction>(doc, wf, step, 'failure').filter((a) => includeWfActions || a.origin === 'step');
    node.step!.usesWorkflowActions =
      wfActionsDeclared && [...effectiveActions(doc, wf, step, 'success'), ...effectiveActions(doc, wf, step, 'failure')].some((a) => a.origin === 'workflow');

    const meta = (a: { value: { name?: unknown; type?: unknown }; origin: 'step' | 'workflow'; componentName?: string }) => {
      const m: NonNullable<GraphEdge['action']> = { name: String(a.value.name ?? ''), type: String(a.value.type ?? ''), origin: a.origin };
      if (a.componentName) m.component = a.componentName;
      return m;
    };
    const criteriaOf = (c: unknown): Criterion[] => asArray(c).filter(isObj) as unknown as Criterion[];

    // Success actions
    let unconditional = false;
    for (const a of successActions) {
      const act = a.value;
      const conditional = !noCriteria(act.criteria);
      if (!conditional && (act.type === 'goto' || act.type === 'end')) unconditional = true;
      const base = { action: meta(a), criteria: criteriaOf(act.criteria), conditional, outcome: 'success' as const };
      if (act.type === 'goto') {
        if (typeof act.stepId === 'string' && stepNodeId.has(act.stepId)) {
          addEdge({ ...base, kind: 'success-goto', source: id, target: stepNodeId.get(act.stepId)!, label: `✓ ${act.name}` });
        } else if (typeof act.workflowId === 'string') {
          addEdge({ ...base, kind: 'success-goto', source: id, target: workflowRef(act.workflowId), label: `↗ ${act.workflowId}`, transfer: true });
        }
      } else if (act.type === 'end') {
        addEdge({ ...base, kind: 'end', source: id, target: successTerminal(), label: conditional ? '✓ end' : undefined });
      }
    }

    // Failure actions
    for (const a of failureActions) {
      const act = a.value;
      const conditional = !noCriteria(act.criteria);
      const base = { action: meta(a), criteria: criteriaOf(act.criteria), conditional, outcome: 'failure' as const };
      if (act.type === 'goto') {
        if (typeof act.stepId === 'string' && stepNodeId.has(act.stepId)) {
          addEdge({ ...base, kind: 'failure-goto', source: id, target: stepNodeId.get(act.stepId)!, label: `✗ ${act.name}` });
        } else if (typeof act.workflowId === 'string') {
          addEdge({ ...base, kind: 'failure-goto', source: id, target: workflowRef(act.workflowId), label: `↗ ${act.workflowId}`, transfer: true });
        }
      } else if (act.type === 'retry') {
        const limitIsDefault = typeof act.retryLimit !== 'number';
        const retryLimit = limitIsDefault ? 1 : (act.retryLimit as number);
        const retryAfter = typeof act.retryAfter === 'number' ? act.retryAfter : undefined;
        const label = `↻ ×${retryLimit}${retryAfter !== undefined ? ` · ${retryAfter} s` : ''}`;
        const retry: Omit<GraphEdge, 'id'> = { ...base, kind: 'retry', source: id, target: id, label, retryLimit, retryLimitIsDefault: limitIsDefault };
        if (retryAfter !== undefined) retry.retryAfter = retryAfter;
        addEdge(retry);
        const viaTarget =
          typeof act.stepId === 'string' && stepNodeId.has(act.stepId)
            ? stepNodeId.get(act.stepId)!
            : typeof act.workflowId === 'string'
              ? workflowRef(act.workflowId)
              : undefined;
        if (viaTarget) {
          const via: Omit<GraphEdge, 'id'> = {
            ...base,
            kind: 'retry',
            source: id,
            target: viaTarget,
            label: `↻ via ${act.stepId ?? act.workflowId}`,
            retryLimit,
            retryLimitIsDefault: limitIsDefault,
            via: true,
          };
          if (retryAfter !== undefined) via.retryAfter = retryAfter;
          addEdge(via);
        }
      } else if (act.type === 'end') {
        addEdge({ ...base, kind: 'end', source: id, target: failureTerminal(), label: '✗ end' });
      }
    }
    if (failureActions.length === 0 && opts.includeImplicitFailures) {
      addEdge({ kind: 'end', source: id, target: failureTerminal(), outcome: 'failure', conditional: true, implicit: true, label: 'unhandled failure' });
    }

    // Workflow call
    if (typeof step.workflowId === 'string') {
      addEdge({ kind: 'workflow-call', source: id, target: workflowRef(step.workflowId), conditional: false, label: `⇢ ${step.workflowId}` });
    }

    // Implicit sequence (suppressed only by an unconditional success action)
    if (!unconditional) {
      const next = steps[i + 1];
      if (!next) addEdge({ kind: 'sequence', source: id, target: successTerminal(), conditional: false });
      else {
        const nextDeps = asArray(next.dependsOn);
        if (!nextDeps.includes(step.stepId)) addEdge({ kind: 'sequence', source: id, target: ids[i + 1]!, conditional: false });
      }
    }
  });

  // dependsOn (join nodes for ≥ 2 dependencies)
  steps.forEach((step, i) => {
    const deps = asArray(step.dependsOn).filter((d): d is string => typeof d === 'string');
    if (!deps.length) return;
    const id = ids[i]!;
    const depIds: string[] = [];
    for (const d of deps) {
      let m: RegExpExecArray | null;
      if ((m = /^\$workflows\.([^.]+)\.steps\.([^.]+)$/.exec(d))) depIds.push(workflowRef(m[1]!, m[2]!));
      else if ((m = /^\$sourceDescriptions\.([^.]+)\.([^.]+)\.steps\.([^.]+)$/.exec(d))) depIds.push(workflowRef(`$sourceDescriptions.${m[1]}.${m[2]}`, m[3]!));
      else if (stepNodeId.has(d)) depIds.push(stepNodeId.get(d)!);
    }
    if (depIds.length >= 2) {
      const joinId = `join:${step.stepId}`;
      addNode({ id: joinId, kind: 'join', label: '+', group: WORKFLOW_LANE, waitsFor: depIds });
      for (const d of depIds) addEdge({ kind: 'depends-on', source: d, target: joinId, conditional: false });
      addEdge({ kind: 'depends-on', source: joinId, target: id, conditional: false });
    } else if (depIds.length === 1) {
      addEdge({ kind: 'depends-on', source: depIds[0]!, target: id, conditional: false });
    }
  });

  // Groups: lanes by sourceDescription (document order), then workflow, then unknown.
  const groups: GraphGroup[] = [];
  for (const s of sources) {
    if (typeof s.name !== 'string') continue;
    const nodeIds = nodes.filter((n) => n.group === `lane:${s.name}`).map((n) => n.id);
    if (!nodeIds.length) continue;
    const g: GraphGroup = { id: `lane:${s.name}`, kind: 'source', label: s.name, sourceName: s.name, nodeIds };
    if (s.type) g.sourceType = s.type;
    groups.push(g);
  }
  groups.push({ id: WORKFLOW_LANE, kind: 'workflow', label: 'Workflow', nodeIds: nodes.filter((n) => n.group === WORKFLOW_LANE).map((n) => n.id) });
  const unknown = nodes.filter((n) => n.group === UNKNOWN_LANE).map((n) => n.id);
  if (unknown.length) groups.push({ id: UNKNOWN_LANE, kind: 'unknown', label: 'Unknown source', nodeIds: unknown });

  const graph: WorkflowGraph = { workflowId, workflowIndex: asArray(asObj(doc).workflows).indexOf(wf), nodes, edges, groups };
  if (typeof wf.summary === 'string') graph.summary = wf.summary;
  return graph;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Mermaid export
// ═══════════════════════════════════════════════════════════════════════════════
export interface MermaidOptions {
  direction?: 'TB' | 'LR' | 'BT' | 'RL';
  /** Wrap nodes in one subgraph per lane. */
  lanes?: boolean;
  /** Omit failure-goto, retry and failure end edges. */
  hideFailures?: boolean;
}

const MERMAID_CLASSES: Record<GraphNodeKind, string> = {
  input: 'fill:#eff6ff,stroke:#2563eb,color:#1e3a8a',
  'step-http': 'fill:#ffffff,stroke:#475569,color:#0f172a',
  'step-async-send': 'fill:#f5f3ff,stroke:#7c3aed,color:#4c1d95',
  'step-async-receive': 'fill:#f5f3ff,stroke:#7c3aed,color:#4c1d95',
  'step-workflow': 'fill:#fff7ed,stroke:#f97316,color:#7c2d12,stroke-width:3px',
  join: 'fill:#ffffff,stroke:#64748b,color:#0f172a',
  output: 'fill:#fefce8,stroke:#ca8a04,color:#713f12',
  'end-success': 'fill:#f0fdf4,stroke:#16a34a,color:#14532d,stroke-width:3px',
  'end-failure': 'fill:#fef2f2,stroke:#dc2626,color:#7f1d1d,stroke-width:3px',
  'workflow-ref': 'fill:#fff7ed,stroke:#f97316,color:#7c2d12,stroke-dasharray:4 3',
};

const EDGE_STYLE: Record<GraphEdgeKind, string> = {
  sequence: 'stroke:#64748b',
  'success-goto': 'stroke:#16a34a,stroke-width:2px',
  'failure-goto': 'stroke:#dc2626,stroke-width:2px',
  retry: 'stroke:#d97706,stroke-width:2px',
  end: 'stroke:#64748b',
  'depends-on': 'stroke:#0891b2,stroke-dasharray:2 4',
  'workflow-call': 'stroke:#f97316,stroke-width:2px',
};

/** Escape a label for a quoted Mermaid string (runtime expressions are kept verbatim). */
function mermaidText(s: string): string {
  return s.replace(/"/g, '#quot;').replace(/</g, '#lt;').replace(/>/g, '#gt;').replace(/\r?\n/g, ' ');
}

function nodeText(n: GraphNode): string {
  const s = n.step;
  switch (n.kind) {
    case 'input': {
      const props = (n.properties ?? []).map((p) => p.name + (p.required ? '*' : ''));
      return `Inputs${props.length ? ': ' + props.slice(0, 4).join(', ') + (props.length > 4 ? ` +${props.length - 4}` : '') : ''}`;
    }
    case 'output': {
      const keys = Object.keys(n.outputs ?? {});
      return `Outputs: ${keys.slice(0, 4).join(', ')}${keys.length > 4 ? ` +${keys.length - 4}` : ''}`;
    }
    case 'end-success':
      return '✓';
    case 'end-failure':
      return '✗';
    case 'join':
      return '+';
    case 'workflow-ref':
      return `↗ ${n.label}`;
    case 'step-workflow':
      return `${s!.index + 1}. WORKFLOW ${s!.stepId}`;
    case 'step-async-send':
      return `${s!.index + 1}. SEND ${s!.stepId}`;
    case 'step-async-receive':
      return `${s!.index + 1}. RECEIVE ${s!.stepId}${s!.timeout !== undefined ? ` ⏱ ${s!.timeout} ms` : ''}`;
    default:
      return `${s!.index + 1}. ${s!.method ?? ''}${s!.method ? ' ' : ''}${s!.stepId}`;
  }
}

function shape(n: GraphNode, id: string): string {
  const t = `"${mermaidText(nodeText(n))}"`;
  switch (n.kind) {
    case 'input':
      return `${id}[/${t}/]`;
    case 'output':
      return `${id}[/${t}\\]`;
    case 'end-success':
    case 'end-failure':
      return `${id}((${t}))`;
    case 'join':
      return `${id}{${t}}`;
    case 'step-workflow':
    case 'workflow-ref':
      return `${id}[[${t}]]`;
    case 'step-async-send':
      return `${id}>${t}]`;
    case 'step-async-receive':
      return `${id}([${t}])`;
    default:
      return `${id}[${t}]`;
  }
}

/** Mermaid `flowchart` source for a graph built by {@link workflowToGraph}. */
export function graphToMermaid(graph: WorkflowGraph, opts: MermaidOptions = {}): string {
  const lines: string[] = [`flowchart ${opts.direction ?? 'TB'}`];
  const idMap = new Map<string, string>();
  const used = new Set<string>();
  for (const n of graph.nodes) {
    let base = 'n_' + n.id.replace(/[^A-Za-z0-9_]/g, '_');
    let id = base;
    for (let i = 2; used.has(id); i++) id = `${base}_${i}`;
    used.add(id);
    idMap.set(n.id, id);
  }
  for (const [kind, style] of Object.entries(MERMAID_CLASSES)) lines.push(`  classDef ${kind.replace(/-/g, '_')} ${style}`);
  const nodeLine = (n: GraphNode) => `${shape(n, idMap.get(n.id)!)}:::${n.kind.replace(/-/g, '_')}`;
  if (opts.lanes) {
    graph.groups.forEach((g, gi) => {
      const members = graph.nodes.filter((n) => n.group === g.id);
      if (!members.length) return;
      const title = g.sourceType ? `${g.label} (${g.sourceType})` : g.label;
      lines.push(`  subgraph lane_${gi}["${mermaidText(title)}"]`);
      for (const n of members) lines.push(`    ${nodeLine(n)}`);
      lines.push('  end');
    });
  } else {
    for (const n of graph.nodes) lines.push(`  ${nodeLine(n)}`);
  }
  const styles: string[] = [];
  let linkIndex = 0;
  for (const e of graph.edges) {
    const failure = e.outcome === 'failure' || e.kind === 'failure-goto' || e.kind === 'retry';
    if (opts.hideFailures && failure) continue;
    const a = idMap.get(e.source);
    const b = idMap.get(e.target);
    if (!a || !b) continue;
    const arrow = e.kind === 'workflow-call' ? '==>' : failure || e.kind === 'depends-on' ? '-.->' : '-->';
    lines.push(`  ${a} ${arrow}${e.label ? `|"${mermaidText(e.label)}"|` : ''} ${b}`);
    styles.push(`  linkStyle ${linkIndex++} ${EDGE_STYLE[e.kind]}`);
  }
  return [...lines, ...styles].join('\n');
}
