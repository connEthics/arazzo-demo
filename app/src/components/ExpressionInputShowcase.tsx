'use client';

import { useState } from 'react';
import ExpressionInput, { ExpressionSuggestion } from './ExpressionInput';

interface ExpressionInputShowcaseProps {
  isDark: boolean;
}

// Extended suggestions for showcase
const SHOWCASE_SUGGESTIONS: ExpressionSuggestion[] = [
  // Context
  { expression: '$statusCode', label: 'Status Code', description: 'HTTP response status code', type: 'context' },
  { expression: '$url', label: 'Request URL', description: 'The request URL', type: 'context' },
  { expression: '$method', label: 'HTTP Method', description: 'GET, POST, PUT, etc.', type: 'context' },
  // Response
  { expression: '$response.body', label: 'Response Body', description: 'Full response body', type: 'response' },
  { expression: '$response.body.id', label: 'Body ID', description: 'ID from response body', type: 'response' },
  { expression: '$response.body.name', label: 'Body Name', description: 'Name from response body', type: 'response' },
  { expression: '$response.body.length', label: 'Body Length', description: 'Array length of response', type: 'response' },
  { expression: '$response.header.content-type', label: 'Content-Type', description: 'Response content type', type: 'response' },
  { expression: '$response.header.x-request-id', label: 'Request ID', description: 'Request tracking ID', type: 'response' },
  // Inputs
  { expression: '$inputs.petType', label: 'Pet Type', description: 'Workflow input for pet type', type: 'input' },
  { expression: '$inputs.maxPrice', label: 'Max Price', description: 'Workflow input for price limit', type: 'input' },
  { expression: '$inputs.customerId', label: 'Customer ID', description: 'Workflow input for customer', type: 'input' },
  // Step outputs
  { expression: '$steps.find-pets.outputs.availablePets', label: 'Available Pets', description: 'Output from find-pets step', type: 'output', stepId: 'find-pets', outputKey: 'availablePets' },
  { expression: '$steps.find-pets.outputs.petCount', label: 'Pet Count', description: 'Count of available pets', type: 'output', stepId: 'find-pets', outputKey: 'petCount' },
  { expression: '$steps.select-pet.outputs.selectedPet', label: 'Selected Pet', description: 'Output from select-pet step', type: 'output', stepId: 'select-pet', outputKey: 'selectedPet' },
  { expression: '$steps.place-order.outputs.orderId', label: 'Order ID', description: 'Output from place-order step', type: 'output', stepId: 'place-order', outputKey: 'orderId' },
];

export default function ExpressionInputShowcase({ isDark }: ExpressionInputShowcaseProps) {
  const [simpleValue, setSimpleValue] = useState('');
  const [criteriaValue, setCriteriaValue] = useState('$statusCode == 200');
  const [outputValue, setOutputValue] = useState('$response.body.id');
  const [paramValue, setParamValue] = useState('$inputs.petType');
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (field: string, value: string) => {
    setLogs(prev => [...prev.slice(-9), `${new Date().toLocaleTimeString()}: ${field} = "${value}"`]);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Expression Input</h2>
        <p className={`${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
          Smart input field with autocomplete for Arazzo expressions.
          Type $ to see available expressions from context, inputs, and step outputs.
        </p>
      </div>

      {/* Demo Grid */}
      <div className={`rounded-xl border overflow-hidden ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
        <div className={`p-6 ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Default Variant */}
            <div className={`p-4 rounded-lg border ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-gray-200 bg-gray-50/50'}`}>
              <h4 className={`text-sm font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Default Variant
              </h4>
              <ExpressionInput
                label="Success Criterion"
                value={criteriaValue}
                onChange={(v) => { setCriteriaValue(v); addLog('criteria', v); }}
                placeholder="e.g., $statusCode == 200"
                isDark={isDark}
                suggestions={SHOWCASE_SUGGESTIONS}
                showQuickSuggestions
                quickSuggestions={['$statusCode == 200', '$statusCode == 201', '$response.body.length > 0']}
                helpText="Condition that must be true for step to succeed"
              />
            </div>

            {/* Compact Variant */}
            <div className={`p-4 rounded-lg border ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-gray-200 bg-gray-50/50'}`}>
              <h4 className={`text-sm font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Compact Variant
              </h4>
              <ExpressionInput
                label="Output Value"
                value={outputValue}
                onChange={(v) => { setOutputValue(v); addLog('output', v); }}
                placeholder="Expression..."
                isDark={isDark}
                variant="compact"
                suggestions={SHOWCASE_SUGGESTIONS}
              />
              <div className="mt-4">
                <ExpressionInput
                  label="Parameter Value"
                  value={paramValue}
                  onChange={(v) => { setParamValue(v); addLog('param', v); }}
                  placeholder="Static or expression..."
                  isDark={isDark}
                  variant="compact"
                  suggestions={SHOWCASE_SUGGESTIONS}
                />
              </div>
            </div>

            {/* With Error */}
            <div className={`p-4 rounded-lg border ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-gray-200 bg-gray-50/50'}`}>
              <h4 className={`text-sm font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                With Error State
              </h4>
              <ExpressionInput
                label="Invalid Expression"
                value="$steps.unknown.outputs.x"
                onChange={() => {}}
                isDark={isDark}
                suggestions={SHOWCASE_SUGGESTIONS}
                error="Step 'unknown' does not exist in this workflow"
              />
            </div>

            {/* Empty / Prompt to type */}
            <div className={`p-4 rounded-lg border ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-gray-200 bg-gray-50/50'}`}>
              <h4 className={`text-sm font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Try It!
              </h4>
              <ExpressionInput
                label="Type $ to start"
                value={simpleValue}
                onChange={(v) => { setSimpleValue(v); addLog('simple', v); }}
                placeholder="Type $ and see suggestions..."
                isDark={isDark}
                suggestions={SHOWCASE_SUGGESTIONS}
                helpText="Try typing $steps. or $response."
              />
            </div>
          </div>
        </div>

        {/* Activity Log */}
        <div className={`border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
          <div className={`px-4 py-3 ${isDark ? 'bg-slate-950' : 'bg-gray-50'}`}>
            <h4 className={`text-xs font-semibold uppercase mb-2 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              Activity Log
            </h4>
            <div className="h-20 overflow-y-auto space-y-1">
              {logs.length === 0 ? (
                <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                  Type in any field to see changes logged here...
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

      {/* Expression Types */}
      <div className="grid md:grid-cols-5 gap-3">
        {[
          { type: 'context', icon: '⚡', label: 'Context', examples: '$statusCode, $url, $method' },
          { type: 'response', icon: '📨', label: 'Response', examples: '$response.body, $response.header' },
          { type: 'input', icon: '📥', label: 'Inputs', examples: '$inputs.key' },
          { type: 'output', icon: '📤', label: 'Outputs', examples: '$steps.id.outputs.key' },
          { type: 'step', icon: '🔗', label: 'Steps', examples: '$steps.stepId...' },
        ].map((item) => (
          <div
            key={item.type}
            className={`p-3 rounded-lg border text-center ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}
          >
            <span className="text-2xl">{item.icon}</span>
            <h5 className={`text-xs font-semibold mt-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {item.label}
            </h5>
            <p className={`text-[10px] mt-1 font-mono ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              {item.examples}
            </p>
          </div>
        ))}
      </div>

      {/* Features */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className={`p-4 rounded-lg border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
          <h4 className={`font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            🔍 Smart Autocomplete
          </h4>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Type $ to see suggestions. Filters as you type. Use arrow keys to navigate, Enter to select.
          </p>
        </div>

        <div className={`p-4 rounded-lg border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
          <h4 className={`font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            ⚡ Quick Suggestions
          </h4>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Common expressions shown as clickable buttons. One-click to insert common patterns.
          </p>
        </div>

        <div className={`p-4 rounded-lg border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
          <h4 className={`font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            📍 Expression Badge
          </h4>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Visual indicator when value is an expression. Color-coded suggestion types.
          </p>
        </div>
      </div>

      {/* Props Reference */}
      <div className={`p-4 rounded-lg border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
        <h4 className={`font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Key Props
        </h4>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <code className="text-indigo-500">suggestions</code>
            <span className={`ml-2 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              Array of expression suggestions with type, label, description
            </span>
          </div>
          <div>
            <code className="text-indigo-500">variant</code>
            <span className={`ml-2 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              &apos;default&apos; | &apos;compact&apos; | &apos;inline&apos; - Size variant
            </span>
          </div>
          <div>
            <code className="text-indigo-500">showQuickSuggestions</code>
            <span className={`ml-2 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              Show quick suggestion buttons below input
            </span>
          </div>
          <div>
            <code className="text-indigo-500">quickSuggestions</code>
            <span className={`ml-2 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              Array of expressions to show as quick buttons
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
