'use client';

import { useState } from 'react';
import RightPanelModeToggle, { RightPanelMode } from './RightPanelModeToggle';

interface RightPanelModeToggleShowcaseProps {
  isDark: boolean;
}

export default function RightPanelModeToggleShowcase({ isDark }: RightPanelModeToggleShowcaseProps) {
  const [mode, setMode] = useState<RightPanelMode>('read');
  const [logs, setLogs] = useState<string[]>([]);

  const handleModeChange = (newMode: RightPanelMode) => {
    setMode(newMode);
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: Switched to ${newMode} mode`]);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">RightPanelModeToggle</h2>
        <p className={`${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
          Toggle button to switch between Read (DetailDrawer) and Edit (Inspector) modes
          in the right panel. Used to control what content is displayed.
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
              Interactive Toggle
            </h4>
            <RightPanelModeToggle
              mode={mode}
              onModeChange={handleModeChange}
              isDark={isDark}
            />
          </div>

          {/* Disabled State */}
          <div>
            <h4 className={`text-xs uppercase font-semibold mb-3 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
              Disabled State
            </h4>
            <RightPanelModeToggle
              mode="read"
              onModeChange={() => {}}
              isDark={isDark}
              disabled={true}
            />
          </div>

          {/* Both Modes Side by Side */}
          <div>
            <h4 className={`text-xs uppercase font-semibold mb-3 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
              Mode Comparison
            </h4>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <RightPanelModeToggle
                  mode="read"
                  onModeChange={() => {}}
                  isDark={isDark}
                />
                <p className={`text-xs mt-2 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>Read selected</p>
              </div>
              <div className="text-center">
                <RightPanelModeToggle
                  mode="edit"
                  onModeChange={() => {}}
                  isDark={isDark}
                />
                <p className={`text-xs mt-2 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>Edit selected</p>
              </div>
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
                Click the toggle buttons above to see mode changes.
              </p>
            ) : (
              <div className="space-y-1">
                {logs.map((log, idx) => (
                  <div key={idx} className={`text-xs font-mono ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                    {log}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className={`p-4 rounded-lg border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
          <h4 className={`font-semibold mb-2 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Read Mode
          </h4>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Displays DetailDrawer with read-only step/source information
          </p>
        </div>
        
        <div className={`p-4 rounded-lg border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
          <h4 className={`font-semibold mb-2 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit Mode
          </h4>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Shows Inspector with editable form fields for the selected element
          </p>
        </div>
        
        <div className={`p-4 rounded-lg border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
          <h4 className={`font-semibold mb-2 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <svg className="w-5 h-5 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
            Theme Support
          </h4>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Fully supports light and dark themes with appropriate styling
          </p>
        </div>
        
        <div className={`p-4 rounded-lg border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
          <h4 className={`font-semibold mb-2 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
            Disabled State
          </h4>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Can be disabled when no element is selected
          </p>
        </div>
      </div>

      {/* Usage Example */}
      <div className={`p-4 rounded-lg border ${isDark ? 'border-indigo-500/30 bg-indigo-500/10' : 'border-indigo-200 bg-indigo-50'}`}>
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h4 className={`font-semibold mb-1 ${isDark ? 'text-indigo-300' : 'text-indigo-900'}`}>
              Integration with Right Panel
            </h4>
            <p className={`text-sm ${isDark ? 'text-indigo-200/80' : 'text-indigo-700'}`}>
              This toggle is placed in the right panel header. When &quot;Read&quot; is selected, 
              the DetailDrawer component is rendered. When &quot;Edit&quot; is selected, 
              the Inspector component is rendered for editing the selected element.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
