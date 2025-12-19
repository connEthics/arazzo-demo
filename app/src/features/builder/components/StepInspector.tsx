'use client';

import { useState, useMemo } from 'react';
import { useBuilder } from '../context/BuilderContext';
import { suggestStepMapping } from '../actions/ai-mapping';
import { Step, Parameter, isReusableObject, FailureAction, SuccessAction, RequestBodyPayload } from '@/types/arazzo';
import { getOperationByStepId, OperationItem, OASParameter } from '../utils/oas-helpers';
import { Badge, Card } from '@/components/primitives';
import { SchemaViewer } from '@/components/arazzo';
import { getMethodBadgeVariant, type HttpMethod } from '@/lib/arazzo-utils';
import ExpressionAutocomplete from './ExpressionAutocomplete';

interface StepInspectorProps {
  /** If true, the inspector is in read-only mode and editing is disabled */
  readOnly?: boolean;
}

export default function StepInspector({ readOnly = false }: StepInspectorProps) {
  const { state, dispatch } = useBuilder();
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'config' | 'oas'>('config');

  const selectedStep = state.spec.workflows[0]?.steps.find(s => s.stepId === state.selectedStepId);
  
  // Get OAS operation details for this step
  const oasOperation = useMemo((): OperationItem | null => {
    if (!selectedStep?.operationId) return null;
    // Extract source name from operationPath if available, otherwise search all
    return getOperationByStepId(state.sources, selectedStep.operationId) ?? null;
  }, [selectedStep, state.sources]);

  if (!selectedStep) {
    return (
      <div className="p-4 text-center text-slate-500 text-sm">
        Select a step to edit its properties.
      </div>
    );
  }

  const handleUpdate = (updates: Partial<Step>) => {
    dispatch({
      type: 'UPDATE_STEP',
      payload: { stepId: selectedStep.stepId, updates }
    });
  };

  const handleAiSuggest = async () => {
    setIsAiLoading(true);
    try {
      const suggestion = await suggestStepMapping(selectedStep, state.spec.workflows[0].steps);
      handleUpdate(suggestion);
    } catch (error) {
      console.error('AI Suggestion failed', error);
      alert('Failed to get AI suggestions');
    } finally {
      setIsAiLoading(false);
    }
  };

  const addParameterFromOAS = (param: OASParameter) => {
    const existingParams = selectedStep.parameters || [];
    const exists = existingParams.some(p => !isReusableObject(p) && (p as Parameter).name === param.name);
    if (exists) return;
    
    const newParam: Parameter = {
      name: param.name,
      in: param.in,
      value: param.example ?? ''
    };
    handleUpdate({ parameters: [...existingParams, newParam] });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex justify-between items-center mb-2">
          <h2 className="font-semibold text-sm">Step Properties</h2>
          <button
            onClick={handleAiSuggest}
            disabled={isAiLoading}
            className="text-xs bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-2 py-1 rounded hover:opacity-90 disabled:opacity-50 flex items-center gap-1"
          >
            {isAiLoading ? (
              <span className="animate-spin">✨</span>
            ) : (
              <span>✨ AI</span>
            )}
          </button>
        </div>
        
        {/* Tabs */}
        {oasOperation && (
          <div className="flex rounded border border-slate-300 dark:border-slate-700 overflow-hidden">
            <button
              onClick={() => setActiveTab('config')}
              className={`flex-1 px-3 py-1 text-xs transition-colors ${
                activeTab === 'config' 
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              Configuration
            </button>
            <button
              onClick={() => setActiveTab('oas')}
              className={`flex-1 px-3 py-1 text-xs transition-colors ${
                activeTab === 'oas' 
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              API Spec
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'config' ? (
          <ConfigTab 
            selectedStep={selectedStep} 
            handleUpdate={handleUpdate}
            oasOperation={oasOperation}
            addParameterFromOAS={addParameterFromOAS}
            readOnly={readOnly}
          />
        ) : (
          <OASTab operation={oasOperation} />
        )}
      </div>
    </div>
  );
}

// Configuration Tab Component
function ConfigTab({ 
  selectedStep, 
  handleUpdate,
  oasOperation,
  addParameterFromOAS,
  readOnly
}: { 
  selectedStep: Step; 
  handleUpdate: (updates: Partial<Step>) => void;
  oasOperation: OperationItem | null;
  addParameterFromOAS: (param: OASParameter) => void;
  readOnly: boolean;
}) {
  return (
    <div className="p-4 space-y-5">
      {/* Basic Info */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-slate-500 uppercase">Step ID</label>
        <input
          type="text"
          value={selectedStep.stepId}
          onChange={(e) => handleUpdate({ stepId: e.target.value })}
          disabled={readOnly}
          className={`w-full px-3 py-2 rounded border bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-sm ${readOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-slate-500 uppercase">Description</label>
        <textarea
          value={selectedStep.description || ''}
          onChange={(e) => handleUpdate({ description: e.target.value })}
          disabled={readOnly}
          className={`w-full px-3 py-2 rounded border bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-sm h-16 resize-none ${readOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
          placeholder="Describe this step..."
        />
      </div>

      {/* Parameters with OAS hints */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label className="text-xs font-medium text-slate-500 uppercase">Parameters</label>
          {!readOnly && (
            <button 
              onClick={() => handleUpdate({ parameters: [...(selectedStep.parameters || []), { name: '', value: '' }] })}
              className="text-xs text-indigo-500 hover:text-indigo-400"
            >
              + Add
            </button>
          )}
        </div>
        
        {/* OAS Available Parameters */}
        {!readOnly && oasOperation && oasOperation.parameters.length > 0 && (
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded p-2 mb-2">
            <div className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1.5">
              Available from API:
            </div>
            <div className="flex flex-wrap gap-1">
              {oasOperation.parameters.map((param, idx) => (
                <button
                  key={idx}
                  onClick={() => addParameterFromOAS(param)}
                  className="text-xs px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-700 transition-colors flex items-center gap-1"
                  title={`${param.in}: ${param.description || param.name}${param.required ? ' (required)' : ''}`}
                >
                  <span className="opacity-60">{param.in === 'path' ? '🔗' : param.in === 'query' ? '?' : param.in === 'header' ? '📋' : '🍪'}</span>
                  {param.name}
                  {param.required && <span className="text-red-500">*</span>}
                </button>
              ))}
            </div>
          </div>
        )}
        
        <div className="space-y-2">
          {selectedStep.parameters?.map((param, idx) => {
            if (isReusableObject(param)) return null;
            const p = param as Parameter;
            return (
              <div key={idx} className="flex gap-2 items-center">
                <input
                  placeholder="Name"
                  value={p.name || ''}
                  onChange={(e) => {
                    const newParams = [...(selectedStep.parameters || [])];
                    newParams[idx] = { ...p, name: e.target.value };
                    handleUpdate({ parameters: newParams });
                  }}
                  className="flex-1 px-2 py-1 rounded border bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-xs"
                />
                <div className="flex-1">
                  <ExpressionAutocomplete
                    value={(p.value as string) || ''}
                    onChange={(newValue) => {
                      const newParams = [...(selectedStep.parameters || [])];
                      newParams[idx] = { ...p, value: newValue };
                      handleUpdate({ parameters: newParams });
                    }}
                    placeholder="$steps.xxx.outputs.yyy"
                    currentStepId={selectedStep.stepId}
                  />
                </div>
                <button
                  onClick={() => {
                    const newParams = selectedStep.parameters?.filter((_, i) => i !== idx);
                    handleUpdate({ parameters: newParams });
                  }}
                  className="text-red-400 hover:text-red-600 text-xs px-1"
                >
                  ✕
                </button>
              </div>
            );
          })}
          {(!selectedStep.parameters || selectedStep.parameters.length === 0) && (
            <p className="text-xs text-slate-400 italic">No parameters defined</p>
          )}
        </div>
      </div>

      {/* Success Criteria */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label className="text-xs font-medium text-slate-500 uppercase">Success Criteria</label>
          {!readOnly && (
            <button 
              onClick={() => handleUpdate({ successCriteria: [...(selectedStep.successCriteria || []), { condition: '' }] })}
              className="text-xs text-indigo-500 hover:text-indigo-400"
            >
              + Add
            </button>
          )}
        </div>
        <div className="space-y-2">
          {selectedStep.successCriteria?.map((criteria, idx) => (
            <div key={idx} className="flex gap-2 items-center">
              <input
                placeholder="$statusCode == 200"
                value={criteria.condition}
                onChange={(e) => {
                  const newCriteria = [...(selectedStep.successCriteria || [])];
                  newCriteria[idx] = { ...criteria, condition: e.target.value };
                  handleUpdate({ successCriteria: newCriteria });
                }}
                className="flex-1 px-2 py-1 rounded border bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-xs font-mono"
              />
              <button
                onClick={() => {
                  const newCriteria = selectedStep.successCriteria?.filter((_, i) => i !== idx);
                  handleUpdate({ successCriteria: newCriteria });
                }}
                className="text-red-400 hover:text-red-600 text-xs px-1"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Outputs */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label className="text-xs font-medium text-slate-500 uppercase">Outputs</label>
          {!readOnly && (
            <button 
              onClick={() => handleUpdate({ outputs: { ...selectedStep.outputs, 'newOutput': '' } })}
              className="text-xs text-indigo-500 hover:text-indigo-400"
            >
              + Add
            </button>
          )}
        </div>
        <div className="space-y-2">
          {Object.entries(selectedStep.outputs || {}).map(([key, value], idx) => (
            <div key={idx} className="flex gap-2 items-center">
              <input
                placeholder="Variable Name"
                value={key}
                onChange={(e) => {
                  const newOutputs = { ...selectedStep.outputs };
                  delete newOutputs[key];
                  newOutputs[e.target.value] = value;
                  handleUpdate({ outputs: newOutputs });
                }}
                disabled={readOnly}
                className={`flex-1 px-2 py-1 rounded border bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-xs ${readOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
              />
              <input
                placeholder="Expression"
                value={value}
                onChange={(e) => {
                  const newOutputs = { ...selectedStep.outputs };
                  newOutputs[key] = e.target.value;
                  handleUpdate({ outputs: newOutputs });
                }}
                disabled={readOnly}
                className={`flex-1 px-2 py-1 rounded border bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-xs font-mono ${readOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
              />
              {!readOnly && (
                <button
                  onClick={() => {
                    const newOutputs = { ...selectedStep.outputs };
                    delete newOutputs[key];
                    handleUpdate({ outputs: newOutputs });
                  }}
                  className="text-red-400 hover:text-red-600 text-xs px-1"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Request Body */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label className="text-xs font-medium text-slate-500 uppercase">Request Body</label>
          {!readOnly && !selectedStep.requestBody && (
            <button 
              onClick={() => handleUpdate({ 
                requestBody: { 
                  contentType: 'application/json', 
                  payload: {} 
                } 
              })}
              className="text-xs text-indigo-500 hover:text-indigo-400"
            >
              + Add
            </button>
          )}
        </div>
        {selectedStep.requestBody && (
          <div className="space-y-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
            <div className="flex gap-2 items-center">
              <select
                value={selectedStep.requestBody.contentType || 'application/json'}
                onChange={(e) => handleUpdate({ 
                  requestBody: { ...selectedStep.requestBody!, contentType: e.target.value }
                })}
                disabled={readOnly}
                className={`flex-1 px-2 py-1 rounded border bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-xs ${readOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <option value="application/json">application/json</option>
                <option value="application/xml">application/xml</option>
                <option value="application/x-www-form-urlencoded">form-urlencoded</option>
                <option value="multipart/form-data">multipart/form-data</option>
              </select>
              {!readOnly && (
                <button
                  onClick={() => handleUpdate({ requestBody: undefined })}
                  className="text-red-400 hover:text-red-600 text-xs px-1"
                >
                  ✕
                </button>
              )}
            </div>
            <textarea
              value={typeof selectedStep.requestBody.payload === 'string' 
                ? selectedStep.requestBody.payload 
                : JSON.stringify(selectedStep.requestBody.payload, null, 2)}
              onChange={(e) => {
                let payload: RequestBodyPayload;
                try {
                  payload = JSON.parse(e.target.value) as RequestBodyPayload;
                } catch {
                  payload = e.target.value;
                }
                handleUpdate({ 
                  requestBody: { ...selectedStep.requestBody!, payload }
                });
              }}
              disabled={readOnly}
              className={`w-full px-2 py-1 rounded border bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-xs font-mono h-24 resize-none ${readOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
              placeholder='{"key": "$inputs.value"}'
            />
          </div>
        )}
      </div>

      {/* onFailure Actions */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label className="text-xs font-medium text-slate-500 uppercase">On Failure</label>
          {!readOnly && (
            <button 
              onClick={() => handleUpdate({ 
                onFailure: [
                  ...(selectedStep.onFailure || []), 
                  { name: 'retry', type: 'retry', retryAfter: 1, retryLimit: 3 }
                ] 
              })}
              className="text-xs text-indigo-500 hover:text-indigo-400"
            >
              + Add
            </button>
          )}
        </div>
        <div className="space-y-2">
          {selectedStep.onFailure?.map((action, idx) => {
            // Skip reusable refs for now
            if ('reference' in action) return null;
            const a = action as FailureAction;
            return (
              <div key={idx} className="bg-red-50 dark:bg-red-900/20 rounded-lg p-2 border border-red-200 dark:border-red-800">
                <div className="flex gap-2 items-center mb-2">
                  <select
                    value={a.type}
                    onChange={(e) => {
                      const newActions = [...(selectedStep.onFailure || [])] as FailureAction[];
                      newActions[idx] = { ...a, type: e.target.value as FailureAction['type'] };
                      handleUpdate({ onFailure: newActions });
                    }}
                    className="flex-1 px-2 py-1 rounded border bg-white dark:bg-slate-800 border-red-300 dark:border-red-700 text-xs"
                  >
                    <option value="end">End</option>
                    <option value="retry">Retry</option>
                    <option value="goto">Goto Step</option>
                  </select>
                  <button
                    onClick={() => {
                      const newActions = selectedStep.onFailure?.filter((_, i) => i !== idx);
                      handleUpdate({ onFailure: newActions?.length ? newActions : undefined });
                    }}
                    className="text-red-400 hover:text-red-600 text-xs px-1"
                  >
                    ✕
                  </button>
                </div>
                {a.type === 'retry' && (
                  <div className="flex gap-2 text-xs">
                    <div className="flex-1">
                      <label className="text-red-600 dark:text-red-400 text-[10px]">Retry After (s)</label>
                      <input
                        type="number"
                        value={a.retryAfter || 1}
                        onChange={(e) => {
                          const newActions = [...(selectedStep.onFailure || [])] as FailureAction[];
                          newActions[idx] = { ...a, retryAfter: Number(e.target.value) };
                          handleUpdate({ onFailure: newActions });
                        }}
                        className="w-full px-2 py-1 rounded border bg-white dark:bg-slate-800 border-red-300 dark:border-red-700"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-red-600 dark:text-red-400 text-[10px]">Max Retries</label>
                      <input
                        type="number"
                        value={a.retryLimit || 3}
                        onChange={(e) => {
                          const newActions = [...(selectedStep.onFailure || [])] as FailureAction[];
                          newActions[idx] = { ...a, retryLimit: Number(e.target.value) };
                          handleUpdate({ onFailure: newActions });
                        }}
                        className="w-full px-2 py-1 rounded border bg-white dark:bg-slate-800 border-red-300 dark:border-red-700"
                      />
                    </div>
                  </div>
                )}
                {a.type === 'goto' && (
                  <input
                    placeholder="Target Step ID"
                    value={a.stepId || ''}
                    onChange={(e) => {
                      const newActions = [...(selectedStep.onFailure || [])] as FailureAction[];
                      newActions[idx] = { ...a, stepId: e.target.value };
                      handleUpdate({ onFailure: newActions });
                    }}
                    className="w-full px-2 py-1 rounded border bg-white dark:bg-slate-800 border-red-300 dark:border-red-700 text-xs"
                  />
                )}
              </div>
            );
          })}
          {(!selectedStep.onFailure || selectedStep.onFailure.length === 0) && (
            <p className="text-xs text-slate-400 italic">No failure handlers</p>
          )}
        </div>
      </div>

      {/* onSuccess Actions */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label className="text-xs font-medium text-slate-500 uppercase">On Success</label>
          <button 
            onClick={() => handleUpdate({ 
              onSuccess: [
                ...(selectedStep.onSuccess || []), 
                { name: 'next', type: 'goto', stepId: '' }
              ] 
            })}
            className="text-xs text-indigo-500 hover:text-indigo-400"
          >
            + Add
          </button>
        </div>
        <div className="space-y-2">
          {selectedStep.onSuccess?.map((action, idx) => {
            if ('reference' in action) return null;
            const a = action as SuccessAction;
            return (
              <div key={idx} className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-2 border border-emerald-200 dark:border-emerald-800">
                <div className="flex gap-2 items-center">
                  <select
                    value={a.type}
                    onChange={(e) => {
                      const newActions = [...(selectedStep.onSuccess || [])] as SuccessAction[];
                      newActions[idx] = { ...a, type: e.target.value as SuccessAction['type'] };
                      handleUpdate({ onSuccess: newActions });
                    }}
                    className="px-2 py-1 rounded border bg-white dark:bg-slate-800 border-emerald-300 dark:border-emerald-700 text-xs"
                  >
                    <option value="end">End</option>
                    <option value="goto">Goto Step</option>
                  </select>
                  {a.type === 'goto' && (
                    <input
                      placeholder="Target Step ID"
                      value={a.stepId || ''}
                      onChange={(e) => {
                        const newActions = [...(selectedStep.onSuccess || [])] as SuccessAction[];
                        newActions[idx] = { ...a, stepId: e.target.value };
                        handleUpdate({ onSuccess: newActions });
                      }}
                      className="flex-1 px-2 py-1 rounded border bg-white dark:bg-slate-800 border-emerald-300 dark:border-emerald-700 text-xs"
                    />
                  )}
                  <button
                    onClick={() => {
                      const newActions = selectedStep.onSuccess?.filter((_, i) => i !== idx);
                      handleUpdate({ onSuccess: newActions?.length ? newActions : undefined });
                    }}
                    className="text-red-400 hover:text-red-600 text-xs px-1"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
          {(!selectedStep.onSuccess || selectedStep.onSuccess.length === 0) && (
            <p className="text-xs text-slate-400 italic">Default: continue to next step</p>
          )}
        </div>
      </div>
    </div>
  );
}

// OAS Specification Tab Component - Using shared components
function OASTab({ 
  operation
}: { 
  operation: OperationItem | null;
}) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['parameters', 'responses']));
  const isDark = false; // Builder is always light mode for now

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  if (!operation) {
    return (
      <div className="p-4 text-center text-slate-500 text-sm">
        No OpenAPI specification found for this operation.
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Operation Header - Using Card component */}
      <Card isDark={isDark}>
        <div className="flex items-center gap-2 mb-2">
          <Badge variant={getMethodBadgeVariant(operation.method as HttpMethod)} size="sm">
            {operation.method}
          </Badge>
          <span className="text-xs font-mono text-slate-600 truncate">
            {operation.path}
          </span>
        </div>
        <div className="font-medium text-sm">{operation.operationId}</div>
        {operation.summary && (
          <div className="text-xs text-slate-500 mt-1">{operation.summary}</div>
        )}
        {operation.description && (
          <div className="text-xs text-slate-400 mt-1">{operation.description}</div>
        )}
        <div className="text-xs text-slate-400 mt-2">
          Source: <Badge variant="source" isDark={isDark} size="xs">{operation.sourceName}</Badge>
        </div>
      </Card>

      {/* Parameters Section - Using SchemaViewer for schemas */}
      {operation.parameters.length > 0 && (
        <Card 
          title={`Parameters (${operation.parameters.length})`}
          isDark={isDark}
          collapsible
          defaultExpanded={expandedSections.has('parameters')}
        >
          <div className="space-y-2">
            {operation.parameters.map((param, idx) => (
              <div key={idx} className="bg-gray-50 rounded p-2 text-xs border border-gray-100">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-medium text-indigo-600">{param.name}</span>
                  {param.required && (
                    <Badge variant="required" isDark={isDark} size="xs">required</Badge>
                  )}
                  <Badge variant="info" isDark={isDark} size="xs">{param.in}</Badge>
                </div>
                {param.description && (
                  <div className="text-slate-500 mb-1">{param.description}</div>
                )}
                {param.schema && (
                  <SchemaViewer 
                    name="type" 
                    schema={param.schema} 
                    isDark={isDark}
                    defaultCollapsed
                  />
                )}
                {param.example !== undefined && (
                  <div className="text-slate-400 mt-1">
                    Example: <code className="bg-gray-200 px-1 rounded text-xs">{JSON.stringify(param.example)}</code>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Request Body Section */}
      {operation.requestBody && (
        <Card 
          title={`Request Body${operation.requestBody.required ? ' (required)' : ''}`}
          isDark={isDark}
          collapsible
          defaultExpanded={expandedSections.has('requestBody')}
        >
          <div className="space-y-2">
            {operation.requestBody.description && (
              <div className="text-slate-500 text-xs">{operation.requestBody.description}</div>
            )}
            {operation.requestBody.content && Object.entries(operation.requestBody.content).map(([contentType, content]) => (
              <div key={contentType}>
                <Badge variant="info" isDark={isDark} size="xs" className="mb-2">{contentType}</Badge>
                {content.schema && (
                  <SchemaViewer 
                    name="body" 
                    schema={content.schema} 
                    isDark={isDark}
                  />
                )}
                {content.example && (
                  <pre className="bg-gray-100 p-2 rounded mt-2 overflow-x-auto text-[10px] text-gray-700">
                    {JSON.stringify(content.example, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Responses Section */}
      {operation.responses.length > 0 && (
        <Card 
          title={`Responses (${operation.responses.length})`}
          isDark={isDark}
          collapsible
          defaultExpanded={expandedSections.has('responses')}
        >
          <div className="space-y-2">
            {operation.responses.map((resp, idx) => (
              <div key={idx} className="bg-gray-50 rounded p-2 text-xs border border-gray-100">
                <div className="flex items-center gap-2 mb-1">
                  <Badge 
                    variant={
                      resp.statusCode.startsWith('2') ? 'success' :
                      resp.statusCode.startsWith('4') ? 'warning' :
                      resp.statusCode.startsWith('5') ? 'error' :
                      'info'
                    } 
                    isDark={isDark} 
                    size="xs"
                  >
                    {resp.statusCode}
                  </Badge>
                  {resp.description && (
                    <span className="text-slate-500">{resp.description}</span>
                  )}
                </div>
                {resp.content && Object.entries(resp.content).map(([contentType, content]) => (
                  <div key={contentType} className="mt-1">
                    <div className="text-slate-400 text-[10px] uppercase mb-1">{contentType}</div>
                    {content.schema && (
                      <SchemaViewer 
                        name="response" 
                        schema={content.schema} 
                        isDark={isDark}
                        defaultCollapsed
                      />
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
