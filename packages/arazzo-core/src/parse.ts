import { parseDocument, isMap, isSeq, isScalar, isPair, isCollection } from 'yaml';
import type { Document, Node as YamlNode, Pair } from 'yaml';
import type { ArazzoDocument } from './types.js';
import { getArazzoVersion, isArazzoDocument } from './version.js';

/** A path inside the document, e.g. `['workflows', 0, 'steps', 2, 'operationId']`. */
export type JsonPath = (string | number)[];

/** Character offsets (0-based, end exclusive) in the source text. */
export interface SourceRange {
  start: number;
  end: number;
}

export interface LocatedRange extends SourceRange {
  /** False when the path does not exist and the range of its nearest existing ancestor is returned. */
  exact: boolean;
  /** Range of the mapping key when the target is the value of a mapping entry. */
  key?: SourceRange;
  /** Range of the value node (absent for `key:` without value). */
  value?: SourceRange;
}

export interface ParseError {
  code: 'yaml-syntax' | 'yaml-warning';
  message: string;
  severity: 'error' | 'warning';
  range: SourceRange;
}

export interface ParseResult {
  /** Plain JS value of the document (`undefined` when the YAML is empty or unusable). */
  doc: ArazzoDocument | undefined;
  /** The `yaml` v2 Document, kept to map JSON paths back to source ranges ({@link locate}). */
  yamlDoc: Document.Parsed;
  /** YAML syntax errors and warnings. */
  errors: ParseError[];
  /** Value of the `arazzo` field, or `null`. */
  version: string | null;
  /** True when the root is a mapping with an `arazzo` key. */
  isArazzo: boolean;
}

/**
 * Parse an Arazzo document (YAML or JSON). Never throws: syntax problems are
 * returned in `errors` and `doc` is whatever could be recovered.
 */
export function parseArazzo(text: string): ParseResult {
  const yamlDoc = parseDocument(text, { prettyErrors: false, uniqueKeys: true, keepSourceTokens: false });
  const errors: ParseError[] = [];
  for (const e of yamlDoc.errors) {
    errors.push({ code: 'yaml-syntax', message: e.message, severity: 'error', range: { start: e.pos[0], end: e.pos[1] } });
  }
  for (const w of yamlDoc.warnings) {
    errors.push({ code: 'yaml-warning', message: w.message, severity: 'warning', range: { start: w.pos[0], end: w.pos[1] } });
  }
  let doc: unknown;
  try {
    doc = yamlDoc.toJS({ maxAliasCount: 10_000 });
  } catch (e) {
    errors.push({
      code: 'yaml-syntax',
      message: e instanceof Error ? e.message : String(e),
      severity: 'error',
      range: { start: 0, end: Math.min(text.length, 1) },
    });
    doc = undefined;
  }
  if (doc === null) doc = undefined;
  return {
    doc: doc as ArazzoDocument | undefined,
    yamlDoc,
    errors,
    version: getArazzoVersion(doc),
    isArazzo: isArazzoDocument(doc),
  };
}

const nodeRange = (n: unknown): SourceRange | undefined => {
  const r = (n as { range?: [number, number, number] } | null | undefined)?.range;
  return r ? { start: r[0], end: r[1] } : undefined;
};

function findPair(map: YamlNode, key: string | number): Pair | undefined {
  if (!isMap(map)) return undefined;
  for (const item of map.items) {
    if (!isPair(item)) continue;
    const k = isScalar(item.key) ? item.key.value : item.key;
    if (k !== null && k !== undefined && String(k) === String(key)) return item;
  }
  return undefined;
}

interface WalkResult {
  node: unknown;
  pair: Pair | undefined;
  exact: boolean;
}

function walk(yamlDoc: Document, path: JsonPath): WalkResult {
  let node: unknown = yamlDoc.contents;
  let pair: Pair | undefined;
  let exact = true;
  for (let i = 0; i < path.length; i++) {
    const seg = path[i]!;
    let next: unknown;
    let nextPair: Pair | undefined;
    if (isMap(node)) {
      nextPair = findPair(node, seg);
      if (!nextPair) {
        exact = false;
        break;
      }
      next = nextPair.value;
    } else if (isSeq(node) && typeof seg === 'number' && seg >= 0 && seg < node.items.length) {
      next = node.items[seg];
    } else {
      exact = false;
      break;
    }
    if (next === null || next === undefined) {
      // `key:` without value: the remaining segments cannot exist.
      pair = nextPair;
      node = next;
      if (i < path.length - 1) exact = false;
      break;
    }
    pair = nextPair;
    node = next;
  }
  return { node, pair, exact };
}

/**
 * Map a JSON path to a source range. When the path does not exist (e.g. a
 * missing required field) the range of its nearest existing ancestor is
 * returned with `exact: false` — preferably its key (`info:`), so editors
 * underline a short span.
 */
export function locate(yamlDoc: Document, path: JsonPath): LocatedRange | undefined {
  if (!yamlDoc.contents) return undefined;
  const { node, pair, exact } = walk(yamlDoc, path);
  const key = pair ? nodeRange(pair.key) : undefined;
  const value = nodeRange(node);
  const main = exact ? value ?? key : key ?? value;
  if (!main) return { start: 0, end: 0, exact: false };
  return { start: main.start, end: main.end, exact, key, value };
}

/** Range of the first entry (`key: value`) of a mapping. */
function firstEntryRange(node: unknown): SourceRange | undefined {
  if (!isMap(node)) return undefined;
  const first = node.items[0];
  if (!first || !isPair(first)) return undefined;
  const k = nodeRange(first.key);
  const v = nodeRange(first.value);
  return k ? { start: k.start, end: isCollection(first.value) ? k.end : v?.end ?? k.end } : undefined;
}

/**
 * Compact range for a diagnostic: the key of a mapping entry for collections
 * and missing fields, the value for scalars, and the first entry of mapping
 * items of a sequence (`- stepId: foo` rather than the whole step).
 */
export function diagnosticRange(yamlDoc: Document, path: JsonPath, preferKey = false): SourceRange | undefined {
  if (!yamlDoc.contents) return undefined;
  const { node, pair, exact } = walk(yamlDoc, path);
  const key = pair ? nodeRange(pair.key) : undefined;
  if (key && (!exact || preferKey || isCollection(node))) return key;
  if (!exact || isCollection(node)) return firstEntryRange(node) ?? nodeRange(node) ?? key;
  return nodeRange(node) ?? key;
}

/** Line/column helper (0-based) for consumers that do not have an editor API. */
export function createLineIndex(text: string): (offset: number) => { line: number; character: number } {
  const starts = [0];
  for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) === 10) starts.push(i + 1);
  return (offset: number) => {
    let lo = 0;
    let hi = starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (starts[mid]! <= offset) lo = mid;
      else hi = mid - 1;
    }
    return { line: lo, character: offset - starts[lo]! };
  };
}

/** Convert a JSON Pointer (`/workflows/0/steps`) to a path, using `doc` to type array indexes. */
export function pointerToPath(pointer: string, doc?: unknown): JsonPath {
  if (pointer === '' || pointer === '#') return [];
  const segs = pointer.replace(/^#/, '').split('/').slice(1).map((s) => s.replace(/~1/g, '/').replace(/~0/g, '~'));
  const out: JsonPath = [];
  let cur: unknown = doc;
  for (const s of segs) {
    if (Array.isArray(cur) && /^\d+$/.test(s)) {
      out.push(Number(s));
      cur = cur[Number(s)];
    } else if (cur === undefined && /^\d+$/.test(s)) {
      out.push(Number(s));
    } else {
      out.push(s);
      cur = cur && typeof cur === 'object' ? (cur as Record<string, unknown>)[s] : undefined;
    }
  }
  return out;
}

/** Convert a path to a JSON Pointer. */
export function pathToPointer(path: JsonPath): string {
  return path.map((s) => '/' + String(s).replace(/~/g, '~0').replace(/\//g, '~1')).join('');
}
