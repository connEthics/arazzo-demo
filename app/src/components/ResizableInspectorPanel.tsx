'use client';

import { ReactNode, useState, useRef, useCallback, useEffect } from 'react';

interface ResizableInspectorPanelProps {
  children: ReactNode;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  isDark?: boolean;
  position?: 'left' | 'right';
  onResize?: (width: number) => void;
  isOpen?: boolean;
  onToggle?: () => void;
}

/**
 * A resizable panel wrapper for the inspector.
 * Can be positioned on the left or right side, with a draggable resize handle.
 */
export default function ResizableInspectorPanel({
  children,
  defaultWidth = 384, // w-96
  minWidth = 280,
  maxWidth = 600,
  isDark = false,
  position = 'right',
  onResize,
  isOpen = true,
  onToggle,
}: ResizableInspectorPanelProps) {
  const [width, setWidth] = useState(defaultWidth);
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = width;
  }, [width]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;

    const delta = position === 'right' 
      ? startXRef.current - e.clientX 
      : e.clientX - startXRef.current;
    
    const newWidth = Math.min(maxWidth, Math.max(minWidth, startWidthRef.current + delta));
    setWidth(newWidth);
    onResize?.(newWidth);
  }, [isResizing, position, minWidth, maxWidth, onResize]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  if (!isOpen) {
    return (
      <div className={`flex-shrink-0 ${position === 'right' ? 'border-l' : 'border-r'} ${isDark ? 'border-slate-700 bg-slate-900' : 'border-gray-200 bg-white'}`}>
        <button
          onClick={onToggle}
          className={`p-2 w-10 h-full flex items-center justify-center transition-colors ${
            isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-gray-100 text-gray-400'
          }`}
          title="Open Inspector"
        >
          <svg className={`w-4 h-4 ${position === 'right' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div
      ref={panelRef}
      className="relative flex-shrink-0 h-full"
      style={{ width }}
    >
      {/* Resize handle */}
      <div
        onMouseDown={handleMouseDown}
        className={`absolute top-0 ${position === 'right' ? 'left-0' : 'right-0'} w-1 h-full cursor-col-resize group z-10`}
      >
        {/* Visual indicator */}
        <div className={`w-full h-full transition-colors ${
          isResizing 
            ? 'bg-indigo-500' 
            : isDark 
              ? 'bg-slate-700 group-hover:bg-indigo-500/50' 
              : 'bg-gray-200 group-hover:bg-indigo-400/50'
        }`} />
        
        {/* Grip dots - visible on hover */}
        <div className={`absolute top-1/2 ${position === 'right' ? '-left-1' : '-right-1'} -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity ${isResizing ? 'opacity-100' : ''}`}>
          <div className={`w-3 h-8 rounded flex flex-col items-center justify-center gap-0.5 ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>
            <div className={`w-1 h-1 rounded-full ${isDark ? 'bg-slate-500' : 'bg-gray-400'}`} />
            <div className={`w-1 h-1 rounded-full ${isDark ? 'bg-slate-500' : 'bg-gray-400'}`} />
            <div className={`w-1 h-1 rounded-full ${isDark ? 'bg-slate-500' : 'bg-gray-400'}`} />
          </div>
        </div>
      </div>

      {/* Panel content */}
      <div className="h-full overflow-hidden">
        {children}
      </div>

      {/* Width indicator during resize */}
      {isResizing && (
        <div className={`absolute top-2 ${position === 'right' ? 'left-2' : 'right-2'} px-2 py-1 rounded text-xs font-mono ${
          isDark ? 'bg-slate-700 text-slate-300' : 'bg-gray-100 text-gray-600'
        }`}>
          {Math.round(width)}px
        </div>
      )}
    </div>
  );
}
