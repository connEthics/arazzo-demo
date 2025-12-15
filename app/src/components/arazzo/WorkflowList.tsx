'use client';

import { memo } from 'react';
import type { Workflow } from '@/types/arazzo';
import { Badge } from '../primitives';
import { getThemeClasses } from '@/hooks/useThemeClasses';

interface WorkflowListProps {
  workflows: Workflow[];
  isDark: boolean;
  /** Selected workflow ID (for Overview mode) */
  selectedWorkflow?: string;
  /** Callback when a workflow is selected/clicked */
  onWorkflowSelect?: (workflowId: string) => void;
  /** Display mode: 'cards' for clickable cards, 'toc' for table of contents */
  variant?: 'cards' | 'toc';
  /** Show steps list (for TOC mode) */
  showSteps?: boolean;
}

/**
 * Reusable component to display a list of workflows.
 * - 'cards' variant: Interactive cards for Overview with selection state
 * - 'toc' variant: Table of contents style for Documentation
 */
function WorkflowList({
  workflows,
  isDark,
  selectedWorkflow,
  onWorkflowSelect,
  variant = 'cards',
  showSteps = false,
}: WorkflowListProps) {
  const theme = getThemeClasses(isDark);

  if (variant === 'toc') {
    return (
      <nav className={`p-4 rounded-lg border ${theme.border} ${isDark ? 'bg-slate-800' : 'bg-gray-50'}`}>
        <ol className="list-decimal list-inside space-y-3">
          {workflows.map((workflow) => (
            <li key={workflow.workflowId} className="space-y-1">
              <a
                href={`#workflow-${workflow.workflowId}`}
                onClick={(e) => {
                  if (onWorkflowSelect) {
                    e.preventDefault();
                    onWorkflowSelect(workflow.workflowId);
                  }
                }}
                className="text-indigo-600 hover:underline font-medium"
              >
                {workflow.summary || workflow.workflowId}
              </a>
              {workflow.description && (
                <span className={`text-sm ${theme.muted} ml-2 hidden sm:inline`}>
                  — {workflow.description.slice(0, 80)}
                  {workflow.description.length > 80 ? '...' : ''}
                </span>
              )}
              
              {/* Steps sub-list */}
              {showSteps && workflow.steps && workflow.steps.length > 0 && (
                <ol className="list-none ml-6 mt-2 space-y-1">
                  {workflow.steps.map((step, stepIdx) => (
                    <li key={step.stepId}>
                      <a
                        href={`#step-${workflow.workflowId}-${step.stepId}`}
                        className={`text-sm hover:text-indigo-600 hover:underline ${theme.muted}`}
                      >
                        {stepIdx + 1}. {step.stepId}
                      </a>
                    </li>
                  ))}
                </ol>
              )}
            </li>
          ))}
        </ol>
      </nav>
    );
  }

  // Default: cards variant
  return (
    <div className="space-y-3">
      {workflows.map((workflow) => {
        const isSelected = workflow.workflowId === selectedWorkflow;
        const stepCount = workflow.steps?.length || 0;
        const inputCount = workflow.inputs?.properties ? Object.keys(workflow.inputs.properties).length : 0;
        const outputCount = workflow.outputs ? Object.keys(workflow.outputs).length : 0;

        return (
          <button
            key={workflow.workflowId}
            onClick={() => onWorkflowSelect?.(workflow.workflowId)}
            className={`w-full text-left p-4 rounded-lg border transition-all ${
              isSelected
                ? isDark
                  ? 'bg-indigo-900/30 border-indigo-500'
                  : 'bg-indigo-50 border-indigo-300'
                : `${theme.border} ${theme.hover}`
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3">
              <div className="flex-1 min-w-0">
                {/* Title row */}
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <code
                    className={`text-sm font-mono font-medium break-all ${
                      isSelected ? 'text-indigo-500' : theme.text
                    }`}
                  >
                    {workflow.workflowId}
                  </code>
                  {isSelected && (
                    <Badge variant="step" isDark={isDark} size="xs">
                      Selected
                    </Badge>
                  )}
                </div>
                
                {/* Summary */}
                {workflow.summary && (
                  <p className={`text-sm ${theme.muted} mb-2`}>{workflow.summary}</p>
                )}
                
                {/* Description */}
                {workflow.description && (
                  <p className={`text-xs ${theme.muted} line-clamp-2`}>{workflow.description}</p>
                )}
              </div>
              
              {/* Stats */}
              <div className="flex flex-wrap items-center gap-2 sm:flex-shrink-0">
                <div className={`flex items-center gap-1 text-xs ${theme.muted}`}>
                  <span className="font-medium">{stepCount}</span> steps
                </div>
                {inputCount > 0 && (
                  <Badge variant="input" isDark={isDark} size="xs">
                    {inputCount} in
                  </Badge>
                )}
                {outputCount > 0 && (
                  <Badge variant="output" isDark={isDark} size="xs">
                    {outputCount} out
                  </Badge>
                )}
                <svg
                  className={`w-4 h-4 ${theme.muted} hidden sm:block`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default memo(WorkflowList);
