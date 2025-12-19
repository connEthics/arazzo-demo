// Builder Right Panel Component
'use client';

import { memo, useMemo, useCallback } from 'react';
import { useBuilder } from '../context/BuilderContext';
import Inspector from '@/components/Inspector';
import ResizableInspectorPanel from '@/components/ResizableInspectorPanel';
import type { DetailData } from '@/components/DetailDrawer';
import type { InspectorStep } from '@/components/StepInspector';
import type { WorkflowInputs } from '@/types/arazzo';

export type ViewMode = 'builder' | 'documentation' | 'flowchart' | 'sequence';

interface RightPanelProps {
  viewMode: ViewMode;
  selectedWorkflowIndex: number;
  isOpen: boolean;
  onToggle: () => void;
  
  // For diagram modes
  detailData: DetailData | null;
  onDetailClose: () => void;
  
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

  // Handle step updates from Inspector edit mode
  const handleStepUpdate = useCallback((stepId: string, updates: Partial<InspectorStep>) => {
    // Convert InspectorStep parameters to Arazzo parameters with proper typing
    const parameters = updates.parameters?.map(p => ({
      name: p.name,
      in: p.in as 'path' | 'query' | 'header' | 'cookie' | undefined,
      value: p.value,
    }));

    // Convert criteria with proper type
    const successCriteria = updates.successCriteria?.map(c => ({
      condition: c.condition,
      type: c.type as 'simple' | 'regex' | 'jsonpath' | 'xpath' | undefined,
    }));

    dispatch({
      type: 'UPDATE_STEP',
      payload: {
        stepId,
        updates: {
          stepId: updates.stepId,
          operationId: updates.operationId,
          operationPath: updates.operationPath,
          workflowId: updates.workflowId,
          description: updates.description,
          parameters,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          requestBody: updates.requestBody as any,
          successCriteria,
          outputs: updates.outputs,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onSuccess: updates.onSuccess as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onFailure: updates.onFailure as any,
        },
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

  // Convert selected node to DetailData for drawer
  const selectedDetailData = useMemo((): DetailData | null => {
    if (viewMode !== 'builder') return detailData;
    
    if (state.selectedNodeType === 'step' && state.selectedStepId) {
      const step = workflow?.steps.find(s => s.stepId === state.selectedStepId);
      if (step) {
        return { type: 'step', step, sourceForStep: getSourceForStep(step) };
      }
    }
    if (state.selectedNodeType === 'input' && currentWorkflowInputs) {
      return { type: 'input' };
    }
    if (state.selectedNodeType === 'output') {
      return { type: 'output' };
    }
    return null;
  }, [state.selectedNodeType, state.selectedStepId, workflow, currentWorkflowInputs, getSourceForStep, viewMode, detailData]);

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
      data={viewMode === 'builder' ? selectedDetailData : detailData}
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
      initialMode="read"
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
