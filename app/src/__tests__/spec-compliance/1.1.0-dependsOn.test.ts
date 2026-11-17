import { workflowToGraph } from '@connethics/arazzo-core';
import { parseArazzoSpec, parseAndValidate, diagnosticTarget } from '@/lib/arazzo-parser';

/**
 * Arazzo Specification 1.1.0 Compliance Tests — Step `dependsOn` (§5.8.5): join points,
 * resolution, self-dependency and cycle detection; graph model (join node).
 */

const doc = (steps: string) => `
arazzo: 1.1.0
$self: https://example.com/depends.arazzo.yaml
info:
  title: dependsOn test
  version: 1.0.0
sourceDescriptions:
  - name: shop
    url: ./openapi.yaml
    type: openapi
workflows:
  - workflowId: fulfil
    steps:
${steps}
`;

const codes = (text: string) => parseAndValidate(text).diagnostics.map((d) => d.code);

describe('Arazzo Spec 1.1.0 - Step dependsOn', () => {
  const fanOutJoin = doc(`
      - stepId: pay
        operationId: pay
      - stepId: invoice
        operationId: createInvoice
        dependsOn: [pay]
      - stepId: ship
        operationId: createShipment
        dependsOn: [pay]
      - stepId: close
        operationId: closeOrder
        dependsOn: [invoice, ship]
`);

  it('parses dependsOn arrays', () => {
    const steps = parseArazzoSpec(fanOutJoin).workflows[0].steps;
    expect(steps[3].dependsOn).toEqual(['invoice', 'ship']);
  });

  it('validates a fan-out / join without errors', () => {
    expect(parseAndValidate(fanOutJoin).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  });

  it('builds a join node for a step with several prerequisites', () => {
    const graph = workflowToGraph(parseArazzoSpec(fanOutJoin), 'fulfil');
    expect(graph.nodes.some((n) => n.kind === 'join')).toBe(true);
    expect(graph.edges.filter((e) => e.kind === 'depends-on').length).toBeGreaterThanOrEqual(3);
  });

  it('reports an unknown dependency and points at the step', () => {
    const text = doc(`
      - stepId: close
        operationId: closeOrder
        dependsOn: [missing]
`);
    const result = parseAndValidate(text);
    const diag = result.diagnostics.find((d) => d.code === 'arazzo-step-depends-on-resolved');
    expect(diag).toBeDefined();
    expect(diagnosticTarget(result.spec!, diag!.path)).toEqual({ workflowIndex: 0, stepId: 'close' });
  });

  it('reports a self dependency', () => {
    expect(codes(doc(`
      - stepId: loop
        operationId: op
        dependsOn: [loop]
`))).toContain('arazzo-step-depends-on-self');
  });

  it('detects dependency cycles', () => {
    expect(codes(doc(`
      - stepId: a
        operationId: opA
        dependsOn: [b]
      - stepId: b
        operationId: opB
        dependsOn: [a]
`))).toContain('arazzo-step-depends-on-cycle');
  });
});
