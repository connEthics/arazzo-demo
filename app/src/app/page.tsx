'use client';

import { useState, useEffect, useCallback } from 'react';
import { Node, Edge } from '@xyflow/react';
import ArazzoFlow from '@/components/ArazzoFlow';
import { parseArazzoSpec, workflowToFlow } from '@/lib/arazzo-parser';
import { ArazzoSpec } from '@/types/arazzo';

// Theme toggle icon components
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

  // Parse YAML and update visualization
  const parseAndVisualize = useCallback(() => {
    try {
      setError(null);
      const parsedSpec = parseArazzoSpec(yamlInput);
      setSpec(parsedSpec);
      
      // Select first workflow by default
      if (parsedSpec.workflows.length > 0) {
        const firstWorkflow = parsedSpec.workflows[0].workflowId;
        setSelectedWorkflow(firstWorkflow);
        const { nodes: flowNodes, edges: flowEdges } = workflowToFlow(parsedSpec, firstWorkflow);
        setNodes(flowNodes);
        setEdges(flowEdges);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to parse YAML');
      setNodes([]);
      setEdges([]);
    }
  }, [yamlInput]);

  // Update flow when workflow selection changes
  useEffect(() => {
    if (spec && selectedWorkflow) {
      try {
        const { nodes: flowNodes, edges: flowEdges } = workflowToFlow(spec, selectedWorkflow);
        setNodes(flowNodes);
        setEdges(flowEdges);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to render workflow');
      }
    }
  }, [spec, selectedWorkflow]);

  // Auto-parse on initial load
  useEffect(() => {
    parseAndVisualize();
  }, []);

  // Load example from file
  const loadExample = async (filename: string) => {
    setIsLoading(true);
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
        const { nodes: flowNodes, edges: flowEdges } = workflowToFlow(parsedSpec, firstWorkflow);
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

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-slate-950 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <header className={`border-b sticky top-0 z-50 backdrop-blur transition-colors duration-300 ${isDark ? 'border-slate-800 bg-slate-900/80' : 'border-gray-200 bg-white/80'}`}>
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-semibold">Arazzo Visualizer</h1>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>OpenAPI Workflow Viewer</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Workflow Selector */}
              {spec && spec.workflows.length > 1 && (
                <select
                  value={selectedWorkflow}
                  onChange={(e) => setSelectedWorkflow(e.target.value)}
                  className={`rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-gray-300 text-gray-900'} border`}
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
                className={`p-2 rounded-lg transition-colors ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-yellow-400' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}
                aria-label="Toggle theme"
              >
                {isDark ? <SunIcon /> : <MoonIcon />}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[calc(100vh-120px)]">
          {/* Left Panel - YAML Editor */}
          <div className={`flex flex-col rounded-xl border overflow-hidden shadow-sm transition-colors duration-300 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'}`}>
            <div className={`flex items-center justify-between px-4 py-2.5 border-b transition-colors ${isDark ? 'border-slate-800 bg-slate-800/50' : 'border-gray-100 bg-gray-50'}`}>
              <h2 className={`font-medium text-sm flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-700'}`}>
                <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                Arazzo YAML
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => loadExample('pet-adoption.arazzo.yaml')}
                  disabled={isLoading}
                  className={`px-2.5 py-1 text-xs rounded-md transition-colors disabled:opacity-50 ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                >
                  Pet Store
                </button>
                <button
                  onClick={() => loadExample('ecommerce-onboarding.arazzo.yaml')}
                  disabled={isLoading}
                  className={`px-2.5 py-1 text-xs rounded-md transition-colors disabled:opacity-50 ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                >
                  E-Commerce
                </button>
              </div>
            </div>
            
            <div className="flex-1 relative">
              <textarea
                value={yamlInput}
                onChange={(e) => setYamlInput(e.target.value)}
                className={`w-full h-full font-mono text-sm p-4 resize-none focus:outline-none transition-colors ${isDark ? 'bg-slate-900 text-slate-300' : 'bg-white text-gray-800'}`}
                spellCheck={false}
                placeholder="Paste your Arazzo YAML here..."
              />
            </div>
            
            <div className={`px-4 py-2.5 border-t flex items-center justify-between transition-colors ${isDark ? 'border-slate-800 bg-slate-800/50' : 'border-gray-100 bg-gray-50'}`}>
              {error && (
                <div className="flex items-center gap-2 text-red-500 text-sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="truncate max-w-xs">{error}</span>
                </div>
              )}
              {!error && spec && (
                <div className="flex items-center gap-2 text-emerald-600 text-sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {spec.workflows.length} workflow(s) • {nodes.filter(n => n.type === 'step').length} steps
                </div>
              )}
              {!error && !spec && <div />}
              <button
                onClick={parseAndVisualize}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Visualize
              </button>
            </div>
          </div>

          {/* Right Panel - Flow Visualization */}
          <div className={`rounded-xl border overflow-hidden shadow-sm transition-colors duration-300 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'}`}>
            <div className={`px-4 py-2.5 border-b transition-colors ${isDark ? 'border-slate-800 bg-slate-800/50' : 'border-gray-100 bg-gray-50'}`}>
              <h2 className={`font-medium text-sm flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-700'}`}>
                <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Workflow
                {spec && (
                  <span className={`ml-2 px-2 py-0.5 rounded text-xs ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-gray-100 text-gray-600'}`}>
                    {spec.info.title} v{spec.info.version}
                  </span>
                )}
              </h2>
            </div>
            
            <div className="h-[calc(100%-44px)]">
              {nodes.length > 0 ? (
                <ArazzoFlow 
                  nodes={nodes} 
                  edges={edges} 
                  workflowId={selectedWorkflow}
                  isDark={isDark}
                />
              ) : (
                <div className={`flex items-center justify-center h-full ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                  <div className="text-center">
                    <svg className="w-12 h-12 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                    </svg>
                    <p className="text-sm">Enter valid Arazzo YAML to visualize</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
