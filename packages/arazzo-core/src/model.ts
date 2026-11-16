// Defensive helpers to navigate a (possibly invalid) Arazzo document.
// Shared by the semantic validator and the graph builder.
import type {
  ArazzoDocument,
  FailureAction,
  Parameter,
  SourceDescription,
  SourceDescriptionType,
  Step,
  SuccessAction,
  Workflow,
} from './types.js';

export type Obj = Record<string, unknown>;

export const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
export const asArray = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
export const asObj = (v: unknown): Obj => (isObj(v) ? v : {});
export const str = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined);

export function workflowsOf(doc: unknown): Workflow[] {
  return asArray(asObj(doc).workflows).filter(isObj) as unknown as Workflow[];
}
export function sourcesOf(doc: unknown): SourceDescription[] {
  return asArray(asObj(doc).sourceDescriptions).filter(isObj) as unknown as SourceDescription[];
}
export function stepsOf(wf: unknown): Step[] {
  return asArray(asObj(wf).steps).filter(isObj) as unknown as Step[];
}
export function findWorkflow(doc: unknown, workflowId: string): Workflow | undefined {
  return workflowsOf(doc).find((w) => w.workflowId === workflowId);
}
export function findSource(doc: unknown, name: string): SourceDescription | undefined {
  return sourcesOf(doc).find((s) => s.name === name);
}

/** Sources that host operations or channels (type openapi, asyncapi or untyped). */
export function operationSources(doc: unknown): SourceDescription[] {
  return sourcesOf(doc).filter((s) => s.type !== 'arazzo');
}

export type StepTargetKind = 'operationId' | 'operationPath' | 'workflowId' | 'channelPath';
export const STEP_TARGETS: readonly StepTargetKind[] = ['operationId', 'operationPath', 'workflowId', 'channelPath'];

/** Targets present on a step (exactly one when valid). */
export function stepTargets(step: unknown): StepTargetKind[] {
  const s = asObj(step);
  return STEP_TARGETS.filter((t) => s[t] !== undefined);
}

export interface ResolvedSource {
  name?: string;
  type?: SourceDescriptionType;
  /** `explicit` = $sourceDescriptions / {$sourceDescriptions…url}; `legacy` = `name.operationId`; `single` = only candidate source. */
  how?: 'explicit' | 'legacy' | 'single';
  /** Name used in the step but not declared. */
  unknownName?: string;
}

const SOURCE_EXPR_RE = /\$sourceDescriptions\.([A-Za-z0-9_\-]+)/;

/** The operation / channel / workflow reference without its source prefix. */
export function unqualifiedTarget(step: Step): string | undefined {
  const s = step as unknown as Obj;
  const op = str(s.operationId);
  if (op !== undefined) return op.replace(/^\$sourceDescriptions\.[A-Za-z0-9_\-]+\./, '');
  const wf = str(s.workflowId);
  if (wf !== undefined) return wf.replace(/^\$sourceDescriptions\.[A-Za-z0-9_\-]+\./, '');
  return str(s.operationPath) ?? str(s.channelPath);
}

/** Which source description a step talks to (best effort, never guesses across several sources). */
export function resolveStepSource(doc: unknown, step: unknown): ResolvedSource {
  const s = asObj(step);
  const fromName = (name: string, how: ResolvedSource['how']): ResolvedSource => {
    const src = findSource(doc, name);
    return src ? { name, type: src.type, how } : { unknownName: name, how };
  };
  const ref = str(s.operationId) ?? str(s.operationPath) ?? str(s.channelPath) ?? str(s.workflowId);
  if (ref !== undefined) {
    const m = SOURCE_EXPR_RE.exec(ref);
    if (m) return fromName(m[1]!, 'explicit');
  }
  const opId = str(s.operationId);
  if (opId !== undefined) {
    const dot = opId.indexOf('.');
    if (dot > 0) {
      const candidate = opId.slice(0, dot);
      if (findSource(doc, candidate)) return fromName(candidate, 'legacy');
    }
    const ops = operationSources(doc);
    if (ops.length === 1) return { name: ops[0]!.name, type: ops[0]!.type, how: 'single' };
  }
  return {};
}

/** True when the step targets an AsyncAPI operation or channel. */
export function isAsyncStep(doc: unknown, step: unknown): boolean {
  const s = asObj(step);
  if (s.channelPath !== undefined || s.action !== undefined) return true;
  if (s.operationId !== undefined) return resolveStepSource(doc, step).type === 'asyncapi';
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// Components & Reusable Objects
// ─────────────────────────────────────────────────────────────────────────────
export type ComponentKind = 'parameters' | 'successActions' | 'failureActions' | 'inputs';

const COMPONENT_REF_RE = /^\$components\.(parameters|successActions|failureActions|inputs)\.(.+)$/;

export function parseComponentReference(ref: string): { kind: ComponentKind; name: string } | undefined {
  const m = COMPONENT_REF_RE.exec(ref.trim());
  return m ? { kind: m[1] as ComponentKind, name: m[2]! } : undefined;
}

export function componentOf(doc: unknown, kind: ComponentKind, name: string): unknown {
  const comps = asObj(asObj(doc).components);
  const bucket = asObj(comps[kind]);
  return Object.prototype.hasOwnProperty.call(bucket, name) ? bucket[name] : undefined;
}

export interface Resolved<T> {
  value: T;
  /** Index in the original list. */
  index: number;
  /** Set when the item was a Reusable Object. */
  reference?: string;
  /** Component name when resolved from `$components`. */
  componentName?: string;
}

/** Resolve the Reusable Objects of a list (unresolvable references are skipped). */
export function resolveList<T>(doc: unknown, list: unknown, kind: Exclude<ComponentKind, 'inputs'>): Resolved<T>[] {
  const out: Resolved<T>[] = [];
  asArray(list).forEach((item, index) => {
    if (isObj(item) && typeof item.reference === 'string') {
      const ref = parseComponentReference(item.reference);
      if (!ref || ref.kind !== kind) return;
      const target = componentOf(doc, kind, ref.name);
      if (!isObj(target)) return;
      const value = kind === 'parameters' && 'value' in item ? { ...target, value: item.value } : target;
      out.push({ value: value as T, index, reference: item.reference, componentName: ref.name });
    } else if (isObj(item)) {
      out.push({ value: item as T, index });
    }
  });
  return out;
}

export const resolveParameters = (doc: unknown, list: unknown) => resolveList<Parameter>(doc, list, 'parameters');
export const resolveSuccessActions = (doc: unknown, list: unknown) => resolveList<SuccessAction>(doc, list, 'successActions');
export const resolveFailureActions = (doc: unknown, list: unknown) => resolveList<FailureAction>(doc, list, 'failureActions');

export interface EffectiveAction<T> extends Resolved<T> {
  /** Where the action is declared. */
  origin: 'step' | 'workflow';
}

/**
 * Actions applicable to a step: the step's own actions, then the workflow-level
 * ones not overridden by name (§ 5.8.4.1 "can be overridden at the step level
 * but cannot be removed there").
 */
export function effectiveActions<T extends { name?: unknown }>(
  doc: unknown,
  workflow: unknown,
  step: unknown,
  kind: 'success' | 'failure',
): EffectiveAction<T>[] {
  const k = kind === 'success' ? 'successActions' : 'failureActions';
  const stepList = asObj(step)[kind === 'success' ? 'onSuccess' : 'onFailure'];
  const own = resolveList<T>(doc, stepList, k).map((r) => ({ ...r, origin: 'step' as const }));
  const names = new Set(own.map((a) => a.value.name));
  const wf = resolveList<T>(doc, asObj(workflow)[k], k)
    .filter((r) => !names.has(r.value.name))
    .map((r) => ({ ...r, origin: 'workflow' as const }));
  return [...own, ...wf];
}

/** Workflow inputs schema with a top-level local `$ref` resolved. */
export function resolveInputsSchema(doc: unknown, schema: unknown): Obj | undefined {
  let cur = schema;
  for (let i = 0; i < 5 && isObj(cur) && typeof cur.$ref === 'string' && cur.$ref.startsWith('#/'); i++) {
    const segs = cur.$ref
      .slice(2)
      .split('/')
      .map((s) => s.replace(/~1/g, '/').replace(/~0/g, '~'));
    let next: unknown = doc;
    for (const seg of segs) next = isObj(next) ? next[seg] : undefined;
    if (!isObj(next)) return isObj(cur) ? cur : undefined;
    cur = next;
  }
  return isObj(cur) ? cur : undefined;
}

/** Declared input names of a workflow (after `$ref`, `allOf` merge). Undefined when unknown. */
export function workflowInputNames(doc: unknown, wf: Workflow | undefined): { names: Set<string>; required: string[] } | undefined {
  if (!wf || wf.inputs === undefined) return { names: new Set(), required: [] };
  const names = new Set<string>();
  const required: string[] = [];
  let opaque = false;
  const visit = (schema: unknown, depth: number): void => {
    const s = resolveInputsSchema(doc, schema);
    if (!s || depth > 5) {
      opaque = true;
      return;
    }
    if (isObj(s.properties)) Object.keys(s.properties).forEach((k) => names.add(k));
    asArray(s.required).forEach((r) => typeof r === 'string' && required.push(r));
    asArray(s.allOf).forEach((x) => visit(x, depth + 1));
    if (s.anyOf || s.oneOf || (typeof s.$ref === 'string' && !s.$ref.startsWith('#/'))) opaque = true;
    if (s.additionalProperties !== undefined && s.additionalProperties !== false) opaque = true;
  };
  visit(wf.inputs, 0);
  return opaque ? undefined : { names, required };
}

export function isArazzoDoc(doc: unknown): doc is ArazzoDocument {
  return isObj(doc) && 'arazzo' in doc;
}
