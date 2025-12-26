// Builder Right Panel Component
'use client';

import { memo, useMemo, useCallback } from 'react';
import { useBuilder } from '../context/BuilderContext';
import Inspector from '@/components/Inspector';
import ResizableInspectorPanel from '@/components/ResizableInspectorPanel';
import type { DetailData } from '@/components/DetailDrawer';
import type { InspectorStep } from '@/components/StepInspector';
import type { Step, WorkflowInputs, Components } from '@/types/arazzo';

export type ViewMode = 'builder' | 'documentation' | 'flowchart' | 'sequence';

interface RightPanelProps {
  viewMode: ViewMode;
  selectedWorkflowIndex: number;
  isOpen: boolean;
  onToggle: () => void;

  // For diagram modes
  detailData: DetailData | null;
  onDetailClose: () => void;
  onDetailSelect?: (data: DetailData | null) => void;

  // Mobile
  isMobile?: boolean;
  onMobileClose?: () => void;
}

function RightPanel({
  viewMode,
  selectedWorkflowIndex,
  isOpen,
  onToggle,
  detailData,
  onDetailClose,
  onDetailSelect,
  isMobile = false,
  onMobileClose,
}: RightPanelProps) {
  const { state, dispatch } = useBuilder();

  const workflow = state.spec.workflows[selectedWorkflowIndex];
  const workflowId = workflow?.workflowId;
  const currentWorkflowSteps = workflow?.steps || [];
  const currentWorkflowInputs = workflow?.inputs;
  const currentWorkflowOutputs = workflow?.outputs || {};

  // Helper to get source for step
  const getSourceForStep = useCallback((step: { operationId?: string }) => {
    if (!state.spec?.sourceDescriptions) return undefined;
    if (step.operationId?.includes('.')) {
      const sourceName = step.operationId.split('.')[0];
      return state.spec.sourceDescriptions.find(s => s.name === sourceName);
    }
    return state.spec.sourceDescriptions[0];
  }, [state.spec]);

  // Handle step updates from Inspector
  const handleStepUpdate = useCallback((stepId: string, updates: Partial<Step>) => {
    dispatch({
      type: 'UPDATE_STEP',
      payload: {
        stepId,
        updates,
      },
    });
  }, [dispatch]);

  // Handle workflow inputs update
  const handleInputUpdate = useCallback((inputs: WorkflowInputs) => {
    if (!workflowId) return;
    dispatch({
      type: 'UPDATE_WORKFLOW',
      payload: {
        workflowId,
        updates: { inputs },
      },
    });
  }, [dispatch, workflowId]);

  // Handle workflow outputs update
  const handleOutputUpdate = useCallback((outputs: Record<string, string>) => {
    if (!workflowId) return;
    dispatch({
      type: 'UPDATE_WORKFLOW',
      payload: {
        workflowId,
        updates: { outputs },
      },
    });
  }, [dispatch, workflowId]);

  const handleReorderInput = useCallback((startIndex: number, endIndex: number) => {
    if (!workflowId) return;
    dispatch({
      type: 'REORDER_INPUT',
      payload: { workflowId, startIndex, endIndex },
    });
  }, [dispatch, workflowId]);

  const handleReorderOutput = useCallback((startIndex: number, endIndex: number) => {
    if (!workflowId) return;
    dispatch({
      type: 'REORDER_OUTPUT',
      payload: { workflowId, startIndex, endIndex },
    });
  }, [dispatch, workflowId]);

  const handleComponentsUpdate = useCallback((updates: Partial<Components>) => {
    dispatch({
      type: 'UPDATE_COMPONENTS',
      payload: { updates }
    });
  }, [dispatch]);

  // Handle step click (navigation)
  const handleStepClick = useCallback((stepId: string) => {
    if (viewMode === 'builder') {
      dispatch({ type: 'SELECT_STEP', payload: stepId });
    } else if (onDetailSelect) {
      const step = workflow?.steps.find(s => s.stepId === stepId);
      if (step) {
        onDetailSelect({
          type: 'step',
          step,
          sourceForStep: getSourceForStep(step)
        });
      }
    }
  }, [viewMode, dispatch, onDetailSelect, workflow, getSourceForStep]);

  // Convert selected node to DetailData for drawer
  // This memo ensures we always have the freshest data from the global state,
  // prioritizing the context selection (from Left Panel/Canvas) and then 
  // falling back to external selections (from Flowchart/Sequence).
  const selectedDetailData = useMemo((): DetailData | null => {
    // 1. If in diagram mode (flowchart/sequence), prioritize the local selection (detailData)
    if (viewMode !== 'builder' && detailData) {
      if (detailData.type === 'step' && detailData.step) {
        const stepId = detailData.step.stepId;
        const step = workflow?.steps.find(s => s.stepId === stepId);
        if (step) {
          return { ...detailData, step, sourceForStep: getSourceForStep(step) };
        }
      }
      return detailData;
    }

    // 2. Try context selection first (used by Left Panel and Builder Canvas)
    if (state.selectedNodeType === 'step' && state.selectedStepId) {
      const step = workflow?.steps.find(s => s.stepId === state.selectedStepId);
      if (step) {
        return { type: 'step', step, sourceForStep: getSourceForStep(step) };
      }
    }
    if (state.selectedNodeType === 'input') {
      return { type: 'input' };
    }
    if (state.selectedNodeType === 'output') {
      return { type: 'output' };
    }
    if (state.selectedNodeType === 'schema' && state.selectedComponentKey) {
      const schema = state.spec.components?.schemas?.[state.selectedComponentKey];
      if (schema) {
        return { type: 'schema', schema: { name: state.selectedComponentKey, schema } };
      }
    }
    if (state.selectedNodeType === 'reusable-input' && state.selectedComponentKey) {
      const inputs = state.spec.components?.inputs?.[state.selectedComponentKey];
      if (inputs) {
        return { type: 'reusable-input', reusableInput: { name: state.selectedComponentKey, inputs } };
      }
    }

    // 3. If no context selection, try selection from props (used by Flowchart/Sequence)
    // This fallback is still useful if viewMode is builder but we want to show something else (unlikely)
    if (detailData) {
      if (detailData.type === 'step' && detailData.step) {
        const stepId = detailData.step.stepId;
        const step = workflow?.steps.find(s => s.stepId === stepId);
        if (step) {
          return { ...detailData, step, sourceForStep: getSourceForStep(step) };
        }
      }
      return detailData;
    }

    return null;
  }, [state.selectedNodeType, state.selectedStepId, workflow, getSourceForStep, detailData, viewMode]);

  const handleClose = useCallback(() => {
    if (viewMode === 'builder') {
      dispatch({ type: 'SELECT_STEP', payload: null });
    } else {
      onDetailClose();
    }
    if (isMobile && onMobileClose) {
      onMobileClose();
    } else {
      onToggle();
    }
  }, [viewMode, dispatch, onDetailClose, isMobile, onMobileClose, onToggle]);

  const inspectorContent = (
    <Inspector
      data={selectedDetailData}
      isDark={false}
      onClose={handleClose}
      workflowInputs={currentWorkflowInputs}
      workflowOutputs={currentWorkflowOutputs}
      workflowId={workflowId}
      allSteps={currentWorkflowSteps}
      sources={state.spec.sourceDescriptions}
      onStepUpdate={handleStepUpdate}
      onInputUpdate={handleInputUpdate}
      onOutputUpdate={handleOutputUpdate}
      onReorderInput={handleReorderInput}
      onReorderOutput={handleReorderOutput}
      onComponentsUpdate={handleComponentsUpdate}
      initialMode="read"
      onStepClick={handleStepClick}
    />
  );

  if (isMobile) {
    return (
      <div className="flex-1 bg-white dark:bg-slate-950 overflow-hidden">
        {inspectorContent}
      </div>
    );
  }

  return (
    <ResizableInspectorPanel
      defaultWidth={384}
      minWidth={320}
      maxWidth={600}
      position="right"
      isOpen={isOpen}
      onToggle={onToggle}
      isDark={false}
    >
      {inspectorContent}
    </ResizableInspectorPanel>
  );
}

export default memo(RightPanel);
