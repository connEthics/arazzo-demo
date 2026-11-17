// Real ELK layout in Node (main-thread engine: no Worker global here).
import { afterAll, describe, expect, it } from 'vitest';
import { workflowToGraph } from '@connethics/arazzo-core';
import { toViewGraph } from '../src/adapt';
import { buildElkGraph, computeLayout, structureKey, type LayoutOptions } from '../src/layout/layout';
import { elkMode, resetElk } from '../src/layout/elk-client';
import { nodeSize } from '../src/format';
import { CATALOGUE, PET, SESSION, load, rel, walk } from './fixtures';

const TB: LayoutOptions = { direction: 'TB', lanes: 'off', density: 'standard', lang: 'fr' };
afterAll(() => resetElk());

function overlaps(a: { x: number; y: number; width: number; height: number }, b: typeof a) {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

describe('ELK layout — pet-adoption (real ELK, Node)', () => {
  const view = toViewGraph(workflowToGraph(load(PET), 'adopt-pet-with-error-handling', { includeImplicitFailures: true }));

  it('places every node without overlap and routes every edge', async () => {
    const r = await computeLayout(view, TB, { mode: 'main-thread' });
    expect(elkMode()).toBe('main-thread');
    expect(r.mode).toBe('main-thread');
    expect(Object.keys(r.nodes).sort()).toEqual(view.nodes.map((n) => n.id).sort());
    const placed = Object.entries(r.nodes);
    for (const [id, p] of placed) {
      const n = view.nodes.find((x) => x.id === id)!;
      expect({ w: p.width, h: p.height }).toEqual({ w: nodeSize(n, 'standard', 'TB').width, h: nodeSize(n, 'standard', 'TB').height });
    }
    for (let i = 0; i < placed.length; i++)
      for (let j = i + 1; j < placed.length; j++) expect(overlaps(placed[i]![1], placed[j]![1]), `${placed[i]![0]} × ${placed[j]![0]}`).toBe(false);
    for (const e of view.edges) {
      const pe = r.edges[e.id]!;
      expect(pe.points!.length, e.id).toBeGreaterThanOrEqual(2);
    }
    // Labelled edges get an ELK label position.
    const labelled = view.edges.filter((e) => e.kind === 'failure' || e.kind === 'success');
    expect(labelled.length).toBeGreaterThan(0);
    for (const e of labelled) expect(r.edges[e.id]!.label, e.id).toBeDefined();
    // Ports exist on the node sides of the TB table (out-failure → EAST).
    const login = r.nodes['step:login']!;
    const fail = login.ports.find((p) => p.id === 'out-failure')!;
    expect(fail.side).toBe('EAST');
    expect(Math.abs(fail.x - login.width)).toBeLessThanOrEqual(1);
  });

  it('is deterministic (same model → same coordinates) and the input is on top', async () => {
    const a = await computeLayout(view, TB, { mode: 'main-thread' });
    const b = await computeLayout(view, TB, { mode: 'main-thread' });
    expect(b.nodes).toEqual(a.nodes);
    expect(a.nodes.input!.y).toBe(Math.min(...Object.values(a.nodes).map((p) => p.y)));
  });

  it('LR direction and lanes post-processing', async () => {
    const lr = await computeLayout(view, { ...TB, direction: 'LR' }, { mode: 'main-thread' });
    expect(lr.nodes.input!.x).toBe(Math.min(...Object.values(lr.nodes).map((p) => p.x)));
    const lanes = await computeLayout(view, { ...TB, lanes: 'lanes' }, { mode: 'main-thread' });
    expect(lanes.frames.map((f) => f.label)).toEqual(['Workflow', 'petStoreApi']);
    for (const f of lanes.frames) expect(f.kind).toBe('lane');
    // Lanes do not overlap each other.
    expect(overlaps(lanes.frames[0]!, lanes.frames[1]!)).toBe(false);
  });

  it('structureKey ignores descriptions but not structure', () => {
    const k = structureKey(view, TB);
    const renamed = { ...view, nodes: view.nodes.map((n) => ({ ...n, summary: 'changed' })) };
    expect(structureKey(renamed, TB)).toBe(k);
    expect(structureKey({ ...view, edges: view.edges.slice(1) }, TB)).not.toBe(k);
  });
});

describe('ELK input graph', () => {
  it('uses only the ports actually used, with FIXED_SIDE constraints, and clusters by source', () => {
    const view = toViewGraph(workflowToGraph(CATALOGUE, 'main'));
    const { root } = buildElkGraph(view, { ...TB, lanes: 'clusters' });
    expect(root.layoutOptions!['org.eclipse.elk.algorithm']).toBe('layered');
    const clusters = root.children!.filter((c) => c.children?.length);
    expect(clusters.map((c) => c.id).sort()).toEqual(['src:api', 'src:events', 'src:flows']);
    const create = clusters.flatMap((c) => c.children!).find((c) => c.id === 'step:create')!;
    expect(create.ports!.map((p) => p.id.split('::')[1])).toEqual(['in', 'out-next', 'out-retry']);
    expect(create.layoutOptions!['org.eclipse.elk.portConstraints']).toBe('FIXED_SIDE');
  });
});

describe('expanded sub-workflow: edges enter through the group port (session-renewal)', () => {
  const doc = load(SESSION);
  const view = toViewGraph(workflowToGraph(doc, 'listUnpaidInvoices'), { subgraphs: { renewSession: workflowToGraph(doc, 'renewSession') } });
  const entering = view.edges.filter((e) => e.target === 'group:renewSession/step:renew');

  it('targets the group entry port in the ELK input graph', () => {
    expect(entering.map((e) => e.via)).toEqual(['renewSession', 'renewSession']);
    const { root, entries } = buildElkGraph(view, TB);
    const group = root.children!.find((c) => c.id === 'group:renewSession')!;
    expect(group.ports!.map((p) => [p.id, p.layoutOptions!['org.eclipse.elk.port.side']])).toEqual([['group:renewSession::in', 'NORTH']]);
    expect(group.layoutOptions!['org.eclipse.elk.portConstraints']).toBe('FIXED_SIDE');
    for (const e of entering) {
      expect(entries[e.id]).toBe('group:renewSession');
      expect(root.edges!.find((x) => x.id === e.id)!.targets).toEqual(['group:renewSession::in']);
    }
  });

  it.each(['TB', 'LR'] as const)('%s: the retry via edge stops on the frame border, outside the header', async (direction) => {
    const r = await computeLayout(view, { ...TB, direction }, { mode: 'main-thread' });
    const f = r.frames.find((x) => x.id === 'group:renewSession')!;
    for (const e of entering) {
      const pe = r.edges[e.id]!;
      const tip = pe.points![pe.points!.length - 1]!;
      expect(pe.entry).toMatchObject({ groupId: 'group:renewSession', x: tip.x, y: tip.y });
      // No point of the route lies inside the frame (header band included).
      for (const p of pe.points!.slice(0, -1)) expect(p.x > f.x + 1 && p.x < f.x + f.width - 1 && p.y > f.y + 1 && p.y < f.y + f.height - 1, `${e.id} ${p.x},${p.y}`).toBe(false);
      if (direction === 'TB') expect(Math.abs(tip.y - f.y)).toBeLessThanOrEqual(1);
      else {
        expect(Math.abs(tip.x - f.x)).toBeLessThanOrEqual(1);
        expect(tip.y).toBeGreaterThanOrEqual(f.y + 44 - 1);
      }
    }
  });

  it('lanes mode: entry point computed on the recomputed frame', async () => {
    const r = await computeLayout(view, { ...TB, lanes: 'lanes' }, { mode: 'main-thread' });
    const f = r.frames.find((x) => x.id === 'group:renewSession')!;
    for (const e of entering) expect(r.edges[e.id]!.entry).toEqual({ groupId: 'group:renewSession', side: 'NORTH', x: f.x + f.width / 2, y: f.y });
  });
});

describe('every E1 example lays out', () => {
  for (const file of walk()) {
    it(rel(file), async () => {
      const doc = load(file) as { workflows: { workflowId: string }[] };
      for (const wf of doc.workflows) {
        const v = toViewGraph(workflowToGraph(doc, wf.workflowId));
        const r = await computeLayout(v, TB, { mode: 'main-thread' });
        expect(Object.keys(r.nodes)).toHaveLength(v.nodes.length);
      }
    });
  }
});
