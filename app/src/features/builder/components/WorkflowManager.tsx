'use client';

import { useState } from 'react';
import { useBuilder } from '../context/BuilderContext';

interface WorkflowManagerProps {
  selectedWorkflowIndex: number;
  onWorkflowChange: (index: number) => void;
}

export default function WorkflowManager({ selectedWorkflowIndex, onWorkflowChange }: WorkflowManagerProps) {
  const { state, dispatch } = useBuilder();
  const [isCreating, setIsCreating] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newWorkflowId, setNewWorkflowId] = useState('');
  
  const currentWorkflow = state.spec.workflows[selectedWorkflowIndex];

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
    <div className="flex items-center gap-2">
      {/* Workflow Selector */}
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
        <svg className="w-3.5 h-3.5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
        </svg>
        <select
          value={selectedWorkflowIndex}
          onChange={(e) => onWorkflowChange(Number(e.target.value))}
          className="bg-transparent text-xs font-medium focus:outline-none cursor-pointer max-w-[140px] truncate text-slate-900 dark:text-slate-100"
        >
          {state.spec.workflows.map((wf, idx) => (
            <option key={wf.workflowId} value={idx} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
              {wf.workflowId}
            </option>
          ))}
        </select>
      </div>

      {/* Create Workflow Button */}
      {!isCreating && !isRenaming && (
        <button
          onClick={() => {
            setIsCreating(true);
            setNewWorkflowId(`workflow-${state.spec.workflows.length + 1}`);
          }}
          className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Create new workflow"
        >
          <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      )}

      {/* Rename Workflow Button */}
      {!isCreating && !isRenaming && (
        <button
          onClick={() => {
            setIsRenaming(true);
            setNewWorkflowId(currentWorkflow?.workflowId || '');
          }}
          className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Rename workflow"
        >
          <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
      )}

      {/* Delete Workflow Button */}
      {!isCreating && !isRenaming && state.spec.workflows.length > 1 && (
        <button
          onClick={handleDeleteWorkflow}
          className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
          title="Delete workflow"
        >
          <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      )}

      {/* Create/Rename Input */}
      {(isCreating || isRenaming) && (
        <div className="flex items-center gap-1">
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
            className="px-2 py-1 text-xs border border-indigo-500 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            placeholder="Workflow ID"
            autoFocus
          />
          <button
            onClick={isCreating ? handleCreateWorkflow : handleRenameWorkflow}
            className="p-1 rounded bg-indigo-500 text-white hover:bg-indigo-600 transition-colors"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </button>
          <button
            onClick={() => {
              setIsCreating(false);
              setIsRenaming(false);
              setNewWorkflowId('');
            }}
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
