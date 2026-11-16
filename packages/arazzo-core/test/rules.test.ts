import { describe, expect, it } from 'vitest';
import { RULES } from '../src/index.js';
import type { JsonPath, RuleId, Severity } from '../src/index.js';
import { BASE10, BASE11, duplicates, format, make, run } from './helpers.js';
import type { Doc } from './helpers.js';

interface Case {
  rule: RuleId;
  name?: string;
  doc: Doc;
  path?: JsonPath;
  severity?: Severity;
}

const S = (d: Doc, i = 0) => d.workflows[0].steps[i];
const WF = (d: Doc, i = 0) => d.workflows[i];
const arazzoSource = (d: Doc) => d.sourceDescriptions.push({ name: 'remote', url: 'https://example.com/remote.arazzo.yaml', type: 'arazzo' });
const secondWorkflow = (d: Doc, extra: Doc = {}) =>
  d.workflows.push({
    workflowId: 'other',
    inputs: { type: 'object', required: ['token'], properties: { token: { type: 'string' } } },
    steps: [{ stepId: 'ping', operationId: '$sourceDescriptions.api.ping' }],
    ...extra,
  });

const cases: Case[] = [
  // ── c.1 Version, structure, schema
  { rule: 'arazzo-schema', doc: make(BASE11, (d) => delete d.info.title), path: ['info', 'title'] },
  { rule: 'arazzo-version-format', doc: make(BASE11, (d) => (d.arazzo = '1.1')), path: ['arazzo'] },
  { rule: 'arazzo-version-format', name: 'missing arazzo', doc: make(BASE11, (d) => delete d.arazzo), path: ['arazzo'] },
  { rule: 'arazzo-version', doc: make(BASE10, (d) => (d.arazzo = '2.0.0')), path: ['arazzo'], severity: 'warning' },
  { rule: 'arazzo-version-feature-mismatch', name: 'timeout in 1.0', doc: make(BASE10, (d) => (S(d).timeout = 5000)), path: ['workflows', 0, 'steps', 0, 'timeout'], severity: 'error' },
  {
    rule: 'arazzo-version-feature-mismatch',
    name: 'Selector in Parameter.value in 1.0 (silently accepted by S10)',
    doc: make(BASE10, (d) => (S(d).parameters[0].value = { context: '$response.body', selector: '/id', type: 'jsonpointer' })),
    path: ['workflows', 0, 'steps', 0, 'parameters', 0, 'value'],
    severity: 'warning',
  },
  {
    rule: 'arazzo-version-feature-mismatch',
    name: '$message expression in 1.0',
    doc: make(BASE10, (d) => (S(d).outputs.m = '$message.payload')),
    path: ['workflows', 0, 'steps', 0, 'outputs', 'm'],
    severity: 'warning',
  },
  { rule: 'arazzo-migration-param-object-value', doc: make(BASE11, (d) => (S(d).parameters[0].value = { a: 1 })), path: ['workflows', 0, 'steps', 0, 'parameters', 0, 'value'] },
  { rule: 'arazzo-self-recommended', doc: make(BASE11, (d) => delete d.$self), path: ['$self'] },
  { rule: 'arazzo-self-fragment', doc: make(BASE11, (d) => (d.$self = 'https://x.example/a.yaml#top')), path: ['$self'] },
  { rule: 'arazzo-self-uri-reference', doc: make(BASE11, (d) => (d.$self = 'a b')), path: ['$self'] },
  { rule: 'arazzo-self-relative', doc: make(BASE11, (d) => (d.$self = 'flows/a.arazzo.yaml')), path: ['$self'] },
  { rule: 'arazzo-unknown-field', doc: make(BASE11, (d) => (S(d).foo = 1)), path: ['workflows', 0, 'steps', 0, 'foo'] },
  { rule: 'arazzo-extension-reserved-prefix', doc: make(BASE11, (d) => (S(d)['x-arazzo-foo'] = 1)), path: ['workflows', 0, 'steps', 0, 'x-arazzo-foo'] },
  {
    rule: 'arazzo-reusable-no-extension',
    doc: make(BASE11, (d) => {
      d.components = { parameters: { p: { name: 'p', in: 'header', value: 'x' } } };
      S(d).parameters.push({ reference: '$components.parameters.p', 'x-a': 1 });
    }),
    path: ['workflows', 0, 'steps', 0, 'parameters', 1, 'x-a'],
  },
  // ── c.2 Identifiers & uniqueness
  { rule: 'arazzo-workflow-id-unique', doc: make(BASE11, (d) => d.workflows.push(JSON.parse(JSON.stringify(d.workflows[0])))), path: ['workflows', 1, 'workflowId'] },
  { rule: 'arazzo-step-id-unique', doc: make(BASE11, (d) => (S(d, 1).stepId = 'create')), path: ['workflows', 0, 'steps', 1, 'stepId'] },
  { rule: 'arazzo-source-name-unique', doc: make(BASE11, (d) => (d.sourceDescriptions[1].name = 'api')), path: ['sourceDescriptions', 1, 'name'] },
  { rule: 'arazzo-source-name-pattern', doc: make(BASE11, (d) => d.sourceDescriptions.push({ name: 'my.api', url: './x.yaml', type: 'openapi' })), path: ['sourceDescriptions', 2, 'name'] },
  { rule: 'arazzo-source-type-enum', doc: make(BASE11, (d) => (d.sourceDescriptions[0].type = 'graphql')), path: ['sourceDescriptions', 0, 'type'] },
  {
    rule: 'arazzo-id-pattern',
    doc: make(BASE11, (d) => WF(d).steps.push({ stepId: 'step.1', operationId: '$sourceDescriptions.api.ping' })),
    path: ['workflows', 0, 'steps', 2, 'stepId'],
    severity: 'warning',
  },
  { rule: 'arazzo-key-pattern', doc: make(BASE11, (d) => (S(d).outputs['a b'] = '$statusCode')), path: ['workflows', 0, 'steps', 0, 'outputs', 'a b'] },
  { rule: 'arazzo-key-pattern', name: 'components key (schema)', doc: make(BASE11, (d) => (d.components = { parameters: { 'a b': { name: 'a', in: 'header', value: 'x' } } })), path: ['components', 'parameters', 'a b'] },
  {
    rule: 'arazzo-parameter-unique',
    doc: make(BASE11, (d) => S(d).parameters.push({ name: 'X-Order', in: 'header', value: 'other' })),
    path: ['workflows', 0, 'steps', 0, 'parameters', 1],
  },
  {
    rule: 'arazzo-action-name-unique',
    doc: make(BASE11, (d) => (S(d).onFailure = [{ name: 'retry', type: 'retry' }, { name: 'retry', type: 'end' }])),
    path: ['workflows', 0, 'steps', 0, 'onFailure', 1],
  },
  // ── c.3 Step targets
  { rule: 'arazzo-step-target-exclusive', doc: make(BASE11, (d) => (S(d).workflowId = 'main')), path: ['workflows', 0, 'steps', 0] },
  { rule: 'arazzo-step-target-missing', doc: make(BASE11, (d) => delete S(d).operationId), path: ['workflows', 0, 'steps', 0] },
  { rule: 'arazzo-step-operation-id-qualified', doc: make(BASE11, (d) => (S(d).operationId = 'createOrder')), path: ['workflows', 0, 'steps', 0, 'operationId'] },
  {
    rule: 'arazzo-step-operation-path-format',
    doc: make(BASE11, (d) => {
      delete S(d).operationId;
      S(d).operationPath = '/paths/~1orders/post';
    }),
    path: ['workflows', 0, 'steps', 0, 'operationPath'],
  },
  {
    rule: 'arazzo-step-operation-path-source-type',
    doc: make(BASE11, (d) => {
      delete S(d).operationId;
      S(d).operationPath = '{$sourceDescriptions.events.url}#/paths/~1orders/post';
    }),
    path: ['workflows', 0, 'steps', 0, 'operationPath'],
  },
  { rule: 'arazzo-channel-path-format', doc: make(BASE11, (d) => (S(d, 1).channelPath = 'orders')), path: ['workflows', 0, 'steps', 1, 'channelPath'], severity: 'warning' },
  {
    rule: 'arazzo-channel-path-source-type',
    doc: make(BASE11, (d) => (S(d, 1).channelPath = '{$sourceDescriptions.api.url}#/channels/orderConfirmed')),
    path: ['workflows', 0, 'steps', 1, 'channelPath'],
  },
  {
    rule: 'arazzo-step-workflow-resolved',
    doc: make(BASE11, (d) => WF(d).steps.push({ stepId: 'sub', workflowId: 'unknownWf' })),
    path: ['workflows', 0, 'steps', 2, 'workflowId'],
  },
  {
    rule: 'arazzo-step-workflow-qualified',
    doc: make(BASE11, (d) => {
      arazzoSource(d);
      WF(d).steps.push({ stepId: 'sub', workflowId: 'remoteWf' });
    }),
    path: ['workflows', 0, 'steps', 2, 'workflowId'],
  },
  {
    rule: 'arazzo-step-workflow-requestbody',
    doc: make(BASE11, (d) => {
      secondWorkflow(d);
      WF(d).steps.push({ stepId: 'sub', workflowId: 'other', parameters: [{ name: 'token', value: 't' }], requestBody: { payload: { a: 1 } } });
    }),
    path: ['workflows', 0, 'steps', 2, 'requestBody'],
  },
  { rule: 'arazzo-source-type-recommended', doc: make(BASE11, (d) => delete d.sourceDescriptions[1].type), path: ['sourceDescriptions', 1, 'type'] },
  // ── c.4 AsyncAPI
  { rule: 'arazzo-async-action-enum', doc: make(BASE11, (d) => (S(d, 1).action = 'publish')), path: ['workflows', 0, 'steps', 1, 'action'] },
  { rule: 'arazzo-async-action-only-asyncapi', doc: make(BASE11, (d) => (S(d).action = 'send')), path: ['workflows', 0, 'steps', 0, 'action'] },
  {
    rule: 'arazzo-async-action-only-asyncapi',
    name: 'operationPath + action (invalid example of § 5.8.1.2)',
    doc: make(BASE11, (d) => {
      delete S(d).operationId;
      S(d).operationPath = '{$sourceDescriptions.api.url}#/paths/~1orders/post';
      S(d).action = 'send';
    }),
    path: ['workflows', 0, 'steps', 0, 'action'],
  },
  { rule: 'arazzo-async-action-required', doc: make(BASE11, (d) => delete S(d, 1).action), path: ['workflows', 0, 'steps', 1, 'action'] },
  {
    rule: 'arazzo-async-action-required',
    name: 'operationId on an AsyncAPI source without action',
    doc: make(BASE11, (d) => {
      delete S(d, 1).channelPath;
      delete S(d, 1).action;
      delete S(d, 1).correlationId;
      S(d, 1).operationId = '$sourceDescriptions.events.onOrderConfirmed';
    }),
    path: ['workflows', 0, 'steps', 1, 'action'],
  },
  { rule: 'arazzo-async-correlation-receive-only', doc: make(BASE11, (d) => (S(d, 1).action = 'send')), path: ['workflows', 0, 'steps', 1, 'correlationId'] },
  { rule: 'arazzo-async-correlation-only-asyncapi', doc: make(BASE11, (d) => (S(d).correlationId = '$inputs.orderId')), path: ['workflows', 0, 'steps', 0, 'correlationId'] },
  { rule: 'arazzo-async-correlation-type', doc: make(BASE11, (d) => (S(d, 1).correlationId = 42)), path: ['workflows', 0, 'steps', 1, 'correlationId'], severity: 'warning' },
  { rule: 'arazzo-step-timeout-positive', doc: make(BASE11, (d) => (S(d, 1).timeout = -1)), path: ['workflows', 0, 'steps', 1, 'timeout'], severity: 'warning' },
  { rule: 'arazzo-step-timeout-positive', name: 'non-integer (schema)', doc: make(BASE11, (d) => (S(d, 1).timeout = '6s')), path: ['workflows', 0, 'steps', 1, 'timeout'], severity: 'error' },
  { rule: 'arazzo-async-receive-timeout-recommended', doc: make(BASE11, (d) => delete S(d, 1).timeout), path: ['workflows', 0, 'steps', 1, 'timeout'] },
  { rule: 'arazzo-async-receive-success-criteria', doc: make(BASE11, (d) => delete S(d, 1).successCriteria), path: ['workflows', 0, 'steps', 1, 'successCriteria'] },
  {
    rule: 'arazzo-async-http-expression',
    doc: make(BASE11, (d) => (S(d, 1).successCriteria = [{ condition: '$statusCode == 200' }])),
    path: ['workflows', 0, 'steps', 1, 'successCriteria', 0, 'condition'],
  },
  {
    rule: 'arazzo-async-param-in',
    doc: make(BASE11, (d) => (S(d, 1).parameters = [{ name: 'q', in: 'query', value: 'x' }])),
    path: ['workflows', 0, 'steps', 1, 'parameters', 0, 'in'],
  },
  {
    rule: 'arazzo-param-in-channel',
    doc: make(BASE11, (d) => S(d).parameters.push({ name: 'region', in: 'channel', value: 'eu' })),
    path: ['workflows', 0, 'steps', 0, 'parameters', 1, 'in'],
    severity: 'error',
  },
  {
    rule: 'arazzo-param-in-channel',
    name: 'info on AsyncAPI steps',
    doc: make(BASE11, (d) => (S(d, 1).parameters = [{ name: 'region', in: 'channel', value: 'eu' }])),
    path: ['workflows', 0, 'steps', 1, 'parameters', 0, 'in'],
    severity: 'info',
  },
  // ── c.5 dependsOn
  { rule: 'arazzo-step-depends-on-shape', doc: make(BASE11, (d) => (S(d, 1).dependsOn = ['$steps.create'])), path: ['workflows', 0, 'steps', 1, 'dependsOn', 0] },
  { rule: 'arazzo-step-depends-on-shape', name: 'empty list', doc: make(BASE11, (d) => (S(d, 1).dependsOn = [])), path: ['workflows', 0, 'steps', 1, 'dependsOn'] },
  { rule: 'arazzo-step-depends-on-resolved', doc: make(BASE11, (d) => (S(d, 1).dependsOn = ['nope'])), path: ['workflows', 0, 'steps', 1, 'dependsOn', 0] },
  {
    rule: 'arazzo-step-depends-on-resolved',
    name: '$workflows form',
    doc: make(BASE11, (d) => (S(d, 1).dependsOn = ['$workflows.main.steps.nope'])),
    path: ['workflows', 0, 'steps', 1, 'dependsOn', 0],
  },
  { rule: 'arazzo-step-depends-on-self', doc: make(BASE11, (d) => (S(d, 1).dependsOn = ['confirm'])), path: ['workflows', 0, 'steps', 1, 'dependsOn', 0] },
  { rule: 'arazzo-step-depends-on-cycle', doc: make(BASE11, (d) => (S(d).dependsOn = ['confirm'])), path: ['workflows', 0, 'steps', 0, 'dependsOn'] },
  {
    rule: 'arazzo-step-forward-output-reference',
    doc: make(BASE11, (d) => (S(d).parameters[0].value = '$steps.confirm.outputs.status')),
    path: ['workflows', 0, 'steps', 0, 'parameters', 0, 'value'],
  },
  {
    rule: 'arazzo-step-depends-on-sync',
    doc: make(BASE11, (d) => {
      WF(d).steps.splice(1, 1);
      WF(d).steps.push({ stepId: 'pay', operationId: '$sourceDescriptions.api.pay', dependsOn: ['create'] });
    }),
    path: ['workflows', 0, 'steps', 1, 'dependsOn'],
    severity: 'info',
  },
  { rule: 'arazzo-workflow-depends-on-resolved', doc: make(BASE11, (d) => (WF(d).dependsOn = ['nonExistentWorkflow'])), path: ['workflows', 0, 'dependsOn', 0] },
  {
    rule: 'arazzo-workflow-depends-on-qualified',
    doc: make(BASE11, (d) => {
      arazzoSource(d);
      WF(d).dependsOn = ['remoteWf'];
    }),
    path: ['workflows', 0, 'dependsOn', 0],
  },
  {
    rule: 'arazzo-workflow-depends-on-cycle',
    doc: make(BASE11, (d) => {
      secondWorkflow(d, { dependsOn: ['main'] });
      WF(d).dependsOn = ['other'];
    }),
    path: ['workflows', 0, 'dependsOn'],
  },
  // ── c.6 Actions
  { rule: 'arazzo-action-goto-target', doc: make(BASE11, (d) => (S(d).onSuccess = [{ name: 'g', type: 'goto' }])), path: ['workflows', 0, 'steps', 0, 'onSuccess', 0] },
  {
    rule: 'arazzo-action-goto-target',
    name: 'goto with both targets',
    doc: make(BASE11, (d) => (S(d).onSuccess = [{ name: 'g', type: 'goto', stepId: 'confirm', workflowId: 'main' }])),
    path: ['workflows', 0, 'steps', 0, 'onSuccess', 0],
  },
  {
    rule: 'arazzo-action-target-exclusive',
    doc: make(BASE11, (d) => (S(d).onFailure = [{ name: 'r', type: 'retry', stepId: 'create', workflowId: 'main' }])),
    path: ['workflows', 0, 'steps', 0, 'onFailure', 0],
  },
  { rule: 'arazzo-action-goto-step-exists', doc: make(BASE11, (d) => (S(d).onSuccess = [{ name: 'g', type: 'goto', stepId: 'nope' }])), path: ['workflows', 0, 'steps', 0, 'onSuccess', 0, 'stepId'] },
  {
    rule: 'arazzo-action-goto-step-exists',
    name: 'through a component',
    doc: make(BASE11, (d) => {
      d.components = { successActions: { jump: { name: 'jump', type: 'goto', stepId: 'nope' } } };
      S(d).onSuccess = [{ reference: '$components.successActions.jump' }];
    }),
    path: ['workflows', 0, 'steps', 0, 'onSuccess', 0, 'reference'],
  },
  {
    rule: 'arazzo-action-goto-workflow-exists',
    doc: make(BASE11, (d) => (S(d).onFailure = [{ name: 'g', type: 'goto', workflowId: 'nope' }])),
    path: ['workflows', 0, 'steps', 0, 'onFailure', 0, 'workflowId'],
  },
  { rule: 'arazzo-action-field-irrelevant', doc: make(BASE11, (d) => (S(d).onFailure = [{ name: 'e', type: 'end', stepId: 'create' }])), path: ['workflows', 0, 'steps', 0, 'onFailure', 0, 'stepId'] },
  { rule: 'arazzo-action-retry-values', doc: make(BASE11, (d) => (S(d).onFailure = [{ name: 'r', type: 'retry', retryLimit: -1 }])), path: ['workflows', 0, 'steps', 0, 'onFailure', 0, 'retryLimit'] },
  {
    rule: 'arazzo-action-parameters-require-workflow',
    doc: make(BASE11, (d) => (S(d).onSuccess = [{ name: 'g', type: 'goto', stepId: 'confirm', parameters: [{ name: 'a', value: 1 }] }])),
    path: ['workflows', 0, 'steps', 0, 'onSuccess', 0, 'parameters'],
  },
  {
    rule: 'arazzo-action-parameters-shape',
    doc: make(BASE11, (d) => {
      secondWorkflow(d);
      S(d).onFailure = [{ name: 'g', type: 'goto', workflowId: 'other', parameters: [42] }];
    }),
    path: ['workflows', 0, 'steps', 0, 'onFailure', 0, 'parameters', 0],
  },
  {
    rule: 'arazzo-action-parameters-no-in',
    doc: make(BASE11, (d) => {
      secondWorkflow(d);
      S(d).onFailure = [{ name: 'g', type: 'goto', workflowId: 'other', parameters: [{ name: 'token', in: 'header', value: 'x' }] }];
    }),
    path: ['workflows', 0, 'steps', 0, 'onFailure', 0, 'parameters', 0, 'in'],
  },
  {
    rule: 'arazzo-workflow-parameters-match-inputs',
    doc: make(BASE11, (d) => {
      secondWorkflow(d);
      S(d).onFailure = [{ name: 'renew', type: 'retry', workflowId: 'other', retryLimit: 2, parameters: [{ name: 'tokn', value: 'x' }] }];
    }),
    path: ['workflows', 0, 'steps', 0, 'onFailure', 0, 'parameters', 0, 'name'],
    severity: 'warning',
  },
  {
    rule: 'arazzo-workflow-step-param-in',
    doc: make(BASE11, (d) => {
      secondWorkflow(d);
      WF(d).steps.push({ stepId: 'sub', workflowId: 'other', parameters: [{ name: 'token', in: 'query', value: 'x' }] });
    }),
    path: ['workflows', 0, 'steps', 2, 'parameters', 0, 'in'],
  },
  // ── c.7 Parameters & components
  { rule: 'arazzo-param-in-required', doc: make(BASE11, (d) => delete S(d).parameters[0].in), path: ['workflows', 0, 'steps', 0, 'parameters', 0, 'in'] },
  { rule: 'arazzo-param-in-enum', doc: make(BASE11, (d) => (S(d).parameters[0].in = 'body')), path: ['workflows', 0, 'steps', 0, 'parameters', 0, 'in'] },
  {
    rule: 'arazzo-param-querystring-exclusive',
    doc: make(BASE11, (d) => S(d).parameters.push({ name: 'qs', in: 'querystring', value: 'a=1' }, { name: 'page', in: 'query', value: 1 })),
    path: ['workflows', 0, 'steps', 0, 'parameters', 1, 'in'],
  },
  {
    rule: 'arazzo-param-querystring-exclusive',
    name: 'workflow-level query + step-level querystring',
    doc: make(BASE11, (d) => {
      WF(d).parameters = [{ name: 'page', in: 'query', value: 1 }];
      S(d).parameters.push({ name: 'qs', in: 'querystring', value: 'a=1' });
    }),
    path: ['workflows', 0, 'steps', 0, 'parameters', 1, 'in'],
  },
  {
    rule: 'arazzo-param-querystring-single',
    doc: make(BASE11, (d) => S(d).parameters.push({ name: 'qs', in: 'querystring', value: 'a=1' }, { name: 'qs2', in: 'querystring', value: 'b=2' })),
    path: ['workflows', 0, 'steps', 0, 'parameters', 2, 'in'],
  },
  {
    rule: 'arazzo-param-querystring-string',
    doc: make(BASE11, (d) => S(d).parameters.push({ name: 'qs', in: 'querystring', value: [1, 2] })),
    path: ['workflows', 0, 'steps', 0, 'parameters', 1, 'value'],
  },
  {
    rule: 'arazzo-reusable-reference-resolved',
    doc: make(BASE11, (d) => S(d).parameters.push({ reference: '$components.parameters.missing' })),
    path: ['workflows', 0, 'steps', 0, 'parameters', 1, 'reference'],
  },
  {
    rule: 'arazzo-reusable-reference-kind',
    doc: make(BASE11, (d) => {
      d.components = { parameters: { p: { name: 'p', in: 'header', value: 'x' } } };
      S(d).onSuccess = [{ reference: '$components.parameters.p' }];
    }),
    path: ['workflows', 0, 'steps', 0, 'onSuccess', 0, 'reference'],
  },
  {
    rule: 'arazzo-reusable-value-parameter-only',
    doc: make(BASE11, (d) => {
      d.components = { successActions: { done: { name: 'done', type: 'end' } } };
      S(d).onSuccess = [{ reference: '$components.successActions.done', value: 1 }];
    }),
    path: ['workflows', 0, 'steps', 0, 'onSuccess', 0, 'value'],
  },
  {
    rule: 'arazzo-components-inputs-ref',
    doc: make(BASE11, (d) => {
      d.components = { inputs: { pagination: { type: 'object' } } };
      S(d).parameters.push({ reference: '$components.inputs.pagination' });
    }),
    path: ['workflows', 0, 'steps', 0, 'parameters', 1, 'reference'],
  },
  { rule: 'arazzo-components-ref-resolved', doc: make(BASE11, (d) => (WF(d).inputs = { $ref: '#/components/inputs/nope' })), path: ['workflows', 0, 'inputs', '$ref'] },
  {
    rule: 'arazzo-components-unused',
    doc: make(BASE11, (d) => (d.components = { parameters: { unusedParam: { name: 'u', in: 'header', value: 'x' } } })),
    path: ['components', 'parameters', 'unusedParam'],
  },
  // ── c.8 Criteria, selectors, replacements
  { rule: 'arazzo-criterion-context-required', doc: make(BASE11, (d) => (S(d).successCriteria = [{ condition: '^2', type: 'regex' }])), path: ['workflows', 0, 'steps', 0, 'successCriteria', 0, 'context'] },
  {
    rule: 'arazzo-criterion-type-enum',
    doc: make(BASE11, (d) => (S(d).successCriteria = [{ context: '$response.body', condition: '/a', type: 'jsonpointer' }])),
    path: ['workflows', 0, 'steps', 0, 'successCriteria', 0, 'type'],
  },
  {
    rule: 'arazzo-criterion-eto-jsonpointer',
    doc: make(BASE11, (d) => (S(d).successCriteria = [{ context: '$response.body', condition: '/a', type: { type: 'jsonpointer', version: 'rfc6901' } }])),
    path: ['workflows', 0, 'steps', 0, 'successCriteria', 0, 'type'],
  },
  {
    rule: 'arazzo-criterion-syntax',
    doc: make(BASE11, (d) => (S(d).successCriteria = [{ context: '$response.body', condition: '$[?(@.a==', type: 'jsonpath' }])),
    path: ['workflows', 0, 'steps', 0, 'successCriteria', 0, 'condition'],
  },
  {
    rule: 'arazzo-criterion-syntax',
    name: 'simple condition with an unquoted string',
    doc: make(BASE11, (d) => (S(d).successCriteria = [{ condition: '$response.body#/status == available' }])),
    path: ['workflows', 0, 'steps', 0, 'successCriteria', 0, 'condition'],
  },
  {
    rule: 'arazzo-criterion-syntax',
    name: 'invalid regex',
    doc: make(BASE11, (d) => (S(d).successCriteria = [{ context: '$statusCode', condition: '^(2', type: 'regex' }])),
    path: ['workflows', 0, 'steps', 0, 'successCriteria', 0, 'condition'],
  },
  {
    rule: 'arazzo-criterion-embedded-expression',
    doc: make(BASE11, (d) => (S(d).successCriteria = [{ context: '$response.body', condition: '$[?@.id == $inputs.orderId]', type: 'jsonpath' }])),
    path: ['workflows', 0, 'steps', 0, 'successCriteria', 0, 'condition'],
  },
  { rule: 'arazzo-success-criteria-non-empty', doc: make(BASE11, (d) => (S(d).successCriteria = [])), path: ['workflows', 0, 'steps', 0, 'successCriteria'] },
  {
    rule: 'arazzo-eto-version',
    doc: make(BASE11, (d) => (S(d).successCriteria = [{ context: '$response.body', condition: '//a', type: { type: 'xpath', version: 'rfc9535' } }])),
    path: ['workflows', 0, 'steps', 0, 'successCriteria', 0, 'type', 'version'],
  },
  {
    rule: 'arazzo-selector-required-fields',
    doc: make(BASE11, (d) => (S(d).outputs.sel = { context: '$response.body', selector: '$.a' })),
    path: ['workflows', 0, 'steps', 0, 'outputs', 'sel', 'type'],
  },
  {
    rule: 'arazzo-selector-context-structured',
    doc: make(BASE11, (d) => (S(d).outputs.sel = { context: '$statusCode', selector: '/a', type: 'jsonpointer' })),
    path: ['workflows', 0, 'steps', 0, 'outputs', 'sel', 'context'],
  },
  {
    rule: 'arazzo-selector-syntax',
    doc: make(BASE11, (d) => (S(d).outputs.sel = { context: '$response.body', selector: '$.a', type: 'jsonpointer' })),
    path: ['workflows', 0, 'steps', 0, 'outputs', 'sel', 'selector'],
  },
  {
    rule: 'arazzo-selector-syntax',
    name: 'RFC 9535 jsonpath',
    doc: make(BASE11, (d) => (S(d).outputs.sel = { context: '$response.body', selector: '$.items[?@.price >]', type: 'jsonpath' })),
    path: ['workflows', 0, 'steps', 0, 'outputs', 'sel', 'selector'],
  },
  {
    rule: 'arazzo-selector-misplaced',
    doc: make(BASE11, (d) => {
      d.components = { parameters: { p: { name: 'p', in: 'header', value: 'x' } } };
      S(d).parameters.push({ reference: '$components.parameters.p', value: { context: '$response.body', selector: '/a', type: 'jsonpointer' } });
    }),
    path: ['workflows', 0, 'steps', 0, 'parameters', 1, 'value'],
  },
  {
    rule: 'arazzo-replacement-target-syntax',
    doc: make(BASE11, (d) => (S(d).requestBody = { contentType: 'application/json', payload: { a: { b: 1 } }, replacements: [{ target: 'a.b', value: '$inputs.orderId' }] })),
    path: ['workflows', 0, 'steps', 0, 'requestBody', 'replacements', 0, 'target'],
  },
  {
    rule: 'arazzo-replacement-literal-value',
    doc: make(BASE11, (d) => (S(d).requestBody = { contentType: 'application/json', payload: { a: 1 }, replacements: [{ target: '/a', value: 10 }] })),
    path: ['workflows', 0, 'steps', 0, 'requestBody', 'replacements', 0, 'value'],
  },
  // ── c.9 Runtime expressions
  { rule: 'arazzo-expression-syntax', doc: make(BASE11, (d) => (S(d).outputs.bad = '$step.a.outputs.b')), path: ['workflows', 0, 'steps', 0, 'outputs', 'bad'] },
  {
    rule: 'arazzo-expression-syntax',
    name: '$message.payload.orderId (non-ABNF, warning)',
    doc: make(BASE11, (d) => (S(d, 1).outputs.id = '$message.payload.orderId')),
    path: ['workflows', 0, 'steps', 1, 'outputs', 'id'],
    severity: 'warning',
  },
  { rule: 'arazzo-expression-steps-resolved', doc: make(BASE11, (d) => (WF(d).outputs.x = '$steps.create.outputs.nope')), path: ['workflows', 0, 'outputs', 'x'] },
  { rule: 'arazzo-expression-workflows-resolved', doc: make(BASE11, (d) => (WF(d).outputs.x = '$workflows.nope.outputs.x')), path: ['workflows', 0, 'outputs', 'x'] },
  { rule: 'arazzo-expression-inputs-declared', doc: make(BASE11, (d) => (S(d).parameters[0].value = '$inputs.ordreId')), path: ['workflows', 0, 'steps', 0, 'parameters', 0, 'value'] },
  { rule: 'arazzo-expression-source-resolved', doc: make(BASE11, (d) => (S(d).outputs.u = '$sourceDescriptions.petsore.url')), path: ['workflows', 0, 'steps', 0, 'outputs', 'u'] },
  {
    rule: 'arazzo-expression-source-resolved',
    name: 'operationId on an unknown source',
    doc: make(BASE11, (d) => (S(d).operationId = '$sourceDescriptions.nope.createOrder')),
    path: ['workflows', 0, 'steps', 0, 'operationId'],
  },
  { rule: 'arazzo-expression-components-resolved', doc: make(BASE11, (d) => (S(d).parameters[0].value = '$components.parameters.nope')), path: ['workflows', 0, 'steps', 0, 'parameters', 0, 'value'] },
  {
    rule: 'arazzo-expression-self-defined',
    doc: make(BASE11, (d) => {
      delete d.$self;
      S(d).parameters.push({ name: 'X-Self', in: 'header', value: '{$self}' });
    }),
    path: ['workflows', 0, 'steps', 0, 'parameters', 1, 'value'],
  },
  { rule: 'arazzo-expression-message-context', doc: make(BASE11, (d) => (S(d).outputs.m = '$message.payload')), path: ['workflows', 0, 'steps', 0, 'outputs', 'm'] },
  // ── c.10 Sources
  { rule: 'arazzo-source-url-uri-reference', doc: make(BASE11, (d) => (d.sourceDescriptions[0].url = 'ht tp://x')), path: ['sourceDescriptions', 0, 'url'] },
  { rule: 'arazzo-source-unused', doc: make(BASE11, (d) => d.sourceDescriptions.push({ name: 'legacy', url: './legacy.yaml', type: 'openapi' })), path: ['sourceDescriptions', 2] },
];

describe('base documents', () => {
  it('BASE11 has no error nor warning', () => {
    const diags = run(BASE11).filter((d) => d.severity === 'error' || d.severity === 'warning');
    expect(format(diags)).toBe('');
  });
  it('BASE10 has no error nor warning', () => {
    const diags = run(BASE10).filter((d) => d.severity === 'error' || d.severity === 'warning');
    expect(format(diags)).toBe('');
  });
});

describe('rules (one or more cases per rule)', () => {
  for (const c of cases) {
    it(`${c.rule}${c.name ? ` — ${c.name}` : ''}`, () => {
      const diags = run(c.doc);
      const hit = diags.filter((d) => d.code === c.rule && (!c.path || JSON.stringify(d.path) === JSON.stringify(c.path)));
      expect(hit.length, `expected ${c.rule} at ${JSON.stringify(c.path)}; got:\n${format(diags)}`).toBe(1);
      expect(hit[0]!.severity).toBe(c.severity ?? RULES[c.rule].severity);
      expect(duplicates(diags)).toEqual([]);
    });
  }

  it('every implemented rule has at least one test case', () => {
    const tested = new Set(cases.map((c) => c.rule));
    const implemented = (Object.keys(RULES) as RuleId[]).filter((r) => RULES[r].implemented);
    expect(implemented.filter((r) => !tested.has(r))).toEqual([]);
  });

  it('unimplemented rules all need source documents', () => {
    const missing = (Object.keys(RULES) as RuleId[]).filter((r) => !RULES[r].implemented);
    expect(missing.sort()).toEqual(
      [
        'arazzo-async-action-mismatch',
        'arazzo-expression-components-scope',
        'arazzo-param-resolved',
        'arazzo-source-identity',
        'arazzo-source-type-mismatch',
        'arazzo-source-unresolvable',
        'arazzo-step-operation-resolved',
        'arazzo-step-prefer-operation-id',
      ].sort(),
    );
  });
});

describe('noise control', () => {
  it('two step targets produce a single diagnostic (no oneOf cascade)', () => {
    const diags = run(make(BASE11, (d) => (S(d).workflowId = 'main')));
    expect(diags.filter((d) => d.severity === 'error').map((d) => d.code)).toEqual(['arazzo-step-target-exclusive']);
  });
  it('a 1.1 feature in a 1.0 document replaces the schema error', () => {
    const diags = run(make(BASE10, (d) => (S(d).timeout = 5000)));
    expect(diags.map((d) => d.code)).toEqual(['arazzo-version-feature-mismatch']);
  });
  it('asyncapi source + channelPath + action in 1.0 → one diagnostic per feature, no unknown-field', () => {
    const doc = make(BASE10, (d) => {
      d.sourceDescriptions.push({ name: 'ev', url: './ev.yaml', type: 'asyncapi' });
      WF(d).steps.push({ stepId: 'wait', channelPath: '{$sourceDescriptions.ev.url}#/channels/a', action: 'receive' });
    });
    const diags = run(doc);
    expect(diags.filter((d) => d.code === 'arazzo-unknown-field')).toEqual([]);
    expect(diags.filter((d) => d.code === 'arazzo-version-feature-mismatch').map((d) => d.path.join('.'))).toEqual([
      'sourceDescriptions.1.type',
      'workflows.0.steps.1.channelPath',
      'workflows.0.steps.1.action',
    ]);
  });
  it('Criterion Expression Type Object is accepted in 1.0 (neutralised S10 defect)', () => {
    const doc = make(BASE10, (d) => (S(d).successCriteria = [{ context: '$response.body', condition: '$.name', type: { type: 'jsonpath', version: 'draft-goessner-dispatch-jsonpath-00' } }]));
    expect(run(doc).filter((d) => d.severity === 'error')).toEqual([]);
  });
  it('a non-string PayloadReplacement.value is not a schema error in 1.1 (neutralised S11 defect)', () => {
    const doc = make(BASE11, (d) => (S(d).requestBody = { contentType: 'application/json', payload: { a: 1 }, replacements: [{ target: '/a', value: 10 }] }));
    expect(run(doc).filter((d) => d.severity === 'error')).toEqual([]);
  });
  it('a workflow step does not require "in" on its parameters', () => {
    const doc = make(BASE11, (d) => {
      secondWorkflow(d);
      WF(d).steps.push({ stepId: 'sub', workflowId: 'other', parameters: [{ name: 'token', value: '$inputs.orderId' }] });
    });
    expect(format(run(doc).filter((d) => d.severity === 'error' || d.severity === 'warning'))).toBe('');
  });
  it('non-object documents are reported once', () => {
    expect(run('hello').map((d) => d.code)).toEqual(['arazzo-schema']);
    expect(run([1, 2]).map((d) => d.code)).toEqual(['arazzo-schema']);
  });
  it('minSeverity filters infos', async () => {
    const { validate } = await import('../src/index.js');
    const doc = make(BASE11, (d) => delete d.$self);
    expect(validate(doc).some((d) => d.severity === 'info')).toBe(true);
    expect(validate(doc, { minSeverity: 'warning' }).some((d) => d.severity === 'info')).toBe(false);
  });
});
