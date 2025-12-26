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
  onEdit?: (index: number) => void;
  onDelete?: (index: number) => void;
  headerActions?: React.ReactNode;
  collapsible?: boolean;
  className?: string;
  alwaysVisible?: boolean;
  emptyMessage?: string;
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
  onEdit,
  onDelete,
  headerActions,
  collapsible = false,
  className = '',
  alwaysVisible = false,
  emptyMessage
}: ActionListProps) {
  if ((!actions || actions.length === 0) && !alwaysVisible) {
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
        className={`group relative ${codeBgClass} rounded p-2 border-l-2 ${borderColor}`}
      >
        {/* Action header */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2 flex-wrap">
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

          {/* Edit/Delete Actions */}
          {(onEdit || onDelete) && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {onEdit && (
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit(index); }}
                  className={`p-1 rounded ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-200 text-gray-400'}`}
                  title="Edit"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              )}
              {onDelete && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(index); }}
                  className={`p-1 rounded ${isDark ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-red-100 text-red-500'}`}
                  title="Delete"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
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

        {/* Outputs */}
        {action.outputs && Object.keys(action.outputs).length > 0 && (
          <div className={`mt-1.5 pt-1.5 border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
            <span className={`text-[9px] font-medium ${mutedClass} block mb-1`}>Outputs:</span>
            <div className="space-y-1">
              {Object.entries(action.outputs).map(([key, value]) => (
                <div key={key} className="flex flex-col gap-0.5">
                  <span className={`text-[9px] font-medium ${textClass}`}>{key}:</span>
                  <code className={`text-[9px] font-mono ${mutedClass} break-all bg-opacity-50 rounded px-1 ${isDark ? 'bg-black' : 'bg-white'}`}>{value}</code>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Extensions */}
        {Object.keys(action).filter(k => k.startsWith('x-')).length > 0 && (
          <div className={`mt-1.5 pt-1.5 border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
            <span className={`text-[9px] font-medium ${mutedClass} block mb-1`}>Extensions:</span>
            <div className="space-y-1">
              {Object.entries(action)
                .filter(([key]) => key.startsWith('x-'))
                .map(([key, value]) => (
                  <div key={key} className="flex flex-col gap-0.5">
                    <span className={`text-[9px] font-medium ${textClass}`}>{key}:</span>
                    <code className={`text-[9px] font-mono ${mutedClass} break-all bg-opacity-50 rounded px-1 ${isDark ? 'bg-black' : 'bg-white'}`}>
                      {typeof value === 'string' ? value : JSON.stringify(value)}
                    </code>
                  </div>
                ))}
            </div>
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
      actions={headerActions}
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
      <div className="space-y-1.5">
        {actions && actions.length > 0 ? actions.map((action, idx) => {
          if (isReusableObject(action)) {
            return (
              <div key={idx} className={`${codeBgClass} rounded p-2 border-l-2 ${borderColor}`}>
                <ReusableRef reusable={action} isDark={isDark} onClick={onRefClick} />
              </div>
            );
          }
          return renderAction(action as SuccessAction | FailureAction, idx);
        }) : (
          <p className={`text-xs italic pl-2 ${mutedClass}`}>
            {emptyMessage || (isSuccess ? 'Continue to next step' : 'End workflow')}
          </p>
        )}
      </div>
    </Card>
  );
}

export default memo(ActionList);
