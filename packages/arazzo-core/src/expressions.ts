// ═══════════════════════════════════════════════════════════════════════════════
// Runtime expressions (§ 5.9), embedded expressions, and syntax checkers for
// JSONPath (RFC 9535), JSON Pointer (RFC 6901), XPath (lenient), regex and
// "simple" criterion conditions (§ 5.8.11.1).
// ═══════════════════════════════════════════════════════════════════════════════

export type ExpressionRoot =
  | 'url'
  | 'method'
  | 'statusCode'
  | 'request'
  | 'response'
  | 'message'
  | 'inputs'
  | 'outputs'
  | 'steps'
  | 'workflows'
  | 'sourceDescriptions'
  | 'components'
  | 'self';

export const EXPRESSION_ROOTS: readonly ExpressionRoot[] = [
  'url',
  'method',
  'statusCode',
  'request',
  'response',
  'message',
  'inputs',
  'outputs',
  'steps',
  'workflows',
  'sourceDescriptions',
  'components',
  'self',
];

export interface ParsedExpression {
  /** The expression text (without surrounding `{}`). */
  raw: string;
  root: ExpressionRoot;
  /** `$request.header.X` → `header`; `$response.body` → `body`… */
  source?: 'header' | 'query' | 'path' | 'body' | 'payload';
  /** Header / query / path parameter name. */
  name?: string;
  /** `$steps.<stepId>`, `$workflows.<workflowId>`, `$sourceDescriptions.<name>`. */
  id?: string;
  /** `$steps.x.outputs.<field>`, `$workflows.x.inputs.<field>`, `$inputs.<field>`, `$outputs.<field>`, `$components.parameters.<field>`… */
  field?: string;
  /** `inputs` / `outputs` for `$workflows`; `parameters` / `successActions` / `failureActions` for `$components`. */
  section?: string;
  /** `$sourceDescriptions.<name>.<reference>`. */
  reference?: string;
  /** JSON Pointer after `#`. */
  pointer?: string;
}

export interface ExpressionProblem {
  message: string;
  severity: 'error' | 'warning';
}

export type ExpressionParseResult =
  | { ok: true; expression: ParsedExpression; warning?: ExpressionProblem }
  | { ok: false; problem: ExpressionProblem };

const IDENT_STRICT = '[A-Za-z0-9_\\-]+';
const IDENT = '[A-Za-z0-9_.\\-]+';
const TOKEN = "[!#$%&'*+\\-.^_`|~0-9A-Za-z]+";
const PTR = '(?:/(?:[^/~{}]|~[01])*)*';

const RE = {
  simple: /^\$(url|method|statusCode|self)$/,
  reqres: new RegExp(`^\\$(request|response|message)\\.(header\\.(${TOKEN})|(query|path)\\.([^\\s#{}]+)|(body|payload)(?:#(${PTR}))?)$`),
  reqresLoose: /^\$(request|response|message)\.(body|payload)((?:\.|\[)[^\s{}]*)$/,
  inputs: new RegExp(`^\\$(inputs|outputs)\\.(${IDENT})(?:#(${PTR}))?$`),
  steps: new RegExp(`^\\$steps\\.(${IDENT_STRICT})\\.outputs\\.(${IDENT})(?:#(${PTR}))?$`),
  workflows: new RegExp(`^\\$workflows\\.(${IDENT_STRICT})\\.(inputs|outputs)\\.(${IDENT})(?:#(${PTR}))?$`),
  sources: new RegExp(`^\\$sourceDescriptions\\.(${IDENT_STRICT})\\.(${IDENT})$`),
  components: new RegExp(`^\\$components\\.(parameters|successActions|failureActions|inputs)\\.(${IDENT})$`),
};

/** Leading `$root` of a candidate expression. */
function rootOf(expr: string): string | undefined {
  return /^\$([A-Za-z]+)/.exec(expr)?.[1];
}

/**
 * Parse a runtime expression against the 1.1 ABNF (§ 5.9), which is a
 * superset of the 1.0 grammar except for `$message` and `$self` (reported by
 * the caller as version mismatch for 1.0 documents).
 *
 * Common but non-ABNF forms such as `$response.body.items[0].id` are accepted
 * with a warning suggesting the JSON Pointer form (`$response.body#/items/0/id`).
 */
export function parseRuntimeExpression(expr: string): ExpressionParseResult {
  const bad = (message: string): ExpressionParseResult => ({ ok: false, problem: { message, severity: 'error' } });
  if (!expr.startsWith('$')) return bad(`"${expr}" is not a runtime expression (must start with "$")`);
  const root = rootOf(expr);
  if (!root || !(EXPRESSION_ROOTS as readonly string[]).includes(root)) {
    return bad(
      `Unknown runtime expression root "$${root ?? ''}" in "${expr}". Expected one of ${EXPRESSION_ROOTS.map((r) => '$' + r).join(', ')}`,
    );
  }
  let m: RegExpExecArray | null;
  if ((m = RE.simple.exec(expr))) return { ok: true, expression: { raw: expr, root: m[1] as ExpressionRoot } };
  if (root === 'request' || root === 'response' || root === 'message') {
    if ((m = RE.reqres.exec(expr))) {
      const e: ParsedExpression = { raw: expr, root };
      if (m[3] !== undefined) {
        e.source = 'header';
        e.name = m[3];
      } else if (m[4] !== undefined) {
        e.source = m[4] as 'query' | 'path';
        e.name = m[5];
      } else {
        e.source = m[6] as 'body' | 'payload';
        if (m[7] !== undefined) e.pointer = m[7];
      }
      return { ok: true, expression: e };
    }
    if ((m = RE.reqresLoose.exec(expr))) {
      const pointer = dottedToPointer(m[3]!);
      return {
        ok: true,
        expression: { raw: expr, root, source: m[2] as 'body' | 'payload' },
        warning: {
          severity: 'warning',
          message: `"${expr}" is not valid runtime expression syntax: use a JSON Pointer after "#"${pointer ? ` (e.g. "$${root}.${m[2]}#${pointer}")` : ''}`,
        },
      };
    }
    return bad(
      `Invalid runtime expression "${expr}": expected $${root}.header.<name>, $${root}.query.<name>, $${root}.path.<name>, $${root}.body[#/pointer]${root === 'message' ? ' or $message.payload[#/pointer]' : ''}`,
    );
  }
  if (root === 'inputs' || root === 'outputs') {
    if ((m = RE.inputs.exec(expr))) {
      const e: ParsedExpression = { raw: expr, root, field: m[2] };
      if (m[3] !== undefined) e.pointer = m[3];
      return { ok: true, expression: e };
    }
    return bad(`Invalid runtime expression "${expr}": expected $${root}.<name>[#/pointer]`);
  }
  if (root === 'steps') {
    if ((m = RE.steps.exec(expr))) {
      const e: ParsedExpression = { raw: expr, root, id: m[1], field: m[2] };
      if (m[3] !== undefined) e.pointer = m[3];
      return { ok: true, expression: e };
    }
    return bad(`Invalid runtime expression "${expr}": expected $steps.<stepId>.outputs.<name>[#/pointer] (stepId: [A-Za-z0-9_-]+)`);
  }
  if (root === 'workflows') {
    if ((m = RE.workflows.exec(expr))) {
      const e: ParsedExpression = { raw: expr, root, id: m[1], section: m[2], field: m[3] };
      if (m[4] !== undefined) e.pointer = m[4];
      return { ok: true, expression: e };
    }
    return bad(`Invalid runtime expression "${expr}": expected $workflows.<workflowId>.(inputs|outputs).<name>[#/pointer]`);
  }
  if (root === 'sourceDescriptions') {
    if ((m = RE.sources.exec(expr))) return { ok: true, expression: { raw: expr, root, id: m[1], reference: m[2] } };
    return bad(`Invalid runtime expression "${expr}": expected $sourceDescriptions.<name>.<reference>`);
  }
  if (root === 'components') {
    if ((m = RE.components.exec(expr))) return { ok: true, expression: { raw: expr, root, section: m[1], field: m[2] } };
    return bad(`Invalid runtime expression "${expr}": expected $components.(parameters|successActions|failureActions).<name>`);
  }
  return bad(`Invalid runtime expression "${expr}"`);
}

/** `.items[0].id` → `/items/0/id` (best effort, for suggestions). */
function dottedToPointer(tail: string): string {
  const parts: string[] = [];
  const re = /\.([^.[\]]+)|\[(\d+)\]|\['([^']*)'\]|\["([^"]*)"\]/g;
  let m: RegExpExecArray | null;
  let consumed = 0;
  while ((m = re.exec(tail))) {
    if (m.index !== consumed) return '';
    consumed = m.index + m[0].length;
    parts.push((m[1] ?? m[2] ?? m[3] ?? m[4] ?? '').replace(/~/g, '~0').replace(/\//g, '~1'));
  }
  if (consumed !== tail.length) return '';
  return parts.map((p) => '/' + p).join('');
}

export interface EmbeddedExpression {
  expression: string;
  /** Offset of `{` in the host string. */
  start: number;
  /** Offset after `}`. */
  end: number;
}

/** Expressions embedded in a string with `{$…}` (§ 5.9 "expression-string"). */
export function findEmbeddedExpressions(text: string): EmbeddedExpression[] {
  const out: EmbeddedExpression[] = [];
  const re = /\{(\$[^{}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) out.push({ expression: m[1]!.trim(), start: m.index, end: m.index + m[0].length });
  return out;
}

/**
 * All runtime expressions found in a value: the whole string when it starts
 * with `$`, otherwise the `{$…}` embedded ones.
 */
export function expressionsInString(text: string): string[] {
  const t = text.trim();
  if (t.startsWith('$')) return [t];
  return findEmbeddedExpressions(text).map((e) => e.expression);
}

/** Loose scan of `$steps.<id>` occurrences anywhere in a string (dependency analysis). */
export function stepReferencesIn(text: string): string[] {
  const out: string[] = [];
  const re = /\$steps\.([A-Za-z0-9_-]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) out.push(m[1]!);
  return out;
}

const RUNTIME_ROOT_RE = /\$(url|method|statusCode|request|response|message|inputs|outputs|steps|workflows|sourceDescriptions|components|self)\b/;

/** Runtime expressions used outside `{}` in a regex/jsonpath/xpath condition (§ 5.8.11.3). */
export function unembeddedExpressions(condition: string): string[] {
  const stripped = condition.replace(/\{\$[^{}]*\}/g, (s) => ' '.repeat(s.length));
  const out: string[] = [];
  const re = new RegExp(RUNTIME_ROOT_RE.source + '[^\\s()\\]\'"]*', 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(stripped))) out.push(m[0]);
  return out;
}

/** Replace `{$…}` embedded expressions by a neutral placeholder (before syntax checks). */
export function maskEmbedded(text: string, placeholder = '0'): string {
  return text.replace(/\{\$[^{}]*\}/g, placeholder);
}

// ─────────────────────────────────────────────────────────────────────────────
// JSON Pointer (RFC 6901)
// ─────────────────────────────────────────────────────────────────────────────
/** Error message, or `null` when valid. Accepts the URI fragment form (`#/a`). */
export function checkJsonPointer(ptr: string): string | null {
  const p = ptr.startsWith('#') ? safeDecode(ptr.slice(1)) : ptr;
  if (p === null) return `Invalid percent-encoding in JSON Pointer "${ptr}"`;
  if (p === '') return null;
  if (!p.startsWith('/')) return `JSON Pointer "${ptr}" must be empty or start with "/"`;
  if (/~(?![01])/.test(p)) return `Invalid escape in JSON Pointer "${ptr}" (only ~0 and ~1 are allowed)`;
  return null;
}

function safeDecode(s: string): string | null {
  try {
    return decodeURIComponent(s);
  } catch {
    return null;
  }
}

/** Resolve a JSON Pointer in a value (`undefined` when it does not resolve). */
export function resolveJsonPointer(root: unknown, ptr: string): unknown {
  const p = ptr.startsWith('#') ? safeDecode(ptr.slice(1)) ?? '' : ptr;
  if (p === '') return root;
  let cur: unknown = root;
  for (const raw of p.split('/').slice(1)) {
    const seg = raw.replace(/~1/g, '/').replace(/~0/g, '~');
    if (Array.isArray(cur) && /^\d+$/.test(seg)) cur = cur[Number(seg)];
    else if (cur && typeof cur === 'object' && Object.prototype.hasOwnProperty.call(cur, seg)) cur = (cur as Record<string, unknown>)[seg];
    else return undefined;
  }
  return cur;
}

// ─────────────────────────────────────────────────────────────────────────────
// JSONPath (RFC 9535) — recursive-descent syntax checker (no evaluation)
// ─────────────────────────────────────────────────────────────────────────────
class JsonPathChecker {
  private i = 0;
  constructor(private readonly s: string) {}

  check(): string | null {
    try {
      this.query('$');
      this.ws();
      if (this.i < this.s.length) this.fail(`unexpected "${this.s[this.i]}"`);
      return null;
    } catch (e) {
      return (e as Error).message;
    }
  }

  private fail(msg: string): never {
    throw new Error(`Invalid JSONPath (RFC 9535) at position ${this.i}: ${msg}`);
  }
  private peek(n = 0): string | undefined {
    return this.s[this.i + n];
  }
  private eat(str: string): boolean {
    if (this.s.startsWith(str, this.i)) {
      this.i += str.length;
      return true;
    }
    return false;
  }
  private expect(str: string): void {
    if (!this.eat(str)) this.fail(`expected "${str}"`);
  }
  private ws(): void {
    while (this.i < this.s.length && ' \t\n\r'.includes(this.s[this.i]!)) this.i++;
  }

  /** root ("$" or "@") followed by segments. */
  private query(root: '$' | '@'): void {
    this.expect(root);
    this.segments();
  }

  private segments(): void {
    for (;;) {
      const save = this.i;
      this.ws();
      if (this.peek() === '[' || (this.peek() === '.' && this.peek(1) !== '.') || (this.peek() === '.' && this.peek(1) === '.')) {
        this.segment();
      } else {
        this.i = save;
        return;
      }
    }
  }

  private segment(): void {
    if (this.eat('..')) {
      if (this.peek() === '[') this.bracketed();
      else if (this.eat('*')) return;
      else this.memberName();
      return;
    }
    if (this.eat('.')) {
      if (this.eat('*')) return;
      this.memberName();
      return;
    }
    this.bracketed();
  }

  private memberName(): void {
    const c = this.peek();
    if (!c || !(/[A-Za-z_]/.test(c) || c.charCodeAt(0) >= 0x80)) this.fail('expected a member name');
    this.i++;
    while (this.i < this.s.length && (/[A-Za-z0-9_]/.test(this.s[this.i]!) || this.s.charCodeAt(this.i) >= 0x80)) this.i++;
  }

  private bracketed(): void {
    this.expect('[');
    this.ws();
    this.selector();
    this.ws();
    while (this.eat(',')) {
      this.ws();
      this.selector();
      this.ws();
    }
    this.expect(']');
  }

  private selector(): void {
    const c = this.peek();
    if (c === "'" || c === '"') return void this.stringLiteral();
    if (c === '*') return void this.i++;
    if (c === '?') {
      this.i++;
      this.ws();
      this.logicalOr();
      return;
    }
    // index or slice
    const intRe = /^-?(0|[1-9][0-9]*)/;
    const readInt = (): boolean => {
      const m = intRe.exec(this.s.slice(this.i));
      if (!m) return false;
      if (m[0] === '-0') this.fail('"-0" is not a valid integer');
      this.i += m[0].length;
      return true;
    };
    const hadStart = readInt();
    this.ws();
    if (this.peek() === ':') {
      this.i++;
      this.ws();
      readInt();
      this.ws();
      if (this.eat(':')) {
        this.ws();
        readInt();
      }
      return;
    }
    if (!hadStart) this.fail('expected a selector (name, *, index, slice or ?filter)');
  }

  private stringLiteral(): void {
    const q = this.s[this.i]!;
    this.i++;
    while (this.i < this.s.length) {
      const c = this.s[this.i]!;
      if (c === '\\') {
        const n = this.s[this.i + 1];
        if (n === undefined) break;
        if (n === 'u') {
          if (!/^[0-9A-Fa-f]{4}$/.test(this.s.slice(this.i + 2, this.i + 6))) this.fail('invalid \\u escape');
          this.i += 6;
          continue;
        }
        if (!'bfnrt/\\\'"'.includes(n) || (n === "'" && q !== "'") || (n === '"' && q !== '"')) this.fail(`invalid escape "\\${n}"`);
        this.i += 2;
        continue;
      }
      if (c === q) {
        this.i++;
        return;
      }
      if (c.charCodeAt(0) < 0x20) this.fail('control character in string literal');
      this.i++;
    }
    this.fail('unterminated string literal');
  }

  private logicalOr(): void {
    this.logicalAnd();
    for (;;) {
      this.ws();
      if (!this.eat('||')) return;
      this.ws();
      this.logicalAnd();
    }
  }

  private logicalAnd(): void {
    this.basic();
    for (;;) {
      this.ws();
      if (!this.eat('&&')) return;
      this.ws();
      this.basic();
    }
  }

  private basic(): void {
    this.ws();
    if (this.eat('!')) {
      this.ws();
      if (this.eat('(')) {
        this.ws();
        this.logicalOr();
        this.ws();
        this.expect(')');
        return;
      }
      this.testOperand();
      return;
    }
    if (this.eat('(')) {
      this.ws();
      this.logicalOr();
      this.ws();
      this.expect(')');
      this.maybeComparison();
      return;
    }
    this.comparable();
    this.maybeComparison();
  }

  private maybeComparison(): void {
    const save = this.i;
    this.ws();
    const op = /^(==|!=|<=|>=|<|>)/.exec(this.s.slice(this.i));
    if (!op) {
      this.i = save;
      return;
    }
    this.i += op[0].length;
    this.ws();
    this.comparable();
  }

  private testOperand(): void {
    const c = this.peek();
    if (c === '@' || c === '$') return void this.query(c);
    if (c && /[a-z]/.test(c)) return void this.functionExpr();
    this.fail('expected a filter query or a function after "!"');
  }

  private comparable(): void {
    const c = this.peek();
    if (c === undefined) this.fail('unexpected end of expression');
    if (c === '@' || c === '$') return void this.query(c);
    if (c === "'" || c === '"') return void this.stringLiteral();
    const num = /^-?(0|[1-9][0-9]*)(\.[0-9]+)?([eE][-+]?[0-9]+)?/.exec(this.s.slice(this.i));
    if (num && num[0] !== '-') {
      this.i += num[0].length;
      return;
    }
    for (const lit of ['true', 'false', 'null']) {
      if (this.s.startsWith(lit, this.i) && !/[A-Za-z0-9_]/.test(this.s[this.i + lit.length] ?? '')) {
        this.i += lit.length;
        return;
      }
    }
    if (/[a-z]/.test(c)) return void this.functionExpr();
    this.fail(`unexpected "${c}"`);
  }

  private functionExpr(): void {
    const m = /^[a-z][a-z0-9_]*/.exec(this.s.slice(this.i));
    if (!m) this.fail('expected a function name');
    this.i += m[0].length;
    if (this.peek() !== '(') this.fail(`unknown literal or missing "(" after "${m[0]}"`);
    this.i++;
    this.ws();
    if (this.eat(')')) return;
    this.logicalOr();
    this.ws();
    while (this.eat(',')) {
      this.ws();
      this.logicalOr();
      this.ws();
    }
    this.expect(')');
  }
}

/** Error message, or `null` when the JSONPath query is syntactically valid (RFC 9535). */
export function checkJsonPath(query: string): string | null {
  if (!query.startsWith('$')) return `Invalid JSONPath (RFC 9535): "${query}" must start with "$"`;
  return new JsonPathChecker(query).check();
}

/** Lenient check for the Goessner draft: root, balanced brackets and quotes. */
export function checkJsonPathGoessner(query: string): string | null {
  const t = query.trim();
  if (!t.startsWith('$') && !t.startsWith('@')) return `Invalid JSONPath: "${query}" must start with "$" or "@"`;
  return checkBalanced(t, 'JSONPath');
}

/** Lenient XPath check: non-empty, balanced brackets and quotes. */
export function checkXPath(expr: string): string | null {
  if (!expr.trim()) return 'XPath expression is empty';
  return checkBalanced(expr, 'XPath');
}

function checkBalanced(s: string, what: string): string | null {
  const stack: string[] = [];
  const pairs: Record<string, string> = { ')': '(', ']': '[', '}': '{' };
  let quote: string | null = null;
  for (let i = 0; i < s.length; i++) {
    const c = s[i]!;
    if (quote) {
      if (c === quote) quote = null;
      continue;
    }
    if (c === "'" || c === '"') quote = c;
    else if (c === '(' || c === '[' || c === '{') stack.push(c);
    else if (c === ')' || c === ']' || c === '}') {
      if (stack.pop() !== pairs[c]) return `Invalid ${what}: unbalanced "${c}" at position ${i}`;
    }
  }
  if (quote) return `Invalid ${what}: unterminated string literal`;
  if (stack.length) return `Invalid ${what}: unclosed "${stack[stack.length - 1]}"`;
  return null;
}

/** Error message, or `null` when the ECMA-262 regular expression compiles. */
export function checkRegex(pattern: string): string | null {
  try {
    new RegExp(maskEmbedded(pattern, 'x'));
    return null;
  } catch (e) {
    return `Invalid regular expression: ${(e as Error).message}`;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Simple conditions (§ 5.8.11.1)
// ─────────────────────────────────────────────────────────────────────────────
export interface SimpleConditionResult {
  error: string | null;
  /** Runtime expressions found in the condition (for resolution checks). */
  expressions: string[];
}

type Tok = { t: 'expr' | 'lit' | 'op' | 'not' | 'and' | 'or' | 'lp' | 'rp'; v: string; pos: number };

/**
 * Check a `simple` condition: literals (numbers, `'strings'`, true/false/null),
 * runtime expressions (bare or `{…}`), `== != < <= > >=`, `! && ||`, parentheses.
 */
export function checkSimpleCondition(condition: string): SimpleConditionResult {
  const toks: Tok[] = [];
  const expressions: string[] = [];
  const s = condition;
  let i = 0;
  const err = (msg: string): SimpleConditionResult => ({ error: `Invalid simple condition "${condition}": ${msg}`, expressions });
  while (i < s.length) {
    const c = s[i]!;
    if (' \t\r\n'.includes(c)) {
      i++;
      continue;
    }
    const rest = s.slice(i);
    let m: RegExpExecArray | null;
    if (c === '{' && (m = /^\{(\$[^{}]*)\}/.exec(rest))) {
      toks.push({ t: 'expr', v: m[1]!, pos: i });
      expressions.push(m[1]!.trim());
      i += m[0].length;
    } else if (c === '$' && (m = /^\$[A-Za-z][A-Za-z0-9_.\-#/~@]*(?:\[[^\]\s]*\][A-Za-z0-9_.\-#/~@]*)*/.exec(rest))) {
      toks.push({ t: 'expr', v: m[0], pos: i });
      expressions.push(m[0]);
      i += m[0].length;
    } else if (c === "'") {
      let j = i + 1;
      let closed = false;
      while (j < s.length) {
        if (s[j] === "'" && s[j + 1] === "'") j += 2;
        else if (s[j] === '\\' && j + 1 < s.length) j += 2;
        else if (s[j] === "'") {
          closed = true;
          break;
        } else j++;
      }
      if (!closed) return err('unterminated string literal');
      toks.push({ t: 'lit', v: s.slice(i, j + 1), pos: i });
      i = j + 1;
    } else if (c === '"') {
      return err('string literals must use single quotes');
    } else if ((m = /^-?\d+(\.\d+)?([eE][-+]?\d+)?/.exec(rest))) {
      toks.push({ t: 'lit', v: m[0], pos: i });
      i += m[0].length;
    } else if ((m = /^(true|false|null)(?![A-Za-z0-9_])/.exec(rest))) {
      toks.push({ t: 'lit', v: m[0], pos: i });
      i += m[0].length;
    } else if ((m = /^(==|!=|<=|>=|<|>)/.exec(rest))) {
      toks.push({ t: 'op', v: m[0], pos: i });
      i += m[0].length;
    } else if (rest.startsWith('&&')) {
      toks.push({ t: 'and', v: '&&', pos: i });
      i += 2;
    } else if (rest.startsWith('||')) {
      toks.push({ t: 'or', v: '||', pos: i });
      i += 2;
    } else if (c === '!') {
      toks.push({ t: 'not', v: '!', pos: i });
      i++;
    } else if (c === '(') {
      toks.push({ t: 'lp', v: c, pos: i });
      i++;
    } else if (c === ')') {
      toks.push({ t: 'rp', v: c, pos: i });
      i++;
    } else {
      const word = /^[^\s()]+/.exec(rest)?.[0] ?? c;
      return err(`unexpected "${word}" at position ${i} (string literals must be quoted with ')`);
    }
  }
  if (toks.length === 0) return err('empty condition');
  let p = 0;
  const fail = (msg: string): never => {
    throw new Error(msg);
  };
  const peek = (): Tok | undefined => toks[p];
  const operand = (): void => {
    const t = peek();
    if (!t) fail('unexpected end of condition');
    if (t!.t === 'lp') {
      p++;
      orExpr();
      if (peek()?.t !== 'rp') fail(`missing ")"`);
      p++;
      return;
    }
    if (t!.t === 'expr' || t!.t === 'lit') {
      p++;
      return;
    }
    fail(`unexpected "${t!.v}" at position ${t!.pos}`);
  };
  const comparison = (): void => {
    operand();
    if (peek()?.t === 'op') {
      p++;
      operand();
    }
  };
  const unary = (): void => {
    if (peek()?.t === 'not') {
      p++;
      unary();
      return;
    }
    comparison();
  };
  const andExpr = (): void => {
    unary();
    while (peek()?.t === 'and') {
      p++;
      unary();
    }
  };
  const orExpr = (): void => {
    andExpr();
    while (peek()?.t === 'or') {
      p++;
      andExpr();
    }
  };
  try {
    orExpr();
    if (p < toks.length) fail(`unexpected "${toks[p]!.v}" at position ${toks[p]!.pos}`);
  } catch (e) {
    return err((e as Error).message);
  }
  return { error: null, expressions };
}

// ─────────────────────────────────────────────────────────────────────────────
// URI-reference (RFC 3986 § 4.1)
// ─────────────────────────────────────────────────────────────────────────────
const URI_REF_RE =
  /^(?:[A-Za-z][A-Za-z0-9+.-]*:)?(?:\/\/(?:[A-Za-z0-9\-._~!$&'()*+,;=:]|%[0-9A-Fa-f]{2})*@?(?:\[[0-9A-Fa-f:.vV\-._~!$&'()*+,;=]+\]|(?:[A-Za-z0-9\-._~!$&'()*+,;=]|%[0-9A-Fa-f]{2})*)(?::\d*)?)?(?:[A-Za-z0-9\-._~!$&'()*+,;=:@/]|%[0-9A-Fa-f]{2})*(?:\?(?:[A-Za-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9A-Fa-f]{2})*)?(?:#(?:[A-Za-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9A-Fa-f]{2})*)?$/;

/** True when `s` is a syntactically valid RFC 3986 URI-reference. */
export function isUriReference(s: string): boolean {
  return URI_REF_RE.test(s);
}

/** True when the URI-reference has a scheme (absolute URI). */
export function hasUriScheme(s: string): boolean {
  return /^[A-Za-z][A-Za-z0-9+.-]*:/.test(s);
}
