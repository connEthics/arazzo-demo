'use client';

import { memo } from 'react';
import type { Step } from '@/types/arazzo';

interface StepDetailPanelProps {
  step: Step;
  isDark?: boolean;
  onClose: () => void;
}

function StepDetailPanel({ step, isDark = false, onClose }: StepDetailPanelProps) {
  const bgClass = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200';
  const textClass = isDark ? 'text-white' : 'text-gray-900';
  const mutedClass = isDark ? 'text-slate-400' : 'text-gray-500';
  const codeBgClass = isDark ? 'bg-slate-900' : 'bg-gray-50';

  return (
    <div className={`absolute right-4 top-4 bottom-4 w-80 ${bgClass} border rounded-xl shadow-xl overflow-hidden flex flex-col z-10`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 border-b ${isDark ? 'border-slate-700 bg-slate-900/50' : 'border-gray-100 bg-gray-50'}`}>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase bg-indigo-500 text-white px-1.5 py-0.5 rounded">
            Step
          </span>
          <h3 className={`font-medium text-sm ${textClass}`}>{step.stepId}</h3>
        </div>
        <button
          onClick={onClose}
          className={`p-1 rounded hover:bg-opacity-10 ${isDark ? 'hover:bg-white' : 'hover:bg-black'}`}
        >
          <svg className={`w-4 h-4 ${mutedClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Description */}
        {step.description && (
          <Section title="Description" isDark={isDark}>
            <p className={`text-sm ${mutedClass}`}>{step.description}</p>
          </Section>
        )}

        {/* Operation */}
        {step.operationId && (
          <Section title="Operation" isDark={isDark}>
            <code className={`text-xs font-mono ${codeBgClass} px-2 py-1 rounded block ${textClass}`}>
              {step.operationId}
            </code>
          </Section>
        )}

        {/* Parameters */}
        {step.parameters && step.parameters.length > 0 && (
          <Section title="Parameters" isDark={isDark}>
            <div className="space-y-2">
              {step.parameters.map((param, idx) => (
                <div key={idx} className={`${codeBgClass} rounded p-2 border-l-2 border-indigo-400`}>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium ${textClass}`}>{param.name}</span>
                    {param.in && (
                      <span className={`text-[10px] ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-gray-200 text-gray-600'} px-1.5 py-0.5 rounded`}>
                        {param.in}
                      </span>
                    )}
                  </div>
                  <code className={`text-[10px] font-mono ${mutedClass} block mt-1 break-all`}>
                    {typeof param.value === 'string' ? param.value : JSON.stringify(param.value)}
                  </code>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Request Body */}
        {step.requestBody && (
          <Section title="Request Body" isDark={isDark}>
            <div className={`${codeBgClass} rounded p-2`}>
              {step.requestBody.contentType && (
                <div className={`text-[10px] ${mutedClass} mb-1`}>{step.requestBody.contentType}</div>
              )}
              <pre className={`text-[10px] font-mono ${textClass} overflow-auto max-h-32`}>
                {JSON.stringify(step.requestBody.payload, null, 2)}
              </pre>
            </div>
          </Section>
        )}

        {/* Success Criteria */}
        {step.successCriteria && step.successCriteria.length > 0 && (
          <Section title="Success Criteria" isDark={isDark}>
            <div className="space-y-1">
              {step.successCriteria.map((criteria, idx) => (
                <div key={idx} className={`${codeBgClass} rounded px-2 py-1 border-l-2 border-emerald-400`}>
                  <code className={`text-[10px] font-mono ${textClass}`}>{criteria.condition}</code>
                  {criteria.context && (
                    <div className={`text-[10px] ${mutedClass} mt-0.5`}>Context: {criteria.context}</div>
                  )}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Outputs */}
        {step.outputs && Object.keys(step.outputs).length > 0 && (
          <Section title="Outputs" isDark={isDark}>
            <div className="space-y-1">
              {Object.entries(step.outputs).map(([key, value]) => (
                <div key={key} className={`${codeBgClass} rounded px-2 py-1 border-l-2 border-amber-400`}>
                  <span className={`text-xs font-medium ${textClass}`}>{key}</span>
                  <code className={`text-[10px] font-mono ${mutedClass} block mt-0.5 break-all`}>{value}</code>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* onSuccess */}
        {step.onSuccess && step.onSuccess.length > 0 && (
          <Section title="On Success" isDark={isDark}>
            <div className="space-y-1">
              {step.onSuccess.map((action, idx) => (
                <div key={idx} className={`${codeBgClass} rounded px-2 py-1 border-l-2 border-emerald-500`}>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">{action.type}</span>
                    {action.name && <span className={`text-xs ${textClass}`}>{action.name}</span>}
                  </div>
                  {action.stepId && (
                    <code className={`text-[10px] font-mono ${mutedClass} block mt-0.5`}>→ {action.stepId}</code>
                  )}
                  {action.criteria && action.criteria.length > 0 && (
                    <div className={`text-[10px] ${mutedClass} mt-1`}>
                      Condition: {action.criteria[0].condition}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* onFailure */}
        {step.onFailure && step.onFailure.length > 0 && (
          <Section title="On Failure" isDark={isDark}>
            <div className="space-y-1">
              {step.onFailure.map((action, idx) => (
                <div key={idx} className={`${codeBgClass} rounded px-2 py-1 border-l-2 border-red-500`}>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded">{action.type}</span>
                    {action.name && <span className={`text-xs ${textClass}`}>{action.name}</span>}
                  </div>
                  {action.stepId && (
                    <code className={`text-[10px] font-mono ${mutedClass} block mt-0.5`}>→ {action.stepId}</code>
                  )}
                  {action.criteria && action.criteria.length > 0 && (
                    <div className={`text-[10px] ${mutedClass} mt-1`}>
                      Condition: {action.criteria[0].condition}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}

function Section({ title, children, isDark }: { title: string; children: React.ReactNode; isDark?: boolean }) {
  return (
    <div>
      <h4 className={`text-[10px] uppercase font-semibold mb-1.5 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
        {title}
      </h4>
      {children}
    </div>
  );
}

export default memo(StepDetailPanel);
