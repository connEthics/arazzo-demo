import { ArazzoSpec, Step, Workflow } from '@/types/arazzo';
import { Edge, Node } from '@xyflow/react';

// Special selection types for workflow-level nodes
export type SelectedNodeType = 'step' | 'input' | 'output' | 'schema' | 'reusable-input' | null;

export interface BuilderState {
  spec: ArazzoSpec;
  selectedStepId: string | null;
  selectedComponentKey: string | null; // Track which reusable component is selected
  selectedNodeType: SelectedNodeType; // Track what type of node is selected
  selectedWorkflowIndex: number; // Currently selected workflow index
  sources: Record<string, any>; // Parsed OAS content
  needsAutoLayout: boolean; // Flag to trigger auto-layout after loading
}

export type BuilderAction =
  | { type: 'LOAD_SPEC'; payload: ArazzoSpec }
  | { type: 'LOAD_SAMPLE'; payload: { spec: ArazzoSpec; sources: Record<string, any> } }
  | { type: 'ADD_SOURCE'; payload: { name: string; content: any } }
  | { type: 'ADD_WORKFLOW'; payload: { workflow: Workflow } }
  | { type: 'RENAME_WORKFLOW'; payload: { oldWorkflowId: string; newWorkflowId: string } }
  | { type: 'DELETE_WORKFLOW'; payload: { workflowId: string } }
  | { type: 'ADD_STEP'; payload: { step: Step; position: { x: number; y: number } } }
  | { type: 'DELETE_STEP'; payload: { stepId: string } }
  | { type: 'UPDATE_STEP'; payload: { stepId: string; updates: Partial<Step> } }
  | { type: 'UPDATE_WORKFLOW'; payload: { workflowId: string; updates: Partial<Workflow> } }
  | { type: 'UPDATE_COMPONENTS'; payload: { updates: any } }
  | { type: 'DELETE_COMPONENT'; payload: { type: 'inputs' | 'schemas' | 'parameters'; name: string } }
  | { type: 'ADD_CONNECTION'; payload: { sourceStepId: string; targetStepId: string } }
  | { type: 'DELETE_CONNECTION'; payload: { sourceStepId: string; targetStepId: string } }
  | { type: 'INSERT_STEP_ON_EDGE'; payload: { step: Step; sourceStepId: string; targetStepId: string; position: { x: number; y: number } } }
  | { type: 'REORDER_STEP'; payload: { workflowId: string; startIndex: number; endIndex: number } }
  | { type: 'REORDER_INPUT'; payload: { workflowId?: string; componentKey?: string; startIndex: number; endIndex: number } }
  | { type: 'REORDER_OUTPUT'; payload: { workflowId?: string; stepId?: string; startIndex: number; endIndex: number } }
  | { type: 'SELECT_STEP'; payload: string | null }
  | { type: 'SELECT_NODE'; payload: { nodeType: SelectedNodeType; id?: string | null } }
  | { type: 'SET_WORKFLOW_INDEX'; payload: number }
  | { type: 'CLEAR_AUTO_LAYOUT' };
