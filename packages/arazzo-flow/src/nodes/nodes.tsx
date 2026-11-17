import { memo, type ReactNode } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import type { ViewEdge as GraphEdge, ViewNode as GraphNode } from '../model';
import type { PlacedFrame, PlacedNode, Side } from '../layout/layout';
import { badgeClass, formatTimeout, methodText, shortWorkflow, truncate, type Density } from '../format';
import type { Messages } from '../messages';
import { isDimmed, useUi } from '../store';
import {
  IconBraces,
  IconCheck,
  IconChevron,
  IconClock,
  IconError,
  IconExternal,
  IconInfo,
  IconInput,
  IconLink,
  IconOutput,
  IconOutputs,
  IconReceive,
  IconRetry,
  IconSend,
  IconWarning,
  IconWorkflow,
  IconX,
  SourceTypeIcon,
} from '../icons';

export interface AfNodeData extends Record<string, unknown> {
  node: GraphNode;
  placed: PlacedNode;
  density: Density;
  messages: Messages;
  outEdges: GraphEdge[];
  onToggleGroup?: (groupId: string) => void;
}
export type AfNode = Node<AfNodeData>;

export interface FrameData extends Record<string, unknown> {
  frame: PlacedFrame;
  messages: Messages;
  onToggle?: (groupId: string) => void;
}
export type FrameNode = Node<FrameData, 'frame'>;

const SIDE_POS: Record<Side, Position> = {
  NORTH: Position.Top,
  SOUTH: Position.Bottom,
  EAST: Position.Right,
  WEST: Position.Left,
};

function Ports({ placed }: { placed: PlacedNode }) {
  return (
    <>
      {placed.ports.map((p) => (
        <Handle
          key={p.id}
          id={p.id}
          type={p.id.startsWith('out') ? 'source' : 'target'}
          position={SIDE_POS[p.side]}
          isConnectable={false}
          className="af-handle"
          style={{ left: p.x, top: p.y, right: 'auto', bottom: 'auto', transform: 'translate(-50%, -50%)' }}
        />
      ))}
    </>
  );
}

function useNodeState(id: string) {
  const selected = useUi((s) => s.selectedId === id);
  const dimmed = useUi((s) => isDimmed(s, id));
  const match = useUi((s) => (s.currentMatch === id ? 'current' : s.matches?.has(id) ? 'match' : undefined));
  const hovered = useUi((s) => s.hoverId === id);
  return {
    'data-selected': selected || undefined,
    'data-dimmed': dimmed || undefined,
    'data-match': match,
    'data-hovered': hovered || undefined,
  };
}

function DiagBadge({ node }: { node: GraphNode }) {
  const d = node.diagnostics;
  if (!d?.length) return null;
  const sev = d.some((x) => x.severity === 'error') ? 'error' : d.some((x) => x.severity === 'warning') ? 'warning' : 'info';
  const Icon = sev === 'error' ? IconError : sev === 'warning' ? IconWarning : IconInfo;
  return (
    <span className={`af-diag af-diag--${sev}`} title={d.map((x) => `${x.code} : ${x.message}`).join('\n')}>
      <Icon size={11} />
      {d.length}
    </span>
  );
}

function Chip({ icon, children, tone, title, mono }: { icon?: ReactNode; children: ReactNode; tone?: string; title?: string; mono?: boolean }) {
  return (
    <span className={`af-chip${tone ? ` af-chip--${tone}` : ''}${mono ? ' af-mono' : ''}`} title={title}>
      {icon}
      <span className="af-chip__text">{children}</span>
    </span>
  );
}

export function MethodBadge({ node, m }: { node: GraphNode; m: Messages }) {
  const text = methodText(node);
  const k = node.stepKind;
  const icon =
    k === 'async-send' ? <IconSend size={11} /> : k === 'async-receive' ? <IconReceive size={11} /> : k === 'workflow' ? <IconWorkflow size={11} /> : null;
  const title =
    node.methodSource === 'unresolved'
      ? m.unresolved
      : node.methodSource === 'operationPath'
        ? m.methodFromPath
        : node.methodSource === 'openapi'
          ? m.methodFromOpenApi
          : undefined;
  return (
    <span className={`af-badge af-badge--${badgeClass(node)}`} title={title}>
      {icon}
      {text}
    </span>
  );
}

function stepChips(n: GraphNode, out: GraphEdge[], m: Messages): ReactNode[] {
  const chips: ReactNode[] = [];
  if (n.stepKind === 'async-receive') {
    if (n.timeoutMs != null)
      chips.push(
        <Chip key="t" icon={<IconClock size={11} />} tone="async-receive" title={`timeout: ${n.timeoutMs} ms`}>
          {formatTimeout(n.timeoutMs, m.lang)}
        </Chip>,
      );
    if (n.correlationId)
      chips.push(
        <Chip key="c" icon={<IconLink size={11} />} tone="async-receive" title={`correlationId: ${n.correlationId}`} mono>
          {truncate(n.correlationId, 20)}
        </Chip>,
      );
  }
  if (n.stepKind === 'async-send' && n.hasRequestBody)
    chips.push(
      <Chip key="p" icon={<IconBraces size={11} />} tone="async-send" title="requestBody (payload)">
        payload
      </Chip>,
    );
  if (n.stepKind === 'workflow') {
    if (n.external) chips.push(<Chip key="x" icon={<IconExternal size={11} />} tone="workflow">{m.external}</Chip>);
    if (n.parameters?.length) chips.push(<Chip key="pa">{m.params(n.parameters.length)}</Chip>);
    if (n.collapsed && n.innerStepCount)
      chips.push(
        <Chip key="col" icon={<IconChevron size={11} />} tone="workflow">
          {m.steps(n.innerStepCount)}
        </Chip>,
      );
  }
  if (n.criteria?.length)
    chips.push(
      <Chip key="cr" icon={<IconCheck size={11} />} tone="success" title={n.criteria.map((c) => c.condition).join('\n')}>
        {m.criteria(n.criteria.length)}
      </Chip>,
    );
  const retry = out.find((e) => e.kind === 'retry' && !e.via);
  if (retry)
    chips.push(
      <Chip key="r" icon={<IconRetry size={11} />} tone="retry" title={`retry ×${retry.retryLimit ?? 1}${retry.retryAfter ? `, ${retry.retryAfter} s` : ''}`}>
        ×{retry.retryLimit ?? 1}
      </Chip>,
    );
  if (n.stepOutputs?.length)
    chips.push(
      <Chip key="o" icon={<IconOutputs size={11} />} title={n.stepOutputs.join(', ')}>
        {m.outputsCount(n.stepOutputs.length)}
      </Chip>,
    );
  if (n.usesWorkflowDefaults)
    chips.push(
      <Chip key="w" tone="workflow-defaults" title={m.workflowDefaults}>
        ⓦ
      </Chip>,
    );
  return chips;
}

function secondLine(n: GraphNode): ReactNode {
  switch (n.stepKind) {
    case 'async-send':
    case 'async-receive':
      return <span className="af-mono">{n.channel}</span>;
    case 'workflow':
      return (
        <span className="af-mono">
          → {shortWorkflow(n.targetWorkflowId ?? '')}
          {n.external && n.targetWorkflowId?.startsWith('$sourceDescriptions.') ? (
            <span className="af-muted"> · {n.targetWorkflowId.split('.')[1]}</span>
          ) : null}
        </span>
      );
    default:
      return n.path ? (
        <span className="af-mono">{n.path}</span>
      ) : (
        <span className="af-mono af-muted">{n.operationId ? shortWorkflow(n.operationId) : ''}</span>
      );
  }
}

const accentOf = (n: GraphNode) =>
  n.stepKind === 'async-send'
    ? 'async-send'
    : n.stepKind === 'async-receive'
      ? 'async-receive'
      : n.stepKind === 'workflow'
        ? 'workflow'
        : 'http';

export const StepNode = memo(function StepNode({ id, data }: NodeProps<AfNode>) {
  const { node: n, density, messages: m, outEdges, placed } = data;
  const st = useNodeState(id);
  const accent = accentOf(n);
  return (
    <div className={`af-card af-card--step af-accent--${accent} af-density--${density}`} data-step-kind={n.stepKind} {...st}>
      <Ports placed={placed} />
      <div className="af-card__head">
        <MethodBadge node={n} m={m} />
        <span className="af-card__title">{n.label}</span>
        {n.order ? <span className="af-card__order">#{n.order}</span> : null}
        <DiagBadge node={n} />
      </div>
      {density !== 'compact' && (
        <>
          <div className="af-card__line">{n.summary ?? (n.operationId ? shortWorkflow(n.operationId) : ' ')}</div>
          <div className="af-card__line af-card__line--sub">{secondLine(n)}</div>
          <div className="af-card__chips">{stepChips(n, outEdges, m)}</div>
        </>
      )}
      {density === 'detailed' && n.criteria?.length ? (
        <ul className="af-card__list" aria-hidden="true">
          {n.criteria.slice(0, 5).map((c, i) => (
            <li key={i} className="af-mono" title={c.condition}>
              <IconCheck size={10} className="af-list-icon af-list-icon--success" />
              {c.condition}
              {c.type && c.type !== 'simple' ? <span className="af-tag">{c.type}{c.version ? ` ${c.version}` : ''}</span> : null}
            </li>
          ))}
        </ul>
      ) : null}
      {n.stepKind === 'async-receive' && n.timeoutMs != null ? (
        <span className="af-timer" title={`timeout ${formatTimeout(n.timeoutMs, m.lang)}`}>
          <IconClock size={12} />
        </span>
      ) : null}
    </div>
  );
});

export const InputNode = memo(function InputNode({ id, data }: NodeProps<AfNode>) {
  const { node: n, density, messages: m, placed } = data;
  const st = useNodeState(id);
  const ins = n.inputs ?? [];
  const req = ins.filter((i) => i.required).length;
  return (
    <div className={`af-card af-card--io af-accent--input af-density--${density}`} {...st}>
      <Ports placed={placed} />
      <div className="af-card__head">
        <span className="af-io-icon af-io-icon--input">
          <IconInput size={13} />
        </span>
        <span className="af-card__title">{m.inputs}</span>
        <span className="af-card__order">{ins.length}</span>
      </div>
      {density !== 'compact' && (
        <>
          <div className="af-card__line af-card__line--sub">{m.props(ins.length, req)}</div>
          <div className="af-card__chips af-card__chips--wrap">
            {ins.slice(0, 4).map((i) => (
              <span key={i.name} className="af-key af-mono" title={`${i.name}${i.type ? `: ${i.type}` : ''}${i.required ? ` (${m.required})` : ''}${i.description ? ` — ${i.description}` : ''}`}>
                {i.name}
                {i.required ? <span className="af-req">*</span> : null}
              </span>
            ))}
            {ins.length > 4 ? <span className="af-key af-key--more">+{ins.length - 4}</span> : null}
          </div>
        </>
      )}
      {density === 'detailed' && (
        <ul className="af-card__list" aria-hidden="true">
          {ins.slice(0, 5).map((i) => (
            <li key={i.name} className="af-mono">
              {i.name}
              <span className="af-muted">
                {' '}: {i.type ?? 'any'}
                {i.default !== undefined ? ` = ${JSON.stringify(i.default)}` : ''}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});

export const OutputNode = memo(function OutputNode({ id, data }: NodeProps<AfNode>) {
  const { node: n, density, messages: m, placed } = data;
  const st = useNodeState(id);
  const outs = n.workflowOutputs ?? [];
  const sel = outs.filter((o) => o.selector).length;
  return (
    <div className={`af-card af-card--io af-accent--output af-density--${density}`} {...st}>
      <Ports placed={placed} />
      <div className="af-card__head">
        <span className="af-io-icon af-io-icon--output">
          <IconOutput size={13} />
        </span>
        <span className="af-card__title">{m.outputs}</span>
        <span className="af-card__order">{outs.length}</span>
      </div>
      {density !== 'compact' && (
        <>
          <div className="af-card__line af-card__line--sub">
            {m.outputsCount(outs.length)}
            {sel ? ` · ${sel} Selector${sel > 1 ? 's' : ''}` : ''}
          </div>
          <div className="af-card__chips af-card__chips--wrap">
            {outs.slice(0, 4).map((o) => (
              <span
                key={o.name}
                className={`af-key af-mono${o.selector ? ' af-key--selector' : ''}`}
                title={o.selector ? `Selector ${o.selector.type}${o.selector.version ? ` ${o.selector.version}` : ''}: ${o.selector.selector} @ ${o.selector.context}` : o.expression}
              >
                {o.selector ? <IconBraces size={10} /> : null}
                {o.name}
              </span>
            ))}
            {outs.length > 4 ? <span className="af-key af-key--more">+{outs.length - 4}</span> : null}
          </div>
        </>
      )}
      {density === 'detailed' && (
        <ul className="af-card__list" aria-hidden="true">
          {outs.slice(0, 5).map((o) => (
            <li key={o.name} className="af-mono">
              {o.name}
              <span className="af-muted"> ← {o.selector ? `${o.selector.selector}` : o.expression}</span>
              {o.selector ? <span className="af-tag">{o.selector.type}</span> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});

export const EndNode = memo(function EndNode({ id, data }: NodeProps<AfNode>) {
  const { node: n, messages: m, placed } = data;
  const st = useNodeState(id);
  const failure = n.endType === 'failure';
  return (
    <div className={`af-end af-end--${failure ? 'failure' : 'success'}`} {...st}>
      <Ports placed={placed} />
      <span className="af-end__circle">{failure ? <IconX size={14} /> : <IconCheck size={14} />}</span>
      <span className="af-end__label">{failure ? m.endFailure : m.endSuccess}</span>
    </div>
  );
});

export const JunctionNode = memo(function JunctionNode({ id, data }: NodeProps<AfNode>) {
  const { placed } = data;
  const st = useNodeState(id);
  return (
    <div className="af-junction" {...st}>
      <Ports placed={placed} />
      <span className="af-junction__diamond">
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
          <path d="M6 1.5v9M1.5 6h9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </span>
    </div>
  );
});

export const RefNode = memo(function RefNode({ id, data }: NodeProps<AfNode>) {
  const { node: n, messages: m, placed } = data;
  const st = useNodeState(id);
  return (
    <div className={`af-ref${n.collapsed ? ' af-ref--collapsed' : ''}`} title={n.summary} {...st}>
      <Ports placed={placed} />
      {n.collapsed ? <IconWorkflow size={13} /> : <IconExternal size={13} />}
      <span className="af-ref__label af-mono">{shortWorkflow(n.targetWorkflowId ?? n.label)}</span>
      {n.collapsed && data.onToggleGroup ? (
        <button
          type="button"
          className="af-frame__toggle nodrag nopan"
          aria-expanded="false"
          aria-label={m.ui.expand(n.label)}
          title={m.ui.expand(n.label)}
          onClick={(ev) => {
            ev.stopPropagation();
            data.onToggleGroup?.(id.replace(/:collapsed$/, ''));
          }}
        >
          ▸ {m.steps(n.innerStepCount ?? 0)}
        </button>
      ) : n.collapsed && n.innerStepCount ? (
        <span className="af-ref__meta">▸ {m.steps(n.innerStepCount)}</span>
      ) : n.source ? (
        <span className="af-ref__meta">{n.source}</span>
      ) : null}
    </div>
  );
});

export const FrameNodeView = memo(function FrameNodeView({ data }: NodeProps<FrameNode>) {
  const { frame: f, messages: m, onToggle } = data;
  if (f.kind === 'workflow') {
    return (
      <div className="af-frame af-frame--workflow">
        <div className="af-frame__head">
          <button
            type="button"
            className="af-frame__toggle nodrag nopan"
            aria-expanded="true"
            aria-label={m.ui.collapse(f.label)}
            onClick={() => onToggle?.(f.id)}
          >
            <IconChevron open size={13} />
          </button>
          <IconWorkflow size={13} />
          <span className="af-frame__title af-mono">{f.label}</span>
          <span className="af-frame__meta">{m.steps(f.count)}</span>
        </div>
      </div>
    );
  }
  return (
    <div className={`af-frame af-frame--${f.kind} af-lane-tint--${f.tint}`}>
      <div className="af-frame__head">
        <SourceTypeIcon type={f.sourceType} size={13} />
        <span className="af-frame__title">{f.label}</span>
        {f.sourceType ? <span className="af-frame__type">{f.sourceType}</span> : null}
        {f.count ? <span className="af-frame__meta">{m.steps(f.count)}</span> : null}
      </div>
    </div>
  );
});

export const nodeTypes = {
  step: StepNode,
  input: InputNode,
  output: OutputNode,
  end: EndNode,
  junction: JunctionNode,
  'workflow-ref': RefNode,
  frame: FrameNodeView,
};

