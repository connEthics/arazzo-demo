'use client';

import { memo, useState, useRef, useEffect } from 'react';

interface PropertyItem {
  name: string;
  value: string | React.ReactNode;
  type?: string;
  required?: boolean;
  description?: string;
}

interface PropertyListProps {
  items: PropertyItem[];
  isDark: boolean;
  variant?: 'compact' | 'detailed';
  borderColor?: string;
  maxItems?: number; // max items to show before truncation (default: 5)
  className?: string;
  forceExpanded?: boolean; // Force expansion state from parent
}

function PropertyList({ 
  items, 
  isDark, 
  variant = 'compact',
  borderColor = 'border-indigo-400',
  maxItems = 5,
  className = '',
  forceExpanded
}: PropertyListProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const codeBgClass = isDark ? 'bg-slate-800' : 'bg-gray-50';
  const textClass = isDark ? 'text-white' : 'text-gray-900';
  const mutedClass = isDark ? 'text-slate-400' : 'text-gray-500';

  // Sync with forceExpanded prop
  useEffect(() => {
    if (forceExpanded !== undefined) {
      setIsExpanded(forceExpanded);
    }
  }, [forceExpanded]);

  const needsTruncation = items.length > maxItems;
  const displayItems = (!needsTruncation || isExpanded) ? items : items.slice(0, maxItems);
  const hiddenCount = items.length - maxItems;

  const renderItem = (item: PropertyItem, idx: number) => {
    if (variant === 'compact') {
      return (
        <div 
          key={idx} 
          className={`${codeBgClass} rounded px-2 py-1.5 border-l-2 ${borderColor}`}
        >
          <div className="flex items-center gap-2 flex-wrap">
            <code className={`text-[11px] font-mono font-medium ${textClass}`}>
              {item.name}
            </code>
            {item.type && (
              <span className={`text-[9px] px-1 py-0.5 rounded ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-gray-200 text-gray-600'}`}>
                {item.type}
              </span>
            )}
            {item.required && (
              <span className="text-[9px] px-1 py-0.5 rounded bg-red-100 text-red-600">
                required
              </span>
            )}
          </div>
          {typeof item.value === 'string' ? (
            <code className={`text-[10px] font-mono ${mutedClass} block mt-0.5 break-all`}>
              {item.value}
            </code>
          ) : (
            <div className={`text-[10px] ${mutedClass} mt-0.5`}>
              {item.value}
            </div>
          )}
        </div>
      );
    }

    // Detailed variant
    return (
      <div 
        key={idx} 
        className={`${codeBgClass} rounded p-2 border-l-2 ${borderColor}`}
      >
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <code className={`text-xs font-mono font-medium ${textClass}`}>
            {item.name}
          </code>
          {item.type && (
            <span className={`text-[9px] px-1.5 py-0.5 rounded ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-gray-200 text-gray-600'}`}>
              {item.type}
            </span>
          )}
          {item.required && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-100 text-red-600">
              required
            </span>
          )}
        </div>
        {item.description && (
          <p className={`text-[10px] ${mutedClass} mb-1`}>{item.description}</p>
        )}
        {typeof item.value === 'string' ? (
          <code className={`text-[10px] font-mono ${mutedClass} block break-all`}>
            {item.value}
          </code>
        ) : (
          <div className={`text-[10px] ${mutedClass}`}>
            {item.value}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={className}>
      <div className="relative">
        <div className={`space-y-1.5 ${variant === 'detailed' ? 'space-y-2' : ''}`}>
          {displayItems.map((item, idx) => renderItem(item, idx))}
        </div>
        
        {/* Fade overlay on last item when truncated */}
        {needsTruncation && !isExpanded && (
          <div 
            className={`absolute bottom-0 left-0 right-0 h-8 pointer-events-none bg-gradient-to-t ${
              isDark ? 'from-slate-900' : 'from-white'
            } to-transparent`}
          />
        )}
      </div>
      
      {/* Expand/Collapse button */}
      {needsTruncation && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`w-full mt-2 py-1.5 text-[10px] font-medium rounded transition-colors flex items-center justify-center gap-1 ${
            isDark
              ? 'bg-slate-700/50 hover:bg-slate-700 text-slate-400 hover:text-slate-300'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700'
          }`}
        >
          {isExpanded ? (
            <>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
              Show less
            </>
          ) : (
            <>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              Show all ({hiddenCount} more)
            </>
          )}
        </button>
      )}
    </div>
  );
}

export default memo(PropertyList);
