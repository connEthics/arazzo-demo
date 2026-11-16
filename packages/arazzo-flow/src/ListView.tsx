/**
 * Synchronised list view (UI-SPEC §11, WCAG 1.3.1): complete text alternative of the graph,
 * in document order, sharing the selection with the canvas.
 */
import { memo } from 'react';
import type { ViewGraph, ViewNode } from './model';
import type { Messages } from './messages';
import { exitText, kindText, nodeName } from './format';
import { MethodBadge } from './nodes/nodes';
import { useUi } from './store';

function Item({ n, g, m, byId, onSelect, onReveal }: { n: ViewNode; g: ViewGraph; m: Messages; byId: Map<string, ViewNode>; onSelect: (id: string) => void; onReveal: (id: string) => void }) {
  const selected = useUi((s) => s.selectedId === n.id);
  const exits = g.edges.filter((e) => e.source === n.id).map((e) => exitText(e, byId.get(e.target), m));
  return (
    <li className="af-list__item" data-selected={selected || undefined}>
      <button
        type="button"
        className="af-list__btn"
        aria-current={selected || undefined}
        onClick={() => onSelect(n.id)}
        onDoubleClick={() => onReveal(n.id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && e.shiftKey) {
            e.preventDefault();
            onReveal(n.id);
          }
        }}
      >
        {n.kind === 'step' ? <MethodBadge node={n} m={m} /> : null}
        <span className="af-list__name af-mono">{nodeName(n, m)}</span>
        {n.order ? <span className="af-card__order">#{n.order}</span> : null}
      </button>
      <div className="af-list__meta">
        {n.kind === 'step' ? <span>{kindText(n, m)}</span> : null}
        {n.diagnostics?.length ? <span className="af-list__diag">{n.diagnostics.map((d) => d.code).join(', ')}</span> : null}
        {exits.length ? <span className="af-list__exits">{exits.join(' · ')}</span> : null}
      </div>
    </li>
  );
}

export const ListView = memo(function ListView({ graph, messages: m, onSelect, onReveal }: { graph: ViewGraph; messages: Messages; onSelect: (id: string) => void; onReveal: (id: string) => void }) {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const items = graph.nodes.filter((n) => n.kind !== 'junction');
  return (
    <aside className="af-list" aria-label={m.ui.listTitle}>
      <h2 className="af-list__title">{m.ui.listTitle}</h2>
      <ol className="af-list__ol">
        {items.map((n) => (
          <Item key={n.id} n={n} g={graph} m={m} byId={byId} onSelect={onSelect} onReveal={onReveal} />
        ))}
      </ol>
    </aside>
  );
});
