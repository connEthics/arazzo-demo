'use client';

import { memo, useState } from 'react';
import type { ArazzoSpec, Workflow, Step } from '@/types/arazzo';
import { Card, Badge, PropertyList, CodeBlock, PageContainer, ContentCard, SectionHeader, CollapsibleSection } from './primitives';
import { SchemaViewer, CriterionBadge, ActionList } from './arazzo';
import { getThemeClasses } from '@/hooks/useThemeClasses';
import { extractHttpMethod, METHOD_STYLES } from '@/lib/arazzo-utils';

interface IntroViewProps {
  spec: ArazzoSpec;
  workflow: Workflow;
  isDark?: boolean;
}

interface StepCardProps {
  step: Step;
  index: number;
  isDark: boolean;
  textClass: string;
  mutedClass: string;
  borderClass: string;
}

function StepCard({ step, index, isDark, textClass, mutedClass, borderClass }: StepCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const method = extractHttpMethod(step.operationId);
  const hasOutputs = step.outputs && Object.keys(step.outputs).length > 0;
  const hasSuccessCriteria = step.successCriteria && step.successCriteria.length > 0;
  const hasOnSuccess = step.onSuccess && step.onSuccess.length > 0;
  const hasOnFailure = step.onFailure && step.onFailure.length > 0;

  return (
    <div className={`rounded-lg border ${borderClass} ${isDark ? 'bg-slate-900' : 'bg-white'} overflow-hidden`}>
      {/* Header - clickable */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-4 py-3 flex items-center justify-between gap-3 text-left transition-colors ${
          isDark ? 'hover:bg-slate-800/50' : 'hover:bg-gray-50'
        }`}
      >
        <div className="flex items-center gap-3 flex-wrap min-w-0">
          <span className={`w-6 h-6 rounded-full ${isDark ? 'bg-indigo-600' : 'bg-indigo-500'} text-white text-xs font-bold flex items-center justify-center flex-shrink-0`}>
            {index + 1}
          </span>
          <code className={`font-mono text-sm ${textClass} truncate`}>{step.stepId}</code>
          {method && (
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border flex-shrink-0 ${METHOD_STYLES[method] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
              {method}
            </span>
          )}
          {step.operationId && (
            <span className={`text-xs ${mutedClass} font-mono hidden sm:inline truncate`}>{step.operationId}</span>
          )}
        </div>
        <svg 
          className={`w-4 h-4 ${mutedClass} transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Content - collapsible */}
      {isOpen && (
        <div className={`px-4 pb-4 pt-2 border-t ${borderClass} space-y-4`}>
          {/* Description */}
          {step.description && (
            <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
              {step.description}
            </p>
          )}

          {/* Parameters */}
          {step.parameters && step.parameters.length > 0 && (
            <Card title="Parameters" isDark={isDark}>
              <PropertyList
                items={step.parameters.map((p) => {
                  if (typeof p === 'object' && 'name' in p) {
                    return {
                      name: `${p.name} (${p.in || 'query'})`,
                      value: typeof p.value === 'string' ? p.value : JSON.stringify(p.value),
                    };
                  }
                  return { name: 'ref', value: String(p) };
                })}
                isDark={isDark}
                variant="compact"
                borderColor="border-blue-400"
              />
            </Card>
          )}

          {/* Request Body */}
          {step.requestBody?.payload && (
            <Card title="Request Body" isDark={isDark}>
              <div className="space-y-2">
                {step.requestBody.contentType && (
                  <Badge variant="info" isDark={isDark} size="xs">
                    {step.requestBody.contentType}
                  </Badge>
                )}
                <CodeBlock
                  code={JSON.stringify(step.requestBody.payload, null, 2)}
                  language="json"
                  isDark={isDark}
                  maxHeight={150}
                />
              </div>
            </Card>
          )}

          {/* Success Criteria */}
          {hasSuccessCriteria && (
            <Card title="Success Criteria" isDark={isDark}>
              <div className="flex flex-wrap gap-2">
                {step.successCriteria!.map((criterion, i) => (
                  <CriterionBadge key={i} criterion={criterion} isDark={isDark} />
                ))}
              </div>
            </Card>
          )}

          {/* Outputs */}
          {hasOutputs && (
            <Card title="Outputs" isDark={isDark}>
              <PropertyList
                items={Object.entries(step.outputs!).map(([name, expr]) => ({
                  name,
                  value: expr,
                }))}
                isDark={isDark}
                variant="compact"
                borderColor="border-purple-400"
              />
            </Card>
          )}

          {/* Actions */}
          {(hasOnSuccess || hasOnFailure) && (
            <div className="grid sm:grid-cols-2 gap-3">
              {hasOnSuccess && (
                <Card title="On Success" isDark={isDark}>
                  <ActionList actions={step.onSuccess!} type="success" isDark={isDark} />
                </Card>
              )}
              {hasOnFailure && (
                <Card title="On Failure" isDark={isDark}>
                  <ActionList actions={step.onFailure!} type="failure" isDark={isDark} />
                </Card>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function IntroView({ spec, workflow, isDark = false }: IntroViewProps) {
  const theme = getThemeClasses(isDark);

  const inputProperties = workflow.inputs?.properties || {};
  const inputCount = Object.keys(inputProperties).length;
  const outputCount = workflow.outputs ? Object.keys(workflow.outputs).length : 0;

  // Icons for section headers
  const InputIcon = (
    <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
    </svg>
  );
  const OutputIcon = (
    <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  );
  const StepsIcon = (
    <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
    </svg>
  );

  return (
    <PageContainer isDark={isDark}>
      {/* Workflow Header */}
      <ContentCard isDark={isDark}>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <Badge variant="step" isDark={isDark} size="sm">Workflow</Badge>
              <span className={`text-xs ${theme.muted}`}>from {spec.info.title}</span>
            </div>
            <h1 className={`text-2xl font-bold font-mono ${theme.text} mb-2`}>
              {workflow.workflowId}
            </h1>
            {workflow.summary && (
              <p className={`text-base ${isDark ? 'text-slate-300' : 'text-gray-600'} mb-2`}>
                {workflow.summary}
              </p>
            )}
            {workflow.description && (
              <p className={`text-sm ${theme.muted} leading-relaxed`}>
                {workflow.description}
              </p>
            )}
          </div>
          <div className={`flex-shrink-0 p-3 rounded-xl ${isDark ? 'bg-indigo-900/30' : 'bg-indigo-50'} border ${isDark ? 'border-indigo-800' : 'border-indigo-200'}`}>
            <div className="text-center">
              <div className={`text-2xl font-bold ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
                {workflow.steps?.length || 0}
              </div>
              <div className={`text-xs ${theme.muted}`}>steps</div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="flex flex-wrap gap-4 pt-4 border-t border-dashed" style={{ borderColor: isDark ? '#334155' : '#e5e7eb' }}>
          <div className="flex items-center gap-2">
            <Badge variant="input" isDark={isDark} size="xs">{inputCount}</Badge>
            <span className={`text-xs ${theme.muted}`}>inputs</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="output" isDark={isDark} size="xs">{outputCount}</Badge>
            <span className={`text-xs ${theme.muted}`}>outputs</span>
          </div>
          {workflow.dependsOn && workflow.dependsOn.length > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="info" isDark={isDark} size="xs">{workflow.dependsOn.length}</Badge>
              <span className={`text-xs ${theme.muted}`}>dependencies</span>
            </div>
          )}
        </div>
      </ContentCard>

      {/* Inputs */}
      {inputCount > 0 && (
        <ContentCard isDark={isDark}>
          <SectionHeader
            title="Workflow Inputs"
            icon={InputIcon}
            isDark={isDark}
          />
          <div className="space-y-3">
            {Object.entries(inputProperties).map(([name, schema]) => (
              <SchemaViewer
                key={name}
                name={name}
                schema={schema}
                required={workflow.inputs?.required?.includes(name)}
                isDark={isDark}
              />
            ))}
          </div>
        </ContentCard>
      )}

      {/* Outputs */}
      {outputCount > 0 && workflow.outputs && (
        <ContentCard isDark={isDark}>
          <SectionHeader
            title="Workflow Outputs"
            icon={OutputIcon}
            isDark={isDark}
          />
          <PropertyList
            items={Object.entries(workflow.outputs).map(([name, expr]) => ({
              name,
              value: expr,
            }))}
            isDark={isDark}
            variant="compact"
            borderColor="border-amber-400"
          />
        </ContentCard>
      )}

      {/* Steps */}
      <ContentCard isDark={isDark}>
        <SectionHeader
          title="Workflow Steps"
          icon={StepsIcon}
          badge={<Badge variant="step" isDark={isDark} size="xs">{workflow.steps?.length || 0}</Badge>}
          isDark={isDark}
        />
        
        {/* Steps Timeline */}
        <div className="relative">
          {/* Vertical line */}
          <div 
            className={`absolute left-3 top-0 bottom-0 w-0.5 ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}
            style={{ marginLeft: '11px' }}
          />
          
          <div className="space-y-3">
            {workflow.steps?.map((step, index) => (
              <div key={step.stepId} className="relative pl-10">
                <StepCard
                  step={step}
                  index={index}
                  isDark={isDark}
                  textClass={theme.text}
                  mutedClass={theme.muted}
                  borderClass={theme.border}
                />
              </div>
            ))}
          </div>
        </div>
      </ContentCard>
    </PageContainer>
  );
}

export default memo(IntroView);
