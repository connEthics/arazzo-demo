'use client';

import { useState, useEffect } from 'react';
import type { Step, SourceDescription } from '@/types/arazzo';
import { StepContent } from './DetailViews';
import { MarkdownText } from './primitives';
import { StepHeader } from './arazzo';
import { extractHttpMethod } from '@/lib/arazzo-utils';
import type { ExpressionSuggestion } from './ExpressionInput';

interface StepCardProps {
  step: Step;
  stepIndex: number;
  workflowId: string;
  allSteps?: Step[];
  sources?: SourceDescription[];
  isDark: boolean;
  textClass?: string;
  mutedClass?: string;
  borderClass?: string;
  codeBgClass?: string;
  onNavigate?: (workflowId: string, stepId: string) => void;
  onRefClick?: (reference: string) => void;
  forceExpanded?: boolean;
  /** Enable edit mode */
  editable?: boolean;
  /** Callback to update step data (required for editable mode) */
  onStepUpdate?: (stepId: string, updates: Partial<Step>) => void;
  /** Expression suggestions for autocomplete in edit mode */
  expressionSuggestions?: ExpressionSuggestion[];
}

export default function StepCard({
  step,
  stepIndex,
  workflowId,
  allSteps = [],
  sources = [],
  isDark,
  textClass = isDark ? 'text-white' : 'text-gray-900',
  mutedClass = isDark ? 'text-slate-400' : 'text-gray-500',
  borderClass = isDark ? 'border-slate-700' : 'border-gray-200',
  codeBgClass = isDark ? 'bg-slate-800' : 'bg-gray-50',
  onNavigate,
  onRefClick,
  forceExpanded,
  editable = false,
  onStepUpdate,
  expressionSuggestions = [],
}: StepCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Sync with forceExpanded prop when it changes
  useEffect(() => {
    if (forceExpanded !== undefined) {
      setIsExpanded(forceExpanded);
    }
  }, [forceExpanded]);

  // Find the source for this step
  const getSourceForStep = () => {
    if (step.operationId?.includes('.')) {
      const sourceName = step.operationId.split('.')[0];
      return sources.find(s => s.name === sourceName);
    }
    return sources[0];
  };

  const sourceForStep = getSourceForStep();

  // Get HTTP method color (Swagger-style) - using centralized extractHttpMethod
  const getMethodColor = (operationId: string) => {
    const method = extractHttpMethod(operationId);
    switch (method) {
      case 'GET': return { bg: 'bg-blue-500', text: 'text-white', border: 'border-blue-500' };
      case 'POST': return { bg: 'bg-emerald-500', text: 'text-white', border: 'border-emerald-500' };
      case 'PUT':
      case 'PATCH': return { bg: 'bg-amber-500', text: 'text-white', border: 'border-amber-500' };
      case 'DELETE': return { bg: 'bg-red-500', text: 'text-white', border: 'border-red-500' };
      default: return { bg: 'bg-indigo-500', text: 'text-white', border: 'border-indigo-500' };
    }
  };

  const methodColor = step.operationId ? getMethodColor(step.operationId) : { bg: 'bg-gray-500', text: 'text-white', border: 'border-gray-500' };

  // Extract HTTP method and operation name
  const httpMethod = step.operationId ? extractHttpMethod(step.operationId) : null;
  const operationName = step.operationId?.includes('.')
    ? step.operationId.split('.').pop()
    : step.operationId;
  const sourceName = step.operationId?.includes('.')
    ? step.operationId.split('.')[0]
    : null;

  // Handle step navigation
  const handleStepClick = (stepId: string) => {
    onNavigate?.(workflowId, stepId);
  };

  return (
    <div
      id={`step-${workflowId}-${step.stepId}`}
      className={`rounded-lg border avoid-break transition-all ${borderClass} ${isDark ? 'bg-slate-800/50' : 'bg-white'}`}
    >
      {/* Swagger-style Header */}
      <StepHeader
        step={step}
        variant="card"
        index={stepIndex}
        isDark={isDark}
        onClick={() => setIsExpanded(!isExpanded)}
        className={`${isExpanded ? 'bg-slate-50 dark:bg-slate-800' : ''} rounded-t-lg`}
        style={{ borderLeft: `4px solid ${methodColor.border.split('-')[1] === 'blue' ? '#3b82f6' : methodColor.border.split('-')[1] === 'emerald' ? '#10b981' : methodColor.border.split('-')[1] === 'amber' ? '#f59e0b' : methodColor.border.split('-')[1] === 'red' ? '#ef4444' : '#6366f1'}` }}
      />

      {/* Expandable Content - Uses same StepContent as Drawer */}
      <div className={`border-t ${borderClass} ${isExpanded ? '' : 'hidden print:block'} rounded-b-lg`}>
        <div className="p-4">
          <StepContent
            step={step}
            sourceForStep={sourceForStep}
            isDark={isDark}
            textClass={textClass}
            mutedClass={mutedClass}
            codeBgClass={codeBgClass}
            onStepClick={handleStepClick}
            onRefClick={onRefClick}
            forceExpanded={forceExpanded}
            hideHeader={true}
            editable={editable}
            onStepUpdate={onStepUpdate ? (updates) => onStepUpdate(step.stepId, updates) : undefined}
            expressionSuggestions={expressionSuggestions}
          />
        </div>
      </div>
    </div>
  );
}
