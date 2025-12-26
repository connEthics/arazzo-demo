'use client';

import { useState } from 'react';
import DisplayToggles, { DisplayOptions, DisplayToggle } from './DisplayToggles';

interface DisplayTogglesShowcaseProps {
  isDark: boolean;
}

const DEFAULT_OPTIONS: DisplayOptions = {
  showPorts: true,
  showDataFlow: true,
  showErrorFlow: false,
  showOutputs: true,
  showDescriptions: false,
};

export default function DisplayTogglesShowcase({ isDark }: DisplayTogglesShowcaseProps) {
  const [options, setOptions] = useState<DisplayOptions>(DEFAULT_OPTIONS);
  const [singleToggle, setSingleToggle] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const handleChange = (newOptions: DisplayOptions) => {
    // Find what changed
    const changedKey = Object.keys(newOptions).find(
      key => newOptions[key as keyof DisplayOptions] !== options[key as keyof DisplayOptions]
    ) as keyof DisplayOptions | undefined;
    
    if (changedKey) {
      const newValue = newOptions[changedKey];
      setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${changedKey} = ${newValue}`]);
    }
    setOptions(newOptions);
  };

  const handleReset = () => {
    setOptions(DEFAULT_OPTIONS);
    setLogs([]);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Display Toggles</h2>
        <p className={`${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
          Toggle buttons for controlling display options in the Builder canvas.
          Controls visibility of ports, data flow, error flow, outputs, and descriptions.
        </p>
      </div>

      {/* Preview */}
      <div className={`rounded-xl border overflow-hidden ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-gray-200 bg-white'}`}>
        <div className={`px-4 py-3 border-b flex items-center justify-between ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-100 bg-gray-50'}`}>
          <div>
            <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Preview</h3>
            <p className={`text-sm mt-0.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              Toggle options to see state changes
            </p>
          </div>
          <button
            onClick={handleReset}
            className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
              isDark
                ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
            }`}
          >
            Reset
          </button>
        </div>
        
        <div className={`p-6 space-y-6 ${isDark ? 'bg-slate-900/50' : 'bg-gray-50/50'}`}>
          {/* Default Toggles */}
          <div>
            <h4 className={`text-xs uppercase font-semibold mb-3 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
              Full Toggles (with labels)
            </h4>
            <DisplayToggles
              options={options}
              onChange={handleChange}
              isDark={isDark}
            />
          </div>

          {/* Compact Mode */}
          <div>
            <h4 className={`text-xs uppercase font-semibold mb-3 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
              Compact Mode (icons only)
            </h4>
            <DisplayToggles
              options={options}
              onChange={handleChange}
              isDark={isDark}
              compact={true}
            />
          </div>

          {/* Single Toggle */}
          <div>
            <h4 className={`text-xs uppercase font-semibold mb-3 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
              Individual Toggle
            </h4>
            <DisplayToggle
              label="Auto Layout"
              checked={singleToggle}
              onChange={setSingleToggle}
              isDark={isDark}
              activeColor="text-emerald-500"
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                </svg>
              }
            />
          </div>

          {/* Current State */}
          <div>
            <h4 className={`text-xs uppercase font-semibold mb-3 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
              Current State
            </h4>
            <div className={`p-3 rounded-lg font-mono text-xs ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-gray-100 text-gray-700'}`}>
              <pre>{JSON.stringify(options, null, 2)}</pre>
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
          <div className={`px-4 py-3 max-h-24 overflow-y-auto ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
            {logs.length === 0 ? (
              <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                Click toggle buttons to see state changes.
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

      {/* Option Descriptions */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className={`p-4 rounded-lg border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
          <h4 className={`font-semibold mb-2 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Ports
          </h4>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Show input/output connection points on step nodes
          </p>
        </div>
        
        <div className={`p-4 rounded-lg border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
          <h4 className={`font-semibold mb-2 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <svg className="w-5 h-5 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
            </svg>
            Data Flow
          </h4>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Show dashed lines for data dependencies between steps
          </p>
        </div>
        
        <div className={`p-4 rounded-lg border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
          <h4 className={`font-semibold mb-2 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Error Flow
          </h4>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Show red edges for onFailure connections and error handlers
          </p>
        </div>
        
        <div className={`p-4 rounded-lg border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
          <h4 className={`font-semibold mb-2 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Outputs
          </h4>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Show step outputs inline on the node cards
          </p>
        </div>
        
        <div className={`p-4 rounded-lg border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
          <h4 className={`font-semibold mb-2 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
            </svg>
            Descriptions
          </h4>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Show step descriptions on the canvas nodes
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
              Toolbar Integration
            </h4>
            <p className={`text-sm ${isDark ? 'text-indigo-200/80' : 'text-indigo-700'}`}>
              These toggles are placed in the Builder Toolbar above the canvas. They control 
              what visual elements are rendered on the React Flow canvas. The state is 
              typically stored in the BuilderContext.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
