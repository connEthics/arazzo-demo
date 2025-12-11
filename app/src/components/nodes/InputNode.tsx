'use client';

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { SchemaProperty } from '@/types/arazzo';

interface InputNodeData {
  label: string;
  properties: string[];
  required: string[];
  schema: Record<string, SchemaProperty>;
  [key: string]: unknown;
}

interface InputNodeProps {
  data: InputNodeData;
}

function InputNode({ data }: InputNodeProps) {
  const { label, properties, required, schema } = data;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm min-w-[240px] overflow-hidden">
      {/* Header */}
      <div className="bg-emerald-50 border-b border-emerald-100 px-3 py-2 flex items-center gap-2">
        <span className="text-[10px] font-semibold uppercase bg-emerald-500 text-white px-1.5 py-0.5 rounded">
          Input
        </span>
        <span className="text-gray-800 font-medium text-sm">{label}</span>
      </div>
      
      {/* Body */}
      <div className="p-3">
        {properties.length > 0 ? (
          <div className="space-y-1.5">
            {properties.map((prop) => {
              const propSchema = schema[prop];
              const isRequired = required.includes(prop);
              return (
                <div 
                  key={prop}
                  className="bg-gray-50 rounded px-2.5 py-1.5 border-l-2 border-emerald-400"
                >
                  <div className="flex items-center gap-1.5">
                    <code className="text-emerald-700 text-xs font-mono">{prop}</code>
                    {isRequired && (
                      <span className="text-[10px] text-red-500 font-medium">required</span>
                    )}
                  </div>
                  {propSchema && (
                    <div className="text-[10px] text-gray-500 mt-0.5">
                      {propSchema.type}
                      {propSchema.default !== undefined && ` = ${propSchema.default}`}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-gray-400 text-xs">No inputs defined</div>
        )}
      </div>
      
      {/* Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2.5 !h-2.5 !bg-emerald-500 !border-2 !border-white"
      />
    </div>
  );
}

export default memo(InputNode);
