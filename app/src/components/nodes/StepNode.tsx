'use client';

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { Step } from '@/types/arazzo';
import { StepHeader, StepBody } from '../arazzo';

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
      <StepHeader
        step={step}
        variant="node"
      />

      {/* Body */}
      <StepBody
        step={step}
        variant="compact"
      />

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
