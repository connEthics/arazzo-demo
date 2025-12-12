'use client';

import { memo } from 'react';
import { Card, PropertyList } from '../primitives';
import type { PayloadReplacement } from '@/types/arazzo';

interface PayloadReplacementsProps {
  replacements: PayloadReplacement[];
  isDark: boolean;
  collapsible?: boolean;
  className?: string;
}

/**
 * Displays a list of payload replacements (target -> value)
 */
function PayloadReplacements({ replacements, isDark, collapsible = false, className = '' }: PayloadReplacementsProps) {
  if (!replacements || replacements.length === 0) {
    return null;
  }

  const items = replacements.map(r => ({
    name: r.target,
    value: typeof r.value === 'object' ? JSON.stringify(r.value, null, 2) : String(r.value),
    type: r.target.startsWith('/') ? 'JSON Pointer' : 'XPath',
  }));

  return (
    <Card 
      title="Payload Replacements" 
      isDark={isDark}
      collapsible={collapsible}
      badge={
        <span className={`text-[9px] px-1 py-0.5 rounded ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-gray-200 text-gray-600'}`}>
          {replacements.length}
        </span>
      }
      icon={
        <svg className={`w-3 h-3 ${isDark ? 'text-amber-400' : 'text-amber-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      }
      className={className}
    >
      <PropertyList 
        items={items}
        isDark={isDark}
        variant="compact"
        borderColor="border-amber-400"
      />
    </Card>
  );
}

export default memo(PayloadReplacements);
