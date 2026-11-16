import type { ViewEdge, ViewNode, ViewGraph } from './model';

export interface VisibilityOptions {
  showFailureEdges: boolean;
  showImplicitFailures: boolean;
  /** groupId → collapsed */
  collapsed: Record<string, boolean>;
}

const FAILURE_KINDS = new Set(['failure', 'end-failure', 'implicit-failure', 'retry']);

/**
 * Graph actually rendered: failure edges filter, implicit failures, collapse of sub-workflows
 * (a collapsed group becomes a Reference node « ▸ n steps »).
 */
export function visibleGraph(g: ViewGraph, o: VisibilityOptions): ViewGraph {
  let nodes: ViewNode[] = g.nodes;
  let edges: ViewEdge[] = g.edges.filter((e) => {
    if (e.kind === 'implicit-failure' && !o.showImplicitFailures) return false;
    if (!o.showFailureEdges && (FAILURE_KINDS.has(e.kind) || e.origin === 'onFailure')) return false;
    return true;
  });

  const groups = g.groups.map((gr) => ({ ...gr, collapsed: o.collapsed[gr.id] ?? gr.collapsed ?? false }));
  for (const gr of groups) {
    if (!gr.collapsed) continue;
    const members = new Set(nodes.filter((n) => n.groupId === gr.id).map((n) => n.id));
    if (!members.size) continue;
    const proxyId = `${gr.id}:collapsed`;
    const at = nodes.findIndex((n) => members.has(n.id));
    const first = nodes[at];
    const proxy: ViewNode = {
      id: proxyId,
      kind: 'workflow-ref',
      workflowId: g.workflowId,
      label: gr.workflowId,
      targetWorkflowId: gr.workflowId,
      collapsed: true,
      innerStepCount: nodes.filter((n) => members.has(n.id) && n.kind === 'step').length,
    };
    if (first?.source) proxy.source = first.source;
    nodes = [...nodes.slice(0, at).filter((n) => !members.has(n.id)), proxy, ...nodes.slice(at).filter((n) => !members.has(n.id))];
    const seen = new Set<string>();
    edges = edges
      .map((e) => ({
        ...e,
        source: members.has(e.source) ? proxyId : e.source,
        target: members.has(e.target) ? proxyId : e.target,
        sourcePort: members.has(e.source) ? ('out-next' as const) : e.sourcePort,
        targetPort: members.has(e.target) ? ('in' as const) : e.targetPort,
      }))
      .filter((e) => !(e.source === proxyId && e.target === proxyId))
      .filter((e) => {
        const k = `${e.kind}|${e.source}|${e.target}|${e.via ?? ''}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
  }

  // Terminal / junction / reference nodes left orphan.
  const touched = new Set(edges.flatMap((e) => [e.source, e.target]));
  nodes = nodes.filter((n) => n.kind === 'step' || n.kind === 'input' || n.kind === 'output' || touched.has(n.id));
  const ids = new Set(nodes.map((n) => n.id));
  edges = edges.filter((e) => ids.has(e.source) && ids.has(e.target));

  return { ...g, nodes, edges, groups };
}
