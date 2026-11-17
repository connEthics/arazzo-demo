/**
 * Arazzo parsing and validation for the Studio — thin layer over @connethics/arazzo-core
 * (vendored, see docs/SHARED_PACKAGES.md). Core parses YAML/JSON with the `yaml` v2 package,
 * validates against the official JSON Schemas (1.0 / 1.1) plus the semantic rules, and returns
 * diagnostics with a rule code, a JSON path and a severity.
 */
import {
  parseArazzo,
  validate,
  validateText,
  createLineIndex,
  type Diagnostic,
  type Severity,
  type JsonPath,
} from '@connethics/arazzo-core';
import type { ArazzoSpec } from '@/types/arazzo';

export type { Diagnostic, Severity, JsonPath };

// ═══════════════════════════════════════════════════════════════════════════════
// Parsing
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Parses an Arazzo document (YAML or JSON) and checks the root shape needed by the Studio.
 * Throws on YAML syntax errors and when `arazzo`, `info` or `workflows` is missing.
 * Use {@link parseAndValidate} to get the full list of diagnostics instead.
 */
export function parseArazzoSpec(input: string): ArazzoSpec {
  const { doc, errors } = parseArazzo(input);
  const fatal = errors.filter((e) => e.severity === 'error');
  if (fatal.length > 0) {
    throw new Error(`Invalid YAML: ${fatal[0].message}`);
  }
  const spec = doc as ArazzoSpec | undefined;
  if (!spec || typeof spec !== 'object') {
    throw new Error('Missing required field: arazzo (version)');
  }
  if (!spec.arazzo) {
    throw new Error('Missing required field: arazzo (version)');
  }
  if (!spec.workflows || !Array.isArray(spec.workflows) || spec.workflows.length === 0) {
    throw new Error('Missing or empty required field: workflows');
  }
  if (!spec.info) {
    throw new Error('Missing required field: info');
  }
  return spec;
}

export interface LocatedDiagnostic extends Diagnostic {
  /** 1-based line / column of the diagnostic in the source text, when known. */
  line?: number;
  column?: number;
  endLine?: number;
  endColumn?: number;
}

export interface ParseAndValidateResult {
  spec: ArazzoSpec | undefined;
  version: string | null;
  isArazzo: boolean;
  /** YAML syntax errors (as diagnostics with code `yaml-syntax`) followed by the validation diagnostics. */
  diagnostics: LocatedDiagnostic[];
}

/** Parses and validates a document; diagnostics carry 1-based line / column positions. */
export function parseAndValidate(input: string): ParseAndValidateResult {
  const result = validateText(input);
  const lineOf = createLineIndex(input);
  const place = (range?: { start: number; end: number }) => {
    if (!range) return {};
    const s = lineOf(range.start);
    const e = lineOf(range.end);
    return { line: s.line + 1, column: s.character + 1, endLine: e.line + 1, endColumn: e.character + 1 };
  };
  const syntax: LocatedDiagnostic[] = result.errors.map((err) => ({
    code: 'arazzo-yaml-syntax' as Diagnostic['code'],
    message: err.message,
    severity: err.severity,
    path: [],
    source: 'schema',
    range: err.range,
    ...place(err.range),
  }));
  return {
    spec: result.doc as ArazzoSpec | undefined,
    version: result.version,
    isArazzo: result.isArazzo,
    diagnostics: [...syntax, ...result.diagnostics.map((d) => ({ ...d, ...place(d.range) }))],
  };
}

/** Validates an in-memory spec (builder state): diagnostics carry JSON paths, no positions. */
export function validateSpec(spec: ArazzoSpec): Diagnostic[] {
  return validate(spec);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Diagnostics helpers
// ═══════════════════════════════════════════════════════════════════════════════

const SEVERITY_ORDER: Record<Severity, number> = { error: 0, warning: 1, info: 2, hint: 3 };

export function sortDiagnostics<T extends Diagnostic>(diagnostics: T[]): T[] {
  return [...diagnostics].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}

export function countBySeverity(diagnostics: Diagnostic[]): Record<Severity, number> {
  const counts: Record<Severity, number> = { error: 0, warning: 0, info: 0, hint: 0 };
  for (const d of diagnostics) counts[d.severity]++;
  return counts;
}

/** Workflow / step targeted by a diagnostic path (`['workflows', 0, 'steps', 2, …]`). */
export function diagnosticTarget(
  spec: ArazzoSpec,
  path: JsonPath,
): { workflowIndex: number; stepId?: string } | null {
  if (path[0] !== 'workflows' || typeof path[1] !== 'number') return null;
  const workflowIndex = path[1];
  const workflow = spec.workflows?.[workflowIndex];
  if (!workflow) return null;
  if (path[2] === 'steps' && typeof path[3] === 'number') {
    const step = workflow.steps?.[path[3]];
    return step ? { workflowIndex, stepId: step.stepId } : { workflowIndex };
  }
  return { workflowIndex };
}

/** `workflows[0].steps[2].operationId` */
export function formatPath(path: JsonPath): string {
  return path.reduce<string>((acc, seg) => (typeof seg === 'number' ? `${acc}[${seg}]` : acc ? `${acc}.${seg}` : String(seg)), '');
}

// ═══════════════════════════════════════════════════════════════════════════════
// Runtime expressions
// ═══════════════════════════════════════════════════════════════════════════════

export type ExpressionSource =
  | { type: 'inputs'; source: string }
  | { type: 'steps'; source: string; field: string }
  | { type: 'url' }
  | { type: 'method' }
  | { type: 'statusCode' }
  | { type: 'request'; part: 'header' | 'query' | 'path' | 'body'; name?: string }
  | { type: 'response'; part: 'header' | 'body'; name?: string }
  | { type: 'message'; part: 'header' | 'payload'; name?: string }
  | { type: 'self' }
  | { type: 'components'; category: string; name: string };

/** Identifies the data source of a runtime expression (used for data-flow links in the UI). */
export function extractExpressionSource(expr: string): ExpressionSource | null {
  if (expr === '$url') return { type: 'url' };
  if (expr === '$method') return { type: 'method' };
  if (expr === '$statusCode') return { type: 'statusCode' };
  // 1.1: `$self` (document URI)
  if (expr === '$self') return { type: 'self' };

  const inputMatch = expr.match(/\$inputs\.([\w-]+)/);
  if (inputMatch) return { type: 'inputs', source: inputMatch[1] };

  const stepMatch = expr.match(/\$steps\.([\w-]+)\.outputs\.([\w-]+)/);
  if (stepMatch) return { type: 'steps', source: stepMatch[1], field: stepMatch[2] };

  if (expr === '$request.body') return { type: 'request', part: 'body' };
  const requestMatch = expr.match(/\$request\.(header|query|path)\.([\w-]+)/);
  if (requestMatch) {
    return { type: 'request', part: requestMatch[1] as 'header' | 'query' | 'path', name: requestMatch[2] };
  }

  if (expr === '$response.body') return { type: 'response', part: 'body' };
  const responseMatch = expr.match(/\$response\.header\.([\w-]+)/);
  if (responseMatch) return { type: 'response', part: 'header', name: responseMatch[1] };

  // 1.1: AsyncAPI message (`$message.payload`, `$message.header.<name>`)
  if (expr === '$message.payload' || expr.startsWith('$message.payload#')) return { type: 'message', part: 'payload' };
  const messageMatch = expr.match(/\$message\.header\.([\w-]+)/);
  if (messageMatch) return { type: 'message', part: 'header', name: messageMatch[1] };

  const componentMatch = expr.match(/\$components\.(inputs|parameters|successActions|failureActions)\.([\w-]+)/);
  if (componentMatch) return { type: 'components', category: componentMatch[1], name: componentMatch[2] };

  return null;
}
