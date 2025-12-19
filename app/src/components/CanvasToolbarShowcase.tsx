'use client';

import { useState } from 'react';
import CanvasToolbar, { DisplayOptions } from './CanvasToolbar';

interface CanvasToolbarShowcaseProps {
  isDark: boolean;
}

export default function CanvasToolbarShowcase({ isDark }: CanvasToolbarShowcaseProps) {
  const [zoom, setZoom] = useState(1);
  const [layoutDirection, setLayoutDirection] = useState<'horizontal' | 'vertical'>('vertical');
  const [selectedCount, setSelectedCount] = useState(0);
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [displayOptions, setDisplayOptions] = useState<DisplayOptions>({
    showPorts: true,
    showDataFlow: true,
    showErrorFlow: false,
    showOutputs: true,
    showDescriptions: false,
  });

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 2));
    addLog(`Zoom in: ${Math.round((zoom + 0.25) * 100)}%`);
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.25));
    addLog(`Zoom out: ${Math.round((zoom - 0.25) * 100)}%`);
  };

  const handleZoomReset = () => {
    setZoom(1);
    addLog('Zoom reset to 100%');
  };

  const handleZoomToFit = () => {
    setZoom(0.75);
    addLog('Fit to view');
  };

  const handleAutoLayout = () => {
    addLog('Auto layout applied');
    // Simulate adding to undo stack
    setUndoStack(prev => [...prev, 'layout']);
    setRedoStack([]);
  };

  const handleUndo = () => {
    if (undoStack.length > 0) {
      const action = undoStack[undoStack.length - 1];
      setUndoStack(prev => prev.slice(0, -1));
      setRedoStack(prev => [...prev, action]);
      addLog(`Undo: ${action}`);
    }
  };

  const handleRedo = () => {
    if (redoStack.length > 0) {
      const action = redoStack[redoStack.length - 1];
      setRedoStack(prev => prev.slice(0, -1));
      setUndoStack(prev => [...prev, action]);
      addLog(`Redo: ${action}`);
    }
  };

  const handleDeleteSelected = () => {
    addLog(`Deleted ${selectedCount} items`);
    setUndoStack(prev => [...prev, `delete ${selectedCount}`]);
    setRedoStack([]);
    setSelectedCount(0);
  };

  const handleDuplicateSelected = () => {
    addLog(`Duplicated ${selectedCount} items`);
    setUndoStack(prev => [...prev, `duplicate ${selectedCount}`]);
    setRedoStack([]);
  };

  const handleDisplayOptionsChange = (newOptions: DisplayOptions) => {
    const changed = Object.keys(newOptions).find(
      key => newOptions[key as keyof DisplayOptions] !== displayOptions[key as keyof DisplayOptions]
    );
    if (changed) {
      const value = newOptions[changed as keyof DisplayOptions];
      addLog(`${changed}: ${value ? 'ON' : 'OFF'}`);
    }
    setDisplayOptions(newOptions);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Canvas Toolbar</h2>
        <p className={`${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
          Floating toolbar for canvas controls: zoom, layout, selection actions, and undo/redo.
          Typically positioned at the bottom of the canvas.
        </p>
      </div>

      {/* Interactive Canvas Preview */}
      <div className={`rounded-xl border overflow-hidden ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-gray-200 bg-white'}`}>
        <div className={`px-4 py-3 border-b flex items-center justify-between ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-100 bg-gray-50'}`}>
          <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Interactive Preview</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedCount(prev => prev === 0 ? 3 : 0)}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                selectedCount > 0
                  ? 'bg-indigo-600 text-white'
                  : isDark
                    ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
              }`}
            >
              {selectedCount > 0 ? 'Clear Selection' : 'Select 3 Items'}
            </button>
            <button
              onClick={() => {
                setZoom(1);
                setLayoutDirection('vertical');
                setSelectedCount(0);
                setUndoStack([]);
                setRedoStack([]);
                setLogs([]);
              }}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                isDark
                  ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
              }`}
            >
              Reset All
            </button>
          </div>
        </div>

        {/* Canvas simulation */}
        <div className={`relative h-80 ${isDark ? 'bg-slate-900' : 'bg-gray-100'}`}>
          {/* Grid background */}
          <div 
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: `radial-gradient(circle, ${isDark ? '#475569' : '#9ca3af'} 1px, transparent 1px)`,
              backgroundSize: '20px 20px',
              transform: `scale(${zoom})`,
              transformOrigin: 'center',
            }}
          />

          {/* Simulated nodes */}
          <div 
            className="absolute inset-0 flex items-center justify-center transition-transform duration-200"
            style={{ transform: `scale(${zoom})` }}
          >
            <div className={`flex ${layoutDirection === 'vertical' ? 'flex-col' : 'flex-row'} gap-4`}>
              {['Step 1', 'Step 2', 'Step 3'].map((step, idx) => (
                <div
                  key={step}
                  className={`px-6 py-3 rounded-lg border-2 transition-colors ${
                    selectedCount > 0 && idx < selectedCount
                      ? isDark
                        ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                        : 'bg-indigo-50 border-indigo-500 text-indigo-700'
                      : isDark
                        ? 'bg-slate-800 border-slate-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  {step}
                </div>
              ))}
            </div>
          </div>

          {/* The actual toolbar */}
          <CanvasToolbar
            zoom={zoom}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onZoomReset={handleZoomReset}
            onZoomToFit={handleZoomToFit}
            onAutoLayout={handleAutoLayout}
            layoutDirection={layoutDirection}
            onLayoutDirectionChange={setLayoutDirection}
            selectedCount={selectedCount}
            onDeleteSelected={handleDeleteSelected}
            onDuplicateSelected={handleDuplicateSelected}
            canUndo={undoStack.length > 0}
            canRedo={redoStack.length > 0}
            onUndo={handleUndo}
            onRedo={handleRedo}
            displayOptions={displayOptions}
            onDisplayOptionsChange={handleDisplayOptionsChange}
            isDark={isDark}
            position="bottom-left"
          />

          {/* Status indicator */}
          <div className={`absolute top-4 right-4 px-3 py-1.5 rounded-lg text-xs font-mono ${
            isDark ? 'bg-slate-800 text-slate-300' : 'bg-white text-gray-600'
          }`}>
            Zoom: {Math.round(zoom * 100)}% | Layout: {layoutDirection}
          </div>

          {/* Display options indicator */}
          <div className={`absolute top-4 left-4 flex gap-2 px-3 py-1.5 rounded-lg ${
            isDark ? 'bg-slate-800 text-slate-400' : 'bg-white text-gray-500 shadow-sm'
          }`}>
            <span className={`text-xs ${displayOptions.showPorts ? 'text-blue-500' : 'opacity-40'}`} title="Ports">⚡</span>
            <span className={`text-xs ${displayOptions.showDataFlow ? 'text-emerald-500' : 'opacity-40'}`} title="Data Flow">→</span>
            <span className={`text-xs ${displayOptions.showErrorFlow ? 'text-red-500' : 'opacity-40'}`} title="Error Flow">⚠</span>
            <span className={`text-xs ${displayOptions.showOutputs ? 'text-amber-500' : 'opacity-40'}`} title="Outputs">📤</span>
            <span className={`text-xs ${displayOptions.showDescriptions ? 'text-purple-500' : 'opacity-40'}`} title="Descriptions">📝</span>
          </div>
        </div>

        {/* Activity Log */}
        <div className={`border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
          <div className={`px-4 py-2 border-b ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-gray-200 bg-gray-50'}`}>
            <div className="flex items-center justify-between">
              <h4 className={`text-xs font-semibold uppercase ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                Activity Log
              </h4>
              <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                Undo: {undoStack.length} | Redo: {redoStack.length}
              </div>
            </div>
          </div>
          <div className={`px-4 py-3 max-h-24 overflow-y-auto ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
            {logs.length === 0 ? (
              <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                Use the toolbar to see activity.
              </p>
            ) : (
              <div className="space-y-1">
                {logs.slice(-6).map((log, idx) => (
                  <div key={idx} className={`text-xs font-mono ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                    {log}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Position variants */}
      <div className={`p-4 rounded-lg border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
        <h4 className={`font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>Position Variants</h4>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {(['bottom-left', 'bottom-center', 'bottom-right', 'top-left', 'top-right'] as const).map((pos) => (
            <div
              key={pos}
              className={`relative h-24 rounded-lg border ${isDark ? 'border-slate-600 bg-slate-900' : 'border-gray-200 bg-gray-50'}`}
            >
              <div className={`absolute ${
                pos.includes('bottom') ? 'bottom-2' : 'top-2'
              } ${
                pos.includes('left') ? 'left-2' : pos.includes('right') ? 'right-2' : 'left-1/2 -translate-x-1/2'
              } px-2 py-1 rounded text-[10px] font-mono ${
                isDark ? 'bg-slate-700 text-slate-300' : 'bg-white text-gray-600 shadow-sm'
              }`}>
                {pos}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div className="grid md:grid-cols-4 gap-4">
        <div className={`p-4 rounded-lg border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
          <h4 className={`font-semibold mb-2 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
            </svg>
            Zoom Controls
          </h4>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Zoom in/out, reset, fit to view, preset levels
          </p>
        </div>

        <div className={`p-4 rounded-lg border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
          <h4 className={`font-semibold mb-2 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5z" />
            </svg>
            Layout Options
          </h4>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Auto-layout, horizontal/vertical toggle
          </p>
        </div>

        <div className={`p-4 rounded-lg border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
          <h4 className={`font-semibold mb-2 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2" />
            </svg>
            Selection Actions
          </h4>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Duplicate, delete selected nodes
          </p>
        </div>

        <div className={`p-4 rounded-lg border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
          <h4 className={`font-semibold mb-2 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
            Undo/Redo
          </h4>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Full history with keyboard shortcuts
          </p>
        </div>
      </div>
    </div>
  );
}
