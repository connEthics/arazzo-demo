/** Shared fixtures: examples of app/public/workflows (E1), parsed with core. */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parseArazzo } from '@connethics/arazzo-core';

export const WORKFLOWS_DIR = join(__dirname, '..', '..', '..', 'app', 'public', 'workflows');

export function walk(dir = WORKFLOWS_DIR): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : name.endsWith('.arazzo.yaml') ? [p] : [];
  });
}

export const rel = (p: string) => relative(WORKFLOWS_DIR, p);

export function load(file: string): unknown {
  const r = parseArazzo(readFileSync(file.startsWith('/') ? file : join(WORKFLOWS_DIR, file), 'utf8'));
  if (!r.doc) throw new Error(`cannot parse ${file}`);
  return r.doc;
}

export const PET = 'pet-adoption.arazzo.yaml';
export const O2C = 'e2e-order-to-cash/e2e-order-to-cash.arazzo.yaml';
export const SESSION = 'e2e-session-renewal/e2e-session-renewal.arazzo.yaml';

/** Synthetic 1.1 document covering every node and edge kind. */
export const CATALOGUE = {
  arazzo: '1.1.0',
  info: { title: 'Catalogue', version: '1.0.0' },
  sourceDescriptions: [
    { name: 'api', url: './api.yaml', type: 'openapi' },
    { name: 'events', url: './events.yaml', type: 'asyncapi' },
    { name: 'flows', url: './flows.arazzo.yaml', type: 'arazzo' },
  ],
  workflows: [
    {
      workflowId: 'main',
      summary: 'Every node and edge kind',
      inputs: { type: 'object', required: ['id'], properties: { id: { type: 'string' }, page: { type: 'integer', default: 1 } } },
      steps: [
        {
          stepId: 'create',
          operationPath: '{$sourceDescriptions.api.url}#/paths/~1orders/post',
          successCriteria: [{ condition: '$statusCode == 201' }],
          outputs: { id: '$response.body#/id' },
          onFailure: [{ name: 'retryCreate', type: 'retry', retryLimit: 3, retryAfter: 2, criteria: [{ condition: '$statusCode == 503' }] }],
        },
        {
          stepId: 'await',
          channelPath: '{$sourceDescriptions.events.url}#/channels/orderConfirmed',
          action: 'receive',
          correlationId: '$steps.create.outputs.id',
          timeout: 6000,
          onFailure: [{ name: 'timedOut', type: 'end' }],
        },
        { stepId: 'invoice', operationId: '$sourceDescriptions.api.createInvoice', dependsOn: ['await'] },
        { stepId: 'ship', operationId: '$sourceDescriptions.api.createShipment', dependsOn: ['await'] },
        {
          stepId: 'notify',
          channelPath: '{$sourceDescriptions.events.url}#/channels/notifications',
          action: 'send',
          dependsOn: ['invoice', 'ship'],
          requestBody: { payload: { id: '$steps.create.outputs.id' } },
          onSuccess: [
            { name: 'again', type: 'goto', stepId: 'create', criteria: [{ condition: '$statusCode == 409' }] },
            { name: 'done', type: 'end', criteria: [{ condition: '$statusCode == 200' }] },
          ],
          onFailure: [{ name: 'escalate', type: 'goto', workflowId: 'support' }],
        },
        {
          stepId: 'audit',
          workflowId: '$sourceDescriptions.flows.logAccess',
          onFailure: [{ name: 'backToCreate', type: 'goto', stepId: 'create' }],
        },
      ],
      outputs: {
        orderId: '$steps.create.outputs.id',
        firstItem: { context: '$response.body', selector: '$.items[0]', type: { type: 'jsonpath', version: 'rfc9535' } },
      },
    },
    { workflowId: 'support', steps: [{ stepId: 'open', operationId: '$sourceDescriptions.api.openTicket' }] },
  ],
};
