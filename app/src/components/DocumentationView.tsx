'use client';

import { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import type { ArazzoSpec, Step, SourceDescription, Workflow } from '@/types/arazzo';
import { workflowToMermaidFlowchart, workflowToMermaidSequence } from '@/lib/mermaid-converter';

const MermaidDiagram = dynamic(() => import('@/components/MermaidDiagram'), { ssr: false });

interface DocumentationViewProps {
  spec: ArazzoSpec;
  isDark?: boolean;
  initialStepId?: string;
  initialWorkflowId?: string;
}

// Copy button component
function CopyButton({ text, isDark }: { text: string; isDark: boolean }) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`p-1.5 rounded transition-all print:hidden ${
        copied 
          ? 'bg-emerald-500 text-white' 
          : isDark 
            ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' 
            : 'bg-gray-200 hover:bg-gray-300 text-gray-600'
      }`}
      title={copied ? 'Copied!' : 'Copy to clipboard'}
    >
      {copied ? (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      )}
    </button>
  );
}

export default function DocumentationView({ spec, isDark = false, initialStepId, initialWorkflowId }: DocumentationViewProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

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
      {/* Print Button - Hidden in print */}
      <div className="print:hidden sticky top-0 z-10 p-4 border-b backdrop-blur bg-opacity-90 flex items-center justify-between" style={{ backgroundColor: isDark ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)' }}>
        <span className={`text-sm ${mutedClass}`}>Documentation Preview</span>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Print / Export PDF
        </button>
      </div>

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
            <p className={`text-base ${mutedClass} max-w-3xl mx-auto`}>{spec.info.description}</p>
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
                    <p className={`text-sm ${mutedClass} mt-2`}>{source.description}</p>
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
}

function WorkflowSection({ workflow, spec, workflowIndex, isDark, textClass, mutedClass, borderClass, codeBgClass, onStepClick }: WorkflowSectionProps) {
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
          <p className={`mt-3 ${mutedClass}`}>{workflow.description}</p>
        )}
      </div>

      {/* Two-column layout for inputs/outputs */}
      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        {/* Workflow Inputs */}
        {workflow.inputs && workflow.inputs.properties && Object.keys(workflow.inputs.properties).length > 0 && (
          <div className={`p-4 rounded-lg border ${borderClass} ${codeBgClass} avoid-break`}>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <span className="text-emerald-500">↓</span> Inputs
            </h3>
            <div className="space-y-2">
              {Object.entries(workflow.inputs.properties).map(([name, schema]) => (
                <div key={name} className={`p-2 rounded border-l-2 border-emerald-400 ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
                  <div className="flex items-center gap-2">
                    <code className="font-mono text-sm font-medium">{name}</code>
                    {workflow.inputs?.required?.includes(name) && (
                      <span className="text-[10px] px-1 py-0.5 rounded bg-red-100 text-red-600">required</span>
                    )}
                    {schema.type && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-gray-200 text-gray-600'}`}>
                        {schema.type}
                      </span>
                    )}
                  </div>
                  {schema.description && (
                    <p className={`text-xs ${mutedClass} mt-1`}>{schema.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Workflow Outputs */}
        {workflow.outputs && Object.keys(workflow.outputs).length > 0 && (
          <div className={`p-4 rounded-lg border ${borderClass} ${codeBgClass} avoid-break`}>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <span className="text-amber-500">↑</span> Outputs
            </h3>
            <div className="space-y-2">
              {Object.entries(workflow.outputs).map(([name, expression]) => (
                <div key={name} className={`p-2 rounded border-l-2 border-amber-400 ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
                  <code className="font-mono text-sm font-medium">{name}</code>
                  <code className={`text-xs ${mutedClass} font-mono block mt-1 break-all`}>{expression}</code>
                </div>
              ))}
            </div>
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
            />
          ))}
        </div>
      </div>
    </section>
  );
}

interface StepCardProps {
  step: Step;
  stepIndex: number;
  workflowId: string;
  allSteps: Step[];
  sources: SourceDescription[];
  isDark: boolean;
  textClass: string;
  mutedClass: string;
  borderClass: string;
  codeBgClass: string;
  onNavigate: (workflowId: string, stepId: string) => void;
}

function StepCard({ step, stepIndex, workflowId, allSteps, sources, isDark, textClass, mutedClass, borderClass, codeBgClass, onNavigate }: StepCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Find the source for this step
  const getSourceForStep = () => {
    if (step.operationId?.includes('.')) {
      const sourceName = step.operationId.split('.')[0];
      return sources.find(s => s.name === sourceName);
    }
    return sources[0];
  };

  const source = getSourceForStep();

  // Get HTTP method color (Swagger-style)
  const getMethodColor = (operationId: string) => {
    const opLower = operationId.toLowerCase();
    if (opLower.includes('get') || opLower.includes('find') || opLower.includes('list') || opLower.includes('search')) {
      return { bg: 'bg-blue-500', text: 'text-white', border: 'border-blue-500' };
    }
    if (opLower.includes('create') || opLower.includes('add') || opLower.includes('post')) {
      return { bg: 'bg-emerald-500', text: 'text-white', border: 'border-emerald-500' };
    }
    if (opLower.includes('update') || opLower.includes('put') || opLower.includes('patch')) {
      return { bg: 'bg-amber-500', text: 'text-white', border: 'border-amber-500' };
    }
    if (opLower.includes('delete') || opLower.includes('remove')) {
      return { bg: 'bg-red-500', text: 'text-white', border: 'border-red-500' };
    }
    return { bg: 'bg-indigo-500', text: 'text-white', border: 'border-indigo-500' };
  };

  const methodColor = step.operationId ? getMethodColor(step.operationId) : { bg: 'bg-gray-500', text: 'text-white', border: 'border-gray-500' };

  // Generate cURL-like request representation
  const generateRequestPreview = () => {
    const parts: string[] = [];
    
    if (step.operationId) {
      parts.push(`# Operation: ${step.operationId}`);
    }
    
    if (step.parameters && step.parameters.length > 0) {
      parts.push('\n# Parameters:');
      step.parameters.forEach(param => {
        const value = typeof param.value === 'string' ? param.value : JSON.stringify(param.value);
        parts.push(`${param.name}${param.in ? ` (${param.in})` : ''}: ${value}`);
      });
    }
    
    if (step.requestBody?.payload) {
      parts.push('\n# Request Body:');
      parts.push(JSON.stringify(step.requestBody.payload, null, 2));
    }
    
    return parts.join('\n');
  };

  // Generate response/output preview
  const generateOutputPreview = () => {
    if (!step.outputs || Object.keys(step.outputs).length === 0) return null;
    
    const parts: string[] = ['# Outputs:'];
    Object.entries(step.outputs).forEach(([name, expr]) => {
      parts.push(`${name}: ${expr}`);
    });
    
    return parts.join('\n');
  };

  const requestPreview = generateRequestPreview();
  const outputPreview = generateOutputPreview();

  // Parse goto targets for clickable links
  const renderGotoLink = (action: { type: string; stepId?: string; workflowId?: string }, isSuccess: boolean) => {
    const targetStepId = action.stepId;
    const targetWorkflowId = action.workflowId || workflowId;
    
    if (action.type === 'goto' && targetStepId) {
      return (
        <button
          onClick={() => onNavigate(targetWorkflowId, targetStepId)}
          className={`text-xs px-2 py-1 rounded inline-flex items-center gap-1 hover:ring-2 hover:ring-offset-1 transition-all cursor-pointer print:ring-0 ${
            isSuccess 
              ? 'bg-emerald-100 text-emerald-700 hover:ring-emerald-400' 
              : 'bg-red-100 text-red-700 hover:ring-red-400'
          }`}
        >
          {isSuccess ? '✓' : '✗'} goto
          <svg className="w-3 h-3 print:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
          <span className="font-mono font-semibold">{targetStepId}</span>
        </button>
      );
    }
    
    if (action.type === 'end') {
      return (
        <span className={`text-xs px-2 py-1 rounded ${isSuccess ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
          {isSuccess ? '✓' : '✗'} end
        </span>
      );
    }
    
    return (
      <span className={`text-xs px-2 py-1 rounded ${isSuccess ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
        {isSuccess ? '✓' : '✗'} {action.type} {action.stepId && `→ ${action.stepId}`}
      </span>
    );
  };

  return (
    <div 
      id={`step-${workflowId}-${step.stepId}`}
      className={`rounded-lg border overflow-hidden avoid-break transition-all ${borderClass} ${isDark ? 'bg-slate-800/50' : 'bg-white'}`}
    >
      {/* Swagger-style Header */}
      <div 
        className={`flex items-center gap-3 p-3 cursor-pointer hover:opacity-90 transition-opacity border-l-4 ${methodColor.border}`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className={`w-7 h-7 rounded flex items-center justify-center text-xs font-bold ${methodColor.bg} ${methodColor.text}`}>
          {stepIndex + 1}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-semibold text-base">{step.stepId}</h4>
            {step.operationId && (
              <code className={`text-xs px-2 py-0.5 rounded ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-gray-100 text-gray-600'}`}>
                {step.operationId}
              </code>
            )}
          </div>
          {step.description && (
            <p className={`text-sm ${mutedClass} mt-0.5 truncate`}>{step.description}</p>
          )}
        </div>
        <svg 
          className={`w-5 h-5 ${mutedClass} transition-transform print:hidden ${isExpanded ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Expandable Content - Always visible in print */}
      <div className={`border-t ${borderClass} ${isExpanded ? '' : 'hidden print:block'}`}>
        {/* Request Section - Swagger style */}
        <div className="p-4">
          <div className="grid lg:grid-cols-2 gap-4">
            {/* Request */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h5 className={`text-xs font-semibold uppercase ${mutedClass}`}>Request</h5>
                <CopyButton text={requestPreview} isDark={isDark} />
              </div>
              <div className={`rounded-lg ${isDark ? 'bg-slate-900' : 'bg-gray-900'} p-3 overflow-x-auto`}>
                <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap">{requestPreview}</pre>
              </div>
            </div>

            {/* Response/Outputs */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h5 className={`text-xs font-semibold uppercase ${mutedClass}`}>Outputs & Criteria</h5>
                {outputPreview && <CopyButton text={outputPreview} isDark={isDark} />}
              </div>
              <div className={`rounded-lg ${isDark ? 'bg-slate-900' : 'bg-gray-900'} p-3 overflow-x-auto`}>
                {/* Success Criteria */}
                {step.successCriteria && step.successCriteria.length > 0 && (
                  <div className="mb-3">
                    <span className="text-[10px] text-emerald-400 uppercase font-semibold">Success Criteria</span>
                    {step.successCriteria.map((criteria, idx) => (
                      <code key={idx} className="text-xs text-emerald-300 font-mono block mt-1">
                        {criteria.condition}
                      </code>
                    ))}
                  </div>
                )}
                
                {/* Outputs */}
                {outputPreview ? (
                  <pre className="text-xs text-amber-300 font-mono whitespace-pre-wrap">{outputPreview}</pre>
                ) : (
                  <span className="text-xs text-gray-500 italic">No outputs defined</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Flow Control - Clickable gotos */}
        {(step.onSuccess || step.onFailure) && (
          <div className={`px-4 pb-4 flex flex-wrap gap-2 items-center`}>
            <span className={`text-xs ${mutedClass} mr-2`}>Flow:</span>
            {step.onSuccess?.map((action, idx) => (
              <span key={`success-${idx}`}>
                {renderGotoLink(action, true)}
              </span>
            ))}
            {step.onFailure?.map((action, idx) => (
              <span key={`failure-${idx}`}>
                {renderGotoLink(action, false)}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
