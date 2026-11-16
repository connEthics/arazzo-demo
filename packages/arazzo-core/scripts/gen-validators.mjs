#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Generates src/generated/validators.js (+ .d.ts) and src/generated/schemas.ts
// from the OFFICIAL Arazzo JSON Schemas in ./schemas.
//
// Why precompile?  Ajv normally compiles schemas at runtime with `new Function`,
// which is forbidden by the Content-Security-Policy of VS Code webviews and of
// many web apps.  Ajv "standalone" mode emits plain JS validation functions at
// build time, so the published package runs everywhere (Node, browser, webview)
// and does not need Ajv at runtime.
//
// The official schemas are compiled with a small set of DOCUMENTED patches.
// Every patch below is either validity-preserving (it only changes how errors
// are reported) or a deliberate neutralisation of a known defect of the
// official schema (see research/01-spec-delta-1.1.md § c.8, § d.2, § d.11).
// ─────────────────────────────────────────────────────────────────────────────
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import Ajv2020Module from 'ajv/dist/2020.js';
import standaloneModule from 'ajv/dist/standalone/index.js';

const Ajv2020 = Ajv2020Module.default ?? Ajv2020Module;
const standaloneCode = standaloneModule.default ?? standaloneModule;

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => JSON.parse(fs.readFileSync(path.join(root, 'schemas', f), 'utf8'));
const s10 = read('arazzo-1.0.schema.json');
const s11 = read('arazzo-1.1.schema.json');

const clone = (o) => JSON.parse(JSON.stringify(o));

/** Strip annotations that are useless for validation (keeps the bundle small). */
function stripAnnotations(node) {
  if (Array.isArray(node)) return node.map(stripAnnotations);
  if (node && typeof node === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(node)) {
      if ((k === 'description' || k === '$comment') && typeof v === 'string') continue;
      // "description" can also be a *property name* inside "properties": keep it.
      out[k] = stripAnnotations(v);
    }
    return out;
  }
  return node;
}

const isRef = (n, def) => n && typeof n === 'object' && n.$ref === `#/$defs/${def}`;

/**
 * Generic, validity-preserving rewrite of 2-branch `oneOf`s whose branches are
 * mutually exclusive by construction into `if/then/else` discriminated unions,
 * so that only the errors of the relevant branch are reported.
 */
function discriminate(node) {
  if (Array.isArray(node)) return node.map(discriminate);
  if (!node || typeof node !== 'object') return node;
  const out = {};
  for (const [k, v] of Object.entries(node)) out[k] = discriminate(v);
  const one = out.oneOf;
  if (Array.isArray(one) && one.length === 2) {
    const reusable = one.findIndex((b) => isRef(b, 'reusable-object'));
    const selector = one.findIndex((b) => isRef(b, 'selector-object'));
    const eto = one.findIndex((b) => isRef(b, 'expression-type-object') || isRef(b, 'criterion-expression-type-object'));
    let replacement;
    if (reusable >= 0) {
      // Reusable Object (has "reference", unevaluatedProperties:false) vs Parameter/Action (no "reference").
      replacement = { if: { required: ['reference'] }, then: one[reusable], else: one[1 - reusable] };
    } else if (selector >= 0) {
      // Selector Object (object) vs literal / string (never an object).
      replacement = { if: { type: 'object' }, then: one[selector], else: one[1 - selector] };
    } else if (eto >= 0) {
      // Expression Type Object (object) vs enum string.
      replacement = { if: { type: 'object' }, then: one[eto], else: one[1 - eto] };
    }
    if (replacement) {
      delete out.oneOf;
      if (out.if || out.then || out.else) out.allOf = [...(out.allOf ?? []), replacement];
      else Object.assign(out, replacement);
    }
  }
  return out;
}

function patch11(schema) {
  const s = discriminate(stripAnnotations(clone(schema)));
  const d = s.$defs;
  // P11-1 (validity-preserving): the three step branches are mutually exclusive
  // (unevaluatedProperties:false on each).  Discriminate on the fields instead of
  // a noisy `oneOf` that reports the errors of every branch.
  d['step-object'] = {
    if: { anyOf: [{ required: ['channelPath'] }, { required: ['action'] }] },
    then: { $ref: '#/$defs/asyncapi-step-object' },
    else: {
      if: { required: ['workflowId'] },
      then: { $ref: '#/$defs/workflow-step-object' },
      else: { $ref: '#/$defs/openapi-step-object' },
    },
  };
  // P11-2 (validity-preserving): the three dependsOn patterns are mutually
  // exclusive, a single alternation reports one error instead of four.
  const dep = d['step-object-base'].properties.dependsOn;
  const pats = dep.items.oneOf.map((b) => b.pattern);
  dep.items = { type: 'string', pattern: pats.map((p) => `(?:${p})`).join('|') };
  // P11-3 (neutralisation, R1 § d.2, DEV PR #614): PayloadReplacement.value may
  // be any literal (text of § 5.8.15.1 and its own example `value: 10`).
  const pr = d['payload-replacement-object'].properties.value;
  pr.else = true;
  return s;
}

function patch10(schema) {
  const s = discriminate(stripAnnotations(clone(schema)));
  const d = s.$defs;
  // P10-1 (neutralisation, R1 § d.11): S10 applies the Criterion Expression Type
  // Object to the Criterion itself (anyOf) instead of to `type`, which rejects
  // the ETO form allowed by the 1.0.1 text.  Re-attach it to `type`.
  const crit = d['criterion-object'];
  delete crit.anyOf;
  crit.properties.type = {
    if: { type: 'object' },
    then: { $ref: '#/$defs/criterion-expression-type-object' },
    else: { enum: ['simple', 'regex', 'jsonpath', 'xpath'] },
  };
  return s;
}

const p10 = patch10(s10);
const p11 = patch11(s11);

const ajv = new Ajv2020({
  allErrors: true,
  strict: false,
  validateFormats: false, // uri-reference checks are done by the semantic layer (no ajv-formats needed)
  inlineRefs: false, // stable schemaPath values ("#/$defs/<name>/...") used by the error translator
  code: { source: true, esm: true, lines: false },
});
ajv.addSchema(p10);
ajv.addSchema(p11);

let code = standaloneCode(ajv, { validate10: p10.$id, validate11: p11.$id });

// Replace the single CommonJS runtime helper by an inlined deep-equal so that
// the generated module is pure ESM without any dependency.
const equalRequire = /require\("ajv\/dist\/runtime\/equal"\)\.default/g;
const deepEqual = `function __deepEqual(a, b) {
  if (a === b) return true;
  if (a && b && typeof a == 'object' && typeof b == 'object') {
    if (a.constructor !== b.constructor) return false;
    var length, i, keys;
    if (Array.isArray(a)) {
      length = a.length;
      if (length != b.length) return false;
      for (i = length; i-- !== 0;) if (!__deepEqual(a[i], b[i])) return false;
      return true;
    }
    keys = Object.keys(a);
    length = keys.length;
    if (length !== Object.keys(b).length) return false;
    for (i = length; i-- !== 0;) if (!Object.prototype.hasOwnProperty.call(b, keys[i])) return false;
    for (i = length; i-- !== 0;) { var key = keys[i]; if (!__deepEqual(a[key], b[key])) return false; }
    return true;
  }
  return a !== a && b !== b;
}
`;
code = code.replace(equalRequire, '__deepEqual');
if (/require\(/.test(code)) {
  throw new Error('Unexpected require() left in generated validators');
}
code = code.replace(/^"use strict";/, '');

const hash = (o) => crypto.createHash('sha256').update(JSON.stringify(o)).digest('hex').slice(0, 16);
const header = `// AUTO-GENERATED by scripts/gen-validators.mjs — DO NOT EDIT.
// Ajv ${(await import('ajv/package.json', { with: { type: 'json' } })).default.version} standalone code (draft 2020-12) for the official Arazzo schemas:
//   ${s10.$id} (patched ${hash(p10)})
//   ${s11.$id} (patched ${hash(p11)})
/* eslint-disable */
// @ts-nocheck
`;

const outDir = path.join(root, 'src', 'generated');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'validators.js'), header + deepEqual + code + '\n');
fs.writeFileSync(
  path.join(outDir, 'validators.d.ts'),
  `// AUTO-GENERATED by scripts/gen-validators.mjs — DO NOT EDIT.
export interface GeneratedAjvError {
  instancePath: string;
  schemaPath: string;
  keyword: string;
  params: Record<string, any>;
  message?: string;
  propertyName?: string;
}
export interface GeneratedValidator {
  (data: unknown): boolean;
  errors?: GeneratedAjvError[] | null;
}
export declare const validate10: GeneratedValidator;
export declare const validate11: GeneratedValidator;
`,
);

// Official (unpatched) schemas, embedded as TS modules for consumers
// (completion providers, documentation, external validators).
fs.writeFileSync(
  path.join(outDir, 'schemas.ts'),
  `// AUTO-GENERATED by scripts/gen-validators.mjs — DO NOT EDIT.
// Official Arazzo JSON Schemas (unmodified copies of ./schemas/*.json).

/** Official JSON Schema for Arazzo 1.0.x (${s10.$id}). */
export const ARAZZO_SCHEMA_1_0: Record<string, unknown> = ${JSON.stringify(s10)};

/** Official JSON Schema for Arazzo 1.1.x (${s11.$id}). */
export const ARAZZO_SCHEMA_1_1: Record<string, unknown> = ${JSON.stringify(s11)};
`,
);

console.log(`[arazzo-core] generated validators (${(code.length / 1024).toFixed(0)} KiB) and schemas.ts`);
