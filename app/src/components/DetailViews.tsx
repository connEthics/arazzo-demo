'use client';

import { useMemo } from 'react';
import type { Step, SourceDescription, WorkflowInputs, Parameter, Criterion, FailureAction } from '@/types/arazzo';
import { isReusableObject } from '@/types/arazzo';
import { extractHttpMethod, getMethodBadgeVariant } from '@/lib/arazzo-utils';

// Import Arazzo components
import { ReusableRef, CriterionBadge, ActionList, PayloadReplacements, SchemaViewer, StepHeader, StepBody } from './arazzo';
import { Card, Badge, CodeBlock, PropertyList, MarkdownText, EditableField, EditableListItem } from './primitives';
import SchemaEditor from './SchemaEditor';
import WorkflowInputsEditor from './WorkflowInputsEditor';
import type { ParameterItem, ParameterIn, OutputItem } from './primitives/EditableListItem';
import type { ExpressionSuggestion } from './ExpressionInput';

interface ContentProps {
  isDark: boolean;
  textClass?: string;
  mutedClass?: string;
  codeBgClass?: string;
  /** Enable edit mode */
  editable?: boolean;
  /** Expression suggestions for autocomplete in edit mode */
  expressionSuggestions?: ExpressionSuggestion[];
}

interface GeneratedSchema {
  type: string;
  properties: Record<string, any>;
}

// Utility functions for schema generation
function generateSchemaFromPayload(payload: Record<string, unknown>): GeneratedSchema {
  const properties: Record<string, any> = {};

  for (const [key, value] of Object.entries(payload)) {
    if (typeof value === 'string') {
      // Check if it's an expression like $inputs.xxx
      const isExpression = value.startsWith('$');
      properties[key] = { type: 'string', example: value, ...(isExpression && { description: `Dynamic value from: ${value}` }) };
    } else if (typeof value === 'number') {
      properties[key] = { type: 'number', example: value };
    } else if (typeof value === 'boolean') {
      properties[key] = { type: 'boolean', example: value };
    } else if (Array.isArray(value)) {
      properties[key] = { type: 'array', items: { type: 'string' } };
    } else if (typeof value === 'object' && value !== null) {
      properties[key] = { type: 'object', properties: generateSchemaFromPayload(value as Record<string, unknown>).properties };
    }
  }

  return { type: 'object', properties };
}

export function StepContent({ step, sourceForStep, onStepClick, onRefClick, onStepUpdate, forceExpanded, hideHeader = false, ...props }: ContentProps & {
  step: Step;
  sourceForStep?: SourceDescription;
  onStepClick?: (stepId: string) => void;
  onRefClick?: (reference: string) => void;
  /** Callback to update step data (required for editable mode) */
  onStepUpdate?: (updates: Partial<Step>) => void;
  availableSteps?: string[];
  forceExpanded?: boolean;
  hideHeader?: boolean;
}) {
  const {
    isDark,
    textClass = isDark ? 'text-white' : 'text-gray-900',
    mutedClass = isDark ? 'text-slate-400' : 'text-gray-500',
    codeBgClass = isDark ? 'bg-slate-800' : 'bg-gray-50',
    editable = false,
    expressionSuggestions = [],
    availableSteps = [],
  } = props;

  // Determine if editing is actually possible
  const canEdit = editable && !!onStepUpdate;

  // Extract HTTP method from operation
  const httpMethod = extractHttpMethod(step.operationId);
  const operationName = step.operationId?.includes('.')
    ? step.operationId.split('.').pop()
    : step.operationId;

  // Prepare parameters for PropertyList
  const parameterItems = useMemo(() => step.parameters
    ?.filter((p): p is Parameter => !isReusableObject(p))
    .map(p => ({
      name: p.name,
      value: typeof p.value === 'string' ? p.value : JSON.stringify(p.value),
      type: p.in || undefined,
    })) || [], [step.parameters]);

  // Get reusable parameters
  const reusableParams = useMemo(() => step.parameters?.filter(isReusableObject) || [], [step.parameters]);

  // Prepare outputs for PropertyList
  const outputItems = useMemo(() => step.outputs
    ? Object.entries(step.outputs).map(([key, value]) => ({
      name: key,
      value: typeof value === 'string' ? value : JSON.stringify(value),
    }))
    : [], [step.outputs]);

  // Generate request body schema
  const requestBodySchema = useMemo(() => {
    if (!step.requestBody?.payload || typeof step.requestBody.payload !== 'object') return null;
    return generateSchemaFromPayload(step.requestBody.payload as Record<string, unknown>);
  }, [step.requestBody]);

  // Generate response schema from outputs
  const responseSchema = useMemo((): GeneratedSchema | null => {
    if (!step.outputs || Object.keys(step.outputs).length === 0) return null;
    const properties: Record<string, any> = {};
    for (const [key, value] of Object.entries(step.outputs)) {
      properties[key] = { type: 'string', description: `Extracted from: ${value}` };
    }
    return { type: 'object', properties };
  }, [step.outputs]);

  // Extract x- extensions
  const extensions = useMemo(() => {
    return Object.entries(step)
      .filter(([key]) => key.startsWith('x-'))
      .map(([key, value]) => ({
        name: key,
        value: typeof value === 'string' ? value : JSON.stringify(value),
      }));
  }, [step]);

  return (
    <div className="space-y-4">
      {/* Operation Header - Unified StepHeader */}
      {!hideHeader && (step.operationId || step.workflowId) && (
        <StepHeader
          step={step}
          variant="inspector"
          isDark={isDark}
          editable={canEdit}
          onUpdate={onStepUpdate}
          className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm mb-4"
        />
      )}

      {/* Step Details - Unified StepBody */}
      <StepBody
        step={step}
        variant="full"
        sourceForStep={sourceForStep}
        isDark={isDark}
        editable={editable}
        onStepUpdate={onStepUpdate}
        onStepClick={onStepClick}
        onRefClick={onRefClick}
        expressionSuggestions={expressionSuggestions}
        availableSteps={availableSteps}
        forceExpanded={forceExpanded}
      />
    </div>
  );
}

export function SourceContent({ source, ...props }: ContentProps & { source: SourceDescription }) {
  const {
    isDark,
    textClass = isDark ? 'text-white' : 'text-gray-900',
    mutedClass = isDark ? 'text-slate-400' : 'text-gray-500'
  } = props;

  // Extract x- extensions
  const extensions = useMemo(() => {
    return Object.entries(source)
      .filter(([key]) => key.startsWith('x-'))
      .map(([key, value]) => ({
        name: key,
        value: typeof value === 'string' ? value : JSON.stringify(value),
      }));
  }, [source]);

  return (
    <div className="space-y-4">
      <Card title="Name" isDark={isDark}>
        <span className={`text-sm font-medium ${textClass}`}>{source.name}</span>
      </Card>

      <Card title="Type" isDark={isDark}>
        <Badge variant={source.type === 'openapi' ? 'openapi' : 'arazzo'} isDark={isDark}>
          {source.type?.toUpperCase() ?? 'UNKNOWN'}
        </Badge>
      </Card>

      <Card title="URL" isDark={isDark}>
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`text-xs font-mono ${isDark ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-500'} break-all hover:underline flex items-center gap-1`}
        >
          {source.url}
          <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </Card>

      {source.description && (
        <Card title="Description" isDark={isDark}>
          <p className={`text-sm ${mutedClass}`}>{source.description}</p>
        </Card>
      )}

      {/* Extensions */}
      {extensions.length > 0 && (
        <Card title="Extensions" isDark={isDark}>
          <PropertyList
            items={extensions}
            isDark={isDark}
            variant="compact"
            borderColor="border-pink-400"
          />
        </Card>
      )}
    </div>
  );
}

export function InputContent({ input, workflowInputs, title, ...props }: ContentProps & {
  input: { name: string; schema: Record<string, unknown> };
  workflowInputs?: WorkflowInputs;
  title?: string;
  onUpdate?: (inputs: WorkflowInputs) => void;
  onReorder?: (startIndex: number, endIndex: number) => void;
}) {
  if (!input) return null;

  const {
    isDark,
    textClass = isDark ? 'text-white' : 'text-gray-900',
    mutedClass = isDark ? 'text-slate-400' : 'text-gray-500',
    codeBgClass = isDark ? 'bg-slate-800' : 'bg-gray-50',
    editable = false,
    expressionSuggestions = [],
    onUpdate,
    onReorder
  } = props;

  // Check if this is a single input property or the whole inputs block
  const isSingleInput = input.name !== 'Workflow Inputs' && workflowInputs?.properties?.[input.name];
  const inputSchema = isSingleInput ? workflowInputs?.properties?.[input.name] : null;

  // Extract x- extensions from schema
  const extensions = useMemo(() => {
    if (!inputSchema) return [];
    return Object.entries(inputSchema)
      .filter(([key]) => key.startsWith('x-'))
      .map(([key, value]) => ({
        name: key,
        value: typeof value === 'string' ? value : JSON.stringify(value),
      }));
  }, [inputSchema]);

  // If showing all workflow inputs
  if (!isSingleInput && workflowInputs?.properties) {
    const properties = Object.keys(workflowInputs.properties);

    return (
      <div className="space-y-4">
        {properties.length > 0 && (
          <Card isDark={isDark}>
            {editable ? (
              <WorkflowInputsEditor
                inputs={workflowInputs}
                onChange={(newInputs) => onUpdate?.(newInputs)}
                isDark={isDark}
              />
            ) : (
              <div className="space-y-3">
                {properties.map((propName) => (
                  <SchemaViewer
                    key={propName}
                    name={propName}
                    schema={workflowInputs.properties![propName]}
                    required={workflowInputs.required?.includes(propName)}
                    isDark={isDark}
                  />
                ))}
              </div>
            )}
          </Card>
        )}
      </div>
    );
  }

  // Single input property view
  return (
    <div className="space-y-4">
      <Card title="Input Details" isDark={isDark}>
        <SchemaViewer
          name={input.name}
          schema={inputSchema || {}}
          required={workflowInputs?.required?.includes(input.name)}
          isDark={isDark}
        />
      </Card>

      {/* Extensions */}
      {extensions.length > 0 && (
        <Card title="Extensions" isDark={isDark}>
          <PropertyList
            items={extensions}
            isDark={isDark}
            variant="compact"
            borderColor="border-pink-400"
          />
        </Card>
      )}
    </div>
  );
}

export function OutputContent({ output, workflowOutputs, ...props }: ContentProps & {
  output: { name: string; value: string; stepId?: string; allOutputs?: Record<string, string> };
  workflowOutputs?: Record<string, string>;
  onUpdate?: (outputs: Record<string, string>) => void;
  onReorder?: (startIndex: number, endIndex: number) => void;
}) {
  if (!output) return null;

  const {
    isDark,
    textClass = isDark ? 'text-white' : 'text-gray-900',
    mutedClass = isDark ? 'text-slate-400' : 'text-gray-500',
    codeBgClass = isDark ? 'bg-slate-800' : 'bg-gray-50',
    editable = false,
    expressionSuggestions = [],
    onUpdate,
    onReorder
  } = props;

  // Check if this is showing all outputs (from clicking on Output node)
  const isAllOutputs = output.name === 'Workflow Outputs' || (output.allOutputs && Object.keys(output.allOutputs).length > 0);
  const allOutputsData = output.allOutputs || workflowOutputs || {};

  if (isAllOutputs) {
    const outputNames = Object.keys(allOutputsData);
    const showCard = outputNames.length > 0 || editable;

    return (
      <div className="space-y-4">
        {showCard && (
          <Card isDark={isDark}>
            <div className="space-y-3">
              {outputNames.map((name, index) => (
                editable ? (
                  <EditableListItem
                    key={name}
                    type="output"
                    item={{ key: name, value: allOutputsData[name] }}
                    isDark={isDark}
                    expressionSuggestions={expressionSuggestions}
                    onChange={(item) => {
                      const newOutputs = { ...allOutputsData };
                      if (item.key !== name) {
                        delete newOutputs[name];
                      }
                      newOutputs[item.key] = item.value;
                      onUpdate?.(newOutputs);
                    }}
                    onDelete={() => {
                      const newOutputs = { ...allOutputsData };
                      delete newOutputs[name];
                      onUpdate?.(newOutputs);
                    }}
                    onMoveUp={index > 0 ? () => onReorder?.(index, index - 1) : undefined}
                    onMoveDown={index < outputNames.length - 1 ? () => onReorder?.(index, index + 1) : undefined}
                  />
                ) : (
                  <div key={name} className="flex flex-col gap-1 p-2 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-medium ${textClass}`}>{name}</span>
                      <span className={mutedClass}>→</span>
                    </div>
                    <code className={`text-xs font-mono p-1 rounded ${codeBgClass} ${textClass} break-all`}>
                      {allOutputsData[name]}
                    </code>
                  </div>
                )
              ))}
            </div>
            {editable && (
              <button
                onClick={() => {
                  const newOutputs = { ...allOutputsData };
                  const nextId = Object.keys(newOutputs).length + 1;
                  newOutputs[`output_${nextId}`] = '';
                  onUpdate?.(newOutputs);
                }}
                className={`w-full mt-3 py-2 rounded-lg border-2 border-dashed flex items-center justify-center gap-2 transition-colors ${
                  isDark 
                    ? 'border-slate-700 hover:border-slate-600 text-slate-400 hover:text-slate-300 hover:bg-slate-800' 
                    : 'border-gray-200 hover:border-gray-300 text-gray-500 hover:text-gray-600 hover:bg-gray-50'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-sm font-medium">Add Output</span>
              </button>
            )}
          </Card>
        )}
      </div>
    );
  }

  // Single output view
  return (
    <div className="space-y-4">
      <Card title="Name" isDark={isDark}>
        <span className={`text-sm font-medium ${textClass}`}>{output.name}</span>
      </Card>

      {output.stepId && (
        <Card title="Source Step" isDark={isDark}>
          <div className="flex items-center gap-2">
            <Badge variant="step" isDark={isDark} size="xs">Step</Badge>
            <code className={`text-xs font-mono ${textClass}`}>{output.stepId}</code>
          </div>
        </Card>
      )}

      <Card title="Expression" isDark={isDark}>
        <CodeBlock
          code={typeof output.value === 'string' ? output.value : JSON.stringify(output.value, null, 2)}
          language="expression"
          isDark={isDark}
        />
      </Card>
    </div>
  );
}
