'use client';

import { useState } from 'react';
import ExpressionAutocompleteStandalone from './ExpressionAutocompleteStandalone';

interface ExpressionAutocompleteShowcaseProps {
  isDark: boolean;
}

export default function ExpressionAutocompleteShowcase({ isDark }: ExpressionAutocompleteShowcaseProps) {
  const [value1, setValue1] = useState('');
  const [value2, setValue2] = useState('$steps.');
  const [value3, setValue3] = useState('$inputs.petType');
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (field: string, newValue: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${field} = "${newValue}"`]);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Expression Autocomplete</h2>
        <p className={`${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
          Input field with autocomplete for Arazzo runtime expressions. Suggests step outputs, 
          workflow inputs, and context values. Type &quot;$&quot; to trigger suggestions.
        </p>
      </div>

      {/* Preview */}
      <div className={`rounded-xl border overflow-hidden ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-gray-200 bg-white'}`}>
        <div className={`px-4 py-3 border-b ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-100 bg-gray-50'}`}>
          <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Preview</h3>
          <p className={`text-sm mt-0.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Type &quot;$&quot; to see autocomplete suggestions
          </p>
        </div>
        
        <div className={`p-6 space-y-6 ${isDark ? 'bg-slate-900/50' : 'bg-gray-50/50'}`}>
          {/* Empty Input */}
          <div>
            <label className={`block text-xs font-medium mb-2 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              Empty Input (type $ to start)
            </label>
            <ExpressionAutocompleteStandalone
              value={value1}
              onChange={(v) => {
                setValue1(v);
                addLog('field1', v);
              }}
              placeholder="$steps.stepId.outputs.key"
              isDark={isDark}
            />
          </div>

          {/* Partially filled */}
          <div>
            <label className={`block text-xs font-medium mb-2 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              Partially Filled (filtering suggestions)
            </label>
            <ExpressionAutocompleteStandalone
              value={value2}
              onChange={(v) => {
                setValue2(v);
                addLog('field2', v);
              }}
              isDark={isDark}
            />
          </div>

          {/* Completed expression */}
          <div>
            <label className={`block text-xs font-medium mb-2 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              Completed Expression
            </label>
            <ExpressionAutocompleteStandalone
              value={value3}
              onChange={(v) => {
                setValue3(v);
                addLog('field3', v);
              }}
              isDark={isDark}
            />
          </div>

          {/* Disabled state */}
          <div>
            <label className={`block text-xs font-medium mb-2 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              Disabled State
            </label>
            <ExpressionAutocompleteStandalone
              value="$steps.find-pets.outputs.availablePets"
              onChange={() => {}}
              isDark={isDark}
              disabled={true}
            />
          </div>
        </div>

        {/* Activity Log */}
        <div className={`border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
          <div className={`px-4 py-2 border-b ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-gray-200 bg-gray-50'}`}>
            <h4 className={`text-xs font-semibold uppercase ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              Value Changes
            </h4>
          </div>
          <div className={`px-4 py-3 max-h-24 overflow-y-auto ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
            {logs.length === 0 ? (
              <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                Type in the inputs to see value changes.
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

      {/* Expression Types */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className={`p-4 rounded-lg border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
          <h4 className={`font-semibold mb-2 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <span className="text-amber-500">📤</span>
            Step Outputs
          </h4>
          <p className={`text-sm mb-2 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Reference outputs from previous steps
          </p>
          <code className={`text-xs px-2 py-1 rounded block ${isDark ? 'bg-slate-900 text-amber-400' : 'bg-gray-100 text-amber-600'}`}>
            $steps.stepId.outputs.key
          </code>
        </div>
        
        <div className={`p-4 rounded-lg border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
          <h4 className={`font-semibold mb-2 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <span className="text-emerald-500">📥</span>
            Workflow Inputs
          </h4>
          <p className={`text-sm mb-2 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Reference workflow input parameters
          </p>
          <code className={`text-xs px-2 py-1 rounded block ${isDark ? 'bg-slate-900 text-emerald-400' : 'bg-gray-100 text-emerald-600'}`}>
            $inputs.paramName
          </code>
        </div>
        
        <div className={`p-4 rounded-lg border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
          <h4 className={`font-semibold mb-2 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <span className="text-indigo-500">⚡</span>
            Context Values
          </h4>
          <p className={`text-sm mb-2 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Runtime context from the current step
          </p>
          <code className={`text-xs px-2 py-1 rounded block ${isDark ? 'bg-slate-900 text-indigo-400' : 'bg-gray-100 text-indigo-600'}`}>
            $statusCode, $response.body
          </code>
        </div>
      </div>

      {/* Keyboard Navigation */}
      <div className={`p-4 rounded-lg border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
        <h4 className={`font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Keyboard Navigation
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <kbd className={`px-2 py-1 rounded text-xs font-mono ${isDark ? 'bg-slate-700 text-white' : 'bg-gray-100 text-gray-700'}`}>↑↓</kbd>
            <span className={isDark ? 'text-slate-400' : 'text-gray-500'}>Navigate</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className={`px-2 py-1 rounded text-xs font-mono ${isDark ? 'bg-slate-700 text-white' : 'bg-gray-100 text-gray-700'}`}>Enter</kbd>
            <span className={isDark ? 'text-slate-400' : 'text-gray-500'}>Select</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className={`px-2 py-1 rounded text-xs font-mono ${isDark ? 'bg-slate-700 text-white' : 'bg-gray-100 text-gray-700'}`}>Tab</kbd>
            <span className={isDark ? 'text-slate-400' : 'text-gray-500'}>Complete</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className={`px-2 py-1 rounded text-xs font-mono ${isDark ? 'bg-slate-700 text-white' : 'bg-gray-100 text-gray-700'}`}>Esc</kbd>
            <span className={isDark ? 'text-slate-400' : 'text-gray-500'}>Close</span>
          </div>
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
              Inspector Integration
            </h4>
            <p className={`text-sm ${isDark ? 'text-indigo-200/80' : 'text-indigo-700'}`}>
              This autocomplete is used in the Step Inspector for configuring parameters 
              and output mappings. It reads available expressions from the BuilderContext 
              to provide context-aware suggestions based on the current workflow.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
