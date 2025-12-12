'use client';

import { memo } from 'react';
import { Card, Badge } from '../primitives';
import ReusableRef from './ReusableRef';
import CriterionBadge from './CriterionBadge';
import type { SuccessAction, FailureAction, ReusableObject, Criterion } from '@/types/arazzo';
import { isReusableObject } from '@/types/arazzo';

interface ActionListProps {
  actions: (SuccessAction | FailureAction | ReusableObject)[];
  type: 'success' | 'failure';
  isDark: boolean;
  level?: 'workflow' | 'step';
  onStepClick?: (stepId: string) => void;
  onWorkflowClick?: (workflowId: string) => void;
  onRefClick?: (reference: string) => void;
  collapsible?: boolean;
  className?: string;
}

/**
 * Displays a list of success or failure actions
 */
function ActionList({ 
  actions, 
  type, 
  isDark, 
  level = 'step',
  onStepClick, 
  onWorkflowClick,
  onRefClick,
  collapsible = false,
  className = '' 
}: ActionListProps) {
  if (!actions || actions.length === 0) {
    return null;
  }

  const isSuccess = type === 'success';
  const borderColor = isSuccess ? 'border-emerald-400' : 'border-red-400';
  const codeBgClass = isDark ? 'bg-slate-800' : 'bg-gray-50';
  const textClass = isDark ? 'text-white' : 'text-gray-900';
  const mutedClass = isDark ? 'text-slate-400' : 'text-gray-500';

  const renderAction = (action: SuccessAction | FailureAction, index: number) => {
    const isFailure = 'retryAfter' in action || 'retryLimit' in action;
    
    return (
      <div 
        key={index} 
        className={`${codeBgClass} rounded p-2 border-l-2 ${borderColor}`}
      >
        {/* Action header */}
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className={`text-[11px] font-medium ${textClass}`}>{action.name}</span>
          <Badge 
            variant={action.type === 'goto' ? 'info' : action.type === 'retry' ? 'warning' : 'step'} 
            isDark={isDark} 
            size="xs"
          >
            {action.type}
          </Badge>
          
          {/* Target for goto */}
          {action.type === 'goto' && (
            <>
              {action.stepId && (
                <button
                  onClick={() => onStepClick?.(action.stepId!)}
                  disabled={!onStepClick}
                  className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                    onStepClick 
                      ? isDark 
                        ? 'bg-indigo-900/50 text-indigo-300 hover:bg-indigo-800/50 cursor-pointer' 
                        : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 cursor-pointer'
                      : isDark
                        ? 'bg-slate-700 text-slate-300'
                        : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  → {action.stepId}
                </button>
              )}
              {action.workflowId && (
                <button
                  onClick={() => onWorkflowClick?.(action.workflowId!)}
                  disabled={!onWorkflowClick}
                  className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                    onWorkflowClick 
                      ? isDark 
                        ? 'bg-purple-900/50 text-purple-300 hover:bg-purple-800/50 cursor-pointer' 
                        : 'bg-purple-100 text-purple-700 hover:bg-purple-200 cursor-pointer'
                      : isDark
                        ? 'bg-slate-700 text-slate-300'
                        : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  ↗ {action.workflowId}
                </button>
              )}
            </>
          )}
        </div>

        {/* Retry details for failure actions */}
        {isFailure && action.type === 'retry' && (
          <div className="flex items-center gap-2 mb-1">
            {(action as FailureAction).retryAfter !== undefined && (
              <span className={`text-[9px] px-1 py-0.5 rounded ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-gray-200 text-gray-600'}`}>
                delay: {(action as FailureAction).retryAfter}s
              </span>
            )}
            {(action as FailureAction).retryLimit !== undefined && (
              <span className={`text-[9px] px-1 py-0.5 rounded ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-gray-200 text-gray-600'}`}>
                max: {(action as FailureAction).retryLimit} retries
              </span>
            )}
          </div>
        )}

        {/* Criteria */}
        {action.criteria && action.criteria.length > 0 && (
          <div className="mt-1 space-y-1">
            <span className={`text-[9px] ${mutedClass}`}>criteria:</span>
            {action.criteria.map((criterion: Criterion, idx: number) => (
              <CriterionBadge key={idx} criterion={criterion} isDark={isDark} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card 
      title={`${level === 'workflow' ? 'Default ' : ''}On ${isSuccess ? 'Success' : 'Failure'}`}
      isDark={isDark}
      collapsible={collapsible}
      badge={
        <Badge variant={isSuccess ? 'success' : 'failure'} isDark={isDark} size="xs">
          {actions.length}
        </Badge>
      }
      icon={
        isSuccess ? (
          <svg className={`w-3 h-3 ${isDark ? 'text-emerald-400' : 'text-emerald-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className={`w-3 h-3 ${isDark ? 'text-red-400' : 'text-red-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )
      }
      className={className}
    >
      <div className="space-y-1.5 max-h-48 overflow-auto">
        {actions.map((action, idx) => {
          if (isReusableObject(action)) {
            return (
              <div key={idx} className={`${codeBgClass} rounded p-2 border-l-2 ${borderColor}`}>
                <ReusableRef reusable={action} isDark={isDark} onClick={onRefClick} />
              </div>
            );
          }
          return renderAction(action as SuccessAction | FailureAction, idx);
        })}
      </div>
    </Card>
  );
}

export default memo(ActionList);
