import * as react from 'react';
import { CSSProperties } from 'react';
import { GraphEdge, GraphNode, WorkflowGraph, Diagnostic, GraphOptions, Step, SourceDescription, OperationInfo } from '@connethics/arazzo-core';
import { ElkNode } from 'elkjs/lib/elk-api';

/** i18n dictionaries (FR default, EN): UI labels, aria-labels and aria-live announcements. */
interface Messages {
    lang: 'fr' | 'en';
    inputs: string;
    outputs: string;
    endSuccess: string;
    endFailure: string;
    junction: string;
    step: string;
    steps: (n: number) => string;
    criteria: (n: number) => string;
    outputsCount: (n: number) => string;
    params: (n: number) => string;
    props: (n: number, req: number) => string;
    required: string;
    external: string;
    unresolved: string;
    methodFromPath: string;
    methodFromOpenApi: string;
    workflowDefaults: string;
    workflowDefaultsHint: string;
    then: string;
    unhandledFailure: string;
    end: string;
    if: string;
    and: string;
    reusable: (ref: string) => string;
    defaultValues: string;
    graphLabel: (wf: string) => string;
    graphDescription: (steps: number, groups: number, failures: number) => string;
    ariaStep: (a: {
        order?: number;
        total: number;
        id: string;
        kindText: string;
        source?: string;
        exits: string[];
        diagnostics: number;
    }) => string;
    ariaInputs: (n: number, req: number, names: string[]) => string;
    ariaOutputs: (names: string[]) => string;
    ariaEnd: (failure: boolean, from: number) => string;
    ariaJunction: (target: string, deps: string[]) => string;
    ariaRef: (wf: string, source?: string) => string;
    ariaLane: (name: string) => string;
    ariaSubworkflow: (name: string) => string;
    exitSuccess: (t: string) => string;
    exitFailure: (t: string) => string;
    exitRetry: (limit: number, after: number, via?: string) => string;
    exitNext: (t: string) => string;
    exitCall: (t: string) => string;
    exitDepends: (t: string) => string;
    kindHttp: (method: string, path?: string) => string;
    kindSend: (channel: string) => string;
    kindReceive: (channel: string, timeout?: string, corr?: string) => string;
    kindWorkflow: (wf: string, collapsed?: boolean, n?: number) => string;
    roleStep: string;
    announceSelected: (label: string, detail: string, exits: number) => string;
    announceLayout: (ms: number, nodes: number) => string;
    announceLayoutPending: string;
    announceLargeStart: string;
    announceSearch: (i: number, n: number, q: string) => string;
    announceNoResult: (q: string) => string;
    announceFocusMode: (label: string) => string;
    announceReveal: (label: string) => string;
    announceExported: (format: string) => string;
    layoutError: string;
    largeGraph: (n: number) => string;
    ui: {
        search: string;
        searchPlaceholder: string;
        searchHint: string;
        clearSearch: string;
        toolbar: string;
        zoomIn: string;
        zoomOut: string;
        zoom100: string;
        fit: string;
        direction: (d: 'TB' | 'LR') => string;
        lanes: (mode: 'off' | 'clusters' | 'lanes') => string;
        lanesShort: (mode: 'off' | 'clusters' | 'lanes') => string;
        density: (pref: string, effective: string) => string;
        densityShort: (pref: string) => string;
        failureEdges: string;
        implicitFailures: string;
        minimap: string;
        legend: string;
        listView: string;
        exportMenu: string;
        exportSvg: string;
        exportPng: string;
        exportMermaid: string;
        copied: string;
        help: string;
        helpTitle: string;
        helpNote: string;
        close: string;
        collapse: (name: string) => string;
        expand: (name: string) => string;
        unknownSource: string;
        shortcuts: [string, string][];
        legendEdges: string;
        legendNodes: string;
        legendEdgeLabels: Record<string, string>;
        legendNodeLabels: Record<'http' | 'send' | 'receive' | 'workflow' | 'junction' | 'end' | 'ref', string>;
        minimapLabel: string;
        nodeA11y: string;
        edgeA11y: string;
        listTitle: string;
    };
}
declare const fr: Messages;
declare const en: Messages;

/**
 * Render model (« view graph ») of `<ArazzoGraph>`.
 *
 * The public input of the component is the renderer-agnostic `WorkflowGraph` of
 * `@connethics/arazzo-core` (`workflowToGraph`). `toViewGraph()` (adapt.ts) turns it into
 * this model, which carries what the renderer needs on top of core: ports, typed edge kinds
 * (success / failure / transfer / implicit failure…), backward gotos, the workflow-level
 * default rules banner and diagnostics attached to nodes. This is the D1 mock-up model
 * (UI-SPEC §2), kept internal.
 */

/** Where the displayed HTTP method comes from: never guessed silently. */
type MethodSource = 'operationPath' | 'openapi' | 'unresolved';
type NodeKind = 'input' | 'step' | 'output' | 'end' | 'junction' | 'workflow-ref';
type StepKind = 'http' | 'async-send' | 'async-receive' | 'workflow';
type PortId = 'in' | 'in-deps' | 'out-next' | 'out-success' | 'out-failure' | 'out-retry' | 'out-call';
interface Criterion {
    condition: string;
    context?: string;
    type?: string;
    version?: string;
}
interface SelectorRef {
    context: string;
    selector: string;
    type: string;
    version?: string;
}
interface GraphDiagnostic {
    severity: 'error' | 'warning' | 'info' | 'hint';
    code: string;
    message: string;
}
interface InputProp {
    name: string;
    type?: string;
    required?: boolean;
    default?: unknown;
    description?: string;
}
interface OutputEntry {
    name: string;
    expression?: string;
    selector?: SelectorRef;
}
interface StepParam {
    name: string;
    in?: string;
}
interface ViewNode {
    id: string;
    kind: NodeKind;
    workflowId: string;
    /** stepId for a step, title for the other nodes. */
    label: string;
    stepId?: string;
    stepKind?: StepKind;
    /** 1-based rank in `steps` (document order). */
    order?: number;
    summary?: string;
    operationId?: string;
    operationPath?: string;
    method?: string;
    methodSource?: MethodSource;
    path?: string;
    channel?: string;
    action?: 'send' | 'receive';
    /** sourceDescription name: drives lanes. */
    source?: string;
    criteria?: Criterion[];
    timeoutMs?: number;
    correlationId?: string;
    stepOutputs?: string[];
    parameters?: StepParam[];
    hasRequestBody?: boolean;
    targetWorkflowId?: string;
    external?: boolean;
    collapsed?: boolean;
    innerStepCount?: number;
    dependsOn?: string[];
    inputs?: InputProp[];
    workflowOutputs?: OutputEntry[];
    endType?: 'success' | 'failure';
    /** Expanded sub-workflow (group) the node belongs to. */
    groupId?: string;
    diagnostics?: GraphDiagnostic[];
    /** Workflow-level actions apply to this step (ⓦ marker). */
    usesWorkflowDefaults?: boolean;
    /** The core node this view node comes from (passed to callbacks). */
    core?: GraphNode;
}
type EdgeKind = 'sequence' | 'success' | 'failure' | 'retry' | 'end-success' | 'end-failure' | 'implicit-failure' | 'depends-on' | 'workflow-call' | 'transfer';
declare const EDGE_KINDS: EdgeKind[];
interface ViewEdge {
    id: string;
    kind: EdgeKind;
    source: string;
    target: string;
    sourcePort: PortId;
    targetPort: PortId;
    /** Arazzo action `name`. */
    name?: string;
    criteria?: Criterion[];
    retryLimit?: number;
    retryAfter?: number;
    /** retryLimit is the spec default (shown in italics). */
    retryDefaults?: boolean;
    /** Retry through a step/workflow, workflow call or transfer: the target name. */
    via?: string;
    /** Reusable action (`$components.failureActions.x`). */
    reference?: string;
    origin?: 'onSuccess' | 'onFailure' | 'workflowDefault' | 'implicit' | 'dependsOn';
    /** goto towards an earlier step (or itself). */
    backward?: boolean;
    core?: GraphEdge;
}
interface ViewGroup {
    id: string;
    kind: 'workflow';
    label: string;
    workflowId: string;
    collapsed?: boolean;
}
interface ActionSummary {
    name: string;
    type: string;
    outcome: 'success' | 'failure';
    criteria?: Criterion[];
    retryLimit?: number;
    retryAfter?: number;
    target?: string;
}
interface SourceInfo {
    name: string;
    type?: string;
}
interface ViewGraph {
    workflowId: string;
    title: string;
    summary?: string;
    sources: SourceInfo[];
    nodes: ViewNode[];
    edges: ViewEdge[];
    /** Expanded sub-workflows. Lanes are derived from `sources`. */
    groups: ViewGroup[];
    defaults?: {
        successActions: ActionSummary[];
        failureActions: ActionSummary[];
    };
}

type Density = 'compact' | 'standard' | 'detailed';
type Direction = 'TB' | 'LR';
/** 6000 → « 6 s », 1500 → « 1,5 s », 250 → « 250 ms ». */
declare function formatTimeout(ms: number, lang?: 'fr' | 'en'): string;
/** `$sourceDescriptions.commerce.createInvoice` → `createInvoice` (the source is shown elsewhere). */
declare function shortOperationId(id: string): string;
/**
 * Readable operation of a step, for the node's secondary line and detail panels:
 * `METHOD /path` when the operation is resolved (operationPath or OpenAPI), otherwise the
 * operationId without its `$sourceDescriptions.<source>.` prefix, otherwise nothing.
 */
declare function operationLabel(n: {
    method?: string;
    methodSource?: string;
    path?: string;
    operationId?: string;
}): string | undefined;
/** Edge label (chip). Runtime expressions are kept verbatim. */
declare function edgeLabelText(e: ViewEdge, density: Density, lang?: 'fr' | 'en'): string;
declare const NODE_WIDTH: {
    readonly TB: 240;
    readonly LR: 220;
};
declare const HEIGHTS: {
    readonly compact: 44;
    readonly standard: 96;
    readonly line: 18;
    readonly maxLines: 5;
};
declare function nodeSize(n: ViewNode, density: Density, dir: Direction): {
    width: number;
    height: number;
};
declare function ariaLabelFor(n: ViewNode, g: ViewGraph, m: Messages, byId?: Map<string, ViewNode>): string;

type ElkMode = 'worker' | 'main-thread';
/** Minimal ELK-like engine (mockable in tests). */
interface LayoutEngine {
    layout(graph: ElkNode): Promise<ElkNode>;
}
interface ElkConfig {
    /** URL of the worker script (`@connethics/arazzo-flow/elk-worker.js`). */
    workerUrl?: string | URL;
    /** Factory returning a started Worker running `elk-worker.js` (takes precedence over workerUrl). */
    createWorker?: () => Worker;
    /** `auto` (default): worker then main-thread fallback; `main-thread`: never start a worker. */
    mode?: 'auto' | 'main-thread';
    /** Worker timeout before falling back to the main thread (ms, default 8000). */
    timeoutMs?: number;
    /** Fully custom engine (tests, server-side layout): bypasses workers. */
    engine?: LayoutEngine;
}
/** Warm up the engine (start the worker, GWT init) before the first layout. */
declare function prewarmElk(c?: ElkConfig): Promise<ElkMode>;
declare function elkMode(): ElkMode | null;
/** Forget the current engine (tests, config change). */
declare function resetElk(): void;
declare function runElk(graph: ElkNode, c?: ElkConfig): Promise<{
    result: ElkNode;
    mode: ElkMode;
}>;

type LanesMode = 'off' | 'clusters' | 'lanes';
interface LayoutOptions {
    direction: Direction;
    lanes: LanesMode;
    density: Density;
    lang: 'fr' | 'en';
    /** Lane header label for steps whose source is unknown. */
    unknownLabel?: string;
}
type Side = 'NORTH' | 'SOUTH' | 'EAST' | 'WEST';
interface PlacedPort {
    id: PortId;
    side: Side;
    /** Position relative au coin haut-gauche du nœud. */
    x: number;
    y: number;
}
interface PlacedNode {
    x: number;
    y: number;
    width: number;
    height: number;
    ports: PlacedPort[];
}
interface PlacedEdge {
    /** Polyligne ELK (absolue). Absente en mode couloirs : routage de repli côté rendu. */
    points?: {
        x: number;
        y: number;
    }[];
    /**
     * Arête qui entre dans un sous-workflow déplié : elle se termine sur le port d'entrée du
     * groupe (bord du cadre, hors de l'en-tête) et non sur la première étape. Point absolu.
     */
    entry?: {
        groupId: string;
        x: number;
        y: number;
        side: Side;
    };
    label?: {
        text: string;
        x: number;
        y: number;
        width: number;
        height: number;
    };
    labelText: string;
}
interface PlacedFrame {
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
interface LayoutResult {
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
declare const PORT_SIDES: Record<Direction, Record<PortId, Side>>;
/** Clé de cache : structure seulement (pas les descriptions) — R5 §4.8. */
declare function structureKey(g: ViewGraph, o: LayoutOptions): string;
/** Build the ELK input graph (exported for tests and for server-side layout). */
declare function buildElkGraph(g: ViewGraph, o: LayoutOptions): {
    root: ElkNode;
    containers: Set<string>;
    labelTexts: Record<string, string>;
    entries: Record<string, string>;
};
declare function computeLayout(g: ViewGraph, o: LayoutOptions, elk?: ElkConfig): Promise<LayoutResult>;

type ThemeProp = 'auto' | 'connethics-light' | 'connethics-dark' | 'vscode';
type VsCodeThemeKind = 'vscode-light' | 'vscode-dark' | 'vscode-high-contrast' | 'vscode-high-contrast-light';
interface ResolvedTheme {
    /** Value of `data-af-theme` on the root (`auto` = ConnEthics light/dark resolved by CSS). */
    theme: 'connethics-light' | 'connethics-dark' | 'auto' | 'vscode';
    vscodeKind: VsCodeThemeKind | null;
    dark: boolean;
    highContrast: boolean;
}
/** Current VS Code theme kind of the webview (null outside VS Code). */
declare function readVsCodeThemeKind(doc?: Document | undefined): VsCodeThemeKind | null;
declare function resolveTheme(theme: ThemeProp, highContrast: boolean | undefined, el: Element | null): ResolvedTheme;

/**
 * Exports: SVG / PNG of the whole graph (html-to-image on the React Flow viewport, CSS variables
 * resolved through computed styles), and Mermaid source (delegated to `graphToMermaid` of core).
 */

type ExportFormat = 'svg' | 'png' | 'mermaid';
interface ExportEvent {
    format: ExportFormat;
    /** Suggested file name (`<workflowId>.svg`…). */
    filename: string;
    /** SVG / PNG. */
    blob?: Blob;
    /** Mermaid source. */
    text?: string;
}
interface MermaidExportOptions {
    direction?: Direction;
    lanes?: LanesMode;
    hideFailures?: boolean;
}
declare function toMermaid(graph: WorkflowGraph, o?: MermaidExportOptions): string;
interface ImageExportOptions {
    /** Bounds of the content in flow coordinates (layout width/height). */
    bounds: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    padding?: number;
    /** PNG pixel ratio (default 2). */
    pixelRatio?: number;
    backgroundColor?: string;
}
/** `data:` URL → Blob, without `fetch` (works under a CSP without `connect-src data:`). */
declare function dataUrlToBlob(url: string): Blob;
/**
 * Render the whole graph (not just the visible part) to SVG or PNG.
 * `root` is the `.af-root` element of `<ArazzoGraph>`.
 */
declare function exportImage(root: HTMLElement, format: 'svg' | 'png', o: ImageExportOptions): Promise<Blob>;
/** Browser download (web). In a VS Code webview, pass `onExport` to `<ArazzoGraph>` and post the data to the host instead. */
declare function downloadBlob(blob: Blob, filename: string): void;

type DensityProp = 'auto' | Density;
interface ArazzoGraphApi {
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
interface LayoutStats {
    ms: number;
    mode: 'worker' | 'main-thread';
    nodes: number;
    edges: number;
    density: Density;
}
interface SelectionInfo {
    /** Node id in the rendered graph (`step:<stepId>`, `input`, `group:<wf>/step:<id>`…). */
    nodeId: string;
    /** Workflow the node belongs to (differs for steps of an expanded sub-workflow). */
    workflowId: string;
}
interface ArazzoGraphOptions {
    layout: Direction;
    lanes: LanesMode;
    density: DensityProp;
}
interface ArazzoGraphProps {
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
    onSelectStep?: (id: string | null, node: GraphNode | null, info: SelectionInfo | null) => void;
    /** Double-click / Enter: reveal in the editor (VS Code `step-selected`). */
    onRevealStep?: (id: string, node: GraphNode, info: SelectionInfo) => void;
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
/** Read-only graph of one Arazzo workflow. See README for the full API. */
declare const ArazzoGraph: react.ForwardRefExoticComponent<ArazzoGraphProps & react.RefAttributes<ArazzoGraphApi>>;

interface ArazzoGraphFromDocumentProps extends Omit<ArazzoGraphProps, 'graph' | 'subgraphs'> {
    /** Parsed Arazzo document (`parseArazzo(text).doc`). */
    doc: unknown;
    workflowId: string;
    /** HTTP method / path of a step from the loaded OpenAPI (see `createOpenApiResolver`). */
    resolveOperation?: GraphOptions['resolveOperation'];
    /** Draw implicit failures (hidden by default in the toolbar; this only builds them). Default true. */
    includeImplicitFailures?: boolean;
    /** Expand local sub-workflows (workflow steps, retry/goto via a workflow) as groups. Default true. */
    expandSubworkflows?: boolean;
    /** Rendered when the workflow does not exist. */
    fallback?: React.ReactNode;
}
declare const ArazzoGraphFromDocument: react.ForwardRefExoticComponent<ArazzoGraphFromDocumentProps & react.RefAttributes<ArazzoGraphApi>>;

/**
 * Core graph (`workflowToGraph`, @connethics/arazzo-core) → render model (model.ts).
 *
 * Pure and deterministic: same input, same output (node order matters for ELK MODEL_ORDER).
 */

interface AdaptOptions {
    /**
     * Workflow-level `successActions` / `failureActions` (edges with `action.origin === 'workflow'`):
     * `banner` (default, UI-SPEC D-DEFAULTS) shows them once in a banner and marks the steps with ⓦ;
     * `edges` draws them on every step.
     */
    workflowActions?: 'banner' | 'edges';
    /** Diagnostics of `@connethics/arazzo-core` (`validate`), attached to nodes by JSON path. */
    diagnostics?: readonly Diagnostic[];
    /**
     * Graphs of local workflows to expand inline as collapsible groups (UI-SPEC §4.6), keyed by
     * workflowId. A `workflow-ref` node pointing to one of them is replaced by its steps.
     */
    subgraphs?: Record<string, WorkflowGraph>;
}
/** Attach core diagnostics (by JSON path) to nodes of one workflow. */
declare function diagnosticsByNode(graph: WorkflowGraph, diagnostics: readonly Diagnostic[] | undefined): Map<string, GraphDiagnostic[]>;
/** Core graph → render model. */
declare function toViewGraph(graph: WorkflowGraph, opts?: AdaptOptions): ViewGraph;

/**
 * Options ELK exactes du graphe Arazzo (R5 §4.8, reprises dans UI-SPEC.md §5).
 * Valeurs sous forme de chaînes, clés complètes `org.eclipse.elk.*`.
 */
declare const ELK_ROOT_OPTIONS: {
    readonly 'org.eclipse.elk.algorithm': "layered";
    readonly 'org.eclipse.elk.direction': "DOWN";
    readonly 'org.eclipse.elk.edgeRouting': "ORTHOGONAL";
    readonly 'org.eclipse.elk.hierarchyHandling': "INCLUDE_CHILDREN";
    readonly 'org.eclipse.elk.layered.considerModelOrder.strategy': "NODES_AND_EDGES";
    readonly 'org.eclipse.elk.layered.cycleBreaking.strategy': "MODEL_ORDER";
    readonly 'org.eclipse.elk.layered.feedbackEdges': "true";
    readonly 'org.eclipse.elk.layered.layering.strategy': "NETWORK_SIMPLEX";
    readonly 'org.eclipse.elk.layered.crossingMinimization.strategy': "LAYER_SWEEP";
    readonly 'org.eclipse.elk.layered.nodePlacement.strategy': "BRANDES_KOEPF";
    readonly 'org.eclipse.elk.layered.nodePlacement.bk.fixedAlignment': "BALANCED";
    readonly 'org.eclipse.elk.layered.mergeEdges': "false";
    readonly 'org.eclipse.elk.layered.thoroughness': "7";
    readonly 'org.eclipse.elk.spacing.nodeNode': "32";
    readonly 'org.eclipse.elk.layered.spacing.nodeNodeBetweenLayers': "56";
    readonly 'org.eclipse.elk.layered.spacing.edgeNodeBetweenLayers': "24";
    readonly 'org.eclipse.elk.layered.spacing.edgeEdgeBetweenLayers': "12";
    readonly 'org.eclipse.elk.spacing.edgeNode': "20";
    readonly 'org.eclipse.elk.spacing.edgeEdge': "12";
    readonly 'org.eclipse.elk.spacing.edgeLabel': "6";
    readonly 'org.eclipse.elk.spacing.componentComponent': "48";
    readonly 'org.eclipse.elk.separateConnectedComponents': "true";
    readonly 'org.eclipse.elk.padding': "[top=24,left=24,bottom=24,right=24]";
    readonly 'org.eclipse.elk.edgeLabels.placement': "CENTER";
    readonly 'org.eclipse.elk.edgeLabels.inline': "true";
    readonly 'org.eclipse.elk.layered.edgeRouting.selfLoopDistribution': "EQUALLY";
    readonly 'org.eclipse.elk.layered.edgeRouting.selfLoopOrdering': "STACKED";
    readonly 'org.eclipse.elk.json.shapeCoords': "ROOT";
    readonly 'org.eclipse.elk.json.edgeCoords': "ROOT";
};
declare const ELK_NODE_OPTIONS: {
    readonly 'org.eclipse.elk.portConstraints': "FIXED_SIDE";
};
declare const ELK_GROUP_OPTIONS: {
    readonly 'org.eclipse.elk.padding': "[top=44,left=16,bottom=16,right=16]";
    readonly 'org.eclipse.elk.nodeSize.constraints': "MINIMUM_SIZE";
    readonly 'org.eclipse.elk.portConstraints': "FREE";
};
/**
 * Mesuré en D1 (Chromium, worker chaud) : thoroughness 10 → ~30 ms (11 nœuds), ~90 ms (pet-adoption, 12 nœuds,
 * 9 libellés, 4 arêtes arrière) ; 66 nœuds : 7 → ~230 ms, 4 → ~120 ms. D'où des paliers plus bas que R5 (10/7/4).
 */
declare function thoroughnessFor(nodeCount: number): string;

interface VisibilityOptions {
    showFailureEdges: boolean;
    showImplicitFailures: boolean;
    /** groupId → collapsed */
    collapsed: Record<string, boolean>;
}
/**
 * Graph actually rendered: failure edges filter, implicit failures, collapse of sub-workflows
 * (a collapsed group becomes a Reference node « ▸ n steps »).
 */
declare function visibleGraph(g: ViewGraph, o: VisibilityOptions): ViewGraph;

/**
 * `resolveOperation` for `workflowToGraph`: HTTP method + path of an `operationId`, read from the
 * OpenAPI documents the host has loaded (UI-SPEC §4.2: badge from the resolved OpenAPI, never guessed).
 */

/**
 * @param sources OpenAPI documents (parsed JSON/YAML) keyed by `sourceDescriptions[].name`.
 */
declare function createOpenApiResolver(sources: Record<string, unknown>): (step: Step, source: SourceDescription | undefined) => OperationInfo | undefined;

export { type AdaptOptions, ArazzoGraph, type ArazzoGraphApi, ArazzoGraphFromDocument, type ArazzoGraphFromDocumentProps, type ArazzoGraphOptions, type ArazzoGraphProps, type Density, type DensityProp, type Direction, EDGE_KINDS, ELK_GROUP_OPTIONS, ELK_NODE_OPTIONS, ELK_ROOT_OPTIONS, type EdgeKind, type ElkConfig, type ElkMode, type ExportEvent, type ExportFormat, HEIGHTS, type LanesMode, type LayoutEngine, type LayoutOptions, type LayoutResult, type LayoutStats, type MermaidExportOptions, type Messages, NODE_WIDTH, type NodeKind, PORT_SIDES, type PlacedEdge, type PlacedFrame, type PlacedNode, type PortId, type ResolvedTheme, type SelectionInfo, type StepKind, type ThemeProp, type ViewEdge, type ViewGraph, type ViewGroup, type ViewNode, type VsCodeThemeKind, ariaLabelFor, buildElkGraph, computeLayout, createOpenApiResolver, dataUrlToBlob, diagnosticsByNode, downloadBlob, edgeLabelText, elkMode, en, exportImage, formatTimeout, fr, nodeSize, operationLabel, prewarmElk, readVsCodeThemeKind, resetElk, resolveTheme, runElk, shortOperationId, structureKey, thoroughnessFor, toMermaid, toViewGraph, visibleGraph };
