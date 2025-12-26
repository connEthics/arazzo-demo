'use client';

import { useState } from 'react';
import { BuilderProvider } from '@/features/builder/context/BuilderContext';
import WorkflowManager from '@/features/builder/components/WorkflowManager';

// Wrapper component that provides BuilderContext with sample data
function WorkflowManagerDemo({ isDark, onLog }: { isDark: boolean; onLog: (message: string) => void }) {
  const [selectedWorkflowIndex, setSelectedWorkflowIndex] = useState(0);

  const handleWorkflowChange = (index: number) => {
    setSelectedWorkflowIndex(index);
    onLog(`📋 Selected workflow index: ${index}`);
  };

  return (
    <WorkflowManager 
      selectedWorkflowIndex={selectedWorkflowIndex}
      onWorkflowChange={handleWorkflowChange}
    />
  );
}

interface WorkflowManagerShowcaseProps {
  isDark: boolean;
}

export default function WorkflowManagerShowcase({ isDark }: WorkflowManagerShowcaseProps) {
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">WorkflowManager</h2>
        <p className={`${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
          Interface to create, rename, and delete workflows.
          Manages workflow list with validation and deletion confirmation.
        </p>
      </div>

      {/* Preview */}
      <div className={`rounded-xl border overflow-hidden ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-gray-200 bg-white'}`}>
        <div className={`px-4 py-3 border-b ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-100 bg-gray-50'}`}>
          <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Preview</h3>
          <p className={`text-sm mt-0.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Uses BuilderContext • Interactive Create/Rename/Delete
          </p>
        </div>
        
        <div className={`p-6 ${isDark ? 'bg-slate-900/50' : 'bg-gray-50/50'}`}>
          <BuilderProvider>
            <WorkflowManagerDemo isDark={isDark} onLog={addLog} />
          </BuilderProvider>
        </div>

        {/* Activity Log */}
        <div className={`border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
          <div className={`px-4 py-2 border-b ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-gray-200 bg-gray-50'}`}>
            <h4 className={`text-xs font-semibold uppercase ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              Activity Log
            </h4>
          </div>
          <div className={`px-4 py-3 max-h-40 overflow-y-auto ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
            {logs.length === 0 ? (
              <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                No activity yet. Try creating, renaming, or deleting a workflow.
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Inline Creation
          </h4>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Inline form appears on "+ New Workflow" click
          </p>
        </div>
        
        <div className={`p-4 rounded-lg border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
          <h4 className={`font-semibold mb-2 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Click to Edit
          </h4>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Double-click on name to rename (workflowId + summary)
          </p>
        </div>
        
        <div className={`p-4 rounded-lg border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
          <h4 className={`font-semibold mb-2 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete Confirmation
          </h4>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Confirmation modal before permanent deletion
          </p>
        </div>
        
        <div className={`p-4 rounded-lg border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
          <h4 className={`font-semibold mb-2 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <svg className="w-5 h-5 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Validation
          </h4>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Prevents duplicate IDs and empty names
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
              Available Interactions
            </h4>
            <ul className={`text-sm space-y-1 ${isDark ? 'text-indigo-200/80' : 'text-indigo-700'}`}>
              <li>• Click "+ New Workflow" to create</li>
              <li>• Click on a workflow to select it</li>
              <li>• Double-click on name to rename</li>
              <li>• Click trash icon to delete</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
