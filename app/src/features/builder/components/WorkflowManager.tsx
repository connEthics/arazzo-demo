'use client';

import { useState } from 'react';
import { useBuilder } from '../context/BuilderContext';
import { LayoutIcon } from './icons';

interface WorkflowManagerProps {
  selectedWorkflowIndex: number;
  onWorkflowChange: (index: number) => void;
}

export default function WorkflowManager({ selectedWorkflowIndex, onWorkflowChange }: WorkflowManagerProps) {
  const { state, dispatch } = useBuilder();
  const [isCreating, setIsCreating] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [newWorkflowId, setNewWorkflowId] = useState('');

  const currentWorkflow = state.spec.workflows[selectedWorkflowIndex];
  const stepCount = currentWorkflow?.steps?.length || 0;

  const handleCreateWorkflow = () => {
    if (!newWorkflowId.trim()) return;

    const workflowCount = state.spec.workflows.length;
    dispatch({
      type: 'ADD_WORKFLOW',
      payload: {
        workflow: {
          workflowId: newWorkflowId.trim(),
          summary: newWorkflowId.trim(),
          steps: []
        }
      }
    });

    // Switch to the new workflow
    onWorkflowChange(workflowCount);
    setIsCreating(false);
    setNewWorkflowId('');
  };

  const handleRenameWorkflow = () => {
    if (!newWorkflowId.trim() || !currentWorkflow) return;

    dispatch({
      type: 'RENAME_WORKFLOW',
      payload: {
        oldWorkflowId: currentWorkflow.workflowId,
        newWorkflowId: newWorkflowId.trim()
      }
    });

    setIsRenaming(false);
    setNewWorkflowId('');
  };

  const handleDeleteWorkflow = () => {
    if (state.spec.workflows.length <= 1) {
      alert('Cannot delete the last workflow');
      return;
    }

    if (!confirm(`Are you sure you want to delete workflow "${currentWorkflow.workflowId}"?`)) {
      return;
    }

    dispatch({
      type: 'DELETE_WORKFLOW',
      payload: { workflowId: currentWorkflow.workflowId }
    });

    // Switch to previous workflow or first one
    const newIndex = selectedWorkflowIndex > 0 ? selectedWorkflowIndex - 1 : 0;
    onWorkflowChange(newIndex);
  };

  return (
    <div className="flex items-center gap-1">
      <div className="relative group/manager">
        {/* Main Selector / Input Area */}
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${isCreating || isRenaming
            ? 'border-indigo-500 ring-1 ring-indigo-500 bg-white dark:bg-slate-800'
            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          style={{ minWidth: '200px' }}
        >
          <span className="text-purple-600 dark:text-purple-400 shrink-0">
            <LayoutIcon />
          </span>

          {isCreating || isRenaming ? (
            <input
              type="text"
              value={newWorkflowId}
              onChange={(e) => setNewWorkflowId(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  isCreating ? handleCreateWorkflow() : handleRenameWorkflow();
                } else if (e.key === 'Escape') {
                  setIsCreating(false);
                  setIsRenaming(false);
                  setNewWorkflowId('');
                }
              }}
              className="flex-1 min-w-0 bg-transparent text-sm focus:outline-none text-slate-900 dark:text-slate-100"
              placeholder={isCreating ? "New workflow name..." : "Workflow name..."}
              autoFocus
            />
          ) : (
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="flex-1 flex items-center justify-between min-w-0 gap-2"
            >
              <span className="text-sm font-medium text-slate-700 dark:text-slate-100 truncate">
                {currentWorkflow?.workflowId || 'Select Workflow'}
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                {stepCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {stepCount}
                  </span>
                )}
                <svg className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>
          )}

          {/* Inline Action Buttons (Edit/Add/Confirm) */}
          <div className="flex items-center gap-0.5 ml-1 border-l border-slate-200 dark:border-slate-700 pl-1">
            {isCreating || isRenaming ? (
              <>
                <button
                  onClick={isCreating ? handleCreateWorkflow : handleRenameWorkflow}
                  className="p-1 rounded text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                  title="Confirm"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </button>
                <button
                  onClick={() => {
                    setIsCreating(false);
                    setIsRenaming(false);
                    setNewWorkflowId('');
                  }}
                  className="p-1 rounded text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="Cancel"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    setIsRenaming(true);
                    setNewWorkflowId(currentWorkflow?.workflowId || '');
                  }}
                  className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-opacity"
                  title="Rename"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => {
                    setIsCreating(true);
                    setNewWorkflowId(`workflow-${state.spec.workflows.length + 1}`);
                  }}
                  className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-opacity"
                  title="Add new"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Dropdown Menu */}
        {isOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
            <div className="absolute top-full left-0 mt-2 w-full min-w-[240px] p-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl z-20">
              {state.spec.workflows.map((wf, idx) => (
                <div
                  key={wf.workflowId}
                  className={`w-full flex items-center justify-between p-1 rounded-lg transition-colors group/item ${selectedWorkflowIndex === idx
                    ? 'bg-indigo-50 dark:bg-indigo-900/40'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                >
                  <button
                    onClick={() => {
                      onWorkflowChange(idx);
                      setIsOpen(false);
                    }}
                    className={`flex-1 flex items-center justify-between px-2 py-1.5 text-sm transition-colors min-w-0 ${selectedWorkflowIndex === idx
                      ? 'text-indigo-600 dark:text-indigo-400 font-medium'
                      : 'text-slate-600 dark:text-slate-400'
                      }`}
                  >
                    <span className="truncate mr-2">{wf.workflowId}</span>
                    <span className="text-[10px] opacity-60 whitespace-nowrap shrink-0">
                      {wf.steps?.length || 0} step{(wf.steps?.length || 0) !== 1 ? 's' : ''}
                    </span>
                  </button>

                  {state.spec.workflows.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Are you sure you want to delete workflow "${wf.workflowId}"?`)) {
                          dispatch({
                            type: 'DELETE_WORKFLOW',
                            payload: { workflowId: wf.workflowId }
                          });
                          if (selectedWorkflowIndex === idx) {
                            onWorkflowChange(0);
                          } else if (selectedWorkflowIndex > idx) {
                            onWorkflowChange(selectedWorkflowIndex - 1);
                          }
                        }
                      }}
                      className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-500 opacity-0 group-hover/item:opacity-100 transition-all"
                      title="Delete workflow"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
