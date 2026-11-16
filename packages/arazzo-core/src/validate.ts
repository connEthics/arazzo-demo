import type { Document } from 'yaml';
import { diagnosticRange, parseArazzo } from './parse.js';
import type { JsonPath, ParseResult } from './parse.js';
import { isObj } from './model.js';
import { getArazzoMinor, getSupportedMinor } from './version.js';
import type { ArazzoMinor } from './version.js';
import { createSink, isUnder, pathKey } from './validation/diagnostic.js';
import type { Diagnostic, Severity } from './validation/diagnostic.js';
import { schemaDiagnostics } from './validation/schema-layer.js';
import { detect11Features, semanticDiagnostics } from './validation/semantic.js';

export type { Diagnostic, Severity };

export interface ValidateOptions {
  /** The `yaml` Document returned by {@link parseArazzo}: diagnostics then get a `range`. */
  yamlDoc?: Document;
  /** Skip the JSON Schema layer. */
  skipSchema?: boolean;
  /** Skip the semantic layer. */
  skipSemantic?: boolean;
  /** Drop diagnostics below this severity (default: keep all, including `info`). */
  minSeverity?: Severity;
  /** Re-throw internal errors of semantic rules (tests). */
  debug?: boolean;
}

const SEVERITY_RANK: Record<Severity, number> = { error: 0, warning: 1, info: 2, hint: 3 };

/** Diagnostics whose range should cover the key rather than the value. */
const KEY_RANGE_CODES = new Set<string>(['arazzo-unknown-field', 'arazzo-extension-reserved-prefix', 'arazzo-reusable-no-extension', 'arazzo-key-pattern']);

/** Pick the schema for the `arazzo` field; `null` when no schema applies. */
function selectMinor(doc: Record<string, unknown>, report: ReturnType<typeof createSink>): ArazzoMinor | null {
  const raw = doc.arazzo;
  if (raw === undefined || raw === null) return '1.1'; // the schema reports the missing field
  const version = String(raw);
  const supported = getSupportedMinor(version);
  if (supported) return supported;
  if (getArazzoMinor(version)) {
    report('arazzo-version', ['arazzo'], `Unrecognized Arazzo version: ${version}. Known versions: 1.0.x, 1.1.x (only semantic rules are applied)`);
    return null;
  }
  // Malformed version ("1.1", 1.1 as a number…): use the schema of its major.minor prefix, which reports the format.
  const prefix = /^(\d+)\.(\d+)/.exec(version);
  const minor = prefix ? `${prefix[1]}.${prefix[2]}` : null;
  if (minor === '1.0' || minor === '1.1') return minor;
  report('arazzo-version-format', ['arazzo'], `Invalid arazzo version ${JSON.stringify(raw)}: expected a "major.minor.patch" string such as "1.1.0"`);
  return null;
}

/**
 * Validate an Arazzo document (plain JS value, e.g. `parseArazzo(text).doc`).
 *
 * - Layer (a): official JSON Schema 1.0 or 1.1 (selected by `arazzo`).
 * - Layer (b): semantic rules (references, uniqueness, AsyncAPI, dependsOn…).
 *
 * The result never contains two diagnostics with the same `code` and `path`.
 */
export function validate(doc: unknown, opts: ValidateOptions = {}): Diagnostic[] {
  const raw: Diagnostic[] = [];
  if (!isObj(doc)) {
    raw.push({ code: 'arazzo-schema', message: 'An Arazzo document must be a mapping (object)', severity: 'error', path: [], source: 'schema' });
    return finalize(raw, opts);
  }
  const semanticReport = createSink('semantic', raw);
  const minor = selectMinor(doc, semanticReport);
  // Effective feature set: unknown versions are checked with the latest semantics.
  const semanticMinor: ArazzoMinor | null = minor;

  if (!opts.skipSchema && minor) {
    let suppressed: ((p: JsonPath) => boolean) | undefined;
    if (minor === '1.0') {
      const features = detect11Features(doc).map((f) => f.path);
      suppressed = (p) => features.some((f) => isUnder(p, f));
    }
    raw.push(...schemaDiagnostics(doc, minor, { suppressed }));
  }
  if (!opts.skipSemantic) semanticDiagnostics(doc, semanticMinor, semanticReport, { debug: opts.debug });
  return finalize(raw, opts);
}

function finalize(raw: Diagnostic[], opts: ValidateOptions): Diagnostic[] {
  const seen = new Set<string>();
  const out: Diagnostic[] = [];
  const max = opts.minSeverity ? SEVERITY_RANK[opts.minSeverity] : Infinity;
  for (const d of raw) {
    const key = pathKey(d.code, d.path);
    if (seen.has(key)) continue;
    seen.add(key);
    if (SEVERITY_RANK[d.severity] > max) continue;
    if (opts.yamlDoc) {
      const range = diagnosticRange(opts.yamlDoc, d.path, KEY_RANGE_CODES.has(d.code));
      if (range) d.range = range;
    }
    out.push(d);
  }
  if (opts.yamlDoc) {
    // Stable sort by position.
    return out
      .map((d, i) => ({ d, i }))
      .sort((a, b) => (a.d.range?.start ?? 0) - (b.d.range?.start ?? 0) || a.i - b.i)
      .map((x) => x.d);
  }
  return out;
}

export interface TextValidationResult extends ParseResult {
  diagnostics: Diagnostic[];
}

/** Parse + validate in one call (YAML syntax errors stay in `errors`). */
export function validateText(text: string, opts: Omit<ValidateOptions, 'yamlDoc'> = {}): TextValidationResult {
  const parsed = parseArazzo(text);
  const diagnostics = parsed.doc === undefined ? [] : validate(parsed.doc, { ...opts, yamlDoc: parsed.yamlDoc });
  return { ...parsed, diagnostics };
}
