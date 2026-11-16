import type { JsonPath, SourceRange } from '../parse.js';
import type { RuleId, Severity } from './rules.js';
import { RULES } from './rules.js';

export type { Severity };

export interface Diagnostic {
  /** Rule id (see {@link RULES}). */
  code: RuleId;
  message: string;
  severity: Severity;
  /** JSON path of the offending value (may point to a missing property). */
  path: JsonPath;
  /** Source range, when a `yamlDoc` was given to `validate`. */
  range?: SourceRange;
  /** Layer that produced the diagnostic. */
  source: 'schema' | 'semantic';
}

export type Report = (code: RuleId, path: JsonPath, message: string, severity?: Severity) => void;

/** Diagnostic sink with the default severity of each rule. */
export function createSink(source: Diagnostic['source'], out: Diagnostic[]): Report {
  return (code, path, message, severity) => {
    out.push({ code, message, severity: severity ?? RULES[code].severity, path: [...path], source });
  };
}

export const pathKey = (code: string, path: JsonPath): string => `${code}\u0000${path.map(String).join('\u0001')}`;

/** True when `path` equals or is below `prefix`. */
export function isUnder(path: JsonPath, prefix: JsonPath): boolean {
  if (path.length < prefix.length) return false;
  return prefix.every((seg, i) => String(seg) === String(path[i]));
}
