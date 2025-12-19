'use client';

import { useState, useRef, useEffect } from 'react';

export interface WorkflowSelectorItem {
  id: string;
  name: string;
  stepCount?: number;
  hasInputs?: boolean;
  hasOutputs?: boolean;
}

interface WorkflowSelectorProps {
  workflows: WorkflowSelectorItem[];
  selectedWorkflowId: string | null;
  onSelect: (workflowId: string) => void;
  onAdd: () => void;
  onRename: (workflowId: string, newName: string) => void;
  onDelete?: (workflowId: string) => void;
  isDark?: boolean;
  disabled?: boolean;
}

/**
 * Dropdown selector for switching between workflows.
 * Includes actions to add new workflows and rename existing ones.
 */
export default function WorkflowSelector({
  workflows,
  selectedWorkflowId,
  onSelect,
  onAdd,
  onRename,
  onDelete,
  isDark = false,
  disabled = false,
}: WorkflowSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  const selectedWorkflow = workflows.find(w => w.id === selectedWorkflowId);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus rename input when renaming starts
  useEffect(() => {
    if (isRenaming && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [isRenaming]);

  const handleStartRename = () => {
    if (selectedWorkflow) {
      setRenameValue(selectedWorkflow.name);
      setIsRenaming(true);
    }
  };

  const handleFinishRename = () => {
    if (renameValue.trim() && selectedWorkflowId && renameValue !== selectedWorkflow?.name) {
      onRename(selectedWorkflowId, renameValue.trim());
    }
    setIsRenaming(false);
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleFinishRename();
    } else if (e.key === 'Escape') {
      setIsRenaming(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="flex items-center gap-1">
        {/* Main dropdown button */}
        {isRenaming ? (
          <input
            ref={renameInputRef}
            type="text"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={handleFinishRename}
            onKeyDown={handleRenameKeyDown}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
              isDark
                ? 'bg-slate-800 border-slate-600 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
            style={{ width: `${Math.max(renameValue.length * 8 + 40, 120)}px` }}
          />
        ) : (
          <button
            onClick={() => setIsOpen(!isOpen)}
            disabled={disabled}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              isDark
                ? 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-600'
                : 'bg-white hover:bg-gray-50 text-gray-900 border border-gray-300'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
            </svg>
            <span className="max-w-[150px] truncate">
              {selectedWorkflow?.name || 'Select workflow'}
            </span>
            {selectedWorkflow?.stepCount !== undefined && (
              <span className={`text-xs px-1.5 py-0.5 rounded ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-gray-100 text-gray-500'}`}>
                {selectedWorkflow.stepCount}
              </span>
            )}
            <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}

        {/* Rename button */}
        {!isRenaming && selectedWorkflow && (
          <button
            onClick={handleStartRename}
            disabled={disabled}
            className={`p-1.5 rounded-lg transition-colors ${
              isDark
                ? 'hover:bg-slate-700 text-slate-400 hover:text-white'
                : 'hover:bg-gray-100 text-gray-400 hover:text-gray-700'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            title="Rename workflow"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        )}

        {/* Add button */}
        <button
          onClick={onAdd}
          disabled={disabled}
          className={`p-1.5 rounded-lg transition-colors ${
            isDark
              ? 'hover:bg-slate-700 text-slate-400 hover:text-emerald-400'
              : 'hover:bg-gray-100 text-gray-400 hover:text-emerald-600'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          title="Add new workflow"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* Dropdown menu */}
      {isOpen && !isRenaming && (
        <div className={`absolute top-full left-0 mt-1 min-w-[200px] rounded-lg shadow-lg border z-50 ${
          isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
        }`}>
          <div className={`px-3 py-2 border-b ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
            <span className={`text-xs font-semibold uppercase ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
              Workflows ({workflows.length})
            </span>
          </div>
          
          <div className="max-h-64 overflow-y-auto">
            {workflows.map((workflow) => (
              <div
                key={workflow.id}
                onClick={() => {
                  onSelect(workflow.id);
                  setIsOpen(false);
                }}
                className={`group flex items-center justify-between px-3 py-2.5 cursor-pointer transition-colors ${
                  workflow.id === selectedWorkflowId
                    ? isDark
                      ? 'bg-indigo-600/20 text-indigo-300'
                      : 'bg-indigo-50 text-indigo-700'
                    : isDark
                      ? 'hover:bg-slate-700 text-white'
                      : 'hover:bg-gray-50 text-gray-900'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <svg className={`w-4 h-4 flex-shrink-0 ${
                    workflow.id === selectedWorkflowId ? 'text-purple-500' : isDark ? 'text-slate-500' : 'text-gray-400'
                  }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                  </svg>
                  <span className="truncate text-sm font-medium">{workflow.name}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  {workflow.stepCount !== undefined && (
                    <span className={`text-xs px-1.5 py-0.5 rounded ${isDark ? 'bg-slate-700 text-slate-400' : 'bg-gray-100 text-gray-500'}`}>
                      {workflow.stepCount} steps
                    </span>
                  )}
                  
                  {/* Indicators */}
                  <div className="flex items-center gap-1">
                    {workflow.hasInputs && (
                      <span className="text-emerald-500" title="Has inputs">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                        </svg>
                      </span>
                    )}
                    {workflow.hasOutputs && (
                      <span className="text-amber-500" title="Has outputs">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                      </span>
                    )}
                  </div>
                  
                  {/* Delete button */}
                  {onDelete && workflows.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(workflow.id);
                      }}
                      className={`p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
                        isDark
                          ? 'hover:bg-red-500/20 text-slate-400 hover:text-red-400'
                          : 'hover:bg-red-50 text-gray-400 hover:text-red-500'
                      }`}
                      title="Delete workflow"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Add new workflow option */}
          <div className={`border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
            <button
              onClick={() => {
                onAdd();
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm transition-colors ${
                isDark
                  ? 'text-emerald-400 hover:bg-slate-700'
                  : 'text-emerald-600 hover:bg-gray-50'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add new workflow
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
