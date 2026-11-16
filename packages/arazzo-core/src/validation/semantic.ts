// Layer (b): semantic rules of R1 § c that the JSON Schemas do not cover.
import type { JsonPath } from '../parse.js';
import type { ArazzoMinor } from '../version.js';
import {
  asArray,
  asObj,
  componentOf,
  isAsyncStep,
  isObj,
  operationSources,
  parseComponentReference,
  resolveList,
  resolveStepSource,
  sourcesOf,
  stepTargets,
  str,
  workflowInputNames,
} from '../model.js';
import type { Obj } from '../model.js';
import type { Step, Workflow } from '../types.js';
import { isSelector } from '../types.js';
import {
  checkJsonPath,
  checkJsonPathGoessner,
  checkJsonPointer,
  checkRegex,
  checkSimpleCondition,
  checkXPath,
  expressionsInString,
  findEmbeddedExpressions,
  hasUriScheme,
  isUriReference,
  maskEmbedded,
  parseRuntimeExpression,
  resolveJsonPointer,
  unembeddedExpressions,
} from '../expressions.js';
import type { ParsedExpression } from '../expressions.js';
import type { Report } from './diagnostic.js';
import type { RuleId } from './rules.js';

const ID_RE = /^[A-Za-z0-9_\-]+$/;
const KEY_RE = /^[a-zA-Z0-9.\-_]+$/;
const SRC_WF_RE = /^\$sourceDescriptions\.([^.]+)\.(.+)$/;
const DEP_WF_STEP_RE = /^\$workflows\.([^.]+)\.steps\.([^.]+)$/;
const DEP_SRC_STEP_RE = /^\$sourceDescriptions\.([^.]+)\.([^.]+)\.steps\.([^.]+)$/;
const OP_PATH_RE = /^\{\$sourceDescriptions\.([A-Za-z0-9_\-]+)\.url\}(#.*)$/;
const CHANNEL_PATH_RE = /^\{\$sourceDescriptions\.([A-Za-z0-9_\-]+)\.url\}#\/channels\/.+$/;

interface WfEntry {
  wf: Workflow & Obj;
  index: number;
  path: JsonPath;
  steps: { step: Step & Obj; index: number; path: JsonPath }[];
}

/** An expression occurrence, with its evaluation scope. */
interface Site {
  path: JsonPath;
  expr: string;
  wf?: WfEntry;
  stepIndex?: number;
  /** Component-level (document scope): $steps / $inputs cannot be resolved. */
  component?: boolean;
  async?: boolean;
}

export interface FeatureUse {
  path: JsonPath;
  feature: string;
  severity: 'error' | 'warning';
}

class Ctx {
  readonly doc: Obj;
  readonly is11: boolean;
  readonly workflows: WfEntry[] = [];
  readonly sites: Site[] = [];
  readonly sourceNames = new Set<string>();
  readonly arazzoSources = new Set<string>();

  constructor(
    doc: unknown,
    readonly minor: ArazzoMinor | null,
    readonly report: Report,
  ) {
    this.doc = asObj(doc);
    this.is11 = minor !== '1.0';
    asArray(this.doc.workflows).forEach((wf, index) => {
      if (!isObj(wf)) return;
      const path: JsonPath = ['workflows', index];
      const steps: WfEntry['steps'] = [];
      asArray(wf.steps).forEach((s, si) => {
        if (isObj(s)) steps.push({ step: s as Step & Obj, index: si, path: [...path, 'steps', si] });
      });
      this.workflows.push({ wf: wf as Workflow & Obj, index, path, steps });
    });
    for (const s of sourcesOf(this.doc)) {
      if (typeof s.name !== 'string') continue;
      this.sourceNames.add(s.name);
      if (s.type === 'arazzo') this.arazzoSources.add(s.name);
    }
  }

  workflowById(id: string): WfEntry | undefined {
    return this.workflows.find((w) => w.wf.workflowId === id);
  }
  sourceType(name: string): string | undefined {
    return sourcesOf(this.doc).find((s) => s.name === name)?.type;
  }
}

type ListKind = 'parameters' | 'successActions' | 'failureActions';

// ═══════════════════════════════════════════════════════════════════════════════
// Entry point
// ═══════════════════════════════════════════════════════════════════════════════
export interface SemanticOptions {
  /** Re-throw internal rule errors (tests). By default a failing rule is skipped. */
  debug?: boolean;
}

export function semanticDiagnostics(doc: unknown, minor: ArazzoMinor | null, report: Report, opts: SemanticOptions = {}): void {
  if (!isObj(doc)) return;
  const ctx = new Ctx(doc, minor, report);
  const groups: [string, (c: Ctx) => void][] = [
    ['sites', collectSites],
    ['version', ruleVersionFeatures],
    ['self', ruleSelf],
    ['extensions', ruleReservedExtensions],
    ['ids', ruleIdentifiers],
    ['targets', ruleStepTargets],
    ['async', ruleAsync],
    ['dependsOn', ruleStepDependsOn],
    ['workflowDependsOn', ruleWorkflowDependsOn],
    ['actions', ruleActions],
    ['parameters', ruleParameters],
    ['reusable', ruleReusables],
    ['components', ruleComponents],
    ['criteria', ruleCriteria],
    ['selectors', ruleSelectors],
    ['replacements', ruleReplacements],
    ['expressions', ruleExpressions],
    ['sources', ruleSources],
  ];
  for (const [, fn] of groups) {
    try {
      fn(ctx);
    } catch (e) {
      if (opts.debug) throw e;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Expression sites
// ═══════════════════════════════════════════════════════════════════════════════
function addStringSites(ctx: Ctx, value: unknown, path: JsonPath, base: Omit<Site, 'path' | 'expr'>): void {
  if (typeof value !== 'string') return;
  for (const expr of expressionsInString(value)) ctx.sites.push({ ...base, path, expr });
}

/** Strings in a payload: pure expressions and `{$…}`; Selector Objects contribute their context. */
function addPayloadSites(ctx: Ctx, value: unknown, path: JsonPath, base: Omit<Site, 'path' | 'expr'>, depth = 0): void {
  if (depth > 32) return;
  if (typeof value === 'string') addStringSites(ctx, value, path, base);
  else if (Array.isArray(value)) value.forEach((v, i) => addPayloadSites(ctx, v, [...path, i], base, depth + 1));
  else if (isObj(value)) {
    if (ctx.is11 && isSelector(value)) {
      addStringSites(ctx, value.context, [...path, 'context'], base);
      return;
    }
    for (const [k, v] of Object.entries(value)) addPayloadSites(ctx, v, [...path, k], base, depth + 1);
  }
}

function addValueSites(ctx: Ctx, value: unknown, path: JsonPath, base: Omit<Site, 'path' | 'expr'>): void {
  if (isObj(value) && isSelector(value)) addStringSites(ctx, value.context, [...path, 'context'], base);
  else addStringSites(ctx, value, path, base);
}

function addCriteriaSites(ctx: Ctx, list: unknown, path: JsonPath, base: Omit<Site, 'path' | 'expr'>): void {
  asArray(list).forEach((c, i) => {
    if (!isObj(c)) return;
    const cp = [...path, i];
    addStringSites(ctx, c.context, [...cp, 'context'], base);
    if (typeof c.condition !== 'string') return;
    const t = criterionTypeName(c.type);
    if (t === 'simple') {
      const res = checkSimpleCondition(c.condition);
      for (const e of res.expressions) ctx.sites.push({ ...base, path: [...cp, 'condition'], expr: e });
    } else {
      for (const e of findEmbeddedExpressions(c.condition)) ctx.sites.push({ ...base, path: [...cp, 'condition'], expr: e.expression });
    }
  });
}

function addParameterSites(ctx: Ctx, list: unknown, path: JsonPath, base: Omit<Site, 'path' | 'expr'>): void {
  asArray(list).forEach((p, i) => {
    if (!isObj(p)) return;
    if ('value' in p) addValueSites(ctx, p.value, [...path, i, 'value'], base);
  });
}

function addActionSites(ctx: Ctx, list: unknown, path: JsonPath, base: Omit<Site, 'path' | 'expr'>): void {
  asArray(list).forEach((a, i) => {
    if (!isObj(a) || 'reference' in a) return;
    addCriteriaSites(ctx, a.criteria, [...path, i, 'criteria'], base);
    addParameterSites(ctx, a.parameters, [...path, i, 'parameters'], base);
  });
}

function addOutputSites(ctx: Ctx, outputs: unknown, path: JsonPath, base: Omit<Site, 'path' | 'expr'>): void {
  for (const [k, v] of Object.entries(asObj(outputs))) addValueSites(ctx, v, [...path, k], base);
}

function collectSites(ctx: Ctx): void {
  for (const w of ctx.workflows) {
    const wbase = { wf: w };
    addParameterSites(ctx, w.wf.parameters, [...w.path, 'parameters'], wbase);
    addActionSites(ctx, w.wf.successActions, [...w.path, 'successActions'], wbase);
    addActionSites(ctx, w.wf.failureActions, [...w.path, 'failureActions'], wbase);
    addOutputSites(ctx, w.wf.outputs, [...w.path, 'outputs'], wbase);
    for (const s of w.steps) {
      const base: Omit<Site, 'path' | 'expr'> = { wf: w, stepIndex: s.index, async: isAsyncStep(ctx.doc, s.step) };
      const st = s.step as Obj;
      if (typeof st.operationId === 'string' && st.operationId.startsWith('$')) addStringSites(ctx, st.operationId, [...s.path, 'operationId'], base);
      if (typeof st.workflowId === 'string' && st.workflowId.startsWith('$')) addStringSites(ctx, st.workflowId, [...s.path, 'workflowId'], base);
      // operationPath / channelPath are checked by the step-target rules (format + source name).
      addStringSites(ctx, st.correlationId, [...s.path, 'correlationId'], base);
      addParameterSites(ctx, st.parameters, [...s.path, 'parameters'], base);
      const rb = asObj(st.requestBody);
      if ('payload' in rb) addPayloadSites(ctx, rb.payload, [...s.path, 'requestBody', 'payload'], base);
      asArray(rb.replacements).forEach((r, i) => {
        if (isObj(r) && 'value' in r) addValueSites(ctx, r.value, [...s.path, 'requestBody', 'replacements', i, 'value'], base);
      });
      addCriteriaSites(ctx, st.successCriteria, [...s.path, 'successCriteria'], base);
      addActionSites(ctx, st.onSuccess, [...s.path, 'onSuccess'], base);
      addActionSites(ctx, st.onFailure, [...s.path, 'onFailure'], base);
      addOutputSites(ctx, st.outputs, [...s.path, 'outputs'], base);
    }
  }
  const comps = asObj(ctx.doc.components);
  const cbase = { component: true };
  for (const [k, p] of Object.entries(asObj(comps.parameters))) {
    if (isObj(p) && 'value' in p) addValueSites(ctx, p.value, ['components', 'parameters', k, 'value'], cbase);
  }
  for (const kind of ['successActions', 'failureActions'] as const) {
    for (const [k, a] of Object.entries(asObj(comps[kind]))) {
      if (!isObj(a)) continue;
      addCriteriaSites(ctx, a.criteria, ['components', kind, k, 'criteria'], cbase);
      addParameterSites(ctx, a.parameters, ['components', kind, k, 'parameters'], cbase);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// c.1 Version features (1.1 used in 1.0.x)
// ═══════════════════════════════════════════════════════════════════════════════
/** 1.1 features used in a document, with the severity they deserve in a 1.0.x document. */
export function detect11Features(doc: unknown): FeatureUse[] {
  const out: FeatureUse[] = [];
  const d = asObj(doc);
  const err = (path: JsonPath, feature: string) => out.push({ path, feature, severity: 'error' });
  const warn = (path: JsonPath, feature: string) => out.push({ path, feature, severity: 'warning' });
  if ('$self' in d) err(['$self'], '"$self"');
  asArray(d.sourceDescriptions).forEach((s, i) => {
    if (isObj(s) && s.type === 'asyncapi') err(['sourceDescriptions', i, 'type'], 'type: asyncapi');
  });
  const params = (list: unknown, path: JsonPath) =>
    asArray(list).forEach((p, i) => {
      if (!isObj(p)) return;
      if (p.in === 'querystring' || p.in === 'channel') err([...path, i, 'in'], `in: ${p.in}`);
      if (isSelector(p.value)) warn([...path, i, 'value'], 'Selector Object (taken as a literal object by Arazzo 1.0)');
    });
  const criteria = (list: unknown, path: JsonPath) =>
    asArray(list).forEach((c, i) => {
      if (!isObj(c) || !isObj(c.type)) return;
      const t = c.type;
      if (t.type === 'jsonpointer' || t.version === 'rfc9535' || t.version === 'xpath-31') err([...path, i, 'type'], `expression type ${t.type}/${t.version}`);
    });
  const actions = (list: unknown, path: JsonPath) =>
    asArray(list).forEach((a, i) => {
      if (!isObj(a)) return;
      if ('parameters' in a && !('reference' in a)) err([...path, i, 'parameters'], 'action "parameters"');
      criteria(a.criteria, [...path, i, 'criteria']);
    });
  const outputs = (o: unknown, path: JsonPath) => {
    for (const [k, v] of Object.entries(asObj(o))) if (isObj(v)) err([...path, k], 'Selector Object in outputs');
  };
  const payloadSelectors = (v: unknown, path: JsonPath, depth = 0): void => {
    if (depth > 32) return;
    if (isSelector(v)) warn(path, 'Selector Object in payload (taken as a literal object by Arazzo 1.0)');
    else if (Array.isArray(v)) v.forEach((x, i) => payloadSelectors(x, [...path, i], depth + 1));
    else if (isObj(v)) for (const [k, x] of Object.entries(v)) payloadSelectors(x, [...path, k], depth + 1);
  };
  asArray(d.workflows).forEach((w, wi) => {
    if (!isObj(w)) return;
    const wp: JsonPath = ['workflows', wi];
    params(w.parameters, [...wp, 'parameters']);
    actions(w.successActions, [...wp, 'successActions']);
    actions(w.failureActions, [...wp, 'failureActions']);
    outputs(w.outputs, [...wp, 'outputs']);
    asArray(w.steps).forEach((s, si) => {
      if (!isObj(s)) return;
      const sp: JsonPath = [...wp, 'steps', si];
      for (const f of ['channelPath', 'action', 'correlationId', 'timeout', 'dependsOn'] as const) if (f in s) err([...sp, f], `"${f}"`);
      params(s.parameters, [...sp, 'parameters']);
      criteria(s.successCriteria, [...sp, 'successCriteria']);
      actions(s.onSuccess, [...sp, 'onSuccess']);
      actions(s.onFailure, [...sp, 'onFailure']);
      outputs(s.outputs, [...sp, 'outputs']);
      const rb = asObj(s.requestBody);
      if ('payload' in rb) payloadSelectors(rb.payload, [...sp, 'requestBody', 'payload']);
      asArray(rb.replacements).forEach((r, ri) => {
        if (!isObj(r)) return;
        if ('targetSelectorType' in r) err([...sp, 'requestBody', 'replacements', ri, 'targetSelectorType'], '"targetSelectorType"');
        if (isObj(r.value)) err([...sp, 'requestBody', 'replacements', ri, 'value'], 'Selector Object in a payload replacement');
      });
    });
  });
  const comps = asObj(d.components);
  for (const [k, p] of Object.entries(asObj(comps.parameters))) {
    if (!isObj(p)) continue;
    if (p.in === 'querystring' || p.in === 'channel') err(['components', 'parameters', k, 'in'], `in: ${p.in}`);
    if (isSelector(p.value)) warn(['components', 'parameters', k, 'value'], 'Selector Object (taken as a literal object by Arazzo 1.0)');
  }
  for (const kind of ['successActions', 'failureActions'] as const) {
    for (const [k, a] of Object.entries(asObj(comps[kind]))) {
      if (!isObj(a)) continue;
      if ('parameters' in a) err(['components', kind, k, 'parameters'], 'action "parameters"');
      criteria(a.criteria, ['components', kind, k, 'criteria']);
    }
  }
  return out;
}

function featureMessage(feature: string, version: string): string {
  return `${feature} requires Arazzo 1.1 but the document declares arazzo: ${version}. Migrate the document to arazzo: 1.1.0.`;
}

function ruleVersionFeatures(ctx: Ctx): void {
  if (ctx.minor !== '1.0') return;
  const version = String(ctx.doc.arazzo);
  for (const f of detect11Features(ctx.doc)) ctx.report('arazzo-version-feature-mismatch', f.path, featureMessage(f.feature, version), f.severity);
  // $message / $self expressions are reported by ruleExpressions.
}

// ═══════════════════════════════════════════════════════════════════════════════
// c.1 $self, extensions
// ═══════════════════════════════════════════════════════════════════════════════
function ruleSelf(ctx: Ctx): void {
  if (!ctx.is11) return;
  const self = ctx.doc.$self;
  if (self === undefined) {
    if (ctx.minor === '1.1') ctx.report('arazzo-self-recommended', ['$self'], 'Arazzo 1.1: declare "$self" (canonical URI of this document) so that other documents can reference it by identity');
    return;
  }
  if (typeof self !== 'string') return; // schema
  const noFragment = self.split('#')[0]!;
  if (!isUriReference(noFragment)) {
    ctx.report('arazzo-self-uri-reference', ['$self'], `"$self" must be a valid URI-reference (RFC 3986), got ${JSON.stringify(self)}`);
    return;
  }
  if (!hasUriScheme(self)) {
    ctx.report('arazzo-self-relative', ['$self'], `Relative "$self" (${JSON.stringify(self)}) is resolved against the retrieval URI; an absolute URI is more portable`);
  }
}

const RESERVED_EXT_RE = /^x-(oai-|oas-|arazzo)/;
/** Fields whose value is not an Arazzo object (free JSON). */
const OPAQUE_FIELDS = new Set(['inputs', 'payload']);
/** Fields whose value is a map of user-chosen names. */
const NAME_MAPS = new Set(['outputs', 'parameters', 'successActions', 'failureActions']);

function ruleReservedExtensions(ctx: Ctx): void {
  const walk = (node: unknown, path: JsonPath, parentKey: string | undefined, depth: number): void => {
    if (depth > 40) return;
    if (Array.isArray(node)) {
      node.forEach((v, i) => walk(v, [...path, i], parentKey, depth + 1));
      return;
    }
    if (!isObj(node)) return;
    const isNameMap = parentKey !== undefined && NAME_MAPS.has(parentKey) && path[path.length - 2] === 'components';
    const isOutputs = parentKey === 'outputs';
    for (const [k, v] of Object.entries(node)) {
      if (!isNameMap && !isOutputs && k.startsWith('x-')) {
        if (RESERVED_EXT_RE.test(k)) ctx.report('arazzo-extension-reserved-prefix', [...path, k], `Extension "${k}" uses a prefix reserved by the OpenAPI Initiative (x-oai-, x-oas-, x-arazzo)`);
        continue; // extension values are free-form
      }
      if (OPAQUE_FIELDS.has(k) && !isNameMap) continue;
      if (k === 'value' && !isSelector(v)) continue;
      walk(v, [...path, k], k, depth + 1);
    }
  };
  walk(ctx.doc, [], undefined, 0);
}

// ═══════════════════════════════════════════════════════════════════════════════
// c.2 Identifiers & uniqueness
// ═══════════════════════════════════════════════════════════════════════════════
function ruleIdentifiers(ctx: Ctx): void {
  const seenWf = new Map<string, number>();
  for (const w of ctx.workflows) {
    const id = w.wf.workflowId;
    if (typeof id === 'string') {
      if (seenWf.has(id)) ctx.report('arazzo-workflow-id-unique', [...w.path, 'workflowId'], `Duplicate workflowId "${id}" (already defined by workflows[${seenWf.get(id)}])`);
      else seenWf.set(id, w.index);
      if (!ID_RE.test(id)) ctx.report('arazzo-id-pattern', [...w.path, 'workflowId'], `workflowId "${id}" should match [A-Za-z0-9_-]+ to be referenceable in runtime expressions`);
    }
    const seenStep = new Map<string, number>();
    for (const s of w.steps) {
      const sid = s.step.stepId;
      if (typeof sid !== 'string') continue;
      if (seenStep.has(sid)) {
        ctx.report('arazzo-step-id-unique', [...s.path, 'stepId'], `Duplicate stepId "${sid}" in workflow "${String(w.wf.workflowId)}" (already defined by steps[${seenStep.get(sid)}])`);
      } else seenStep.set(sid, s.index);
      if (!ID_RE.test(sid)) ctx.report('arazzo-id-pattern', [...s.path, 'stepId'], `stepId "${sid}" should match [A-Za-z0-9_-]+ to be referenceable in runtime expressions`);
    }
    checkOutputKeys(ctx, w.wf.outputs, [...w.path, 'outputs']);
    for (const s of w.steps) checkOutputKeys(ctx, s.step.outputs, [...s.path, 'outputs']);
  }
  const seenSrc = new Map<string, number>();
  asArray(ctx.doc.sourceDescriptions).forEach((s, i) => {
    if (!isObj(s) || typeof s.name !== 'string') return;
    if (seenSrc.has(s.name)) ctx.report('arazzo-source-name-unique', ['sourceDescriptions', i, 'name'], `Duplicate source description name "${s.name}" (already defined by sourceDescriptions[${seenSrc.get(s.name)}])`);
    else seenSrc.set(s.name, i);
  });
}

function checkOutputKeys(ctx: Ctx, outputs: unknown, path: JsonPath): void {
  for (const k of Object.keys(asObj(outputs))) {
    if (!KEY_RE.test(k)) ctx.report('arazzo-key-pattern', [...path, k], `Invalid output name "${k}": keys must match ^[a-zA-Z0-9.\\-_]+$`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// c.3 Step targets
// ═══════════════════════════════════════════════════════════════════════════════
function ruleStepTargets(ctx: Ctx): void {
  const targetList = ctx.is11 ? '"operationId", "operationPath", "workflowId" or "channelPath"' : '"operationId", "operationPath" or "workflowId"';
  const opSources = operationSources(ctx.doc);
  for (const w of ctx.workflows) {
    for (const s of w.steps) {
      const st = s.step as Obj;
      const targets = stepTargets(st).filter((t) => ctx.is11 || t !== 'channelPath');
      // In a 1.0 document a lone channelPath is reported as a 1.1 feature (arazzo-version-feature-mismatch).
      if (targets.length === 0 && !(!ctx.is11 && st.channelPath !== undefined)) ctx.report('arazzo-step-target-missing', s.path, `Step must define one of ${targetList}`);
      else if (targets.length > 1) ctx.report('arazzo-step-target-exclusive', s.path, `Step must define only one of ${targetList} (found ${targets.join(', ')})`);

      const opId = str(st.operationId);
      if (opId !== undefined && opSources.length > 1 && !opId.startsWith('$sourceDescriptions.')) {
        const dot = opId.indexOf('.');
        const hint = dot > 0 && ctx.sourceNames.has(opId.slice(0, dot)) ? `$sourceDescriptions.${opId}` : `$sourceDescriptions.<name>.${opId}`;
        ctx.report('arazzo-step-operation-id-qualified', [...s.path, 'operationId'], `With several source descriptions, operationId must be qualified: use "${hint}"`);
      }

      const opPath = str(st.operationPath);
      if (opPath !== undefined) {
        const m = OP_PATH_RE.exec(opPath);
        const ptrErr = m ? checkJsonPointer(m[2]!) : null;
        if (!m || ptrErr || m[2] === '#') {
          ctx.report(
            'arazzo-step-operation-path-format',
            [...s.path, 'operationPath'],
            `operationPath must be "{$sourceDescriptions.<name>.url}#<json-pointer>", e.g. "{$sourceDescriptions.api.url}#/paths/~1pets/get"${ptrErr ? ` (${ptrErr})` : ''}`,
          );
        }
        if (m && !ctx.sourceNames.has(m[1]!)) {
          ctx.report('arazzo-expression-source-resolved', [...s.path, 'operationPath'], `operationPath: source description "${m[1]}" not found`);
        } else if (m) {
          const t = ctx.sourceType(m[1]!);
          if (t === 'asyncapi' || t === 'arazzo') {
            ctx.report('arazzo-step-operation-path-source-type', [...s.path, 'operationPath'], `operationPath must reference an OpenAPI source ("${m[1]}" is of type ${t})${t === 'asyncapi' ? '; use channelPath or operationId with an action' : ''}`);
          }
        }
      }

      const channelPath = str(st.channelPath);
      if (ctx.is11 && channelPath !== undefined) {
        if (!CHANNEL_PATH_RE.test(channelPath)) {
          ctx.report('arazzo-channel-path-format', [...s.path, 'channelPath'], `channelPath should be "{$sourceDescriptions.<name>.url}#/channels/<channelKey>" (got ${JSON.stringify(channelPath)})`);
        }
        const m = /^\{\$sourceDescriptions\.([A-Za-z0-9_\-]+)\.url\}/.exec(channelPath);
        const t = m ? ctx.sourceType(m[1]!) : undefined;
        if (m && !ctx.sourceNames.has(m[1]!)) {
          ctx.report('arazzo-expression-source-resolved', [...s.path, 'channelPath'], `channelPath: source description "${m[1]}" not found`);
        } else if (m && t !== undefined && t !== 'asyncapi') {
          ctx.report('arazzo-channel-path-source-type', [...s.path, 'channelPath'], `channelPath must reference an AsyncAPI source ("${m[1]}" is of type ${t})`);
        }
      }

      const wfId = str(st.workflowId);
      if (wfId !== undefined) {
        checkWorkflowReference(ctx, wfId, [...s.path, 'workflowId'], 'arazzo-step-workflow-resolved', 'arazzo-step-workflow-qualified');
        if (st.requestBody !== undefined) ctx.report('arazzo-step-workflow-requestbody', [...s.path, 'requestBody'], 'requestBody has no effect on a step that calls a workflow: pass data with parameters (mapped to the workflow inputs)');
      }

      // Source type is needed to pick the semantics of async steps and operationPath.
      if (opPath !== undefined || (ctx.is11 && (st.channelPath !== undefined || st.action !== undefined))) {
        const src = resolveStepSource(ctx.doc, st);
        if (src.name && src.type === undefined) {
          const i = asArray(ctx.doc.sourceDescriptions).findIndex((x) => isObj(x) && x.name === src.name);
          ctx.report('arazzo-source-type-recommended', ['sourceDescriptions', i, 'type'], `Source "${src.name}" should declare its "type" (openapi, asyncapi or arazzo): it is used by step "${String(st.stepId)}"`);
        }
      }
    }
  }
}

/** workflowId of a step, goto action or workflow dependsOn: local id or `$sourceDescriptions.<arazzo>.<id>`. */
function checkWorkflowReference(ctx: Ctx, ref: string, path: JsonPath, resolvedCode: RuleId, qualifiedCode: RuleId): void {
  const m = SRC_WF_RE.exec(ref);
  if (m) {
    const name = m[1]!;
    if (!ctx.sourceNames.has(name)) return; // arazzo-expression-source-resolved
    const t = ctx.sourceType(name);
    if (t !== undefined && t !== 'arazzo') ctx.report(resolvedCode, path, `"${ref}": source "${name}" is of type ${t}, workflows can only be referenced from sources of type arazzo`);
    return;
  }
  if (ref.startsWith('$')) {
    ctx.report(resolvedCode, path, `Invalid workflow reference "${ref}": expected a local workflowId or "$sourceDescriptions.<name>.<workflowId>"`);
    return;
  }
  if (ctx.workflowById(ref)) return;
  if (ctx.arazzoSources.size > 0) {
    ctx.report(qualifiedCode, path, `Workflow "${ref}" is not defined in this document; a workflow of another Arazzo document must be referenced as "$sourceDescriptions.<name>.${ref}"`);
  } else {
    ctx.report(resolvedCode, path, `Referenced workflow "${ref}" not found in this document`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// c.4 AsyncAPI
// ═══════════════════════════════════════════════════════════════════════════════
function ruleAsync(ctx: Ctx): void {
  if (!ctx.is11) return;
  for (const w of ctx.workflows) {
    for (const s of w.steps) {
      const st = s.step as Obj;
      const src = resolveStepSource(ctx.doc, st);
      const action = st.action;
      const isOpenApiTarget =
        st.operationPath !== undefined ||
        st.workflowId !== undefined ||
        (st.operationId !== undefined && st.channelPath === undefined && (src.type === 'openapi' || src.type === 'arazzo'));
      const async = isAsyncStep(ctx.doc, st);

      if (action !== undefined && action !== 'send' && action !== 'receive') {
        ctx.report('arazzo-async-action-enum', [...s.path, 'action'], `Invalid action ${JSON.stringify(action)}: expected "send" or "receive"`);
      }
      if (action !== undefined && isOpenApiTarget) {
        const why = st.operationPath !== undefined ? 'operationPath (OpenAPI)' : st.workflowId !== undefined ? 'a workflow' : `source "${src.name}" of type ${src.type}`;
        ctx.report('arazzo-async-action-only-asyncapi', [...s.path, 'action'], `"action" only applies to AsyncAPI steps; this step targets ${why}`);
      }
      if (action === undefined && (st.channelPath !== undefined || (st.operationId !== undefined && src.type === 'asyncapi'))) {
        ctx.report('arazzo-async-action-required', [...s.path, 'action'], 'An AsyncAPI step must declare "action" (send or receive)');
      }
      if (st.correlationId !== undefined) {
        if (isOpenApiTarget || !async) {
          ctx.report('arazzo-async-correlation-only-asyncapi', [...s.path, 'correlationId'], '"correlationId" only applies to AsyncAPI steps with action: receive');
        } else if (action !== 'receive') {
          ctx.report('arazzo-async-correlation-receive-only', [...s.path, 'correlationId'], '"correlationId" is only allowed with action: receive');
        }
        if (typeof st.correlationId !== 'string') {
          ctx.report('arazzo-async-correlation-type', [...s.path, 'correlationId'], '"correlationId" should be a string, typically a runtime expression such as $inputs.orderId');
        }
      }
      if (typeof st.timeout === 'number' && Number.isInteger(st.timeout) && st.timeout <= 0) {
        ctx.report('arazzo-step-timeout-positive', [...s.path, 'timeout'], `"timeout" should be a positive number of milliseconds (got ${st.timeout})`);
      }
      if (action === 'receive') {
        if (st.timeout === undefined) ctx.report('arazzo-async-receive-timeout-recommended', [...s.path, 'timeout'], `Step "${String(st.stepId)}" receives a message without "timeout": it may wait indefinitely`);
        if (st.successCriteria === undefined) ctx.report('arazzo-async-receive-success-criteria', [...s.path, 'successCriteria'], `Step "${String(st.stepId)}" receives a message without "successCriteria": consider checking $message.payload`);
      }
      // Parameter locations on async steps
      for (const r of resolveList<Obj>(ctx.doc, st.parameters, 'parameters')) {
        const loc = r.value.in;
        const ppath: JsonPath = r.reference ? [...s.path, 'parameters', r.index] : [...s.path, 'parameters', r.index, 'in'];
        if (loc === 'channel') {
          if (async && !isOpenApiTarget) ctx.report('arazzo-param-in-channel', ppath, '"in: channel" is accepted by the 1.1 schema and clarified after 1.1.0 (AsyncAPI channel parameter)', 'info');
          else ctx.report('arazzo-param-in-channel', ppath, '"in: channel" only applies to AsyncAPI steps');
        } else if (async && !isOpenApiTarget && typeof loc === 'string' && loc !== 'header') {
          ctx.report('arazzo-async-param-in', ppath, `"in: ${loc}" has no meaning for a message: AsyncAPI step parameters should use "header" or "channel"`);
        }
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// c.5 dependsOn & execution order
// ═══════════════════════════════════════════════════════════════════════════════
function stepIndexById(w: WfEntry, id: string): number {
  const s = w.steps.find((x) => x.step.stepId === id);
  return s ? s.index : -1;
}

function ruleStepDependsOn(ctx: Ctx): void {
  if (!ctx.is11) return;
  // Dependency graph: node = "<wfIndex>/<stepId>"
  const edges = new Map<string, Set<string>>();
  const nodePath = new Map<string, JsonPath>();
  const addEdge = (from: string, to: string) => {
    if (!edges.has(from)) edges.set(from, new Set());
    edges.get(from)!.add(to);
  };

  for (const w of ctx.workflows) {
    const wfHasDependsOn = w.steps.some((s) => Array.isArray(s.step.dependsOn) && s.step.dependsOn.length > 0);
    const wfHasAsync = w.steps.some((s) => isAsyncStep(ctx.doc, s.step));
    for (const s of w.steps) {
      const sid = s.step.stepId;
      if (typeof sid !== 'string') continue;
      const node = `${w.index}/${sid}`;
      const deps = s.step.dependsOn;
      nodePath.set(node, Array.isArray(deps) ? [...s.path, 'dependsOn'] : s.path);
      if (Array.isArray(deps)) {
        let reportedSync = false;
        if (deps.length > 0 && !wfHasAsync) {
          ctx.report('arazzo-step-depends-on-sync', [...s.path, 'dependsOn'], `Workflow "${String(w.wf.workflowId)}" has no asynchronous step: "dependsOn" is intended for asynchronous steps, the order of the steps array is recommended instead`);
          reportedSync = true;
        }
        deps.forEach((d, i) => {
          if (typeof d !== 'string') return;
          const dpath: JsonPath = [...s.path, 'dependsOn', i];
          let m: RegExpExecArray | null;
          if ((m = DEP_WF_STEP_RE.exec(d))) {
            const target = ctx.workflowById(m[1]!);
            if (!target) return void ctx.report('arazzo-step-depends-on-resolved', dpath, `dependsOn "${d}": workflow "${m[1]}" not found`);
            if (stepIndexById(target, m[2]!) < 0) return void ctx.report('arazzo-step-depends-on-resolved', dpath, `dependsOn "${d}": step "${m[2]}" not found in workflow "${m[1]}"`);
            if (target === w && m[2] === sid) return void ctx.report('arazzo-step-depends-on-self', dpath, `Step "${sid}" cannot depend on itself`);
            addEdge(node, `${target.index}/${m[2]}`);
          } else if ((m = DEP_SRC_STEP_RE.exec(d))) {
            const t = ctx.sourceType(m[1]!);
            if (!ctx.sourceNames.has(m[1]!)) ctx.report('arazzo-step-depends-on-resolved', dpath, `dependsOn "${d}": source description "${m[1]}" not found`);
            else if (t !== undefined && t !== 'arazzo') ctx.report('arazzo-step-depends-on-resolved', dpath, `dependsOn "${d}": source "${m[1]}" must be of type arazzo (got ${t})`);
          } else if (!d.startsWith('$')) {
            if (d === sid) return void ctx.report('arazzo-step-depends-on-self', dpath, `Step "${sid}" cannot depend on itself`);
            const idx = stepIndexById(w, d);
            if (idx < 0) return void ctx.report('arazzo-step-depends-on-resolved', dpath, `dependsOn "${d}": step not found in workflow "${String(w.wf.workflowId)}"`);
            addEdge(node, `${w.index}/${d}`);
            const target = w.steps.find((x) => x.index === idx)!;
            if (!reportedSync && !isAsyncStep(ctx.doc, target.step)) {
              ctx.report('arazzo-step-depends-on-sync', dpath, `dependsOn "${d}" targets a synchronous step: the order of the steps array already guarantees it completes first`);
            }
          }
        });
      }
    }
    // Implicit dependencies ($steps.X.outputs) and forward references.
    for (const site of ctx.sites) {
      if (site.wf !== w || site.stepIndex === undefined) continue;
      const parsed = parseRuntimeExpression(site.expr);
      if (!parsed.ok || parsed.expression.root !== 'steps' || !parsed.expression.id) continue;
      const from = w.steps.find((x) => x.index === site.stepIndex);
      const fromId = from?.step.stepId;
      const targetIdx = stepIndexById(w, parsed.expression.id);
      if (typeof fromId !== 'string' || targetIdx < 0 || parsed.expression.id === fromId) continue;
      addEdge(`${w.index}/${fromId}`, `${w.index}/${parsed.expression.id}`);
      if (!wfHasDependsOn && targetIdx > site.stepIndex) {
        ctx.report('arazzo-step-forward-output-reference', site.path, `Step "${fromId}" references the outputs of step "${parsed.expression.id}", which comes later in the steps array (and no dependsOn is declared)`);
      }
    }
  }

  // Cycles (Tarjan SCC)
  for (const cycle of stronglyConnected(edges)) {
    if (cycle.length < 2) continue;
    const names = cycle.map((n) => n.split('/').slice(1).join('/'));
    for (const n of cycle) {
      const p = nodePath.get(n);
      if (p) ctx.report('arazzo-step-depends-on-cycle', p, `Dependency cycle between steps: ${names.join(' → ')} → ${names[0]} (explicit dependsOn and $steps.<id>.outputs references)`);
    }
  }
}

function stronglyConnected(edges: Map<string, Set<string>>): string[][] {
  let index = 0;
  const idx = new Map<string, number>();
  const low = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const out: string[][] = [];
  const nodes = new Set<string>([...edges.keys(), ...[...edges.values()].flatMap((s) => [...s])]);
  const visit = (v: string): void => {
    idx.set(v, index);
    low.set(v, index);
    index++;
    stack.push(v);
    onStack.add(v);
    for (const w of edges.get(v) ?? []) {
      if (!idx.has(w)) {
        visit(w);
        low.set(v, Math.min(low.get(v)!, low.get(w)!));
      } else if (onStack.has(w)) low.set(v, Math.min(low.get(v)!, idx.get(w)!));
    }
    if (low.get(v) === idx.get(v)) {
      const comp: string[] = [];
      let w: string;
      do {
        w = stack.pop()!;
        onStack.delete(w);
        comp.push(w);
      } while (w !== v);
      out.push(comp.reverse());
    }
  };
  for (const n of nodes) if (!idx.has(n)) visit(n);
  return out;
}

function ruleWorkflowDependsOn(ctx: Ctx): void {
  const edges = new Map<string, Set<string>>();
  for (const w of ctx.workflows) {
    const id = w.wf.workflowId;
    asArray(w.wf.dependsOn).forEach((d, i) => {
      if (typeof d !== 'string') return;
      const path: JsonPath = [...w.path, 'dependsOn', i];
      if (d.startsWith('$')) {
        checkWorkflowReference(ctx, d, path, 'arazzo-workflow-depends-on-resolved', 'arazzo-workflow-depends-on-qualified');
        return;
      }
      if (d === id) {
        ctx.report('arazzo-workflow-depends-on-cycle', path, `Workflow "${d}" cannot depend on itself`);
        return;
      }
      if (!ctx.workflowById(d)) {
        if (ctx.arazzoSources.size > 0) ctx.report('arazzo-workflow-depends-on-qualified', path, `Workflow "${d}" is not defined in this document; a workflow of another Arazzo document must be referenced as "$sourceDescriptions.<name>.${d}"`);
        else ctx.report('arazzo-workflow-depends-on-resolved', path, `Referenced workflow "${d}" not found in dependsOn`);
        return;
      }
      if (typeof id === 'string') {
        if (!edges.has(id)) edges.set(id, new Set());
        edges.get(id)!.add(d);
      }
    });
  }
  for (const comp of stronglyConnected(edges)) {
    if (comp.length < 2) continue;
    for (const id of comp) {
      const w = ctx.workflowById(id);
      if (w) ctx.report('arazzo-workflow-depends-on-cycle', [...w.path, 'dependsOn'], `Dependency cycle between workflows: ${comp.join(' → ')} → ${comp[0]}`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// c.6 Actions
// ═══════════════════════════════════════════════════════════════════════════════
interface ActionListRef {
  list: unknown;
  path: JsonPath;
  kind: 'success' | 'failure';
  wf?: WfEntry;
}

function actionLists(ctx: Ctx): ActionListRef[] {
  const out: ActionListRef[] = [];
  for (const w of ctx.workflows) {
    out.push({ list: w.wf.successActions, path: [...w.path, 'successActions'], kind: 'success', wf: w });
    out.push({ list: w.wf.failureActions, path: [...w.path, 'failureActions'], kind: 'failure', wf: w });
    for (const s of w.steps) {
      out.push({ list: s.step.onSuccess, path: [...s.path, 'onSuccess'], kind: 'success', wf: w });
      out.push({ list: s.step.onFailure, path: [...s.path, 'onFailure'], kind: 'failure', wf: w });
    }
  }
  return out;
}

function checkAction(ctx: Ctx, a: Obj, path: JsonPath, wf: WfEntry | undefined, refPath?: JsonPath): void {
  const type = a.type;
  const at = (field: string): JsonPath => refPath ?? [...path, field];
  const via = refPath ? ` (component action "${String(a.name)}")` : '';
  if (!refPath) {
    if (a.stepId !== undefined && a.workflowId !== undefined && type !== 'goto') {
      ctx.report('arazzo-action-target-exclusive', path, `Action "${String(a.name)}": "stepId" and "workflowId" are mutually exclusive`);
    }
    if (type === 'end') {
      for (const f of ['stepId', 'workflowId']) if (a[f] !== undefined) ctx.report('arazzo-action-field-irrelevant', [...path, f], `"${f}" has no effect on an "end" action`);
    }
    if (type !== 'retry') {
      for (const f of ['retryAfter', 'retryLimit']) if (a[f] !== undefined) ctx.report('arazzo-action-field-irrelevant', [...path, f], `"${f}" only applies to "retry" actions`);
    }
  }
  if (type === 'goto' || type === 'retry') {
    if (typeof a.stepId === 'string' && wf && stepIndexById(wf, a.stepId) < 0) {
      ctx.report('arazzo-action-goto-step-exists', at('stepId'), `Target step "${a.stepId}" not found in workflow "${String(wf.wf.workflowId)}"${via}`);
    }
    if (typeof a.workflowId === 'string' && !refPath) {
      checkWorkflowReference(ctx, a.workflowId, [...path, 'workflowId'], 'arazzo-action-goto-workflow-exists', 'arazzo-action-goto-workflow-exists');
    }
  }
  if (!refPath && ctx.is11 && a.parameters !== undefined) checkActionParameters(ctx, a, path);
}

function checkActionParameters(ctx: Ctx, a: Obj, path: JsonPath): void {
  const plist = asArray(a.parameters);
  plist.forEach((p, i) => {
    const ip: JsonPath = [...path, 'parameters', i];
    if (!isObj(p)) return void ctx.report('arazzo-action-parameters-shape', ip, 'Action parameters must be Parameter Objects (name, value) or Reusable Objects ($components.parameters.*)');
    if ('reference' in p) {
      const ref = typeof p.reference === 'string' ? parseComponentReference(p.reference) : undefined;
      if (!ref || ref.kind !== 'parameters') ctx.report('arazzo-action-parameters-shape', [...ip, 'reference'], 'A Reusable Object in action parameters must reference $components.parameters.<name>');
      return;
    }
    if (typeof p.name !== 'string' || !('value' in p)) ctx.report('arazzo-action-parameters-shape', ip, 'Action parameters must define "name" and "value"');
    if ('in' in p) ctx.report('arazzo-action-parameters-no-in', [...ip, 'in'], '"in" MUST NOT be used in action parameters (they are mapped to the inputs of the target workflow)');
  });
  if (typeof a.workflowId === 'string') checkParametersMatchInputs(ctx, a.workflowId, a.parameters, path, []);
}

/** Parameters passed to a local workflow match its declared inputs. */
function checkParametersMatchInputs(ctx: Ctx, workflowId: string, list: unknown, hostPath: JsonPath, extraProvided: string[]): void {
  const target = ctx.workflowById(workflowId);
  if (!target) return;
  const inputs = workflowInputNames(ctx.doc, target.wf);
  if (!inputs) return;
  const provided = new Set(extraProvided);
  for (const r of resolveList<Obj>(ctx.doc, list, 'parameters')) {
    const name = r.value.name;
    if (typeof name !== 'string') continue;
    provided.add(name);
    if (!inputs.names.has(name)) {
      const p: JsonPath = r.reference ? [...hostPath, 'parameters', r.index] : [...hostPath, 'parameters', r.index, 'name'];
      ctx.report('arazzo-workflow-parameters-match-inputs', p, `Workflow "${workflowId}" has no input named "${name}"${inputs.names.size ? ` (inputs: ${[...inputs.names].join(', ')})` : ''}`);
    }
  }
  const missing = inputs.required.filter((r) => !provided.has(r));
  if (missing.length) {
    ctx.report('arazzo-workflow-parameters-match-inputs', [...hostPath, 'parameters'], `Required input${missing.length > 1 ? 's' : ''} of workflow "${workflowId}" not provided: ${missing.join(', ')}`);
  }
}

function ruleActions(ctx: Ctx): void {
  for (const l of actionLists(ctx)) {
    const kind = l.kind === 'success' ? 'successActions' : 'failureActions';
    asArray(l.list).forEach((a, i) => {
      if (!isObj(a)) return;
      const ip = [...l.path, i];
      if ('reference' in a) {
        const ref = typeof a.reference === 'string' ? parseComponentReference(a.reference) : undefined;
        if (!ref || ref.kind !== kind) return;
        const comp = componentOf(ctx.doc, kind, ref.name);
        if (isObj(comp)) checkAction(ctx, comp, ip, l.wf, [...ip, 'reference']);
        return;
      }
      checkAction(ctx, a, ip, l.wf);
    });
    // Unique names (identity of an action, DEV PR #620)
    const seen = new Map<string, number>();
    for (const r of resolveList<Obj>(ctx.doc, l.list, kind)) {
      const name = r.value.name;
      if (typeof name !== 'string') continue;
      if (seen.has(name)) ctx.report('arazzo-action-name-unique', [...l.path, r.index], `Duplicate action name "${name}" in this list (already used by item ${seen.get(name)})`);
      else seen.set(name, r.index);
    }
  }
  const comps = asObj(ctx.doc.components);
  for (const kind of ['successActions', 'failureActions'] as const) {
    for (const [k, a] of Object.entries(asObj(comps[kind]))) if (isObj(a)) checkAction(ctx, a, ['components', kind, k], undefined);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// c.7 Parameters
// ═══════════════════════════════════════════════════════════════════════════════
interface ParamRef {
  param: Obj;
  path: JsonPath;
}

function resolvedParams(ctx: Ctx, list: unknown, path: JsonPath): ParamRef[] {
  return resolveList<Obj>(ctx.doc, list, 'parameters').map((r) => ({ param: r.value, path: [...path, r.index] }));
}

function ruleParameters(ctx: Ctx): void {
  const unique = (list: unknown, path: JsonPath, byNameOnly: boolean) => {
    const seen = new Map<string, number>();
    for (const r of resolveList<Obj>(ctx.doc, list, 'parameters')) {
      if (typeof r.value.name !== 'string') continue;
      const key = byNameOnly ? r.value.name : `${r.value.name}\u0000${String(r.value.in ?? '')}`;
      if (seen.has(key)) {
        ctx.report('arazzo-parameter-unique', [...path, r.index], `Duplicate parameter "${r.value.name}"${!byNameOnly && r.value.in ? ` (in: ${String(r.value.in)})` : ''} (already defined by item ${seen.get(key)})`);
      } else seen.set(key, r.index);
    }
  };
  for (const w of ctx.workflows) {
    unique(w.wf.parameters, [...w.path, 'parameters'], false);
    const wfParams = resolvedParams(ctx, w.wf.parameters, [...w.path, 'parameters']);
    for (const s of w.steps) {
      const st = s.step as Obj;
      const isWorkflowStep = typeof st.workflowId === 'string';
      unique(st.parameters, [...s.path, 'parameters'], isWorkflowStep);
      if (isWorkflowStep) {
        asArray(st.parameters).forEach((p, i) => {
          if (isObj(p) && !('reference' in p) && p.in !== undefined) {
            ctx.report('arazzo-workflow-step-param-in', [...s.path, 'parameters', i, 'in'], '"in" is ignored for a step that calls a workflow: parameters are mapped to the workflow inputs');
          }
        });
        const fromWf = wfParams.map((p) => p.param.name).filter((n): n is string => typeof n === 'string');
        checkParametersMatchInputs(ctx, st.workflowId as string, st.parameters, s.path, fromWf);
        continue;
      }
      if (!ctx.is11) continue;
      // Effective parameter set of the operation: workflow-level, overridden by step-level (name + in).
      const eff = new Map<string, ParamRef>();
      for (const p of [...wfParams, ...resolvedParams(ctx, st.parameters, [...s.path, 'parameters'])]) {
        if (typeof p.param.name !== 'string') continue;
        eff.set(`${p.param.name}\u0000${String(p.param.in ?? '')}`, p);
      }
      const all = [...eff.values()];
      const qs = all.filter((p) => p.param.in === 'querystring');
      const q = all.filter((p) => p.param.in === 'query');
      if (qs.length && q.length) {
        for (const p of qs) {
          ctx.report('arazzo-param-querystring-exclusive', [...p.path, 'in'], `"in: querystring" cannot coexist with "in: query" parameters for the same operation (${q.map((x) => String(x.param.name)).join(', ')})`);
        }
      }
      qs.slice(1).forEach((p) => ctx.report('arazzo-param-querystring-single', [...p.path, 'in'], `Only one "in: querystring" parameter is allowed per operation (OAS 3.2); "${String(qs[0]!.param.name)}" already sets the query string`));
    }
  }
  if (!ctx.is11) return;
  // querystring values must resolve to a string (all parameter declarations)
  const checkQsValue = (p: unknown, path: JsonPath) => {
    if (!isObj(p) || p.in !== 'querystring' || !('value' in p)) return;
    const v = p.value;
    if (typeof v !== 'string' && !isSelector(v)) {
      ctx.report('arazzo-param-querystring-string', [...path, 'value'], `The value of a querystring parameter must resolve to a string such as "a=1&b=2" (got ${Array.isArray(v) ? 'an array' : v === null ? 'null' : typeof v})`);
    }
  };
  for (const w of ctx.workflows) {
    asArray(w.wf.parameters).forEach((p, i) => checkQsValue(p, [...w.path, 'parameters', i]));
    for (const s of w.steps) asArray(s.step.parameters).forEach((p, i) => checkQsValue(p, [...s.path, 'parameters', i]));
  }
  for (const [k, p] of Object.entries(asObj(asObj(ctx.doc.components).parameters))) checkQsValue(p, ['components', 'parameters', k]);
}

// ═══════════════════════════════════════════════════════════════════════════════
// c.7 Reusable Objects & components
// ═══════════════════════════════════════════════════════════════════════════════
function ruleReusables(ctx: Ctx): void {
  const check = (list: unknown, path: JsonPath, expected: ListKind) => {
    asArray(list).forEach((item, i) => {
      if (!isObj(item) || !('reference' in item)) return;
      const ip: JsonPath = [...path, i];
      const refStr = item.reference;
      if (typeof refStr !== 'string') return; // schema
      if (/^\$components\.inputs\./.test(refStr.trim())) {
        ctx.report('arazzo-components-inputs-ref', [...ip, 'reference'], `"${refStr}" is not a runtime expression: reference reusable inputs with "$ref: '#/components/inputs/<name>'" inside "inputs"`);
        return;
      }
      const ref = parseComponentReference(refStr);
      if (!ref) {
        ctx.report('arazzo-reusable-reference-resolved', [...ip, 'reference'], `Invalid reference "${refStr}": expected $components.${expected}.<name>`);
        return;
      }
      if (ref.kind !== expected) {
        ctx.report('arazzo-reusable-reference-kind', [...ip, 'reference'], `"${refStr}" references ${ref.kind}, but this list expects $components.${expected}.*`);
      } else if (componentOf(ctx.doc, ref.kind, ref.name) === undefined) {
        ctx.report('arazzo-reusable-reference-resolved', [...ip, 'reference'], `Component "${ref.name}" not found in components.${ref.kind}`);
      }
      if ('value' in item) {
        if (ref.kind !== 'parameters') ctx.report('arazzo-reusable-value-parameter-only', [...ip, 'value'], '"value" only applies to Reusable Objects that reference a parameter');
        if (isSelector(item.value)) ctx.report('arazzo-selector-misplaced', [...ip, 'value'], 'A Selector Object in a Reusable Object "value" is taken as a literal value; put the Selector in the component parameter instead');
      }
    });
  };
  const checkActionParams = (list: unknown, path: JsonPath) => {
    asArray(list).forEach((a, i) => {
      if (isObj(a) && !('reference' in a) && ctx.is11) check(a.parameters, [...path, i, 'parameters'], 'parameters');
    });
  };
  for (const w of ctx.workflows) {
    check(w.wf.parameters, [...w.path, 'parameters'], 'parameters');
    check(w.wf.successActions, [...w.path, 'successActions'], 'successActions');
    check(w.wf.failureActions, [...w.path, 'failureActions'], 'failureActions');
    checkActionParams(w.wf.successActions, [...w.path, 'successActions']);
    checkActionParams(w.wf.failureActions, [...w.path, 'failureActions']);
    for (const s of w.steps) {
      check(s.step.parameters, [...s.path, 'parameters'], 'parameters');
      check(s.step.onSuccess, [...s.path, 'onSuccess'], 'successActions');
      check(s.step.onFailure, [...s.path, 'onFailure'], 'failureActions');
      checkActionParams(s.step.onSuccess, [...s.path, 'onSuccess']);
      checkActionParams(s.step.onFailure, [...s.path, 'onFailure']);
    }
  }
  const comps = asObj(ctx.doc.components);
  for (const kind of ['successActions', 'failureActions'] as const) {
    for (const [k, a] of Object.entries(asObj(comps[kind]))) {
      if (isObj(a) && ctx.is11) check(a.parameters, ['components', kind, k, 'parameters'], 'parameters');
    }
  }
}

function ruleComponents(ctx: Ctx): void {
  // Local $ref inside JSON Schemas (workflow inputs, components.inputs)
  const anchors = new Set<string>();
  const schemas: { schema: unknown; path: JsonPath }[] = [];
  for (const w of ctx.workflows) if (w.wf.inputs !== undefined) schemas.push({ schema: w.wf.inputs, path: [...w.path, 'inputs'] });
  for (const [k, s] of Object.entries(asObj(asObj(ctx.doc.components).inputs))) schemas.push({ schema: s, path: ['components', 'inputs', k] });
  const walk = (node: unknown, path: JsonPath, fn: (o: Obj, p: JsonPath) => void, depth = 0): void => {
    if (depth > 40) return;
    if (Array.isArray(node)) node.forEach((v, i) => walk(v, [...path, i], fn, depth + 1));
    else if (isObj(node)) {
      fn(node, path);
      for (const [k, v] of Object.entries(node)) if (k !== 'enum' && k !== 'const' && k !== 'default' && k !== 'examples') walk(v, [...path, k], fn, depth + 1);
    }
  };
  const usedInputs = new Set<string>();
  for (const s of schemas) walk(s.schema, s.path, (o) => typeof o.$anchor === 'string' && anchors.add(o.$anchor));
  for (const s of schemas) {
    walk(s.schema, s.path, (o, p) => {
      if (typeof o.$ref !== 'string' || !o.$ref.startsWith('#')) return;
      const ref = o.$ref;
      const m = /^#\/components\/inputs\/([^/]+)/.exec(ref);
      if (m) usedInputs.add(m[1]!.replace(/~1/g, '/').replace(/~0/g, '~'));
      if (ref.startsWith('#/') || ref === '#') {
        if (resolveJsonPointer(ctx.doc, ref) === undefined && resolveJsonPointer(s.schema, ref) === undefined) {
          ctx.report('arazzo-components-ref-resolved', [...p, '$ref'], `$ref "${ref}" does not resolve in this document`);
        }
      } else if (!anchors.has(ref.slice(1))) {
        ctx.report('arazzo-components-ref-resolved', [...p, '$ref'], `$ref "${ref}": no "$anchor": "${ref.slice(1)}" found in the inputs schemas`);
      }
    });
  }
  // Unused components
  const used = new Set<string>();
  const collectRefs = (node: unknown, depth = 0): void => {
    if (depth > 60) return;
    if (typeof node === 'string') {
      for (const e of expressionsInString(node)) {
        const r = parseComponentReference(e);
        if (r) used.add(`${r.kind}/${r.name}`);
      }
      const r = parseComponentReference(node);
      if (r) used.add(`${r.kind}/${r.name}`);
    } else if (Array.isArray(node)) node.forEach((v) => collectRefs(v, depth + 1));
    else if (isObj(node)) Object.entries(node).forEach(([k, v]) => k !== 'components' || depth > 0 ? collectRefs(v, depth + 1) : undefined);
  };
  collectRefs(ctx.doc);
  // Component actions / parameters can reference other components.
  const comps = asObj(ctx.doc.components);
  for (const kind of ['parameters', 'successActions', 'failureActions'] as const) {
    for (const v of Object.values(asObj(comps[kind]))) collectRefs(v, 1);
  }
  for (const kind of ['parameters', 'successActions', 'failureActions'] as const) {
    for (const k of Object.keys(asObj(comps[kind]))) {
      if (!used.has(`${kind}/${k}`)) ctx.report('arazzo-components-unused', ['components', kind, k], `Component "${k}" (components.${kind}) is never referenced`);
    }
  }
  for (const k of Object.keys(asObj(comps.inputs))) {
    if (!usedInputs.has(k)) ctx.report('arazzo-components-unused', ['components', 'inputs', k], `Component "${k}" (components.inputs) is never referenced with $ref`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// c.8 Criteria, Selectors, Payload replacements
// ═══════════════════════════════════════════════════════════════════════════════
function criterionTypeName(type: unknown): string {
  if (typeof type === 'string') return type;
  if (isObj(type) && typeof type.type === 'string') return type.type;
  return 'simple';
}

function allCriteria(ctx: Ctx): { c: Obj; path: JsonPath }[] {
  const out: { c: Obj; path: JsonPath }[] = [];
  const add = (list: unknown, path: JsonPath) => asArray(list).forEach((c, i) => isObj(c) && out.push({ c, path: [...path, i] }));
  const fromActions = (list: unknown, path: JsonPath) => asArray(list).forEach((a, i) => isObj(a) && !('reference' in a) && add(a.criteria, [...path, i, 'criteria']));
  for (const w of ctx.workflows) {
    fromActions(w.wf.successActions, [...w.path, 'successActions']);
    fromActions(w.wf.failureActions, [...w.path, 'failureActions']);
    for (const s of w.steps) {
      add(s.step.successCriteria, [...s.path, 'successCriteria']);
      fromActions(s.step.onSuccess, [...s.path, 'onSuccess']);
      fromActions(s.step.onFailure, [...s.path, 'onFailure']);
    }
  }
  const comps = asObj(ctx.doc.components);
  for (const kind of ['successActions', 'failureActions'] as const) {
    for (const [k, a] of Object.entries(asObj(comps[kind]))) if (isObj(a)) add(a.criteria, ['components', kind, k, 'criteria']);
  }
  return out;
}

function checkSelectorSyntax(type: string, version: string | undefined, selector: string, is11: boolean): string | null {
  if (type === 'jsonpointer') return checkJsonPointer(selector);
  if (type === 'jsonpath') {
    const v = version ?? (is11 ? 'rfc9535' : 'draft-goessner-dispatch-jsonpath-00');
    return v === 'rfc9535' ? checkJsonPath(maskEmbedded(selector, '0')) : checkJsonPathGoessner(maskEmbedded(selector, '0'));
  }
  if (type === 'xpath') return checkXPath(maskEmbedded(selector, '0'));
  return null;
}

function ruleCriteria(ctx: Ctx): void {
  for (const { c, path } of allCriteria(ctx)) {
    const t = criterionTypeName(c.type);
    const version = isObj(c.type) && typeof c.type.version === 'string' ? c.type.version : undefined;
    if (t === 'jsonpointer' && isObj(c.type)) {
      ctx.report('arazzo-criterion-eto-jsonpointer', [...path, 'type'], 'jsonpointer has no condition semantics (§ 5.8.11.4 only defines simple, regex, jsonpath and xpath)');
      continue;
    }
    if (typeof c.condition !== 'string') continue;
    const cond = c.condition;
    let error: string | null = null;
    if (t === 'simple') error = checkSimpleCondition(cond).error;
    else if (t === 'regex') error = checkRegex(cond);
    else if (t === 'jsonpath' || t === 'xpath') error = checkSelectorSyntax(t, version, cond, ctx.is11);
    const loose = t === 'regex' || t === 'jsonpath' || t === 'xpath' ? unembeddedExpressions(cond) : [];
    if (loose.length) {
      // The syntax error, if any, is a consequence of the missing braces.
      ctx.report('arazzo-criterion-embedded-expression', [...path, 'condition'], `Runtime expressions in a ${t} condition must be embedded in braces: use {${loose[0]}}`);
    } else if (error) ctx.report('arazzo-criterion-syntax', [...path, 'condition'], error);
  }
}

function forEachSelector(ctx: Ctx, fn: (sel: Obj, path: JsonPath) => void): void {
  const fromOutputs = (o: unknown, path: JsonPath) => {
    for (const [k, v] of Object.entries(asObj(o))) if (isObj(v)) fn(v, [...path, k]);
  };
  const fromParams = (list: unknown, path: JsonPath) => asArray(list).forEach((p, i) => isObj(p) && !('reference' in p) && isSelector(p.value) && fn(p.value as unknown as Obj, [...path, i, 'value']));
  const fromPayload = (v: unknown, path: JsonPath, depth = 0): void => {
    if (depth > 32) return;
    if (isSelector(v)) fn(v as unknown as Obj, path);
    else if (Array.isArray(v)) v.forEach((x, i) => fromPayload(x, [...path, i], depth + 1));
    else if (isObj(v)) for (const [k, x] of Object.entries(v)) fromPayload(x, [...path, k], depth + 1);
  };
  for (const w of ctx.workflows) {
    fromOutputs(w.wf.outputs, [...w.path, 'outputs']);
    fromParams(w.wf.parameters, [...w.path, 'parameters']);
    for (const s of w.steps) {
      fromOutputs(s.step.outputs, [...s.path, 'outputs']);
      fromParams(s.step.parameters, [...s.path, 'parameters']);
      const rb = asObj(s.step.requestBody);
      if ('payload' in rb) fromPayload(rb.payload, [...s.path, 'requestBody', 'payload']);
      asArray(rb.replacements).forEach((r, i) => isObj(r) && isObj(r.value) && fn(r.value, [...s.path, 'requestBody', 'replacements', i, 'value']));
    }
  }
  for (const [k, p] of Object.entries(asObj(asObj(ctx.doc.components).parameters))) {
    if (isObj(p) && isSelector(p.value)) fn(p.value as unknown as Obj, ['components', 'parameters', k, 'value']);
  }
}

function ruleSelectors(ctx: Ctx): void {
  if (!ctx.is11) return;
  forEachSelector(ctx, (sel, path) => {
    if (typeof sel.context === 'string') {
      const c = sel.context.trim();
      let unstructured: string | undefined;
      if (!c.startsWith('$')) unstructured = 'it is not a runtime expression';
      else {
        const parsed = parseRuntimeExpression(c);
        if (parsed.ok) {
          const e = parsed.expression;
          if (e.root === 'statusCode' || e.root === 'url' || e.root === 'method' || e.root === 'self') unstructured = `$${e.root} is a scalar`;
          else if (e.source === 'header' || e.source === 'query' || e.source === 'path') unstructured = `a ${e.source} value is a string`;
        }
      }
      if (unstructured) ctx.report('arazzo-selector-context-structured', [...path, 'context'], `Selector "context" must evaluate to structured data such as $response.body or $message.payload (${unstructured})`);
    }
    if (typeof sel.selector !== 'string') return;
    const t = typeof sel.type === 'string' ? sel.type : isObj(sel.type) && typeof sel.type.type === 'string' ? sel.type.type : undefined;
    if (!t) return;
    const version = isObj(sel.type) && typeof sel.type.version === 'string' ? sel.type.version : undefined;
    const err = checkSelectorSyntax(t, version, sel.selector, true);
    if (err) ctx.report('arazzo-selector-syntax', [...path, 'selector'], err);
  });
}

function ruleReplacements(ctx: Ctx): void {
  for (const w of ctx.workflows) {
    for (const s of w.steps) {
      const rb = asObj(s.step.requestBody);
      const ct = typeof rb.contentType === 'string' ? rb.contentType.toLowerCase() : '';
      asArray(rb.replacements).forEach((r, i) => {
        if (!isObj(r)) return;
        const rp: JsonPath = [...s.path, 'requestBody', 'replacements', i];
        const tst = r.targetSelectorType;
        let type: string;
        let version: string | undefined;
        let declared = true;
        if (typeof tst === 'string') type = tst;
        else if (isObj(tst) && typeof tst.type === 'string') {
          type = tst.type;
          version = typeof tst.version === 'string' ? tst.version : undefined;
        } else {
          declared = false;
          type = ct.includes('xml') || (typeof rb.payload === 'string' && rb.payload.trim().startsWith('<')) ? 'xpath' : 'jsonpointer';
        }
        if (typeof r.target === 'string') {
          const err = checkSelectorSyntax(type, version, r.target, ctx.is11);
          if (err) {
            ctx.report(
              'arazzo-replacement-target-syntax',
              [...rp, 'target'],
              `${err}${declared ? '' : ` — without "targetSelectorType", the target of a ${type === 'xpath' ? 'XML' : 'JSON'} payload is a ${type === 'xpath' ? 'XPath expression' : 'JSON Pointer (e.g. /metadata/source)'}`}`,
            );
          }
        }
        if (ctx.is11 && 'value' in r && typeof r.value !== 'string' && !isObj(r.value)) {
          ctx.report('arazzo-replacement-literal-value', [...rp, 'value'], 'Non-string literal replacement value: allowed by the specification text (and the 1.1 development schema) but rejected by the published 1.1 schema (2026-04-15); some tools may refuse it');
        }
      });
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// c.9 Runtime expressions
// ═══════════════════════════════════════════════════════════════════════════════
function declaredWithPrefix(names: Iterable<string>, field: string): boolean {
  const set = new Set(names);
  if (set.has(field)) return true;
  const parts = field.split('.');
  for (let i = parts.length - 1; i > 0; i--) if (set.has(parts.slice(0, i).join('.'))) return true;
  return false;
}

function ruleExpressions(ctx: Ctx): void {
  const version = String(ctx.doc.arazzo);
  for (const site of ctx.sites) {
    const parsed = parseRuntimeExpression(site.expr);
    if (!parsed.ok) {
      ctx.report('arazzo-expression-syntax', site.path, parsed.problem.message, parsed.problem.severity);
      continue;
    }
    if (parsed.warning) ctx.report('arazzo-expression-syntax', site.path, parsed.warning.message, parsed.warning.severity);
    const e: ParsedExpression = parsed.expression;
    if (!ctx.is11 && (e.root === 'message' || e.root === 'self')) {
      ctx.report('arazzo-version-feature-mismatch', site.path, featureMessage(`The runtime expression $${e.root}`, version), 'warning');
      continue;
    }
    switch (e.root) {
      case 'steps': {
        if (site.component || !site.wf) break;
        const target = site.wf.steps.find((s) => s.step.stepId === e.id);
        if (!target) {
          ctx.report('arazzo-expression-steps-resolved', site.path, `"${e.raw}": step "${e.id}" not found in workflow "${String(site.wf.wf.workflowId)}"`);
          break;
        }
        const outs = Object.keys(asObj(target.step.outputs));
        if (e.field && !declaredWithPrefix(outs, e.field)) {
          ctx.report('arazzo-expression-steps-resolved', site.path, `"${e.raw}": step "${e.id}" does not declare output "${e.field}"${outs.length ? ` (outputs: ${outs.join(', ')})` : ''}`);
        }
        break;
      }
      case 'workflows': {
        const target = ctx.workflowById(e.id!);
        if (!target) {
          ctx.report('arazzo-expression-workflows-resolved', site.path, `"${e.raw}": workflow "${e.id}" not found`);
          break;
        }
        if (e.section === 'outputs') {
          const outs = Object.keys(asObj(target.wf.outputs));
          if (!declaredWithPrefix(outs, e.field!)) ctx.report('arazzo-expression-workflows-resolved', site.path, `"${e.raw}": workflow "${e.id}" does not declare output "${e.field}"`);
        } else {
          const inputs = workflowInputNames(ctx.doc, target.wf);
          if (inputs && !declaredWithPrefix(inputs.names, e.field!)) ctx.report('arazzo-expression-workflows-resolved', site.path, `"${e.raw}": workflow "${e.id}" does not declare input "${e.field}"`);
        }
        break;
      }
      case 'inputs': {
        if (site.component || !site.wf) break;
        const inputs = workflowInputNames(ctx.doc, site.wf.wf);
        if (inputs && !declaredWithPrefix(inputs.names, e.field!)) {
          ctx.report('arazzo-expression-inputs-declared', site.path, `"${e.raw}": input "${e.field}" is not declared in the inputs of workflow "${String(site.wf.wf.workflowId)}"`);
        }
        break;
      }
      case 'sourceDescriptions': {
        if (!ctx.sourceNames.has(e.id!)) {
          ctx.report('arazzo-expression-source-resolved', site.path, `"${e.raw}": source description "${e.id}" not found${ctx.sourceNames.size ? ` (sources: ${[...ctx.sourceNames].join(', ')})` : ''}`);
        }
        break;
      }
      case 'components': {
        if (e.section === 'inputs') {
          ctx.report('arazzo-components-inputs-ref', site.path, `"${e.raw}" is not a runtime expression: reference reusable inputs with "$ref: '#/components/inputs/<name>'"`);
          break;
        }
        if (componentOf(ctx.doc, e.section as 'parameters', e.field!) === undefined) {
          ctx.report('arazzo-expression-components-resolved', site.path, `"${e.raw}": component "${e.field}" not found in components.${e.section}`);
        }
        break;
      }
      case 'self':
        if (ctx.doc.$self === undefined) ctx.report('arazzo-expression-self-defined', site.path, '"$self" is used but the document does not declare "$self": its value depends on the retrieval URI');
        break;
      case 'message':
        if (!site.async) ctx.report('arazzo-expression-message-context', site.path, `"${e.raw}" is only meaningful in an AsyncAPI step (send or receive)`);
        break;
      case 'statusCode':
      case 'request':
      case 'response':
        if (site.async && ctx.is11) ctx.report('arazzo-async-http-expression', site.path, `"${e.raw}" refers to an HTTP exchange but this step is an AsyncAPI step: use $message.header / $message.payload`);
        break;
      default:
        break;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// c.10 Sources
// ═══════════════════════════════════════════════════════════════════════════════
function ruleSources(ctx: Ctx): void {
  const used = new Set<string>();
  for (const w of ctx.workflows) {
    for (const s of w.steps) {
      const src = resolveStepSource(ctx.doc, s.step);
      if (src.name) used.add(src.name);
      asArray(s.step.dependsOn).forEach((d) => {
        const m = typeof d === 'string' ? DEP_SRC_STEP_RE.exec(d) : null;
        if (m) used.add(m[1]!);
      });
    }
    asArray(w.wf.dependsOn).forEach((d) => {
      const m = typeof d === 'string' ? SRC_WF_RE.exec(d) : null;
      if (m) used.add(m[1]!);
    });
  }
  const scan = (node: unknown, depth = 0): void => {
    if (depth > 60) return;
    if (typeof node === 'string') {
      const re = /\$sourceDescriptions\.([A-Za-z0-9_\-]+)/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(node))) used.add(m[1]!);
    } else if (Array.isArray(node)) node.forEach((v) => scan(v, depth + 1));
    else if (isObj(node)) Object.values(node).forEach((v) => scan(v, depth + 1));
  };
  scan(ctx.doc.workflows);
  scan(ctx.doc.components);

  asArray(ctx.doc.sourceDescriptions).forEach((s, i) => {
    if (!isObj(s)) return;
    if (typeof s.url === 'string' && !isUriReference(s.url)) {
      ctx.report('arazzo-source-url-uri-reference', ['sourceDescriptions', i, 'url'], `Source url ${JSON.stringify(s.url)} is not a valid URI-reference (RFC 3986): spaces and some characters must be percent-encoded`);
    }
    if (typeof s.name === 'string' && !used.has(s.name)) {
      ctx.report('arazzo-source-unused', ['sourceDescriptions', i], `Source description "${s.name}" is never referenced by a step or expression`);
    }
  });
}
