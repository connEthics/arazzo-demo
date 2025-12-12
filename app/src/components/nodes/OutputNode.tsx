'use client';

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

interface OutputNodeData {
  label: string;
  properties: string[];
  expressions: Record<string, string>;
  [key: string]: unknown;
}

interface OutputNodeProps {
  data: OutputNodeData;
}

function OutputNode({ data }: OutputNodeProps) {
  const { label, properties = [], expressions = {} } = data;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm min-w-[240px] overflow-hidden">
      {/* Handle top */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-2.5 !h-2.5 !bg-amber-500 !border-2 !border-white"
      />
      
      {/* Header */}
      <div className="bg-amber-50 border-b border-amber-100 px-3 py-2 flex items-center gap-2">
        <span className="text-[10px] font-semibold uppercase bg-amber-500 text-white px-1.5 py-0.5 rounded">
          Output
        </span>
        <span className="text-gray-800 font-medium text-sm">{label}</span>
      </div>
      
      {/* Body */}
      <div className="p-3">
        {properties.length > 0 ? (
          <div className="space-y-1.5">
            {properties.map((prop) => (
              <div 
                key={prop}
                className="bg-gray-50 rounded px-2.5 py-1.5 border-l-2 border-amber-400"
              >
                <div className="text-amber-700 text-xs font-medium">{prop}</div>
                <div className="text-[10px] text-gray-500 font-mono mt-0.5 break-all">
                  {expressions[prop]}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-gray-400 text-xs">No outputs defined</div>
        )}
      </div>
    </div>
  );
}

export default memo(OutputNode);
