import type { ElkExtendedEdge, ElkNode, ElkPort } from 'elkjs/lib/elk-api';
import type { ViewNode as GraphNode, PortId, ViewGraph as WorkflowGraph } from '../model';
import { STEP_PORTS } from '../model';
import { edgeLabelText, measureLabel, nodeSize, type Density, type Direction } from '../format';
import { ELK_GROUP_ENTRY_OPTIONS, ELK_GROUP_OPTIONS, ELK_NODE_OPTIONS, ELK_ROOT_OPTIONS, thoroughnessFor } from './elk-options';
import { runElk, type ElkConfig, type ElkMode } from './elk-client';

export type LanesMode = 'off' | 'clusters' | 'lanes';

export interface LayoutOptions {
  direction: Direction;
  lanes: LanesMode;
  density: Density;
  lang: 'fr' | 'en';
  /** Lane header label for steps whose source is unknown. */
  unknownLabel?: string;
}

export type Side = 'NORTH' | 'SOUTH' | 'EAST' | 'WEST';

export interface PlacedPort {
  id: PortId;
  side: Side;
  /** Position relative au coin haut-gauche du nœud. */
  x: number;
  y: number;
}

export interface PlacedNode {
  x: number;
  y: number;
  width: number;
  height: number;
  ports: PlacedPort[];
}

export interface PlacedEdge {
  /** Polyligne ELK (absolue). Absente en mode couloirs : routage de repli côté rendu. */
  points?: { x: number; y: number }[];
  /**
   * Arête qui entre dans un sous-workflow déplié : elle se termine sur le port d'entrée du
   * groupe (bord du cadre, hors de l'en-tête) et non sur la première étape. Point absolu.
   */
  entry?: { groupId: string; x: number; y: number; side: Side };
  label?: { text: string; x: number; y: number; width: number; height: number };
  labelText: string;
}

export interface PlacedFrame {
  id: string;
  kind: 'source' | 'workflow' | 'lane';
  label: string;
  sourceType?: string;
  tint: number;
  x: number;
  y: number;
  width: number;
  height: number;
  count: number;
}

export interface LayoutResult {
  key: string;
  nodes: Record<string, PlacedNode>;
  edges: Record<string, PlacedEdge>;
  frames: PlacedFrame[];
  width: number;
  height: number;
  ms: number;
  mode: ElkMode;
  options: LayoutOptions;
}

export const PORT_SIDES: Record<Direction, Record<PortId, Side>> = {
  TB: { in: 'NORTH', 'in-deps': 'NORTH', 'out-next': 'SOUTH', 'out-success': 'SOUTH', 'out-failure': 'EAST', 'out-retry': 'EAST', 'out-call': 'WEST' },
  LR: { in: 'WEST', 'in-deps': 'WEST', 'out-next': 'EAST', 'out-success': 'EAST', 'out-failure': 'SOUTH', 'out-retry': 'SOUTH', 'out-call': 'NORTH' },
};

const WORKFLOW_LANE = '__workflow';
/** Hauteur réservée à l'en-tête d'un sous-workflow déplié (padding haut ELK du groupe). */
const GROUP_HEADER = 44;

/** Clé de cache : structure seulement (pas les descriptions) — R5 §4.8. */
export function structureKey(g: WorkflowGraph, o: LayoutOptions): string {
  return JSON.stringify([
    g.workflowId,
    o.direction,
    o.lanes,
    o.density,
    g.nodes.map((n) => [n.id, n.kind, n.stepKind, n.groupId, n.source, n.criteria?.length, n.inputs?.length, n.workflowOutputs?.length]),
    g.edges.map((e) => [e.id, e.kind, e.source, e.target, e.sourcePort, e.targetPort, e.name, e.retryLimit, e.retryAfter, e.via, e.criteria?.[0]?.condition]),
    g.groups.map((x) => [x.id, x.collapsed]),
  ]);
}

function laneOf(n: GraphNode, g: WorkflowGraph): string {
  if (n.kind === 'step') return n.source ?? 'unknown';
  if (n.kind === 'workflow-ref' && n.source && g.sources.some((s) => s.name === n.source)) return n.source;
  if (n.kind === 'junction') {
    const out = g.edges.find((e) => e.source === n.id);
    const t = out && g.nodes.find((x) => x.id === out.target);
    if (t?.kind === 'step' && t.source) return t.source;
  }
  return WORKFLOW_LANE;
}

/** Build the ELK input graph (exported for tests and for server-side layout). */
export function buildElkGraph(
  g: WorkflowGraph,
  o: LayoutOptions,
): { root: ElkNode; containers: Set<string>; labelTexts: Record<string, string>; entries: Record<string, string> } {
  const sides = PORT_SIDES[o.direction];

  // Ports réellement utilisés par nœud (ordre fixe → déterminisme).
  const used = new Map<string, Set<PortId>>();
  const use = (id: string, p: PortId) => {
    if (!used.has(id)) used.set(id, new Set());
    used.get(id)!.add(p);
  };
  for (const n of g.nodes) if (n.kind === 'step' || n.kind === 'output' || n.kind === 'end') use(n.id, 'in');
  for (const e of g.edges) {
    use(e.source, e.sourcePort);
    use(e.target, e.targetPort);
  }

  const sizes = new Map(g.nodes.map((n) => [n.id, nodeSize(n, o.density, o.direction)]));
  const elkNode = (n: GraphNode): ElkNode => {
    const s = sizes.get(n.id)!;
    const ports: ElkPort[] = STEP_PORTS.filter((p) => used.get(n.id)?.has(p)).map((p) => ({
      id: `${n.id}::${p}`,
      width: 1,
      height: 1,
      layoutOptions: { 'org.eclipse.elk.port.side': sides[p] },
    }));
    return { id: n.id, width: s.width, height: s.height, ports, layoutOptions: { ...ELK_NODE_OPTIONS } };
  };

  // Arêtes qui entrent dans un sous-workflow déplié depuis l'extérieur : elles visent le port
  // d'entrée du groupe (`<groupId>::in`), jamais la première étape, pour ne pas traverser l'en-tête.
  const expanded = new Set(g.groups.filter((x) => x.kind === 'workflow' && !x.collapsed).map((x) => x.id));
  const groupOf = new Map(g.nodes.map((n) => [n.id, n.groupId && expanded.has(n.groupId) ? n.groupId : undefined]));
  const entries: Record<string, string> = {};
  for (const e of g.edges) {
    const tg = groupOf.get(e.target);
    if (tg && groupOf.get(e.source) !== tg) entries[e.id] = tg;
  }
  const entered = new Set(Object.values(entries));

  // Hiérarchie : sous-workflows dépliés ; en mode « clusters », un groupe par source.
  const root: ElkNode = { id: '__root', children: [], edges: [] };
  const containers = new Map<string, ElkNode>();
  const container = (id: string, label: string): ElkNode => {
    let c = containers.get(id);
    if (!c) {
      c = { id, children: [], layoutOptions: { ...ELK_GROUP_OPTIONS }, labels: [{ text: label }] };
      if (entered.has(id)) {
        c.layoutOptions = { ...c.layoutOptions, ...ELK_GROUP_ENTRY_OPTIONS };
        c.ports = [{ id: `${id}::in`, width: 1, height: 1, layoutOptions: { 'org.eclipse.elk.port.side': sides.in } }];
      }
      containers.set(id, c);
      root.children!.push(c);
    }
    return c;
  };
  for (const n of g.nodes) {
    const group = n.groupId ? g.groups.find((x) => x.id === n.groupId && !x.collapsed) : undefined;
    if (group) container(group.id, group.label).children!.push(elkNode(n));
    else if (o.lanes === 'clusters' && n.kind === 'step' && n.source) container(`src:${n.source}`, n.source).children!.push(elkNode(n));
    else root.children!.push(elkNode(n));
  }

  const labelTexts: Record<string, string> = {};
  root.edges = g.edges.map((e): ElkExtendedEdge => {
    const text = edgeLabelText(e, o.density, o.lang);
    labelTexts[e.id] = text;
    const m = measureLabel(text);
    return {
      id: e.id,
      sources: [`${e.source}::${e.sourcePort}`],
      targets: [entries[e.id] ? `${entries[e.id]}::in` : `${e.target}::${e.targetPort}`],
      labels: text ? [{ id: `${e.id}::label`, text, width: m.width, height: m.height }] : [],
    };
  });

  root.layoutOptions = {
    ...ELK_ROOT_OPTIONS,
    'org.eclipse.elk.direction': o.direction === 'TB' ? 'DOWN' : 'RIGHT',
    'org.eclipse.elk.layered.thoroughness': thoroughnessFor(g.nodes.length),
  };
  return { root, containers: new Set(containers.keys()), labelTexts, entries };
}

export async function computeLayout(g: WorkflowGraph, o: LayoutOptions, elk: ElkConfig = {}): Promise<LayoutResult> {
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const sides = PORT_SIDES[o.direction];
  const { root, containers, labelTexts, entries } = buildElkGraph(g, o);
  const { result, mode } = await runElk(root, elk);

  const nodes: Record<string, PlacedNode> = {};
  const frames: PlacedFrame[] = [];
  const sourceOrder = g.sources.map((s) => s.name);
  const visit = (n: ElkNode) => {
    for (const c of n.children ?? []) {
      if (containers.has(c.id)) {
        const gr = g.groups.find((x) => x.id === c.id);
        const srcName = c.id.startsWith('src:') ? c.id.slice(4) : undefined;
        frames.push({
          id: c.id,
          kind: gr ? 'workflow' : 'source',
          label: gr?.label ?? srcName ?? c.id,
          sourceType: srcName ? g.sources.find((s) => s.name === srcName)?.type : 'arazzo',
          tint: srcName ? (sourceOrder.indexOf(srcName) % 6) + 2 : 1,
          x: c.x ?? 0,
          y: c.y ?? 0,
          width: c.width ?? 0,
          height: c.height ?? 0,
          count: c.children?.length ?? 0,
        });
        visit(c);
      } else {
        const x = c.x ?? 0;
        const y = c.y ?? 0;
        nodes[c.id] = {
          x,
          y,
          width: c.width ?? 0,
          height: c.height ?? 0,
          ports: (c.ports ?? []).map((p) => ({
            id: p.id.slice(p.id.lastIndexOf('::') + 2) as PortId,
            side: sides[p.id.slice(p.id.lastIndexOf('::') + 2) as PortId],
            x: (p.x ?? 0) - x + (p.width ?? 0) / 2,
            y: (p.y ?? 0) - y + (p.height ?? 0) / 2,
          })),
        };
      }
    }
  };
  visit(result);

  const edges: Record<string, PlacedEdge> = {};
  for (const e of (result.edges ?? []) as ElkExtendedEdge[]) {
    const pts = (e.sections ?? []).flatMap((s, i) => [
      ...(i === 0 ? [s.startPoint] : []),
      ...(s.bendPoints ?? []),
      s.endPoint,
    ]);
    const l = e.labels?.[0];
    edges[e.id] = {
      points: pts.length ? pts : undefined,
      labelText: labelTexts[e.id] ?? '',
      label: l && l.text ? { text: l.text, x: l.x ?? 0, y: l.y ?? 0, width: l.width ?? 0, height: l.height ?? 0 } : undefined,
    };
  }

  let width = result.width ?? 0;
  let height = result.height ?? 0;

  if (o.lanes === 'lanes') {
    const r = applyLanes(g, nodes, o.direction, o.unknownLabel ?? 'Unknown source');
    frames.splice(0, frames.length, ...r.frames);
    // Sous-workflows : cadre recalculé autour des membres déplacés.
    for (const gr of g.groups.filter((x) => x.kind === 'workflow' && !x.collapsed)) {
      const members = g.nodes.filter((n) => n.groupId === gr.id).map((n) => nodes[n.id]).filter(Boolean);
      if (!members.length) continue;
      const x0 = Math.min(...members.map((m) => m.x)) - 16;
      const y0 = Math.min(...members.map((m) => m.y)) - 44;
      const x1 = Math.max(...members.map((m) => m.x + m.width)) + 16;
      const y1 = Math.max(...members.map((m) => m.y + m.height)) + 16;
      frames.push({ id: gr.id, kind: 'workflow', label: gr.label, tint: 1, x: x0, y: y0, width: x1 - x0, height: y1 - y0, count: members.length });
    }
    for (const id of Object.keys(edges)) edges[id] = { labelText: edges[id].labelText };
    width = r.width;
    height = r.height;
  }

  // Point d'entrée des arêtes vers un sous-workflow : milieu du bord d'entrée du cadre,
  // sous l'en-tête en LR (le port ELK quand il existe, sinon calculé sur le cadre).
  for (const [id, groupId] of Object.entries(entries)) {
    const f = frames.find((x) => x.id === groupId);
    const pe = edges[id];
    if (!f || !pe) continue;
    const last = pe.points?.[pe.points.length - 1];
    const fallback = o.direction === 'TB' ? { x: f.x + f.width / 2, y: f.y } : { x: f.x, y: f.y + GROUP_HEADER + (f.height - GROUP_HEADER) / 2 };
    pe.entry = { groupId, side: sides.in, ...(last ?? fallback) };
  }

  return {
    key: structureKey(g, o),
    nodes,
    edges,
    frames,
    width,
    height,
    ms: Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0),
    mode,
    options: o,
  };
}

/**
 * Couloirs par sourceDescription, en post-traitement (R5 §4.7) :
 * la coordonnée de flux d'ELK est conservée, la coordonnée transverse est réassignée par couloir.
 */
function applyLanes(g: WorkflowGraph, nodes: Record<string, PlacedNode>, dir: Direction, unknownLabel: string) {
  const TB = dir === 'TB';
  const flow = (p: PlacedNode) => (TB ? p.y : p.x);
  const flowLen = (p: PlacedNode) => (TB ? p.height : p.width);
  const cross = (p: PlacedNode) => (TB ? p.x : p.y);
  const crossLen = (p: PlacedNode) => (TB ? p.width : p.height);
  const PAD = 24;
  const GAP = 28;
  const HEADER = 40;

  const laneIds = [WORKFLOW_LANE, ...g.sources.map((s) => s.name), 'unknown'];
  const byLane = new Map<string, string[]>();
  for (const n of g.nodes) {
    if (!nodes[n.id]) continue;
    const l = laneOf(n, g);
    if (!byLane.has(l)) byLane.set(l, []);
    byLane.get(l)!.push(n.id);
  }

  const minFlow = Math.min(...Object.values(nodes).map(flow));
  const maxFlow = Math.max(...Object.values(nodes).map((p) => flow(p) + flowLen(p)));
  const frames: PlacedFrame[] = [];
  let cursor = 0;
  laneIds.forEach((laneId) => {
    const ids = byLane.get(laneId);
    if (!ids?.length) return;
    const ordered = [...ids].sort((a, b) => flow(nodes[a]) - flow(nodes[b]) || cross(nodes[a]) - cross(nodes[b]));
    const slotSize = Math.max(...ids.map((id) => crossLen(nodes[id])));
    const slots: { from: number; to: number }[][] = [];
    const slotOf = new Map<string, number>();
    for (const id of ordered) {
      const p = nodes[id];
      const from = flow(p) - GAP / 2;
      const to = flow(p) + flowLen(p) + GAP / 2;
      let s = 0;
      while (slots[s]?.some((r) => r.from < to && from < r.to)) s++;
      (slots[s] ??= []).push({ from, to });
      slotOf.set(id, s);
    }
    const laneSize = PAD * 2 + slots.length * slotSize + (slots.length - 1) * GAP;
    for (const id of ids) {
      const p = nodes[id];
      const c = cursor + PAD + slotOf.get(id)! * (slotSize + GAP) + (slotSize - crossLen(p)) / 2;
      if (TB) p.x = c;
      else p.y = c;
    }
    const src = g.sources.find((s) => s.name === laneId);
    const start = minFlow - HEADER - PAD;
    const len = maxFlow - minFlow + HEADER + PAD * 2;
    frames.push({
      id: `lane:${laneId}`,
      kind: 'lane',
      label: laneId === WORKFLOW_LANE ? 'Workflow' : laneId === 'unknown' ? unknownLabel : laneId,
      sourceType: src?.type ?? (laneId === WORKFLOW_LANE ? 'arazzo' : 'unknown'),
      tint: laneId === WORKFLOW_LANE ? 0 : (g.sources.findIndex((s) => s.name === laneId) % 6) + 1,
      x: TB ? cursor : start,
      y: TB ? start : cursor,
      width: TB ? laneSize : len,
      height: TB ? len : laneSize,
      count: ids.filter((id) => g.nodes.find((n) => n.id === id)?.kind === 'step').length,
    });
    cursor += laneSize;
  });
  // Translation pour que tout reste en coordonnées positives.
  const shift = -(minFlow - HEADER - PAD);
  for (const p of Object.values(nodes)) {
    if (TB) p.y += shift;
    else p.x += shift;
  }
  for (const f of frames) {
    if (TB) f.y += shift;
    else f.x += shift;
  }
  const len = maxFlow - minFlow + HEADER + PAD * 2;
  return { frames, width: TB ? cursor : len, height: TB ? len : cursor };
}
