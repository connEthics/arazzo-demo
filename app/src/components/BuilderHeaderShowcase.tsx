'use client';

import { useState } from 'react';
import BuilderHeader from './BuilderHeader';
import { ViewMode } from './ViewModeSelector';
import { WorkflowSelectorItem } from './WorkflowSelector';

interface BuilderHeaderShowcaseProps {
  isDark: boolean;
}

const SAMPLE_WORKFLOWS: WorkflowSelectorItem[] = [
  { id: 'pet-adoption', name: 'Pet Adoption', stepCount: 5, hasInputs: true, hasOutputs: true },
  { id: 'user-auth', name: 'User Authentication', stepCount: 3, hasInputs: true, hasOutputs: true },
  { id: 'order-checkout', name: 'Order Checkout', stepCount: 8, hasInputs: true, hasOutputs: true },
];

export default function BuilderHeaderShowcase({ isDark: initialDark }: BuilderHeaderShowcaseProps) {
  const [isDark, setIsDark] = useState(initialDark);
  const [viewMode, setViewMode] = useState<ViewMode>('builder');
  const [workflows, setWorkflows] = useState<WorkflowSelectorItem[]>(SAMPLE_WORKFLOWS);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>('pet-adoption');
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const handleWorkflowAdd = () => {
    const newId = `workflow-${Date.now()}`;
    const newWorkflow: WorkflowSelectorItem = {
      id: newId,
      name: `New Workflow ${workflows.length + 1}`,
      stepCount: 0,
    };
    setWorkflows(prev => [...prev, newWorkflow]);
    setSelectedWorkflowId(newId);
    addLog(`Created workflow: ${newWorkflow.name}`);
  };

  const handleWorkflowRename = (workflowId: string, newName: string) => {
    setWorkflows(prev => prev.map(w => 
      w.id === workflowId ? { ...w, name: newName } : w
    ));
    addLog(`Renamed workflow to: ${newName}`);
  };

  const handleWorkflowDelete = (workflowId: string) => {
    const workflow = workflows.find(w => w.id === workflowId);
    setWorkflows(prev => prev.filter(w => w.id !== workflowId));
    if (selectedWorkflowId === workflowId) {
      const remaining = workflows.filter(w => w.id !== workflowId);
      setSelectedWorkflowId(remaining[0]?.id || null);
    }
    addLog(`Deleted workflow: ${workflow?.name}`);
  };

  const handleReset = () => {
    setWorkflows(SAMPLE_WORKFLOWS);
    setSelectedWorkflowId('pet-adoption');
    setViewMode('builder');
    setLogs([]);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Builder Header</h2>
        <p className={`${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
          Complete header bar combining all controls: navigation, workflow selector, 
          view mode selector, display toggles, and theme toggle. Responsive with mobile menu.
        </p>
      </div>

      {/* Preview */}
      <div className={`rounded-xl border overflow-hidden ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-gray-200 bg-white'}`}>
        <div className={`px-4 py-3 border-b flex items-center justify-between ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-100 bg-gray-50'}`}>
          <div>
            <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Preview</h3>
            <p className={`text-sm mt-0.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              Interactive header - try all the controls
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
        
        {/* Full-width header preview */}
        <div className={`${isDark ? 'bg-slate-950' : 'bg-gray-50'}`}>
          <BuilderHeader
            onBack={() => addLog('Back clicked')}
            viewMode={viewMode}
            onViewModeChange={(mode) => {
              setViewMode(mode);
              addLog(`View mode: ${mode}`);
            }}
            workflows={workflows}
            selectedWorkflowId={selectedWorkflowId}
            onWorkflowSelect={(id) => {
              setSelectedWorkflowId(id);
              const workflow = workflows.find(w => w.id === id);
              addLog(`Selected: ${workflow?.name}`);
            }}
            onWorkflowAdd={handleWorkflowAdd}
            onWorkflowRename={handleWorkflowRename}
            onWorkflowDelete={handleWorkflowDelete}
            isDark={isDark}
            onThemeToggle={() => {
              setIsDark(!isDark);
              addLog(`Theme: ${!isDark ? 'dark' : 'light'}`);
            }}
          />

          {/* Simulated content area */}
          <div className={`h-48 flex items-center justify-center border-t ${isDark ? 'border-slate-800 text-slate-600' : 'border-gray-200 text-gray-400'}`}>
            <div className="text-center">
              <p className="text-sm font-medium">Content Area</p>
              <p className="text-xs mt-1">
                Mode: <span className="font-mono">{viewMode}</span>
              </p>
              <p className="text-xs">
                Workflow: <span className="font-mono">{selectedWorkflowId}</span>
              </p>
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
                Interact with the header to see activity.
              </p>
            ) : (
              <div className="space-y-1">
                {logs.slice(-8).map((log, idx) => (
                  <div key={idx} className={`text-xs font-mono ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                    {log}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`p-4 rounded-lg border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
          <h4 className={`font-semibold mb-2 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
            </svg>
            Workflow Selector
          </h4>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Switch, add, rename, and delete workflows
          </p>
        </div>
        
        <div className={`p-4 rounded-lg border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
          <h4 className={`font-semibold mb-2 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            View Modes
          </h4>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Documentation, Builder, Flowchart, Sequence
          </p>
        </div>
        
        <div className={`p-4 rounded-lg border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
          <h4 className={`font-semibold mb-2 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5z" />
            </svg>
            Canvas Toolbar
          </h4>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Display options moved to canvas for context
          </p>
        </div>
        
        <div className={`p-4 rounded-lg border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
          <h4 className={`font-semibold mb-2 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Responsive
          </h4>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Mobile menu with all controls accessible
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
              Header + Canvas Toolbar
            </h4>
            <p className={`text-sm ${isDark ? 'text-indigo-200/80' : 'text-indigo-700'}`}>
              This header component handles navigation, workflow selection, and view mode switching.
              Display options have been moved to the CanvasToolbar component for better context - 
              they only apply in Builder mode and should be easily accessible while working on the canvas.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
