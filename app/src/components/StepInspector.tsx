'use client';

import { useState } from 'react';
import { Badge, CodeBlock, PropertyList } from './primitives';
import ActionFormEditor, { Action } from './ActionFormEditor';
import ExpressionInput, { ExpressionSuggestion } from './ExpressionInput';

export interface InspectorStep {
  stepId: string;
  operationId?: string;
  operationPath?: string;
  workflowId?: string;
  description?: string;
  parameters?: Array<{
    name: string;
    in?: string;
    value: string | number | boolean;
  }>;
  requestBody?: {
    contentType?: string;
    payload?: unknown;
  };
  successCriteria?: Array<{
    condition: string;
    type?: string;
  }>;
  outputs?: Record<string, string>;
  onSuccess?: Action[];
  onFailure?: Action[];
}

interface StepInspectorProps {
  step: InspectorStep | null;
  onStepChange?: (step: InspectorStep) => void;
  onClose?: () => void;
  readOnly?: boolean;
  isDark?: boolean;
  onStepClick?: (stepId: string) => void;
  onRefClick?: (ref: string) => void;
  /** Available steps for goto action dropdown */
  availableSteps?: string[];
  /** Expression suggestions for autocomplete */
  expressionSuggestions?: ExpressionSuggestion[];
}

// Default expression suggestions
const DEFAULT_EXPRESSION_SUGGESTIONS: ExpressionSuggestion[] = [
  { expression: '$statusCode', label: 'Status Code', type: 'context' },
  { expression: '$response.body', label: 'Response Body', type: 'response' },
  { expression: '$response.body.id', label: 'Body ID', type: 'response' },
  { expression: '$response.body.length', label: 'Body Length', type: 'response' },
  { expression: '$response.header.content-type', label: 'Content-Type', type: 'response' },
  { expression: '$url', label: 'Request URL', type: 'context' },
  { expression: '$method', label: 'HTTP Method', type: 'context' },
  { expression: '$inputs.', label: 'Workflow Input', type: 'input' },
  { expression: '$steps.', label: 'Step Output', type: 'output' },
];

/**
 * Right panel for inspecting and editing a selected step's properties.
 * Uses ActionFormEditor for actions tab and ExpressionInput for expression fields.
 */
export default function StepInspector({
  step,
  onStepChange,
  onClose,
  readOnly = false,
  isDark = false,
  onStepClick,
  onRefClick,
  availableSteps = [],
  expressionSuggestions = DEFAULT_EXPRESSION_SUGGESTIONS,
}: StepInspectorProps) {
  const [activeTab, setActiveTab] = useState<'general' | 'params' | 'criteria' | 'actions'>('general');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['operation', 'parameters']));
  
  // Forms state for adding new items
  const [showAddParam, setShowAddParam] = useState(false);
  const [showAddCriterion, setShowAddCriterion] = useState(false);
  const [showAddOutput, setShowAddOutput] = useState(false);
  const [newParam, setNewParam] = useState({ name: '', in: 'query', value: '' });
  const [newCriterion, setNewCriterion] = useState('');
  const [newOutput, setNewOutput] = useState({ name: '', value: '' });

  if (!step) {
    return (
      <div className={`h-full flex flex-col items-center justify-center p-6 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
        <svg className="w-12 h-12 mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
        </svg>
        <p className="text-sm font-medium">No step selected</p>
        <p className="text-xs mt-1">Click a step on the canvas to inspect</p>
      </div>
    );
  }

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const tabs = [
    { id: 'general', label: 'General', icon: '📋' },
    { id: 'params', label: 'Parameters', icon: '⚙️', count: step.parameters?.length },
    { id: 'criteria', label: 'Criteria', icon: '✓', count: step.successCriteria?.length },
    { id: 'actions', label: 'Actions', icon: '🔀', count: (step.onSuccess?.length || 0) + (step.onFailure?.length || 0) },
  ];

  const handleFieldChange = (field: keyof InspectorStep, value: unknown) => {
    if (onStepChange && step) {
      onStepChange({ ...step, [field]: value });
    }
  };

  // Parameter handlers
  const handleAddParameter = () => {
    if (!newParam.name) return;
    const params = [...(step.parameters || []), { ...newParam }];
    handleFieldChange('parameters', params);
    setNewParam({ name: '', in: 'query', value: '' });
    setShowAddParam(false);
  };

  const handleRemoveParameter = (index: number) => {
    const params = [...(step.parameters || [])];
    params.splice(index, 1);
    handleFieldChange('parameters', params);
  };

  const handleUpdateParameter = (index: number, field: string, value: string) => {
    const params = [...(step.parameters || [])];
    params[index] = { ...params[index], [field]: value };
    handleFieldChange('parameters', params);
  };

  // Criteria handlers
  const handleAddCriterion = () => {
    if (!newCriterion) return;
    const criteria = [...(step.successCriteria || []), { condition: newCriterion }];
    handleFieldChange('successCriteria', criteria);
    setNewCriterion('');
    setShowAddCriterion(false);
  };

  const handleRemoveCriterion = (index: number) => {
    const criteria = [...(step.successCriteria || [])];
    criteria.splice(index, 1);
    handleFieldChange('successCriteria', criteria);
  };

  const handleUpdateCriterion = (index: number, value: string) => {
    const criteria = [...(step.successCriteria || [])];
    criteria[index] = { ...criteria[index], condition: value };
    handleFieldChange('successCriteria', criteria);
  };

  // Output handlers
  const handleAddOutput = () => {
    if (!newOutput.name || !newOutput.value) return;
    const outputs = { ...(step.outputs || {}), [newOutput.name]: newOutput.value };
    handleFieldChange('outputs', outputs);
    setNewOutput({ name: '', value: '' });
    setShowAddOutput(false);
  };

  const handleRemoveOutput = (key: string) => {
    const outputs = { ...(step.outputs || {}) };
    delete outputs[key];
    handleFieldChange('outputs', outputs);
  };

  // Action handlers - delegate to ActionFormEditor
  const handleSuccessActionsChange = (actions: Action[]) => {
    handleFieldChange('onSuccess', actions);
  };

  const handleFailureActionsChange = (actions: Action[]) => {
    handleFieldChange('onFailure', actions);
  };

  const SectionHeader = ({ id, title, badge }: { id: string; title: string; badge?: React.ReactNode }) => (
    <button
      onClick={() => toggleSection(id)}
      className={`w-full flex items-center justify-between py-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}
    >
      <div className="flex items-center gap-2">
        <svg
          className={`w-4 h-4 transition-transform ${expandedSections.has(id) ? 'rotate-90' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-sm font-semibold">{title}</span>
      </div>
      {badge}
    </button>
  );

  return (
    <div className={`h-full flex flex-col border-l ${isDark ? 'border-slate-700 bg-slate-900' : 'border-gray-200 bg-white'}`}>
      {/* Header */}
      <div className={`flex-shrink-0 px-4 py-3 border-b ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? 'bg-indigo-600/20' : 'bg-indigo-100'}`}>
              <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="min-w-0">
              <h3 className={`font-semibold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {step.stepId}
              </h3>
              <p className={`text-xs truncate ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                Step Inspector
              </p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-gray-100 text-gray-400'}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Tabs - scrollable */}
        <div className="mt-3 -mx-1 overflow-x-auto scrollbar-hide">
          <div className="flex gap-1 px-1 min-w-max">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? isDark
                      ? 'bg-indigo-600/20 text-indigo-300'
                      : 'bg-indigo-100 text-indigo-700'
                    : isDark
                      ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                    activeTab === tab.id
                      ? isDark ? 'bg-indigo-500/30' : 'bg-indigo-200'
                      : isDark ? 'bg-slate-700' : 'bg-gray-200'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* General Tab */}
        {activeTab === 'general' && (
          <div className="space-y-4">
            {/* Step ID */}
            <div>
              <label className={`block text-xs font-semibold uppercase mb-1.5 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                Step ID
              </label>
              <input
                type="text"
                value={step.stepId}
                onChange={(e) => handleFieldChange('stepId', e.target.value)}
                disabled={readOnly}
                className={`w-full px-3 py-2 rounded-lg text-sm border font-mono transition-colors ${
                  isDark
                    ? 'bg-slate-800 border-slate-600 text-white disabled:text-slate-400'
                    : 'bg-white border-gray-300 text-gray-900 disabled:text-gray-400'
                } ${readOnly ? 'cursor-not-allowed' : ''}`}
              />
            </div>

            {/* Operation */}
            <div>
              <SectionHeader id="operation" title="Operation" />
              {expandedSections.has('operation') && (
                <div className={`mt-2 p-3 rounded-lg ${isDark ? 'bg-slate-800' : 'bg-gray-50'}`}>
                  {step.operationId ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="method-get" isDark={isDark} size="xs">GET</Badge>
                        <code className={`text-sm font-mono ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                          {step.operationId}
                        </code>
                      </div>
                      {step.operationPath && (
                        <p className={`text-xs font-mono ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                          {step.operationPath}
                        </p>
                      )}
                    </div>
                  ) : step.workflowId ? (
                    <button
                      onClick={() => onStepClick?.(step.workflowId!)}
                      className="flex items-center gap-2 hover:underline"
                    >
                      <Badge variant="workflow" isDark={isDark} size="xs">Workflow</Badge>
                      <code className={`text-sm font-mono ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                        {step.workflowId}
                      </code>
                    </button>
                  ) : (
                    <p className={`text-xs italic ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                      No operation assigned
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <label className={`block text-xs font-semibold uppercase mb-1.5 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                Description
              </label>
              <textarea
                value={step.description || ''}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                disabled={readOnly}
                rows={3}
                placeholder="Describe what this step does..."
                className={`w-full px-3 py-2 rounded-lg text-sm border transition-colors resize-none ${
                  isDark
                    ? 'bg-slate-800 border-slate-600 text-white placeholder-slate-500 disabled:text-slate-400'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 disabled:text-gray-400'
                } ${readOnly ? 'cursor-not-allowed' : ''}`}
              />
            </div>

            {/* Outputs */}
            <div>
              <div className="flex items-center justify-between">
                <SectionHeader 
                  id="outputs" 
                  title="Outputs" 
                  badge={step.outputs && Object.keys(step.outputs).length > 0 ? (
                    <Badge variant="output" isDark={isDark} size="xs">
                      {Object.keys(step.outputs).length}
                    </Badge>
                  ) : undefined}
                />
                {!readOnly && !showAddOutput && expandedSections.has('outputs') && (
                  <button
                    onClick={() => setShowAddOutput(true)}
                    className={`text-xs ${isDark ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'}`}
                  >
                    + Add
                  </button>
                )}
              </div>
              {expandedSections.has('outputs') && (
                <div className="mt-2 space-y-2">
                  {step.outputs && Object.entries(step.outputs).map(([key, value]) => (
                    <div
                      key={key}
                      className={`group p-3 rounded-lg border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-gray-50'}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`font-mono text-sm font-medium ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                          {key}
                        </span>
                        {!readOnly && (
                          <button
                            onClick={() => handleRemoveOutput(key)}
                            className={`opacity-0 group-hover:opacity-100 p-1 rounded ${isDark ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-red-100 text-red-500'}`}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                      {readOnly ? (
                        <code className={`text-xs font-mono block ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                          {value}
                        </code>
                      ) : (
                        <ExpressionInput
                          value={value}
                          onChange={(v) => {
                            const outputs = { ...(step.outputs || {}), [key]: v };
                            handleFieldChange('outputs', outputs);
                          }}
                          isDark={isDark}
                          variant="compact"
                          suggestions={expressionSuggestions}
                        />
                      )}
                    </div>
                  ))}
                  
                  {/* Add output form */}
                  {showAddOutput && (
                    <div className={`p-3 rounded-lg border ${isDark ? 'border-indigo-500/30 bg-indigo-500/10' : 'border-indigo-200 bg-indigo-50'}`}>
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={newOutput.name}
                          onChange={(e) => setNewOutput(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Output name..."
                          className={`w-full px-3 py-2 rounded-lg text-sm font-mono border ${
                            isDark ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                          }`}
                        />
                        <ExpressionInput
                          value={newOutput.value}
                          onChange={(v) => setNewOutput(prev => ({ ...prev, value: v }))}
                          placeholder="$response.body.id"
                          isDark={isDark}
                          variant="compact"
                          suggestions={expressionSuggestions}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={handleAddOutput}
                            disabled={!newOutput.name || !newOutput.value}
                            className="flex-1 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 text-white disabled:opacity-50"
                          >
                            Add Output
                          </button>
                          <button
                            onClick={() => { setShowAddOutput(false); setNewOutput({ name: '', value: '' }); }}
                            className={`px-3 py-1.5 rounded-lg text-xs ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-gray-200 text-gray-700'}`}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {(!step.outputs || Object.keys(step.outputs).length === 0) && !showAddOutput && (
                    <p className={`text-xs italic ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                      No outputs defined
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Parameters Tab */}
        {activeTab === 'params' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-semibold uppercase ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                Parameters
              </span>
              {!readOnly && !showAddParam && (
                <button
                  onClick={() => setShowAddParam(true)}
                  className={`text-xs ${isDark ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'}`}
                >
                  + Add
                </button>
              )}
            </div>

            {/* Add parameter form */}
            {showAddParam && (
              <div className={`p-3 rounded-lg border ${isDark ? 'border-indigo-500/30 bg-indigo-500/10' : 'border-indigo-200 bg-indigo-50'}`}>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={newParam.name}
                      onChange={(e) => setNewParam(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="name"
                      className={`px-3 py-2 rounded-lg text-sm font-mono border ${
                        isDark ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                    <select
                      value={newParam.in}
                      onChange={(e) => setNewParam(prev => ({ ...prev, in: e.target.value }))}
                      className={`px-3 py-2 rounded-lg text-sm border ${
                        isDark ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    >
                      <option value="query">query</option>
                      <option value="path">path</option>
                      <option value="header">header</option>
                      <option value="cookie">cookie</option>
                    </select>
                  </div>
                  <ExpressionInput
                    value={newParam.value}
                    onChange={(v) => setNewParam(prev => ({ ...prev, value: v }))}
                    placeholder="Value or $expression..."
                    isDark={isDark}
                    variant="compact"
                    suggestions={expressionSuggestions}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddParameter}
                      disabled={!newParam.name}
                      className="flex-1 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 text-white disabled:opacity-50"
                    >
                      Add Parameter
                    </button>
                    <button
                      onClick={() => { setShowAddParam(false); setNewParam({ name: '', in: 'query', value: '' }); }}
                      className={`px-3 py-1.5 rounded-lg text-xs ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-gray-200 text-gray-700'}`}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Parameters list */}
            {step.parameters && step.parameters.length > 0 ? (
              <div className="space-y-2">
                {step.parameters.map((param, idx) => (
                  <div
                    key={idx}
                    className={`group p-3 rounded-lg border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-gray-50'}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`font-mono text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {param.name}
                        </span>
                        {param.in && (
                          <Badge variant="info" isDark={isDark} size="xs">{param.in}</Badge>
                        )}
                      </div>
                      {!readOnly && (
                        <button
                          onClick={() => handleRemoveParameter(idx)}
                          className={`opacity-0 group-hover:opacity-100 p-1 rounded ${isDark ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-red-100 text-red-500'}`}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                    {readOnly ? (
                      <code className={`text-xs font-mono block ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                        {String(param.value)}
                      </code>
                    ) : (
                      <ExpressionInput
                        value={String(param.value)}
                        onChange={(v) => handleUpdateParameter(idx, 'value', v)}
                        isDark={isDark}
                        variant="compact"
                        suggestions={expressionSuggestions}
                      />
                    )}
                  </div>
                ))}
              </div>
            ) : !showAddParam && (
              <div className={`text-center py-8 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                <p className="text-sm">No parameters defined</p>
              </div>
            )}

            {/* Request Body */}
            {step.requestBody && (
              <div className="mt-4">
                <span className={`block text-xs font-semibold uppercase mb-2 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                  Request Body
                </span>
                <CodeBlock
                  code={JSON.stringify(step.requestBody.payload, null, 2)}
                  language="json"
                  isDark={isDark}
                  title={step.requestBody.contentType || 'application/json'}
                />
              </div>
            )}
          </div>
        )}

        {/* Criteria Tab */}
        {activeTab === 'criteria' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-semibold uppercase ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                Success Criteria
              </span>
              {!readOnly && !showAddCriterion && (
                <button
                  onClick={() => setShowAddCriterion(true)}
                  className={`text-xs ${isDark ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'}`}
                >
                  + Add
                </button>
              )}
            </div>

            {/* Add criterion form */}
            {showAddCriterion && (
              <div className={`p-3 rounded-lg border ${isDark ? 'border-indigo-500/30 bg-indigo-500/10' : 'border-indigo-200 bg-indigo-50'}`}>
                <div className="space-y-3">
                  <ExpressionInput
                    value={newCriterion}
                    onChange={setNewCriterion}
                    placeholder="$statusCode == 200"
                    isDark={isDark}
                    suggestions={expressionSuggestions}
                    showQuickSuggestions
                    quickSuggestions={['$statusCode == 200', '$statusCode == 201', '$response.body.length > 0']}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddCriterion}
                      disabled={!newCriterion}
                      className="flex-1 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 text-white disabled:opacity-50"
                    >
                      Add Criterion
                    </button>
                    <button
                      onClick={() => { setShowAddCriterion(false); setNewCriterion(''); }}
                      className={`px-3 py-1.5 rounded-lg text-xs ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-gray-200 text-gray-700'}`}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Criteria list */}
            {step.successCriteria && step.successCriteria.length > 0 ? (
              <div className="space-y-2">
                {step.successCriteria.map((criterion, idx) => (
                  <div
                    key={idx}
                    className={`group p-3 rounded-lg border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-gray-50'}`}
                  >
                    <div className="flex items-start gap-2">
                      <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'
                      }`}>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        {readOnly ? (
                          <code className={`text-xs font-mono block ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                            {criterion.condition}
                          </code>
                        ) : (
                          <ExpressionInput
                            value={criterion.condition}
                            onChange={(v) => handleUpdateCriterion(idx, v)}
                            isDark={isDark}
                            variant="compact"
                            suggestions={expressionSuggestions}
                          />
                        )}
                        {criterion.type && (
                          <span className={`text-[10px] mt-1 block ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                            Type: {criterion.type}
                          </span>
                        )}
                      </div>
                      {!readOnly && (
                        <button
                          onClick={() => handleRemoveCriterion(idx)}
                          className={`opacity-0 group-hover:opacity-100 p-1 rounded ${isDark ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-red-100 text-red-500'}`}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : !showAddCriterion && (
              <div className={`text-center py-8 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                <p className="text-sm">No success criteria defined</p>
                <p className="text-xs mt-1">Default: status code 2xx</p>
              </div>
            )}
          </div>
        )}

        {/* Actions Tab - Using ActionFormEditor */}
        {activeTab === 'actions' && (
          <div className="space-y-6">
            <ActionFormEditor
              actions={step.onSuccess || []}
              onChange={handleSuccessActionsChange}
              variant="success"
              isDark={isDark}
              readOnly={readOnly}
              availableSteps={availableSteps}
              onStepClick={onStepClick}
            />

            <ActionFormEditor
              actions={step.onFailure || []}
              onChange={handleFailureActionsChange}
              variant="failure"
              isDark={isDark}
              readOnly={readOnly}
              availableSteps={availableSteps}
              onStepClick={onStepClick}
            />
          </div>
        )}
      </div>

      {/* Footer */}
      {!readOnly && (
        <div className={`flex-shrink-0 px-4 py-3 border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
          <button
            className="w-full py-2 rounded-lg text-sm font-medium transition-colors bg-indigo-600 hover:bg-indigo-500 text-white"
          >
            Apply Changes
          </button>
        </div>
      )}
    </div>
  );
}
