import { describe, expect, it } from 'vitest';
import {
  checkJsonPath,
  checkJsonPointer,
  checkSimpleCondition,
  createLineIndex,
  diagnosticRange,
  getSupportedMinor,
  isKnownArazzoVersion,
  isUriReference,
  locate,
  parseArazzo,
  parseRuntimeExpression,
  pathToPointer,
  pointerToPath,
} from '../src/index.js';

const TEXT = `arazzo: 1.1.0
info:
  title: Demo
  version: 1.0.0
sourceDescriptions:
  - name: api
    url: ./api.yaml
    type: openapi
workflows:
  - workflowId: w
    steps:
      - stepId: first
        operationId: op
`;

describe('parseArazzo', () => {
  it('returns doc, yamlDoc, version and isArazzo', () => {
    const r = parseArazzo(TEXT);
    expect(r.errors).toEqual([]);
    expect(r.version).toBe('1.1.0');
    expect(r.isArazzo).toBe(true);
    expect(r.doc?.workflows[0]?.steps[0]?.stepId).toBe('first');
  });
  it('reports YAML syntax errors without throwing', () => {
    const r = parseArazzo('arazzo: 1.1.0\ninfo: [unclosed\n');
    expect(r.errors.length).toBeGreaterThan(0);
    expect(r.errors[0]!.code).toBe('yaml-syntax');
  });
  it('reports duplicate keys', () => {
    const r = parseArazzo('arazzo: 1.1.0\narazzo: 1.0.1\n');
    expect(r.errors.some((e) => e.code === 'yaml-syntax')).toBe(true);
  });
  it('handles empty and JSON input', () => {
    expect(parseArazzo('').doc).toBeUndefined();
    expect(parseArazzo('{"arazzo":"1.0.1"}').version).toBe('1.0.1');
  });
  it('detects non-Arazzo YAML', () => {
    expect(parseArazzo('version: "3.8"\nservices: {}\n').isArazzo).toBe(false);
  });
});

describe('locate / diagnosticRange', () => {
  const { yamlDoc } = parseArazzo(TEXT);
  it('locates a scalar value', () => {
    const r = locate(yamlDoc, ['workflows', 0, 'steps', 0, 'operationId'])!;
    expect(r.exact).toBe(true);
    expect(TEXT.slice(r.start, r.end)).toBe('op');
    expect(TEXT.slice(r.key!.start, r.key!.end)).toBe('operationId');
  });
  it('falls back to the nearest ancestor for missing paths', () => {
    const r = locate(yamlDoc, ['info', 'summary'])!;
    expect(r.exact).toBe(false);
    expect(TEXT.slice(r.start, r.end)).toBe('info');
  });
  it('uses the first entry for a mapping inside a sequence', () => {
    const r = diagnosticRange(yamlDoc, ['workflows', 0, 'steps', 0])!;
    expect(TEXT.slice(r.start, r.end)).toBe('stepId: first');
    const missing = diagnosticRange(yamlDoc, ['workflows', 0, 'steps', 0, 'timeout'])!;
    expect(TEXT.slice(missing.start, missing.end)).toBe('stepId: first');
  });
  it('uses the key for collections', () => {
    const r = diagnosticRange(yamlDoc, ['sourceDescriptions'])!;
    expect(TEXT.slice(r.start, r.end)).toBe('sourceDescriptions');
  });
  it('line index', () => {
    const lc = createLineIndex(TEXT);
    expect(lc(TEXT.indexOf('info'))).toEqual({ line: 1, character: 0 });
    expect(lc(TEXT.indexOf('first'))).toEqual({ line: 11, character: 16 });
  });
  it('pointer conversions', () => {
    expect(pointerToPath('/workflows/0/steps', { workflows: [{}] })).toEqual(['workflows', 0, 'steps']);
    expect(pathToPointer(['a/b', 'c~d', 1])).toBe('/a~1b/c~0d/1');
  });
});

describe('versions', () => {
  it('maps versions to feature sets', () => {
    expect(getSupportedMinor('1.0.1')).toBe('1.0');
    expect(getSupportedMinor('1.1.0')).toBe('1.1');
    expect(getSupportedMinor('1.1.1-rc1')).toBe('1.1');
    expect(getSupportedMinor('1.2.0')).toBeNull();
    expect(isKnownArazzoVersion('2.0.0')).toBe(false);
  });
});

describe('runtime expressions (§ 5.9)', () => {
  it.each([
    '$url',
    '$method',
    '$statusCode',
    '$self',
    '$request.header.Content-Type',
    '$request.query.page',
    '$request.path.id',
    '$request.body',
    '$response.body#/items/0/id',
    '$message.payload#/orderId',
    '$message.header.correlation-id',
    '$inputs.user.name',
    '$outputs.result',
    '$steps.login.outputs.token',
    '$steps.login.outputs.user#/id',
    '$workflows.auth.outputs.token',
    '$workflows.auth.inputs.user',
    '$sourceDescriptions.petstore.url',
    '$sourceDescriptions.petstore.getPet',
    '$components.parameters.page',
    '$components.successActions.done',
  ])('accepts %s', (e) => {
    const r = parseRuntimeExpression(e);
    expect(r.ok && !r.warning).toBe(true);
  });
  it.each(['$step.a.outputs.b', '$steps.a.b', '$steps.a.b.outputs.c', '$response.status', '$workflows.a.steps.b', 'inputs.x', '$components.inputs'])('rejects %s', (e) => {
    expect(parseRuntimeExpression(e).ok).toBe(false);
  });
  it('warns on dotted body access', () => {
    const r = parseRuntimeExpression('$response.body.items[0].id');
    expect(r.ok && r.warning?.message).toContain('$response.body#/items/0/id');
  });
});

describe('syntax checkers', () => {
  it.each(['$', '$.a', '$..b', '$.a[0]', '$.a[-1:]', "$['a b']", '$[?@.price < 10]', '$[?count(@.pets) > 0]', '$.a[?(@.b == "x" && !@.c)]', '$[*].id', '$.a[1,2]'])(
    'valid JSONPath %s',
    (q) => expect(checkJsonPath(q)).toBeNull(),
  );
  it.each(['a.b', '$.', '$[', '$.expiresIn > 0', '$[?(@.a==', "$['a]", '$[?@.a ==]'])('invalid JSONPath %s', (q) => expect(checkJsonPath(q)).not.toBeNull());
  it('JSON Pointer', () => {
    expect(checkJsonPointer('')).toBeNull();
    expect(checkJsonPointer('/a/~1b')).toBeNull();
    expect(checkJsonPointer('#/a')).toBeNull();
    expect(checkJsonPointer('a/b')).not.toBeNull();
    expect(checkJsonPointer('/a~2')).not.toBeNull();
  });
  it.each(['$statusCode == 200', "$response.body#/status == 'ok' && $statusCode < 300", '!($statusCode >= 400)', '{$inputs.flag}', "$message.header.type == 'a''b'"])(
    'valid simple condition %s',
    (c) => expect(checkSimpleCondition(c).error).toBeNull(),
  );
  it.each(['$statusCode ==', '$statusCode == ok', '$statusCode == "200"', '($statusCode == 200', '200 200'])('invalid simple condition %s', (c) =>
    expect(checkSimpleCondition(c).error).not.toBeNull(),
  );
  it('URI references', () => {
    expect(isUriReference('https://example.com/a.yaml')).toBe(true);
    expect(isUriReference('./openapi.yaml')).toBe(true);
    expect(isUriReference('urn:uuid:1234')).toBe(true);
    expect(isUriReference('a b')).toBe(false);
  });
});
