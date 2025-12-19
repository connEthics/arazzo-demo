'use client';

import { useState, useMemo, useCallback } from 'react';
import DetailDrawer, { DetailData } from './DetailDrawer';
import StepInspector, { InspectorStep } from './StepInspector';
import InputEditor from './InputEditor';
import OutputEditor from './OutputEditor';
import { ExpressionSuggestion } from './ExpressionInput';
import { Action } from './ActionFormEditor';
import type { Step, WorkflowInputs, SourceDescription } from '@/types/arazzo';

interface InspectorProps {
  /** Current selection data (step, input, output) */
  data: DetailData | null;
  /** Dark mode */
  isDark?: boolean;
  /** Close handler */
  onClose?: () => void;
  /** Workflow inputs schema */
  workflowInputs?: WorkflowInputs;
  /** Workflow outputs mapping */
  workflowOutputs?: Record<string, string>;
  /** Current workflow ID */
  workflowId?: string;
  /** All steps in current workflow for goto dropdown */
  allSteps?: Step[];
  /** All sources for expression suggestions */
  sources?: SourceDescription[];
  /** Handle step update */
  onStepUpdate?: (stepId: string, updates: Partial<InspectorStep>) => void;
  /** Handle workflow input update */
  onInputUpdate?: (inputs: WorkflowInputs) => void;
  /** Handle workflow output update */
  onOutputUpdate?: (outputs: Record<string, string>) => void;
  /** Initial mode */
  initialMode?: 'read' | 'edit';
}

// Icons
const ReadIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const EditIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

/**
 * Inspector - Unified wrapper for read (DetailDrawer) and edit (StepInspector) modes.
 * Provides a toggle to switch between documentation view and editing forms.
 */
export default function Inspector({
  data,
  isDark = false,
  onClose,
  workflowInputs,
  workflowOutputs,
  workflowId,
  allSteps = [],
  sources = [],
  onStepUpdate,
  onInputUpdate,
  onOutputUpdate,
  initialMode = 'read',
}: InspectorProps) {
  const [mode, setMode] = useState<'read' | 'edit'>(initialMode);

  // Generate expression suggestions from context
  const expressionSuggestions = useMemo((): ExpressionSuggestion[] => {
    const suggestions: ExpressionSuggestion[] = [
      { expression: '$statusCode', label: 'HTTP Status Code', type: 'context' },
      { expression: '$response.body', label: 'Response Body', type: 'response' },
      { expression: '$response.body.id', label: 'Response ID', type: 'response' },
      { expression: '$response.body.length', label: 'Array Length', type: 'response' },
      { expression: '$response.header.content-type', label: 'Content-Type', type: 'response' },
      { expression: '$url', label: 'Request URL', type: 'context' },
      { expression: '$method', label: 'HTTP Method', type: 'context' },
    ];

    // Add workflow inputs
    if (workflowInputs?.properties) {
      Object.keys(workflowInputs.properties).forEach(key => {
        suggestions.push({
          expression: `$inputs.${key}`,
          label: `Input: ${key}`,
          type: 'input',
        });
      });
    }

    // Add step outputs
    allSteps.forEach(step => {
      if (step.outputs) {
        Object.keys(step.outputs).forEach(outputKey => {
          suggestions.push({
            expression: `$steps.${step.stepId}.outputs.${outputKey}`,
            label: `${step.stepId}.${outputKey}`,
            type: 'output',
          });
        });
      }
    });

    return suggestions;
  }, [workflowInputs, allSteps]);

  // Get available step IDs for goto dropdown
  const availableSteps = useMemo(() => {
    return allSteps.map(s => s.stepId);
  }, [allSteps]);

  // Convert Step to InspectorStep
  const convertToInspectorStep = useCallback((step: Step): InspectorStep => {
    // Convert parameters - filter out ReusableObject and map Parameter types
    const parameters = step.parameters?.filter(p => 'name' in p && 'value' in p).map(p => {
      const param = p as { name: string; in?: string; value: unknown };
      return {
        name: param.name,
        in: param.in,
        value: param.value as string | number | boolean,
      };
    });

    // Convert onSuccess actions - filter out ReusableObject references
    const onSuccess: Action[] = (step.onSuccess?.filter(a => 'type' in a) || []).map(a => {
      const action = a as { name?: string; type: string; stepId?: string; workflowId?: string; retryAfter?: number; retryLimit?: number };
      return {
        name: action.name,
        type: action.type as 'goto' | 'retry' | 'end',
        stepId: action.stepId,
        workflowId: action.workflowId,
        retryAfter: action.retryAfter,
        retryLimit: action.retryLimit,
      };
    });

    // Convert onFailure actions
    const onFailure: Action[] = (step.onFailure?.filter(a => 'type' in a) || []).map(a => {
      const action = a as { name?: string; type: string; stepId?: string; workflowId?: string; retryAfter?: number; retryLimit?: number };
      return {
        name: action.name,
        type: action.type as 'goto' | 'retry' | 'end',
        stepId: action.stepId,
        workflowId: action.workflowId,
        retryAfter: action.retryAfter,
        retryLimit: action.retryLimit,
      };
    });

    // Convert successCriteria to simple format
    const successCriteria = step.successCriteria?.map(c => ({
      condition: c.condition,
      type: typeof c.type === 'string' ? c.type : c.type?.type,
    }));

    return {
      stepId: step.stepId,
      operationId: step.operationId,
      operationPath: step.operationPath,
      workflowId: step.workflowId,
      description: step.description,
      parameters,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      requestBody: step.requestBody as any,
      successCriteria,
      outputs: step.outputs,
      onSuccess,
      onFailure,
    };
  }, []);

  // Handle step changes from StepInspector
  const handleStepChange = useCallback((updatedStep: InspectorStep) => {
    if (onStepUpdate && data?.type === 'step' && data.step) {
      onStepUpdate(data.step.stepId, updatedStep);
    }
  }, [onStepUpdate, data]);

  // Get current step for inspector
  const currentInspectorStep = useMemo((): InspectorStep | null => {
    if (data?.type === 'step' && data.step) {
      return convertToInspectorStep(data.step);
    }
    return null;
  }, [data, convertToInspectorStep]);

  // Check if editing is available for this selection
  const canEdit = (data?.type === 'step' && !!onStepUpdate) || 
                  (data?.type === 'input' && !!onInputUpdate) || 
                  (data?.type === 'output' && !!onOutputUpdate);

  // Empty state
  if (!data) {
    return (
      <div className={`h-full flex flex-col ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
        <div className={`flex items-center justify-center h-full ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
          <div className="text-center p-6">
            <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
            </svg>
            <p className="text-sm font-medium">No selection</p>
            <p className="text-xs mt-1">Click an element to inspect</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-full flex flex-col ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
      {/* Mode Toggle Header */}
      {canEdit && (
        <div className={`flex-shrink-0 px-4 py-2 border-b ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
          <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <button
              onClick={() => setMode('read')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                mode === 'read'
                  ? 'bg-indigo-600 text-white'
                  : isDark
                    ? 'hover:bg-slate-800 text-slate-400'
                    : 'hover:bg-gray-50 text-gray-600'
              }`}
            >
              <ReadIcon />
              <span>Documentation</span>
            </button>
            <button
              onClick={() => setMode('edit')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors border-l ${
                isDark ? 'border-slate-700' : 'border-slate-200'
              } ${
                mode === 'edit'
                  ? 'bg-indigo-600 text-white'
                  : isDark
                    ? 'hover:bg-slate-800 text-slate-400'
                    : 'hover:bg-gray-50 text-gray-600'
              }`}
            >
              <EditIcon />
              <span>Edit</span>
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {mode === 'read' || !canEdit ? (
          <DetailDrawer
            data={data}
            isDark={isDark}
            onClose={onClose || (() => {})}
            workflowInputs={workflowInputs}
            workflowOutputs={workflowOutputs}
            workflowId={workflowId}
          />
        ) : data?.type === 'step' ? (
          <StepInspector
            step={currentInspectorStep}
            onStepChange={handleStepChange}
            onClose={onClose}
            readOnly={false}
            isDark={isDark}
            availableSteps={availableSteps}
            expressionSuggestions={expressionSuggestions}
          />
        ) : data?.type === 'input' && workflowInputs && onInputUpdate ? (
          <InputEditor
            inputs={workflowInputs}
            onInputsChange={onInputUpdate}
            onClose={onClose}
            isDark={isDark}
          />
        ) : data?.type === 'output' && workflowOutputs && onOutputUpdate ? (
          <OutputEditor
            outputs={workflowOutputs}
            onOutputsChange={onOutputUpdate}
            onClose={onClose}
            isDark={isDark}
            expressionSuggestions={expressionSuggestions}
          />
        ) : (
          <DetailDrawer
            data={data}
            isDark={isDark}
            onClose={onClose || (() => {})}
            workflowInputs={workflowInputs}
            workflowOutputs={workflowOutputs}
            workflowId={workflowId}
          />
        )}
      </div>
    </div>
  );
}
