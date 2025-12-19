'use client';

import { useState } from 'react';
import StepInspector, { InspectorStep } from './StepInspector';
import { ExpressionSuggestion } from './ExpressionInput';

interface StepInspectorShowcaseProps {
  isDark: boolean;
}

// Custom expression suggestions for this demo
const DEMO_SUGGESTIONS: ExpressionSuggestion[] = [
  { expression: '$statusCode', label: 'HTTP Status Code', type: 'context' },
  { expression: '$response.body', label: 'Response Body', type: 'response' },
  { expression: '$response.body.id', label: 'Response ID', type: 'response' },
  { expression: '$response.body.length', label: 'Array Length', type: 'response' },
  { expression: '$response.header.content-type', label: 'Content-Type', type: 'response' },
  { expression: '$inputs.userId', label: 'User ID Input', type: 'input' },
  { expression: '$inputs.status', label: 'Status Input', type: 'input' },
  { expression: '$steps.find-available-pets.outputs.petCount', label: 'Pet Count', type: 'output' },
  { expression: '$steps.select-pet.outputs.selectedPet', label: 'Selected Pet', type: 'output' },
];

// Available steps for goto action dropdown
const AVAILABLE_STEPS = [
  'find-available-pets',
  'select-pet',
  'reserve-pet',
  'complete-adoption',
  'run-authentication',
  'fetch-user-data',
];

const SAMPLE_STEP: InspectorStep = {
  stepId: 'find-available-pets',
  operationId: 'petstore.findPetsByStatus',
  operationPath: '/pet/findByStatus',
  description: 'Search for pets that are currently available for adoption in the store.',
  parameters: [
    { name: 'status', in: 'query', value: 'available' },
    { name: 'limit', in: 'query', value: 10 },
  ],
  successCriteria: [
    { condition: '$statusCode == 200' },
    { condition: '$response.body.length > 0' },
  ],
  outputs: {
    availablePets: '$response.body',
    petCount: '$response.body.length',
  },
  onSuccess: [
    { name: 'goToSelectPet', type: 'goto', stepId: 'select-pet' },
  ],
  onFailure: [
    { name: 'retryOnError', type: 'retry', retryAfter: 5, retryLimit: 3 },
  ],
};

const WORKFLOW_STEP: InspectorStep = {
  stepId: 'run-authentication',
  workflowId: 'user-authentication',
  description: 'Execute the user authentication workflow before proceeding.',
  outputs: {
    authToken: '$steps.run-authentication.outputs.token',
  },
  onSuccess: [
    { type: 'goto', stepId: 'fetch-user-data' },
  ],
  onFailure: [
    { type: 'end' },
  ],
};

export default function StepInspectorShowcase({ isDark }: StepInspectorShowcaseProps) {
  const [selectedStep, setSelectedStep] = useState<InspectorStep | null>(SAMPLE_STEP);
  const [readOnly, setReadOnly] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev.slice(-9), `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const handleStepChange = (step: InspectorStep) => {
    setSelectedStep(step);
    addLog(`Updated: ${JSON.stringify(step).slice(0, 50)}...`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Step Inspector</h2>
        <p className={`${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
          Right panel for inspecting and editing step properties.
          In read-only mode, uses the same StepContent as DetailDrawer.
          In edit mode, provides interactive forms with add/remove functionality.
        </p>
      </div>

      {/* Controls */}
      <div className={`flex flex-wrap gap-3 p-4 rounded-lg border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => { setSelectedStep(SAMPLE_STEP); addLog('Selected: API Step'); }}
            className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
              selectedStep?.stepId === 'find-available-pets'
                ? 'bg-indigo-600 text-white'
                : isDark
                  ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
            }`}
          >
            API Operation Step
          </button>
          <button
            onClick={() => { setSelectedStep(WORKFLOW_STEP); addLog('Selected: Workflow Step'); }}
            className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
              selectedStep?.stepId === 'run-authentication'
                ? 'bg-indigo-600 text-white'
                : isDark
                  ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
            }`}
          >
            Workflow Step
          </button>
          <button
            onClick={() => { setSelectedStep(null); addLog('Cleared selection'); }}
            className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
              selectedStep === null
                ? 'bg-indigo-600 text-white'
                : isDark
                  ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
            }`}
          >
            No Selection
          </button>
        </div>
        
        <div className={`w-px h-8 ${isDark ? 'bg-slate-600' : 'bg-gray-200'}`} />
        
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={readOnly}
            onChange={(e) => { setReadOnly(e.target.checked); addLog(`Mode: ${e.target.checked ? 'Read Only' : 'Edit'}`); }}
            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span className={`text-xs ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
            Read Only {readOnly ? '(uses StepContent)' : '(edit forms)'}
          </span>
        </label>
      </div>

      {/* Preview */}
      <div className={`rounded-xl border overflow-hidden ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
        <div className="flex h-[600px]">
          {/* Simulated canvas area */}
          <div className={`flex-1 flex items-center justify-center ${isDark ? 'bg-slate-950' : 'bg-gray-100'}`}>
            <div className={`text-center ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>
              <svg className="w-16 h-16 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
              </svg>
              <p className="text-sm font-medium">Canvas Area</p>
              <p className="text-xs mt-1">
                {selectedStep ? `${readOnly ? 'Viewing' : 'Editing'}: ${selectedStep.stepId}` : 'Select a step to inspect'}
              </p>
              <p className="text-xs mt-3 max-w-xs mx-auto">
                {readOnly 
                  ? 'Read-only mode uses StepContent from DetailViews - same as DetailDrawer'
                  : 'Edit mode: try adding parameters, criteria, or outputs!'}
              </p>
            </div>
          </div>

          {/* Inspector panel */}
          <div className="w-96 flex-shrink-0">
            <StepInspector
              step={selectedStep}
              onStepChange={handleStepChange}
              onClose={() => {
                setSelectedStep(null);
                addLog('Inspector closed');
              }}
              readOnly={readOnly}
              isDark={isDark}
              availableSteps={AVAILABLE_STEPS}
              expressionSuggestions={DEMO_SUGGESTIONS}
            />
          </div>
        </div>

        {/* Activity Log */}
        <div className={`border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
          <div className={`px-4 py-3 ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
            <h4 className={`text-xs font-semibold uppercase mb-2 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              Activity Log
            </h4>
            <div className="h-20 overflow-y-auto space-y-1">
              {logs.length === 0 ? (
                <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                  Interact with the inspector to see activity...
                </p>
              ) : (
                logs.map((log, idx) => (
                  <div key={idx} className={`text-xs font-mono ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className={`p-4 rounded-lg border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
          <h4 className={`font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            General Tab
          </h4>
          <ul className={`text-sm space-y-2 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500">✓</span>
              Step ID and description editing
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500">✓</span>
              Operation/Workflow display with badges
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500">✓</span>
              Outputs visualization with PropertyList
            </li>
          </ul>
        </div>

        <div className={`p-4 rounded-lg border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
          <h4 className={`font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Other Tabs
          </h4>
          <ul className={`text-sm space-y-2 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            <li className="flex items-start gap-2">
              <span className="text-indigo-500">⚙️</span>
              Parameters with ExpressionInput autocomplete
            </li>
            <li className="flex items-start gap-2">
              <span className="text-indigo-500">✓</span>
              Criteria with ExpressionInput + quick suggestions
            </li>
            <li className="flex items-start gap-2">
              <span className="text-indigo-500">🔀</span>
              Actions using ActionFormEditor (CRUD)
            </li>
          </ul>
        </div>
      </div>

      {/* Integrated Components Info */}
      <div className={`p-4 rounded-lg border ${isDark ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-emerald-200 bg-emerald-50'}`}>
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h4 className={`font-semibold mb-1 ${isDark ? 'text-emerald-300' : 'text-emerald-900'}`}>
              Integrated Components
            </h4>
            <p className={`text-sm ${isDark ? 'text-emerald-200/80' : 'text-emerald-700'}`}>
              StepInspector now uses <strong>ActionFormEditor</strong> for the Actions tab (CRUD for onSuccess/onFailure) 
              and <strong>ExpressionInput</strong> for all expression fields (parameters, criteria, outputs).
              This ensures architectural consistency across the Builder.
            </p>
          </div>
        </div>
      </div>

      {/* Note about resizing */}
      <div className={`p-4 rounded-lg border ${isDark ? 'border-amber-500/30 bg-amber-500/10' : 'border-amber-200 bg-amber-50'}`}>
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h4 className={`font-semibold mb-1 ${isDark ? 'text-amber-300' : 'text-amber-900'}`}>
              Panel Resizing
            </h4>
            <p className={`text-sm ${isDark ? 'text-amber-200/80' : 'text-amber-700'}`}>
              In the actual Builder page, the inspector panel will be resizable using a drag handle.
              This showcase uses a fixed width (w-96) for demonstration purposes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
