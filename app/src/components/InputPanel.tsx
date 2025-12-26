'use client';

import { useState, useCallback, useMemo } from 'react';
import type { WorkflowInputs } from '@/types/arazzo';
import RightPanelModeToggle, { RightPanelMode } from './RightPanelModeToggle';
import ExpressionInput, { ExpressionSuggestion } from './ExpressionInput';
import { Card, Badge } from './primitives';
import { SchemaViewer } from './arazzo';
import { InputContent } from './DetailViews';

interface InputProperty {
  name: string;
  type: string;
  description?: string;
  default?: unknown;
}

interface InputPanelProps {
  /** Current workflow inputs schema */
  inputs?: WorkflowInputs;
  /** Handler for input updates (enables edit mode) */
  onInputsChange?: (inputs: WorkflowInputs) => void;
  /** Initial mode */
  initialMode?: RightPanelMode;
  /** Dark mode */
  isDark?: boolean;
  /** Close handler */
  onClose?: () => void;
  /** Expression suggestions for autocomplete */
  expressionSuggestions?: ExpressionSuggestion[];
  /** Handler for reordering inputs */
  onReorder?: (startIndex: number, endIndex: number) => void;
}

// Icons
const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const ChevronIcon = ({ expanded }: { expanded: boolean }) => (
  <svg
    className={`w-4 h-4 transition-transform ${expanded ? 'rotate-90' : ''}`}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

const TYPE_OPTIONS = ['string', 'number', 'integer', 'boolean', 'array', 'object'];

/**
 * InputPanel - Unified component for viewing and editing workflow inputs
 * Combines read mode (documentation view) and edit mode (form editor)
 */
export default function InputPanel({
  inputs,
  onInputsChange,
  initialMode = 'read',
  isDark = false,
  onClose,
  expressionSuggestions = [],
  onReorder
}: InputPanelProps) {
  // Check if editing is available
  const canEdit = !!onInputsChange;

  const bgClass = isDark ? 'bg-slate-900' : 'bg-white';
  const borderClass = isDark ? 'border-slate-700' : 'border-gray-200';
  const textClass = isDark ? 'text-white' : 'text-gray-900';

  return (
    <div className={`h-full flex flex-col ${bgClass}`}>
      {/* Header */}
      <div className={`flex-shrink-0 px-4 py-3 border-b ${borderClass}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
            </div>
            <div>
              <h3 className={`font-semibold ${textClass}`}>Workflow Inputs</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 transition-all duration-200">
        <InputContent
          input={{ name: 'Workflow Inputs', schema: {} }}
          workflowInputs={inputs}
          isDark={isDark}
          editable={canEdit}
          onUpdate={onInputsChange}
          onReorder={onReorder}
          expressionSuggestions={expressionSuggestions}
        />
      </div>
    </div>
  );
}
