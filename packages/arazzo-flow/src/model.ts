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
import type { Diagnostic, GraphNode as CoreNode, GraphEdge as CoreEdge } from '@connethics/arazzo-core';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS' | 'TRACE' | 'QUERY';

/** Where the displayed HTTP method comes from: never guessed silently. */
export type MethodSource = 'operationPath' | 'openapi' | 'unresolved';

export type NodeKind = 'input' | 'step' | 'output' | 'end' | 'junction' | 'workflow-ref';
export type StepKind = 'http' | 'async-send' | 'async-receive' | 'workflow';

export type PortId = 'in' | 'in-deps' | 'out-next' | 'out-success' | 'out-failure' | 'out-retry' | 'out-call';

export interface Criterion {
  condition: string;
  context?: string;
  type?: string;
  version?: string;
}

export interface SelectorRef {
  context: string;
  selector: string;
  type: string;
  version?: string;
}

export interface GraphDiagnostic {
  severity: 'error' | 'warning' | 'info' | 'hint';
  code: string;
  message: string;
}

export interface InputProp {
  name: string;
  type?: string;
  required?: boolean;
  default?: unknown;
  description?: string;
}

export interface OutputEntry {
  name: string;
  expression?: string;
  selector?: SelectorRef;
}

export interface StepParam {
  name: string;
  in?: string;
}

export interface ViewNode {
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
  core?: CoreNode;
}

export type EdgeKind =
  | 'sequence'
  | 'success'
  | 'failure'
  | 'retry'
  | 'end-success'
  | 'end-failure'
  | 'implicit-failure'
  | 'depends-on'
  | 'workflow-call'
  | 'transfer';

export const EDGE_KINDS: EdgeKind[] = [
  'sequence',
  'success',
  'failure',
  'retry',
  'end-success',
  'end-failure',
  'implicit-failure',
  'depends-on',
  'workflow-call',
  'transfer',
];

export interface ViewEdge {
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
  core?: CoreEdge;
}

export interface ViewGroup {
  id: string;
  kind: 'workflow';
  label: string;
  workflowId: string;
  collapsed?: boolean;
}

export interface ActionSummary {
  name: string;
  type: string;
  outcome: 'success' | 'failure';
  criteria?: Criterion[];
  retryLimit?: number;
  retryAfter?: number;
  target?: string;
}

export interface SourceInfo {
  name: string;
  type?: string;
}

export interface ViewGraph {
  workflowId: string;
  title: string;
  summary?: string;
  sources: SourceInfo[];
  nodes: ViewNode[];
  edges: ViewEdge[];
  /** Expanded sub-workflows. Lanes are derived from `sources`. */
  groups: ViewGroup[];
  defaults?: { successActions: ActionSummary[]; failureActions: ActionSummary[] };
}

export const STEP_PORTS: PortId[] = ['in', 'in-deps', 'out-next', 'out-success', 'out-retry', 'out-failure', 'out-call'];

export type { Diagnostic };
