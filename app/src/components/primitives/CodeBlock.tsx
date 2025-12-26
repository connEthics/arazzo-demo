'use client';

import { memo, useState, useRef, useEffect } from 'react';
import CopyButton from './CopyButton';

interface CodeBlockProps {
  code: string;
  language?: string;
  isDark: boolean;
  showCopy?: boolean;
  maxHeight?: number; // in pixels, content will be truncated with expand button if exceeded
  className?: string;
  title?: string;
  forceExpanded?: boolean; // Force expansion state from parent
}

function CodeBlock({ 
  code, 
  language, 
  isDark, 
  showCopy = true, 
  maxHeight = 200,
  className = '',
  title,
  forceExpanded
}: CodeBlockProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [needsTruncation, setNeedsTruncation] = useState(false);
  const contentRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (contentRef.current) {
      setNeedsTruncation(contentRef.current.scrollHeight > maxHeight);
    }
  }, [code, maxHeight]);

  // Sync with forceExpanded prop
  useEffect(() => {
    if (forceExpanded !== undefined) {
      setIsExpanded(forceExpanded);
    }
  }, [forceExpanded]);

  const bgClass = isDark ? 'bg-slate-900' : 'bg-gray-900';

  return (
    <div className={`rounded-lg overflow-hidden ${className}`}>
      {title && (
        <div className={`flex items-center justify-between px-3 py-1.5 text-[10px] uppercase font-semibold ${
          isDark ? 'bg-slate-800 text-slate-400' : 'bg-gray-800 text-gray-400'
        }`}>
          <span>{title}</span>
          {language && (
            <span className={`px-1.5 py-0.5 rounded ${isDark ? 'bg-slate-700' : 'bg-gray-700'}`}>
              {language}
            </span>
          )}
        </div>
      )}
      <div className={`relative ${bgClass}`}>
        {showCopy && (
          <div className="absolute top-2 right-2 z-10">
            <CopyButton text={code} isDark={true} size="sm" />
          </div>
        )}
        
        <div className="relative">
          <div 
            className="p-3 overflow-hidden transition-all duration-300" 
            style={{ maxHeight: (!needsTruncation || isExpanded) ? 'none' : `${maxHeight}px` }}
          >
            <pre 
              ref={contentRef}
              className="text-xs font-mono text-gray-300 whitespace-pre-wrap break-all"
            >
              {code}
            </pre>
          </div>
          
          {/* Fade overlay when truncated */}
          {needsTruncation && !isExpanded && (
            <div 
              className={`absolute bottom-0 left-0 right-0 h-12 pointer-events-none bg-gradient-to-t ${bgClass.replace('bg-', 'from-')} via-slate-900/80 to-transparent`}
            />
          )}
        </div>
        
        {/* Expand/Collapse button */}
        {needsTruncation && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className={`w-full py-1.5 text-[10px] font-medium transition-colors flex items-center justify-center gap-1 border-t ${
              isDark
                ? 'bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-slate-300 border-slate-800'
                : 'bg-gray-800/50 hover:bg-gray-800 text-gray-400 hover:text-gray-300 border-gray-800'
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
        )}
      </div>
    </div>
  );
}

export default memo(CodeBlock);
