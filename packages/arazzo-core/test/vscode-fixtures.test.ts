// Equivalence with the diagnostics of arazzo-vscode (src/test/validation.test.ts):
// same findings, new rule codes (see LEGACY_CODE_MAP), no duplicates.
import { describe, expect, it } from 'vitest';
import { LEGACY_CODE_MAP, validateText } from '../src/index.js';
import type { Diagnostic } from '../src/index.js';
import { duplicates, fixture, format } from './helpers.js';

const legacy = (code: string) => LEGACY_CODE_MAP[code]!;
const check = (text: string) => {
  const r = validateText(text, { debug: true });
  expect(duplicates(r.diagnostics), format(r.diagnostics)).toEqual([]);
  return r;
};
const withCode = (d: Diagnostic[], code: string) => d.filter((x) => x.code === code);
const withMessage = (d: Diagnostic[], text: string) => d.filter((x) => x.message.includes(text));

const doc = (body: string) => `arazzo: 1.0.1\ninfo:\n  title: Test\n  version: 1.0.0\n${body}`;
const SOURCES = `sourceDescriptions:\n  - name: test\n    url: http://example.com\n    type: openapi\n`;

describe('vscode fixtures', () => {
  it('invalid-mutual-exclusivity → arazzo-step-target-exclusive (error)', () => {
    const r = check(fixture('fixtures/vscode/invalid-mutual-exclusivity.arazzo.yaml'));
    const d = withCode(r.diagnostics, legacy('arazzo-mutual-exclusive'));
    expect(d).toHaveLength(1);
    expect(d[0]!.severity).toBe('error');
    expect(d[0]!.range).toBeDefined();
  });

  it('invalid-references → dependsOn error mentioning the workflow + source type error', () => {
    const r = check(fixture('fixtures/vscode/invalid-references.arazzo.yaml'));
    const dep = withCode(r.diagnostics, legacy('arazzo-ref-dependsOn'));
    expect(dep).toHaveLength(1);
    expect(dep[0]!.message).toContain('nonExistent');
    const type = withCode(r.diagnostics, legacy('arazzo-source-type'));
    expect(type).toHaveLength(1);
    expect(type[0]!.severity).toBe('error');
    expect(r.diagnostics.filter((d) => d.severity === 'error')).toHaveLength(2);
  });

  it('duplicate-stepid → one arazzo-step-id-unique mentioning the id', () => {
    const text = fixture('fixtures/vscode/duplicate-stepid.arazzo.yaml');
    const r = check(text);
    const d = withCode(r.diagnostics, legacy('arazzo-duplicate-stepId'));
    expect(d).toHaveLength(1);
    expect(d[0]!.message).toContain('duplicateStep');
    // Range points at the second `duplicateStep` value.
    const second = text.indexOf('duplicateStep', text.indexOf('duplicateStep') + 1);
    expect(d[0]!.range).toEqual({ start: second, end: second + 'duplicateStep'.length });
    expect(r.diagnostics).toHaveLength(1);
  });

  it('unknown-version → arazzo-version warning mentioning 2.0.0 and nothing else', () => {
    const r = check(fixture('fixtures/vscode/unknown-version.arazzo.yaml'));
    expect(r.diagnostics.map((d) => [d.code, d.severity])).toEqual([['arazzo-version', 'warning']]);
    expect(r.diagnostics[0]!.message).toContain('2.0.0');
  });

  it('non-arazzo.yaml is not detected as Arazzo', () => {
    const r = validateText(fixture('fixtures/vscode/non-arazzo.yaml'));
    expect(r.isArazzo).toBe(false);
  });

  it('xss-payload: no crash, messages keep the raw text (rendering escapes it)', () => {
    const r = check(fixture('fixtures/vscode/xss-payload.arazzo.yaml'));
    expect(r.diagnostics.map((d) => d.code).sort()).toEqual(['arazzo-id-pattern', 'arazzo-unknown-field']);
  });

  it('pet-adoption (1.0.1) has no step-target / reference / duplicate errors', () => {
    const r = check(fixture('fixtures/vscode/pet-adoption.arazzo.yaml'));
    for (const old of ['arazzo-mutual-exclusive', 'arazzo-operation-required', 'arazzo-ref-dependsOn', 'arazzo-source-type', 'arazzo-duplicate-stepId']) {
      expect(withCode(r.diagnostics, legacy(old))).toEqual([]);
    }
    // Non-spec fields of this legacy example are now reported (outputs on actions, components.schemas…).
    expect(withCode(r.diagnostics, 'arazzo-unknown-field').map((d) => d.path.at(-1))).toEqual(['schemas', 'outputs', 'outputs', 'default', 'outputs']);
  });
});

describe('vscode validation.test.ts scenarios', () => {
  it('valid file has no error', () => {
    const r = check(doc(`${SOURCES}workflows:\n  - workflowId: testWorkflow\n    steps:\n      - stepId: testStep\n        operationId: testOp\n`));
    expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  });
  it('operation required', () => {
    const r = check(doc(`${SOURCES}workflows:\n  - workflowId: testWorkflow\n    steps:\n      - stepId: emptyStep\n`));
    expect(withCode(r.diagnostics, legacy('arazzo-operation-required'))).toHaveLength(1);
  });
  it.each([
    ['operationId + workflowId', 'operationId: a\n        workflowId: testWorkflow'],
    ['operationPath + workflowId', "operationPath: '{$sourceDescriptions.test.url}#/paths/~1a/get'\n        workflowId: testWorkflow"],
  ])('mutual exclusivity: %s', (_, fields) => {
    const r = check(doc(`${SOURCES}workflows:\n  - workflowId: testWorkflow\n    steps:\n      - stepId: s\n        ${fields}\n`));
    expect(withCode(r.diagnostics, legacy('arazzo-mutual-exclusive'))).toHaveLength(1);
  });
  it.each([
    ['operationPath only', "operationPath: '{$sourceDescriptions.test.url}#/paths/~1a/get'"],
    ['workflowId only', 'workflowId: other'],
  ])('no exclusivity error with %s', (_, field) => {
    const r = check(
      doc(`${SOURCES}workflows:\n  - workflowId: testWorkflow\n    steps:\n      - stepId: s\n        ${field}\n  - workflowId: other\n    steps:\n      - stepId: t\n        operationId: op\n`),
    );
    expect(withCode(r.diagnostics, legacy('arazzo-mutual-exclusive'))).toEqual([]);
    expect(withCode(r.diagnostics, legacy('arazzo-operation-required'))).toEqual([]);
    expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  });
  it.each(['openapi', 'arazzo'])('valid source type %s', (type) => {
    const r = check(doc(`sourceDescriptions:\n  - name: test\n    url: http://example.com\n    type: ${type}\nworkflows:\n  - workflowId: w\n    steps:\n      - stepId: s\n        operationId: op\n`));
    expect(withCode(r.diagnostics, legacy('arazzo-source-type'))).toEqual([]);
  });
  it('valid dependsOn', () => {
    const r = check(
      doc(`${SOURCES}workflows:\n  - workflowId: a\n    steps:\n      - stepId: s\n        operationId: op\n  - workflowId: b\n    dependsOn:\n      - a\n    steps:\n      - stepId: t\n        operationId: op\n`),
    );
    expect(withCode(r.diagnostics, legacy('arazzo-ref-dependsOn'))).toEqual([]);
  });
  it.each([
    ['info', `${SOURCES}workflows:\n  - workflowId: w\n    steps:\n      - stepId: s\n        operationId: op\n`, true],
    ['sourceDescriptions', `workflows:\n  - workflowId: w\n    steps:\n      - stepId: s\n        operationId: op\n`, false],
    ['workflows', SOURCES, false],
  ])('root missing %s', (field, body, dropInfo) => {
    const text = dropInfo ? `arazzo: 1.0.1\n${body}` : doc(body as string);
    const r = check(text);
    const d = withMessage(r.diagnostics, `Missing required field: ${field}`);
    expect(d).toHaveLength(1);
    expect(d[0]!.severity).toBe('error');
    expect(d[0]!.range).toBeDefined();
  });
  it.each([
    ['title', 'version: 1.0.0'],
    ['version', 'title: Test'],
  ])('info missing %s', (field, infoBody) => {
    const r = check(`arazzo: 1.0.1\ninfo:\n  ${infoBody}\n${SOURCES}workflows:\n  - workflowId: w\n    steps:\n      - stepId: s\n        operationId: op\n`);
    expect(withMessage(r.diagnostics, `Missing required field: ${field}`)).toHaveLength(1);
  });
  it.each([
    ['name', 'url: http://example.com'],
    ['url', 'name: test'],
  ])('sourceDescription missing %s', (field, src) => {
    const r = check(doc(`sourceDescriptions:\n  - ${src}\n    type: openapi\nworkflows:\n  - workflowId: w\n    steps:\n      - stepId: s\n        operationId: op\n`));
    expect(withMessage(r.diagnostics, `Missing required field: ${field}`)).toHaveLength(1);
  });
  it.each([
    ['workflowId', `  - steps:\n      - stepId: s\n        operationId: op\n`],
    ['steps', `  - workflowId: w\n`],
    ['stepId', `  - workflowId: w\n    steps:\n      - operationId: op\n`],
  ])('missing %s', (field, wf) => {
    const r = check(doc(`${SOURCES}workflows:\n${wf}`));
    expect(withMessage(r.diagnostics, `Missing required field: ${field}`)).toHaveLength(1);
  });
  it('empty sourceDescriptions', () => {
    const r = check(doc(`sourceDescriptions: []\nworkflows:\n  - workflowId: w\n    steps:\n      - stepId: s\n        operationId: op\n`));
    expect(withMessage(r.diagnostics, 'sourceDescriptions must have at least one entry')).toHaveLength(1);
  });
  it('empty steps', () => {
    const r = check(doc(`${SOURCES}workflows:\n  - workflowId: w\n    steps: []\n`));
    expect(withMessage(r.diagnostics, 'steps must have at least one entry')).toHaveLength(1);
  });
  it.each([
    ['sourceDescriptions', `sourceDescriptions:\n  name: test\n  url: http://example.com\nworkflows:\n  - workflowId: w\n    steps:\n      - stepId: s\n        operationId: op\n`],
    ['workflows', `${SOURCES}workflows:\n  workflowId: w\n`],
    ['steps', `${SOURCES}workflows:\n  - workflowId: w\n    steps:\n      stepId: s\n`],
  ])('%s as object', (field, body) => {
    const r = check(doc(body));
    const d = withMessage(r.diagnostics, `${field} must be an array`);
    expect(d).toHaveLength(1);
    expect(d[0]!.severity).toBe('error');
  });
  it('known version 1.0.0 has no version warning; 1.1.0 neither', () => {
    for (const v of ['1.0.0', '1.0.1', '1.1.0']) {
      const r = check(`arazzo: ${v}\ninfo:\n  title: T\n  version: 1.0.0\n${SOURCES}workflows:\n  - workflowId: w\n    steps:\n      - stepId: s\n        operationId: op\n`);
      expect(withCode(r.diagnostics, 'arazzo-version')).toEqual([]);
    }
  });
});
