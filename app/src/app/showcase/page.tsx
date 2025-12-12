'use client';

import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import DetailDrawer, { DetailData } from '@/components/DetailDrawer';
import { StepContent, SourceContent, InputContent, OutputContent } from '@/components/DetailViews';
import StepCard from '@/components/StepCard';
import type { Step, SourceDescription, WorkflowInputs, Criterion, SuccessAction, FailureAction, ReusableObject, PayloadReplacement } from '@/types/arazzo';
import { ReusableRef, CriterionBadge, PayloadReplacements, DependsOnList, ActionList } from '@/components/arazzo';
import { Badge, Card, CodeBlock, PropertyList } from '@/components/primitives';

// Dynamic imports for SSR safety
const MermaidDiagram = dynamic(() => import('@/components/MermaidDiagram'), { ssr: false });
const ArazzoFlow = dynamic(() => import('@/components/ArazzoFlow'), { ssr: false });

// Sample data for demonstrations
const sampleStep: Step = {
  stepId: 'find-available-pets',
  operationId: 'petstore.findPetsByStatus',
  description: 'Search for pets that are available for adoption',
  parameters: [
    { name: 'status', in: 'query', value: 'available' },
    { name: 'limit', in: 'query', value: '10' },
  ],
  successCriteria: [
    { condition: '$statusCode == 200' },
    { condition: '$response.body.length > 0' },
  ],
  outputs: {
    availablePets: '$response.body',
    petCount: '$response.body.length',
  },
  onSuccess: [{ name: 'goToSelectPet', type: 'goto', stepId: 'select-pet' }],
  onFailure: [{ name: 'endOnFailure', type: 'end' }],
};

const sampleSource: SourceDescription = {
  name: 'petstore',
  type: 'openapi',
  url: './openapi/petstore.yaml',
  description: 'The Pet Store API for managing pets and orders',
};

const sampleWorkflowInputs: WorkflowInputs = {
  type: 'object',
  properties: {
    petType: { type: 'string', description: 'Type of pet to search for' },
    maxPrice: { type: 'number', description: 'Maximum price for the pet' },
    customerId: { type: 'string', description: 'Customer ID for the order' },
  },
  required: ['petType', 'customerId'],
};

const sampleWorkflowOutputs: Record<string, string> = {
  adoptedPet: '$steps.select-pet.outputs.selectedPet',
  orderConfirmation: '$steps.place-order.outputs.order',
};

// Sample Mermaid diagrams
const sampleFlowchart = `flowchart TD
    Start([Start]) --> A[find-available-pets]
    A --> B{Success?}
    B -->|Yes| C[select-pet]
    B -->|No| End1([End])
    C --> D[place-order]
    D --> E{Order OK?}
    E -->|Yes| End2([Success])
    E -->|No| F[handle-error]
    F --> End1
    
    style A fill:#818cf8,stroke:#4f46e5,color:#fff
    style C fill:#818cf8,stroke:#4f46e5,color:#fff
    style D fill:#818cf8,stroke:#4f46e5,color:#fff
    style F fill:#f87171,stroke:#dc2626,color:#fff`;

const sampleSequence = `sequenceDiagram
    participant Client
    participant petstore as Pet Store API
    
    Client->>petstore: findPetsByStatus(available)
    petstore-->>Client: 200 OK (pets[])
    Note right of Client: outputs: availablePets
    
    Client->>petstore: getPetById(petId)
    petstore-->>Client: 200 OK (pet)
    Note right of Client: outputs: selectedPet
    
    Client->>petstore: placeOrder(order)
    petstore-->>Client: 200 OK (order)
    Note right of Client: outputs: orderConfirmation`;

// Sample React Flow nodes and edges
const sampleNodes = [
  {
    id: 'input-1',
    type: 'input',
    position: { x: 250, y: 0 },
    data: { 
      label: 'Workflow Inputs',
      properties: ['petType', 'maxPrice'],
      required: ['petType'],
      schema: {
        petType: { type: 'string', default: 'dog' },
        maxPrice: { type: 'number' }
      }
    },
  },
  {
    id: 'step-1',
    type: 'step',
    position: { x: 250, y: 100 },
    data: { 
      label: 'find-available-pets',
      stepId: 'find-available-pets',
      operationId: 'findPetsByStatus',
      hasOutputs: true,
    },
  },
  {
    id: 'step-2',
    type: 'step',
    position: { x: 250, y: 200 },
    data: { 
      label: 'select-pet',
      stepId: 'select-pet',
      operationId: 'getPetById',
      hasOutputs: true,
    },
  },
  {
    id: 'step-3',
    type: 'step',
    position: { x: 250, y: 300 },
    data: { 
      label: 'place-order',
      stepId: 'place-order',
      operationId: 'placeOrder',
      hasOutputs: true,
    },
  },
  {
    id: 'output-1',
    type: 'output',
    position: { x: 250, y: 400 },
    data: { 
      label: 'Workflow Outputs',
      properties: ['orderId', 'status'],
      expressions: {
        orderId: '$steps.place-order.outputs.id',
        status: '$steps.place-order.outputs.status'
      }
    },
  },
];

const sampleEdges = [
  { id: 'e1', source: 'input-1', target: 'step-1', animated: true },
  { id: 'e2', source: 'step-1', target: 'step-2', label: 'onSuccess' },
  { id: 'e3', source: 'step-2', target: 'step-3', label: 'onSuccess' },
  { id: 'e4', source: 'step-3', target: 'output-1' },
];

// Component wrapper for showcase
interface ComponentShowcaseProps {
  title: string;
  description: string;
  children: React.ReactNode;
  code?: string;
  isDark: boolean;
}

function ComponentShowcase({ title, description, children, code, isDark }: ComponentShowcaseProps) {
  const [showCode, setShowCode] = useState(false);
  
  return (
    <div className={`rounded-xl border overflow-hidden ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-gray-200 bg-white'}`}>
      {/* Header */}
      <div className={`px-4 py-3 border-b ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-100 bg-gray-50'}`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{title}</h3>
            <p className={`text-sm mt-0.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{description}</p>
          </div>
          {code && (
            <button
              onClick={() => setShowCode(!showCode)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                showCode 
                  ? (isDark ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-700')
                  : (isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')
              }`}
            >
              {showCode ? 'Hide Code' : 'Show Code'}
            </button>
          )}
        </div>
      </div>
      
      {/* Preview */}
      <div className={`p-4 ${isDark ? 'bg-slate-900/50' : 'bg-gray-50/50'}`}>
        {children}
      </div>
      
      {/* Code */}
      {showCode && code && (
        <div className={`border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
          <pre className={`p-4 text-xs overflow-x-auto ${isDark ? 'bg-slate-900 text-slate-300' : 'bg-gray-900 text-gray-300'}`}>
            <code>{code}</code>
          </pre>
        </div>
      )}
    </div>
  );
}

// Badge variants showcase
function BadgeShowcase({ isDark }: { isDark: boolean }) {
  const variants = [
    { label: 'Step', bg: 'bg-indigo-100', text: 'text-indigo-700', darkBg: 'bg-indigo-900/50', darkText: 'text-indigo-300' },
    { label: 'Source', bg: 'bg-blue-100', text: 'text-blue-700', darkBg: 'bg-blue-900/50', darkText: 'text-blue-300' },
    { label: 'Input', bg: 'bg-emerald-100', text: 'text-emerald-700', darkBg: 'bg-emerald-900/50', darkText: 'text-emerald-300' },
    { label: 'Output', bg: 'bg-amber-100', text: 'text-amber-700', darkBg: 'bg-amber-900/50', darkText: 'text-amber-300' },
    { label: 'Error', bg: 'bg-red-100', text: 'text-red-700', darkBg: 'bg-red-900/50', darkText: 'text-red-300' },
    { label: 'OpenAPI', bg: 'bg-blue-100', text: 'text-blue-700', darkBg: 'bg-blue-900/50', darkText: 'text-blue-300' },
    { label: 'Arazzo', bg: 'bg-purple-100', text: 'text-purple-700', darkBg: 'bg-purple-900/50', darkText: 'text-purple-300' },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {variants.map((v) => (
        <span
          key={v.label}
          className={`px-2 py-1 rounded text-xs font-semibold ${isDark ? `${v.darkBg} ${v.darkText}` : `${v.bg} ${v.text}`}`}
        >
          {v.label}
        </span>
      ))}
    </div>
  );
}

// Button variants showcase
function ButtonShowcase({ isDark }: { isDark: boolean }) {
  return (
    <div className="space-y-4">
      {/* Primary buttons */}
      <div className="flex flex-wrap gap-2">
        <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors">
          Primary
        </button>
        <button className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors">
          Success
        </button>
        <button className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium transition-colors">
          Danger
        </button>
        <button className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-medium transition-colors">
          Warning
        </button>
      </div>
      
      {/* Secondary buttons */}
      <div className="flex flex-wrap gap-2">
        <button className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>
          Secondary
        </button>
        <button className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${isDark ? 'border-slate-600 hover:bg-slate-800 text-slate-300' : 'border-gray-300 hover:bg-gray-50 text-gray-700'}`}>
          Outline
        </button>
        <button className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-gray-100 text-gray-500'}`}>
          Ghost
        </button>
      </div>
      
      {/* Icon buttons */}
      <div className="flex flex-wrap gap-2">
        <button className={`p-2 rounded-lg transition-colors ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </button>
        <button className={`p-2 rounded-lg transition-colors ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
        </button>
        <button className={`p-2 rounded-lg transition-colors ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// Input showcase
function InputShowcase({ isDark }: { isDark: boolean }) {
  return (
    <div className="space-y-4 max-w-md">
      {/* Text input */}
      <div>
        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
          Text Input
        </label>
        <input
          type="text"
          placeholder="Enter value..."
          className={`w-full px-3 py-2 rounded-lg border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
            isDark 
              ? 'bg-slate-800 border-slate-600 text-white placeholder-slate-500' 
              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
          }`}
        />
      </div>
      
      {/* Select */}
      <div>
        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
          Select
        </label>
        <select
          className={`w-full px-3 py-2 rounded-lg border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
            isDark 
              ? 'bg-slate-800 border-slate-600 text-white' 
              : 'bg-white border-gray-300 text-gray-900'
          }`}
        >
          <option>Option 1</option>
          <option>Option 2</option>
          <option>Option 3</option>
        </select>
      </div>
      
      {/* Checkbox */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="checkbox-demo"
          className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
        />
        <label htmlFor="checkbox-demo" className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
          Checkbox option
        </label>
      </div>
    </div>
  );
}

// Card showcase
function CardShowcase({ isDark }: { isDark: boolean }) {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      {/* Simple card */}
      <div className={`p-4 rounded-lg border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
        <h4 className={`font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Simple Card</h4>
        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
          A basic card component with title and description.
        </p>
      </div>
      
      {/* Card with badge */}
      <div className={`p-4 rounded-lg border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
        <div className="flex items-center gap-2 mb-2">
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-700">NEW</span>
          <h4 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Card with Badge</h4>
        </div>
        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
          Card with a status badge indicator.
        </p>
      </div>
      
      {/* Card with border accent */}
      <div className={`p-4 rounded-lg border-l-4 border-l-indigo-500 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
        <h4 className={`font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Accent Border</h4>
        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
          Card with a colored left border accent.
        </p>
      </div>
      
      {/* Interactive card */}
      <div className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-lg ${isDark ? 'border-slate-700 bg-slate-800 hover:border-indigo-500' : 'border-gray-200 bg-white hover:border-indigo-300'}`}>
        <h4 className={`font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Interactive Card</h4>
        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
          Hover over me for effect.
        </p>
      </div>
    </div>
  );
}

export default function ShowcasePage() {
  const [isDark, setIsDark] = useState(true);
  const [activeSection, setActiveSection] = useState('overview');
  const [detailData, setDetailData] = useState<DetailData | null>(null);

  const sections = [
    { id: 'overview', label: 'Overview' },
    { id: 'primitives', label: 'Primitives' },
    { id: 'arazzo', label: 'Arazzo Components' },
    { id: 'badges', label: 'Badges' },
    { id: 'buttons', label: 'Buttons' },
    { id: 'inputs', label: 'Inputs' },
    { id: 'cards', label: 'Cards' },
    { id: 'mermaid', label: 'Mermaid Diagrams' },
    { id: 'flow', label: 'React Flow' },
    { id: 'drawer', label: 'Detail Drawer' },
    { id: 'documentation', label: 'Documentation' },
  ];

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${isDark ? 'bg-slate-950 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <header className={`flex-shrink-0 border-b ${isDark ? 'border-slate-800 bg-slate-900' : 'border-gray-200 bg-white'}`}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              href="/playground"
              className={`flex items-center gap-2 text-sm ${isDark ? 'text-slate-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Playground
            </Link>
            <div className={`w-px h-6 ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
            <h1 className="text-xl font-bold">Component Showcase</h1>
          </div>
          
          <button
            onClick={() => setIsDark(!isDark)}
            className={`p-2 rounded-lg transition-colors ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-yellow-400' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}
          >
            {isDark ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex">
        {/* Sidebar navigation */}
        <nav className={`w-56 flex-shrink-0 border-r ${isDark ? 'border-slate-800 bg-slate-900/50' : 'border-gray-200 bg-white'}`}>
          <div className="p-4 space-y-1">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeSection === section.id
                    ? (isDark ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-700')
                    : (isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100')
                }`}
              >
                {section.label}
              </button>
            ))}
          </div>
        </nav>

        {/* Content area */}
        <main className="flex-1 overflow-auto p-8">
          <div className="max-w-5xl mx-auto space-y-8">
            
            {/* Overview */}
            {activeSection === 'overview' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Arazzo Playground Components</h2>
                  <p className={`${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                    This showcase displays the UI components used in the Arazzo Playground application. 
                    Browse through different sections to see components in action.
                  </p>
                </div>
                
                <div className="grid md:grid-cols-3 gap-4">
                  <div className={`p-4 rounded-lg border ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-gray-200 bg-white'}`}>
                    <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center mb-3">
                      <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                      </svg>
                    </div>
                    <h3 className={`font-semibold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>Design Tokens</h3>
                    <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                      Consistent colors, spacing, and typography.
                    </p>
                  </div>
                  
                  <div className={`p-4 rounded-lg border ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-gray-200 bg-white'}`}>
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center mb-3">
                      <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                      </svg>
                    </div>
                    <h3 className={`font-semibold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>UI Components</h3>
                    <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                      Buttons, inputs, cards, and more.
                    </p>
                  </div>
                  
                  <div className={`p-4 rounded-lg border ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-gray-200 bg-white'}`}>
                    <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center mb-3">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <h3 className={`font-semibold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>Visualization</h3>
                    <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                      Mermaid diagrams and React Flow.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Primitives */}
            {activeSection === 'primitives' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Primitives</h2>
                  <p className={`${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                    Primitive components that form the building blocks of the UI. These are generic, reusable components.
                  </p>
                </div>

                {/* Badge Component */}
                <ComponentShowcase
                  title="Badge"
                  description="Status indicators with 20+ variants for different contexts"
                  isDark={isDark}
                >
                  <div className="space-y-4">
                    <div>
                      <h4 className={`text-xs uppercase font-semibold mb-2 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>Entity Types</h4>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="step" isDark={isDark}>Step</Badge>
                        <Badge variant="source" isDark={isDark}>Source</Badge>
                        <Badge variant="input" isDark={isDark}>Input</Badge>
                        <Badge variant="output" isDark={isDark}>Output</Badge>
                        <Badge variant="workflow" isDark={isDark}>Workflow</Badge>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className={`text-xs uppercase font-semibold mb-2 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>HTTP Methods</h4>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="method-get" isDark={isDark}>GET</Badge>
                        <Badge variant="method-post" isDark={isDark}>POST</Badge>
                        <Badge variant="method-put" isDark={isDark}>PUT</Badge>
                        <Badge variant="method-patch" isDark={isDark}>PATCH</Badge>
                        <Badge variant="method-delete" isDark={isDark}>DELETE</Badge>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className={`text-xs uppercase font-semibold mb-2 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>Status</h4>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="success" isDark={isDark}>Success</Badge>
                        <Badge variant="failure" isDark={isDark}>Failure</Badge>
                        <Badge variant="warning" isDark={isDark}>Warning</Badge>
                        <Badge variant="info" isDark={isDark}>Info</Badge>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className={`text-xs uppercase font-semibold mb-2 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>Types</h4>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="type-string" isDark={isDark}>string</Badge>
                        <Badge variant="type-number" isDark={isDark}>number</Badge>
                        <Badge variant="type-boolean" isDark={isDark}>boolean</Badge>
                        <Badge variant="type-object" isDark={isDark}>object</Badge>
                        <Badge variant="type-array" isDark={isDark}>array</Badge>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className={`text-xs uppercase font-semibold mb-2 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>Sizes</h4>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="step" isDark={isDark} size="xs">Extra Small</Badge>
                        <Badge variant="step" isDark={isDark} size="sm">Small</Badge>
                        <Badge variant="step" isDark={isDark} size="md">Medium</Badge>
                      </div>
                    </div>
                  </div>
                </ComponentShowcase>

                {/* Card Component */}
                <ComponentShowcase
                  title="Card"
                  description="Collapsible container with optional icon, badge, and actions"
                  isDark={isDark}
                >
                  <div className="space-y-4">
                    <Card title="Simple Card" isDark={isDark}>
                      <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                        This is a basic card with just a title and content.
                      </p>
                    </Card>
                    
                    <Card 
                      title="Card with Badge" 
                      isDark={isDark}
                      badge={<Badge variant="success" isDark={isDark} size="xs">3 items</Badge>}
                    >
                      <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                        Card with a badge indicator in the header.
                      </p>
                    </Card>
                    
                    <Card 
                      title="Collapsible Card" 
                      isDark={isDark}
                      collapsible={true}
                      icon={
                        <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                      }
                    >
                      <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                        Click the header to collapse/expand this card.
                      </p>
                    </Card>
                  </div>
                </ComponentShowcase>

                {/* CodeBlock Component */}
                <ComponentShowcase
                  title="CodeBlock"
                  description="Code display with syntax highlighting and copy button"
                  isDark={isDark}
                >
                  <div className="space-y-4">
                    <CodeBlock
                      code={`{
  "petId": 1,
  "quantity": 1,
  "status": "placed"
}`}
                      language="json"
                      isDark={isDark}
                      title="Request Body"
                    />
                    
                    <CodeBlock
                      code="$steps.find-pet.outputs.petId"
                      language="expression"
                      isDark={isDark}
                    />
                  </div>
                </ComponentShowcase>

                {/* PropertyList Component */}
                <ComponentShowcase
                  title="PropertyList"
                  description="Key-value list with types, required badges, and variants"
                  isDark={isDark}
                >
                  <div className="space-y-4">
                    <PropertyList
                      items={[
                        { name: 'petId', value: '12345', type: 'string', required: true },
                        { name: 'quantity', value: '1', type: 'number' },
                        { name: 'status', value: 'available', type: 'string' },
                        { name: 'complete', value: 'true', type: 'boolean' },
                      ]}
                      isDark={isDark}
                    />
                    
                    <h5 className={`text-xs uppercase font-semibold mt-4 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>Compact Variant</h5>
                    <PropertyList
                      items={[
                        { name: '/data/petId', value: '$inputs.selectedPet' },
                        { name: '/data/status', value: 'purchased' },
                      ]}
                      isDark={isDark}
                      variant="compact"
                      borderColor="border-amber-400"
                    />
                  </div>
                </ComponentShowcase>
              </div>
            )}

            {/* Arazzo Components */}
            {activeSection === 'arazzo' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Arazzo Components</h2>
                  <p className={`${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                    Specialized components for displaying Arazzo 1.0.1 specification objects: reusable references, 
                    criteria, actions, dependencies, and payload replacements.
                  </p>
                </div>

                {/* ReusableRef Component */}
                <ComponentShowcase
                  title="ReusableRef"
                  description="Displays a reference to a reusable component ($components.xxx.yyy)"
                  isDark={isDark}
                >
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <h4 className={`text-xs uppercase font-semibold ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>Parameter Reference</h4>
                      <ReusableRef 
                        reusable={{ reference: '$components.parameters.storeId', value: '42' }} 
                        isDark={isDark} 
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className={`text-xs uppercase font-semibold ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>Success Action Reference</h4>
                      <ReusableRef 
                        reusable={{ reference: '$components.successActions.gotoCheckout' }} 
                        isDark={isDark}
                        showValue={false}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className={`text-xs uppercase font-semibold ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>Clickable Reference</h4>
                      <ReusableRef 
                        reusable={{ reference: '$components.inputs.searchParams', value: { type: 'available' } }} 
                        isDark={isDark} 
                        onClick={(ref) => alert(`Clicked: ${ref}`)}
                      />
                    </div>
                  </div>
                </ComponentShowcase>

                {/* CriterionBadge Component */}
                <ComponentShowcase
                  title="CriterionBadge"
                  description="Displays a criterion with its type, version, and condition"
                  isDark={isDark}
                >
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <h4 className={`text-xs uppercase font-semibold ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>Simple Criterion</h4>
                      <CriterionBadge 
                        criterion={{ condition: '$statusCode == 200' }} 
                        isDark={isDark} 
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className={`text-xs uppercase font-semibold ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>Regex Criterion</h4>
                      <CriterionBadge 
                        criterion={{ condition: '^2[0-9]{2}$', type: 'regex' }} 
                        isDark={isDark}
                        showDetails
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className={`text-xs uppercase font-semibold ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>JSONPath with Context</h4>
                      <CriterionBadge 
                        criterion={{ 
                          condition: '$.pets[?(@.status=="available")]', 
                          type: { type: 'jsonpath', version: 'draft-goessner-dispatch-jsonpath-00' },
                          context: '$response.body'
                        }} 
                        isDark={isDark}
                        showDetails
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className={`text-xs uppercase font-semibold ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>XPath Criterion</h4>
                      <CriterionBadge 
                        criterion={{ 
                          condition: '//pet[status="available"]', 
                          type: { type: 'xpath', version: 'xpath-30' }
                        }} 
                        isDark={isDark}
                        showDetails
                      />
                    </div>
                  </div>
                </ComponentShowcase>

                {/* ActionList Component */}
                <ComponentShowcase
                  title="ActionList"
                  description="Displays a list of success or failure actions with criteria"
                  isDark={isDark}
                >
                  <div className="grid md:grid-cols-2 gap-4">
                    <ActionList
                      actions={[
                        { name: 'goToCheckout', type: 'goto', stepId: 'checkout-step' },
                        { name: 'endSuccess', type: 'end' },
                      ] as SuccessAction[]}
                      type="success"
                      isDark={isDark}
                      onStepClick={(id) => alert(`Go to step: ${id}`)}
                    />
                    
                    <ActionList
                      actions={[
                        { 
                          name: 'retryOnError', 
                          type: 'retry', 
                          retryAfter: 5, 
                          retryLimit: 3,
                          criteria: [{ condition: '$statusCode >= 500' }]
                        },
                        { name: 'abortWorkflow', type: 'end' },
                      ] as FailureAction[]}
                      type="failure"
                      isDark={isDark}
                    />
                  </div>
                  
                  <div className="mt-4">
                    <h4 className={`text-xs uppercase font-semibold mb-2 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>With Reusable Reference</h4>
                    <ActionList
                      actions={[
                        { name: 'successAction', type: 'goto', stepId: 'next-step' },
                        { reference: '$components.successActions.commonSuccess' } as ReusableObject,
                      ]}
                      type="success"
                      isDark={isDark}
                      onRefClick={(ref) => alert(`View component: ${ref}`)}
                    />
                  </div>
                </ComponentShowcase>

                {/* DependsOnList Component */}
                <ComponentShowcase
                  title="DependsOnList"
                  description="Displays the list of workflow dependencies (dependsOn field)"
                  isDark={isDark}
                >
                  <div className="space-y-4">
                    <DependsOnList
                      dependencies={['login-workflow', 'setup-data']}
                      isDark={isDark}
                      onWorkflowClick={(id) => alert(`Navigate to workflow: ${id}`)}
                    />
                    
                    <DependsOnList
                      dependencies={['$sourceDescriptions.external-api.workflows.auth']}
                      isDark={isDark}
                    />
                  </div>
                </ComponentShowcase>

                {/* PayloadReplacements Component */}
                <ComponentShowcase
                  title="PayloadReplacements"
                  description="Displays a list of payload replacements (target → value)"
                  isDark={isDark}
                >
                  <PayloadReplacements
                    replacements={[
                      { target: '/data/petId', value: '$inputs.selectedPet' },
                      { target: '/data/quantity', value: 1 },
                      { target: '/data/status', value: 'pending' },
                      { target: '/data/customer', value: { id: '$inputs.customerId', name: '$inputs.customerName' } },
                    ] as PayloadReplacement[]}
                    isDark={isDark}
                    collapsible
                  />
                </ComponentShowcase>
              </div>
            )}

            {/* Badges */}
            {activeSection === 'badges' && (
              <ComponentShowcase
                title="Badges"
                description="Status indicators and labels used throughout the application"
                isDark={isDark}
                code={`<span className="px-2 py-1 rounded text-xs font-semibold bg-indigo-100 text-indigo-700">
  Step
</span>`}
              >
                <BadgeShowcase isDark={isDark} />
              </ComponentShowcase>
            )}

            {/* Buttons */}
            {activeSection === 'buttons' && (
              <ComponentShowcase
                title="Buttons"
                description="Various button styles and variants"
                isDark={isDark}
                code={`<button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors">
  Primary Button
</button>`}
              >
                <ButtonShowcase isDark={isDark} />
              </ComponentShowcase>
            )}

            {/* Inputs */}
            {activeSection === 'inputs' && (
              <ComponentShowcase
                title="Form Inputs"
                description="Text inputs, selects, and form controls"
                isDark={isDark}
                code={`<input
  type="text"
  placeholder="Enter value..."
  className="w-full px-3 py-2 rounded-lg border bg-white border-gray-300 text-gray-900"
/>`}
              >
                <InputShowcase isDark={isDark} />
              </ComponentShowcase>
            )}

            {/* Cards */}
            {activeSection === 'cards' && (
              <ComponentShowcase
                title="Cards"
                description="Container components for grouping content"
                isDark={isDark}
              >
                <CardShowcase isDark={isDark} />
              </ComponentShowcase>
            )}

            {/* Mermaid Diagrams */}
            {activeSection === 'mermaid' && (
              <div className="space-y-6">
                <ComponentShowcase
                  title="Flowchart Diagram"
                  description="Mermaid flowchart for visualizing workflow steps"
                  isDark={isDark}
                  code={sampleFlowchart}
                >
                  <div className="h-96 overflow-auto">
                    <MermaidDiagram chart={sampleFlowchart} isDark={isDark} />
                  </div>
                </ComponentShowcase>
                
                <ComponentShowcase
                  title="Sequence Diagram"
                  description="Mermaid sequence diagram for API interactions"
                  isDark={isDark}
                  code={sampleSequence}
                >
                  <div className="h-96 overflow-auto">
                    <MermaidDiagram chart={sampleSequence} isDark={isDark} />
                  </div>
                </ComponentShowcase>
              </div>
            )}

            {/* React Flow */}
            {activeSection === 'flow' && (
              <ComponentShowcase
                title="React Flow Visualization"
                description="Interactive node-based workflow visualization"
                isDark={isDark}
              >
                <div className="h-[500px] rounded-lg overflow-hidden border" style={{ borderColor: isDark ? '#334155' : '#e5e7eb' }}>
                  <ArazzoFlow 
                    nodes={sampleNodes} 
                    edges={sampleEdges}
                    workflowId="demo-workflow"
                    isDark={isDark}
                    onDetailSelect={setDetailData}
                  />
                </div>
              </ComponentShowcase>
            )}

            {/* Detail Drawer */}
            {activeSection === 'drawer' && (
              <div className="space-y-6">
                <div className={`p-4 rounded-lg border ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-gray-200 bg-white'}`}>
                  <h3 className={`font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Detail Drawer</h3>
                  <p className={`text-sm mb-4 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                    Click a button below to see the Detail Drawer with different content types.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setDetailData({ type: 'step', step: sampleStep, sourceForStep: sampleSource })}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-sm font-medium transition-colors"
                    >
                      Show Step Details
                    </button>
                    <button
                      onClick={() => setDetailData({ type: 'source', source: sampleSource })}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm font-medium transition-colors"
                    >
                      Show Source Details
                    </button>
                    <button
                      onClick={() => setDetailData({ type: 'input', input: { name: 'petType', schema: { type: 'string', description: 'Type of pet to search for' } } })}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-sm font-medium transition-colors"
                    >
                      Show Input Details
                    </button>
                    <button
                      onClick={() => setDetailData({ type: 'output', output: { name: 'adoptedPet', value: '$steps.select-pet.outputs.selectedPet' } })}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded text-sm font-medium transition-colors"
                    >
                      Show Output Details
                    </button>
                  </div>
                </div>
                
                {/* Drawer preview container */}
                <div className={`relative h-[500px] rounded-lg border overflow-hidden ${isDark ? 'border-slate-700 bg-slate-900' : 'border-gray-200 bg-gray-50'}`}>
                  <div className="absolute inset-0 flex">
                    <div className={`flex-1 flex items-center justify-center ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>
                      <p className="text-sm">Main content area</p>
                    </div>
                    <DetailDrawer
                      data={detailData}
                      isDark={isDark}
                      onClose={() => setDetailData(null)}
                      workflowInputs={sampleWorkflowInputs}
                      workflowOutputs={sampleWorkflowOutputs}
                    />
                  </div>
                </div>

                {/* Inline Detail Views */}
                <div className="space-y-6 mt-8">
                  <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Detail View Components</h3>
                  <p className={`${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                    These are the individual components used within the Detail Drawer, displayed here for reference.
                  </p>

                  <ComponentShowcase
                    title="Step Content"
                    description="Details for a workflow step"
                    isDark={isDark}
                  >
                    <div className={`h-96 overflow-y-auto p-4 ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
                      <StepContent 
                        step={sampleStep} 
                        sourceForStep={sampleSource} 
                        isDark={isDark} 
                      />
                    </div>
                  </ComponentShowcase>

                  <ComponentShowcase
                    title="Source Content"
                    description="Details for an API source"
                    isDark={isDark}
                  >
                    <div className={`p-4 ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
                      <SourceContent 
                        source={sampleSource} 
                        isDark={isDark} 
                      />
                    </div>
                  </ComponentShowcase>

                  <div className="grid md:grid-cols-2 gap-6">
                    <ComponentShowcase
                      title="Input Content"
                      description="Details for a workflow input"
                      isDark={isDark}
                    >
                      <div className={`p-4 ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
                        <InputContent 
                          input={{ name: 'petType', schema: { type: 'string', description: 'Type of pet to search for' } }} 
                          workflowInputs={sampleWorkflowInputs}
                          isDark={isDark} 
                        />
                      </div>
                    </ComponentShowcase>

                    <ComponentShowcase
                      title="Output Content"
                      description="Details for a workflow output"
                      isDark={isDark}
                    >
                      <div className={`p-4 ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
                        <OutputContent 
                          output={{ name: 'adoptedPet', value: '$steps.select-pet.outputs.selectedPet' }} 
                          workflowOutputs={sampleWorkflowOutputs}
                          isDark={isDark} 
                        />
                      </div>
                    </ComponentShowcase>
                  </div>
                </div>
              </div>
            )}

            {/* Documentation Components */}
            {activeSection === 'documentation' && (
              <div className="space-y-6">
                <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Documentation Components</h3>
                <p className={`${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                  Components used in the documentation view to display workflow steps and API details.
                </p>

                <ComponentShowcase
                  title="Step Card"
                  description="A Swagger-like card displaying a workflow step"
                  isDark={isDark}
                >
                  <div className="space-y-4">
                    <StepCard 
                      step={sampleStep} 
                      stepIndex={0} 
                      workflowId="demo-workflow"
                      isDark={isDark} 
                    />
                    
                    <StepCard 
                      step={{
                        ...sampleStep,
                        stepId: 'place-order',
                        operationId: 'store.placeOrder',
                        description: 'Place an order for a pet',
                        parameters: [],
                        requestBody: {
                          contentType: 'application/json',
                          payload: {
                            petId: 1,
                            quantity: 1,
                            shipDate: "2023-01-01T00:00:00.000Z",
                            status: "placed",
                            complete: true
                          }
                        }
                      }} 
                      stepIndex={1} 
                      workflowId="demo-workflow"
                      isDark={isDark} 
                    />
                  </div>
                </ComponentShowcase>
              </div>
            )}

          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className={`flex-shrink-0 py-3 px-6 text-center text-xs border-t ${isDark ? 'border-slate-800 text-slate-500' : 'border-gray-200 text-gray-400'}`}>
        Arazzo Playground Component Showcase • Made with ❤️ by{' '}
        <a href="https://connethics.com" className="text-indigo-500 hover:underline">connethics.com</a>
      </footer>
    </div>
  );
}
