'use client';

import { useState } from 'react';
import WorkflowSelector, { WorkflowSelectorItem } from './WorkflowSelector';

interface WorkflowSelectorShowcaseProps {
  isDark: boolean;
}

const INITIAL_WORKFLOWS: WorkflowSelectorItem[] = [
  { id: 'pet-adoption', name: 'Pet Adoption', stepCount: 5, hasInputs: true, hasOutputs: true },
  { id: 'user-auth', name: 'User Authentication', stepCount: 3, hasInputs: true, hasOutputs: true },
  { id: 'order-checkout', name: 'Order Checkout', stepCount: 8, hasInputs: true, hasOutputs: true },
];

export default function WorkflowSelectorShowcase({ isDark }: WorkflowSelectorShowcaseProps) {
  const [workflows, setWorkflows] = useState<WorkflowSelectorItem[]>(INITIAL_WORKFLOWS);
  const [selectedId, setSelectedId] = useState<string | null>('pet-adoption');
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const handleSelect = (workflowId: string) => {
    setSelectedId(workflowId);
    const workflow = workflows.find(w => w.id === workflowId);
    addLog(`Selected: ${workflow?.name || workflowId}`);
  };

  const handleAdd = () => {
    const newId = `workflow-${Date.now()}`;
    const newWorkflow: WorkflowSelectorItem = {
      id: newId,
      name: `New Workflow ${workflows.length + 1}`,
      stepCount: 0,
      hasInputs: false,
      hasOutputs: false,
    };
    setWorkflows(prev => [...prev, newWorkflow]);
    setSelectedId(newId);
    addLog(`Created: ${newWorkflow.name}`);
  };

  const handleRename = (workflowId: string, newName: string) => {
    setWorkflows(prev => prev.map(w => 
      w.id === workflowId ? { ...w, name: newName } : w
    ));
    addLog(`Renamed to: ${newName}`);
  };

  const handleDelete = (workflowId: string) => {
    const workflow = workflows.find(w => w.id === workflowId);
    setWorkflows(prev => prev.filter(w => w.id !== workflowId));
    if (selectedId === workflowId) {
      const remaining = workflows.filter(w => w.id !== workflowId);
      setSelectedId(remaining[0]?.id || null);
    }
    addLog(`Deleted: ${workflow?.name || workflowId}`);
  };

  const handleReset = () => {
    setWorkflows(INITIAL_WORKFLOWS);
    setSelectedId('pet-adoption');
    setLogs([]);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Workflow Selector</h2>
        <p className={`${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
          Dropdown selector for switching between workflows. Located in the Builder header.
          Includes actions to add, rename, and delete workflows.
        </p>
      </div>

      {/* Preview */}
      <div className={`rounded-xl border overflow-hidden ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-gray-200 bg-white'}`}>
        <div className={`px-4 py-3 border-b flex items-center justify-between ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-100 bg-gray-50'}`}>
          <div>
            <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Preview</h3>
            <p className={`text-sm mt-0.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              Click to open dropdown, use icons to rename/add
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
        
        <div className={`p-6 ${isDark ? 'bg-slate-900/50' : 'bg-gray-50/50'}`}>
          {/* Simulated Header */}
          <div className={`p-4 rounded-lg border mb-4 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
            <div className="flex items-center gap-4">
              <h4 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Arazzo Builder
              </h4>
              <div className={`w-px h-6 ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
              <WorkflowSelector
                workflows={workflows}
                selectedWorkflowId={selectedId}
                onSelect={handleSelect}
                onAdd={handleAdd}
                onRename={handleRename}
                onDelete={handleDelete}
                isDark={isDark}
              />
            </div>
          </div>

          {/* Current State */}
          <div className={`p-4 rounded-lg ${isDark ? 'bg-slate-800' : 'bg-gray-100'}`}>
            <h5 className={`text-xs font-semibold uppercase mb-2 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
              Current State
            </h5>
            <div className={`text-sm space-y-1 ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
              <p><strong>Selected:</strong> {selectedId || 'none'}</p>
              <p><strong>Total workflows:</strong> {workflows.length}</p>
            </div>
          </div>
        </div>

        {/* Workflow List */}
        <div className={`border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
          <div className={`px-4 py-2 border-b ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-gray-200 bg-gray-50'}`}>
            <h4 className={`text-xs font-semibold uppercase ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              Workflows ({workflows.length})
            </h4>
          </div>
          <div className={`px-4 py-3 ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
            <div className="flex flex-wrap gap-2">
              {workflows.map((w) => (
                <span
                  key={w.id}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${
                    w.id === selectedId
                      ? isDark
                        ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/50'
                        : 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                      : isDark
                        ? 'bg-slate-800 text-slate-300'
                        : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {w.name}
                  <span className={`${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                    ({w.stepCount})
                  </span>
                </span>
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
          <div className={`px-4 py-3 max-h-24 overflow-y-auto ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
            {logs.length === 0 ? (
              <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                Interact with the selector to see activity.
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

      {/* Features */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className={`p-4 rounded-lg border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
          <h4 className={`font-semibold mb-2 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
            </svg>
            Quick Switch
          </h4>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Dropdown menu to quickly switch between workflows in the spec
          </p>
        </div>
        
        <div className={`p-4 rounded-lg border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
          <h4 className={`font-semibold mb-2 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Inline Rename
          </h4>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Click the pencil icon to rename the current workflow inline
          </p>
        </div>
        
        <div className={`p-4 rounded-lg border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
          <h4 className={`font-semibold mb-2 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Workflow
          </h4>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Create new workflows directly from the header
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
              This selector is placed in the Builder header next to the title. 
              When a workflow is selected, the canvas and inspector update to show 
              that workflow&apos;s steps. Changes are synced to the BuilderContext state.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
