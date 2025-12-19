'use client';

import { useState } from 'react';
import { Badge } from './primitives';

export interface Action {
  name?: string;
  type: 'goto' | 'retry' | 'end';
  stepId?: string;
  workflowId?: string;
  retryAfter?: number;
  retryLimit?: number;
}

interface ActionFormEditorProps {
  actions: Action[];
  onChange: (actions: Action[]) => void;
  variant: 'success' | 'failure';
  isDark?: boolean;
  readOnly?: boolean;
  availableSteps?: string[];
  availableWorkflows?: string[];
}

/**
 * Editor for onSuccess/onFailure action arrays.
 * Supports goto, retry, and end action types.
 */
export default function ActionFormEditor({
  actions,
  onChange,
  variant,
  isDark = false,
  readOnly = false,
  availableSteps = [],
  availableWorkflows = [],
}: ActionFormEditorProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState<Action>({ type: 'goto' });

  const isSuccess = variant === 'success';
  const colorClass = isSuccess 
    ? isDark ? 'text-emerald-400' : 'text-emerald-600'
    : isDark ? 'text-red-400' : 'text-red-600';
  const bgClass = isSuccess
    ? isDark ? 'bg-emerald-500/10' : 'bg-emerald-50'
    : isDark ? 'bg-red-500/10' : 'bg-red-50';

  const handleAdd = () => {
    setFormData({ type: 'goto' });
    setEditingIndex(null);
    setShowAddForm(true);
  };

  const handleEdit = (index: number) => {
    setFormData({ ...actions[index] });
    setEditingIndex(index);
    setShowAddForm(true);
  };

  const handleDelete = (index: number) => {
    const newActions = [...actions];
    newActions.splice(index, 1);
    onChange(newActions);
  };

  const handleSave = () => {
    if (editingIndex !== null) {
      const newActions = [...actions];
      newActions[editingIndex] = formData;
      onChange(newActions);
    } else {
      onChange([...actions, formData]);
    }
    setShowAddForm(false);
    setEditingIndex(null);
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setEditingIndex(null);
  };

  const getActionIcon = (type: Action['type']) => {
    switch (type) {
      case 'goto':
        return (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        );
      case 'retry':
        return (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        );
      case 'end':
        return (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
          </svg>
        );
    }
  };

  const getActionLabel = (action: Action) => {
    switch (action.type) {
      case 'goto':
        return action.stepId 
          ? `Go to step: ${action.stepId}` 
          : action.workflowId 
            ? `Go to workflow: ${action.workflowId}`
            : 'Go to...';
      case 'retry':
        return action.retryLimit 
          ? `Retry ${action.retryLimit}x after ${action.retryAfter || 0}s`
          : 'Retry';
      case 'end':
        return 'End workflow';
    }
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-5 h-5 rounded flex items-center justify-center ${bgClass}`}>
            {isSuccess ? (
              <svg className={`w-3 h-3 ${colorClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className={`w-3 h-3 ${colorClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </div>
          <span className={`text-xs font-semibold uppercase ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            On {isSuccess ? 'Success' : 'Failure'}
          </span>
          {actions.length > 0 && (
            <span className={`text-xs px-1.5 py-0.5 rounded ${isDark ? 'bg-slate-700 text-slate-400' : 'bg-gray-100 text-gray-500'}`}>
              {actions.length}
            </span>
          )}
        </div>
        {!readOnly && !showAddForm && (
          <button
            onClick={handleAdd}
            className={`text-xs font-medium ${isDark ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'}`}
          >
            + Add Action
          </button>
        )}
      </div>

      {/* Actions list */}
      {actions.length > 0 ? (
        <div className="space-y-2">
          {actions.map((action, idx) => (
            <div
              key={idx}
              className={`group p-3 rounded-lg border transition-colors ${
                isDark 
                  ? 'border-slate-700 bg-slate-800 hover:border-slate-600' 
                  : 'border-gray-200 bg-gray-50 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={action.type === 'goto' ? 'info' : action.type === 'retry' ? 'warning' : 'step'} 
                    isDark={isDark} 
                    size="xs"
                  >
                    <span className="flex items-center gap-1">
                      {getActionIcon(action.type)}
                      {action.type}
                    </span>
                  </Badge>
                  <span className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                    {getActionLabel(action)}
                  </span>
                </div>
                {!readOnly && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEdit(idx)}
                      className={`p-1 rounded ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-200 text-gray-400'}`}
                      title="Edit"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(idx)}
                      className={`p-1 rounded ${isDark ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-red-100 text-red-500'}`}
                      title="Delete"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
              {action.name && (
                <p className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                  Name: {action.name}
                </p>
              )}
            </div>
          ))}
        </div>
      ) : !showAddForm && (
        <p className={`text-xs italic pl-7 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
          {isSuccess ? 'Continue to next step' : 'End workflow'}
        </p>
      )}

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className={`p-4 rounded-lg border ${isDark ? 'border-indigo-500/30 bg-indigo-500/10' : 'border-indigo-200 bg-indigo-50'}`}>
          <h5 className={`text-xs font-semibold uppercase mb-3 ${isDark ? 'text-indigo-300' : 'text-indigo-700'}`}>
            {editingIndex !== null ? 'Edit Action' : 'Add Action'}
          </h5>

          {/* Action Type */}
          <div className="mb-3">
            <label className={`block text-xs mb-1.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              Type
            </label>
            <div className="flex gap-2">
              {(['goto', 'retry', 'end'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setFormData({ ...formData, type, stepId: undefined, workflowId: undefined, retryAfter: undefined, retryLimit: undefined })}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    formData.type === type
                      ? 'bg-indigo-600 text-white'
                      : isDark
                        ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                        : 'bg-white hover:bg-gray-100 text-gray-600 border border-gray-200'
                  }`}
                >
                  {getActionIcon(type)}
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Name (optional) */}
          <div className="mb-3">
            <label className={`block text-xs mb-1.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              Name (optional)
            </label>
            <input
              type="text"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value || undefined })}
              placeholder="e.g., retryOnTimeout"
              className={`w-full px-3 py-2 rounded-lg text-sm border ${
                isDark
                  ? 'bg-slate-800 border-slate-600 text-white placeholder-slate-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
              }`}
            />
          </div>

          {/* Type-specific fields */}
          {formData.type === 'goto' && (
            <div className="mb-3">
              <label className={`block text-xs mb-1.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                Target Step
              </label>
              {availableSteps.length > 0 ? (
                <select
                  value={formData.stepId || ''}
                  onChange={(e) => setFormData({ ...formData, stepId: e.target.value || undefined })}
                  className={`w-full px-3 py-2 rounded-lg text-sm border ${
                    isDark
                      ? 'bg-slate-800 border-slate-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="">Select a step...</option>
                  {availableSteps.map((step) => (
                    <option key={step} value={step}>{step}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={formData.stepId || ''}
                  onChange={(e) => setFormData({ ...formData, stepId: e.target.value || undefined })}
                  placeholder="step-id"
                  className={`w-full px-3 py-2 rounded-lg text-sm font-mono border ${
                    isDark
                      ? 'bg-slate-800 border-slate-600 text-white placeholder-slate-500'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                  }`}
                />
              )}
            </div>
          )}

          {formData.type === 'retry' && (
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className={`block text-xs mb-1.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  Retry After (seconds)
                </label>
                <input
                  type="number"
                  value={formData.retryAfter || ''}
                  onChange={(e) => setFormData({ ...formData, retryAfter: parseInt(e.target.value) || undefined })}
                  placeholder="5"
                  min="0"
                  className={`w-full px-3 py-2 rounded-lg text-sm border ${
                    isDark
                      ? 'bg-slate-800 border-slate-600 text-white placeholder-slate-500'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                  }`}
                />
              </div>
              <div>
                <label className={`block text-xs mb-1.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  Retry Limit
                </label>
                <input
                  type="number"
                  value={formData.retryLimit || ''}
                  onChange={(e) => setFormData({ ...formData, retryLimit: parseInt(e.target.value) || undefined })}
                  placeholder="3"
                  min="1"
                  className={`w-full px-3 py-2 rounded-lg text-sm border ${
                    isDark
                      ? 'bg-slate-800 border-slate-600 text-white placeholder-slate-500'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                  }`}
                />
              </div>
            </div>
          )}

          {formData.type === 'end' && (
            <p className={`text-xs mb-3 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              This will end the workflow execution.
            </p>
          )}

          {/* Form buttons */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleSave}
              disabled={formData.type === 'goto' && !formData.stepId && !formData.workflowId}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                formData.type === 'goto' && !formData.stepId && !formData.workflowId
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white'
              }`}
            >
              {editingIndex !== null ? 'Update' : 'Add'}
            </button>
            <button
              onClick={handleCancel}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isDark
                  ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
