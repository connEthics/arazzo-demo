'use client';

import { memo, useState, useMemo } from 'react';
import type { Step, SourceDescription } from '@/types/arazzo';

interface OpenApiDetailsProps {
  step: Step;
  source?: SourceDescription;
  isDark?: boolean;
}

interface OpenApiOperation {
  summary?: string;
  description?: string;
  operationId?: string;
  tags?: string[];
  parameters?: OpenApiParameter[];
  requestBody?: {
    description?: string;
    required?: boolean;
    content?: Record<string, { schema?: OpenApiSchema; example?: unknown }>;
  };
  responses?: Record<string, OpenApiResponse>;
}

interface OpenApiParameter {
  name: string;
  in: string;
  description?: string;
  required?: boolean;
  schema?: OpenApiSchema;
  example?: unknown;
}

interface OpenApiResponse {
  description?: string;
  content?: Record<string, { schema?: OpenApiSchema; example?: unknown }>;
}

interface OpenApiSchema {
  type?: string;
  format?: string;
  description?: string;
  properties?: Record<string, OpenApiSchema>;
  items?: OpenApiSchema;
  required?: string[];
  enum?: string[];
  example?: unknown;
  $ref?: string;
}

function OpenApiDetails({ step, source, isDark = false }: OpenApiDetailsProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'parameters' | 'request' | 'responses'>('overview');

  const bgClass = isDark ? 'bg-slate-800' : 'bg-gray-50';
  const textClass = isDark ? 'text-white' : 'text-gray-900';
  const mutedClass = isDark ? 'text-slate-400' : 'text-gray-500';
  const borderClass = isDark ? 'border-slate-700' : 'border-gray-200';
  const codeBgClass = isDark ? 'bg-slate-900' : 'bg-gray-100';

  // Extract operation info from step
  const operationId = step.operationId?.includes('.') 
    ? step.operationId.split('.').pop() 
    : step.operationId;
  
  const method = extractHttpMethod(operationId);

  // Compute operation data from step info (in real app, fetch from OpenAPI spec)
  const operation = useMemo<OpenApiOperation | null>(() => {
    if (!step.operationId) return null;
    
    const opId = step.operationId.includes('.') 
      ? step.operationId.split('.').pop() 
      : step.operationId;
    
    return {
      operationId: opId,
      summary: step.description || `${opId} operation`,
      description: `Executes the ${opId} operation on the ${source?.name || 'API'} service.`,
      tags: source ? [source.name] : [],
      parameters: step.parameters?.map(p => ({
        name: p.name,
        in: p.in,
        required: true,
        description: `${p.name} parameter`,
        schema: { type: 'string' },
        example: p.value,
      })),
      requestBody: step.requestBody ? {
        required: true,
        description: 'Request payload',
        content: {
          [step.requestBody.contentType || 'application/json']: {
            schema: generateSchemaFromPayload(step.requestBody.payload),
            example: step.requestBody.payload,
          }
        }
      } : undefined,
      responses: {
        '200': {
          description: 'Successful response',
          content: step.outputs ? {
            'application/json': {
              schema: generateSchemaFromOutputs(step.outputs),
              example: Object.fromEntries(
                Object.entries(step.outputs).map(([k, v]) => [k, `<${v}>`])
              )
            }
          } : undefined
        },
        ...(step.onFailure?.length ? {
          '4XX': {
            description: 'Error response',
          }
        } : {})
      }
    };
  }, [step, source]);

  if (!step.operationId) {
    return (
      <div className={`p-4 rounded-lg ${bgClass} ${mutedClass} text-sm`}>
        No OpenAPI operation associated with this step.
      </div>
    );
  }

  return (
    <div className={`rounded-lg border ${borderClass} overflow-hidden`}>
      {/* Header */}
      <div className={`px-4 py-3 ${isDark ? 'bg-slate-800/50' : 'bg-gray-50'} border-b ${borderClass}`}>
        <div className="flex items-center gap-3">
          {method && (
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getMethodColor(method)}`}>
              {method}
            </span>
          )}
          <span className={`font-mono text-sm ${textClass}`}>{operationId}</span>
          {source && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${isDark ? 'bg-purple-900/50 text-purple-300' : 'bg-purple-100 text-purple-700'}`}>
              {source.name}
            </span>
          )}
        </div>
        {operation?.summary && (
          <p className={`mt-1 text-xs ${mutedClass}`}>{operation.summary}</p>
        )}
      </div>

      {/* Tabs */}
      <div className={`flex border-b ${borderClass}`}>
        {(['overview', 'parameters', 'request', 'responses'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-2 text-xs font-medium transition-colors ${
              activeTab === tab 
                ? (isDark ? 'bg-slate-800 text-indigo-400 border-b-2 border-indigo-400' : 'bg-white text-indigo-600 border-b-2 border-indigo-600')
                : (isDark ? 'text-slate-400 hover:text-slate-300' : 'text-gray-500 hover:text-gray-700')
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className={`p-4 ${isDark ? 'bg-slate-900/50' : 'bg-white'}`}>
        {activeTab === 'overview' && operation && (
          <div className="space-y-3">
            {operation.description && (
              <p className={`text-sm ${mutedClass}`}>{operation.description}</p>
            )}
            {operation.tags && operation.tags.length > 0 && (
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-medium ${mutedClass}`}>Tags:</span>
                {operation.tags.map(tag => (
                  <span key={tag} className={`text-[10px] px-1.5 py-0.5 rounded ${codeBgClass} ${textClass}`}>
                    {tag}
                  </span>
                ))}
              </div>
            )}
            {source?.url && (
              <div>
                <span className={`text-[10px] font-medium ${mutedClass}`}>API Spec: </span>
                <a 
                  href={source.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={`text-[10px] ${isDark ? 'text-indigo-400' : 'text-indigo-600'} hover:underline`}
                >
                  {source.url}
                </a>
              </div>
            )}
          </div>
        )}

        {activeTab === 'parameters' && (
          <div className="space-y-2">
            {operation?.parameters && operation.parameters.length > 0 ? (
              operation.parameters.map((param, idx) => (
                <div key={idx} className={`p-2 rounded ${codeBgClass}`}>
                  <div className="flex items-center gap-2">
                    <span className={`font-mono text-xs ${textClass}`}>{param.name}</span>
                    <span className={`text-[9px] px-1 py-0.5 rounded ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-gray-200 text-gray-600'}`}>
                      {param.in}
                    </span>
                    {param.required && (
                      <span className="text-[9px] px-1 py-0.5 rounded bg-red-100 text-red-700">required</span>
                    )}
                    {param.schema?.type && (
                      <span className={`text-[9px] ${mutedClass}`}>{param.schema.type}</span>
                    )}
                  </div>
                  {param.description && (
                    <p className={`text-[10px] mt-1 ${mutedClass}`}>{param.description}</p>
                  )}
                  {param.example !== undefined && (
                    <div className="mt-1">
                      <span className={`text-[9px] ${mutedClass}`}>Example: </span>
                      <code className={`text-[10px] font-mono ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                        {typeof param.example === 'string' ? param.example : JSON.stringify(param.example)}
                      </code>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className={`text-sm ${mutedClass}`}>No parameters defined</p>
            )}
          </div>
        )}

        {activeTab === 'request' && (
          <div className="space-y-3">
            {operation?.requestBody ? (
              <>
                {operation.requestBody.description && (
                  <p className={`text-xs ${mutedClass}`}>{operation.requestBody.description}</p>
                )}
                {operation.requestBody.content && Object.entries(operation.requestBody.content).map(([contentType, content]) => (
                  <div key={contentType}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-[10px] font-medium ${mutedClass}`}>Content-Type:</span>
                      <span className={`text-[10px] font-mono ${textClass}`}>{contentType}</span>
                    </div>
                    {content.schema && (
                      <div className={`p-2 rounded ${codeBgClass}`}>
                        <span className={`text-[10px] font-medium ${mutedClass}`}>Schema:</span>
                        <pre className={`text-[10px] font-mono mt-1 ${textClass} overflow-auto max-h-32`}>
                          {JSON.stringify(content.schema, null, 2)}
                        </pre>
                      </div>
                    )}
                    {content.example !== undefined && content.example !== null && (
                      <div className={`mt-2 p-2 rounded ${codeBgClass}`}>
                        <span className={`text-[10px] font-medium ${mutedClass}`}>Example:</span>
                        <pre className={`text-[10px] font-mono mt-1 ${isDark ? 'text-emerald-400' : 'text-emerald-600'} overflow-auto max-h-32`}>
                          {JSON.stringify(content.example, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </>
            ) : (
              <p className={`text-sm ${mutedClass}`}>No request body</p>
            )}
          </div>
        )}

        {activeTab === 'responses' && (
          <div className="space-y-3">
            {operation?.responses && Object.entries(operation.responses).map(([code, response]) => (
              <div key={code} className={`p-2 rounded ${codeBgClass}`}>
                <div className="flex items-center gap-2">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${getStatusColor(code)}`}>
                    {code}
                  </span>
                  <span className={`text-xs ${mutedClass}`}>{response.description}</span>
                </div>
                {response.content && Object.entries(response.content).map(([contentType, content]) => (
                  <div key={contentType} className="mt-2">
                    {content.schema && (
                      <div className="mb-2">
                        <span className={`text-[9px] ${mutedClass}`}>Schema:</span>
                        <pre className={`text-[9px] font-mono mt-1 ${textClass} overflow-auto max-h-24`}>
                          {JSON.stringify(content.schema, null, 2)}
                        </pre>
                      </div>
                    )}
                    {content.example !== undefined && content.example !== null && (
                      <div>
                        <span className={`text-[9px] ${mutedClass}`}>Example:</span>
                        <pre className={`text-[9px] font-mono mt-1 ${isDark ? 'text-emerald-400' : 'text-emerald-600'} overflow-auto max-h-24`}>
                          {JSON.stringify(content.example, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Utilities
function extractHttpMethod(operationId?: string): string | null {
  if (!operationId) return null;
  const op = operationId.toLowerCase();
  if (op.includes('get') || op.includes('find') || op.includes('list') || op.includes('search') || op.includes('retrieve')) return 'GET';
  if (op.includes('post') || op.includes('create') || op.includes('place') || op.includes('add') || op.includes('upsert')) return 'POST';
  if (op.includes('put') || op.includes('update')) return 'PUT';
  if (op.includes('delete') || op.includes('remove')) return 'DELETE';
  if (op.includes('patch')) return 'PATCH';
  return 'GET';
}

function getMethodColor(method: string): string {
  const colors: Record<string, string> = {
    GET: 'bg-emerald-100 text-emerald-700',
    POST: 'bg-blue-100 text-blue-700',
    PUT: 'bg-amber-100 text-amber-700',
    PATCH: 'bg-orange-100 text-orange-700',
    DELETE: 'bg-red-100 text-red-700',
  };
  return colors[method] || 'bg-gray-100 text-gray-700';
}

function getStatusColor(code: string): string {
  if (code.startsWith('2')) return 'bg-emerald-100 text-emerald-700';
  if (code.startsWith('3')) return 'bg-blue-100 text-blue-700';
  if (code.startsWith('4')) return 'bg-amber-100 text-amber-700';
  if (code.startsWith('5')) return 'bg-red-100 text-red-700';
  return 'bg-gray-100 text-gray-700';
}

function generateSchemaFromPayload(payload: Record<string, unknown>): OpenApiSchema {
  const properties: Record<string, OpenApiSchema> = {};
  
  for (const [key, value] of Object.entries(payload)) {
    if (typeof value === 'string') {
      properties[key] = { type: 'string', example: value };
    } else if (typeof value === 'number') {
      properties[key] = { type: 'number', example: value };
    } else if (typeof value === 'boolean') {
      properties[key] = { type: 'boolean', example: value };
    } else if (Array.isArray(value)) {
      properties[key] = { type: 'array', items: { type: 'string' } };
    } else if (typeof value === 'object' && value !== null) {
      properties[key] = generateSchemaFromPayload(value as Record<string, unknown>);
    }
  }
  
  return { type: 'object', properties };
}

function generateSchemaFromOutputs(outputs: Record<string, string>): OpenApiSchema {
  const properties: Record<string, OpenApiSchema> = {};
  
  for (const [key, value] of Object.entries(outputs)) {
    properties[key] = { 
      type: 'string', 
      description: `Extracted from: ${value}` 
    };
  }
  
  return { type: 'object', properties };
}

export default memo(OpenApiDetails);
