'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';

interface WorkflowOutputNodeData {
  workflowId: string;
  outputs?: Record<string, string>;
  description?: string;
  isSelected?: boolean;
}

/**
 * Output node representing workflow outputs.
 * This is the exit point of the workflow.
 */
function WorkflowOutputNode({ data }: NodeProps) {
  const nodeData = data as unknown as WorkflowOutputNodeData;
  const outputs = nodeData.outputs || {};
  const outputEntries = Object.entries(outputs);
  const isSelected = nodeData.isSelected || false;

  return (
    <div className="relative">
      {/* Input handle (connects from last steps) */}
      <Handle
        type="target"
        position={Position.Left}
        id="flow-in"
        className="!w-3 !h-3 !bg-amber-400 !border-2 !border-white"
      />

      {/* Main container */}
      <div className={`bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl shadow-lg border-2 min-w-[180px] transition-all ${
        isSelected ? 'border-white ring-2 ring-amber-300 ring-offset-2' : 'border-amber-400'
      }`}>
        {/* Header */}
        <div className="px-4 py-3 flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </div>
          <div>
            <div className="text-white font-bold text-sm">OUTPUT</div>
            <div className="text-amber-100 text-xs truncate max-w-[120px]">
              {nodeData.workflowId || 'Workflow'}
            </div>
          </div>
        </div>

        {/* Outputs list */}
        {outputEntries.length > 0 && (
          <div className="bg-white/10 px-3 py-2 border-t border-amber-400/30">
            <div className="text-amber-100 text-[10px] font-medium uppercase tracking-wide mb-1">
              Outputs
            </div>
            <div className="space-y-1">
              {outputEntries.map(([key, value], idx) => (
                <div 
                  key={idx}
                  className="flex items-center gap-2 text-xs text-white"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-300" />
                  <span className="font-mono">{key}</span>
                  <span className="text-amber-200 text-[10px] truncate max-w-[100px]" title={value}>
                    = {value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No outputs placeholder */}
        {outputEntries.length === 0 && (
          <div className="bg-white/10 px-3 py-2 border-t border-amber-400/30">
            <div className="text-amber-200/60 text-xs italic">
              No workflow outputs
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(WorkflowOutputNode);
