import { workflowToFlow, parseArazzoSpec } from '@/lib/arazzo-parser';

describe('Rendering Logic - workflowToFlow', () => {
  const simpleSpec = `
arazzo: 1.0.1
info:
  title: Render Test
  version: 1.0.0
sourceDescriptions: []
workflows:
  - workflowId: simple-flow
    steps:
      - stepId: step-1
        operationId: op1
      - stepId: step-2
        operationId: op2
`;

  it('should generate correct nodes for a simple sequence', () => {
    const spec = parseArazzoSpec(simpleSpec);
    const { nodes } = workflowToFlow(spec, 'simple-flow');

    // Expect: Input Node + 2 Step Nodes (no output node defined in spec)
    expect(nodes).toHaveLength(3);
    expect(nodes.map(n => n.id)).toEqual(['input', 'step-1', 'step-2']);
  });

  it('should generate sequential edges by default', () => {
    const spec = parseArazzoSpec(simpleSpec);
    const { edges } = workflowToFlow(spec, 'simple-flow');

    // Expect: Input->Step1, Step1->Step2
    expect(edges).toHaveLength(2);
    expect(edges[0].source).toBe('input');
    expect(edges[0].target).toBe('step-1');
    expect(edges[1].source).toBe('step-1');
    expect(edges[1].target).toBe('step-2');
  });

  const branchingSpec = `
arazzo: 1.0.1
info:
  title: Branching Test
  version: 1.0.0
sourceDescriptions: []
workflows:
  - workflowId: branch-flow
    steps:
      - stepId: start
        operationId: op1
        onSuccess:
          - name: skip
            type: goto
            stepId: end
      - stepId: middle
        operationId: op2
      - stepId: end
        operationId: op3
`;

  it('should generate goto edges for branching', () => {
    const spec = parseArazzoSpec(branchingSpec);
    const { edges } = workflowToFlow(spec, 'branch-flow');

    // Look for the goto edge
    const gotoEdge = edges.find(e => e.source === 'start' && e.target === 'end');
    expect(gotoEdge).toBeDefined();
    expect(gotoEdge?.label).toContain('skip');
    expect(gotoEdge?.style?.strokeDasharray).toBe('4,4'); // Dashed line for goto
  });

  const errorSpec = `
arazzo: 1.0.1
info:
  title: Error Test
  version: 1.0.0
sourceDescriptions: []
workflows:
  - workflowId: error-flow
    steps:
      - stepId: risky-step
        operationId: op1
        onFailure:
          - name: retry
            type: goto
            stepId: risky-step
`;

  it('should generate failure edges when hideErrorFlows is false', () => {
    const spec = parseArazzoSpec(errorSpec);
    const { edges } = workflowToFlow(spec, 'error-flow', { hideErrorFlows: false });

    const failureEdge = edges.find(e => e.source === 'risky-step' && e.target === 'risky-step');
    expect(failureEdge).toBeDefined();
    expect(failureEdge?.label).toContain('retry');
    expect(failureEdge?.style?.stroke).toBe('#ef4444'); // Red color
  });

  it('should NOT generate failure edges when hideErrorFlows is true', () => {
    const spec = parseArazzoSpec(errorSpec);
    const { edges } = workflowToFlow(spec, 'error-flow', { hideErrorFlows: true });

    const failureEdge = edges.find(e => e.source === 'risky-step' && e.target === 'risky-step');
    expect(failureEdge).toBeUndefined();
  });
});
