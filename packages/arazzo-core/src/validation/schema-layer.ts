// Layer (a): official JSON Schemas (precompiled with Ajv 2020-12, see
// scripts/gen-validators.mjs) and translation of raw Ajv errors into readable,
// de-duplicated diagnostics with rule codes.
import { validate10, validate11 } from '../generated/validators.js';
import type { GeneratedAjvError } from '../generated/validators.js';
import type { JsonPath } from '../parse.js';
import { pointerToPath } from '../parse.js';
import type { ArazzoMinor } from '../version.js';
import { isObj, asArray } from '../model.js';
import type { Diagnostic } from './diagnostic.js';
import { createSink } from './diagnostic.js';
import type { RuleId } from './rules.js';

/** Kinds of Arazzo objects, derived from the instance path. */
type Kind =
  | 'root'
  | 'info'
  | 'sources'
  | 'source'
  | 'workflows'
  | 'workflow'
  | 'steps'
  | 'step'
  | 'paramList'
  | 'param'
  | 'actionParamList'
  | 'actionParam'
  | 'saList'
  | 'faList'
  | 'successAction'
  | 'failureAction'
  | 'reusable'
  | 'critList'
  | 'criterion'
  | 'eto'
  | 'outputs'
  | 'output'
  | 'selector'
  | 'requestBody'
  | 'payload'
  | 'replList'
  | 'replacement'
  | 'components'
  | 'compInputs'
  | 'compParams'
  | 'compSA'
  | 'compFA'
  | 'json-schema'
  | 'stepDependsOn'
  | 'wfDependsOn'
  | 'other';

const isReusable = (v: unknown): boolean => isObj(v) && 'reference' in v;

function child(kind: Kind, seg: string | number, value: unknown): Kind {
  switch (kind) {
    case 'root':
      return seg === 'info' ? 'info' : seg === 'sourceDescriptions' ? 'sources' : seg === 'workflows' ? 'workflows' : seg === 'components' ? 'components' : 'other';
    case 'sources':
      return 'source';
    case 'workflows':
      return 'workflow';
    case 'workflow':
      return seg === 'steps'
        ? 'steps'
        : seg === 'parameters'
          ? 'paramList'
          : seg === 'successActions'
            ? 'saList'
            : seg === 'failureActions'
              ? 'faList'
              : seg === 'outputs'
                ? 'outputs'
                : seg === 'inputs'
                  ? 'json-schema'
                  : seg === 'dependsOn'
                    ? 'wfDependsOn'
                    : 'other';
    case 'steps':
      return 'step';
    case 'step':
      return seg === 'parameters'
        ? 'paramList'
        : seg === 'onSuccess'
          ? 'saList'
          : seg === 'onFailure'
            ? 'faList'
            : seg === 'outputs'
              ? 'outputs'
              : seg === 'successCriteria'
                ? 'critList'
                : seg === 'requestBody'
                  ? 'requestBody'
                  : seg === 'dependsOn'
                    ? 'stepDependsOn'
                    : 'other';
    case 'paramList':
      return isReusable(value) ? 'reusable' : 'param';
    case 'actionParamList':
      return isReusable(value) ? 'reusable' : 'actionParam';
    case 'saList':
      return isReusable(value) ? 'reusable' : 'successAction';
    case 'faList':
      return isReusable(value) ? 'reusable' : 'failureAction';
    case 'param':
    case 'actionParam':
      return seg === 'value' && isObj(value) ? 'selector' : 'other';
    case 'successAction':
    case 'failureAction':
      return seg === 'criteria' ? 'critList' : seg === 'parameters' ? 'actionParamList' : 'other';
    case 'critList':
      return 'criterion';
    case 'criterion':
      return seg === 'type' && isObj(value) ? 'eto' : 'other';
    case 'outputs':
      return isObj(value) ? 'selector' : 'output';
    case 'selector':
      return seg === 'type' && isObj(value) ? 'eto' : 'other';
    case 'requestBody':
      return seg === 'replacements' ? 'replList' : seg === 'payload' ? 'payload' : 'other';
    case 'replList':
      return 'replacement';
    case 'replacement':
      return seg === 'value' && isObj(value) ? 'selector' : seg === 'targetSelectorType' && isObj(value) ? 'eto' : 'other';
    case 'components':
      return seg === 'inputs' ? 'compInputs' : seg === 'parameters' ? 'compParams' : seg === 'successActions' ? 'compSA' : seg === 'failureActions' ? 'compFA' : 'other';
    case 'compInputs':
      return 'json-schema';
    case 'compParams':
      return 'param';
    case 'compSA':
      return 'successAction';
    case 'compFA':
      return 'failureAction';
    case 'json-schema':
      return 'json-schema';
    case 'payload':
      return 'payload';
    default:
      return 'other';
  }
}

function kindsAlong(doc: unknown, path: JsonPath): Kind[] {
  const kinds: Kind[] = ['root'];
  let cur: unknown = doc;
  let kind: Kind = 'root';
  for (const seg of path) {
    cur = Array.isArray(cur) ? cur[Number(seg)] : isObj(cur) ? cur[String(seg)] : undefined;
    kind = child(kind, seg, cur);
    kinds.push(kind);
  }
  return kinds;
}

function valueAt(doc: unknown, path: JsonPath): unknown {
  let cur: unknown = doc;
  for (const seg of path) cur = Array.isArray(cur) ? cur[Number(seg)] : isObj(cur) ? cur[String(seg)] : undefined;
  return cur;
}

/** Fields whose combinations are reported by semantic rules (target exclusivity, AsyncAPI rules). */
const STEP_SEMANTIC_FIELDS = new Set(['operationId', 'operationPath', 'workflowId', 'channelPath', 'action', 'correlationId']);
const TARGETS = new Set(['operationId', 'operationPath', 'workflowId', 'channelPath']);
const ACTION_LIST_SEGMENTS = new Set(['onSuccess', 'onFailure', 'successActions', 'failureActions', 'parameters']);

const label = (path: JsonPath): string => (path.length ? path.map((s) => (typeof s === 'number' ? `[${s}]` : `.${s}`)).join('').replace(/^\./, '') : 'document');

interface Translated {
  code: RuleId;
  path: JsonPath;
  message: string;
  severity?: 'error' | 'warning';
}

function translate(err: GeneratedAjvError, doc: unknown, minor: ArazzoMinor): Translated | null {
  const path = pointerToPath(err.instancePath, doc);
  const kinds = kindsAlong(doc, path);
  const kind = kinds[kinds.length - 1]!;
  const parentKind = kinds[kinds.length - 2];
  const last = path[path.length - 1];
  const parent = path.slice(0, -1);
  const kw = err.keyword;
  const p = err.params ?? {};
  const sp = err.schemaPath;
  const value = valueAt(doc, path);
  const fallback = (message?: string): Translated => ({ code: 'arazzo-schema', path, message: message ?? `${label(path)}: ${err.message ?? kw}` });

  // Pattern errors raised for property names are reported through `propertyNames`.
  if (err.propertyName !== undefined && kw !== 'propertyNames') return null;

  // ── Inside JSON Schemas (workflow inputs, components.inputs): validated against the 2020-12 meta-schema.
  if (kinds.includes('json-schema')) {
    if (kw === 'if' || kw === 'anyOf' || kw === 'oneOf' || kw === '$dynamicRef') return null;
    return { code: 'arazzo-schema', path, message: `Invalid JSON Schema at ${label(path)}: ${err.message ?? kw}` };
  }

  // ── Combinators: summaries of branch errors, reported by the branches themselves.
  if (kw === 'oneOf' && (kind === 'successAction' || kind === 'failureAction') && sp.includes('/then/oneOf')) {
    return { code: 'arazzo-action-goto-target', path, message: 'A goto action must define exactly one of "stepId" or "workflowId"' };
  }
  if (kw === 'if' || kw === 'oneOf' || kw === 'anyOf' || kw === 'allOf' || kw === 'not') return null;

  // ── Root
  if (path.length === 0 && kw === 'required' && p.missingProperty === 'arazzo') {
    return { code: 'arazzo-version-format', path: ['arazzo'], message: 'Missing required field: arazzo' };
  }
  if (path.length === 1 && last === 'arazzo') {
    return {
      code: 'arazzo-version-format',
      path,
      message: `Invalid arazzo version ${JSON.stringify(value)}: expected a "major.minor.patch" string such as "${minor}.0"`,
    };
  }
  if (path.length === 1 && last === '$self' && kw === 'pattern') {
    return { code: 'arazzo-self-fragment', path, message: '$self MUST NOT contain a fragment ("#…")' };
  }

  // ── Selector objects
  const selectorPath = kind === 'selector' ? path : parentKind === 'selector' ? parent : undefined;
  if (selectorPath) {
    const sel = valueAt(doc, selectorPath);
    const selKinds = kindsAlong(doc, selectorPath);
    const hostKind = selKinds[selKinds.length - 2];
    const looksLiteral = isObj(sel) && !('context' in sel) && !('selector' in sel) && !('type' in sel);
    if (looksLiteral && (hostKind === 'param' || hostKind === 'actionParam')) {
      return {
        code: 'arazzo-migration-param-object-value',
        path: selectorPath,
        message:
          'In Arazzo 1.1 an object Parameter value must be a Selector Object (context, selector, type). Serialize the literal object as a JSON string, or use a Selector.',
      };
    }
    if (kind === 'selector' && kw === 'required') {
      return { code: 'arazzo-selector-required-fields', path: [...path, String(p.missingProperty)], message: `Selector Object: missing required field "${p.missingProperty}"` };
    }
    if (parentKind === 'selector' && last === 'type' && kw === 'enum') {
      return { code: 'arazzo-schema', path, message: `Selector type must be one of jsonpath, xpath, jsonpointer (got ${JSON.stringify(value)})` };
    }
  }

  // ── Unknown fields
  if (kw === 'unevaluatedProperties') {
    const prop = String(p.unevaluatedProperty);
    if (kind === 'step' && STEP_SEMANTIC_FIELDS.has(prop)) return null;
    if (kind === 'reusable') {
      return {
        code: 'arazzo-reusable-no-extension',
        path: [...path, prop],
        message: `Reusable Objects only accept "reference" and "value" (found "${prop}")`,
      };
    }
    return {
      code: 'arazzo-unknown-field',
      path: [...path, prop],
      message: `Unknown field "${prop}"${prop.startsWith('x') ? '' : ' (specification extensions must start with "x-")'}`,
    };
  }
  if (kw === 'propertyNames') {
    return {
      code: 'arazzo-key-pattern',
      path: [...path, String(p.propertyName)],
      message: `Invalid key "${p.propertyName}": keys must match ^[a-zA-Z0-9.\\-_]+$`,
    };
  }

  // ── Steps
  if (kind === 'step' && kw === 'required') {
    if (TARGETS.has(p.missingProperty)) return null; // arazzo-step-target-missing / -exclusive (semantic)
    if (p.missingProperty === 'action') {
      return { code: 'arazzo-async-action-required', path: [...path, 'action'], message: 'An AsyncAPI step must declare "action" (send or receive)' };
    }
  }
  if (parentKind === 'step' && last === 'action') {
    if (kw === 'enum') return { code: 'arazzo-async-action-enum', path, message: `Invalid action ${JSON.stringify(value)}: expected "send" or "receive"` };
    if (kw === 'const') {
      return { code: 'arazzo-async-correlation-receive-only', path: [...parent, 'correlationId'], message: '"correlationId" is only allowed with action: receive' };
    }
  }
  if (parentKind === 'step' && last === 'timeout') {
    return { code: 'arazzo-step-timeout-positive', path, message: '"timeout" must be an integer number of milliseconds', severity: 'error' };
  }
  if ((parentKind === 'step' && last === 'dependsOn') || kind === 'stepDependsOn' || parentKind === 'stepDependsOn') {
    const what =
      kw === 'minItems'
        ? 'dependsOn must contain at least one entry'
        : kw === 'uniqueItems'
          ? 'dependsOn must not contain duplicates'
          : `Invalid dependsOn entry ${JSON.stringify(value)}: expected a stepId, "$workflows.<workflowId>.steps.<stepId>" or "$sourceDescriptions.<name>.<workflowId>.steps.<stepId>"`;
    return { code: 'arazzo-step-depends-on-shape', path, message: what };
  }

  // ── Source descriptions
  if (parentKind === 'source' && last === 'type' && kw === 'enum') {
    return {
      code: 'arazzo-source-type-enum',
      path,
      message: `Source type must be one of ${asArray(p.allowedValues).map((v) => `"${v}"`).join(', ')}, got ${JSON.stringify(value)}`,
    };
  }
  if (parentKind === 'source' && last === 'name' && kw === 'pattern') {
    return { code: 'arazzo-source-name-pattern', path, message: `Source name ${JSON.stringify(value)} must match [A-Za-z0-9_-]+` };
  }

  // ── Parameters
  if ((kind === 'param' || kind === 'actionParam') && kw === 'required' && p.missingProperty === 'in') {
    const name = isObj(value) ? value.name : undefined;
    return { code: 'arazzo-param-in-required', path: [...path, 'in'], message: `Parameter ${name !== undefined ? `"${name}" ` : ''}must declare "in" when the step targets an operation` };
  }
  if ((parentKind === 'param' || parentKind === 'actionParam') && last === 'in' && kw === 'enum') {
    return {
      code: 'arazzo-param-in-enum',
      path,
      message: `Invalid parameter location ${JSON.stringify(value)}: expected ${asArray(p.allowedValues).join(', ')}`,
    };
  }

  // ── Expression Type Objects
  if (kind === 'eto' || parentKind === 'eto') {
    const eto = valueAt(doc, kind === 'eto' ? path : parent);
    const t = isObj(eto) ? eto.type : undefined;
    const target = kw === 'required' ? [...path, String(p.missingProperty)] : path;
    return {
      code: 'arazzo-eto-version',
      path: target,
      message:
        kw === 'required'
          ? `Expression Type Object: missing required field "${p.missingProperty}"`
          : `Invalid Expression Type Object ${JSON.stringify(eto)}: ${t === 'jsonpath' ? 'jsonpath versions are rfc9535, draft-goessner-dispatch-jsonpath-00' : t === 'xpath' ? 'xpath versions are xpath-31, xpath-30, xpath-20, xpath-10' : t === 'jsonpointer' ? 'jsonpointer version is rfc6901' : 'type must be jsonpath, xpath or jsonpointer'}`,
    };
  }

  // ── Criteria
  if (kind === 'criterion' && kw === 'dependentRequired') {
    return { code: 'arazzo-criterion-context-required', path: [...path, 'context'], message: 'A criterion with a "type" must define "context"' };
  }
  if (parentKind === 'criterion' && last === 'type' && kw === 'enum') {
    return { code: 'arazzo-criterion-type-enum', path, message: `Invalid criterion type ${JSON.stringify(value)}: expected simple, regex, jsonpath, xpath or an Expression Type Object` };
  }
  if (last === 'successCriteria' && kw === 'minItems') {
    return { code: 'arazzo-success-criteria-non-empty', path, message: 'successCriteria, when present, must contain at least one criterion' };
  }

  // ── Actions
  if (kind === 'successAction' || kind === 'failureAction') {
    if (kw === 'required' && sp.includes('/then/oneOf')) {
      return { code: 'arazzo-action-goto-target', path, message: 'A goto action must define exactly one of "stepId" or "workflowId"' };
    }
    if (kw === 'required' && p.missingProperty === 'workflowId' && /\/then\/required$/.test(sp)) {
      return { code: 'arazzo-action-parameters-require-workflow', path: [...path, 'parameters'], message: 'Action "parameters" are only allowed with "workflowId"' };
    }
  }
  if ((parentKind === 'successAction' || parentKind === 'failureAction') && (last === 'retryAfter' || last === 'retryLimit')) {
    return {
      code: 'arazzo-action-retry-values',
      path,
      message: last === 'retryAfter' ? '"retryAfter" must be a number of seconds ≥ 0' : '"retryLimit" must be an integer ≥ 0',
    };
  }
  if ((parentKind === 'successAction' || parentKind === 'failureAction') && last === 'type' && kw === 'enum') {
    return { code: 'arazzo-schema', path, message: `Invalid action type ${JSON.stringify(value)}: expected ${asArray(p.allowedValues).join(', ')}` };
  }

  // ── Generic shapes
  if (kw === 'uniqueItems' && typeof last === 'string' && ACTION_LIST_SEGMENTS.has(last)) return null; // parameter-unique / action-name-unique
  if (kw === 'required') return { code: 'arazzo-schema', path: [...path, String(p.missingProperty)], message: `Missing required field: ${p.missingProperty}` };
  if (kw === 'minItems') return fallback(`${last !== undefined ? String(last) : 'list'} must have at least one entry`);
  if (kw === 'uniqueItems') return fallback(`${label(path)} must not contain duplicate items`);
  if (kw === 'type') {
    if (kind === 'output') return fallback(`Output "${String(last)}" must be a runtime expression (string)${minor === '1.1' ? ' or a Selector Object' : ''}`);
    const t = Array.isArray(p.type) ? p.type.join(' or ') : String(p.type);
    if (t === 'array') return fallback(`${last !== undefined ? String(last) : 'value'} must be an array`);
    return fallback(`${label(path)} must be ${t === 'object' || t === 'integer' || t === 'array' ? `an ${t}` : `a ${t}`}`);
  }
  if (kw === 'enum') return fallback(`${label(path)} must be one of ${asArray(p.allowedValues).map((v) => JSON.stringify(v)).join(', ')}`);
  if (kw === 'pattern') return fallback(`${label(path)} ${JSON.stringify(value)} must match ${p.pattern}`);
  return fallback();
}

export interface SchemaLayerOptions {
  /** Paths whose schema errors are replaced by another diagnostic (e.g. `arazzo-version-feature-mismatch`). */
  suppressed?: (path: JsonPath) => boolean;
}

/** Validate `doc` against the official schema of `minor` and translate the errors. */
export function schemaDiagnostics(doc: unknown, minor: ArazzoMinor, opts: SchemaLayerOptions = {}): Diagnostic[] {
  const validator = minor === '1.0' ? validate10 : validate11;
  const out: Diagnostic[] = [];
  if (validator(doc)) return out;
  const report = createSink('schema', out);
  for (const err of validator.errors ?? []) {
    const t = translate(err, doc, minor);
    if (!t) continue;
    if (opts.suppressed?.(t.path)) continue;
    report(t.code, t.path, t.message, t.severity);
  }
  return out;
}
