'use client';

import { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import type { ArazzoSpec, Step, SourceDescription, Workflow } from '@/types/arazzo';
import { workflowToMermaidFlowchart, workflowToMermaidSequence } from '@/lib/mermaid-converter';
import StepCard from './StepCard';
import { MarkdownText } from './primitives';
import { SchemaViewer } from './arazzo';
import { InputContent, OutputContent } from './DetailViews';

const MermaidDiagram = dynamic(() => import('@/components/MermaidDiagram'), { ssr: false });

interface DocumentationViewProps {
  spec: ArazzoSpec;
  isDark?: boolean;
  initialStepId?: string;
  initialWorkflowId?: string;
  expandAll?: boolean;
}



export default function DocumentationView({ spec, isDark = false, initialStepId, initialWorkflowId, expandAll }: DocumentationViewProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  // Scroll to step when clicking on Mermaid diagram
  const scrollToStep = useCallback((workflowId: string, stepId: string) => {
    const element = document.getElementById(`step-${workflowId}-${stepId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Highlight effect
      element.classList.add('ring-2', 'ring-indigo-500', 'ring-offset-2');
      setTimeout(() => {
        element.classList.remove('ring-2', 'ring-indigo-500', 'ring-offset-2');
      }, 2000);
    }
  }, []);

  // Initial scroll on mount
  useEffect(() => {
    if (initialStepId && initialWorkflowId) {
      setTimeout(() => scrollToStep(initialWorkflowId, initialStepId), 500);
    }
  }, [initialStepId, initialWorkflowId, scrollToStep]);

  const bgClass = isDark ? 'bg-slate-900' : 'bg-white';
  const textClass = isDark ? 'text-white' : 'text-gray-900';
  const mutedClass = isDark ? 'text-slate-400' : 'text-gray-500';
  const borderClass = isDark ? 'border-slate-700' : 'border-gray-200';
  const codeBgClass = isDark ? 'bg-slate-800' : 'bg-gray-50';

  return (
    <div className={`h-full overflow-auto print:overflow-visible print:h-auto ${bgClass}`} id="documentation-root">
      {/* Documentation Content - Full width for better use of screen space */}
      <div ref={contentRef} className={`max-w-7xl mx-auto px-6 lg:px-12 py-8 print:p-6 print:max-w-none ${textClass}`}>
        {/* Cover / Header */}
        <header className="text-center mb-12 print:mb-8 pb-8 border-b print:border-b-2" style={{ borderColor: isDark ? '#334155' : '#e5e7eb' }}>
          <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center print:hidden">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold mb-2 print:text-3xl">{spec.info.title}</h1>
          <p className={`text-lg ${mutedClass} mb-4`}>Version {spec.info.version}</p>
          {spec.info.description && (
            <div className="max-w-3xl mx-auto">
              <MarkdownText content={spec.info.description} isDark={isDark} />
            </div>
          )}
          <div className={`mt-6 inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-gray-100 text-gray-600'}`}>
            <span>Arazzo Specification</span>
            <span className="font-mono">{spec.arazzo}</span>
          </div>
        </header>

        {/* Source Descriptions */}
        {spec.sourceDescriptions && spec.sourceDescriptions.length > 0 && (
          <section className="mb-10 print:mb-6">
            <h2 className="text-2xl font-bold mb-4 print:text-xl">API Sources</h2>
            <div className="grid md:grid-cols-2 gap-3">
              {spec.sourceDescriptions.map((source, idx) => (
                <div key={idx} className={`p-4 rounded-lg border ${borderClass} ${codeBgClass}`}>
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`text-xs font-semibold uppercase px-2 py-0.5 rounded ${source.type === 'openapi' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                      {source.type}
                    </span>
                    <span className="font-semibold">{source.name}</span>
                  </div>
                  <code className={`text-xs ${mutedClass} break-all`}>{source.url}</code>
                  {source.description && (
                    <MarkdownText content={source.description} isDark={isDark} variant="compact" className="mt-2" />
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Table of Contents */}
        <section className="mb-10 print:mb-6">
          <h2 className="text-2xl font-bold mb-4 print:text-xl">Table of Contents</h2>
          <nav className={`p-4 rounded-lg border ${borderClass} ${codeBgClass}`}>
            <ol className="list-decimal list-inside space-y-3">
              {/* Schemas section in TOC */}
              {spec.components?.schemas && Object.keys(spec.components.schemas).length > 0 && (
                <li className="space-y-1">
                  <a href="#schemas" className="text-indigo-600 hover:underline font-medium">
                    Data Models
                  </a>
                  <span className={`text-sm ${mutedClass} ml-2`}>— {Object.keys(spec.components.schemas).length} schema(s)</span>
                </li>
              )}
              {/* Workflows */}
              {spec.workflows.map((workflow, idx) => (
                <li key={workflow.workflowId} className="space-y-1">
                  <a href={`#workflow-${workflow.workflowId}`} className="text-indigo-600 hover:underline font-medium">
                    {workflow.summary || workflow.workflowId}
                  </a>
                  {workflow.description && (
                    <span className={`text-sm ${mutedClass} ml-2`}>— {workflow.description.slice(0, 80)}{workflow.description.length > 80 ? '...' : ''}</span>
                  )}
                  {/* Steps sub-list */}
                  <ol className="list-none ml-6 mt-2 space-y-1">
                    {workflow.steps.map((step, stepIdx) => (
                      <li key={step.stepId}>
                        <a 
                          href={`#step-${workflow.workflowId}-${step.stepId}`} 
                          className={`text-sm hover:text-indigo-600 hover:underline ${mutedClass}`}
                        >
                          {stepIdx + 1}. {step.stepId}
                        </a>
                      </li>
                    ))}
                  </ol>
                </li>
              ))}
            </ol>
          </nav>
        </section>

        {/* Component Schemas Section */}
        {spec.components?.schemas && Object.keys(spec.components.schemas).length > 0 && (
          <section id="schemas" className="mb-16 print:mb-10">
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <span className={`text-xs font-semibold uppercase px-2 py-1 rounded bg-indigo-100 text-indigo-700`}>
                  Data Models
                </span>
                <h2 className="text-2xl font-bold print:text-xl">Component Schemas</h2>
              </div>
              <p className={`mt-2 ${mutedClass}`}>
                Reusable data structures and schema definitions used across workflows.
              </p>
            </div>
            <SchemaViewer 
              schemas={spec.components.schemas} 
              isDark={isDark}
              forceExpanded={expandAll}
            />
          </section>
        )}

        {/* Workflows */}
        {spec.workflows.map((workflow, workflowIdx) => (
          <WorkflowSection 
            key={workflow.workflowId}
            workflow={workflow}
            spec={spec}
            workflowIndex={workflowIdx}
            isDark={isDark}
            textClass={textClass}
            mutedClass={mutedClass}
            borderClass={borderClass}
            codeBgClass={codeBgClass}
            onStepClick={scrollToStep}
            expandAll={expandAll}
          />
        ))}

        {/* Footer - Properly positioned for print */}
        <footer className={`mt-12 pt-6 border-t text-center text-sm ${mutedClass} print:mt-8`} style={{ borderColor: isDark ? '#334155' : '#e5e7eb' }}>
          <p>Generated with Arazzo Playground</p>
          <p className="mt-1">
            Made with ❤️ by <a href="https://connethics.com" className="text-indigo-600 hover:underline print:text-indigo-600">connethics.com</a>
          </p>
        </footer>
      </div>

      {/* Print Styles - Enhanced for full page printing */}
      <style jsx global>{`
        @media print {
          html, body {
            height: auto !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          #documentation-root {
            height: auto !important;
            overflow: visible !important;
          }
          
          .print\\:hidden {
            display: none !important;
          }
          
          .page-break {
            page-break-before: always;
          }
          
          .avoid-break {
            page-break-inside: avoid;
          }
          
          /* Ensure all content is printed */
          * {
            overflow: visible !important;
          }
          
          /* Footer positioning */
          footer {
            page-break-inside: avoid;
            margin-top: 2rem;
          }
          
          @page {
            margin: 1.5cm;
            size: A4;
          }
          
          /* Better code blocks for print */
          pre, code {
            white-space: pre-wrap !important;
            word-wrap: break-word !important;
          }
        }
      `}</style>
    </div>
  );
}

interface WorkflowSectionProps {
  workflow: Workflow;
  spec: ArazzoSpec;
  workflowIndex: number;
  isDark: boolean;
  textClass: string;
  mutedClass: string;
  borderClass: string;
  codeBgClass: string;
  onStepClick: (workflowId: string, stepId: string) => void;
  expandAll?: boolean;
}

function WorkflowSection({ workflow, spec, workflowIndex, isDark, textClass, mutedClass, borderClass, codeBgClass, onStepClick, expandAll }: WorkflowSectionProps) {
  // Generate Mermaid diagrams without errors
  const flowchartCode = useMemo(() => {
    try {
      return workflowToMermaidFlowchart(spec, workflow.workflowId, { hideErrorFlows: true });
    } catch {
      return '';
    }
  }, [spec, workflow.workflowId]);

  const sequenceCode = useMemo(() => {
    try {
      return workflowToMermaidSequence(spec, workflow.workflowId, { hideErrorFlows: true, hideOutputs: false, showStepNames: true });
    } catch {
      return '';
    }
  }, [spec, workflow.workflowId]);

  // Handle click on Mermaid diagram nodes
  const handleMermaidClick = useCallback((stepId: string) => {
    onStepClick(workflow.workflowId, stepId);
  }, [workflow.workflowId, onStepClick]);

  return (
    <section id={`workflow-${workflow.workflowId}`} className={`mb-16 print:mb-10 ${workflowIndex > 0 ? 'page-break' : ''}`}>
      {/* Workflow Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <span className={`text-xs font-semibold uppercase px-2 py-1 rounded bg-indigo-100 text-indigo-700`}>
            Workflow {workflowIndex + 1}
          </span>
          <h2 className="text-2xl font-bold print:text-xl">{workflow.summary || workflow.workflowId}</h2>
        </div>
        <code className={`text-sm ${mutedClass} font-mono`}>{workflow.workflowId}</code>
        {workflow.description && (
          <div className="mt-3">
            <MarkdownText content={workflow.description} isDark={isDark} />
          </div>
        )}
      </div>

      {/* Two-column layout for inputs/outputs */}
      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        {/* Workflow Inputs */}
        {workflow.inputs && workflow.inputs.properties && Object.keys(workflow.inputs.properties).length > 0 && (
          <div className="avoid-break">
            <InputContent 
              input={{ name: 'Workflow Inputs', schema: {} }} 
              workflowInputs={workflow.inputs}
              isDark={isDark}
              textClass={textClass}
              mutedClass={mutedClass}
              codeBgClass={codeBgClass}
            />
          </div>
        )}

        {/* Workflow Outputs */}
        {workflow.outputs && Object.keys(workflow.outputs).length > 0 && (
          <div className="avoid-break">
            <OutputContent 
              output={{ name: 'Workflow Outputs', value: '', allOutputs: workflow.outputs }}
              workflowOutputs={workflow.outputs}
              isDark={isDark}
              textClass={textClass}
              mutedClass={mutedClass}
              codeBgClass={codeBgClass}
            />
          </div>
        )}
      </div>

      {/* Diagrams - Full width, stacked vertically */}
      <div className="space-y-6 mb-8">
        {/* Flowchart Diagram */}
        {flowchartCode && (
          <div className={`p-4 rounded-lg border ${borderClass} avoid-break`}>
            <h3 className="text-lg font-semibold mb-3">Flowchart</h3>
            <div className="overflow-x-auto" style={{ minHeight: '300px' }}>
              <MermaidDiagram 
                chart={flowchartCode} 
                isDark={isDark}
                steps={workflow.steps}
                onNodeClick={handleMermaidClick}
              />
            </div>
          </div>
        )}

        {/* Sequence Diagram */}
        {sequenceCode && (
          <div className={`p-4 rounded-lg border ${borderClass} avoid-break`}>
            <h3 className="text-lg font-semibold mb-3">Sequence Diagram</h3>
            <div className="overflow-x-auto" style={{ minHeight: '300px' }}>
              <MermaidDiagram 
                chart={sequenceCode} 
                isDark={isDark}
                steps={workflow.steps}
                onNodeClick={handleMermaidClick}
              />
            </div>
          </div>
        )}
      </div>

      {/* Steps - Swagger-inspired layout */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4">Steps ({workflow.steps.length})</h3>
        <div className="space-y-4">
          {workflow.steps.map((step, stepIdx) => (
            <StepCard 
              key={step.stepId} 
              step={step} 
              stepIndex={stepIdx}
              workflowId={workflow.workflowId}
              allSteps={workflow.steps}
              sources={spec.sourceDescriptions || []}
              isDark={isDark}
              textClass={textClass}
              mutedClass={mutedClass}
              borderClass={borderClass}
              codeBgClass={codeBgClass}
              onNavigate={onStepClick}
              forceExpanded={expandAll}
            />
          ))}
        </div>
      </div>
    </section>
  );
}


