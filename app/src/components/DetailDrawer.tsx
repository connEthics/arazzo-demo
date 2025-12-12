'use client';

import { memo, useState } from 'react';
import type { Step, SourceDescription, WorkflowInputs } from '@/types/arazzo';
import OpenApiDetails from './OpenApiDetails';

// Types for different detail views
export type DetailType = 'step' | 'source' | 'input' | 'output';

export interface DetailData {
  type: DetailType;
  step?: Step;
  source?: SourceDescription;
  sourceForStep?: SourceDescription; // Source description for the step's API
  input?: { name: string; schema: Record<string, unknown> };
  output?: { name: string; value: string; stepId?: string };
}

interface DetailDrawerProps {
  data: DetailData | null;
  isDark?: boolean;
  onClose: () => void;
  workflowInputs?: WorkflowInputs;
}

function DetailDrawer({ data, isDark = false, onClose, workflowInputs }: DetailDrawerProps) {
  if (!data) return null;

  const bgClass = isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200';
  const textClass = isDark ? 'text-white' : 'text-gray-900';
  const mutedClass = isDark ? 'text-slate-400' : 'text-gray-500';
  const codeBgClass = isDark ? 'bg-slate-800' : 'bg-gray-50';

  return (
    <div className={`absolute right-0 top-0 bottom-0 w-96 ${bgClass} border-l shadow-2xl z-20 flex flex-col overflow-hidden`}>
      
      {/* Header */}
      <div className={`flex-shrink-0 flex items-center justify-between px-4 py-3 border-b ${isDark ? 'border-slate-800 bg-slate-800/50' : 'border-gray-100 bg-gray-50'}`}>
        <div className="flex items-center gap-2 min-w-0">
          {/* Type Badge */}
          <TypeBadge type={data.type} />
          
          {/* Title */}
          <h3 className={`font-medium text-sm truncate ${textClass}`}>
            {data.type === 'step' && data.step?.stepId}
            {data.type === 'source' && data.source?.name}
            {data.type === 'input' && data.input?.name}
            {data.type === 'output' && data.output?.name}
          </h3>
        </div>

        {/* Close */}
        <button
          onClick={onClose}
          className={`flex-shrink-0 p-1 rounded hover:bg-opacity-10 ${isDark ? 'hover:bg-white' : 'hover:bg-black'}`}
        >
          <svg className={`w-4 h-4 ${mutedClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Subtitle */}
      {data.type === 'step' && data.step?.description && (
        <div className={`flex-shrink-0 px-4 py-2 border-b text-xs ${isDark ? 'border-slate-800 text-slate-400' : 'border-gray-100 text-gray-500'}`}>
          {data.step.description}
        </div>
      )}
      {data.type === 'source' && data.source?.type && (
        <div className={`flex-shrink-0 px-4 py-2 border-b ${isDark ? 'border-slate-800' : 'border-gray-100'}`}>
          <span className={`text-[10px] px-1.5 py-0.5 rounded ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-gray-100 text-gray-600'}`}>
            {data.source.type.toUpperCase()}
          </span>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {data.type === 'step' && data.step && (
          <StepContent step={data.step} sourceForStep={data.sourceForStep} isDark={isDark} textClass={textClass} mutedClass={mutedClass} codeBgClass={codeBgClass} />
        )}
        {data.type === 'source' && data.source && (
          <SourceContent source={data.source} isDark={isDark} textClass={textClass} mutedClass={mutedClass} codeBgClass={codeBgClass} />
        )}
        {data.type === 'input' && data.input && (
          <InputContent input={data.input} isDark={isDark} textClass={textClass} mutedClass={mutedClass} codeBgClass={codeBgClass} workflowInputs={workflowInputs} />
        )}
        {data.type === 'output' && data.output && (
          <OutputContent output={data.output} isDark={isDark} textClass={textClass} mutedClass={mutedClass} codeBgClass={codeBgClass} />
        )}
      </div>
    </div>
  );
}

function TypeBadge({ type }: { type: DetailType }) {
  const colors = {
    step: 'bg-indigo-500 text-white',
    source: 'bg-purple-500 text-white',
    input: 'bg-emerald-500 text-white',
    output: 'bg-amber-500 text-white',
  };

  const labels = {
    step: 'Step',
    source: 'Source',
    input: 'Input',
    output: 'Output',
  };

  return (
    <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${colors[type]}`}>
      {labels[type]}
    </span>
  );
}

interface ContentProps {
  isDark: boolean;
  textClass: string;
  mutedClass: string;
  codeBgClass: string;
}

function StepContent({ step, sourceForStep, ...props }: ContentProps & { step: Step; sourceForStep?: SourceDescription }) {
  const { isDark, textClass, mutedClass, codeBgClass } = props;
  const [showOpenApi, setShowOpenApi] = useState(true);

  // Check if this is an OpenAPI operation
  const isOpenApiStep = step.operationId && !step.workflowId;

  return (
    <div className="space-y-4">
      {/* OpenAPI Details Toggle */}
      {isOpenApiStep && (
        <div className="space-y-2">
          <button
            onClick={() => setShowOpenApi(!showOpenApi)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              isDark ? 'bg-indigo-900/30 text-indigo-300 hover:bg-indigo-900/50' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
            }`}
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              OpenAPI Specification
            </span>
            <svg className={`w-4 h-4 transition-transform ${showOpenApi ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {showOpenApi && (
            <OpenApiDetails step={step} source={sourceForStep} isDark={isDark} />
          )}
        </div>
      )}

      {/* Operation */}
      {step.operationId && (
        <Card title="Operation" isDark={isDark}>
          <code className={`text-xs font-mono ${codeBgClass} px-2 py-1 rounded block ${textClass}`}>
            {step.operationId}
          </code>
        </Card>
      )}

      {/* Parameters */}
      {step.parameters && step.parameters.length > 0 && (
        <Card title="Parameters" isDark={isDark}>
          <div className="space-y-1.5 max-h-32 overflow-auto">
            {step.parameters.map((param, idx) => (
              <div key={idx} className={`${codeBgClass} rounded p-1.5 border-l-2 border-indigo-400`}>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[11px] font-medium ${textClass}`}>{param.name}</span>
                  {param.in && (
                    <span className={`text-[9px] ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-gray-200 text-gray-600'} px-1 py-0.5 rounded`}>
                      {param.in}
                    </span>
                  )}
                </div>
                <code className={`text-[10px] font-mono ${mutedClass} block mt-0.5 break-all`}>
                  {typeof param.value === 'string' ? param.value : JSON.stringify(param.value)}
                </code>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Request Body */}
      {step.requestBody && (
        <Card title="Request Body" isDark={isDark}>
          <div className={`${codeBgClass} rounded p-2 max-h-32 overflow-auto`}>
            {step.requestBody.contentType && (
              <div className={`text-[10px] ${mutedClass} mb-1`}>{step.requestBody.contentType}</div>
            )}
            <pre className={`text-[10px] font-mono ${textClass}`}>
              {JSON.stringify(step.requestBody.payload, null, 2)}
            </pre>
          </div>
        </Card>
      )}

      {/* Success Criteria */}
      {step.successCriteria && step.successCriteria.length > 0 && (
        <Card title="Success Criteria" isDark={isDark}>
          <div className="space-y-1 max-h-32 overflow-auto">
            {step.successCriteria.map((criteria, idx) => (
              <div key={idx} className={`${codeBgClass} rounded px-2 py-1 border-l-2 border-emerald-400`}>
                <code className={`text-[10px] font-mono ${textClass}`}>{criteria.condition}</code>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Outputs */}
      {step.outputs && Object.keys(step.outputs).length > 0 && (
        <Card title="Outputs" isDark={isDark}>
          <div className="space-y-1 max-h-32 overflow-auto">
            {Object.entries(step.outputs).map(([key, value]) => (
              <div key={key} className={`${codeBgClass} rounded px-2 py-1 border-l-2 border-amber-400`}>
                <span className={`text-[11px] font-medium ${textClass}`}>{key}</span>
                <code className={`text-[10px] font-mono ${mutedClass} block mt-0.5 break-all`}>{value}</code>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* onSuccess */}
      {step.onSuccess && step.onSuccess.length > 0 && (
        <Card title="On Success" isDark={isDark}>
          <div className="space-y-1 max-h-32 overflow-auto">
            {step.onSuccess.map((action, idx) => (
              <div key={idx} className={`${codeBgClass} rounded px-2 py-1 border-l-2 border-emerald-500`}>
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1 py-0.5 rounded">{action.type}</span>
                  {action.stepId && <code className={`text-[10px] font-mono ${mutedClass}`}>→ {action.stepId}</code>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* onFailure */}
      {step.onFailure && step.onFailure.length > 0 && (
        <Card title="On Failure" isDark={isDark}>
          <div className="space-y-1 max-h-32 overflow-auto">
            {step.onFailure.map((action, idx) => (
              <div key={idx} className={`${codeBgClass} rounded px-2 py-1 border-l-2 border-red-500`}>
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] bg-red-100 text-red-700 px-1 py-0.5 rounded">{action.type}</span>
                  {action.stepId && <code className={`text-[10px] font-mono ${mutedClass}`}>→ {action.stepId}</code>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function SourceContent({ source, ...props }: ContentProps & { source: SourceDescription }) {
  const { isDark, textClass, mutedClass } = props;

  return (
    <div className="space-y-4">
      <Card title="Name" isDark={isDark}>
        <span className={`text-sm font-medium ${textClass}`}>{source.name}</span>
      </Card>

      <Card title="Type" isDark={isDark}>
        <span className={`text-xs px-2 py-1 rounded ${source.type === 'openapi' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
          {source.type.toUpperCase()}
        </span>
      </Card>

      <Card title="URL" isDark={isDark}>
        <a 
          href={source.url} 
          target="_blank" 
          rel="noopener noreferrer"
          className={`text-xs font-mono ${isDark ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-500'} break-all hover:underline`}
        >
          {source.url}
        </a>
      </Card>

      {source.description && (
        <Card title="Description" isDark={isDark}>
          <p className={`text-sm ${mutedClass}`}>{source.description}</p>
        </Card>
      )}
    </div>
  );
}

function InputContent({ input, workflowInputs, ...props }: ContentProps & { input: { name: string; schema: Record<string, unknown> }; workflowInputs?: WorkflowInputs }) {
  const { isDark, textClass, mutedClass, codeBgClass } = props;
  
  // Get input schema from workflow inputs
  const inputSchema = workflowInputs?.properties?.[input.name];

  return (
    <div className="space-y-4">
      <Card title="Name" isDark={isDark}>
        <span className={`text-sm font-medium ${textClass}`}>{input.name}</span>
      </Card>

      {inputSchema?.type && (
        <Card title="Type" isDark={isDark}>
          <span className={`text-xs px-2 py-1 rounded ${codeBgClass} ${textClass}`}>
            {inputSchema.type}
            {inputSchema.format && ` (${inputSchema.format})`}
          </span>
        </Card>
      )}

      {workflowInputs?.required?.includes(input.name) && (
        <Card title="Required" isDark={isDark}>
          <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-700">Required</span>
        </Card>
      )}

      {inputSchema?.description && (
        <Card title="Description" isDark={isDark}>
          <p className={`text-sm ${mutedClass}`}>{inputSchema.description}</p>
        </Card>
      )}

      {inputSchema?.default !== undefined && (
        <Card title="Default Value" isDark={isDark}>
          <code className={`text-xs font-mono ${codeBgClass} px-2 py-1 rounded block ${textClass}`}>
            {JSON.stringify(inputSchema.default)}
          </code>
        </Card>
      )}

      {inputSchema?.enum && (
        <Card title="Allowed Values" isDark={isDark}>
          <div className="flex flex-wrap gap-1">
            {inputSchema.enum.map((val, idx) => (
              <span key={idx} className={`text-[10px] px-1.5 py-0.5 rounded ${codeBgClass} ${textClass}`}>
                {val}
              </span>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function OutputContent({ output, ...props }: ContentProps & { output: { name: string; value: string; stepId?: string } }) {
  const { isDark, textClass, codeBgClass } = props;

  return (
    <div className="space-y-4">
      <Card title="Name" isDark={isDark}>
        <span className={`text-sm font-medium ${textClass}`}>{output.name}</span>
      </Card>

      {output.stepId && (
        <Card title="Source Step" isDark={isDark}>
          <code className={`text-xs font-mono ${codeBgClass} px-2 py-1 rounded block ${textClass}`}>
            {output.stepId}
          </code>
        </Card>
      )}

      <Card title="Expression" isDark={isDark}>
        <code className={`text-xs font-mono ${codeBgClass} px-3 py-2 rounded block ${textClass} break-all`}>
          {output.value}
        </code>
      </Card>
    </div>
  );
}

function Card({ title, children, isDark, className = '' }: { title: string; children: React.ReactNode; isDark: boolean; className?: string }) {
  return (
    <div className={`${isDark ? 'bg-slate-800/50' : 'bg-gray-50'} rounded-lg p-3 ${className}`}>
      <h4 className={`text-[10px] uppercase font-semibold mb-2 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
        {title}
      </h4>
      {children}
    </div>
  );
}

export default memo(DetailDrawer);
