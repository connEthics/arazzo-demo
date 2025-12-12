'use client';

import { memo } from 'react';
import { Badge } from '../primitives';

interface DependsOnListProps {
  dependencies: string[];
  isDark: boolean;
  onWorkflowClick?: (workflowId: string) => void;
  className?: string;
}

/**
 * Displays the list of workflow dependencies (dependsOn)
 */
function DependsOnList({ dependencies, isDark, onWorkflowClick, className = '' }: DependsOnListProps) {
  if (!dependencies || dependencies.length === 0) {
    return null;
  }

  const bgClass = isDark ? 'bg-slate-800/50' : 'bg-gray-50';
  const borderClass = isDark ? 'border-slate-700' : 'border-gray-200';

  return (
    <div className={`${bgClass} rounded-lg border ${borderClass} p-3 ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        <svg className={`w-4 h-4 ${isDark ? 'text-orange-400' : 'text-orange-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className={`text-[10px] uppercase font-semibold ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
          Depends On
        </span>
        <Badge variant="warning" isDark={isDark} size="xs">
          {dependencies.length} prerequisite{dependencies.length > 1 ? 's' : ''}
        </Badge>
      </div>
      
      <div className="flex flex-wrap gap-1.5">
        {dependencies.map((workflowId) => {
          // Check if it's a reference to external workflow
          const isExternal = workflowId.startsWith('$sourceDescriptions.');
          
          return (
            <button
              key={workflowId}
              onClick={() => onWorkflowClick?.(workflowId)}
              disabled={!onWorkflowClick}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-mono transition-colors ${
                onWorkflowClick 
                  ? isDark 
                    ? 'bg-slate-700 hover:bg-slate-600 text-white cursor-pointer' 
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-800 cursor-pointer'
                  : isDark
                    ? 'bg-slate-700 text-slate-300'
                    : 'bg-gray-100 text-gray-600'
              }`}
            >
              {isExternal && (
                <svg className={`w-3 h-3 ${isDark ? 'text-purple-400' : 'text-purple-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              )}
              {workflowId}
              {onWorkflowClick && (
                <svg className={`w-3 h-3 ${isDark ? 'text-slate-400' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default memo(DependsOnList);
