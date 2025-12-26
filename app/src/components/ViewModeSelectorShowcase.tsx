'use client';

import { useState } from 'react';
import ViewModeSelector, { ViewMode } from './ViewModeSelector';

interface ViewModeSelectorShowcaseProps {
  isDark: boolean;
}

export default function ViewModeSelectorShowcase({ isDark }: ViewModeSelectorShowcaseProps) {
  const [mode, setMode] = useState<ViewMode>('documentation');
  const [logs, setLogs] = useState<string[]>([]);

  const handleModeChange = (newMode: ViewMode) => {
    setMode(newMode);
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: Switched to "${newMode}" mode`]);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">View Mode Selector</h2>
        <p className={`${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
          Selector for switching between view modes: Documentation, Builder, Flowchart, and Sequence.
          Each mode displays a different visualization of the Arazzo workflow.
        </p>
      </div>

      {/* Preview */}
      <div className={`rounded-xl border overflow-hidden ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-gray-200 bg-white'}`}>
        <div className={`px-4 py-3 border-b ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-100 bg-gray-50'}`}>
          <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Preview</h3>
          <p className={`text-sm mt-0.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Current mode: <span className="font-mono font-medium">{mode}</span>
          </p>
        </div>
        
        <div className={`p-6 space-y-6 ${isDark ? 'bg-slate-900/50' : 'bg-gray-50/50'}`}>
          {/* Default State */}
          <div>
            <h4 className={`text-xs uppercase font-semibold mb-3 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
              Interactive Selector
            </h4>
            <ViewModeSelector
              mode={mode}
              onModeChange={handleModeChange}
              isDark={isDark}
            />
          </div>

          {/* Compact Mode */}
          <div>
            <h4 className={`text-xs uppercase font-semibold mb-3 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
              Compact Mode (icons only, with tooltips)
            </h4>
            <ViewModeSelector
              mode={mode}
              onModeChange={handleModeChange}
              isDark={isDark}
              compact={true}
            />
          </div>

          {/* Disabled State */}
          <div>
            <h4 className={`text-xs uppercase font-semibold mb-3 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
              Disabled State
            </h4>
            <ViewModeSelector
              mode="builder"
              onModeChange={() => {}}
              isDark={isDark}
              disabled={true}
            />
          </div>

          {/* All Modes Preview */}
          <div>
            <h4 className={`text-xs uppercase font-semibold mb-3 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
              All Modes Comparison
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(['documentation', 'builder', 'flowchart', 'sequence'] as ViewMode[]).map((m) => (
                <div key={m} className="text-center">
                  <ViewModeSelector
                    mode={m}
                    onModeChange={() => {}}
                    isDark={isDark}
                    compact={true}
                  />
                  <p className={`text-xs mt-2 capitalize ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                    {m} selected
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Activity Log */}
        <div className={`border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
          <div className={`px-4 py-2 border-b ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-gray-200 bg-gray-50'}`}>
            <h4 className={`text-xs font-semibold uppercase ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              Activity Log
            </h4>
          </div>
          <div className={`px-4 py-3 max-h-32 overflow-y-auto ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
            {logs.length === 0 ? (
              <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                Click the view mode buttons above to see changes.
              </p>
            ) : (
              <div className="space-y-1">
                {logs.slice(-5).map((log, idx) => (
                  <div key={idx} className={`text-xs font-mono ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                    {log}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mode Descriptions */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className={`p-4 rounded-lg border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
          <h4 className={`font-semibold mb-2 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Documentation
          </h4>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Unified view with all workflows displayed sequentially. Includes a table of contents for quick navigation.
          </p>
        </div>
        
        <div className={`p-4 rounded-lg border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
          <h4 className={`font-semibold mb-2 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
            </svg>
            Builder
          </h4>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Interactive visual editor with drag & drop. Add steps, configure parameters, and connect workflows.
          </p>
        </div>
        
        <div className={`p-4 rounded-lg border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
          <h4 className={`font-semibold mb-2 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <svg className="w-5 h-5 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
            Flowchart
          </h4>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Mermaid flowchart diagram showing workflow steps and their connections (success/failure paths).
          </p>
        </div>
        
        <div className={`p-4 rounded-lg border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
          <h4 className={`font-semibold mb-2 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            Sequence
          </h4>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Mermaid sequence diagram showing API interactions between client and services over time.
          </p>
        </div>
      </div>

      {/* Integration Note */}
      <div className={`p-4 rounded-lg border ${isDark ? 'border-indigo-500/30 bg-indigo-500/10' : 'border-indigo-200 bg-indigo-50'}`}>
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h4 className={`font-semibold mb-1 ${isDark ? 'text-indigo-300' : 'text-indigo-900'}`}>
              Header Integration
            </h4>
            <p className={`text-sm ${isDark ? 'text-indigo-200/80' : 'text-indigo-700'}`}>
              This selector is placed in the Builder header bar. The selected mode determines 
              what is rendered in the central panel. Left and right panels remain accessible 
              in all modes for easy reference.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
