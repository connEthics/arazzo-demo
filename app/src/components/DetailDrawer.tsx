'use client';

import { memo } from 'react';
import type { Step, SourceDescription, WorkflowInputs } from '@/types/arazzo';
import { StepContent, SourceContent, InputContent, OutputContent } from './DetailViews';
import { Badge, MarkdownText } from './primitives';

// Types for different detail views
export type DetailType = 'step' | 'source' | 'input' | 'output';

export interface DetailData {
  type: DetailType;
  step?: Step;
  source?: SourceDescription;
  sourceForStep?: SourceDescription; // Source description for the step's API
  input?: { name: string; schema: Record<string, unknown> };
  output?: { name: string; value: string; stepId?: string; allOutputs?: Record<string, string> };
}

interface DetailDrawerProps {
  data: DetailData | null;
  isDark?: boolean;
  onClose: () => void;
  workflowInputs?: WorkflowInputs;
  workflowOutputs?: Record<string, string>;
  workflowId?: string;
  onNavigateToDoc?: (workflowId: string, stepId: string) => void;
  onStepClick?: (stepId: string) => void;
  onRefClick?: (reference: string) => void;
}

function DetailDrawer({ data, isDark = false, onClose, workflowInputs, workflowOutputs, workflowId, onNavigateToDoc, onStepClick, onRefClick }: DetailDrawerProps) {
  const bgClass = isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200';
  const textClass = isDark ? 'text-white' : 'text-gray-900';
  const mutedClass = isDark ? 'text-slate-400' : 'text-gray-500';
  const codeBgClass = isDark ? 'bg-slate-800' : 'bg-gray-50';

  // Return null but keep in DOM flow when no data
  if (!data) return null;

  // Map DetailType to Badge variant
  const badgeVariant: Record<DetailType, 'step' | 'source' | 'input' | 'output'> = {
    step: 'step',
    source: 'source',
    input: 'input',
    output: 'output',
  };

  return (
    <div className={`flex-shrink-0 w-96 ${bgClass} border-l flex flex-col overflow-hidden transition-all duration-300`}>
      
      {/* Header */}
      <div className={`flex-shrink-0 flex items-center justify-between px-4 py-3 border-b ${isDark ? 'border-slate-800 bg-slate-800/50' : 'border-gray-100 bg-gray-50'}`}>
        <div className="flex items-center gap-2 min-w-0">
          {/* Type Badge */}
          <Badge variant={badgeVariant[data.type]} isDark={isDark} size="xs">
            {data.type.charAt(0).toUpperCase() + data.type.slice(1)}
          </Badge>
          
          {/* Title */}
          <h3 className={`font-medium text-sm truncate ${textClass}`}>
            {data.type === 'step' && data.step?.stepId}
            {data.type === 'source' && data.source?.name}
            {data.type === 'input' && data.input?.name}
            {data.type === 'output' && data.output?.name}
          </h3>
        </div>

        <div className="flex items-center gap-1">
          {/* View in Documentation Button - only for steps */}
          {data.type === 'step' && data.step && workflowId && onNavigateToDoc && (
            <button
              onClick={() => onNavigateToDoc(workflowId, data.step!.stepId)}
              className={`flex-shrink-0 p-1.5 rounded text-xs font-medium transition-colors ${
                isDark 
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white' 
                  : 'bg-indigo-100 hover:bg-indigo-200 text-indigo-700'
              }`}
              title="View in Documentation"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>
          )}

          {/* Close */}
          <button
            onClick={onClose}
            className={`flex-shrink-0 p-1 rounded hover:bg-opacity-10 ${isDark ? 'hover:bg-white' : 'hover:bg-black'}`}
          >
            <svg className={`w-4 h-4 ${mutedClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Subtitle */}
      {data.type === 'step' && data.step?.description && (
        <div className={`flex-shrink-0 px-4 py-2 border-b ${isDark ? 'border-slate-800' : 'border-gray-100'}`}>
          <MarkdownText content={data.step.description} isDark={isDark} variant="compact" />
        </div>
      )}
      {data.type === 'source' && data.source?.type && (
        <div className={`flex-shrink-0 px-4 py-2 border-b ${isDark ? 'border-slate-800' : 'border-gray-100'}`}>
          <Badge variant={data.source.type === 'openapi' ? 'openapi' : 'arazzo'} isDark={isDark} size="xs">
            {data.source.type.toUpperCase()}
          </Badge>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {data.type === 'step' && data.step && (
          <StepContent 
            step={data.step} 
            sourceForStep={data.sourceForStep} 
            isDark={isDark} 
            textClass={textClass} 
            mutedClass={mutedClass} 
            codeBgClass={codeBgClass}
            onStepClick={onStepClick}
            onRefClick={onRefClick}
          />
        )}
        {data.type === 'source' && data.source && (
          <SourceContent source={data.source} isDark={isDark} textClass={textClass} mutedClass={mutedClass} codeBgClass={codeBgClass} />
        )}
        {data.type === 'input' && data.input && (
          <InputContent input={data.input} isDark={isDark} textClass={textClass} mutedClass={mutedClass} codeBgClass={codeBgClass} workflowInputs={workflowInputs} />
        )}
        {data.type === 'output' && data.output && (
          <OutputContent output={data.output} isDark={isDark} textClass={textClass} mutedClass={mutedClass} codeBgClass={codeBgClass} workflowOutputs={workflowOutputs} />
        )}
      </div>
    </div>
  );
}

export default memo(DetailDrawer);
