/**
 * <ArazzoGraph> — read-only graph of one Arazzo workflow (@connethics/arazzo-flow).
 * Input: the `WorkflowGraph` of `@connethics/arazzo-core` (`workflowToGraph`).
 * ELK layered layout in a Web Worker, pure CSS with `--af-*` variables (style.css).
 */
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import {
  Background,
  BackgroundVariant,
  MiniMap,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  useStore,
  type Node,
} from '@xyflow/react';
import type { Diagnostic, GraphNode as CoreNode, WorkflowGraph } from '@connethics/arazzo-core';
import type { ViewNode } from './model';
import { en, fr, type Messages } from './messages';
import { ariaLabelFor, edgeLabelText, edgeTitle, kindText, nodeName, type Density, type Direction } from './format';
import { computeLayout, structureKey, type LanesMode, type LayoutResult } from './layout/layout';
import { prewarmElk, type ElkConfig } from './layout/elk-client';
import { toViewGraph } from './adapt';
import { visibleGraph } from './visible';
import { createUiStore, UiStoreContext, useUi, type UiStore } from './store';
import { nodeTypes, type AfNode, type FrameNode } from './nodes/nodes';
import { edgeTypes, type AfRFEdge } from './edges/AfEdge';
import { Legend } from './Legend';
import { ListView } from './ListView';
import { useResolvedTheme, type ThemeProp } from './theme';
import { downloadBlob, exportImage, toMermaid, type ExportEvent, type ExportFormat } from './export';
import {
  IconArrowDown,
  IconArrowRight,
  IconDensity,
  IconDownload,
  IconFailureEdges,
  IconFit,
  IconKeyboard,
  IconLanes,
  IconLegend,
  IconList,
  IconMap,
  IconMinus,
  IconOneToOne,
  IconPlus,
  IconSearch,
  IconX,
} from './icons';

export type DensityProp = 'auto' | Density;

export interface ArazzoGraphApi {
  fitView: () => void;
  /** DOM focus + auto-pan. Accepts a stepId or a node id. */
  focusStep: (id: string) => void;
  /** Centre the view on a node at the given zoom (default: current zoom). */
  centerOn: (id: string, zoom?: number) => void;
  search: (query: string) => void;
  select: (id: string | null) => void;
  exportImage: (format: 'svg' | 'png') => Promise<Blob>;
  toMermaid: () => string;
}

export interface LayoutStats {
  ms: number;
  mode: 'worker' | 'main-thread';
  nodes: number;
  edges: number;
  density: Density;
}

export interface SelectionInfo {
  /** Node id in the rendered graph (`step:<stepId>`, `input`, `group:<wf>/step:<id>`…). */
  nodeId: string;
  /** Workflow the node belongs to (differs for steps of an expanded sub-workflow). */
  workflowId: string;
}

export interface ArazzoGraphOptions {
  layout: Direction;
  lanes: LanesMode;
  density: DensityProp;
}

export interface ArazzoGraphProps {
  /** Output of `workflowToGraph(doc, workflowId)` (@connethics/arazzo-core). */
  graph: WorkflowGraph;
  /** Colour source; see README « Thèmes ». Default `auto`. */
  theme?: ThemeProp;
  /** Force high contrast. Default: VS Code HC theme or `forced-colors`. */
  highContrast?: boolean;
  layout?: Direction;
  lanes?: LanesMode;
  /** `auto` (default): `compact` above 50 nodes, else `standard`. */
  density?: DensityProp;
  /** Controlled selection (editor cursor → graph): a stepId or a node id; `null` clears. */
  selectedStepId?: string | null;
  /** Click / Space. `id` is the stepId for steps, the node id otherwise. */
  onSelectStep?: (id: string | null, node: CoreNode | null, info: SelectionInfo | null) => void;
  /** Double-click / Enter: reveal in the editor (VS Code `step-selected`). */
  onRevealStep?: (id: string, node: CoreNode, info: SelectionInfo) => void;
  /** Double-click on a workflow reference. */
  onOpenWorkflow?: (workflowId: string) => void;
  onLayout?: (stats: LayoutStats) => void;
  /** After the initial fit of a new layout. */
  onViewportReady?: () => void;
  /** Toolbar / keyboard changes, to persist (vscode.setState). */
  onOptionsChange?: (o: ArazzoGraphOptions) => void;
  /** Receives exports instead of the browser download (return nothing). VS Code: post them to the host. */
  onExport?: (e: ExportEvent) => void;
  showFailureEdges?: boolean;
  showImplicitFailures?: boolean;
  showMinimap?: boolean;
  showLegend?: boolean;
  legendExpanded?: boolean;
  showToolbar?: boolean;
  showSearch?: boolean;
  /** Synchronised list view open at mount. */
  showList?: boolean;
  /** groupId (`group:<workflowId>`) → collapsed. */
  collapsed?: Record<string, boolean>;
  /** Core diagnostics (`validate`), shown as badges on nodes. */
  diagnostics?: readonly Diagnostic[];
  /** Workflow-level actions: banner + ⓦ (default) or edges on every step. */
  workflowActions?: 'banner' | 'edges';
  /** Graphs of local workflows to expand inline (collapsible groups). */
  subgraphs?: Record<string, WorkflowGraph>;
  /** Dictionary, or `lang` for the built-in ones (FR default). */
  messages?: Messages;
  lang?: 'fr' | 'en';
  /** ELK engine: `workerUrl`, `createWorker`, `mode: 'main-thread'`, or a custom `engine`. */
  elk?: ElkConfig;
  className?: string;
  style?: CSSProperties;
}

/** Below this fit zoom, the initial view frames the start of the workflow. */
const MIN_READABLE_FIT_ZOOM = 0.3;
const START_ZOOM_LARGE = 0.75;
const LARGE_NODES = 150;
const HUGE_NODES = 300;

const PRIMARY_NEXT = ['sequence', 'success', 'end-success', 'depends-on', 'workflow-call', 'retry', 'transfer', 'failure', 'end-failure', 'implicit-failure'];
const FAILURE_NEXT = ['failure', 'end-failure', 'retry', 'transfer', 'implicit-failure'];

function prefersReducedMotion() {
  try {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || document.body.classList.contains('vscode-reduce-motion');
  } catch {
    return false;
  }
}

function escapeId(id: string): string {
  return typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(id) : id.replace(/["\\]/g, '\\$&');
}

type InnerProps = ArazzoGraphProps & { store: UiStore; apiRef: React.ForwardedRef<ArazzoGraphApi> };

function GraphInner(props: InnerProps) {
  const { graph, store, onSelectStep, onRevealStep, onLayout, onOptionsChange, onOpenWorkflow, onExport, apiRef } = props;
  const m = props.messages ?? (props.lang === 'en' ? en : fr);
  const rf = useReactFlow();
  const [rootEl, setRootEl] = useState<HTMLDivElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const helpRef = useRef<HTMLDialogElement>(null);
  const theme = useResolvedTheme(props.theme ?? 'auto', props.highContrast, rootEl);

  const [direction, setDirection] = useState<Direction>(props.layout ?? 'TB');
  const [lanes, setLanes] = useState<LanesMode>(props.lanes ?? 'off');
  const [densityPref, setDensityPref] = useState<DensityProp>(props.density ?? 'auto');
  const [showFailure, setShowFailure] = useState(props.showFailureEdges ?? true);
  const [showImplicit, setShowImplicit] = useState(props.showImplicitFailures ?? false);
  const [showMinimap, setShowMinimap] = useState(props.showMinimap ?? true);
  const [showLegend, setShowLegend] = useState(props.showLegend ?? true);
  const [showList, setShowList] = useState(props.showList ?? false);
  const [exportOpen, setExportOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(props.collapsed ?? {});
  const [layout, setLayout] = useState<LayoutResult | null>(null);
  const [pending, setPending] = useState(false);
  const [layoutError, setLayoutError] = useState<string | null>(null);
  const [announce, setAnnounce] = useState('');
  const [query, setQuery] = useState('');
  const [fitDone, setFitDone] = useState(0);
  const focusedId = useRef<string | null>(null);
  const focusDepth = useRef(0);
  const generation = useRef(0);
  const lastFitKey = useRef<string>('');
  const ids = useMemo(() => {
    const base = `af-${graph.workflowId.replace(/[^A-Za-z0-9_-]/g, '_')}-${Math.random().toString(36).slice(2, 8)}`;
    return { desc: `${base}-desc`, hint: `${base}-hint`, help: `${base}-help` };
  }, [graph.workflowId]);

  useEffect(() => setDirection(props.layout ?? 'TB'), [props.layout]);
  useEffect(() => setLanes(props.lanes ?? 'off'), [props.lanes]);
  useEffect(() => setDensityPref(props.density ?? 'auto'), [props.density]);
  useEffect(() => setShowFailure(props.showFailureEdges ?? true), [props.showFailureEdges]);
  useEffect(() => setShowImplicit(props.showImplicitFailures ?? false), [props.showImplicitFailures]);
  useEffect(() => setShowMinimap(props.showMinimap ?? true), [props.showMinimap]);
  useEffect(() => setCollapsed(props.collapsed ?? {}), [props.collapsed, graph]);
  useEffect(() => {
    void prewarmElk(props.elk ?? {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.elk?.workerUrl, props.elk?.createWorker, props.elk?.mode, props.elk?.engine]);

  const optionsRef = useRef(onOptionsChange);
  optionsRef.current = onOptionsChange;
  const firstOptions = useRef(true);
  useEffect(() => {
    if (firstOptions.current) {
      firstOptions.current = false;
      return;
    }
    optionsRef.current?.({ layout: direction, lanes, density: densityPref });
  }, [direction, lanes, densityPref]);

  // ---------- Render model ----------
  const view = useMemo(
    () => toViewGraph(graph, { workflowActions: props.workflowActions, diagnostics: props.diagnostics, subgraphs: props.subgraphs }),
    [graph, props.workflowActions, props.diagnostics, props.subgraphs],
  );
  const vg = useMemo(
    () => visibleGraph(view, { showFailureEdges: showFailure, showImplicitFailures: showImplicit, collapsed }),
    [view, showFailure, showImplicit, collapsed],
  );
  const stepCount = vg.nodes.filter((n) => n.kind === 'step').length;
  const density: Density = densityPref === 'auto' ? (vg.nodes.length > 50 ? 'compact' : 'standard') : densityPref;
  const byId = useMemo(() => new Map(vg.nodes.map((n) => [n.id, n])), [vg]);
  const large = vg.nodes.length > LARGE_NODES;

  /** stepId or node id → node id of the rendered graph. */
  const resolveId = useCallback(
    (id: string | null | undefined): string | null => {
      if (!id) return null;
      if (byId.has(id)) return id;
      if (byId.has(`step:${id}`)) return `step:${id}`;
      const [wf, step] = id.includes('/') ? id.split('/', 2) : [null, null];
      if (wf && step) {
        if (wf === graph.workflowId && byId.has(`step:${step}`)) return `step:${step}`;
        if (byId.has(`group:${wf}/step:${step}`)) return `group:${wf}/step:${step}`;
      }
      return null;
    },
    [byId, graph.workflowId],
  );

  useEffect(() => {
    store.set({ selectedId: null, matches: null, currentMatch: null, focusSet: null, hoverId: null });
    setQuery('');
  }, [graph.workflowId, store]);
  useEffect(() => {
    if (props.selectedStepId !== undefined) store.set({ selectedId: resolveId(props.selectedStepId) });
  }, [props.selectedStepId, store, resolveId]);

  // fitView margins: room for search/toolbar (top) and the defaults banner.
  const fitPadding = useMemo(
    () => ({ top: view.defaults ? '104px' : '64px', bottom: '36px', left: '28px', right: showList ? '330px' : '28px' }) as const,
    [view.defaults, showList],
  );

  const readyRef = useRef(props.onViewportReady);
  readyRef.current = props.onViewportReady;
  useEffect(() => {
    if (fitDone) readyRef.current?.();
  }, [fitDone]);

  // ---------- Layout (worker, generations, previous layout kept while computing) ----------
  const layoutRef = useRef(onLayout);
  layoutRef.current = onLayout;
  useEffect(() => {
    const opts = { direction, lanes, density, lang: m.lang, unknownLabel: m.ui.unknownSource };
    const key = structureKey(vg, opts);
    if (layout?.key === key) return;
    const gen = ++generation.current;
    setPending(true);
    setAnnounce(m.announceLayoutPending);
    const timer = setTimeout(() => {
      computeLayout(vg, opts, props.elk ?? {})
        .then((res) => {
          if (gen !== generation.current) return; // stale layout: ignored
          setLayout(res);
          setPending(false);
          setLayoutError(null);
          setAnnounce(m.announceLayout(res.ms, vg.nodes.length));
          layoutRef.current?.({ ms: res.ms, mode: res.mode, nodes: vg.nodes.length, edges: vg.edges.length, density });
        })
        .catch((err: unknown) => {
          if (gen !== generation.current) return;
          setPending(false);
          setLayoutError(err instanceof Error ? err.message : String(err));
          setAnnounce(m.layoutError);
        });
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vg, direction, lanes, density, m.lang]);

  const toggleGroup = useCallback((groupId: string) => {
    setCollapsed((c) => ({ ...c, [groupId]: !c[groupId] }));
  }, []);

  // ---------- React Flow elements ----------
  const { rfNodes, rfEdges } = useMemo(() => {
    if (!layout) return { rfNodes: [] as Node[], rfEdges: [] as AfRFEdge[] };
    const frames: FrameNode[] = layout.frames.map((f) => ({
      id: `frame:${f.id}`,
      type: 'frame',
      position: { x: f.x, y: f.y },
      width: f.width,
      height: f.height,
      style: { width: f.width, height: f.height },
      data: { frame: f, messages: m, onToggle: f.kind === 'workflow' ? toggleGroup : undefined },
      draggable: false,
      selectable: false,
      focusable: false,
      zIndex: f.kind === 'workflow' ? -1 : -2,
      className: 'af-rf-frame',
      ariaRole: 'group',
      ariaLabel: f.kind === 'workflow' ? m.ariaSubworkflow(f.label) : m.ariaLane(f.label),
    }));
    const nodes: AfNode[] = vg.nodes
      .filter((n) => layout.nodes[n.id])
      .map((n) => {
        const p = layout.nodes[n.id]!;
        return {
          id: n.id,
          type: n.kind,
          position: { x: p.x, y: p.y },
          width: p.width,
          height: p.height,
          style: { width: p.width, height: p.height },
          data: { node: n, placed: p, density, messages: m, outEdges: vg.edges.filter((e) => e.source === n.id), onToggleGroup: n.collapsed ? toggleGroup : undefined },
          draggable: false,
          connectable: false,
          selectable: false,
          focusable: true,
          ariaRole: 'group',
          ariaLabel: ariaLabelFor(n, vg, m, byId),
          domAttributes: { 'aria-roledescription': n.kind === 'step' ? m.roleStep : n.kind },
        };
      });
    const edges: AfRFEdge[] = vg.edges
      .filter((e) => layout.edges[e.id] && layout.nodes[e.source] && layout.nodes[e.target])
      .map((e) => {
        const placed = layout.edges[e.id]!;
        const label = placed.labelText || edgeLabelText(e, density, m.lang);
        return {
          id: e.id,
          type: 'af',
          source: e.source,
          target: e.target,
          sourceHandle: e.sourcePort,
          targetHandle: e.targetPort,
          focusable: false,
          selectable: false,
          data: { edge: e, placed, title: edgeTitle(e, byId.get(e.target), m, label) },
        };
      });
    return { rfNodes: [...frames, ...nodes] as Node[], rfEdges: edges };
  }, [layout, vg, density, m, toggleGroup, byId]);

  // fitView after each layout whose structure / direction / lanes / density changed.
  useEffect(() => {
    if (!layout) return;
    const fitKey = `${graph.workflowId}|${layout.options.direction}|${layout.options.lanes}|${layout.options.density}|${vg.nodes.length}`;
    if (fitKey === lastFitKey.current) return;
    lastFitKey.current = fitKey;
    const raf = typeof requestAnimationFrame !== 'undefined' ? requestAnimationFrame : (f: () => void) => setTimeout(f, 0);
    raf(() =>
      raf(async () => {
        await rf.fitView({ padding: fitPadding, maxZoom: 1, duration: 0 });
        // Large graphs: if "see everything" makes text unreadable, frame the start of the workflow.
        if (rf.getZoom() < MIN_READABLE_FIT_ZOOM) {
          const first = vg.nodes.find((n) => n.kind === 'input') ?? vg.nodes[0];
          const p = first && layout.nodes[first.id];
          const rect = wrapperRef.current?.getBoundingClientRect();
          if (p && rect) {
            const z = START_ZOOM_LARGE;
            void rf.setViewport({ x: rect.width / 2 - (p.x + p.width / 2) * z, y: 70 - p.y * z, zoom: z });
            setAnnounce(`${m.announceLayout(layout.ms, vg.nodes.length)} ${m.announceLargeStart}`);
          }
        }
        setFitDone((n) => n + 1);
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout, rf, graph.workflowId, vg.nodes.length, fitPadding]);

  // ---------- Selection / navigation ----------
  const infoOf = (n: ViewNode): SelectionInfo => ({ nodeId: n.id, workflowId: n.workflowId });
  const select = useCallback(
    (id: string | null, opts: { announce?: boolean } = {}) => {
      store.set({ selectedId: id });
      const n = id ? byId.get(id) ?? null : null;
      onSelectStep?.(n ? n.stepId ?? n.id : null, n?.core ?? null, n ? infoOf(n) : null);
      if (n && opts.announce !== false) {
        const exits = vg.edges.filter((e) => e.source === n.id).length;
        setAnnounce(m.announceSelected(nodeName(n, m), n.kind === 'step' ? kindText(n, m) : n.kind, exits));
      }
    },
    [store, byId, onSelectStep, vg, m],
  );

  const focusNode = useCallback(
    (id: string) => {
      const el = wrapperRef.current?.querySelector<HTMLElement>(`.react-flow__node[data-id="${escapeId(id)}"]`);
      if (el) {
        el.focus({ preventScroll: true });
        focusedId.current = id;
      }
      const p = layout?.nodes[id];
      if (p) {
        const vp = rf.getViewport();
        const rect = wrapperRef.current?.getBoundingClientRect();
        if (rect && rect.width > 0) {
          const sx = p.x * vp.zoom + vp.x;
          const sy = p.y * vp.zoom + vp.y;
          const out = sx < 0 || sy < 40 || sx + p.width * vp.zoom > rect.width || sy + p.height * vp.zoom > rect.height - 20;
          if (out) void rf.setCenter(p.x + p.width / 2, p.y + p.height / 2, { zoom: Math.max(vp.zoom, 0.6), duration: prefersReducedMotion() ? 0 : 150 });
        }
      }
    },
    [layout, rf],
  );

  const neighbor = useCallback(
    (id: string, dir: 'down' | 'up' | 'left' | 'right' | 'failure'): string | null => {
      const outs = vg.edges.filter((e) => e.source === id && e.target !== id);
      const ins = vg.edges.filter((e) => e.target === id && e.source !== id);
      const rank = (list: string[], k: string) => list.indexOf(k) + 1 || 99;
      if (dir === 'down') return [...outs].sort((a, b) => rank(PRIMARY_NEXT, a.kind) - rank(PRIMARY_NEXT, b.kind))[0]?.target ?? null;
      if (dir === 'failure')
        return (
          [...outs]
            .filter((e) => FAILURE_NEXT.includes(e.kind) || e.origin === 'onFailure')
            .sort((a, b) => rank(FAILURE_NEXT, a.kind) - rank(FAILURE_NEXT, b.kind))[0]?.target ?? null
        );
      if (dir === 'up') {
        const prim = ins.filter((e) => !e.backward);
        return [...(prim.length ? prim : ins)].sort((a, b) => rank(PRIMARY_NEXT, a.kind) - rank(PRIMARY_NEXT, b.kind))[0]?.source ?? null;
      }
      if (!layout) return null;
      const me = layout.nodes[id];
      if (!me) return null;
      const TB = layout.options.direction === 'TB';
      type R = { x: number; y: number; width: number; height: number };
      const c = (p: R) => (TB ? p.y + p.height / 2 : p.x + p.width / 2);
      const t = (p: R) => (TB ? p.x + p.width / 2 : p.y + p.height / 2);
      const same = Object.entries(layout.nodes)
        .filter(([oid, p]) => oid !== id && Math.abs(c(p) - c(me)) < (TB ? Math.max(p.height, me.height) : Math.max(p.width, me.width)) / 2 + 8)
        .sort((a, b) => t(a[1]) - t(b[1]));
      const mine = t(me);
      if (dir === 'right') return same.find(([, p]) => t(p) > mine)?.[0] ?? null;
      return [...same].reverse().find(([, p]) => t(p) < mine)?.[0] ?? null;
    },
    [vg, layout],
  );

  const runSearch = useCallback(
    (q: string, step = 0) => {
      setQuery(q);
      const s = q.trim().toLowerCase();
      if (!s) {
        store.set({ matches: null, currentMatch: null });
        return;
      }
      const hits = vg.nodes
        .filter((n) => [n.label, n.operationId, n.operationPath, n.channel, n.summary, n.path, n.targetWorkflowId].some((v) => v?.toLowerCase().includes(s)))
        .map((n) => n.id);
      const cur = store.get().currentMatch;
      let idx = cur ? hits.indexOf(cur) : -1;
      idx = step === 0 ? (idx >= 0 ? idx : 0) : (idx + step + hits.length) % Math.max(hits.length, 1);
      const current = hits[idx] ?? null;
      store.set({ matches: new Set(hits), currentMatch: current });
      if (current) {
        const p = layout?.nodes[current];
        if (p) void rf.setCenter(p.x + p.width / 2, p.y + p.height / 2, { zoom: Math.max(rf.getZoom(), 0.75), duration: prefersReducedMotion() ? 0 : 150 });
        setAnnounce(m.announceSearch(idx + 1, hits.length, q));
      } else setAnnounce(m.announceNoResult(q));
    },
    [vg, store, layout, rf, m],
  );

  const setFocusMode = useCallback(
    (id: string) => {
      focusDepth.current = store.get().focusSet && focusedId.current === id ? Math.min(focusDepth.current + 1, 2) : 1;
      let set = new Set([id]);
      for (let d = 0; d < focusDepth.current; d++) {
        const next = new Set(set);
        for (const e of vg.edges) {
          if (set.has(e.source)) next.add(e.target);
          if (set.has(e.target)) next.add(e.source);
        }
        set = next;
      }
      store.set({ focusSet: set });
      setAnnounce(m.announceFocusMode(nodeName(byId.get(id), m, id)));
    },
    [store, vg, byId, m],
  );

  const reveal = useCallback(
    (id: string) => {
      const n = byId.get(id);
      if (!n) return;
      select(id, { announce: false });
      if (n.kind === 'workflow-ref' && !n.collapsed && onOpenWorkflow) onOpenWorkflow(n.targetWorkflowId ?? n.label);
      else if (n.core) onRevealStep?.(n.stepId ?? n.id, n.core, infoOf(n));
      setAnnounce(m.announceReveal(nodeName(n, m)));
    },
    [byId, select, onRevealStep, onOpenWorkflow, m],
  );

  const fit = useCallback(() => void rf.fitView({ padding: fitPadding, maxZoom: 1, duration: prefersReducedMotion() ? 0 : 200 }), [rf, fitPadding]);
  const cycleLanes = useCallback(() => setLanes((l) => (l === 'off' ? 'clusters' : l === 'clusters' ? 'lanes' : 'off')), []);
  const cycleDensity = useCallback(
    () => setDensityPref((d) => (d === 'auto' ? 'compact' : d === 'compact' ? 'standard' : d === 'standard' ? 'detailed' : 'auto')),
    [],
  );

  // ---------- Exports ----------
  const mermaid = useCallback(() => toMermaid(graph, { direction, lanes, hideFailures: !showFailure }), [graph, direction, lanes, showFailure]);
  const image = useCallback(
    async (format: 'svg' | 'png') => {
      const root = wrapperRef.current;
      if (!root || !layout) throw new Error('arazzo-flow: graph not laid out yet');
      const xs: { x: number; y: number; width: number; height: number }[] = [...Object.values(layout.nodes), ...layout.frames];
      for (const e of Object.values(layout.edges)) {
        for (const p of e.points ?? []) xs.push({ x: p.x, y: p.y, width: 0, height: 0 });
        if (e.label) xs.push({ x: e.label.x - 8, y: e.label.y, width: e.label.width + 16, height: e.label.height });
      }
      // Labels rendered outside ELK (lanes mode, self loops): read their DOM boxes in flow coordinates.
      const vp = rf.getViewport();
      const rootBox = root.getBoundingClientRect();
      root.querySelectorAll<HTMLElement>('.af-edge-label').forEach((el) => {
        const b = el.getBoundingClientRect();
        if (!b.width) return;
        xs.push({ x: (b.left - rootBox.left - vp.x) / vp.zoom, y: (b.top - rootBox.top - vp.y) / vp.zoom, width: b.width / vp.zoom, height: b.height / vp.zoom });
      });
      const x0 = Math.min(...xs.map((p) => p.x));
      const y0 = Math.min(...xs.map((p) => p.y));
      const x1 = Math.max(...xs.map((p) => p.x + p.width));
      const y1 = Math.max(...xs.map((p) => p.y + p.height));
      return exportImage(root, format, { bounds: { x: x0, y: y0 - 12, width: x1 - x0, height: y1 - y0 + 24 } });
    },
    [layout, rf],
  );
  const doExport = useCallback(
    async (format: ExportFormat) => {
      setExportOpen(false);
      const filename = `${graph.workflowId}.${format === 'mermaid' ? 'mmd' : format}`;
      try {
        if (format === 'mermaid') {
          const text = mermaid();
          if (onExport) onExport({ format, filename, text });
          else {
            try {
              await navigator.clipboard.writeText(text);
              setAnnounce(m.ui.copied);
            } catch {
              downloadBlob(new Blob([text], { type: 'text/plain' }), filename);
            }
          }
        } else {
          const blob = await image(format);
          if (onExport) onExport({ format, filename, blob });
          else downloadBlob(blob, filename);
        }
        setAnnounce(m.announceExported(format.toUpperCase()));
      } catch (err) {
        setAnnounce(String(err));
      }
    },
    [graph.workflowId, mermaid, image, onExport, m],
  );

  useImperativeHandle(
    apiRef,
    () => ({
      fitView: fit,
      focusStep: (id) => {
        const r = resolveId(id);
        if (r) focusNode(r);
      },
      search: (q) => runSearch(q),
      select: (id) => select(resolveId(id)),
      centerOn: (id, zoom) => {
        const r = resolveId(id);
        const p = r ? layout?.nodes[r] : undefined;
        if (p) void rf.setCenter(p.x + p.width / 2, p.y + p.height / 2, { zoom: zoom ?? rf.getZoom(), duration: 0 });
      },
      exportImage: image,
      toMermaid: mermaid,
    }),
    [fit, focusNode, runSearch, select, layout, rf, resolveId, image, mermaid],
  );

  // ---------- Keyboard (only while the canvas has focus) ----------
  const openHelp = () => {
    const d = helpRef.current;
    if (d && typeof d.showModal === 'function') d.showModal();
    else d?.setAttribute('open', '');
  };
  const onKeyDown = (ev: ReactKeyboardEvent<HTMLDivElement>) => {
    const target = ev.target as HTMLElement;
    const inField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable;
    if (inField) return;
    if (target.closest('dialog, .af-list, .af-export')) return;
    if (target.tagName === 'BUTTON' && (ev.key === 'Enter' || ev.key === ' ')) return;
    const cur = focusedId.current && byId.has(focusedId.current) ? focusedId.current : null;
    const k = ev.key;
    const go = (id: string | null) => {
      if (id) {
        ev.preventDefault();
        focusNode(id);
      }
    };
    if ((k === '/' && !ev.ctrlKey) || ((ev.ctrlKey || ev.metaKey) && k.toLowerCase() === 'f')) {
      if (props.showSearch === false) return;
      ev.preventDefault();
      searchRef.current?.focus();
      searchRef.current?.select();
      return;
    }
    if (ev.ctrlKey || ev.metaKey) return;
    switch (k) {
      case 'ArrowDown':
        if (!cur) return go(vg.nodes[0]?.id ?? null);
        return go(neighbor(cur, ev.altKey ? 'failure' : 'down'));
      case 'ArrowUp':
        return cur ? go(neighbor(cur, 'up')) : undefined;
      case 'ArrowLeft':
        return cur ? go(neighbor(cur, layout?.options.direction === 'LR' ? 'up' : 'left')) : undefined;
      case 'ArrowRight':
        return cur ? go(neighbor(cur, layout?.options.direction === 'LR' ? 'down' : 'right')) : undefined;
      case 'Enter':
        if (cur) {
          ev.preventDefault();
          reveal(cur);
        }
        return;
      case ' ':
        if (cur) {
          ev.preventDefault();
          select(store.get().selectedId === cur ? null : cur);
        }
        return;
      case 'Escape': {
        const s = store.get();
        if (s.matches) runSearch('');
        else if (s.focusSet) store.set({ focusSet: null });
        else select(null);
        return;
      }
      case '+':
      case '=':
        ev.preventDefault();
        void rf.zoomIn({ duration: 100 });
        return;
      case '-':
        ev.preventDefault();
        void rf.zoomOut({ duration: 100 });
        return;
      case '0':
        void rf.zoomTo(1, { duration: 100 });
        return;
      case '1':
      case 'F':
        if (k === 'F' && !ev.shiftKey) break;
        fit();
        return;
    }
    switch (k.toLowerCase()) {
      case 'f':
        if (cur) setFocusMode(cur);
        return;
      case 'e':
        setShowFailure((v) => !v);
        return;
      case 'l':
        cycleLanes();
        return;
      case 'd':
        setDirection((d) => (d === 'TB' ? 'LR' : 'TB'));
        return;
      case 'm':
        setShowMinimap((v) => !v);
        return;
      case 'v':
        setShowList((v) => !v);
        return;
      case '?':
        openHelp();
        return;
    }
    if (k === '[' || k === ']' || k === '{' || k === '}') {
      const n = cur ? byId.get(cur) : null;
      const gid = n?.groupId ?? (n?.id.endsWith(':collapsed') ? n.id.replace(/:collapsed$/, '') : null);
      const collapse = k === '[' || k === '{';
      if (ev.shiftKey || k === '{' || k === '}') {
        const all: Record<string, boolean> = {};
        view.groups.forEach((g) => (all[g.id] = collapse));
        setCollapsed(all);
      } else if (gid) setCollapsed((c) => ({ ...c, [gid]: collapse }));
    }
  };

  const lod = useStore((s) => (s.transform[2] < 0.25 ? 'min' : s.transform[2] < 0.45 ? 'pill' : 'full'));
  const zoomLow = useStore((s) => s.transform[2] < 0.6);
  const zoomPct = useStore((s) => Math.round(s.transform[2] * 100));
  const failuresCount = view.edges.filter((e) => e.origin === 'onFailure').length;
  const subflows = view.groups.length;
  const matches = useUi((s) => s.matches);
  const currentMatch = useUi((s) => s.currentMatch);
  const matchesInfo = (() => {
    if (!matches) return '';
    const arr = [...matches];
    return arr.length ? `${arr.indexOf(currentMatch ?? '') + 1}/${arr.length}` : '0';
  })();
  const presentKinds = useMemo(() => new Set(vg.edges.map((e) => e.kind)), [vg]);
  const defaults = view.defaults;
  const showToolbar = props.showToolbar ?? true;

  return (
    <div
      ref={(el) => {
        wrapperRef.current = el;
        if (el !== rootEl) setRootEl(el);
      }}
      className={`af-root af-canvas${props.className ? ` ${props.className}` : ''}`}
      style={props.style}
      role="application"
      aria-label={m.graphLabel(graph.workflowId)}
      aria-describedby={ids.desc}
      aria-busy={pending || undefined}
      data-af-theme={theme.theme}
      data-af-dark={theme.dark || undefined}
      data-vscode-kind={theme.vscodeKind ?? undefined}
      data-lod={lod}
      data-large={large || undefined}
      data-zoom-low={zoomLow || undefined}
      data-contrast={theme.highContrast ? 'high' : undefined}
      onKeyDown={onKeyDown}
      onFocus={(e) => {
        const el = (e.target as HTMLElement).closest('.react-flow__node');
        const id = el?.getAttribute('data-id');
        if (id && byId.has(id)) focusedId.current = id;
      }}
    >
      <p id={ids.desc} className="af-sr-only">
        {m.graphDescription(stepCount, subflows, failuresCount)}
      </p>
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        nodesFocusable
        edgesFocusable={false}
        disableKeyboardA11y
        autoPanOnNodeFocus={false}
        zoomOnDoubleClick={false}
        onlyRenderVisibleElements={large}
        minZoom={0.08}
        maxZoom={2}
        colorMode={theme.dark ? 'dark' : 'light'}
        ariaLabelConfig={{
          'node.a11yDescription.default': m.ui.nodeA11y,
          'node.a11yDescription.keyboardDisabled': m.ui.nodeA11y,
          'edge.a11yDescription.default': m.ui.edgeA11y,
          'minimap.ariaLabel': m.ui.minimapLabel,
        }}
        onNodeClick={(_, n) => {
          if (n.type === 'frame') return;
          focusedId.current = n.id;
          select(store.get().selectedId === n.id ? null : n.id);
        }}
        onNodeDoubleClick={(_, n) => n.type !== 'frame' && reveal(n.id)}
        onNodeMouseEnter={(_, n) => n.type !== 'frame' && store.set({ hoverId: n.id })}
        onNodeMouseLeave={() => store.set({ hoverId: null })}
        onPaneClick={() => {
          setExportOpen(false);
          select(null);
        }}
        proOptions={{ hideAttribution: false }}
        attributionPosition="bottom-center"
      >
        <Background variant={BackgroundVariant.Dots} gap={18} size={1.2} className="af-bg" />
        {showMinimap && (
          <MiniMap
            pannable
            zoomable
            position="bottom-right"
            ariaLabel={m.ui.minimapLabel}
            nodeClassName={(n) => {
              if (n.type === 'frame') return 'af-mm af-mm--frame';
              const gn = (n.data as { node?: ViewNode }).node;
              return `af-mm af-mm--${gn?.kind === 'step' ? gn.stepKind : gn?.kind}`;
            }}
            nodeBorderRadius={4}
            className="af-minimap"
          />
        )}

        {props.showSearch !== false ? (
          <Panel position="top-left" className="af-panel af-search" role="search">
            <label className="af-search__box">
              <IconSearch size={14} />
              <span className="af-sr-only">{m.ui.search}</span>
              <input
                ref={searchRef}
                type="search"
                value={query}
                placeholder={m.ui.searchPlaceholder}
                aria-describedby={ids.hint}
                onChange={(e) => runSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    runSearch(query, e.shiftKey ? -1 : 1);
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    const cur = store.get().currentMatch;
                    runSearch('');
                    if (cur) focusNode(cur);
                    else wrapperRef.current?.querySelector<HTMLElement>('.react-flow__node[tabindex]')?.focus();
                  }
                }}
              />
              {query ? <span className="af-search__count">{matchesInfo}</span> : null}
              {query ? (
                <button type="button" className="af-iconbtn af-iconbtn--sm" aria-label={m.ui.clearSearch} onClick={() => runSearch('')}>
                  <IconX size={12} />
                </button>
              ) : null}
            </label>
            <span id={ids.hint} className="af-sr-only">
              {m.ui.searchHint}
            </span>
          </Panel>
        ) : null}

        {showToolbar ? (
          <Panel position="top-right" className="af-panel af-toolbar">
            <div role="toolbar" aria-label={m.ui.toolbar} className="af-toolbar__row">
              <ToolBtn label={m.ui.zoomOut} onClick={() => void rf.zoomOut({ duration: 100 })}>
                <IconMinus />
              </ToolBtn>
              <span className="af-toolbar__zoom" aria-hidden="true">
                {zoomPct} %
              </span>
              <ToolBtn label={m.ui.zoomIn} onClick={() => void rf.zoomIn({ duration: 100 })}>
                <IconPlus />
              </ToolBtn>
              <ToolBtn label={m.ui.zoom100} onClick={() => void rf.zoomTo(1, { duration: 100 })}>
                <IconOneToOne />
              </ToolBtn>
              <ToolBtn label={m.ui.fit} onClick={fit}>
                <IconFit />
              </ToolBtn>
              <span className="af-toolbar__sep" />
              <ToolBtn label={m.ui.direction(direction)} pressed={direction === 'LR'} onClick={() => setDirection((d) => (d === 'TB' ? 'LR' : 'TB'))} text={direction}>
                {direction === 'TB' ? <IconArrowDown /> : <IconArrowRight />}
              </ToolBtn>
              <ToolBtn label={m.ui.lanes(lanes)} pressed={lanes !== 'off'} onClick={cycleLanes} text={m.ui.lanesShort(lanes)}>
                <IconLanes />
              </ToolBtn>
              <ToolBtn label={m.ui.density(densityPref, density)} onClick={cycleDensity} text={m.ui.densityShort(densityPref)}>
                <IconDensity />
              </ToolBtn>
              <span className="af-toolbar__sep" />
              <ToolBtn label={m.ui.failureEdges} pressed={showFailure} onClick={() => setShowFailure((v) => !v)}>
                <IconFailureEdges />
              </ToolBtn>
              <ToolBtn label={m.ui.implicitFailures} pressed={showImplicit} onClick={() => setShowImplicit((v) => !v)} text="∅">
                {null}
              </ToolBtn>
              <ToolBtn label={m.ui.minimap} pressed={showMinimap} onClick={() => setShowMinimap((v) => !v)}>
                <IconMap />
              </ToolBtn>
              <ToolBtn label={m.ui.legend} pressed={showLegend} onClick={() => setShowLegend((v) => !v)}>
                <IconLegend />
              </ToolBtn>
              <ToolBtn label={m.ui.listView} pressed={showList} onClick={() => setShowList((v) => !v)}>
                <IconList />
              </ToolBtn>
              <span className="af-export">
                <ToolBtn label={m.ui.exportMenu} expanded={exportOpen} onClick={() => setExportOpen((v) => !v)}>
                  <IconDownload />
                </ToolBtn>
                {exportOpen ? (
                  <span className="af-export__menu" role="menu" aria-label={m.ui.exportMenu}>
                    {(['svg', 'png', 'mermaid'] as const).map((f) => (
                      <button key={f} type="button" role="menuitem" className="af-export__item" onClick={() => void doExport(f)}>
                        {f === 'svg' ? m.ui.exportSvg : f === 'png' ? m.ui.exportPng : m.ui.exportMermaid}
                      </button>
                    ))}
                  </span>
                ) : null}
              </span>
              <ToolBtn label={m.ui.help} onClick={openHelp}>
                <IconKeyboard />
              </ToolBtn>
            </div>
          </Panel>
        ) : null}

        {defaults ? (
          <Panel position="top-left" className="af-panel af-defaults" title={m.workflowDefaultsHint}>
            <span className="af-defaults__mark" aria-hidden="true">
              ⓦ
            </span>
            <strong>{m.workflowDefaults}</strong>
            {[...defaults.successActions, ...defaults.failureActions].map((a) => (
              <span
                key={`${a.outcome}|${a.name}`}
                className={`af-defaults__rule af-edge-label af-edge-label--${a.type === 'retry' ? 'retry' : a.outcome === 'failure' ? 'failure' : 'success'}`}
              >
                {a.type === 'retry'
                  ? `↻ ×${a.retryLimit ?? 1}${a.retryAfter ? ` · ${a.retryAfter} s` : ''}${a.target ? ` via ${a.target}` : ''}`
                  : `${a.outcome === 'failure' ? '✗' : '✓'} ${a.name}${a.type === 'end' ? ` → ${m.end}` : a.target ? ` → ${a.target}` : ''}`}
                {a.criteria?.length ? <span className="af-mono"> {m.if} {a.criteria.map((c) => c.condition).join(` ${m.and} `)}</span> : null}
              </span>
            ))}
            <span className="af-sr-only">{m.workflowDefaultsHint}</span>
          </Panel>
        ) : null}

        {showLegend ? (
          <Panel position="bottom-left" className="af-panel af-legend-panel">
            <Legend defaultOpen={props.legendExpanded ?? false} messages={m} kinds={presentKinds} />
          </Panel>
        ) : null}

        {vg.nodes.length > HUGE_NODES ? (
          <Panel position="bottom-center" className="af-panel af-notice" role="note">
            {m.largeGraph(vg.nodes.length)}
          </Panel>
        ) : null}
      </ReactFlow>
      {showList ? <ListView graph={vg} messages={m} onSelect={(id) => select(store.get().selectedId === id ? null : id)} onReveal={reveal} /> : null}
      {pending && layout ? (
        <div className="af-pending" aria-hidden="true">
          {m.announceLayoutPending}
        </div>
      ) : null}
      {!layout && !layoutError ? <div className="af-loading">{m.announceLayoutPending}</div> : null}
      {layoutError ? (
        <div className="af-loading af-loading--error" role="alert">
          {m.layoutError} <code>{layoutError}</code>
        </div>
      ) : null}
      <div className="af-sr-only" aria-live="polite" role="status">
        {announce}
      </div>
      <HelpDialog dialogRef={helpRef} m={m} id={ids.help} />
    </div>
  );
}

function ToolBtn({ label, onClick, pressed, expanded, children, text }: { label: string; onClick: () => void; pressed?: boolean; expanded?: boolean; children: ReactNode; text?: string }) {
  return (
    <button
      type="button"
      className={`af-iconbtn${text ? ' af-iconbtn--text' : ''}`}
      aria-label={label}
      title={label}
      aria-pressed={pressed === undefined ? undefined : pressed}
      aria-expanded={expanded === undefined ? undefined : expanded}
      aria-haspopup={expanded === undefined ? undefined : 'menu'}
      onClick={onClick}
    >
      {children}
      {text ? <span className="af-iconbtn__text">{text}</span> : null}
    </button>
  );
}

function HelpDialog({ dialogRef, m, id }: { dialogRef: React.RefObject<HTMLDialogElement | null>; m: Messages; id: string }) {
  const close = () => {
    const d = dialogRef.current;
    if (d && typeof d.close === 'function') d.close();
    else d?.removeAttribute('open');
  };
  return (
    <dialog ref={dialogRef} className="af-dialog" aria-labelledby={id}>
      <div className="af-dialog__head">
        <h2 id={id}>{m.ui.helpTitle}</h2>
        <button type="button" className="af-iconbtn" aria-label={m.ui.close} onClick={close}>
          <IconX />
        </button>
      </div>
      <p className="af-dialog__note">{m.ui.helpNote}</p>
      <table className="af-shortcuts">
        <tbody>
          {m.ui.shortcuts.map(([k, v]) => (
            <tr key={k}>
              <th scope="row">
                <kbd>{k}</kbd>
              </th>
              <td>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </dialog>
  );
}

/** Read-only graph of one Arazzo workflow. See README for the full API. */
export const ArazzoGraph = forwardRef<ArazzoGraphApi, ArazzoGraphProps>(function ArazzoGraph(props, ref) {
  const [store] = useState(createUiStore);
  return (
    <UiStoreContext.Provider value={store}>
      <ReactFlowProvider>
        <GraphInner {...props} store={store} apiRef={ref} />
      </ReactFlowProvider>
    </UiStoreContext.Provider>
  );
});
