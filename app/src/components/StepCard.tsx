'use client';

import { useState, useEffect } from 'react';
import type { Step, SourceDescription } from '@/types/arazzo';
import { StepContent } from './DetailViews';

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
  forceExpanded
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

  // Get HTTP method color (Swagger-style)
  const getMethodColor = (operationId: string) => {
    const opLower = operationId.toLowerCase();
    if (opLower.includes('get') || opLower.includes('find') || opLower.includes('list') || opLower.includes('search')) {
      return { bg: 'bg-blue-500', text: 'text-white', border: 'border-blue-500' };
    }
    if (opLower.includes('create') || opLower.includes('add') || opLower.includes('post')) {
      return { bg: 'bg-emerald-500', text: 'text-white', border: 'border-emerald-500' };
    }
    if (opLower.includes('update') || opLower.includes('put') || opLower.includes('patch')) {
      return { bg: 'bg-amber-500', text: 'text-white', border: 'border-amber-500' };
    }
    if (opLower.includes('delete') || opLower.includes('remove')) {
      return { bg: 'bg-red-500', text: 'text-white', border: 'border-red-500' };
    }
    return { bg: 'bg-indigo-500', text: 'text-white', border: 'border-indigo-500' };
  };

  const methodColor = step.operationId ? getMethodColor(step.operationId) : { bg: 'bg-gray-500', text: 'text-white', border: 'border-gray-500' };

  // Handle step navigation
  const handleStepClick = (stepId: string) => {
    onNavigate?.(workflowId, stepId);
  };

  return (
    <div 
      id={`step-${workflowId}-${step.stepId}`}
      className={`rounded-lg border overflow-hidden avoid-break transition-all ${borderClass} ${isDark ? 'bg-slate-800/50' : 'bg-white'}`}
    >
      {/* Swagger-style Header */}
      <div 
        className={`flex items-center gap-3 p-3 cursor-pointer hover:opacity-90 transition-opacity border-l-4 ${methodColor.border}`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className={`w-7 h-7 rounded flex items-center justify-center text-xs font-bold ${methodColor.bg} ${methodColor.text}`}>
          {stepIndex + 1}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-semibold text-base">{step.stepId}</h4>
            {step.operationId && (
              <code className={`text-xs px-2 py-0.5 rounded ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-gray-100 text-gray-600'}`}>
                {step.operationId}
              </code>
            )}
            {step.workflowId && (
              <code className={`text-xs px-2 py-0.5 rounded ${isDark ? 'bg-purple-900/50 text-purple-300' : 'bg-purple-100 text-purple-600'}`}>
                workflow: {step.workflowId}
              </code>
            )}
          </div>
          {step.description && (
            <p className={`text-sm ${mutedClass} mt-0.5 truncate`}>{step.description}</p>
          )}
        </div>
        <svg 
          className={`w-5 h-5 ${mutedClass} transition-transform print:hidden ${isExpanded ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Expandable Content - Uses same StepContent as Drawer */}
      <div className={`border-t ${borderClass} ${isExpanded ? '' : 'hidden print:block'}`}>
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
          />
        </div>
      </div>
    </div>
  );
}
