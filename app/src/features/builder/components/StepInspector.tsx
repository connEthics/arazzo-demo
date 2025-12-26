'use client';

import { useState, useMemo } from 'react';
import { useBuilder } from '../context/BuilderContext';
import { suggestStepMapping } from '../actions/ai-mapping';
import { Step, Parameter, isReusableObject, FailureAction, SuccessAction, RequestBodyPayload } from '@/types/arazzo';
import { getOperationByStepId, OperationItem, OASParameter } from '../utils/oas-helpers';
import { Badge, Card, EditableListItem, EditableField } from '@/components/primitives';
import type { ParameterItem, ParameterIn } from '@/components/primitives/EditableListItem';
import { SchemaViewer } from '@/components/arazzo';
import { getMethodBadgeVariant, type HttpMethod } from '@/lib/arazzo-utils';
import ExpressionAutocomplete from './ExpressionAutocomplete';
import { ExpressionSuggestion } from '@/components/ExpressionInput';

interface StepInspectorProps {
  /** If true, the inspector is in read-only mode and editing is disabled */
  readOnly?: boolean;
}

import { StepHeader, StepBody } from '@/components/arazzo';

// ... (keep imports)

export default function StepInspector({ readOnly = false }: StepInspectorProps) {
  const { state, dispatch } = useBuilder();
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'config' | 'oas'>('config');

  const selectedStep = state.spec.workflows[0]?.steps.find(s => s.stepId === state.selectedStepId);

  // Get OAS operation details for this step
  const oasOperation = useMemo((): OperationItem | null => {
    if (!selectedStep?.operationId) return null;
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
      in: param.in as Parameter['in'],
      value: param.example ?? ''
    };
    handleUpdate({ parameters: [...existingParams, newParam] });
  };

  // Build expression suggestions from previous steps and workflow inputs
  const expressionSuggestions = useMemo((): ExpressionSuggestion[] => {
    const suggestions: ExpressionSuggestion[] = [
      { expression: '$statusCode', label: 'Status Code', description: 'HTTP response status code', type: 'context' },
      { expression: '$response.body', label: 'Response Body', description: 'Full response body', type: 'response' },
      { expression: '$url', label: 'Request URL', type: 'context' },
    ];

    // Add workflow inputs
    const workflow = state.spec.workflows[0];
    if (workflow?.inputs?.properties) {
      Object.keys(workflow.inputs.properties).forEach(key => {
        suggestions.push({
          expression: `$inputs.${key}`,
          label: key,
          description: 'Workflow input',
          type: 'input',
        });
      });
    }

    // Add outputs from previous steps
    const currentStepIndex = workflow?.steps.findIndex(s => s.stepId === selectedStep.stepId) ?? -1;
    workflow?.steps.slice(0, currentStepIndex).forEach(step => {
      if (step.outputs) {
        Object.keys(step.outputs).forEach(outputKey => {
          suggestions.push({
            expression: `$steps.${step.stepId}.outputs.${outputKey}`,
            label: `${step.stepId}.${outputKey}`,
            description: `Output from step ${step.stepId}`,
            type: 'output',
            stepId: step.stepId,
            outputKey,
          });
        });
      }
    });

    return suggestions;
  }, [state.spec.workflows, selectedStep.stepId]);

  return (
    <div className="flex flex-col h-full bg-slate-900 border-l border-slate-800">
      {/* Header */}
      <div className="p-3 border-b border-slate-800">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-semibold text-sm text-white">Step Inspector</h2>
          <button
            onClick={handleAiSuggest}
            disabled={isAiLoading}
            className="text-[10px] bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-2 py-1 rounded hover:opacity-90 disabled:opacity-50 flex items-center gap-1 font-medium"
          >
            {isAiLoading ? <span className="animate-spin text-xs">✨</span> : <span className="text-xs">✨</span>}
            AI MAPPING
          </button>
        </div>

        {/* Unified Step Header */}
        <StepHeader
          step={selectedStep}
          variant="inspector"
          editable={!readOnly}
          onUpdate={handleUpdate}
          isDark={true}
          className="mb-3"
        />

        {/* Tabs */}
        {oasOperation && (
          <div className="flex rounded border border-slate-700 overflow-hidden text-[10px] font-medium uppercase tracking-wider">
            <button
              onClick={() => setActiveTab('config')}
              className={`flex-1 px-3 py-1.5 transition-colors ${activeTab === 'config'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
            >
              Configuration
            </button>
            <button
              onClick={() => setActiveTab('oas')}
              className={`flex-1 px-3 py-1.5 transition-colors ${activeTab === 'oas'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
            >
              API Spec
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
        {activeTab === 'config' ? (
          <div className="space-y-4">
            {/* OAS Available Parameters Hint */}
            {!readOnly && oasOperation && oasOperation.parameters.length > 0 && (
              <div className="bg-indigo-900/20 rounded-lg p-2.5 border border-indigo-500/20">
                <div className="text-[10px] font-bold text-indigo-400 mb-2 uppercase tracking-tight">
                  Available from API Spec:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {oasOperation.parameters.map((param, idx) => (
                    <button
                      key={idx}
                      onClick={() => addParameterFromOAS(param)}
                      className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-indigo-300 border border-indigo-500/20 hover:bg-indigo-500/10 transition-all flex items-center gap-1"
                      title={`${param.description || param.name}`}
                    >
                      <span className="opacity-60">{param.in === 'path' ? '🔗' : '?'}</span>
                      {param.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Unified Step Body */}
            <StepBody
              step={selectedStep}
              variant="full"
              editable={!readOnly}
              onStepUpdate={handleUpdate}
              isDark={true}
              expressionSuggestions={expressionSuggestions}
              onStepClick={(stepId) => dispatch({ type: 'SELECT_NODE', payload: { nodeType: 'step', id: stepId } })}
            />
          </div>
        ) : (
          <OASTab operation={oasOperation} />
        )}
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
