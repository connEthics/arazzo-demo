'use client';

import { useState } from 'react';
import SourceManager, { ManagedSource } from './SourceManager';
import { OpenAPISpec } from './OpenAPILoader';

interface SourceManagerShowcaseProps {
  isDark: boolean;
}

// Sample sources for demonstration
const INITIAL_SOURCES: ManagedSource[] = [
  {
    id: 'arazzo-main',
    name: 'Pet Adoption Workflow',
    type: 'arazzo',
    fileName: 'pet-adoption.arazzo.yaml',
    isMain: true,
  },
  {
    id: 'petstore',
    name: 'Petstore API',
    type: 'openapi',
    url: '/openapi/petstore.yaml',
    operationCount: 12,
  },
];

export default function SourceManagerShowcase({ isDark }: SourceManagerShowcaseProps) {
  const [sources, setSources] = useState<ManagedSource[]>(INITIAL_SOURCES);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>('arazzo-main');
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const handleAddSource = (spec: OpenAPISpec) => {
    const newSource: ManagedSource = {
      id: `openapi-${Date.now()}`,
      name: spec.name,
      type: 'openapi',
      url: spec.url,
      fileName: spec.fileName,
      operationCount: Math.floor(Math.random() * 20) + 5, // Simulated
    };
    setSources(prev => [...prev, newSource]);
    addLog(`Added source: ${spec.name}`);
  };

  const handleRemoveSource = (sourceId: string) => {
    const source = sources.find(s => s.id === sourceId);
    setSources(prev => prev.filter(s => s.id !== sourceId));
    if (selectedSourceId === sourceId) {
      setSelectedSourceId(sources[0]?.id || null);
    }
    addLog(`Removed source: ${source?.name || sourceId}`);
  };

  const handleSelectSource = (sourceId: string) => {
    setSelectedSourceId(sourceId);
    const source = sources.find(s => s.id === sourceId);
    addLog(`Selected source: ${source?.name || sourceId}`);
  };

  const handleLoadMainSpec = () => {
    if (!sources.some(s => s.type === 'arazzo')) {
      setSources(prev => [
        {
          id: 'arazzo-main',
          name: 'Sample Workflow',
          type: 'arazzo',
          fileName: 'sample.arazzo.yaml',
          isMain: true,
        },
        ...prev,
      ]);
      addLog('Loaded sample Arazzo spec');
    }
  };

  const handleReset = () => {
    setSources(INITIAL_SOURCES);
    setSelectedSourceId('arazzo-main');
    setLogs([]);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Source Manager</h2>
        <p className={`${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
          Panel for managing Arazzo and OpenAPI source files. Located in the left sidebar 
          of the Builder. Allows loading, selecting, and removing sources.
        </p>
      </div>

      {/* Preview */}
      <div className={`rounded-xl border overflow-hidden ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-gray-200 bg-white'}`}>
        <div className={`px-4 py-3 border-b flex items-center justify-between ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-100 bg-gray-50'}`}>
          <div>
            <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Preview</h3>
            <p className={`text-sm mt-0.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              Selected: <span className="font-mono font-medium">{selectedSourceId || 'none'}</span>
            </p>
          </div>
          <button
            onClick={handleReset}
            className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
              isDark
                ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
            }`}
          >
            Reset
          </button>
        </div>
        
        <div className="flex">
          {/* Source Manager Panel */}
          <div className={`w-72 h-[400px] border-r ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
            <SourceManager
              sources={sources}
              onAddSource={handleAddSource}
              onRemoveSource={handleRemoveSource}
              onSelectSource={handleSelectSource}
              selectedSourceId={selectedSourceId}
              isDark={isDark}
              mainSpecLoaded={sources.some(s => s.type === 'arazzo')}
              onLoadMainSpec={handleLoadMainSpec}
            />
          </div>

          {/* Selected Source Details */}
          <div className={`flex-1 p-4 ${isDark ? 'bg-slate-900/50' : 'bg-gray-50/50'}`}>
            {selectedSourceId ? (
              <SelectedSourceDetails
                source={sources.find(s => s.id === selectedSourceId)!}
                isDark={isDark}
              />
            ) : (
              <div className={`h-full flex items-center justify-center ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                <p className="text-sm">Select a source to view details</p>
              </div>
            )}
          </div>
        </div>

        {/* Activity Log */}
        <div className={`border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
          <div className={`px-4 py-2 border-b ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-gray-200 bg-gray-50'}`}>
            <h4 className={`text-xs font-semibold uppercase ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              Activity Log
            </h4>
          </div>
          <div className={`px-4 py-3 max-h-24 overflow-y-auto ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
            {logs.length === 0 ? (
              <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                Interact with the Source Manager to see activity.
              </p>
            ) : (
              <div className="space-y-1">
                {logs.slice(-5).map((log, idx) => (
                  <div key={idx} className={`text-xs font-mono ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                    {log}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className={`p-4 rounded-lg border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
          <h4 className={`font-semibold mb-2 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
            </svg>
            Arazzo Spec
          </h4>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Main workflow specification with workflows, steps, and outputs
          </p>
        </div>
        
        <div className={`p-4 rounded-lg border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
          <h4 className={`font-semibold mb-2 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            OpenAPI Sources
          </h4>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Additional API definitions to reference operations and schemas
          </p>
        </div>
        
        <div className={`p-4 rounded-lg border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
          <h4 className={`font-semibold mb-2 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Quick Actions
          </h4>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Add sources via upload, URL, or built-in samples
          </p>
        </div>
      </div>

      {/* Integration Note */}
      <div className={`p-4 rounded-lg border ${isDark ? 'border-indigo-500/30 bg-indigo-500/10' : 'border-indigo-200 bg-indigo-50'}`}>
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h4 className={`font-semibold mb-1 ${isDark ? 'text-indigo-300' : 'text-indigo-900'}`}>
              Builder Integration
            </h4>
            <p className={`text-sm ${isDark ? 'text-indigo-200/80' : 'text-indigo-700'}`}>
              The Source Manager is the first section in the left panel. When a source is 
              selected, its operations become available in the Operations Toolbox below for 
              drag &amp; drop onto the canvas.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Selected Source Details Component
function SelectedSourceDetails({ source, isDark }: { source: ManagedSource; isDark: boolean }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
          source.type === 'arazzo'
            ? isDark ? 'bg-purple-500/20' : 'bg-purple-100'
            : isDark ? 'bg-blue-500/20' : 'bg-blue-100'
        }`}>
          {source.type === 'arazzo' ? (
            <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
            </svg>
          ) : (
            <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          )}
        </div>
        <div>
          <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {source.name}
          </h3>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            {source.type === 'arazzo' ? 'Arazzo Specification' : 'OpenAPI Definition'}
          </p>
        </div>
      </div>

      <div className={`space-y-2 p-3 rounded-lg ${isDark ? 'bg-slate-800' : 'bg-gray-100'}`}>
        <div className="flex justify-between text-sm">
          <span className={isDark ? 'text-slate-400' : 'text-gray-500'}>Type</span>
          <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {source.type.toUpperCase()}
          </span>
        </div>
        {source.url && (
          <div className="flex justify-between text-sm">
            <span className={isDark ? 'text-slate-400' : 'text-gray-500'}>URL</span>
            <span className={`font-mono text-xs ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {source.url}
            </span>
          </div>
        )}
        {source.fileName && (
          <div className="flex justify-between text-sm">
            <span className={isDark ? 'text-slate-400' : 'text-gray-500'}>File</span>
            <span className={`font-mono text-xs ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {source.fileName}
            </span>
          </div>
        )}
        {source.operationCount !== undefined && (
          <div className="flex justify-between text-sm">
            <span className={isDark ? 'text-slate-400' : 'text-gray-500'}>Operations</span>
            <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {source.operationCount}
            </span>
          </div>
        )}
      </div>

      {source.type === 'openapi' && (
        <div className={`p-3 rounded-lg border ${isDark ? 'border-blue-500/30 bg-blue-500/10' : 'border-blue-200 bg-blue-50'}`}>
          <p className={`text-xs ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
            💡 Operations from this source are available in the Operations Toolbox 
            for drag &amp; drop onto the canvas.
          </p>
        </div>
      )}
    </div>
  );
}
