import { describe, expect, it } from 'vitest';
import { validate, workflowToGraph } from '@connethics/arazzo-core';
import { toViewGraph, diagnosticsByNode } from '../src/adapt';
import { visibleGraph } from '../src/visible';
import { CATALOGUE, O2C, PET, SESSION, load } from './fixtures';

const kinds = (g: ReturnType<typeof toViewGraph>) => [...new Set(g.edges.map((e) => e.kind))].sort();

describe('toViewGraph — catalogue (every kind)', () => {
  const core = workflowToGraph(CATALOGUE, 'main', { includeImplicitFailures: true });
  const v = toViewGraph(core);

  it('maps every core node kind', () => {
    const byId = new Map(v.nodes.map((n) => [n.id, n]));
    expect(byId.get('input')).toMatchObject({ kind: 'input', inputs: [{ name: 'id', required: true }, { name: 'page', default: 1 }] });
    expect(byId.get('step:create')).toMatchObject({ kind: 'step', stepKind: 'http', method: 'POST', path: '/orders', methodSource: 'operationPath', order: 1, source: 'api' });
    expect(byId.get('step:await')).toMatchObject({ stepKind: 'async-receive', timeoutMs: 6000, correlationId: '$steps.create.outputs.id', channel: expect.stringContaining('orderConfirmed') });
    expect(byId.get('step:notify')).toMatchObject({ stepKind: 'async-send', hasRequestBody: true });
    expect(byId.get('step:audit')).toMatchObject({ stepKind: 'workflow', external: true, targetWorkflowId: '$sourceDescriptions.flows.logAccess' });
    expect(byId.get('step:invoice')).toMatchObject({ methodSource: 'unresolved' });
    expect(byId.get('join:notify')).toMatchObject({ kind: 'junction' });
    expect(byId.get('end-failure')).toMatchObject({ kind: 'end', endType: 'failure' });
    expect(byId.get('output')!.workflowOutputs).toEqual([
      { name: 'orderId', expression: '$steps.create.outputs.id' },
      { name: 'firstItem', selector: { context: '$response.body', selector: '$.items[0]', type: 'jsonpath', version: 'rfc9535' } },
    ]);
    expect(v.nodes.filter((n) => n.kind === 'workflow-ref').map((n) => n.label).sort()).toEqual(['logAccess', 'support']);
  });

  it('maps every edge kind with its ports', () => {
    expect(kinds(v)).toEqual(['depends-on', 'end-failure', 'end-success', 'failure', 'implicit-failure', 'retry', 'sequence', 'success', 'transfer', 'workflow-call']);
    const e = (kind: string, s: string, t: string) => v.edges.find((x) => x.kind === kind && x.source === s && x.target === t)!;
    expect(e('retry', 'step:create', 'step:create')).toMatchObject({ sourcePort: 'out-retry', targetPort: 'in', retryLimit: 3, retryAfter: 2, name: 'retryCreate' });
    expect(e('end-failure', 'step:await', 'end-failure')).toMatchObject({ sourcePort: 'out-failure', origin: 'onFailure' });
    expect(e('depends-on', 'join:notify', 'step:notify')).toMatchObject({ sourcePort: 'out-next', targetPort: 'in-deps' });
    expect(e('depends-on', 'step:invoice', 'join:notify')).toMatchObject({ targetPort: 'in' });
    expect(e('success', 'step:notify', 'step:create')).toMatchObject({ backward: true, sourcePort: 'out-success', criteria: [{ condition: '$statusCode == 409' }] });
    expect(e('transfer', 'step:notify', 'ref:support')).toMatchObject({ origin: 'onFailure', via: 'support', sourcePort: 'out-failure' });
    expect(e('workflow-call', 'step:audit', 'ref:$sourceDescriptions.flows.logAccess')).toMatchObject({ sourcePort: 'out-call' });
    expect(e('failure', 'step:audit', 'step:create')).toMatchObject({ backward: true });
  });

  it('orders nodes for ELK MODEL_ORDER: input first, join right before its target, terminals last', () => {
    const ids = v.nodes.map((n) => n.id);
    expect(ids[0]).toBe('input');
    expect(ids.indexOf('join:notify')).toBe(ids.indexOf('step:notify') - 1);
    const lastStep = Math.max(...v.nodes.map((n, i) => (n.kind === 'step' ? i : -1)));
    for (const t of ['output', 'end-failure']) expect(ids.indexOf(t)).toBeGreaterThan(lastStep);
  });

  it('derives the sources (lanes) from core groups', () => {
    expect(v.sources).toEqual([
      { name: 'api', type: 'openapi' },
      { name: 'events', type: 'asyncapi' },
      { name: 'flows', type: 'arazzo' },
    ]);
  });
});

describe('toViewGraph — workflow-level actions and sub-workflows (session-renewal)', () => {
  const doc = load(SESSION);
  const core = workflowToGraph(doc, 'listUnpaidInvoices');

  it('reusable retry via renewSession: loop + via edge, reference kept', () => {
    const v = toViewGraph(core);
    const loop = v.edges.find((e) => e.kind === 'retry' && e.source === 'step:listInvoices' && e.target === 'step:listInvoices')!;
    expect(loop).toMatchObject({ reference: 'renewSessionOn401', sourcePort: 'out-retry' });
    const via = v.edges.find((e) => e.kind === 'retry' && e.source === 'step:listInvoices' && e.target !== 'step:listInvoices')!;
    expect(via).toMatchObject({ via: 'renewSession', sourcePort: 'out-failure', target: 'ref:renewSession' });
  });

  it('expands a local sub-workflow inline as a collapsible group', () => {
    const v = toViewGraph(core, { subgraphs: { renewSession: workflowToGraph(doc, 'renewSession') } });
    expect(v.groups).toEqual([{ id: 'group:renewSession', kind: 'workflow', label: 'renewSession', workflowId: 'renewSession' }]);
    const inner = v.nodes.filter((n) => n.groupId === 'group:renewSession');
    expect(inner.map((n) => n.id)).toEqual(['group:renewSession/step:renew']);
    expect(v.nodes.some((n) => n.id === 'ref:renewSession')).toBe(false);
    expect(v.edges.filter((e) => e.target === 'group:renewSession/step:renew').map((e) => e.kind)).toEqual(['retry', 'retry']);
    // Collapsing gives back a reference node with the step count.
    const c = visibleGraph(v, { showFailureEdges: true, showImplicitFailures: false, collapsed: { 'group:renewSession': true } });
    expect(c.nodes.find((n) => n.id === 'group:renewSession:collapsed')).toMatchObject({ kind: 'workflow-ref', collapsed: true, innerStepCount: 1 });
    // Hiding failure edges hides retry and failure paths.
    const nf = visibleGraph(v, { showFailureEdges: false, showImplicitFailures: false, collapsed: {} });
    expect(nf.edges.some((e) => e.kind === 'retry' || e.kind === 'end-failure')).toBe(false);
  });

  it('banner mode folds workflow-level actions; edges mode draws them', () => {
    const doc2 = {
      ...CATALOGUE,
      workflows: [
        {
          workflowId: 'w',
          failureActions: [{ name: 'throttled', type: 'retry', retryLimit: 2, retryAfter: 1, criteria: [{ condition: '$statusCode == 429' }] }],
          steps: [{ stepId: 'a', operationId: 'x' }, { stepId: 'b', operationId: 'y' }],
        },
      ],
    };
    const g = workflowToGraph(doc2, 'w');
    const banner = toViewGraph(g);
    expect(banner.defaults?.failureActions).toEqual([{ name: 'throttled', type: 'retry', outcome: 'failure', retryLimit: 2, retryAfter: 1, criteria: [{ condition: '$statusCode == 429' }] }]);
    expect(banner.edges.some((e) => e.kind === 'retry')).toBe(false);
    expect(banner.nodes.filter((n) => n.usesWorkflowDefaults).map((n) => n.stepId)).toEqual(['a', 'b']);
    const edges = toViewGraph(g, { workflowActions: 'edges' });
    expect(edges.defaults).toBeUndefined();
    expect(edges.edges.filter((e) => e.kind === 'retry' && e.origin === 'workflowDefault')).toHaveLength(2);
  });
});

describe('diagnostics → nodes', () => {
  it('attaches core diagnostics by JSON path (workflowIndex + step index)', () => {
    const doc = structuredClone(CATALOGUE) as typeof CATALOGUE;
    (doc.workflows[0]!.steps[2] as Record<string, unknown>).operationPath = 'x'; // invoice: two targets
    const diags = validate(doc);
    const g = workflowToGraph(doc, 'main');
    const map = diagnosticsByNode(g, diags);
    expect(map.get('step:invoice')?.map((d) => d.code)).toContain('arazzo-step-target-exclusive');
    const v = toViewGraph(g, { diagnostics: diags });
    expect(v.nodes.find((n) => n.id === 'step:invoice')!.diagnostics!.length).toBeGreaterThan(0);
    expect(v.nodes.find((n) => n.id === 'step:create')!.diagnostics).toBeUndefined();
  });
});

describe('pet-adoption and order-to-cash', () => {
  it('pet-adoption: every node and edge is converted, ids unique', () => {
    const core = workflowToGraph(load(PET), 'adopt-pet-with-error-handling');
    const v = toViewGraph(core);
    expect(new Set(v.nodes.map((n) => n.id)).size).toBe(v.nodes.length);
    expect(v.edges).toHaveLength(core.edges.length);
    expect(v.nodes.filter((n) => n.kind === 'step')).toHaveLength(core.nodes.filter((n) => n.step).length);
  });

  it('order-to-cash: receive step, join, selectors in outputs', () => {
    const doc = load(O2C) as { workflows: { workflowId: string }[] };
    const v = toViewGraph(workflowToGraph(doc, doc.workflows[0]!.workflowId));
    expect(v.nodes.some((n) => n.stepKind === 'async-receive' && n.timeoutMs === 6000)).toBe(true);
    expect(v.nodes.some((n) => n.kind === 'junction')).toBe(true);
    expect(v.nodes.find((n) => n.kind === 'output')!.workflowOutputs!.some((o) => o.selector)).toBe(true);
  });
});
