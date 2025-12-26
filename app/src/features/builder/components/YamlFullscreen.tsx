// YAML Fullscreen Mode Component
'use client';

import { memo } from 'react';
import dynamic from 'next/dynamic';
import { CollapseIcon } from './icons';

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

interface YamlFullscreenProps {
  onExit: () => void;
}

function YamlFullscreen({ onExit }: YamlFullscreenProps) {
  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-slate-950">
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <h2 className="font-medium text-sm">YAML Editor</h2>
        <button 
          onClick={onExit} 
          className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-2"
        >
          <CollapseIcon />
          <span className="text-sm">Exit Fullscreen</span>
        </button>
      </div>
      <div className="flex-1 overflow-hidden">
        <YamlEditor />
      </div>
    </div>
  );
}

export default memo(YamlFullscreen);
