/**
 * Replaces the former `workflowToFlow` rendering test: the Studio now renders graphs with
 * @connethics/arazzo-flow from the core graph model (`workflowToGraph`), and the builder canvas
 * auto-layout uses the same model (features/builder/utils/elk-layout.ts).
 * Also checks the 7 gallery examples: valid (0 error) and graphable.
 */
import fs from 'node:fs';
import path from 'node:path';
import { workflowToGraph } from '@connethics/arazzo-core';
import { parseAndValidate, parseArazzoSpec } from '@/lib/arazzo-parser';
import { canvasLayoutEdges } from '@/features/builder/utils/elk-layout';
import { EXAMPLES } from '@/features/builder/data/examples';

const publicDir = path.join(__dirname, '../../../public');
const read = (servedPath: string) => fs.readFileSync(path.join(publicDir, servedPath), 'utf8');

describe('Gallery examples (app/public/workflows)', () => {
  it('lists the 7 Arazzo 1.1 examples', () => {
    expect(EXAMPLES).toHaveLength(7);
  });

  it.each(EXAMPLES.map((e) => [e.id, e] as const))('%s is a valid Arazzo 1.1.0 document with a graph', (_id, example) => {
    const result = parseAndValidate(read(example.path));
    expect(result.version).toBe('1.1.0');
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    for (const wf of result.spec!.workflows) {
      const graph = workflowToGraph(result.spec, wf.workflowId);
      expect(graph.nodes.filter((n) => n.step).length).toBe(wf.steps.length);
    }
    if (example.readme) expect(fs.existsSync(path.join(publicDir, example.readme))).toBe(true);
  });

  it('order-to-cash: receive step, dependsOn join and HTTP steps', () => {
    const spec = parseArazzoSpec(read('/workflows/e2e-order-to-cash/e2e-order-to-cash.arazzo.yaml'));
    const graph = workflowToGraph(spec, spec.workflows[0].workflowId);
    const kinds = new Set(graph.nodes.map((n) => n.kind));
    expect(kinds.has('step-async-receive')).toBe(true);
    expect(kinds.has('step-http')).toBe(true);
    expect(graph.edges.some((e) => e.kind === 'depends-on')).toBe(true);
  });
});

describe('Builder canvas auto-layout topology', () => {
  const spec = parseArazzoSpec(`
arazzo: 1.1.0
info: { title: t, version: 1.0.0 }
sourceDescriptions: [{ name: s, url: ./o.yaml, type: openapi }]
workflows:
  - workflowId: wf
    steps:
      - stepId: a
        operationId: opA
      - stepId: b
        operationId: opB
        dependsOn: [a]
      - stepId: c
        operationId: opC
        dependsOn: [a]
      - stepId: d
        operationId: opD
        dependsOn: [b, c]
        onFailure:
          - { name: again, type: retry, retryLimit: 2 }
    outputs:
      done: $steps.d.outputs.x
`);
  const ids = {
    input: 'node-input',
    output: 'node-output',
    steps: new Map(['a', 'b', 'c', 'd'].map((s, i) => [s, `node-${i}`])),
  };

  it('maps core edges to canvas nodes (joins resolved, retry loops ignored)', () => {
    const edges = canvasLayoutEdges(spec, 'wf', ids);
    expect(edges).toEqual(
      expect.arrayContaining([
        ['node-input', 'node-0'],
        ['node-0', 'node-1'],
        ['node-0', 'node-2'],
        ['node-1', 'node-3'],
        ['node-2', 'node-3'],
        ['node-3', 'node-output'],
      ]),
    );
    expect(edges.every(([s, t]) => s !== t)).toBe(true);
    expect(new Set(edges.map((e) => e.join('>'))).size).toBe(edges.length);
  });

  it('returns no edge for an unknown workflow', () => {
    expect(canvasLayoutEdges(spec, 'nope', ids)).toEqual([]);
  });
});
