import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validate } from '../src/index.js';
import type { Diagnostic } from '../src/index.js';

export type Doc = Record<string, any>;

/** A valid Arazzo 1.1 document (HTTP + AsyncAPI receive) that must produce no error nor warning. */
export const BASE11: Doc = {
  arazzo: '1.1.0',
  $self: 'https://example.com/flows/base.arazzo.yaml',
  info: { title: 'Base', version: '1.0.0' },
  sourceDescriptions: [
    { name: 'api', url: './api.openapi.yaml', type: 'openapi' },
    { name: 'events', url: './events.asyncapi.yaml', type: 'asyncapi' },
  ],
  workflows: [
    {
      workflowId: 'main',
      inputs: { type: 'object', required: ['orderId'], properties: { orderId: { type: 'string' } } },
      steps: [
        {
          stepId: 'create',
          operationId: '$sourceDescriptions.api.createOrder',
          parameters: [{ name: 'X-Order', in: 'header', value: '$inputs.orderId' }],
          successCriteria: [{ condition: '$statusCode == 201' }],
          outputs: { id: '$response.body#/id' },
        },
        {
          stepId: 'confirm',
          channelPath: '{$sourceDescriptions.events.url}#/channels/orderConfirmed',
          action: 'receive',
          correlationId: '$steps.create.outputs.id',
          timeout: 6000,
          successCriteria: [{ condition: "$message.payload#/status == 'confirmed'" }],
          outputs: { status: '$message.payload#/status' },
        },
      ],
      outputs: { orderId: '$steps.create.outputs.id' },
    },
  ],
};

/** A valid Arazzo 1.0.1 document. */
export const BASE10: Doc = {
  arazzo: '1.0.1',
  info: { title: 'Base 1.0', version: '1.0.0' },
  sourceDescriptions: [{ name: 'api', url: './api.openapi.yaml', type: 'openapi' }],
  workflows: [
    {
      workflowId: 'main',
      inputs: { type: 'object', properties: { petId: { type: 'string' } } },
      steps: [
        {
          stepId: 'get',
          operationId: 'getPet',
          parameters: [{ name: 'petId', in: 'path', value: '$inputs.petId' }],
          successCriteria: [{ condition: '$statusCode == 200' }],
          outputs: { name: '$response.body#/name' },
        },
      ],
      outputs: { name: '$steps.get.outputs.name' },
    },
  ],
};

export const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

export function make(base: Doc, patch: (d: Doc) => void): Doc {
  const d = clone(base);
  patch(d);
  return d;
}

export const run = (doc: unknown): Diagnostic[] => validate(doc, { debug: true });

export const fixture = (...p: string[]): string => readFileSync(join(__dirname, ...p), 'utf8');

export function format(diags: Diagnostic[]): string {
  return diags.map((d) => `${d.severity} ${d.code} ${JSON.stringify(d.path)} ${d.message}`).join('\n');
}

/** No two diagnostics share code + path. */
export function duplicates(diags: Diagnostic[]): string[] {
  const seen = new Set<string>();
  const dups: string[] = [];
  for (const d of diags) {
    const k = `${d.code} ${JSON.stringify(d.path)}`;
    if (seen.has(k)) dups.push(k);
    seen.add(k);
  }
  return dups;
}
