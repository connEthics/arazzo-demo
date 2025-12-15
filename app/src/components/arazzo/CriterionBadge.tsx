'use client';

import { memo } from 'react';
import { Badge } from '../primitives';
import type { Criterion, CriterionType, CriterionExpressionType } from '@/types/arazzo';

interface CriterionBadgeProps {
  criterion: Criterion;
  isDark: boolean;
  showDetails?: boolean;
  className?: string;
}

/**
 * Displays a criterion with its type, version, and condition
 */
function CriterionBadge({ criterion, isDark, showDetails = false, className = '' }: CriterionBadgeProps) {
  const codeBgClass = isDark ? 'bg-slate-800' : 'bg-gray-100';
  const textClass = isDark ? 'text-white' : 'text-gray-900';
  const mutedClass = isDark ? 'text-slate-400' : 'text-gray-500';

  // Determine the type
  const getTypeInfo = (type?: CriterionType): { label: string; variant: 'type-simple' | 'type-regex' | 'type-jsonpath' | 'type-xpath'; version?: string } => {
    if (!type) {
      return { label: 'simple', variant: 'type-simple' };
    }
    
    if (typeof type === 'string') {
      switch (type) {
        case 'regex': return { label: 'regex', variant: 'type-regex' };
        case 'jsonpath': return { label: 'JSONPath', variant: 'type-jsonpath' };
        case 'xpath': return { label: 'XPath', variant: 'type-xpath' };
        default: return { label: 'simple', variant: 'type-simple' };
      }
    }
    
    // CriterionExpressionType object
    const exprType = type as CriterionExpressionType;
    if (exprType.type === 'jsonpath') {
      return { 
        label: 'JSONPath', 
        variant: 'type-jsonpath',
        version: exprType.version 
      };
    }
    if (exprType.type === 'xpath') {
      return { 
        label: 'XPath', 
        variant: 'type-xpath',
        version: exprType.version 
      };
    }
    
    return { label: 'simple', variant: 'type-simple' };
  };

  const typeInfo = getTypeInfo(criterion.type);

  // Format version for display
  const formatVersion = (version: string): string => {
    const versionMap: Record<string, string> = {
      'draft-goessner-dispatch-jsonpath-00': 'Goessner Draft',
      'xpath-30': 'XPath 3.0',
      'xpath-20': 'XPath 2.0',
      'xpath-10': 'XPath 1.0',
    };
    return versionMap[version] || version;
  };

  if (!showDetails) {
    // Compact inline view
    return (
      <div className={`inline-flex items-center gap-1.5 ${className}`}>
        <Badge variant={typeInfo.variant} isDark={isDark} size="xs">
          {typeInfo.label}
        </Badge>
        <code className={`text-[10px] font-mono ${textClass}`}>
          {typeof criterion.condition === 'string' ? criterion.condition : JSON.stringify(criterion.condition)}
        </code>
      </div>
    );
  }

  // Detailed view
  return (
    <div className={`${codeBgClass} rounded p-2 border-l-2 border-emerald-400 ${className}`}>
      <div className="flex items-center gap-2 mb-1 flex-wrap">
        <Badge variant={typeInfo.variant} isDark={isDark} size="xs">
          {typeInfo.label}
        </Badge>
        {typeInfo.version && (
          <span className={`text-[9px] px-1 py-0.5 rounded ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-gray-200 text-gray-600'}`}>
            {formatVersion(typeInfo.version)}
          </span>
        )}
      </div>
      
      {criterion.context && (
        <div className="mb-1">
          <span className={`text-[9px] ${mutedClass}`}>context: </span>
          <code className={`text-[10px] font-mono ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`}>
            {criterion.context}
          </code>
        </div>
      )}
      
      <code className={`text-[10px] font-mono ${textClass} block break-all`}>
        {typeof criterion.condition === 'string' ? criterion.condition : JSON.stringify(criterion.condition)}
      </code>
    </div>
  );
}

export default memo(CriterionBadge);
