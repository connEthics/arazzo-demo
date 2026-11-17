import type { ElkExtendedEdge, ElkNode } from 'elkjs/lib/elk-api';
import type { LayoutEngine } from '../src/layout/elk-client';

/** Deterministic fake ELK: one node per row, straight two-point sections, label at mid-edge. */
export function mockElk(): LayoutEngine & { calls: number } {
  const engine = {
    calls: 0,
    async layout(graph: ElkNode): Promise<ElkNode> {
      engine.calls++;
      const g = structuredClone(graph);
      const pos = new Map<string, { x: number; y: number; w: number; h: number }>();
      let y = 0;
      const place = (n: ElkNode) => {
        for (const c of n.children ?? []) {
          if (c.children?.length) {
            const y0 = y;
            y += 44;
            place(c);
            Object.assign(c, { x: 0, y: y0, width: 300, height: y - y0 });
            continue;
          }
          Object.assign(c, { x: 20, y });
          pos.set(c.id, { x: 20, y, w: c.width ?? 0, h: c.height ?? 0 });
          for (const p of c.ports ?? []) Object.assign(p, { x: 20 + (c.width ?? 0) / 2, y: y + (c.height ?? 0) });
          y += (c.height ?? 0) + 40;
        }
      };
      place(g);
      for (const e of (g.edges ?? []) as ElkExtendedEdge[]) {
        const s = pos.get(e.sources[0]!.split('::')[0]!)!;
        const t = pos.get(e.targets[0]!.split('::')[0]!)!;
        const start = { x: s.x + s.w / 2, y: s.y + s.h };
        const end = { x: t.x + t.w / 2, y: t.y };
        e.sections = [{ id: `${e.id}:s`, startPoint: start, endPoint: end }];
        for (const l of e.labels ?? []) Object.assign(l, { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 });
      }
      return Object.assign(g, { width: 400, height: y });
    },
  };
  return engine;
}
