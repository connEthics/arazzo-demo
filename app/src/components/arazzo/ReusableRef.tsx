'use client';

import { memo } from 'react';
import { Badge } from '../primitives';
import type { ReusableObject } from '@/types/arazzo';

interface ReusableRefProps {
  reusable: ReusableObject;
  isDark: boolean;
  onClick?: (reference: string) => void;
  showValue?: boolean;
  className?: string;
}

/**
 * Displays a reference to a reusable component ($components.xxx.yyy)
 */
function ReusableRef({ reusable, isDark, onClick, showValue = true, className = '' }: ReusableRefProps) {
  // Parse the reference to extract type and name
  // e.g., "$components.parameters.storeId" -> { type: "parameters", name: "storeId" }
  const parseReference = (ref: string) => {
    const match = ref.match(/^\$components\.(\w+)\.(.+)$/);
    if (match) {
      return { type: match[1], name: match[2] };
    }
    return { type: 'unknown', name: ref };
  };

  const { type, name } = parseReference(reusable.reference);

  const typeColors: Record<string, string> = {
    parameters: isDark ? 'text-cyan-400' : 'text-cyan-600',
    successActions: isDark ? 'text-emerald-400' : 'text-emerald-600',
    failureActions: isDark ? 'text-red-400' : 'text-red-600',
    inputs: isDark ? 'text-purple-400' : 'text-purple-600',
  };

  const handleClick = () => {
    if (onClick) {
      onClick(reusable.reference);
    }
  };

  return (
    <div 
      className={`inline-flex items-center gap-1.5 ${onClick ? 'cursor-pointer hover:opacity-80' : ''} ${className}`}
      onClick={onClick ? handleClick : undefined}
    >
      <Badge variant="reference" isDark={isDark} size="xs">
        $ref
      </Badge>
      <code className={`text-[10px] font-mono ${typeColors[type] || (isDark ? 'text-slate-300' : 'text-gray-600')}`}>
        <span className={isDark ? 'text-slate-500' : 'text-gray-400'}>$components.</span>
        <span>{type}.</span>
        <span className="font-semibold">{name}</span>
      </code>
      {showValue && reusable.value !== undefined && (
        <span className={`text-[9px] px-1 py-0.5 rounded ${isDark ? 'bg-slate-700 text-amber-300' : 'bg-gray-100 text-amber-600'}`}>
          = {typeof reusable.value === 'object' ? JSON.stringify(reusable.value) : String(reusable.value)}
        </span>
      )}
      {onClick && (
        <svg className={`w-3 h-3 ${isDark ? 'text-slate-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      )}
    </div>
  );
}

export default memo(ReusableRef);
