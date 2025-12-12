'use client';

import { memo, useState, useRef, useEffect } from 'react';

interface ExpandableProps {
  children: React.ReactNode;
  maxHeight?: number; // in pixels
  isDark: boolean;
  className?: string;
}

/**
 * Wraps content and truncates with a fade effect if content exceeds maxHeight.
 * Shows a "Show all" button to expand.
 */
function Expandable({ 
  children, 
  maxHeight = 200, 
  isDark,
  className = '' 
}: ExpandableProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [needsTruncation, setNeedsTruncation] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) {
      setNeedsTruncation(contentRef.current.scrollHeight > maxHeight);
    }
  }, [children, maxHeight]);

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };

  if (!needsTruncation) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={`relative ${className}`}>
      <div
        ref={contentRef}
        className="overflow-hidden transition-all duration-300"
        style={{ maxHeight: isExpanded ? 'none' : `${maxHeight}px` }}
      >
        {children}
      </div>
      
      {/* Fade overlay when collapsed */}
      {!isExpanded && (
        <div 
          className={`absolute bottom-0 left-0 right-0 h-16 pointer-events-none ${
            isDark 
              ? 'bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent' 
              : 'bg-gradient-to-t from-gray-900 via-gray-900/80 to-transparent'
          }`}
        />
      )}
      
      {/* Expand/Collapse button */}
      <button
        onClick={handleToggle}
        className={`w-full mt-1 py-1.5 text-[10px] font-medium rounded transition-colors flex items-center justify-center gap-1 ${
          isDark
            ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
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
            Show all
          </>
        )}
      </button>
    </div>
  );
}

export default memo(Expandable);
