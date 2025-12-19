'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import type { Step } from '@/types/arazzo';
import { Badge } from '@/components/primitives';
import { extractHttpMethod, getMethodBadgeVariant, type HttpMethod } from '@/lib/arazzo-utils';

type LayoutDirection = 'horizontal' | 'vertical';
type NodeMode = 'view' | 'edit';

interface UnifiedStepNodeData {
  // Core step data
  step?: Step;
  stepId?: string;
  operationId?: string;
  description?: string;
  
  // Parameters (inputs) for display
  parameters?: Array<{ name: string; in?: string }>;
  
  // Outputs for display
  outputs?: Record<string, string>;
  
  // Computed flags (for view mode)
  hasOnSuccess?: boolean;
  hasOnFailure?: boolean;
  hasSkip?: boolean;
  
  // Validation flags
  hasInvalidLinks?: boolean;
  invalidLinkCount?: number;
  
  // Method can be provided or extracted
  method?: string | null;
  
  // Source info (for edit mode)
  sourceName?: string;
  
  // Layout
  direction?: LayoutDirection;
  
  // Mode
  mode?: NodeMode;
  
  // Expanded mode to show inputs/outputs
  expanded?: boolean;
  
  // Selection state (for edit mode)
  isSelected?: boolean;
  
  // Allow extra properties
  [key: string]: unknown;
}

interface UnifiedStepNodeProps extends NodeProps {
  data: UnifiedStepNodeData;
}

/**
 * UnifiedStepNode - A single React Flow node component for both viewing and editing Arazzo steps.
 * 
 * In 'view' mode: Shows full details like outputs, onSuccess/onFailure, skip conditions
 * In 'edit' mode: Compact display with selection ring, source info
 */
function UnifiedStepNode({ data, selected }: UnifiedStepNodeProps) {
  const { 
    step,
    stepId: propStepId,
    operationId: propOperationId,
    description: propDescription,
    parameters: propParameters,
    outputs: propOutputs,
    hasOnSuccess, 
    hasOnFailure, 
    hasSkip, 
    hasInvalidLinks,
    invalidLinkCount,
    method: propMethod,
    sourceName,
    direction = 'vertical',
    mode = 'view',
    expanded = true,
    isSelected
  } = data || {};
  
  // Resolve step data - either from step object or direct props
  const stepId = step?.stepId || propStepId || 'Unknown';
  const operationId = step?.operationId || propOperationId;
  const description = step?.description || propDescription;
  const outputs = step?.outputs || propOutputs;
  
  // Extract parameters - use provided array or extract from step
  const parameters: Array<{ name: string; in?: string }> = propParameters || 
    (step?.parameters
      ?.filter(p => typeof p === 'object' && 'name' in p && !('reference' in p))
      .map(p => {
        const param = p as { name: string; in?: string };
        return { name: param.name, in: param.in };
      }) || []);
  
  // Resolve method
  const method = propMethod || (operationId ? extractHttpMethod(operationId) : null);
  
  // Dynamic handle positions based on layout direction
  const targetPosition = direction === 'horizontal' ? Position.Left : Position.Top;
  const sourcePosition = direction === 'horizontal' ? Position.Right : Position.Bottom;
  
  // Selection state (from React Flow or from data)
  const isActive = selected || isSelected;
  
  // Guard against undefined step in view mode
  if (mode === 'view' && !step && !propStepId) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm min-w-[240px] p-3">
        <Handle type="target" position={targetPosition} className="!w-2.5 !h-2.5 !bg-gray-400 !border-2 !border-white" />
        <span className="text-gray-400 text-sm">Loading step...</span>
        <Handle type="source" position={sourcePosition} className="!w-2.5 !h-2.5 !bg-gray-400 !border-2 !border-white" />
      </div>
    );
  }

  // ========== EDIT MODE ==========
  if (mode === 'edit') {
    const hasInputs = parameters && parameters.length > 0;
    const hasOutputs = outputs && Object.keys(outputs).length > 0;
    const outputKeys = outputs ? Object.keys(outputs) : [];
    
    return (
      <div className={`
        min-w-[200px] max-w-[260px] bg-white dark:bg-slate-800 rounded-lg border-2 shadow-sm transition-all
        ${isActive 
          ? 'border-indigo-500 shadow-lg shadow-indigo-500/30 ring-2 ring-indigo-500/20' 
          : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300'}
      `}>
        {/* Main flow handle - top */}
        <Handle 
          type="target" 
          position={Position.Top} 
          id="flow-in"
          className="!bg-indigo-400 !w-3 !h-3" 
        />
        
        {/* Header */}
        <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1">
              <Badge variant="step" size="sm" className="uppercase text-[10px]">
                Step
              </Badge>
              {hasInvalidLinks && (
                <span 
                  className="inline-flex items-center justify-center w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full" 
                  title={`${invalidLinkCount || '?'} invalid link(s)`}
                >
                  !
                </span>
              )}
            </div>
            {method && (
              <Badge 
                variant={getMethodBadgeVariant(method as HttpMethod)} 
                size="sm"
                className="text-[10px]"
              >
                {method}
              </Badge>
            )}
          </div>
          
          <div className="font-bold text-sm mt-1 truncate" title={stepId}>{stepId}</div>
          {operationId && (
            <div className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate" title={operationId}>
              {operationId}
            </div>
          )}
        </div>
        
        {/* Inputs Section */}
        {expanded && hasInputs && (
          <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700 bg-emerald-50/50 dark:bg-emerald-900/10">
            <div className="text-[9px] uppercase font-semibold text-emerald-600 dark:text-emerald-400 mb-1.5 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
              Inputs
            </div>
            <div className="space-y-1">
              {parameters.slice(0, 4).map((param, idx) => (
                <div key={idx} className="relative flex items-center">
                  <Handle
                    type="target"
                    position={Position.Left}
                    id={`input-${param.name}`}
                    className="!bg-emerald-400 !w-2 !h-2 !-left-1"
                    style={{ top: '50%' }}
                  />
                  <div className="flex items-center gap-1 text-[10px] pl-1">
                    <span className="text-slate-600 dark:text-slate-300 font-medium">{param.name}</span>
                    {param.in && (
                      <span className="text-slate-400 text-[8px]">({param.in})</span>
                    )}
                  </div>
                </div>
              ))}
              {parameters.length > 4 && (
                <div className="text-[9px] text-slate-400 pl-1">+{parameters.length - 4} more</div>
              )}
            </div>
          </div>
        )}
        
        {/* Outputs Section */}
        {expanded && hasOutputs && (
          <div className="px-3 py-2 bg-amber-50/50 dark:bg-amber-900/10">
            <div className="text-[9px] uppercase font-semibold text-amber-600 dark:text-amber-400 mb-1.5 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
              Outputs
            </div>
            <div className="space-y-1">
              {outputKeys.slice(0, 4).map((key, idx) => (
                <div key={idx} className="relative flex items-center justify-end">
                  <div className="flex items-center gap-1 text-[10px] pr-1">
                    <span className="text-slate-600 dark:text-slate-300 font-medium">{key}</span>
                  </div>
                  <Handle
                    type="source"
                    position={Position.Right}
                    id={`output-${key}`}
                    className="!bg-amber-400 !w-2 !h-2 !-right-1"
                    style={{ top: '50%' }}
                  />
                </div>
              ))}
              {outputKeys.length > 4 && (
                <div className="text-[9px] text-slate-400 text-right pr-1">+{outputKeys.length - 4} more</div>
              )}
            </div>
          </div>
        )}
        
        {/* Source name footer */}
        {sourceName && (
          <div className="px-3 py-1 border-t border-slate-100 dark:border-slate-700">
            <div className="text-[10px] text-slate-400 truncate">
              {sourceName}
            </div>
          </div>
        )}

        {/* Main flow handle - bottom */}
        <Handle 
          type="source" 
          position={Position.Bottom}
          id="flow-out" 
          className="!bg-indigo-400 !w-3 !h-3" 
        />
      </div>
    );
  }

  // ========== VIEW MODE ==========
  const methodStyles: Record<string, string> = {
    GET: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    POST: 'bg-blue-100 text-blue-700 border-blue-200',
    PUT: 'bg-amber-100 text-amber-700 border-amber-200',
    DELETE: 'bg-red-100 text-red-700 border-red-100',
    PATCH: 'bg-purple-100 text-purple-700 border-purple-200',
  };

  return (
    <div className={`
      bg-white border border-gray-200 rounded-lg shadow-sm min-w-[240px] max-w-[280px] overflow-hidden
      ${isActive ? 'ring-2 ring-indigo-500 shadow-lg' : ''}
    `}>
      {/* Handle top/left */}
      <Handle
        type="target"
        position={targetPosition}
        className="!w-2.5 !h-2.5 !bg-indigo-500 !border-2 !border-white"
      />
      
      {/* Header */}
      <div className="bg-indigo-50 border-b border-indigo-100 px-3 py-2 flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-semibold uppercase bg-indigo-500 text-white px-1.5 py-0.5 rounded">
          Step
        </span>
        <span className="text-gray-800 font-medium text-sm">{stepId}</span>
        {method && (
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${methodStyles[method] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
            {method}
          </span>
        )}
      </div>
      
      {/* Body */}
      <div className="p-3 space-y-2">
        {/* Description */}
        {description && (
          <p className="text-gray-600 text-xs line-clamp-2">{description}</p>
        )}
        
        {/* Operation */}
        {operationId && (
          <div className="text-[10px] text-gray-500 font-mono bg-gray-50 px-2 py-1 rounded border border-gray-100">
            {operationId}
          </div>
        )}
        
        {/* Skip indicator */}
        {hasSkip && (
          <div className="flex items-center gap-1 text-[10px] text-amber-600 bg-amber-50 px-2 py-1 rounded">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
            Conditional skip
          </div>
        )}
        
        {/* Outputs */}
        {outputs && Object.keys(outputs).length > 0 && (
          <div className="border-t border-gray-100 pt-2">
            <div className="text-[10px] text-gray-400 uppercase mb-1">Outputs</div>
            <div className="flex flex-wrap gap-1">
              {Object.keys(outputs).slice(0, 3).map((output) => (
                <span 
                  key={output}
                  className="text-[10px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded border border-purple-100"
                >
                  {output}
                </span>
              ))}
              {Object.keys(outputs).length > 3 && (
                <span className="text-[10px] text-gray-400">
                  +{Object.keys(outputs).length - 3}
                </span>
              )}
            </div>
          </div>
        )}
        
        {/* Conditional actions */}
        {(hasOnSuccess || hasOnFailure) && (
          <div className="flex gap-1.5 pt-1">
            {hasOnSuccess && (
              <span className="text-[10px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded border border-emerald-100">
                ✓ onSuccess
              </span>
            )}
            {hasOnFailure && (
              <span className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded border border-red-100">
                ✗ onFailure
              </span>
            )}
          </div>
        )}
      </div>
      
      {/* Handle bottom/right */}
      <Handle
        type="source"
        position={sourcePosition}
        className="!w-2.5 !h-2.5 !bg-indigo-500 !border-2 !border-white"
      />
    </div>
  );
}

export default memo(UnifiedStepNode);
