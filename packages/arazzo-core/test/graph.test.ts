import { describe, expect, it } from 'vitest';
import { graphToMermaid, operationFromPath, parseArazzo, workflowToGraph } from '../src/index.js';
import type { WorkflowGraph } from '../src/index.js';
import { BASE11, fixture, make } from './helpers.js';

const load = (...p: string[]) => parseArazzo(fixture(...p)).doc;
const edgesOf = (g: WorkflowGraph, kind: string) => g.edges.filter((e) => e.kind === kind);
const edge = (g: WorkflowGraph, kind: string, source: string, target: string) => g.edges.find((e) => e.kind === kind && e.source === source && e.target === target);

describe('workflowToGraph — pet-adoption (1.0.1, HTTP)', () => {
  const doc = load('fixtures', 'vscode', 'pet-adoption.arazzo.yaml');
  const g = workflowToGraph(doc, 'adopt-pet-with-error-handling');

  it('builds input, step, output and failure nodes', () => {
    expect(g.nodes[0]).toMatchObject({ id: 'input', kind: 'input' });
    expect(g.nodes.find((n) => n.id === 'input')!.properties!.filter((p) => p.required).map((p) => p.name)).toEqual(['username', 'password']);
    expect(g.nodes.filter((n) => n.kind === 'step-http')).toHaveLength(9);
    expect(g.nodes.some((n) => n.kind === 'output')).toBe(true);
    expect(g.nodes.some((n) => n.kind === 'end-failure')).toBe(true);
    expect(g.nodes.some((n) => n.kind === 'end-success')).toBe(false); // outputs act as success terminal
  });

  it('never guesses the HTTP method from the operationId', () => {
    for (const n of g.nodes.filter((x) => x.step)) expect(n.step!.method).toBeUndefined();
  });

  it('uses the optional operation resolver', () => {
    const resolved = workflowToGraph(doc, 'adopt-pet-with-error-handling', {
      resolveOperation: (step, source) => (step.operationId === 'petStoreApi.loginUser' && source?.name === 'petStoreApi' ? { method: 'get', path: '/user/login' } : undefined),
    });
    const login = resolved.nodes.find((n) => n.id === 'step:login')!;
    expect(login.step).toMatchObject({ method: 'GET', path: '/user/login', methodSource: 'resolver' });
  });

  it('draws success/failure gotos, retry with limit and delay, and end', () => {
    expect(edge(g, 'success-goto', 'step:findAvailablePets', 'step:getPetDetails')).toMatchObject({ conditional: true, label: '✓ petsFound' });
    expect(edge(g, 'failure-goto', 'step:getPetDetails', 'step:findAvailablePets')).toMatchObject({ label: '✗ petNotFound', outcome: 'failure' });
    expect(edge(g, 'retry', 'step:placeOrderWithCoupon', 'step:placeOrderWithCoupon')).toMatchObject({ retryLimit: 3, retryAfter: 5, retryLimitIsDefault: false, label: '↻ ×3 · 5 s' });
    expect(edge(g, 'end', 'step:login', 'end-failure')).toMatchObject({ outcome: 'failure', conditional: true });
    expect(edge(g, 'end', 'step:handleNoPets', 'output')).toMatchObject({ outcome: 'success', label: '✓ end' });
  });

  it('keeps the implicit sequence when success actions are conditional', () => {
    expect(edge(g, 'sequence', 'input', 'step:login')).toBeDefined();
    expect(edge(g, 'sequence', 'step:findAvailablePets', 'step:handleNoPets')).toBeDefined();
    expect(edge(g, 'sequence', 'step:endWithError', 'output')).toBeDefined();
  });

  it('groups steps by source description', () => {
    expect(g.groups.map((x) => x.id)).toEqual(['lane:petStoreApi', 'lane:workflow']);
    expect(g.groups[0]).toMatchObject({ kind: 'source', sourceType: 'openapi' });
    expect(g.groups[0]!.nodeIds).toHaveLength(9);
  });

  it('has unique node and edge ids and only valid endpoints', () => {
    const ids = new Set(g.nodes.map((n) => n.id));
    expect(ids.size).toBe(g.nodes.length);
    expect(new Set(g.edges.map((e) => e.id)).size).toBe(g.edges.length);
    for (const e of g.edges) {
      expect(ids.has(e.source)).toBe(true);
      expect(ids.has(e.target)).toBe(true);
    }
  });

  it('second workflow: unconditional end is absent, sequence to output', () => {
    const g2 = workflowToGraph(doc, 'quick-pet-search');
    expect(edge(g2, 'end', 'step:authenticate', 'end-failure')).toBeDefined();
    expect(edge(g2, 'sequence', 'step:listPets', 'output')).toBeDefined();
  });

  it('exposes the workflow position in `workflows` (diagnostic paths → nodes)', () => {
    expect(g.workflowIndex).toBe(0);
    expect(workflowToGraph(doc, 'quick-pet-search').workflowIndex).toBe(1);
    // Raw array position, even when a malformed entry precedes the workflow.
    const odd = { ...(doc as object), workflows: [null, ...((doc as { workflows: unknown[] }).workflows)] };
    expect(workflowToGraph(odd, 'quick-pet-search').workflowIndex).toBe(2);
  });
});

describe('workflowToGraph — order-to-cash (1.1, async)', () => {
  const doc = load('corpus', 'valid-order-to-cash.arazzo.yaml');
  const g = workflowToGraph(doc, 'orderToCash');
  const node = (id: string) => g.nodes.find((n) => n.id === id)!;

  it('types async steps and keeps their metadata', () => {
    expect(node('step:awaitConfirmation')).toMatchObject({ kind: 'step-async-receive', group: 'lane:events' });
    expect(node('step:awaitConfirmation').step).toMatchObject({ action: 'receive', timeout: 6000, correlationId: '$steps.createOrder.outputs.orderId' });
    expect(node('step:publishCompleted').kind).toBe('step-async-send');
    expect(node('step:awaitInvoice').kind).toBe('step-async-receive'); // operationId + action on an asyncapi source
  });

  it('reads the HTTP method from operationPath', () => {
    expect(node('step:createOrder').step).toMatchObject({ method: 'POST', path: '/orders', methodSource: 'operationPath' });
    expect(node('step:pay').step!.method).toBeUndefined();
  });

  it('creates a join node for two dependencies', () => {
    expect(node('join:publishCompleted')).toMatchObject({ kind: 'join', waitsFor: ['step:awaitInvoice', 'step:awaitShipment'] });
    expect(edge(g, 'depends-on', 'step:awaitInvoice', 'join:publishCompleted')).toBeDefined();
    expect(edge(g, 'depends-on', 'step:awaitShipment', 'join:publishCompleted')).toBeDefined();
    expect(edge(g, 'depends-on', 'join:publishCompleted', 'step:publishCompleted')).toBeDefined();
    // single dependency: direct edge, no join
    expect(edge(g, 'depends-on', 'step:pay', 'step:awaitInvoice')).toBeDefined();
    expect(g.nodes.filter((n) => n.kind === 'join')).toHaveLength(1);
  });

  it('replaces the sequence edge by the dependency when the predecessor is a dependency', () => {
    expect(edge(g, 'sequence', 'step:pay', 'step:awaitInvoice')).toBeUndefined();
    expect(edge(g, 'sequence', 'step:awaitShipment', 'step:publishCompleted')).toBeUndefined();
  });

  it('keeps fan-out siblings parallel (M3: no sequence into a step that declares dependsOn)', () => {
    // awaitInvoice and awaitShipment both depend on pay: no edge between them.
    expect(edge(g, 'sequence', 'step:awaitInvoice', 'step:awaitShipment')).toBeUndefined();
    expect(g.edges.filter((e) => e.target === 'step:awaitShipment').map((e) => [e.kind, e.source])).toEqual([['depends-on', 'step:pay']]);
    expect(g.edges.filter((e) => e.target === 'step:awaitInvoice').map((e) => [e.kind, e.source])).toEqual([['depends-on', 'step:pay']]);
    // No sequence edge targets a step that declares dependsOn.
    const withDeps = new Set(g.nodes.filter((n) => n.step?.dependsOn?.length).map((n) => n.id));
    expect(g.edges.filter((e) => e.kind === 'sequence' && withDeps.has(e.target))).toEqual([]);
  });

  it('builds lanes in source order with a neutral workflow lane', () => {
    expect(g.groups.map((x) => [x.id, x.sourceType ?? x.kind])).toEqual([
      ['lane:shop', 'openapi'],
      ['lane:events', 'asyncapi'],
      ['lane:workflow', 'workflow'],
    ]);
    expect(g.groups.find((x) => x.id === 'lane:workflow')!.nodeIds).toContain('join:publishCompleted');
  });
});

describe('workflowToGraph — implicit sequence and dependsOn', () => {
  const steps = (...list: Record<string, unknown>[]) =>
    make(BASE11, (d) => {
      d.workflows[0].steps = list.map((s) => ({ operationId: '$sourceDescriptions.api.op', ...s }));
      d.workflows[0].outputs = { done: '$steps.a.outputs.x' };
    });
  const seq = (g: WorkflowGraph) => edgesOf(g, 'sequence').map((e) => `${e.source}->${e.target}`);

  it('steps without dependsOn keep the usual sequence', () => {
    const g = workflowToGraph(steps({ stepId: 'a' }, { stepId: 'b' }, { stepId: 'c' }), 'main');
    expect(seq(g)).toEqual(['input->step:a', 'step:a->step:b', 'step:b->step:c', 'step:c->output']);
  });

  it('fan-out then join: parallel branches, join before the closing step', () => {
    const g = workflowToGraph(
      steps({ stepId: 'a' }, { stepId: 'b', dependsOn: ['a'] }, { stepId: 'c', dependsOn: ['a'] }, { stepId: 'd', dependsOn: ['b', 'c'] }, { stepId: 'e' }),
      'main',
    );
    expect(seq(g)).toEqual(['input->step:a', 'step:d->step:e', 'step:e->output']);
    expect(edgesOf(g, 'depends-on').map((e) => `${e.source}->${e.target}`)).toEqual([
      'step:a->step:b',
      'step:a->step:c',
      'step:b->join:d',
      'step:c->join:d',
      'join:d->step:d',
    ]);
  });

  it('a step does not emit a sequence into a next step that depends on another one', () => {
    const g = workflowToGraph(steps({ stepId: 'a' }, { stepId: 'b' }, { stepId: 'c', dependsOn: ['a'] }), 'main');
    expect(edge(g, 'sequence', 'step:b', 'step:c')).toBeUndefined();
    expect(edge(g, 'depends-on', 'step:a', 'step:c')).toBeDefined();
    expect(seq(g)).toEqual(['input->step:a', 'step:a->step:b', 'step:c->output']);
  });

  it('a dependency on another workflow step also replaces the sequence', () => {
    const doc = steps({ stepId: 'a' }, { stepId: 'b', dependsOn: ['$workflows.main.steps.a'] });
    const g = workflowToGraph(doc, 'main');
    expect(edge(g, 'sequence', 'step:a', 'step:b')).toBeUndefined();
    expect(edge(g, 'depends-on', 'ref:main/steps/a', 'step:b')).toBeDefined();
  });

  it('keeps the sequence when no dependsOn entry resolves (invalid document)', () => {
    const g = workflowToGraph(steps({ stepId: 'a' }, { stepId: 'b', dependsOn: ['nope'] }), 'main');
    expect(edge(g, 'sequence', 'step:a', 'step:b')).toBeDefined();
  });

  it('an unconditional goto or end still suppresses the sequence', () => {
    const g = workflowToGraph(steps({ stepId: 'a', onSuccess: [{ name: 'stop', type: 'end' }] }, { stepId: 'b' }), 'main');
    expect(edge(g, 'sequence', 'step:a', 'step:b')).toBeUndefined();
  });
});

describe('workflowToGraph — reusable actions, workflow calls, workflow-level actions', () => {
  it('resolves $components failure actions (retry via a workflow)', () => {
    const g = workflowToGraph(load('corpus', 'valid-session-renewal.arazzo.yaml'), 'listCustomers');
    const loop = edge(g, 'retry', 'step:search', 'step:search')!;
    expect(loop).toMatchObject({ retryLimit: 1, conditional: true, action: { name: 'renewOn401', origin: 'step', component: 'renewOn401' } });
    expect(edge(g, 'retry', 'step:search', 'ref:renewSession')).toMatchObject({ via: true, label: '↻ via renewSession' });
    expect(g.nodes.find((n) => n.id === 'ref:renewSession')!.ref).toMatchObject({ workflowId: 'renewSession', external: false, resolved: true, stepCount: 1 });
    // goto backwards (self loop) and unconditional end (no sequence edge afterwards)
    expect(edge(g, 'success-goto', 'step:nextPage', 'step:nextPage')).toBeDefined();
    expect(edge(g, 'end', 'step:nextPage', 'output')).toMatchObject({ conditional: false });
    expect(edge(g, 'sequence', 'step:nextPage', 'output')).toBeUndefined();
  });

  it('applies workflow-level actions (origin "workflow"), unless disabled', () => {
    const doc = make(BASE11, (d) => {
      d.workflows[0].failureActions = [{ name: 'abort', type: 'end' }];
      d.workflows[0].successActions = [{ name: 'stop', type: 'end', criteria: [{ condition: '$statusCode == 204' }] }];
    });
    const g = workflowToGraph(doc, 'main');
    expect(edge(g, 'end', 'step:create', 'end-failure')!.action).toMatchObject({ name: 'abort', origin: 'workflow' });
    expect(g.nodes.find((n) => n.id === 'step:create')!.step!.usesWorkflowActions).toBe(true);
    const off = workflowToGraph(doc, 'main', { includeWorkflowActions: false });
    expect(edgesOf(off, 'end')).toEqual([]);
  });

  it('step-level actions override workflow-level actions with the same name', () => {
    const doc = make(BASE11, (d) => {
      d.workflows[0].failureActions = [{ name: 'abort', type: 'end' }];
      d.workflows[0].steps[0].onFailure = [{ name: 'abort', type: 'retry', retryLimit: 2 }];
    });
    const g = workflowToGraph(doc, 'main');
    expect(edge(g, 'retry', 'step:create', 'step:create')).toBeDefined();
    expect(edge(g, 'end', 'step:create', 'end-failure')).toBeUndefined();
  });

  it('draws workflow calls and transfers to local and external workflows', () => {
    const doc = make(BASE11, (d) => {
      d.sourceDescriptions.push({ name: 'shared', url: './shared.arazzo.yaml', type: 'arazzo' });
      d.workflows.push({ workflowId: 'audit', steps: [{ stepId: 'log', operationId: '$sourceDescriptions.api.log' }] });
      d.workflows[0].steps.push({ stepId: 'callAudit', workflowId: 'audit' });
      d.workflows[0].steps.push({ stepId: 'callShared', workflowId: '$sourceDescriptions.shared.notify', onFailure: [{ name: 'fallback', type: 'goto', workflowId: 'audit' }] });
    });
    const g = workflowToGraph(doc, 'main');
    expect(g.nodes.find((n) => n.id === 'step:callAudit')).toMatchObject({ kind: 'step-workflow', group: 'lane:workflow' });
    expect(g.nodes.find((n) => n.id === 'step:callShared')).toMatchObject({ kind: 'step-workflow', group: 'lane:shared', step: { external: true } });
    expect(edge(g, 'workflow-call', 'step:callAudit', 'ref:audit')).toMatchObject({ label: '⇢ audit' });
    expect(edge(g, 'workflow-call', 'step:callShared', 'ref:$sourceDescriptions.shared.notify')).toBeDefined();
    expect(g.nodes.find((n) => n.id === 'ref:$sourceDescriptions.shared.notify')!.ref).toMatchObject({ external: true, sourceName: 'shared', workflowId: 'notify' });
    expect(edge(g, 'failure-goto', 'step:callShared', 'ref:audit')).toMatchObject({ transfer: true });
  });

  it('optional implicit failures', () => {
    const g = workflowToGraph(BASE11, 'main', { includeImplicitFailures: true });
    expect(edgesOf(g, 'end').filter((e) => e.implicit)).toHaveLength(2);
  });

  it('throws on an unknown workflow', () => {
    expect(() => workflowToGraph(BASE11, 'nope')).toThrow(/Workflow not found/);
  });
});

describe('graphToMermaid', () => {
  const g = workflowToGraph(load('corpus', 'valid-order-to-cash.arazzo.yaml'), 'orderToCash');
  it('renders shapes, labels and link styles', () => {
    const m = graphToMermaid(g);
    expect(m.startsWith('flowchart TB')).toBe(true);
    expect(m).toContain('n_step_createOrder["1. POST createOrder"]:::step_http');
    expect(m).toContain('n_step_publishCompleted>"6. SEND publishCompleted"]:::step_async_send');
    expect(m).toContain('n_join_publishCompleted{"+"}:::join');
    expect(m).toContain('n_step_pay -.->|"↻ ×3 · 2 s"| n_step_pay');
    expect(m.match(/linkStyle \d+/g)).toHaveLength(g.edges.length);
  });
  it('supports lanes, direction and hiding failures', () => {
    const m = graphToMermaid(g, { lanes: true, direction: 'LR', hideFailures: true });
    expect(m.startsWith('flowchart LR')).toBe(true);
    expect(m).toContain('subgraph lane_1["events (asyncapi)"]');
    expect(m).not.toContain('↻');
    expect(m).not.toContain('✗ end');
  });
  it('escapes quotes and angle brackets', () => {
    const doc = make(BASE11, (d) => (d.workflows[0].steps[0].stepId = 'a"<b>'));
    const m = graphToMermaid(workflowToGraph(doc, 'main'));
    expect(m).toContain('a#quot;#lt;b#gt;');
    expect(m).not.toContain('<b>');
  });
});

describe('operationFromPath', () => {
  it.each([
    ['{$sourceDescriptions.api.url}#/paths/~1pets~1{petId}/get', 'GET', '/pets/{petId}'],
    ['{$sourceDescriptions.api.url}#/paths/~1orders/POST', 'POST', '/orders'],
    ['{$sourceDescriptions.api.url}#/paths/%7E1a/patch', 'PATCH', '/a'],
  ])('%s', (p, method, path) => expect(operationFromPath(p)).toEqual({ method, path }));
  it('returns undefined when the method is unknown', () => {
    expect(operationFromPath('{$sourceDescriptions.api.url}#/paths/~1a')).toBeUndefined();
    expect(operationFromPath('nope')).toBeUndefined();
  });
});
