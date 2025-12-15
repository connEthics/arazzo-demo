'use client';

import { memo, useState } from 'react';
import type { ArazzoSpec } from '@/types/arazzo';
import { Badge, PageContainer, ContentCard, SectionHeader, CollapsibleSection } from './primitives';
import { SchemaViewer, SourceDescriptionsList, ArazzoSpecHeader, WorkflowList } from './arazzo';
import { getThemeClasses } from '@/hooks/useThemeClasses';

interface OverviewViewProps {
  spec: ArazzoSpec;
  isDark?: boolean;
  selectedWorkflow?: string;
  onWorkflowSelect?: (workflowId: string) => void;
}

function OverviewView({ spec, isDark = false, selectedWorkflow, onWorkflowSelect }: OverviewViewProps) {
  const theme = getThemeClasses(isDark);

  // Icons for section headers
  const SourcesIcon = (
    <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
    </svg>
  );
  const ComponentsIcon = (
    <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  );
  const WorkflowsIcon = (
    <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  );

  return (
    <PageContainer isDark={isDark}>
      {/* Arazzo Spec Header */}
      <ContentCard isDark={isDark}>
        <ArazzoSpecHeader
          info={spec.info}
          arazzoVersion={spec.arazzo}
          isDark={isDark}
        />
      </ContentCard>

      {/* Source Descriptions */}
      {spec.sourceDescriptions && spec.sourceDescriptions.length > 0 && (
        <ContentCard isDark={isDark}>
          <SectionHeader
            title="API Sources"
            icon={SourcesIcon}
            badge={<Badge variant="info" isDark={isDark} size="xs">{spec.sourceDescriptions.length}</Badge>}
            isDark={isDark}
          />
          <SourceDescriptionsList sources={spec.sourceDescriptions} isDark={isDark} />
        </ContentCard>
      )}

      {/* Components */}
      {spec.components && (
        <ContentCard isDark={isDark}>
          <SectionHeader
            title="Reusable Components"
            icon={ComponentsIcon}
            isDark={isDark}
          />
          <div className="space-y-4">
            {/* Schemas */}
            {spec.components.schemas && Object.keys(spec.components.schemas).length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-1 h-5 bg-violet-500 rounded-full`} />
                  <span className={`text-sm font-semibold ${theme.text}`}>Schemas</span>
                  <Badge variant="info" isDark={isDark} size="xs">{Object.keys(spec.components.schemas).length}</Badge>
                </div>
                <div className="space-y-2">
                  {Object.entries(spec.components.schemas).map(([name, schema]) => (
                    <SchemaViewer
                      key={name}
                      name={name}
                      schema={schema}
                      isDark={isDark}
                      defaultCollapsed={true}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Inputs */}
            {spec.components.inputs && Object.keys(spec.components.inputs).length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-1 h-5 bg-emerald-500 rounded-full`} />
                  <span className={`text-sm font-semibold ${theme.text}`}>Inputs</span>
                  <Badge variant="input" isDark={isDark} size="xs">{Object.keys(spec.components.inputs).length}</Badge>
                </div>
                <div className="space-y-2">
                  {Object.entries(spec.components.inputs).map(([name, input]) => (
                    <SchemaViewer
                      key={name}
                      name={name}
                      schema={input}
                      isDark={isDark}
                      defaultCollapsed={true}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Parameters */}
            {spec.components.parameters && Object.keys(spec.components.parameters).length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-1 h-5 bg-blue-500 rounded-full`} />
                  <span className={`text-sm font-semibold ${theme.text}`}>Parameters</span>
                  <Badge variant="info" isDark={isDark} size="xs">{Object.keys(spec.components.parameters).length}</Badge>
                </div>
                <div className="space-y-2">
                  {Object.entries(spec.components.parameters).map(([name, param]) => (
                    <div 
                      key={name}
                      className={`rounded border ${theme.border} ${isDark ? 'bg-slate-800' : 'bg-gray-50'} p-3`}
                    >
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <code className={`text-sm font-mono font-medium ${theme.text}`}>{name}</code>
                        {param.in && (
                          <Badge variant="info" isDark={isDark} size="xs">{param.in}</Badge>
                        )}
                      </div>
                      <div className={`text-xs ${theme.muted}`}>
                        <span className="font-medium">Value:</span>{' '}
                        <code className="font-mono">{typeof param.value === 'string' ? param.value : JSON.stringify(param.value)}</code>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Success Actions */}
            {spec.components.successActions && Object.keys(spec.components.successActions).length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-1 h-5 bg-green-500 rounded-full`} />
                  <span className={`text-sm font-semibold ${theme.text}`}>Success Actions</span>
                  <Badge variant="success" isDark={isDark} size="xs">{Object.keys(spec.components.successActions).length}</Badge>
                </div>
                <div className="space-y-2">
                  {Object.entries(spec.components.successActions).map(([name, action]) => (
                    <div 
                      key={name}
                      className={`rounded border ${theme.border} ${isDark ? 'bg-slate-800' : 'bg-gray-50'} p-3`}
                    >
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <code className={`text-sm font-mono font-medium ${theme.text}`}>{name}</code>
                        <Badge variant="success" isDark={isDark} size="xs">{action.type}</Badge>
                      </div>
                      {action.stepId && (
                        <div className={`text-xs ${theme.muted}`}>
                          <span className="font-medium">Step:</span>{' '}
                          <code className="font-mono">{action.stepId}</code>
                        </div>
                      )}
                      {action.workflowId && (
                        <div className={`text-xs ${theme.muted}`}>
                          <span className="font-medium">Workflow:</span>{' '}
                          <code className="font-mono">{action.workflowId}</code>
                        </div>
                      )}
                      {action.criteria && action.criteria.length > 0 && (
                        <div className={`text-xs ${theme.muted} mt-1`}>
                          <span className="font-medium">Criteria:</span>{' '}
                          {action.criteria.map((c, i) => (
                            <code key={i} className="font-mono block ml-2">{c.condition}</code>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Failure Actions */}
            {spec.components.failureActions && Object.keys(spec.components.failureActions).length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-1 h-5 bg-red-500 rounded-full`} />
                  <span className={`text-sm font-semibold ${theme.text}`}>Failure Actions</span>
                  <Badge variant="failure" isDark={isDark} size="xs">{Object.keys(spec.components.failureActions).length}</Badge>
                </div>
                <div className="space-y-2">
                  {Object.entries(spec.components.failureActions).map(([name, action]) => (
                    <div 
                      key={name}
                      className={`rounded border ${theme.border} ${isDark ? 'bg-slate-800' : 'bg-gray-50'} p-3`}
                    >
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <code className={`text-sm font-mono font-medium ${theme.text}`}>{name}</code>
                        <Badge variant="failure" isDark={isDark} size="xs">{action.type}</Badge>
                        {action.retryLimit !== undefined && (
                          <Badge variant="info" isDark={isDark} size="xs">retry: {action.retryLimit}x</Badge>
                        )}
                        {action.retryAfter !== undefined && (
                          <Badge variant="info" isDark={isDark} size="xs">after: {action.retryAfter}ms</Badge>
                        )}
                      </div>
                      {action.stepId && (
                        <div className={`text-xs ${theme.muted}`}>
                          <span className="font-medium">Step:</span>{' '}
                          <code className="font-mono">{action.stepId}</code>
                        </div>
                      )}
                      {action.workflowId && (
                        <div className={`text-xs ${theme.muted}`}>
                          <span className="font-medium">Workflow:</span>{' '}
                          <code className="font-mono">{action.workflowId}</code>
                        </div>
                      )}
                      {action.criteria && action.criteria.length > 0 && (
                        <div className={`text-xs ${theme.muted} mt-1`}>
                          <span className="font-medium">Criteria:</span>{' '}
                          {action.criteria.map((c, i) => (
                            <code key={i} className="font-mono block ml-2">{c.condition}</code>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ContentCard>
      )}

      {/* Workflows List */}
      <ContentCard isDark={isDark}>
        <SectionHeader
          title="Workflows"
          icon={WorkflowsIcon}
          badge={<Badge variant="step" isDark={isDark} size="xs">{spec.workflows.length}</Badge>}
          isDark={isDark}
        />
        <WorkflowList
          workflows={spec.workflows}
          isDark={isDark}
          selectedWorkflow={selectedWorkflow}
          onWorkflowSelect={onWorkflowSelect}
          variant="cards"
        />
      </ContentCard>
    </PageContainer>
  );
}

export default memo(OverviewView);
