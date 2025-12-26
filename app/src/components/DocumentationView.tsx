'use client';

import { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import type { ArazzoSpec, Step, SourceDescription, Workflow } from '@/types/arazzo';
import { workflowToMermaidFlowchart, workflowToMermaidSequence } from '@/lib/mermaid-converter';
import StepCard from './StepCard';
import { MarkdownText } from './primitives';
import { SchemaViewer, SourceDescriptionsList, ArazzoSpecHeader, WorkflowList, WorkflowHeader, WorkflowBody } from './arazzo';
import { InputContent, OutputContent } from './DetailViews';

const MermaidDiagram = dynamic(() => import('@/components/MermaidDiagram'), { ssr: false });

interface DocumentationViewProps {
  spec: ArazzoSpec;
  isDark?: boolean;
  initialStepId?: string;
  initialWorkflowId?: string;
  expandAll?: boolean;
  editable?: boolean;
  onWorkflowUpdate?: (workflowId: string, updates: Partial<Workflow>) => void;
  onStepUpdate?: (workflowId: string, stepId: string, updates: Partial<Step>) => void;
  onReorderStep?: (workflowId: string, startIndex: number, endIndex: number) => void;
  onReorderInput?: (workflowId: string, startIndex: number, endIndex: number) => void;
  onReorderOutput?: (workflowId: string, startIndex: number, endIndex: number) => void;
  expressionSuggestions?: any[];
}



export default function DocumentationView({
  spec,
  isDark = false,
  initialStepId,
  initialWorkflowId,
  expandAll,
  editable = false,
  onWorkflowUpdate,
  onStepUpdate,
  onReorderStep,
  onReorderInput,
  onReorderOutput,
  expressionSuggestions = []
}: DocumentationViewProps) {
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
        <header className="mb-12 print:mb-8 pb-8 border-b print:border-b-2" style={{ borderColor: isDark ? '#334155' : '#e5e7eb' }}>
          <ArazzoSpecHeader
            info={spec.info}
            arazzoVersion={spec.arazzo}
            isDark={isDark}
            centered={true}
            size="lg"
          />
        </header>

        {/* Source Descriptions */}
        {spec.sourceDescriptions && spec.sourceDescriptions.length > 0 && (
          <section className="mb-10 print:mb-6">
            <h2 className="text-2xl font-bold mb-4 print:text-xl">API Sources</h2>
            <SourceDescriptionsList
              sources={spec.sourceDescriptions}
              isDark={isDark}
              showDescription={true}
            />
          </section>
        )}

        {/* Table of Contents */}
        <section className="mb-10 print:mb-6">
          <h2 className="text-2xl font-bold mb-4 print:text-xl">Table of Contents</h2>
          <WorkflowList
            workflows={spec.workflows}
            isDark={isDark}
            variant="toc"
            showSteps={true}
          />
        </section>

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
            editable={editable}
            onWorkflowUpdate={onWorkflowUpdate}
            onStepUpdate={onStepUpdate}
            onReorderInput={onReorderInput}
            onReorderOutput={onReorderOutput}
            expressionSuggestions={expressionSuggestions}
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
  editable?: boolean;
  onWorkflowUpdate?: (workflowId: string, updates: Partial<Workflow>) => void;
  onStepUpdate?: (workflowId: string, stepId: string, updates: Partial<Step>) => void;
  onReorderInput?: (workflowId: string, startIndex: number, endIndex: number) => void;
  onReorderOutput?: (workflowId: string, startIndex: number, endIndex: number) => void;
  expressionSuggestions?: any[];
}

function WorkflowSection({
  workflow,
  spec,
  workflowIndex,
  isDark,
  textClass,
  mutedClass,
  borderClass,
  codeBgClass,
  onStepClick,
  expandAll,
  editable,
  onWorkflowUpdate,
  onStepUpdate,
  onReorderInput,
  onReorderOutput,
  expressionSuggestions
}: WorkflowSectionProps) {
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
      {/* Workflow Header - Unified */}
      <WorkflowHeader
        workflow={workflow}
        index={workflowIndex}
        isDark={isDark}
        editable={editable}
        onUpdate={(updates) => onWorkflowUpdate?.(workflow.workflowId, updates)}
      />

      {/* Workflow Body - Unified (Inputs/Outputs) */}
      <WorkflowBody
        workflow={workflow}
        isDark={isDark}
        editable={editable}
        onUpdate={(updates) => onWorkflowUpdate?.(workflow.workflowId, updates)}
        onReorderInput={(start, end) => onReorderInput?.(workflow.workflowId, start, end)}
        onReorderOutput={(start, end) => onReorderOutput?.(workflow.workflowId, start, end)}
        expressionSuggestions={expressionSuggestions}
      />

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


