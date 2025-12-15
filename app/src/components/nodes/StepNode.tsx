'use client';

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { Step } from '@/types/arazzo';

type LayoutDirection = 'horizontal' | 'vertical';

interface StepNodeData {
  step: Step;
  hasOnSuccess: boolean;
  hasOnFailure: boolean;
  hasSkip: boolean;
  method: string | null;
  direction?: LayoutDirection;
  [key: string]: unknown;
}

interface StepNodeProps {
  data: StepNodeData;
}

const methodStyles: Record<string, string> = {
  GET: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  POST: 'bg-blue-100 text-blue-700 border-blue-200',
  PUT: 'bg-amber-100 text-amber-700 border-amber-200',
  DELETE: 'bg-red-100 text-red-700 border-red-100',
};

function StepNode({ data }: StepNodeProps) {
  const { step, hasOnSuccess, hasOnFailure, hasSkip, method, direction = 'vertical' } = data || {};
  
  // Dynamic handle positions based on layout direction
  const targetPosition = direction === 'horizontal' ? Position.Left : Position.Top;
  const sourcePosition = direction === 'horizontal' ? Position.Right : Position.Bottom;

  // Guard against undefined step
  if (!step) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm min-w-[240px] p-3">
        <Handle type="target" position={targetPosition} className="!w-2.5 !h-2.5 !bg-gray-400 !border-2 !border-white" />
        <span className="text-gray-400 text-sm">Loading step...</span>
        <Handle type="source" position={sourcePosition} className="!w-2.5 !h-2.5 !bg-gray-400 !border-2 !border-white" />
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm min-w-[240px] max-w-[280px] overflow-hidden">
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
        <span className="text-gray-800 font-medium text-sm">{step.stepId || 'Unknown'}</span>
        {method && (
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${methodStyles[method] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
            {method}
          </span>
        )}
      </div>
      
      {/* Body */}
      <div className="p-3 space-y-2">
        {/* Description */}
        {step.description && (
          <p className="text-gray-600 text-xs line-clamp-2">{step.description}</p>
        )}
        
        {/* Operation */}
        {step.operationId && (
          <div className="text-[10px] text-gray-500 font-mono bg-gray-50 px-2 py-1 rounded border border-gray-100">
            {step.operationId}
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
        {step.outputs && Object.keys(step.outputs).length > 0 && (
          <div className="border-t border-gray-100 pt-2">
            <div className="text-[10px] text-gray-400 uppercase mb-1">Outputs</div>
            <div className="flex flex-wrap gap-1">
              {Object.keys(step.outputs).slice(0, 3).map((output) => (
                <span 
                  key={output}
                  className="text-[10px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded border border-purple-100"
                >
                  {output}
                </span>
              ))}
              {Object.keys(step.outputs).length > 3 && (
                <span className="text-[10px] text-gray-400">
                  +{Object.keys(step.outputs).length - 3}
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

export default memo(StepNode);
