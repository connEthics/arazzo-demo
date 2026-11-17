/**
 * ELK layered auto-layout of the builder canvas.
 *
 * Topology: the workflow graph of @connethics/arazzo-core (`workflowToGraph`: implicit sequence,
 * success / failure gotos, dependsOn joins, retry loops, end), mapped onto the canvas nodes
 * (workflow input, steps, workflow output). Engine: the ELK client of @connethics/arazzo-flow
 * (`runElk`: Web Worker with main-thread fallback) with the exact UI-SPEC §6 options
 * (`ELK_ROOT_OPTIONS`), only the direction and the spacing between layers being adapted to the
 * larger, editable builder cards.
 */
import { workflowToGraph } from '@connethics/arazzo-core';
import { runElk, ELK_ROOT_OPTIONS, thoroughnessFor, type ElkConfig } from '@connethics/arazzo-flow';
import type { ArazzoSpec } from '@/types/arazzo';

export type CanvasDirection = 'horizontal' | 'vertical';

export interface CanvasLayoutNode {
  id: string;
  width: number;
  height: number;
}

export interface CanvasNodeIds {
  input: string;
  output: string;
  /** stepId → canvas node id */
  steps: Map<string, string>;
}

/** Canvas edges (source → target node ids) derived from the core workflow graph. */
export function canvasLayoutEdges(spec: ArazzoSpec, workflowId: string, ids: CanvasNodeIds): Array<[string, string]> {
  let graph;
  try {
    graph = workflowToGraph(spec, workflowId);
  } catch {
    return [];
  }
  // A `join` node (dependsOn with several prerequisites) stands for the step it releases.
  const joinTarget = new Map<string, string>();
  for (const e of graph.edges) {
    if (e.source.startsWith('join:')) joinTarget.set(e.source, e.target);
  }
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const toCanvas = (id: string): string | null => {
    const resolved = joinTarget.get(id) ?? id;
    const node = byId.get(resolved);
    if (!node) return null;
    if (node.kind === 'input') return ids.input;
    if (node.kind === 'output' || node.kind === 'end-success') return ids.output;
    if (node.step) return ids.steps.get(node.step.stepId) ?? null;
    return null;
  };
  const seen = new Set<string>();
  const edges: Array<[string, string]> = [];
  for (const e of graph.edges) {
    if (e.kind === 'retry') continue; // self loops / back edges do not shape the layering
    const s = toCanvas(e.source);
    const t = toCanvas(e.target);
    if (!s || !t || s === t) continue;
    const key = `${s}->${t}`;
    if (seen.has(key)) continue;
    seen.add(key);
    edges.push([s, t]);
  }
  return edges;
}

/** Runs ELK layered and returns the top-left position of each canvas node. */
export async function layoutCanvas(
  nodes: CanvasLayoutNode[],
  edges: Array<[string, string]>,
  direction: CanvasDirection,
  elk: ElkConfig = {},
): Promise<Map<string, { x: number; y: number }>> {
  const known = new Set(nodes.map((n) => n.id));
  const { result } = await runElk(
    {
      id: 'builder-canvas',
      layoutOptions: {
        ...ELK_ROOT_OPTIONS,
        'org.eclipse.elk.direction': direction === 'horizontal' ? 'RIGHT' : 'DOWN',
        'org.eclipse.elk.layered.thoroughness': thoroughnessFor(nodes.length),
        // Builder cards carry input / output handles on their sides: leave room for the data links.
        'org.eclipse.elk.layered.spacing.nodeNodeBetweenLayers': '80',
        'org.eclipse.elk.spacing.nodeNode': '48',
      },
      children: nodes.map((n) => ({ id: n.id, width: n.width, height: n.height })),
      edges: edges
        .filter(([s, t]) => known.has(s) && known.has(t))
        .map(([s, t], i) => ({ id: `e${i}`, sources: [s], targets: [t] })),
    },
    elk,
  );
  const positions = new Map<string, { x: number; y: number }>();
  for (const child of result.children ?? []) {
    positions.set(child.id, { x: child.x ?? 0, y: child.y ?? 0 });
  }
  return positions;
}
