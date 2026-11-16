/** Built-in legend: reuses the exact edge and node classes (same rendering, same tokens). */
import { useState } from 'react';
import { EDGE_KINDS, type EdgeKind } from './model';
import type { Messages } from './messages';
import { IconCheck, IconChevron, IconExternal, IconReceive, IconSend, IconWorkflow, IconX } from './icons';

export function EdgeSample({ kind }: { kind: EdgeKind }) {
  const d = kind === 'retry' ? 'M4,12 H40 V5 H52' : 'M4,9 H52';
  const tip = kind === 'retry' ? { x: 58, y: 5 } : { x: 58, y: 9 };
  return (
    <svg width="62" height="18" viewBox="0 0 62 18" aria-hidden="true" className="af-legend__svg">
      <g className={`af-edge af-edge--${kind}`}>
        {kind === 'workflow-call' ? <path d={d} className="af-edge__outer" /> : null}
        <path d={`${d} L${tip.x - 1},${tip.y}`} className="af-edge__line" />
        {kind === 'depends-on' ? (
          <circle cx={tip.x - 2} cy={tip.y} r={3.5} className="af-edge__marker" />
        ) : kind === 'implicit-failure' ? null : kind === 'retry' ? (
          <polyline className="af-edge__marker af-edge__marker--open" points={`${tip.x - 8},${tip.y - 4} ${tip.x},${tip.y} ${tip.x - 8},${tip.y + 4}`} />
        ) : (
          <polygon className="af-edge__marker" points={`${tip.x - 8},${tip.y - 4} ${tip.x},${tip.y} ${tip.x - 8},${tip.y + 4}`} />
        )}
        {kind === 'workflow-call' ? <polygon className="af-edge__marker af-edge__marker--diamond" points="4,9 8,6 12,9 8,12" /> : null}
      </g>
    </svg>
  );
}

export function Legend({ defaultOpen = false, messages: m, kinds }: { defaultOpen?: boolean; messages: Messages; kinds?: Set<string> }) {
  const [open, setOpen] = useState(defaultOpen);
  const L = m.ui.legendNodeLabels;
  return (
    <section className="af-legend" aria-labelledby="af-legend-title">
      <button type="button" className="af-legend__toggle" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <IconChevron open={open} size={12} />
        <span id="af-legend-title">{m.ui.legend}</span>
      </button>
      {open ? (
        <div className="af-legend__body">
          <ul className="af-legend__list" aria-label={m.ui.legendEdges}>
            {EDGE_KINDS.map((k) => (
              <li key={k} data-present={kinds?.has(k) || undefined}>
                <EdgeSample kind={k} />
                <span>{m.ui.legendEdgeLabels[k]}</span>
              </li>
            ))}
          </ul>
          <ul className="af-legend__list af-legend__list--nodes" aria-label={m.ui.legendNodes}>
            <li>
              <span className="af-legend__node af-accent--http">
                <span className="af-badge af-badge--post">POST</span>
              </span>
              <span>{L.http}</span>
            </li>
            <li>
              <span className="af-legend__node af-accent--async-send">
                <span className="af-badge af-badge--send">
                  <IconSend size={10} />
                  SEND
                </span>
              </span>
              <span>{L.send}</span>
            </li>
            <li>
              <span className="af-legend__node af-accent--async-receive">
                <span className="af-badge af-badge--receive">
                  <IconReceive size={10} />
                  RECEIVE
                </span>
              </span>
              <span>{L.receive}</span>
            </li>
            <li>
              <span className="af-legend__node af-legend__node--double af-accent--workflow">
                <span className="af-badge af-badge--workflow">
                  <IconWorkflow size={10} />
                  WF
                </span>
              </span>
              <span>{L.workflow}</span>
            </li>
            <li>
              <span className="af-legend__glyph af-legend__glyph--junction" />
              <span>{L.junction}</span>
            </li>
            <li>
              <span className="af-legend__glyph af-legend__glyph--end-success">
                <IconCheck size={9} />
              </span>
              <span className="af-legend__glyph af-legend__glyph--end-failure">
                <IconX size={9} />
              </span>
              <span>{L.end}</span>
            </li>
            <li>
              <span className="af-legend__glyph af-legend__glyph--ref">
                <IconExternal size={9} />
              </span>
              <span>{L.ref}</span>
            </li>
          </ul>
        </div>
      ) : null}
    </section>
  );
}
