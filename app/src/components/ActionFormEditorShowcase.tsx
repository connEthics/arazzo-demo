'use client';

import { useState } from 'react';
import ActionFormEditor, { Action } from './ActionFormEditor';

interface ActionFormEditorShowcaseProps {
  isDark: boolean;
}

const SAMPLE_SUCCESS_ACTIONS: Action[] = [
  { name: 'goToSelectPet', type: 'goto', stepId: 'select-pet' },
];

const SAMPLE_FAILURE_ACTIONS: Action[] = [
  { name: 'retryOnError', type: 'retry', retryAfter: 5, retryLimit: 3 },
  { type: 'end' },
];

const AVAILABLE_STEPS = [
  'find-pets',
  'select-pet',
  'validate-stock',
  'place-order',
  'send-confirmation',
];

export default function ActionFormEditorShowcase({ isDark }: ActionFormEditorShowcaseProps) {
  const [successActions, setSuccessActions] = useState<Action[]>(SAMPLE_SUCCESS_ACTIONS);
  const [failureActions, setFailureActions] = useState<Action[]>(SAMPLE_FAILURE_ACTIONS);
  const [readOnly, setReadOnly] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev.slice(-9), `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Action Form Editor</h2>
        <p className={`${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
          Editor for onSuccess and onFailure action arrays.
          Supports goto, retry, and end action types with full CRUD operations.
        </p>
      </div>

      {/* Controls */}
      <div className={`flex flex-wrap gap-3 p-4 rounded-lg border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={readOnly}
            onChange={(e) => { setReadOnly(e.target.checked); addLog(`Mode: ${e.target.checked ? 'Read Only' : 'Edit'}`); }}
            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span className={`text-xs ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
            Read Only
          </span>
        </label>

        <div className={`w-px h-6 ${isDark ? 'bg-slate-600' : 'bg-gray-200'}`} />

        <button
          onClick={() => { setSuccessActions([]); setFailureActions([]); addLog('Cleared all actions'); }}
          className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
            isDark
              ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
          }`}
        >
          Clear All
        </button>

        <button
          onClick={() => { setSuccessActions(SAMPLE_SUCCESS_ACTIONS); setFailureActions(SAMPLE_FAILURE_ACTIONS); addLog('Reset to defaults'); }}
          className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
            isDark
              ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
          }`}
        >
          Reset
        </button>
      </div>

      {/* Preview */}
      <div className={`rounded-xl border overflow-hidden ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
        <div className={`p-6 ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Success Actions */}
            <div className={`p-4 rounded-lg border ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-gray-200 bg-gray-50/50'}`}>
              <ActionFormEditor
                actions={successActions}
                onChange={(actions) => { setSuccessActions(actions); addLog(`Success: ${actions.length} action(s)`); }}
                variant="success"
                isDark={isDark}
                readOnly={readOnly}
                availableSteps={AVAILABLE_STEPS}
              />
            </div>

            {/* Failure Actions */}
            <div className={`p-4 rounded-lg border ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-gray-200 bg-gray-50/50'}`}>
              <ActionFormEditor
                actions={failureActions}
                onChange={(actions) => { setFailureActions(actions); addLog(`Failure: ${actions.length} action(s)`); }}
                variant="failure"
                isDark={isDark}
                readOnly={readOnly}
                availableSteps={AVAILABLE_STEPS}
              />
            </div>
          </div>
        </div>

        {/* Activity Log */}
        <div className={`border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
          <div className={`px-4 py-3 ${isDark ? 'bg-slate-950' : 'bg-gray-50'}`}>
            <h4 className={`text-xs font-semibold uppercase mb-2 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              Activity Log
            </h4>
            <div className="h-20 overflow-y-auto space-y-1">
              {logs.length === 0 ? (
                <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                  Try adding, editing, or removing actions...
                </p>
              ) : (
                logs.map((log, idx) => (
                  <div key={idx} className={`text-xs font-mono ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action Types */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className={`p-4 rounded-lg border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
          <div className="flex items-center gap-2 mb-2">
            <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? 'bg-indigo-500/20' : 'bg-indigo-100'}`}>
              <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </span>
            <h4 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              goto
            </h4>
          </div>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Jump to another step or workflow. Requires a target stepId or workflowId.
          </p>
        </div>

        <div className={`p-4 rounded-lg border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
          <div className="flex items-center gap-2 mb-2">
            <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? 'bg-amber-500/20' : 'bg-amber-100'}`}>
              <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </span>
            <h4 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              retry
            </h4>
          </div>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Retry the current step after a delay. Configure retryAfter (seconds) and retryLimit.
          </p>
        </div>

        <div className={`p-4 rounded-lg border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
          <div className="flex items-center gap-2 mb-2">
            <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? 'bg-slate-500/20' : 'bg-gray-100'}`}>
              <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
              </svg>
            </span>
            <h4 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              end
            </h4>
          </div>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Immediately end workflow execution. No additional configuration needed.
          </p>
        </div>
      </div>

      {/* Current State */}
      <div className={`p-4 rounded-lg border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
        <h4 className={`font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Current State (JSON)
        </h4>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <h5 className={`text-xs font-semibold uppercase mb-2 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
              onSuccess
            </h5>
            <pre className={`text-xs font-mono p-3 rounded-lg overflow-auto ${isDark ? 'bg-slate-900 text-slate-300' : 'bg-gray-100 text-gray-700'}`}>
              {JSON.stringify(successActions, null, 2) || '[]'}
            </pre>
          </div>
          <div>
            <h5 className={`text-xs font-semibold uppercase mb-2 ${isDark ? 'text-red-400' : 'text-red-600'}`}>
              onFailure
            </h5>
            <pre className={`text-xs font-mono p-3 rounded-lg overflow-auto ${isDark ? 'bg-slate-900 text-slate-300' : 'bg-gray-100 text-gray-700'}`}>
              {JSON.stringify(failureActions, null, 2) || '[]'}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
