'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Node, Edge } from '@xyflow/react';
import ArazzoFlow from '@/components/ArazzoFlow';
import DetailDrawer, { DetailData } from '@/components/DetailDrawer';
import DocumentationView from '@/components/DocumentationView';
import OverviewView from '@/components/OverviewView';
import IntroView from '@/components/IntroView';
import { parseArazzoSpec, workflowToFlow } from '@/lib/arazzo-parser';
import { workflowToMermaidFlowchart, workflowToMermaidSequence } from '@/lib/mermaid-converter';
import { ArazzoSpec, Step } from '@/types/arazzo';

// Dynamic imports for SSR safety
const MermaidDiagram = dynamic(() => import('@/components/MermaidDiagram'), { ssr: false });
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

type ViewMode = 'documentation' | 'overview' | 'intro' | 'reactflow' | 'mermaid-flowchart' | 'mermaid-sequence';

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

const ExpandAllIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

const CollapseAllIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
  </svg>
);

const PrintIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
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
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [hideErrorFlows, setHideErrorFlows] = useState(false);
  const [hideOutputs, setHideOutputs] = useState(false);
  const [showStepNames, setShowStepNames] = useState(true);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
  const [isEditorExpanded, setIsEditorExpanded] = useState(false);
  const [detailData, setDetailData] = useState<DetailData | null>(null);
  
  // Navigation state for documentation view
  const [docNavigationTarget, setDocNavigationTarget] = useState<{workflowId: string; stepId: string} | null>(null);
  const [docExpandAll, setDocExpandAll] = useState<boolean | undefined>(undefined);
  
  // Mobile menu state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mobileShowEditor, setMobileShowEditor] = useState(true);

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

  // Auto-load petstore example on initial load
  useEffect(() => {
    loadExample('pet-adoption.arazzo.yaml');
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
        <div className="px-3 sm:px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={`lg:hidden p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-gray-100 text-gray-500'}`}
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
            
            <Link href="/" className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20 hover:opacity-90 transition-opacity">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </Link>
            <h1 className="text-base font-semibold hidden sm:block">Arazzo Playground</h1>
            <h1 className="text-base font-semibold sm:hidden">Arazzo</h1>
          </div>
          
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Desktop: Left Group - Docs & Overview */}
            <div className={`hidden lg:flex rounded-lg p-0.5 ${isDark ? 'bg-slate-800' : 'bg-gray-100'}`}>
              <button
                onClick={() => setViewMode('documentation')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1 ${viewMode === 'documentation' ? (isDark ? 'bg-indigo-600 text-white' : 'bg-indigo-600 text-white') : (isDark ? 'text-slate-400 hover:text-white' : 'text-gray-500 hover:text-gray-700')}`}
              >
                <DocumentIcon />
                Docs
              </button>
              <button
                onClick={() => setViewMode('overview')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${viewMode === 'overview' ? (isDark ? 'bg-indigo-600 text-white' : 'bg-indigo-600 text-white') : (isDark ? 'text-slate-400 hover:text-white' : 'text-gray-500 hover:text-gray-700')}`}
              >
                Overview
              </button>
            </div>

            {/* Desktop: Workflow Selector */}
            {spec && spec.workflows.length > 0 && (
              <div className={`hidden lg:flex items-center gap-1.5 px-2 py-1 rounded-lg border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200'}`}>
                <svg className={`w-3.5 h-3.5 flex-shrink-0 ${isDark ? 'text-indigo-400' : 'text-indigo-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                </svg>
                <select
                  value={selectedWorkflow}
                  onChange={(e) => setSelectedWorkflow(e.target.value)}
                  className={`bg-transparent text-xs font-medium focus:outline-none cursor-pointer max-w-[140px] truncate ${isDark ? 'text-white' : 'text-gray-900'}`}
                >
                  {spec.workflows.map((wf) => (
                    <option key={wf.workflowId} value={wf.workflowId} className={isDark ? 'bg-slate-800' : 'bg-white'}>
                      {wf.workflowId}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Desktop: Right Group - Workflow-specific views */}
            <div className={`hidden lg:flex rounded-lg p-0.5 ${isDark ? 'bg-slate-800' : 'bg-gray-100'}`}>
              <button
                onClick={() => setViewMode('intro')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${viewMode === 'intro' ? (isDark ? 'bg-indigo-600 text-white' : 'bg-indigo-600 text-white') : (isDark ? 'text-slate-400 hover:text-white' : 'text-gray-500 hover:text-gray-700')}`}
              >
                Intro
              </button>
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
            </div>
            
            {/* Mobile: Edit/Visualize toggle */}
            <button
              onClick={() => {
                if (mobileShowEditor) {
                  setMobileShowEditor(false);
                  parseAndVisualize();
                } else {
                  setMobileShowEditor(true);
                }
              }}
              className={`lg:hidden px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                mobileShowEditor 
                  ? (isDark ? 'bg-indigo-600 text-white hover:bg-indigo-500' : 'bg-indigo-600 text-white hover:bg-indigo-500')
                  : (isDark ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300')
              }`}
            >
              {mobileShowEditor ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Visualize
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                  Edit
                </>
              )}
            </button>
            
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
        
        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div 
            className="lg:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
        
        {/* Mobile Menu Panel */}
        <div className={`
          lg:hidden
          fixed top-0 left-0 bottom-0 w-72 z-50
          transform transition-transform duration-300 ease-in-out
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          ${isDark ? 'bg-slate-900 border-r border-slate-800' : 'bg-white border-r border-gray-200'}
        `}>
          <div className="p-4">
            {/* Mobile Menu Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Menu</h2>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-gray-100 text-gray-500'}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Workflow Selector */}
            {spec && spec.workflows.length > 0 && (
              <div className="mb-6">
                <label className={`block text-xs font-medium mb-2 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  Workflow
                </label>
                <select
                  value={selectedWorkflow}
                  onChange={(e) => {
                    setSelectedWorkflow(e.target.value);
                  }}
                  className={`w-full px-3 py-2 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isDark ? 'bg-slate-800 text-white border-slate-700' : 'bg-gray-100 text-gray-900 border-gray-200'} border`}
                >
                  {spec.workflows.map((wf) => (
                    <option key={wf.workflowId} value={wf.workflowId}>
                      {wf.workflowId}
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            {/* View Mode Options */}
            <div className="space-y-1">
              <label className={`block text-xs font-medium mb-2 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                View Mode
              </label>
              {[
                { id: 'documentation', label: 'Documentation', icon: DocumentIcon },
                { id: 'overview', label: 'Overview', icon: null },
                { id: 'intro', label: 'Intro', icon: null },
                { id: 'reactflow', label: 'Interactive Diagram', icon: null },
                { id: 'mermaid-flowchart', label: 'Flowchart', icon: null },
                { id: 'mermaid-sequence', label: 'Sequence Diagram', icon: null },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setViewMode(item.id as ViewMode);
                    setMobileShowEditor(false);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                    viewMode === item.id && !mobileShowEditor
                      ? (isDark ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-700')
                      : (isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-gray-600 hover:bg-gray-100')
                  }`}
                >
                  {item.icon && <item.icon />}
                  {item.label}
                </button>
              ))}
            </div>
            
            {/* Load Examples */}
            <div className="mt-6 pt-6 border-t ${isDark ? 'border-slate-800' : 'border-gray-200'}">
              <label className={`block text-xs font-medium mb-2 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                Load Example
              </label>
              <div className="space-y-1">
                <button
                  onClick={() => {
                    loadExample('pet-adoption.arazzo.yaml');
                    setIsMobileMenuOpen(false);
                  }}
                  disabled={isLoading}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  Pet Store
                </button>
                <button
                  onClick={() => {
                    loadExample('ecommerce-onboarding.arazzo.yaml');
                    setIsMobileMenuOpen(false);
                  }}
                  disabled={isLoading}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  E-Commerce
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Full Height */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - YAML Editor (collapsible & expandable) */}
        {/* On mobile: full width when mobileShowEditor is true, hidden otherwise */}
        <div 
          className={`
            relative flex flex-col border-r transition-all duration-300 
            ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'} 
            ${isPanelCollapsed ? 'hidden lg:flex lg:w-12' : ''} 
            ${!isPanelCollapsed && isEditorExpanded ? 'w-full' : ''} 
            ${!isPanelCollapsed && !isEditorExpanded ? 'lg:w-[400px] lg:min-w-[300px] lg:max-w-[700px]' : ''}
            ${mobileShowEditor ? 'flex w-full lg:w-auto' : 'hidden lg:flex'}
          `}
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
                  {/* Desktop only: Load example buttons */}
                  <span className={`hidden sm:inline text-[10px] mr-1 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>Load Example:</span>
                  <button
                    onClick={() => loadExample('pet-adoption.arazzo.yaml')}
                    disabled={isLoading}
                    className={`hidden sm:inline-block px-2 py-0.5 text-[10px] rounded transition-colors disabled:opacity-50 ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}
                  >
                    Pet Store
                  </button>
                  <button
                    onClick={() => loadExample('ecommerce-onboarding.arazzo.yaml')}
                    disabled={isLoading}
                    className={`hidden sm:inline-block px-2 py-0.5 text-[10px] rounded transition-colors disabled:opacity-50 ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}
                  >
                    E-Commerce
                  </button>
                  {/* Desktop only: Expand/Collapse buttons */}
                  <button
                    onClick={() => setIsEditorExpanded(!isEditorExpanded)}
                    className={`hidden lg:inline-block p-1 rounded transition-colors ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-gray-100 text-gray-400'}`}
                    title={isEditorExpanded ? "Collapse Editor" : "Expand Editor"}
                  >
                    {isEditorExpanded ? <CollapseIcon /> : <ExpandIcon />}
                  </button>
                  <button
                    onClick={() => setIsPanelCollapsed(true)}
                    className={`hidden lg:inline-block ml-1 p-1 rounded transition-colors ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-gray-100 text-gray-400'}`}
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
        {/* On mobile: hidden when mobileShowEditor is true */}
        {!isEditorExpanded && (
        <div className={`flex-1 flex-col overflow-hidden relative ${isDark ? 'bg-slate-950' : 'bg-gray-50'} ${mobileShowEditor ? 'hidden lg:flex' : 'flex'}`}>
          {/* Options Bar */}
          <div className={`flex-shrink-0 px-3 sm:px-4 py-1.5 flex items-center justify-between border-b ${isDark ? 'border-slate-800 bg-slate-900/50' : 'border-gray-200 bg-white/50'}`}>
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Toggle YAML Panel Button - Hidden on mobile */}
              <button
                onClick={() => setIsPanelCollapsed(!isPanelCollapsed)}
                className={`hidden lg:flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium transition-colors ${
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

              <div className={`hidden lg:block w-px h-4 ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />

              {/* Hide Error Flows Toggle - Only for diagram views */}
              {(viewMode === 'reactflow' || viewMode === 'mermaid-flowchart' || viewMode === 'mermaid-sequence' || viewMode === 'intro') && (
                <label className={`flex items-center gap-1.5 text-[11px] cursor-pointer select-none ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  <input
                    type="checkbox"
                    checked={hideErrorFlows}
                    onChange={(e) => setHideErrorFlows(e.target.checked)}
                    className="w-3 h-3 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  Hide errors
                </label>
              )}

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
              {/* Copy Mermaid Button - For Mermaid modes */}
              {(viewMode === 'mermaid-flowchart' || viewMode === 'mermaid-sequence') && (
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

              {/* Documentation specific buttons */}
              {viewMode === 'documentation' && (
                <>
                  {/* Expand/Collapse All */}
                  <button
                    onClick={() => setDocExpandAll(true)}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] transition-colors ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-gray-200 text-gray-500'}`}
                    title="Expand all steps"
                  >
                    <ExpandAllIcon />
                    Expand All
                  </button>
                  <button
                    onClick={() => setDocExpandAll(false)}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] transition-colors ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-gray-200 text-gray-500'}`}
                    title="Collapse all steps"
                  >
                    <CollapseAllIcon />
                    Collapse All
                  </button>

                  <div className={`w-px h-4 ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />

                  {/* Print/Export */}
                  <button
                    onClick={() => window.print()}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] transition-colors ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-gray-200 text-gray-500'}`}
                    title="Print / Export PDF"
                  >
                    <PrintIcon />
                    Print / Export
                  </button>
                </>
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
                  expandAll={docExpandAll}
                />
              ) : viewMode === 'overview' && spec ? (
                <OverviewView
                  spec={spec}
                  isDark={isDark}
                  selectedWorkflow={selectedWorkflow}
                  onWorkflowSelect={(workflowId) => {
                    setSelectedWorkflow(workflowId);
                    setViewMode('intro');
                  }}
                />
              ) : viewMode === 'intro' && spec && currentWorkflow ? (
                <IntroView
                  spec={spec}
                  workflow={currentWorkflow}
                  isDark={isDark}
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
                      workflowInputs={currentWorkflowInputs}
                      workflowOutputs={currentWorkflowOutputs}
                      selectedStepId={detailData?.type === 'step' ? detailData.step?.stepId : null}
                      selectedType={detailData?.type === 'source' ? null : detailData?.type || null}
                      onDetailSelect={setDetailData}
                    />
                  )}
                  {viewMode === 'mermaid-sequence' && (
                    <MermaidDiagram 
                      chart={mermaidSequence} 
                      isDark={isDark}
                      steps={currentWorkflowSteps}
                      sources={spec?.sourceDescriptions || []}
                      workflowInputs={currentWorkflowInputs}
                      workflowOutputs={currentWorkflowOutputs}
                      selectedStepId={detailData?.type === 'step' ? detailData.step?.stepId : null}
                      selectedType={detailData?.type === 'source' ? null : detailData?.type || null}
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
            
            {/* Detail Drawer - Side Panel (hidden in documentation, overview, and intro views) */}
            {viewMode !== 'documentation' && viewMode !== 'overview' && viewMode !== 'intro' && (
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
        <Link 
          href="/showcase" 
          className={`hover:underline ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}
        >
          Components
        </Link>
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
