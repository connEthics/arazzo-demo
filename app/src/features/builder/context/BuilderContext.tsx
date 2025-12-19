'use client';

import { createContext, useContext, useReducer, ReactNode } from 'react';
import { BuilderState, BuilderAction } from '../types/builder';
import type { SuccessAction } from '@/types/arazzo';

const initialState: BuilderState = {
  spec: {
    arazzo: '1.0.1',
    info: { title: 'New Workflow', version: '1.0.0' },
    sourceDescriptions: [],
    workflows: [{ workflowId: 'workflow-1', steps: [] }]
  },
  selectedStepId: null,
  selectedNodeType: null,
  selectedWorkflowIndex: 0,
  sources: {},
  needsAutoLayout: false
};

export function builderReducer(state: BuilderState, action: BuilderAction): BuilderState {
  switch (action.type) {
    case 'LOAD_SPEC':
      // Load a new spec, preserving existing sources
      return {
        ...state,
        spec: action.payload,
        selectedStepId: null,
        selectedNodeType: null,
        selectedWorkflowIndex: 0
      };
    case 'LOAD_SAMPLE':
      return {
        ...state,
        spec: action.payload.spec,
        sources: action.payload.sources,
        selectedStepId: null,
        selectedNodeType: null,
        selectedWorkflowIndex: 0,
        needsAutoLayout: true
      };
    case 'ADD_SOURCE':
      return {
        ...state,
        sources: { ...state.sources, [action.payload.name]: action.payload.content },
        spec: {
          ...state.spec,
          sourceDescriptions: [
            ...state.spec.sourceDescriptions,
            { name: action.payload.name, url: 'uploaded', type: 'openapi' }
          ]
        }
      };
    case 'ADD_STEP':
      const newStep = action.payload.step;
      return {
        ...state,
        spec: {
          ...state.spec,
          workflows: state.spec.workflows.map((wf, idx) => 
            idx === state.selectedWorkflowIndex ? { ...wf, steps: [...wf.steps, newStep] } : wf
          )
        }
      };
    case 'DELETE_STEP':
      const stepToDelete = action.payload.stepId;
      return {
        ...state,
        selectedStepId: state.selectedStepId === stepToDelete ? null : state.selectedStepId,
        selectedNodeType: state.selectedStepId === stepToDelete ? null : state.selectedNodeType,
        spec: {
          ...state.spec,
          workflows: state.spec.workflows.map((wf, idx) => 
            idx === state.selectedWorkflowIndex ? {
              ...wf,
              steps: wf.steps
                .filter(s => s.stepId !== stepToDelete)
                .map(s => {
                  // Remove references to deleted step in other steps
                  let updated = { ...s };
                  if (updated.onSuccess) {
                    updated.onSuccess = updated.onSuccess.filter(a => {
                      if ('reference' in a) return true;
                      return a.stepId !== stepToDelete;
                    });
                    if (updated.onSuccess.length === 0) delete updated.onSuccess;
                  }
                  if (updated.onFailure) {
                    updated.onFailure = updated.onFailure.filter(a => {
                      if ('reference' in a) return true;
                      return a.stepId !== stepToDelete;
                    });
                    if (updated.onFailure.length === 0) delete updated.onFailure;
                  }
                  return updated;
                })
            } : wf
          )
        }
      };
    case 'UPDATE_STEP':
      const oldStepId = action.payload.stepId;
      const newStepId = action.payload.updates.stepId;
      const isRenaming = newStepId && newStepId !== oldStepId;
      
      return {
        ...state,
        // Update selectedStepId if the stepId itself changed
        selectedStepId: newStepId ? newStepId : state.selectedStepId,
        spec: {
          ...state.spec,
          workflows: state.spec.workflows.map((wf, idx) => 
            idx === state.selectedWorkflowIndex ? {
              ...wf,
              steps: wf.steps.map(s => {
                // Update the step itself
                if (s.stepId === oldStepId) {
                  return { ...s, ...action.payload.updates };
                }
                
                // If renaming, update all references to this stepId in other steps
                if (isRenaming) {
                  let updated = { ...s };
                  
                  // Update onSuccess references
                  if (updated.onSuccess) {
                    updated.onSuccess = updated.onSuccess.map(a => {
                      if ('reference' in a) return a;
                      if (a.stepId === oldStepId) {
                        return { ...a, stepId: newStepId, name: a.name?.replace(oldStepId, newStepId) };
                      }
                      return a;
                    });
                  }
                  
                  // Update onFailure references
                  if (updated.onFailure) {
                    updated.onFailure = updated.onFailure.map(a => {
                      if ('reference' in a) return a;
                      if (a.stepId === oldStepId) {
                        return { ...a, stepId: newStepId, name: a.name?.replace(oldStepId, newStepId) };
                      }
                      return a;
                    });
                  }
                  
                  // Update parameter value references ($steps.oldStepId.xxx)
                  if (updated.parameters) {
                    updated.parameters = updated.parameters.map(p => {
                      if ('reference' in p) return p;
                      const valueStr = String(p.value || '');
                      if (valueStr.includes(`$steps.${oldStepId}`)) {
                        return { ...p, value: valueStr.replace(`$steps.${oldStepId}`, `$steps.${newStepId}`) };
                      }
                      return p;
                    });
                  }
                  
                  return updated;
                }
                
                return s;
              })
            } : wf
          )
        }
      };
    case 'ADD_CONNECTION':
      const { sourceStepId, targetStepId } = action.payload;

      return {
        ...state,
        spec: {
          ...state.spec,
          workflows: state.spec.workflows.map((wf, idx) => 
            idx === state.selectedWorkflowIndex ? {
              ...wf,
              steps: wf.steps.map(s => 
                s.stepId === sourceStepId ? {
                  ...s,
                  onSuccess: [
                    ...(s.onSuccess || []),
                    { name: `goto-${targetStepId}`, type: 'goto', stepId: targetStepId }
                  ]
                } : s
              )
            } : wf
          )
        }
      };
    case 'DELETE_CONNECTION':
      // Remove the goTo action from source step to target step
      return {
        ...state,
        spec: {
          ...state.spec,
          workflows: state.spec.workflows.map((wf, idx) => 
            idx === state.selectedWorkflowIndex ? {
              ...wf,
              steps: wf.steps.map(s => {
                if (s.stepId !== action.payload.sourceStepId) return s;
                
                let updated = { ...s };
                if (updated.onSuccess) {
                  updated.onSuccess = updated.onSuccess.filter(a => {
                    if ('reference' in a) return true;
                    return !(a.type === 'goto' && a.stepId === action.payload.targetStepId);
                  });
                  if (updated.onSuccess.length === 0) delete updated.onSuccess;
                }
                return updated;
              })
            } : wf
          )
        }
      };
    case 'INSERT_STEP_ON_EDGE':
      // Insert new step and update connections: source -> newStep -> target
      const { step: insertedStep, sourceStepId: edgeSource, targetStepId: edgeTarget } = action.payload;
      return {
        ...state,
        selectedStepId: insertedStep.stepId,
        selectedNodeType: 'step',
        spec: {
          ...state.spec,
          workflows: state.spec.workflows.map((wf, idx) => 
            idx === state.selectedWorkflowIndex ? {
              ...wf,
              steps: [
                ...wf.steps.map(s => {
                  if (s.stepId !== edgeSource) return s;
                  // Update source step: change goTo from target to new step
                  let updated = { ...s };
                  if (updated.onSuccess) {
                    updated.onSuccess = updated.onSuccess.map(a => {
                      if ('reference' in a) return a;
                      if (a.type === 'goto' && a.stepId === edgeTarget) {
                        return { ...a, stepId: insertedStep.stepId, name: `goto-${insertedStep.stepId}` };
                      }
                      return a;
                    });
                  }
                  return updated;
                }),
                // Add new step with goTo to original target
                {
                  ...insertedStep,
                  onSuccess: [
                    { name: `goto-${edgeTarget}`, type: 'goto' as const, stepId: edgeTarget }
                  ]
                }
              ]
            } : wf
          )
        }
      };
    case 'SELECT_STEP':
      return { 
        ...state, 
        selectedStepId: action.payload,
        selectedNodeType: action.payload ? 'step' : null
      };
    case 'SELECT_NODE':
      return {
        ...state,
        selectedNodeType: action.payload.nodeType,
        selectedStepId: action.payload.stepId ?? null
      };
    case 'UPDATE_WORKFLOW':
      return {
        ...state,
        spec: {
          ...state.spec,
          workflows: state.spec.workflows.map(wf =>
            wf.workflowId === action.payload.workflowId
              ? { ...wf, ...action.payload.updates }
              : wf
          )
        }
      };
    case 'ADD_WORKFLOW':
      return {
        ...state,
        spec: {
          ...state.spec,
          workflows: [...state.spec.workflows, action.payload.workflow]
        }
      };
    case 'RENAME_WORKFLOW':
      return {
        ...state,
        spec: {
          ...state.spec,
          workflows: state.spec.workflows.map(wf =>
            wf.workflowId === action.payload.oldWorkflowId
              ? { ...wf, workflowId: action.payload.newWorkflowId }
              : wf
          )
        }
      };
    case 'DELETE_WORKFLOW':
      return {
        ...state,
        selectedWorkflowIndex: Math.max(0, state.selectedWorkflowIndex - 1),
        spec: {
          ...state.spec,
          workflows: state.spec.workflows.filter(wf => wf.workflowId !== action.payload.workflowId)
        }
      };
    case 'SET_WORKFLOW_INDEX':
      return {
        ...state,
        selectedWorkflowIndex: action.payload,
        selectedStepId: null,
        selectedNodeType: null
      };
    case 'CLEAR_AUTO_LAYOUT':
      return {
        ...state,
        needsAutoLayout: false
      };
    default:
      return state;
  }
}

const BuilderContext = createContext<{
  state: BuilderState;
  dispatch: React.Dispatch<BuilderAction>;
} | null>(null);

export function BuilderProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(builderReducer, initialState);

  return (
    <BuilderContext.Provider value={{ state, dispatch }}>
      {children}
    </BuilderContext.Provider>
  );
}

export function useBuilder() {
  const context = useContext(BuilderContext);
  if (!context) throw new Error('useBuilder must be used within a BuilderProvider');
  return context;
}
