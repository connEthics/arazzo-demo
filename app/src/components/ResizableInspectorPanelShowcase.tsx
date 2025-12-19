'use client';

import { useState } from 'react';
import ResizableInspectorPanel from './ResizableInspectorPanel';
import StepInspector, { InspectorStep } from './StepInspector';

interface ResizableInspectorPanelShowcaseProps {
  isDark: boolean;
}

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

export default function ResizableInspectorPanelShowcase({ isDark }: ResizableInspectorPanelShowcaseProps) {
  const [step, setStep] = useState<InspectorStep | null>(SAMPLE_STEP);
  const [isOpen, setIsOpen] = useState(true);
  const [currentWidth, setCurrentWidth] = useState(384);
  const [position, setPosition] = useState<'left' | 'right'>('right');
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev.slice(-4), `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Resizable Inspector Panel</h2>
        <p className={`${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
          Wrapper component that adds resize functionality to any panel.
          Drag the edge to resize, with min/max constraints.
        </p>
      </div>

      {/* Controls */}
      <div className={`flex flex-wrap gap-3 p-4 rounded-lg border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
        <button
          onClick={() => { setIsOpen(!isOpen); addLog(`Panel ${!isOpen ? 'opened' : 'closed'}`); }}
          className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
            isOpen
              ? 'bg-indigo-600 text-white'
              : isDark
                ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
          }`}
        >
          {isOpen ? 'Close Panel' : 'Open Panel'}
        </button>

        <div className={`w-px h-8 ${isDark ? 'bg-slate-600' : 'bg-gray-200'}`} />

        <div className="flex gap-1">
          <button
            onClick={() => { setPosition('left'); addLog('Position: left'); }}
            className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
              position === 'left'
                ? 'bg-indigo-600 text-white'
                : isDark
                  ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
            }`}
          >
            Left
          </button>
          <button
            onClick={() => { setPosition('right'); addLog('Position: right'); }}
            className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
              position === 'right'
                ? 'bg-indigo-600 text-white'
                : isDark
                  ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
            }`}
          >
            Right
          </button>
        </div>

        <div className={`w-px h-8 ${isDark ? 'bg-slate-600' : 'bg-gray-200'}`} />

        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}>
          <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Width:</span>
          <span className={`text-xs font-mono font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{currentWidth}px</span>
        </div>
      </div>

      {/* Preview */}
      <div className={`rounded-xl border overflow-hidden ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
        <div className={`flex h-[500px] ${position === 'left' ? 'flex-row-reverse' : 'flex-row'}`}>
          {/* Simulated canvas area */}
          <div className={`flex-1 flex items-center justify-center ${isDark ? 'bg-slate-950' : 'bg-gray-100'}`}>
            <div className={`text-center ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>
              <svg className="w-16 h-16 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
              </svg>
              <p className="text-sm font-medium">Canvas Area</p>
              <p className="text-xs mt-1">Drag the panel edge to resize</p>
              <p className="text-xs mt-3 max-w-xs mx-auto">
                Panel on the {position} • {isOpen ? `${currentWidth}px wide` : 'collapsed'}
              </p>
            </div>
          </div>

          {/* Resizable Inspector */}
          <ResizableInspectorPanel
            defaultWidth={384}
            minWidth={280}
            maxWidth={600}
            isDark={isDark}
            position={position}
            isOpen={isOpen}
            onToggle={() => { setIsOpen(!isOpen); addLog(`Toggled: ${!isOpen ? 'open' : 'closed'}`); }}
            onResize={(w) => { setCurrentWidth(w); }}
          >
            <StepInspector
              step={step}
              onStepChange={setStep}
              onClose={() => { setIsOpen(false); addLog('Closed via X button'); }}
              isDark={isDark}
            />
          </ResizableInspectorPanel>
        </div>

        {/* Activity Log */}
        <div className={`border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
          <div className={`px-4 py-3 ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
            <h4 className={`text-xs font-semibold uppercase mb-2 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              Activity Log
            </h4>
            <div className="h-16 overflow-y-auto space-y-1">
              {logs.length === 0 ? (
                <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                  Drag the resize handle or use controls above...
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
      <div className="grid md:grid-cols-3 gap-4">
        <div className={`p-4 rounded-lg border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
          <h4 className={`font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            🔄 Drag to Resize
          </h4>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Grab the edge handle and drag to adjust panel width. Shows width indicator while dragging.
          </p>
        </div>

        <div className={`p-4 rounded-lg border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
          <h4 className={`font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            📏 Min/Max Constraints
          </h4>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Configurable minimum (280px) and maximum (600px) width to prevent over-resizing.
          </p>
        </div>

        <div className={`p-4 rounded-lg border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
          <h4 className={`font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            ↔️ Left/Right Position
          </h4>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Works on either side. Resize handle and collapse button adapt to position.
          </p>
        </div>
      </div>

      {/* Props table */}
      <div className={`p-4 rounded-lg border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
        <h4 className={`font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Props
        </h4>
        <div className="overflow-x-auto">
          <table className={`w-full text-sm ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
            <thead>
              <tr className={isDark ? 'text-slate-400' : 'text-gray-500'}>
                <th className="text-left py-2 pr-4">Prop</th>
                <th className="text-left py-2 pr-4">Type</th>
                <th className="text-left py-2 pr-4">Default</th>
                <th className="text-left py-2">Description</th>
              </tr>
            </thead>
            <tbody className="font-mono text-xs">
              <tr className={`border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                <td className="py-2 pr-4">defaultWidth</td>
                <td className="py-2 pr-4 text-indigo-400">number</td>
                <td className="py-2 pr-4">384</td>
                <td className="py-2 font-sans">Initial width in pixels</td>
              </tr>
              <tr className={`border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                <td className="py-2 pr-4">minWidth</td>
                <td className="py-2 pr-4 text-indigo-400">number</td>
                <td className="py-2 pr-4">280</td>
                <td className="py-2 font-sans">Minimum allowed width</td>
              </tr>
              <tr className={`border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                <td className="py-2 pr-4">maxWidth</td>
                <td className="py-2 pr-4 text-indigo-400">number</td>
                <td className="py-2 pr-4">600</td>
                <td className="py-2 font-sans">Maximum allowed width</td>
              </tr>
              <tr className={`border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                <td className="py-2 pr-4">position</td>
                <td className="py-2 pr-4 text-emerald-400">&apos;left&apos; | &apos;right&apos;</td>
                <td className="py-2 pr-4">&apos;right&apos;</td>
                <td className="py-2 font-sans">Panel position</td>
              </tr>
              <tr className={`border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                <td className="py-2 pr-4">onResize</td>
                <td className="py-2 pr-4 text-amber-400">(width) =&gt; void</td>
                <td className="py-2 pr-4">-</td>
                <td className="py-2 font-sans">Called during resize</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
