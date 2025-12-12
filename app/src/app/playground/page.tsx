'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Node, Edge } from '@xyflow/react';
import ArazzoFlow from '@/components/ArazzoFlow';
import DetailDrawer, { DetailData } from '@/components/DetailDrawer';
import DocumentationView from '@/components/DocumentationView';
import { parseArazzoSpec, workflowToFlow } from '@/lib/arazzo-parser';
import { workflowToMermaidFlowchart, workflowToMermaidSequence } from '@/lib/mermaid-converter';
import { ArazzoSpec, Step } from '@/types/arazzo';

// Dynamic imports for SSR safety
const MermaidDiagram = dynamic(() => import('@/components/MermaidDiagram'), { ssr: false });
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

type ViewMode = 'reactflow' | 'mermaid-flowchart' | 'mermaid-sequence' | 'documentation';

// Icons
const SunIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const MoonIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
  </svg>
);

const ChevronLeftIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

const ExpandIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
  </svg>
);

const CollapseIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.5 3.5M9 15v4.5M9 15H4.5M9 15l-5.5 5.5M15 9h4.5M15 9V4.5M15 9l5.5-5.5M15 15h4.5M15 15v4.5m0-4.5l5.5 5.5" />
  </svg>
);

const DocumentIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const InfoIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

// Example YAML for quick testing
const EXAMPLE_YAML = `arazzo: 1.0.1
info:
  title: Pet Adoption Workflow
  version: 1.0.0
  description: A workflow for adopting a pet from the store

sourceDescriptions:
  - name: petstore
    type: openapi
    url: ./petstore.yaml

workflows:
  - workflowId: adopt-pet
    summary: Complete pet adoption process
    description: Search for available pets, select one, and complete the adoption
    inputs:
      type: object
      properties:
        petType:
          type: string
          enum: [dog, cat, bird]
        maxPrice:
          type: number
    steps:
      - stepId: find-available-pets
        operationId: findPetsByStatus
        parameters:
          - name: status
            in: query
            value: available
        successCriteria:
          - condition: $statusCode == 200
        outputs:
          availablePets: $response.body
        onSuccess:
          - name: checkPetsFound
            type: goto
            stepId: select-pet
            criteria:
              - condition: $outputs.availablePets.length > 0

      - stepId: select-pet
        operationId: getPetById
        parameters:
          - name: petId
            in: path
            value: $steps.find-available-pets.outputs.availablePets[0].id
        successCriteria:
          - condition: $statusCode == 200
        outputs:
          selectedPet: $response.body
        onFailure:
          - name: petNotFound
            type: goto
            stepId: find-available-pets
            criteria:
              - condition: $statusCode == 404

      - stepId: place-order
        operationId: placeOrder
        requestBody:
          contentType: application/json
          payload:
            petId: $steps.select-pet.outputs.selectedPet.id
            quantity: 1
            status: placed
        successCriteria:
          - condition: $statusCode == 200
        outputs:
          order: $response.body

    outputs:
      adoptedPet: $steps.select-pet.outputs.selectedPet
      orderConfirmation: $steps.place-order.outputs.order
`;

export default function Home() {
  const [yamlInput, setYamlInput] = useState(EXAMPLE_YAML);
  const [spec, setSpec] = useState<ArazzoSpec | null>(null);
  const [selectedWorkflow, setSelectedWorkflow] = useState<string>('');
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDark, setIsDark] = useState(false);
  
  // New state
  const [viewMode, setViewMode] = useState<ViewMode>('reactflow');
  const [hideErrorFlows, setHideErrorFlows] = useState(false);
  const [hideOutputs, setHideOutputs] = useState(false);
  const [showStepNames, setShowStepNames] = useState(true);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
  const [isEditorExpanded, setIsEditorExpanded] = useState(false);
  const [detailData, setDetailData] = useState<DetailData | null>(null);
  
  // Navigation state for documentation view
  const [docNavigationTarget, setDocNavigationTarget] = useState<{workflowId: string; stepId: string} | null>(null);

  // Get current workflow and its data
  const currentWorkflow = useMemo(() => {
    if (!spec || !selectedWorkflow) return null;
    return spec.workflows.find(w => w.workflowId === selectedWorkflow);
  }, [spec, selectedWorkflow]);

  const currentWorkflowSteps = useMemo(() => {
    return currentWorkflow?.steps || [];
  }, [currentWorkflow]);

  const currentWorkflowOutputs = useMemo(() => {
    return currentWorkflow?.outputs || {};
  }, [currentWorkflow]);

  const currentWorkflowInputs = useMemo(() => {
    return currentWorkflow?.inputs;
  }, [currentWorkflow]);

  // Helper to find source for a step
  const getSourceForStep = useCallback((step: Step) => {
    if (!spec?.sourceDescriptions) return undefined;
    if (step.operationId?.includes('.')) {
      const sourceName = step.operationId.split('.')[0];
      return spec.sourceDescriptions.find(s => s.name === sourceName);
    }
    return spec.sourceDescriptions[0];
  }, [spec]);

  // Handle step selection from React Flow (convert to DetailData)
  const handleStepSelect = useCallback((step: Step | null) => {
    if (step) {
      setDetailData({ 
        type: 'step', 
        step,
        sourceForStep: getSourceForStep(step)
      });
    } else {
      setDetailData(null);
    }
  }, [getSourceForStep]);

  // Generate Mermaid diagrams
  const mermaidFlowchart = useMemo(() => {
    if (!spec || !selectedWorkflow) return '';
    try {
      return workflowToMermaidFlowchart(spec, selectedWorkflow, { hideErrorFlows });
    } catch {
      return '';
    }
  }, [spec, selectedWorkflow, hideErrorFlows]);

  const mermaidSequence = useMemo(() => {
    if (!spec || !selectedWorkflow) return '';
    try {
      return workflowToMermaidSequence(spec, selectedWorkflow, { hideErrorFlows, hideOutputs, showStepNames });
    } catch {
      return '';
    }
  }, [spec, selectedWorkflow, hideErrorFlows, hideOutputs, showStepNames]);

  // Parse YAML and update visualization
  const parseAndVisualize = useCallback(() => {
    try {
      setError(null);
      setDetailData(null);
      const parsedSpec = parseArazzoSpec(yamlInput);
      setSpec(parsedSpec);
      
      // Select first workflow by default
      if (parsedSpec.workflows.length > 0) {
        const firstWorkflow = parsedSpec.workflows[0].workflowId;
        setSelectedWorkflow(firstWorkflow);
        const { nodes: flowNodes, edges: flowEdges } = workflowToFlow(parsedSpec, firstWorkflow, { hideErrorFlows });
        setNodes(flowNodes);
        setEdges(flowEdges);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to parse YAML');
      setNodes([]);
      setEdges([]);
    }
  }, [yamlInput, hideErrorFlows]);

  // Update flow when workflow selection or hideErrorFlows changes
  useEffect(() => {
    if (spec && selectedWorkflow) {
      try {
        const { nodes: flowNodes, edges: flowEdges } = workflowToFlow(spec, selectedWorkflow, { hideErrorFlows });
        setNodes(flowNodes);
        setEdges(flowEdges);
        setError(null);
        setDetailData(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to render workflow');
      }
    }
  }, [spec, selectedWorkflow, hideErrorFlows]);

  // Auto-parse on initial load
  useEffect(() => {
    parseAndVisualize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load example from file
  const loadExample = async (filename: string) => {
    setIsLoading(true);
    setDetailData(null);
    try {
      const response = await fetch(`/workflows/${filename}`);
      if (!response.ok) throw new Error(`Failed to load ${filename}`);
      const yaml = await response.text();
      setYamlInput(yaml);
      // Parse after setting
      const parsedSpec = parseArazzoSpec(yaml);
      setSpec(parsedSpec);
      if (parsedSpec.workflows.length > 0) {
        const firstWorkflow = parsedSpec.workflows[0].workflowId;
        setSelectedWorkflow(firstWorkflow);
        const { nodes: flowNodes, edges: flowEdges } = workflowToFlow(parsedSpec, firstWorkflow, { hideErrorFlows });
        setNodes(flowNodes);
        setEdges(flowEdges);
      }
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load example');
    } finally {
      setIsLoading(false);
    }
  };

  // Copy Mermaid to clipboard
  const copyMermaidToClipboard = useCallback(async () => {
    const content = viewMode === 'mermaid-flowchart' ? mermaidFlowchart : mermaidSequence;
    try {
      await navigator.clipboard.writeText(content);
    } catch {
      // Fallback for browsers without clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = content;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  }, [viewMode, mermaidFlowchart, mermaidSequence]);

  // Navigate to documentation view with a specific step
  const navigateToDocStep = useCallback((workflowId: string, stepId: string) => {
    setDocNavigationTarget({ workflowId, stepId });
    setViewMode('documentation');
    setDetailData(null);
  }, []);

  // Clear navigation target after documentation view has scrolled
  useEffect(() => {
    if (viewMode === 'documentation' && docNavigationTarget) {
      // Wait for the component to mount and scroll
      const timeout = setTimeout(() => {
        setDocNavigationTarget(null);
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [viewMode, docNavigationTarget]);

  return (
    <div className={`h-screen flex flex-col overflow-hidden transition-colors duration-300 ${isDark ? 'bg-slate-950 text-white' : 'bg-gray-100 text-gray-900'}`}>
      {/* Compact Header */}
      <header className={`flex-shrink-0 border-b transition-colors duration-300 ${isDark ? 'border-slate-800 bg-slate-900' : 'border-gray-200 bg-white'}`}>
        <div className="px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h1 className="text-base font-semibold">Arazzo Playground</h1>
            
            {/* Workflow info badge with tooltip */}
            {spec && (
              <div className="relative group">
                <span className={`px-2 py-0.5 rounded text-xs flex items-center gap-1.5 ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-gray-100 text-gray-500'}`}>
                  {spec.info.title} v{spec.info.version}
                  {spec.info.description && (
                    <InfoIcon />
                  )}
                </span>
                {spec.info.description && (
                  <div className={`absolute left-0 top-full mt-2 z-50 w-80 p-3 rounded-lg shadow-xl border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 ${isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-gray-200 text-gray-600'}`}>
                    <p className="text-xs leading-relaxed">{spec.info.description}</p>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className={`flex rounded-lg p-0.5 ${isDark ? 'bg-slate-800' : 'bg-gray-100'}`}>
              <button
                onClick={() => setViewMode('reactflow')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${viewMode === 'reactflow' ? (isDark ? 'bg-indigo-600 text-white' : 'bg-indigo-600 text-white') : (isDark ? 'text-slate-400 hover:text-white' : 'text-gray-500 hover:text-gray-700')}`}
              >
                Interactive
              </button>
              <button
                onClick={() => setViewMode('mermaid-flowchart')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${viewMode === 'mermaid-flowchart' ? (isDark ? 'bg-indigo-600 text-white' : 'bg-indigo-600 text-white') : (isDark ? 'text-slate-400 hover:text-white' : 'text-gray-500 hover:text-gray-700')}`}
              >
                Flowchart
              </button>
              <button
                onClick={() => setViewMode('mermaid-sequence')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${viewMode === 'mermaid-sequence' ? (isDark ? 'bg-indigo-600 text-white' : 'bg-indigo-600 text-white') : (isDark ? 'text-slate-400 hover:text-white' : 'text-gray-500 hover:text-gray-700')}`}
              >
                Sequence
              </button>
              <button
                onClick={() => setViewMode('documentation')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1 ${viewMode === 'documentation' ? (isDark ? 'bg-indigo-600 text-white' : 'bg-indigo-600 text-white') : (isDark ? 'text-slate-400 hover:text-white' : 'text-gray-500 hover:text-gray-700')}`}
              >
                <DocumentIcon />
                Docs
              </button>
            </div>

            {/* Workflow Selector */}
            {spec && spec.workflows.length > 1 && (
              <select
                value={selectedWorkflow}
                onChange={(e) => setSelectedWorkflow(e.target.value)}
                className={`rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-gray-300 text-gray-900'} border`}
              >
                {spec.workflows.map((wf) => (
                  <option key={wf.workflowId} value={wf.workflowId}>
                    {wf.summary || wf.workflowId}
                  </option>
                ))}
              </select>
            )}
            
            {/* Theme Toggle */}
            <button
              onClick={() => setIsDark(!isDark)}
              className={`p-1.5 rounded-lg transition-colors ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-yellow-400' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}
              aria-label="Toggle theme"
            >
              {isDark ? <SunIcon /> : <MoonIcon />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content - Full Height */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - YAML Editor (collapsible & expandable) */}
        <div 
          className={`relative flex flex-col border-r transition-all duration-300 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'} ${isPanelCollapsed ? 'w-12' : isEditorExpanded ? 'w-full' : 'w-[400px] min-w-[300px] max-w-[700px]'}`}
          style={{ resize: isPanelCollapsed || isEditorExpanded ? 'none' : 'horizontal', overflow: 'hidden' }}
        >

          {!isPanelCollapsed && (
            <>
              {/* Editor Header */}
              <div className={`flex items-center justify-between px-3 py-2 border-b ${isDark ? 'border-slate-800' : 'border-gray-100'}`}>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                  <span className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>YAML Source</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => loadExample('pet-adoption.arazzo.yaml')}
                    disabled={isLoading}
                    className={`px-2 py-0.5 text-[10px] rounded transition-colors disabled:opacity-50 ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}
                  >
                    Pet Store
                  </button>
                  <button
                    onClick={() => loadExample('ecommerce-onboarding.arazzo.yaml')}
                    disabled={isLoading}
                    className={`px-2 py-0.5 text-[10px] rounded transition-colors disabled:opacity-50 ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}
                  >
                    E-Commerce
                  </button>
                  <button
                    onClick={() => setIsEditorExpanded(!isEditorExpanded)}
                    className={`p-1 rounded transition-colors ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-gray-100 text-gray-400'}`}
                    title={isEditorExpanded ? "Collapse Editor" : "Expand Editor"}
                  >
                    {isEditorExpanded ? <CollapseIcon /> : <ExpandIcon />}
                  </button>
                  <button
                    onClick={() => setIsPanelCollapsed(true)}
                    className={`ml-1 p-1 rounded transition-colors ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-gray-100 text-gray-400'}`}
                    title="Hide YAML Editor"
                  >
                    <ChevronLeftIcon />
                  </button>
                </div>
              </div>
              
              {/* Editor */}
              <div className="flex-1 overflow-hidden">
                <MonacoEditor
                  height="100%"
                  language="yaml"
                  theme={isDark ? 'vs-dark' : 'light'}
                  value={yamlInput}
                  onChange={(value) => setYamlInput(value || '')}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 12,
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                    wordWrap: 'on',
                    automaticLayout: true,
                    folding: true,
                    tabSize: 2,
                    renderWhitespace: 'selection',
                    scrollbar: {
                      vertical: 'auto',
                      horizontal: 'auto',
                    },
                  }}
                />
              </div>
              
              {/* Footer */}
              <div className={`flex items-center justify-between px-3 py-2 border-t ${isDark ? 'border-slate-800' : 'border-gray-100'}`}>
                <div className="flex-1">
                  {error && (
                    <span className="text-red-500 text-[10px] flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {error}
                    </span>
                  )}
                  {!error && spec && (
                    <span className="text-emerald-600 text-[10px] flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {spec.workflows.length} workflow(s) • {nodes.filter(n => n.type === 'step').length} steps
                    </span>
                  )}
                </div>
                <button
                  onClick={parseAndVisualize}
                  className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-medium transition-colors flex items-center gap-1.5"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  </svg>
                  Visualize
                </button>
              </div>
            </>
          )}

          {isPanelCollapsed && (
            <button
              onClick={() => setIsPanelCollapsed(false)}
              className={`flex-1 flex flex-col items-center justify-center gap-2 hover:opacity-80 transition-opacity cursor-pointer ${isDark ? 'hover:bg-slate-800' : 'hover:bg-gray-50'}`}
            >
              <svg className={`w-5 h-5 ${isDark ? 'text-slate-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              <span className={`text-[10px] font-medium ${isDark ? 'text-slate-600' : 'text-gray-400'}`} style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>
                YAML Editor
              </span>
              <ChevronRightIcon />
            </button>
          )}
        </div>

        {/* Right Panel - Visualization (Full Width) - Hidden when editor is expanded */}
        {!isEditorExpanded && (
        <div className={`flex-1 flex flex-col overflow-hidden relative ${isDark ? 'bg-slate-950' : 'bg-gray-50'}`}>
          {/* Options Bar */}
          <div className={`flex-shrink-0 px-4 py-1.5 flex items-center justify-between border-b ${isDark ? 'border-slate-800 bg-slate-900/50' : 'border-gray-200 bg-white/50'}`}>
            <div className="flex items-center gap-3">
              {/* Toggle YAML Panel Button */}
              <button
                onClick={() => setIsPanelCollapsed(!isPanelCollapsed)}
                className={`flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                  isPanelCollapsed 
                    ? (isDark ? 'bg-indigo-600 text-white hover:bg-indigo-500' : 'bg-indigo-600 text-white hover:bg-indigo-500')
                    : (isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')
                }`}
                title={isPanelCollapsed ? 'Show YAML Editor' : 'Hide YAML Editor'}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                {isPanelCollapsed ? 'Show YAML' : 'Hide'}
              </button>

              <div className={`w-px h-4 ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />

              {/* Hide Error Flows Toggle */}
              <label className={`flex items-center gap-1.5 text-[11px] cursor-pointer select-none ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                <input
                  type="checkbox"
                  checked={hideErrorFlows}
                  onChange={(e) => setHideErrorFlows(e.target.checked)}
                  className="w-3 h-3 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                Hide errors
              </label>

              {/* Hide Outputs Toggle (Sequence mode only) */}
              {viewMode === 'mermaid-sequence' && (
                <label className={`flex items-center gap-1.5 text-[11px] cursor-pointer select-none ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  <input
                    type="checkbox"
                    checked={hideOutputs}
                    onChange={(e) => setHideOutputs(e.target.checked)}
                    className="w-3 h-3 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  Hide outputs
                </label>
              )}

              {/* Show Step Names Toggle (Sequence mode only) */}
              {viewMode === 'mermaid-sequence' && (
                <label className={`flex items-center gap-1.5 text-[11px] cursor-pointer select-none ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  <input
                    type="checkbox"
                    checked={showStepNames}
                    onChange={(e) => setShowStepNames(e.target.checked)}
                    className="w-3 h-3 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  Show steps
                </label>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Copy Mermaid Button */}
              {viewMode !== 'reactflow' && (
                <button
                  onClick={copyMermaidToClipboard}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] transition-colors ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-gray-200 text-gray-500'}`}
                  title="Copy Mermaid code"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy Mermaid
                </button>
              )}
            </div>
          </div>
          
          {/* Visualization Content */}
          <div className="flex-1 flex overflow-hidden">
            {/* Diagram Area */}
            <div className="flex-1 relative overflow-hidden">
              {viewMode === 'documentation' && spec ? (
                <DocumentationView 
                  spec={spec} 
                  isDark={isDark}
                  initialWorkflowId={docNavigationTarget?.workflowId}
                  initialStepId={docNavigationTarget?.stepId}
                />
              ) : nodes.length > 0 || (spec && selectedWorkflow) ? (
                <>
                  {viewMode === 'reactflow' && (
                    <ArazzoFlow 
                      nodes={nodes} 
                      edges={edges} 
                      workflowId={selectedWorkflow}
                      isDark={isDark}
                      onDetailSelect={setDetailData}
                    />
                  )}
                  {viewMode === 'mermaid-flowchart' && (
                    <MermaidDiagram 
                      chart={mermaidFlowchart} 
                      isDark={isDark} 
                      steps={currentWorkflowSteps}
                      sources={spec?.sourceDescriptions || []}
                      workflowOutputs={currentWorkflowOutputs}
                      selectedStepId={detailData?.type === 'step' ? detailData.step?.stepId : null}
                      onDetailSelect={setDetailData}
                    />
                  )}
                  {viewMode === 'mermaid-sequence' && (
                    <MermaidDiagram 
                      chart={mermaidSequence} 
                      isDark={isDark}
                      steps={currentWorkflowSteps}
                      sources={spec?.sourceDescriptions || []}
                      workflowOutputs={currentWorkflowOutputs}
                      selectedStepId={detailData?.type === 'step' ? detailData.step?.stepId : null}
                      onDetailSelect={setDetailData}
                    />
                  )}
                </>
              ) : (
                <div className={`flex items-center justify-center h-full ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>
                  <div className="text-center">
                    <svg className="w-16 h-16 mx-auto mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                    </svg>
                    <p className="text-sm">Load an example or paste Arazzo YAML</p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Detail Drawer - Side Panel (hidden in documentation view) */}
            {viewMode !== 'documentation' && (
              <DetailDrawer
                data={detailData}
                isDark={isDark}
                onClose={() => setDetailData(null)}
                workflowInputs={currentWorkflowInputs}
                workflowOutputs={currentWorkflowOutputs}
                workflowId={selectedWorkflow}
                onNavigateToDoc={navigateToDocStep}
              />
            )}
          </div>
        </div>
        )}
      </div>

      {/* Footer */}
      <footer className={`flex-shrink-0 py-2 px-4 text-center text-xs border-t ${isDark ? 'border-slate-800 text-slate-500' : 'border-gray-200 text-gray-400'}`}>
        Made with ❤️ by{' '}
        <a 
          href="https://connethics.com" 
          target="_blank" 
          rel="noopener noreferrer"
          className={`hover:underline ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}
        >
          connethics.com
        </a>
        <span className="mx-2">•</span>
        <a 
          href="https://github.com/connEthics/arazzo-demo" 
          target="_blank" 
          rel="noopener noreferrer"
          className={`hover:underline ${isDark ? 'text-slate-400' : 'text-gray-500'}`}
        >
          GitHub
        </a>
      </footer>
    </div>
  );
}
