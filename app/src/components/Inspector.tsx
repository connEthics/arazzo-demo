'use client';

import { useState, useMemo, useCallback } from 'react';
import DetailDrawer, { DetailData } from './DetailDrawer';
import InputPanel from './InputPanel';
import OutputPanel from './OutputPanel';
import { ExpressionSuggestion } from './ExpressionInput';
import { Action } from './ActionFormEditor';
import type { Step, WorkflowInputs, SourceDescription, Components } from '@/types/arazzo';

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
  onStepUpdate?: (stepId: string, updates: Partial<Step>) => void;
  /** Handle workflow input update */
  onInputUpdate?: (inputs: WorkflowInputs) => void;
  /** Handle workflow output update */
  onOutputUpdate?: (outputs: Record<string, string>) => void;
  /** Handle reordering */
  onReorderInput?: (startIndex: number, endIndex: number) => void;
  onReorderOutput?: (startIndex: number, endIndex: number) => void;
  /** Handle reusable components update */
  onComponentsUpdate?: (updates: Partial<Components>) => void;
  /** Initial mode */
  initialMode?: 'read' | 'edit';
  /** Callback for when a step is clicked (e.g., in a goto link) */
  onStepClick?: (stepId: string) => void;
  /** Callback for when a reference is clicked (e.g., in a documentation link) */
  onRefClick?: (reference: string) => void;
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
  onReorderInput,
  onReorderOutput,
  onComponentsUpdate,
  initialMode = 'read',
  onStepClick,
  onRefClick,
}: InspectorProps) {

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

    if (workflowInputs?.properties) {
      Object.keys(workflowInputs.properties).forEach(key => {
        suggestions.push({
          expression: `$inputs.${key}`,
          label: `Input: ${key}`,
          type: 'input',
        });
      });
    }

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

  // Handle step changes from StepBody (via DetailDrawer)
  const handleStepUpdate = useCallback((stepId: string, updates: Partial<Step>) => {
    if (onStepUpdate) {
      onStepUpdate(stepId, updates);
    }
  }, [onStepUpdate]);

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

  // For input/output, use unified panels
  if (data.type === 'input') {
    return (
      <InputPanel
        inputs={workflowInputs}
        onInputsChange={onInputUpdate}
        initialMode={initialMode}
        isDark={isDark}
        onClose={onClose}
        expressionSuggestions={expressionSuggestions}
        onReorder={onReorderInput}
      />
    );
  }

  if (data.type === 'output') {
    return (
      <OutputPanel
        outputs={workflowOutputs}
        onOutputsChange={onOutputUpdate}
        initialMode={initialMode}
        isDark={isDark}
        onClose={onClose}
        expressionSuggestions={expressionSuggestions}
        onReorder={onReorderOutput}
      />
    );
  }

  if (data.type === 'reusable-input' && data.reusableInput) {
    return (
      <InputPanel
        inputs={data.reusableInput.inputs}
        onInputsChange={(newInputs) => {
          if (onComponentsUpdate) {
            onComponentsUpdate({
              inputs: { [data.reusableInput!.name]: newInputs }
            });
          }
        }}
        initialMode={initialMode}
        isDark={isDark}
        onClose={onClose}
        expressionSuggestions={expressionSuggestions}
        onReorder={onReorderInput}
      />
    );
  }
  return (
    <div className={`h-full flex flex-col ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
      <div className="flex-1 overflow-hidden">
        <DetailDrawer
          data={data}
          isDark={isDark}
          onClose={onClose || (() => { })}
          workflowInputs={workflowInputs}
          workflowOutputs={workflowOutputs}
          workflowId={workflowId}
          onStepUpdate={handleStepUpdate}
          availableSteps={allSteps.map(s => s.stepId)}
          expressionSuggestions={expressionSuggestions}
        />
      </div>
    </div>
  );
}
