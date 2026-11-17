import { memo, type ReactElement } from 'react';
import { EdgeLabelRenderer, getSmoothStepPath, Position, type Edge, type EdgeProps } from '@xyflow/react';
import type { ViewEdge as GraphEdge } from '../model';
import type { PlacedEdge, Side } from '../layout/layout';
import { isDimmed, useUi } from '../store';

export interface AfEdgeData extends Record<string, unknown> {
  edge: GraphEdge;
  placed: PlacedEdge;
  title: string;
}
export type AfRFEdge = Edge<AfEdgeData, 'af'>;

type Pt = { x: number; y: number };

/** Polyligne orthogonale ELK → chemin SVG à coins arrondis (rayon 6 px). */
export function roundedPath(points: Pt[], r = 6): string {
  if (points.length < 2) return '';
  let d = `M${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const p0 = points[i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const l1 = Math.hypot(p1.x - p0.x, p1.y - p0.y);
    const l2 = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const rr = Math.min(r, l1 / 2, l2 / 2);
    const a = { x: p1.x - ((p1.x - p0.x) / (l1 || 1)) * rr, y: p1.y - ((p1.y - p0.y) / (l1 || 1)) * rr };
    const b = { x: p1.x + ((p2.x - p1.x) / (l2 || 1)) * rr, y: p1.y + ((p2.y - p1.y) / (l2 || 1)) * rr };
    d += ` L${a.x},${a.y} Q${p1.x},${p1.y} ${b.x},${b.y}`;
  }
  const last = points[points.length - 1];
  return `${d} L${last.x},${last.y}`;
}

const DIR: Record<Position, Pt> = {
  [Position.Top]: { x: 0, y: 1 },
  [Position.Bottom]: { x: 0, y: -1 },
  [Position.Left]: { x: 1, y: 0 },
  [Position.Right]: { x: -1, y: 0 },
};

const SIDE_POSITION: Record<Side, Position> = { NORTH: Position.Top, SOUTH: Position.Bottom, EAST: Position.Right, WEST: Position.Left };

function arrowHead(tip: Pt, dir: Pt, open: boolean, size = 8): ReactElement {
  const len = Math.hypot(dir.x, dir.y) || 1;
  const ux = dir.x / len;
  const uy = dir.y / len;
  const bx = tip.x - ux * size;
  const by = tip.y - uy * size;
  const w = size * 0.5;
  const p1 = `${bx - uy * w},${by + ux * w}`;
  const p2 = `${bx + uy * w},${by - ux * w}`;
  return open ? (
    <polyline className="af-edge__marker af-edge__marker--open" points={`${p1} ${tip.x},${tip.y} ${p2}`} />
  ) : (
    <polygon className="af-edge__marker" points={`${p1} ${tip.x},${tip.y} ${p2}`} />
  );
}

function diamondAt(p: Pt, dir: Pt, size = 7): ReactElement {
  const len = Math.hypot(dir.x, dir.y) || 1;
  const ux = dir.x / len;
  const uy = dir.y / len;
  const c = { x: p.x + ux * size, y: p.y + uy * size };
  const w = size * 0.6;
  const pts = [
    `${p.x},${p.y}`,
    `${c.x - uy * w},${c.y + ux * w}`,
    `${p.x + ux * size * 2},${p.y + uy * size * 2}`,
    `${c.x + uy * w},${c.y - ux * w}`,
  ].join(' ');
  return <polygon className="af-edge__marker af-edge__marker--diamond" points={pts} />;
}

export const AfEdge = memo(function AfEdge(props: EdgeProps<AfRFEdge>) {
  const { id, source, target, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data } = props;
  const highlighted = useUi((s) => s.hoverId === source || s.hoverId === target || s.selectedId === source || s.selectedId === target);
  const dimmed = useUi((s) => isDimmed(s, source) || isDimmed(s, target));
  if (!data) return null;
  const { edge, placed, title } = data;
  const kind = edge.kind;

  let d: string;
  let label: Pt | null = null;
  let tip: Pt;
  let tipDir: Pt;
  let start: Pt;
  let startDir: Pt;

  if (placed.points && placed.points.length >= 2) {
    const pts = placed.points;
    d = roundedPath(pts);
    tip = pts[pts.length - 1];
    const prev = pts[pts.length - 2];
    tipDir = { x: tip.x - prev.x, y: tip.y - prev.y };
    start = pts[0];
    startDir = { x: pts[1].x - pts[0].x, y: pts[1].y - pts[0].y };
    if (placed.label) label = { x: placed.label.x + placed.label.width / 2, y: placed.label.y + placed.label.height / 2 };
  } else if (source === target) {
    // Boucle sur soi (mode couloirs) : sortie latérale, retour par le haut/la gauche.
    const off = 26;
    const horizontal = sourcePosition === Position.Right || sourcePosition === Position.Left;
    const pts: Pt[] = horizontal
      ? [
          { x: sourceX, y: sourceY },
          { x: sourceX + off, y: sourceY },
          { x: sourceX + off, y: targetY - off },
          { x: targetX, y: targetY - off },
          { x: targetX, y: targetY },
        ]
      : [
          { x: sourceX, y: sourceY },
          { x: sourceX, y: sourceY + off },
          { x: targetX - off, y: sourceY + off },
          { x: targetX - off, y: targetY },
          { x: targetX, y: targetY },
        ];
    d = roundedPath(pts);
    tip = pts[4];
    tipDir = { x: pts[4].x - pts[3].x, y: pts[4].y - pts[3].y };
    start = pts[0];
    startDir = { x: pts[1].x - pts[0].x, y: pts[1].y - pts[0].y };
    label = horizontal ? { x: sourceX + off + 4, y: (sourceY + targetY - off) / 2 } : { x: (sourceX + targetX - off) / 2, y: sourceY + off + 4 };
  } else {
    // Entrée dans un sous-workflow déplié : on s'arrête sur le bord du cadre (port du groupe).
    const tx = placed.entry ? placed.entry.x : targetX;
    const ty = placed.entry ? placed.entry.y : targetY;
    const tpos = placed.entry ? SIDE_POSITION[placed.entry.side] : targetPosition;
    const [p, lx, ly] = getSmoothStepPath({ sourceX, sourceY, targetX: tx, targetY: ty, sourcePosition, targetPosition: tpos, borderRadius: 6, offset: 18 });
    d = p;
    label = { x: lx, y: ly };
    tip = { x: tx, y: ty };
    tipDir = DIR[tpos];
    start = { x: sourceX, y: sourceY };
    startDir = { x: -DIR[sourcePosition].x, y: -DIR[sourcePosition].y };
  }

  let marker: ReactElement | null = null;
  if (kind === 'depends-on') marker = <circle className="af-edge__marker" cx={tip.x} cy={tip.y} r={3.5} />;
  else if (kind !== 'implicit-failure') marker = arrowHead(tip, tipDir, kind === 'retry');

  return (
    <g
      className={`af-edge af-edge--${kind}${edge.backward ? ' af-edge--backward' : ''}${edge.origin === 'onFailure' ? ' af-edge--from-failure' : ''}`}
      data-highlighted={highlighted || undefined}
      data-dimmed={dimmed || undefined}
    >
      <path d={d} className="af-edge__hit">
        <title>{title}</title>
      </path>
      {kind === 'workflow-call' ? <path d={d} className="af-edge__outer" /> : null}
      <path id={id} d={d} className="af-edge__line" />
      {kind === 'workflow-call' ? diamondAt(start, startDir) : null}
      {marker}
      {placed.labelText && label ? (
        <EdgeLabelRenderer>
          <div
            className={`af-edge-label af-edge-label--${kind}${edge.origin === 'onFailure' ? ' af-edge-label--from-failure' : ''}${edge.retryDefaults ? ' af-edge-label--defaults' : ''}`}
            data-highlighted={highlighted || undefined}
            data-dimmed={dimmed || undefined}
            style={{ transform: `translate(-50%, -50%) translate(${label.x}px, ${label.y}px)` }}
            title={title}
          >
            {placed.labelText}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </g>
  );
});

export const edgeTypes = { af: AfEdge };
