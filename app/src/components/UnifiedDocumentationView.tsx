'use client';

import { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import type { ArazzoSpec, Step, SourceDescription, Workflow, WorkflowInputs, Components } from '@/types/arazzo';
import { workflowToMermaidFlowchart, workflowToMermaidSequence } from '@/lib/mermaid-converter';
import StepCard from './StepCard';
import { MarkdownText, Badge, EditableField, EditableListItem } from './primitives';
import { SchemaViewer, SourceDescriptionsList, ArazzoSpecHeader, WorkflowList, WorkflowHeader, WorkflowBody } from './arazzo';
import { InputContent, OutputContent } from './DetailViews';
import type { ExpressionSuggestion } from './ExpressionInput';
import type { OutputItem } from './primitives/EditableListItem';

const MermaidDiagram = dynamic(() => import('@/components/MermaidDiagram'), { ssr: false });

interface UnifiedDocumentationViewProps {
  spec: ArazzoSpec;
  isDark?: boolean;
  initialStepId?: string;
  initialWorkflowId?: string;
  expandAll?: boolean;
  onWorkflowSelect?: (workflowId: string) => void;
  onViewFlowchart?: (workflowId: string) => void;
  onViewSequence?: (workflowId: string) => void;
  /** Enable edit mode for steps */
  editable?: boolean;
  /** Callback to update a step (required for editable mode) */
  onStepUpdate?: (workflowId: string, stepId: string, updates: Partial<Step>) => void;
  /** Callback to update a workflow (required for editable mode) */
  onWorkflowUpdate?: (workflowId: string, updates: Partial<Workflow>) => void;
  /** Callback to update reusable components */
  onComponentsUpdate?: (updates: Partial<Components>) => void;
  /** Callback to delete reusable components */
  onComponentDelete?: (type: 'inputs' | 'schemas' | 'parameters', name: string) => void;
  onReorderStep?: (workflowId: string, startIndex: number, endIndex: number) => void;
  onReorderInput?: (workflowId: string, startIndex: number, endIndex: number) => void;
  onReorderOutput?: (workflowId: string, startIndex: number, endIndex: number) => void;
  /** Expression suggestions for autocomplete in edit mode */
  expressionSuggestions?: ExpressionSuggestion[];
}

/**
 * Unified Documentation View with Table of Contents
 * Combines spec-level info and all workflow details in a single scrollable view
 */
export default function UnifiedDocumentationView({
  spec,
  isDark = false,
  initialStepId,
  initialWorkflowId,
  expandAll,
  onWorkflowSelect,
  onViewFlowchart,
  onViewSequence,
  editable = false,
  onStepUpdate,
  onWorkflowUpdate,
  onComponentsUpdate,
  onComponentDelete,
  onReorderStep,
  onReorderInput,
  onReorderOutput,
  expressionSuggestions = [],
}: UnifiedDocumentationViewProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [activeSection, setActiveSection] = useState<string>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedWorkflows, setExpandedWorkflows] = useState<Set<string>>(new Set());
  const [editingComponents, setEditingComponents] = useState<Set<string>>(new Set());

  const toggleComponentEdit = (id: string) => {
    setEditingComponents(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Generate TOC entries with steps
  const tocEntries = useMemo(() => {
    const entries: Array<{
      id: string;
      label: string;
      type: 'section' | 'workflow' | 'step';
      workflowId?: string;
      stepId?: string;
    }> = [
        { id: 'overview', label: 'Overview', type: 'section' },
      ];

    if (spec.sourceDescriptions && spec.sourceDescriptions.length > 0) {
      entries.push({ id: 'sources', label: 'API Sources', type: 'section' });
    }

    if (spec.components) {
      entries.push({ id: 'components', label: 'Components', type: 'section' });
    }

    // Add each workflow with its steps
    spec.workflows.forEach((wf) => {
      const workflowId = wf.workflowId;
      entries.push({
        id: `workflow-${workflowId}`,
        label: wf.summary || workflowId,
        type: 'workflow',
        workflowId
      });

      // Add steps for this workflow (will be shown/hidden based on expansion)
      if (wf.steps && wf.steps.length > 0) {
        wf.steps.forEach((step, idx) => {
          entries.push({
            id: `step-${workflowId}-${step.stepId}`,
            label: `${idx + 1}. ${step.stepId}`,
            type: 'step',
            workflowId,
            stepId: step.stepId
          });
        });
      }
    });

    return entries;
  }, [spec]);

  // Filter TOC entries based on search
  const filteredTocEntries = useMemo(() => {
    if (!searchQuery.trim()) return tocEntries;

    const query = searchQuery.toLowerCase();
    const matchingWorkflows = new Set<string>();

    // First pass: find matching entries and their parent workflows
    const matches = tocEntries.filter((entry) => {
      const labelMatch = entry.label.toLowerCase().includes(query);
      const idMatch = entry.id.toLowerCase().includes(query);

      if (labelMatch || idMatch) {
        if (entry.type === 'step' && entry.workflowId) {
          matchingWorkflows.add(entry.workflowId);
        }
        return true;
      }
      return false;
    });

    // Second pass: include parent workflows of matching steps
    return tocEntries.filter((entry) => {
      if (matches.includes(entry)) return true;
      if (entry.type === 'workflow' && entry.workflowId && matchingWorkflows.has(entry.workflowId)) {
        return true;
      }
      return false;
    });
  }, [tocEntries, searchQuery]);

  // Toggle workflow expansion
  const toggleWorkflow = useCallback((workflowId: string) => {
    setExpandedWorkflows((prev) => {
      const next = new Set(prev);
      if (next.has(workflowId)) {
        next.delete(workflowId);
      } else {
        next.add(workflowId);
      }
      return next;
    });
  }, []);

  // Expand all workflows when searching
  useEffect(() => {
    if (searchQuery.trim()) {
      const workflowIds = spec.workflows.map(w => w.workflowId);
      setExpandedWorkflows(new Set(workflowIds));
    }
  }, [searchQuery, spec.workflows]);

  // Scroll to section
  const scrollToSection = useCallback((sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSection(sectionId);
    }
  }, []);

  // Scroll to step when clicking on Mermaid diagram
  const scrollToStep = useCallback((workflowId: string, stepId: string) => {
    const element = document.getElementById(`step-${workflowId}-${stepId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
    <div className="flex h-full overflow-hidden">
      {/* Table of Contents - Fixed Left Sidebar */}
      <aside className={`hidden lg:block w-64 border-r ${borderClass} ${bgClass} overflow-hidden flex-shrink-0 print:hidden flex flex-col`}>
        <div className={`p-4 sticky top-0 ${bgClass} border-b ${borderClass} z-10`}>
          <h3 className={`text-sm font-semibold mb-3 ${textClass}`}>Table of Contents</h3>
          {/* Search input */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full px-3 py-1.5 pl-8 text-xs rounded border ${isDark
                ? 'bg-slate-800 border-slate-600 text-white placeholder-slate-500 focus:border-indigo-500'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-indigo-500'
                } focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors`}
            />
            <svg
              className={`absolute left-2.5 top-2 w-3.5 h-3.5 ${mutedClass}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className={`absolute right-2 top-1.5 p-0.5 rounded ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-200'
                  } transition-colors`}
              >
                <svg className={`w-3 h-3 ${mutedClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
        <nav className="p-3 space-y-0.5 overflow-y-auto flex-1">
          {filteredTocEntries.map((entry) => {
            // Don't render steps that belong to collapsed workflows (unless searching)
            if (entry.type === 'step' && entry.workflowId && !expandedWorkflows.has(entry.workflowId) && !searchQuery.trim()) {
              return null;
            }

            const isWorkflow = entry.type === 'workflow';
            const isExpanded = isWorkflow && entry.workflowId && expandedWorkflows.has(entry.workflowId);
            const hasSteps = isWorkflow && entry.workflowId && spec.workflows.find(w => w.workflowId === entry.workflowId)?.steps?.length;

            return (
              <div key={entry.id}>
                <button
                  onClick={() => {
                    if (isWorkflow && entry.workflowId) {
                      if (hasSteps) {
                        toggleWorkflow(entry.workflowId);
                      }
                      scrollToSection(entry.id);
                    } else {
                      scrollToSection(entry.id);
                    }
                  }}
                  className={`w-full flex items-center gap-1.5 text-left px-3 py-1.5 rounded text-sm transition-colors ${activeSection === entry.id
                    ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium'
                    : `${mutedClass} hover:bg-slate-100 dark:hover:bg-slate-800`
                    } ${entry.type === 'step' ? 'pl-10 text-xs' :
                      entry.type === 'workflow' ? 'pl-4' : ''
                    }`}
                >
                  {isWorkflow && hasSteps && (
                    <svg
                      className={`w-3 h-3 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                  {entry.type === 'workflow' && !hasSteps && (
                    <span className="w-3 h-3 flex-shrink-0" />
                  )}
                  {entry.type === 'step' && (
                    <span className="mr-1 text-indigo-400">•</span>
                  )}
                  <span className="truncate">{entry.label}</span>
                </button>
              </div>
            );
          })}
          {filteredTocEntries.length === 0 && searchQuery && (
            <div className={`px-3 py-6 text-center text-xs ${mutedClass}`}>
              No results for &quot;{searchQuery}&quot;
            </div>
          )}
        </nav>
      </aside>

      {/* Main Content - Scrollable */}
      <div className={`flex-1 h-full overflow-auto print:overflow-visible print:h-auto ${bgClass}`} id="documentation-root">
        <div ref={contentRef} className={`max-w-7xl mx-auto px-6 lg:px-12 py-8 print:p-6 print:max-w-none ${textClass}`}>
          {/* Cover / Header */}
          <header id="overview" className="mb-12 print:mb-8 pb-8 border-b print:border-b-2" style={{ borderColor: isDark ? '#334155' : '#e5e7eb' }}>
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
            <section id="sources" className="mb-10 print:mb-6">
              <h2 className="text-2xl font-bold mb-4 print:text-xl">API Sources</h2>
              <SourceDescriptionsList
                sources={spec.sourceDescriptions}
                isDark={isDark}
                showDescription={true}
              />
            </section>
          )}

          {/* Components Section */}
          <section id="components" className="mb-10 print:mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold print:text-xl">Reusable Components</h2>
            </div>

            <div className="space-y-8">
              {/* Reusable Inputs */}
              {(spec.components?.inputs || editable) && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-5 bg-emerald-500 rounded-full" />
                      <span className={`text-sm font-semibold ${textClass}`}>Reusable Inputs</span>
                      {spec.components?.inputs && (
                        <Badge variant="info" isDark={isDark} size="xs">{Object.keys(spec.components.inputs).length}</Badge>
                      )}
                    </div>
                    {editable && (
                      <button
                        onClick={() => {
                          const name = `input_${Object.keys(spec.components?.inputs || {}).length + 1}`;
                          onComponentsUpdate?.({
                            inputs: {
                              ...(spec.components?.inputs || {}),
                              [name]: { type: 'object', properties: {} }
                            }
                          });
                        }}
                        className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add Input
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(spec.components?.inputs || {}).map(([name, inputs]) => {
                      const isEditing = editingComponents.has(`input:${name}`);
                      return (
                        <div key={name} className={`rounded-xl border ${borderClass} overflow-hidden bg-white dark:bg-slate-900 shadow-sm`}>
                          <div className={`px-4 py-2 border-b ${borderClass} bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between`}>
                            {editable && isEditing ? (
                              <EditableField
                                value={name}
                                onChange={(newName) => {
                                  if (newName === name) return;
                                  if (onComponentDelete) {
                                    onComponentDelete('inputs', name);
                                    onComponentsUpdate?.({ inputs: { [newName]: inputs } });
                                    // Update editing state for new name
                                    setEditingComponents(prev => {
                                      const next = new Set(prev);
                                      next.delete(`input:${name}`);
                                      next.add(`input:${newName}`);
                                      return next;
                                    });
                                  } else {
                                    const newInputs = { ...spec.components?.inputs };
                                    delete newInputs[name];
                                    newInputs[newName] = inputs;
                                    onComponentsUpdate?.({ inputs: newInputs });
                                  }
                                }}
                                isDark={isDark}
                                className="font-bold text-sm"
                                activationMode="click"
                              />
                            ) : (
                              <span className={`font-bold text-sm ${textClass}`}>{name}</span>
                            )}
                            <div className="flex items-center gap-2">
                              {editable && (
                                <button
                                  onClick={() => toggleComponentEdit(`input:${name}`)}
                                  className={`p-1 rounded transition-colors ${isEditing 
                                    ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' 
                                    : 'text-slate-400 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                                  title={isEditing ? "Done Editing" : "Edit Input"}
                                >
                                  {isEditing ? (
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                  ) : (
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                  )}
                                </button>
                              )}
                              {editable && isEditing && (
                                <button
                                  onClick={() => {
                                    if (onComponentDelete) {
                                      onComponentDelete('inputs', name);
                                    } else {
                                      const newInputs = { ...spec.components?.inputs };
                                      delete newInputs[name];
                                      onComponentsUpdate?.({ inputs: newInputs });
                                    }
                                  }}
                                  className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="p-4">
                            <InputContent
                              input={{ name: 'Workflow Inputs', schema: {} }}
                              workflowInputs={inputs}
                              title="Inputs"
                              isDark={isDark}
                              editable={editable && isEditing}
                              onUpdate={(updated) => {
                                onComponentsUpdate?.({
                                  inputs: { ...spec.components?.inputs, [name]: updated }
                                });
                              }}
                              expressionSuggestions={expressionSuggestions}
                            />
                          </div>
                        </div>
                      );
                    })}
                    {editable && Object.keys(spec.components?.inputs || {}).length === 0 && (
                      <div className={`col-span-full py-8 border-2 border-dashed ${borderClass} rounded-xl flex flex-col items-center justify-center ${mutedClass}`}>
                        <p className="text-sm">No reusable inputs defined</p>
                        <button
                          onClick={() => {
                            onComponentsUpdate?.({
                              inputs: { 'input1': { type: 'object', properties: {} } }
                            });
                          }}
                          className="mt-2 text-xs font-medium text-emerald-600 hover:underline"
                        >
                          Add your first reusable input
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Reusable Schemas */}
              {(spec.components?.schemas || editable) && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-5 bg-violet-500 rounded-full" />
                      <span className={`text-sm font-semibold ${textClass}`}>Schemas</span>
                      {spec.components?.schemas && (
                        <Badge variant="info" isDark={isDark} size="xs">{Object.keys(spec.components.schemas).length}</Badge>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(spec.components?.schemas || {}).map(([name, schema]) => {
                      const isEditing = editingComponents.has(`schema:${name}`);
                      return (
                        <div key={name} className={`rounded-xl border ${borderClass} overflow-hidden bg-white dark:bg-slate-900 shadow-sm flex flex-col`}>
                          <div className={`px-4 py-2 border-b ${borderClass} bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between`}>
                            {editable && isEditing ? (
                              <EditableField
                                value={name}
                                onChange={(newName) => {
                                  if (newName === name) return;
                                  if (onComponentDelete) {
                                    onComponentDelete('schemas', name);
                                    onComponentsUpdate?.({ schemas: { [newName]: schema } });
                                    // Update editing state for new name
                                    setEditingComponents(prev => {
                                      const next = new Set(prev);
                                      next.delete(`schema:${name}`);
                                      next.add(`schema:${newName}`);
                                      return next;
                                    });
                                  } else {
                                    const newSchemas = { ...spec.components?.schemas };
                                    delete newSchemas[name];
                                    newSchemas[newName] = schema;
                                    onComponentsUpdate?.({ schemas: newSchemas });
                                  }
                                }}
                                isDark={isDark}
                                className="font-bold text-sm"
                                activationMode="click"
                              />
                            ) : (
                              <span className={`font-bold text-sm ${textClass}`}>{name}</span>
                            )}
                            <div className="flex items-center gap-2">
                              {editable && (
                                <button
                                  onClick={() => toggleComponentEdit(`schema:${name}`)}
                                  className={`p-1 rounded transition-colors ${isEditing 
                                    ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' 
                                    : 'text-slate-400 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                                  title={isEditing ? "Done Editing" : "Edit Schema"}
                                >
                                  {isEditing ? (
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                  ) : (
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                  )}
                                </button>
                              )}
                              {editable && isEditing && (
                                <button
                                  onClick={() => {
                                    if (onComponentDelete) {
                                      onComponentDelete('schemas', name);
                                    } else {
                                      const newSchemas = { ...spec.components?.schemas };
                                      delete newSchemas[name];
                                      onComponentsUpdate?.({ schemas: newSchemas });
                                    }
                                  }}
                                  className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="p-4 flex-1">
                            <SchemaViewer
                              name={name}
                              schema={schema}
                              isDark={isDark}
                              defaultCollapsed={true}
                            />
                          </div>
                        </div>
                      );
                    })}
                    {editable && Object.keys(spec.components?.schemas || {}).length === 0 && (
                      <div className={`col-span-full py-8 border-2 border-dashed ${borderClass} rounded-xl flex flex-col items-center justify-center ${mutedClass}`}>
                        <p className="text-sm">No reusable schemas defined</p>
                        <button
                          onClick={() => {
                            onComponentsUpdate?.({
                              schemas: { 'User': { type: 'object', properties: {} } }
                            });
                          }}
                          className="mt-2 text-xs font-medium text-violet-600 hover:underline"
                        >
                          Add your first reusable schema
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Workflows - Individual sections for each */}
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
              onViewFlowchart={onViewFlowchart}
              onViewSequence={onViewSequence}
              codeBgClass={codeBgClass}
              onStepClick={scrollToStep}
              expandAll={expandAll}
              editable={editable}
              onStepUpdate={onStepUpdate ? (stepId, updates) => onStepUpdate(workflow.workflowId, stepId, updates) : undefined}
              onWorkflowUpdate={onWorkflowUpdate ? (updates) => onWorkflowUpdate(workflow.workflowId, updates) : undefined}
              onReorderInput={onReorderInput}
              onReorderOutput={onReorderOutput}
              expressionSuggestions={expressionSuggestions}
            />
          ))}

          {/* Footer */}
          <footer className={`mt-12 pt-6 border-t text-center text-sm ${mutedClass} print:mt-8`} style={{ borderColor: isDark ? '#334155' : '#e5e7eb' }}>
            <p>Generated with Arazzo Playground</p>
            <p className="mt-1">
              Made with ❤️ by <a href="https://connethics.com" className="text-indigo-600 hover:underline print:text-indigo-600">connethics.com</a>
            </p>
          </footer>
        </div>
      </div>

      {/* Print Styles */}
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
          
          * {
            overflow: visible !important;
          }
          
          footer {
            page-break-inside: avoid;
            margin-top: 2rem;
          }
          
          @page {
            margin: 1.5cm;
            size: A4;
          }
          
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
  onViewFlowchart?: (workflowId: string) => void;
  onViewSequence?: (workflowId: string) => void;
  expandAll?: boolean;
  /** Enable edit mode */
  editable?: boolean;
  /** Callback to update a step */
  onStepUpdate?: (stepId: string, updates: Partial<Step>) => void;
  /** Callback to update the workflow */
  onWorkflowUpdate?: (updates: Partial<Workflow>) => void;
  onReorderInput?: (workflowId: string, startIndex: number, endIndex: number) => void;
  onReorderOutput?: (workflowId: string, startIndex: number, endIndex: number) => void;
  /** Expression suggestions for autocomplete */
  expressionSuggestions?: ExpressionSuggestion[];
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
  onViewFlowchart,
  onViewSequence,
  expandAll,
  editable = false,
  onStepUpdate,
  onWorkflowUpdate,
  onReorderInput,
  onReorderOutput,
  expressionSuggestions = []
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

  // Can edit workflow?
  const canEditWorkflow = editable && !!onWorkflowUpdate;

  return (
    <section id={`workflow-${workflow.workflowId}`} className={`mb-16 print:mb-10 ${workflowIndex > 0 ? 'page-break' : ''}`}>
      {/* Workflow Header - Unified */}
      <WorkflowHeader
        workflow={workflow}
        index={workflowIndex}
        isDark={isDark}
        editable={editable}
        onUpdate={onWorkflowUpdate}
        variant="header"
      />

      {/* Workflow Body - Unified (Inputs/Outputs) */}
      <WorkflowBody
        workflow={workflow}
        isDark={isDark}
        editable={editable}
        onUpdate={onWorkflowUpdate}
        onReorderInput={(start, end) => onReorderInput?.(workflow.workflowId, start, end)}
        onReorderOutput={(start, end) => onReorderOutput?.(workflow.workflowId, start, end)}
        expressionSuggestions={expressionSuggestions}
      />

      {/* Diagrams - Full width, stacked vertically */}
      <div className="space-y-6 mb-8">
        {/* Flowchart Diagram */}
        {flowchartCode && (
          <div className={`p-4 rounded-lg border ${borderClass} avoid-break`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Flowchart</h3>
              {onViewFlowchart && (
                <button
                  onClick={() => onViewFlowchart(workflow.workflowId)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors ${isDark
                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                    }`}
                  title="Open flowchart view"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Open View
                </button>
              )}
            </div>
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
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Sequence Diagram</h3>
              {onViewSequence && (
                <button
                  onClick={() => onViewSequence(workflow.workflowId)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors ${isDark
                    ? 'bg-violet-600 hover:bg-violet-500 text-white'
                    : 'bg-violet-600 hover:bg-violet-500 text-white'
                    }`}
                  title="Open sequence view"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Open View
                </button>
              )}
            </div>
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
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Sequence Diagram</h3>
              {onViewSequence && (
                <button
                  onClick={() => onViewSequence(workflow.workflowId)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors ${isDark
                    ? 'bg-violet-600 hover:bg-violet-500 text-white'
                    : 'bg-violet-600 hover:bg-violet-500 text-white'
                    }`}
                  title="Open sequence view"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Open View
                </button>
              )}
            </div>
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
              editable={editable}
              onStepUpdate={onStepUpdate}
              expressionSuggestions={expressionSuggestions}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
