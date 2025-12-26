// Builder Left Panel Component
'use client';

import { memo, useState, useCallback, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useBuilder } from '../context/BuilderContext';
import SourceManagerV2 from './SourceManagerV2';
import OperationsToolbox from './OperationsToolbox';
import {
  OperationsIcon,
  CodeIcon,
  ExpandIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from './icons';

// Dynamic import for YamlEditor
const YamlEditor = dynamic(
  () => import('./YamlEditor'),
  { 
    ssr: false, 
    loading: () => (
      <div className="flex items-center justify-center h-full text-slate-400">
        Loading editor...
      </div>
    ) 
  }
);

type LeftMode = 'operations' | 'yaml';

interface LeftPanelProps {
  width: number;
  onWidthChange: (width: number) => void;
  onYamlFullscreen: () => void;
  isMobile?: boolean;
}

// Active Sources Section
function ActiveSourcesSection({ 
  expanded, 
  onToggle 
}: { 
  expanded: boolean; 
  onToggle: () => void;
}) {
  const { state } = useBuilder();
  
  const usedSources = useMemo(() => {
    const used = new Set<string>();
    state.spec.workflows.forEach(wf => {
      wf.steps.forEach(step => {
        if (step.operationId) {
          const parts = step.operationId.split('.');
          if (parts.length > 1) used.add(parts[0]);
        }
      });
    });
    return used;
  }, [state.spec]);

  const sourceCount = Object.keys(state.sources).length;
  if (sourceCount === 0) return null;

  return (
    <div className="border-t border-slate-200 dark:border-slate-800">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
      >
        <span className="text-xs font-medium text-slate-500">Active Sources</span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full">
            {sourceCount}
          </span>
          {expanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-3 space-y-1.5">
          {Object.keys(state.sources).map(name => {
            const isUsed = usedSources.has(name);
            const stepsCount = state.spec.workflows.reduce((acc, wf) => 
              acc + wf.steps.filter(s => s.operationId?.startsWith(name + '.')).length, 0
            );
            const source = state.sources[name];
            const pathCount = source?.paths ? Object.keys(source.paths).length : 0;
            
            return (
              <div 
                key={name} 
                className={`p-2 rounded border text-xs transition-colors ${
                  isUsed 
                    ? 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10' 
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="truncate font-medium">{name}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] text-slate-400">{pathCount} ops</span>
                    {isUsed && (
                      <span className="text-[9px] bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 px-1 py-0.5 rounded">
                        {stepsCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function LeftPanel({ 
  width, 
  onWidthChange, 
  onYamlFullscreen,
  isMobile = false,
}: LeftPanelProps) {
  const [leftMode, setLeftMode] = useState<LeftMode>('yaml');
  const [activeSourcesExpanded, setActiveSourcesExpanded] = useState(true);
  const [isResizing, setIsResizing] = useState(false);

  // Handle resize
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = Math.min(Math.max(200, e.clientX), 600);
      onWidthChange(newWidth);
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
    };
    
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, onWidthChange]);

  const content = (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Mode Toggle: Operations vs YAML - AT TOP */}
      <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
        <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
          <button
            onClick={() => setLeftMode('operations')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs transition-colors ${
              leftMode === 'operations' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <OperationsIcon />
            <span>Operations</span>
          </button>
          <button
            onClick={() => setLeftMode('yaml')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs transition-colors border-l border-slate-200 dark:border-slate-700 ${
              leftMode === 'yaml' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <CodeIcon />
            <span>YAML</span>
          </button>
          {leftMode === 'yaml' && (
            <button
              onClick={onYamlFullscreen}
              className="px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border-l border-slate-200 dark:border-slate-700"
              title="Fullscreen YAML Editor"
            >
              <ExpandIcon />
            </button>
          )}
        </div>
      </div>
      
      {/* Content based on mode */}
      {leftMode === 'operations' ? (
        <>
          {/* Source Manager - Inside Operations mode */}
          <SourceManagerV2 compact />
          
          {/* Operations Toolbox */}
          <div className="flex-1 overflow-y-auto">
            <OperationsToolbox />
          </div>
          
          {/* Active Sources - Only in Operations mode */}
          <ActiveSourcesSection 
            expanded={activeSourcesExpanded} 
            onToggle={() => setActiveSourcesExpanded(!activeSourcesExpanded)} 
          />
        </>
      ) : (
        /* YAML Editor - Full height, no active sources */
        <div className="flex-1 overflow-hidden">
          <YamlEditor />
        </div>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <div className="flex-1 flex flex-col bg-white dark:bg-slate-950 overflow-hidden">
        {content}
      </div>
    );
  }

  return (
    <div 
      className="border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col shrink-0 relative"
      style={{ width }}
    >
      {content}
      
      {/* Resize Handle */}
      <div
        onMouseDown={handleMouseDown}
        className={`absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-indigo-500/50 transition-colors z-10 ${
          isResizing ? 'bg-indigo-500' : 'bg-transparent'
        }`}
      />
    </div>
  );
}

export default memo(LeftPanel);
