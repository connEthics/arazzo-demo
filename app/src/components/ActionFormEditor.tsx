'use client';

import { useState } from 'react';
import ActionList from './arazzo/ActionList';
import type { SuccessAction, FailureAction } from '../types/arazzo';

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
  onStepClick?: (stepId: string) => void;
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
  onStepClick,
}: ActionFormEditorProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState<Action>({ type: 'goto' });

  const isSuccess = variant === 'success';

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

  return (
    <div className="space-y-3">
      <ActionList
        actions={actions as (SuccessAction | FailureAction)[]}
        type={variant}
        isDark={isDark}
        onEdit={!readOnly ? handleEdit : undefined}
        onDelete={!readOnly ? handleDelete : undefined}
        onStepClick={onStepClick}
        alwaysVisible={true}
        emptyMessage={isSuccess ? 'Continue to next step' : 'End workflow'}
        headerActions={!readOnly && !showAddForm && (
          <button
            onClick={handleAdd}
            className={`text-xs font-medium ${isDark ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'}`}
          >
            + Add Action
          </button>
        )}
      />

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
