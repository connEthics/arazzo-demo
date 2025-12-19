'use client';

import { useMemo } from 'react';
import type { Step, SourceDescription, WorkflowInputs, Parameter, Criterion } from '@/types/arazzo';
import { isReusableObject } from '@/types/arazzo';
import { extractHttpMethod, getMethodBadgeVariant } from '@/lib/arazzo-utils';

// Import Arazzo components
import { ReusableRef, CriterionBadge, ActionList, PayloadReplacements, SchemaViewer } from './arazzo';
import { Card, Badge, CodeBlock, PropertyList, MarkdownText } from './primitives';

interface ContentProps {
  isDark: boolean;
  textClass?: string;
  mutedClass?: string;
  codeBgClass?: string;
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

export function StepContent({ step, sourceForStep, onStepClick, onRefClick, forceExpanded, ...props }: ContentProps & {  
  step: Step; 
  sourceForStep?: SourceDescription;
  onStepClick?: (stepId: string) => void;
  onRefClick?: (reference: string) => void;
  forceExpanded?: boolean;
}) {
  const { 
    isDark, 
    textClass = isDark ? 'text-white' : 'text-gray-900', 
    mutedClass = isDark ? 'text-slate-400' : 'text-gray-500', 
    codeBgClass = isDark ? 'bg-slate-800' : 'bg-gray-50' 
  } = props;

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
      {/* Operation Header - Compact info bar */}
      {step.operationId && (
        <Card isDark={isDark}>
          <div className="flex items-center gap-2 flex-wrap">
            {httpMethod && (
              <Badge variant={getMethodBadgeVariant(httpMethod)} isDark={isDark} size="sm">
                {httpMethod}
              </Badge>
            )}
            <code className={`text-sm font-mono font-medium ${textClass}`}>{operationName}</code>
            {sourceForStep && (
              <Badge variant="source" isDark={isDark} size="xs">{sourceForStep.name}</Badge>
            )}
          </div>
          {step.description && (
            <MarkdownText content={step.description} isDark={isDark} variant="compact" className="mt-2" />
          )}
        </Card>
      )}

      {/* Workflow Reference */}
      {step.workflowId && (
        <Card title="Workflow Call" isDark={isDark} icon={
          <svg className={`w-3 h-3 ${isDark ? 'text-purple-400' : 'text-purple-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        }>
          <div className="flex items-center gap-2">
            <Badge variant="workflow" isDark={isDark} size="xs">workflow</Badge>
            <code className={`text-sm font-mono ${textClass}`}>{step.workflowId}</code>
          </div>
          {step.description && (
            <MarkdownText content={step.description} isDark={isDark} variant="compact" className="mt-2" />
          )}
        </Card>
      )}

      {/* Parameters */}
      {step.parameters && step.parameters.length > 0 && (
        <Card 
          title="Parameters" 
          isDark={isDark}
          badge={<Badge variant="info" isDark={isDark} size="xs">{step.parameters.length}</Badge>}
          icon={
            <svg className={`w-3 h-3 ${isDark ? 'text-indigo-400' : 'text-indigo-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          }
        >
          <div className="space-y-2">
            {/* Reusable parameter references */}
            {reusableParams.length > 0 && (
              <div className="space-y-1">
                {reusableParams.map((param, idx) => (
                  <div key={idx} className={`${codeBgClass} rounded p-2 border-l-2 border-cyan-400`}>
                    <ReusableRef reusable={param} isDark={isDark} onClick={onRefClick} />
                  </div>
                ))}
              </div>
            )}
            
            {/* Inline parameters */}
            {parameterItems.length > 0 && (
              <PropertyList 
                items={parameterItems}
                isDark={isDark}
                variant="compact"
                borderColor="border-indigo-400"
                maxItems={6}
                forceExpanded={forceExpanded}
              />
            )}
          </div>
        </Card>
      )}

      {/* Request Body */}
      {!!step.requestBody && (
        <Card 
          title="Request Body" 
          isDark={isDark}
          badge={step.requestBody?.contentType && <Badge variant="info" isDark={isDark} size="xs">{step.requestBody.contentType}</Badge>}
          icon={
            <svg className={`w-3 h-3 ${isDark ? 'text-blue-400' : 'text-blue-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          }
        >
          <div className="space-y-3">
            {/* Payload */}
            <div>
              <span className={`text-[10px] uppercase font-semibold ${mutedClass} block mb-1`}>Payload</span>
              <CodeBlock 
                code={typeof step.requestBody?.payload === 'string' ? step.requestBody.payload : JSON.stringify(step.requestBody?.payload, null, 2) || ''} 
                language="json" 
                isDark={isDark}
                maxHeight={150}
                forceExpanded={forceExpanded}
              />
            </div>
            
            {/* Schema Structure */}
            {requestBodySchema?.properties && (
              <div>
                <span className={`text-[10px] uppercase font-semibold ${mutedClass} block mb-1`}>Schema Structure</span>
                <div className="space-y-1">
                  {Object.entries(requestBodySchema.properties).map(([propName, propSchema]) => (
                    <SchemaViewer 
                      key={propName} 
                      name={propName} 
                      schema={propSchema} 
                      isDark={isDark} 
                    />
                  ))}
                </div>
              </div>
            )}
            
            {/* Payload Replacements */}
            {step.requestBody?.replacements && step.requestBody.replacements.length > 0 && (
              <PayloadReplacements 
                replacements={step.requestBody.replacements} 
                isDark={isDark} 
              />
            )}
          </div>
        </Card>
      )}

      {/* Response */}
      {(outputItems.length > 0 || step.successCriteria) && (
        <Card 
          title="Response" 
          isDark={isDark}
          badge={<Badge variant="success" isDark={isDark} size="xs">200</Badge>}
          icon={
            <svg className={`w-3 h-3 ${isDark ? 'text-emerald-400' : 'text-emerald-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          }
        >
          <div className="space-y-3">
            {/* Success Criteria */}
            {step.successCriteria && step.successCriteria.length > 0 && (
              <div>
                <span className={`text-[10px] uppercase font-semibold ${mutedClass} block mb-1`}>
                  Success Criteria ({step.successCriteria.length})
                </span>
                <div className="space-y-1.5">
                  {step.successCriteria.map((criteria, idx) => (
                    <CriterionBadge 
                      key={idx} 
                      criterion={criteria as Criterion} 
                      isDark={isDark} 
                      showDetails 
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Outputs Extraction */}
            {outputItems.length > 0 && (
              <div>
                <span className={`text-[10px] uppercase font-semibold ${mutedClass} block mb-1`}>
                  Extracted Outputs ({outputItems.length})
                </span>
                <PropertyList 
                  items={outputItems}
                  isDark={isDark}
                  variant="compact"
                  borderColor="border-amber-400"
                  maxItems={5}
                  forceExpanded={forceExpanded}
                />
              </div>
            )}

            {/* Response Schema */}
            {responseSchema?.properties && (
              <div>
                <span className={`text-[10px] uppercase font-semibold ${mutedClass} block mb-1`}>Schema Structure</span>
                <div className="space-y-1">
                  {Object.entries(responseSchema.properties).map(([name, schema]) => (
                    <SchemaViewer 
                      key={name} 
                      name={name} 
                      schema={schema} 
                      isDark={isDark} 
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Error Response - if onFailure is defined */}
      {step.onFailure && step.onFailure.length > 0 && (
        <Card 
          title="Error Handling" 
          isDark={isDark}
          badge={<Badge variant="error" isDark={isDark} size="xs">4XX/5XX</Badge>}
          icon={
            <svg className={`w-3 h-3 ${isDark ? 'text-red-400' : 'text-red-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
        >
          <ActionList
            actions={step.onFailure}
            type="failure"
            isDark={isDark}
            onStepClick={onStepClick}
            onRefClick={onRefClick}
          />
        </Card>
      )}

      {/* Extensions */}
      {extensions.length > 0 && (
        <Card 
          title="Extensions" 
          isDark={isDark}
          icon={
            <svg className={`w-3 h-3 ${isDark ? 'text-pink-400' : 'text-pink-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          }
        >
          <PropertyList 
            items={extensions}
            isDark={isDark}
            variant="compact"
            borderColor="border-pink-400"
            maxItems={5}
            forceExpanded={forceExpanded}
          />
        </Card>
      )}

      {/* Flow Control - onSuccess */}
      {step.onSuccess && step.onSuccess.length > 0 && (
        <Card 
          title="Next Steps" 
          isDark={isDark}
          icon={
            <svg className={`w-3 h-3 ${isDark ? 'text-emerald-400' : 'text-emerald-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          }
        >
          <ActionList
            actions={step.onSuccess}
            type="success"
            isDark={isDark}
            onStepClick={onStepClick}
            onRefClick={onRefClick}
          />
        </Card>
      )}
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

export function InputContent({ input, workflowInputs, ...props }: ContentProps & { input: { name: string; schema: Record<string, unknown> }; workflowInputs?: WorkflowInputs }) {
  const { 
    isDark, 
    textClass = isDark ? 'text-white' : 'text-gray-900', 
    mutedClass = isDark ? 'text-slate-400' : 'text-gray-500', 
    codeBgClass = isDark ? 'bg-slate-800' : 'bg-gray-50' 
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
        <Card title="Workflow Inputs" isDark={isDark}>
          <div className="flex items-center gap-2">
            <Badge variant="input" isDark={isDark} size="xs">{properties.length} input(s)</Badge>
          </div>
        </Card>

        {properties.length > 0 && (
          <Card title="Properties" isDark={isDark}>
            <div className="space-y-3">
              {properties.map(propName => (
                <SchemaViewer
                  key={propName}
                  name={propName}
                  schema={workflowInputs.properties![propName]}
                  required={workflowInputs.required?.includes(propName)}
                  isDark={isDark}
                />
              ))}
            </div>
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

export function OutputContent({ output, workflowOutputs, ...props }: ContentProps & { output: { name: string; value: string; stepId?: string; allOutputs?: Record<string, string> }; workflowOutputs?: Record<string, string> }) {
  const { 
    isDark, 
    textClass = isDark ? 'text-white' : 'text-gray-900', 
    mutedClass = isDark ? 'text-slate-400' : 'text-gray-500', 
    codeBgClass = isDark ? 'bg-slate-800' : 'bg-gray-50' 
  } = props;

  // Check if this is showing all outputs (from clicking on Output node)
  const isAllOutputs = output.name === 'Workflow Outputs' || (output.allOutputs && Object.keys(output.allOutputs).length > 0);
  const allOutputsData = output.allOutputs || workflowOutputs || {};

  if (isAllOutputs && Object.keys(allOutputsData).length > 0) {
    const outputItems = Object.entries(allOutputsData).map(([name, expression]) => ({
      name,
      value: typeof expression === 'string' ? expression : JSON.stringify(expression),
    }));

    return (
      <div className="space-y-4">
        <Card title="Workflow Outputs" isDark={isDark}>
          <Badge variant="output" isDark={isDark} size="xs">{Object.keys(allOutputsData).length} output(s)</Badge>
        </Card>

        <Card title="Outputs" isDark={isDark}>
          <PropertyList 
            items={outputItems}
            isDark={isDark}
            variant="compact"
            borderColor="border-amber-400"
            maxItems={6}
          />
        </Card>
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
