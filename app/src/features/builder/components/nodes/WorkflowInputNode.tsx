'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';

interface WorkflowInputNodeData {
  workflowId: string;
  inputs?: Array<{ name: string; type?: string }>;
  description?: string;
  isSelected?: boolean;
}

/**
 * Input node representing workflow inputs.
 * This is the entry point of the workflow.
 */
function WorkflowInputNode({ data }: NodeProps) {
  const nodeData = data as unknown as WorkflowInputNodeData;
  const inputs = nodeData.inputs || [];
  const isSelected = nodeData.isSelected || false;

  return (
    <div className="relative">
      {/* Main container */}
      <div className={`bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-lg border-2 min-w-[180px] transition-all ${
        isSelected ? 'border-white ring-2 ring-emerald-300 ring-offset-2' : 'border-emerald-400'
      }`}>
        {/* Header */}
        <div className="px-4 py-3 flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
          </div>
          <div>
            <div className="text-white font-bold text-sm">INPUT</div>
            <div className="text-emerald-100 text-xs truncate max-w-[120px]">
              {nodeData.workflowId || 'Workflow'}
            </div>
          </div>
        </div>

        {/* Inputs list */}
        {inputs.length > 0 && (
          <div className="bg-white/10 px-3 py-2 border-t border-emerald-400/30">
            <div className="text-emerald-100 text-[10px] font-medium uppercase tracking-wide mb-1">
              Inputs
            </div>
            <div className="space-y-1">
              {inputs.map((input, idx) => (
                <div 
                  key={idx}
                  className="flex items-center gap-2 text-xs text-white"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" />
                  <span className="font-mono">{input.name}</span>
                  {input.type && (
                    <span className="text-emerald-200 text-[10px]">({input.type})</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No inputs placeholder */}
        {inputs.length === 0 && (
          <div className="bg-white/10 px-3 py-2 border-t border-emerald-400/30">
            <div className="text-emerald-200/60 text-xs italic">
              No workflow inputs
            </div>
          </div>
        )}
      </div>

      {/* Output handle (connects to first steps) */}
      <Handle
        type="source"
        position={Position.Right}
        id="flow-out"
        className="!w-3 !h-3 !bg-emerald-400 !border-2 !border-white"
      />
    </div>
  );
}

export default memo(WorkflowInputNode);
