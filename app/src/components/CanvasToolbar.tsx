'use client';

import { useState } from 'react';

export interface DisplayOptions {
  showPorts: boolean;
  showDataFlow: boolean;
  showErrorFlow: boolean;
  showOutputs: boolean;
  showDescriptions: boolean;
}

interface CanvasToolbarProps {
  // Zoom controls
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onZoomToFit: () => void;
  
  // Layout controls
  onAutoLayout?: () => void;
  layoutDirection?: 'horizontal' | 'vertical';
  onLayoutDirectionChange?: (direction: 'horizontal' | 'vertical') => void;
  
  // Display options (for Builder mode)
  displayOptions?: DisplayOptions;
  onDisplayOptionsChange?: (options: DisplayOptions) => void;
  
  // Selection
  selectedCount?: number;
  onDeleteSelected?: () => void;
  onDuplicateSelected?: () => void;
  
  // Undo/Redo
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  
  // Theme
  isDark?: boolean;
  
  // Positioning
  position?: 'bottom-left' | 'bottom-center' | 'bottom-right' | 'top-left' | 'top-right';
}

/**
 * Floating toolbar for canvas controls: zoom, layout, selection actions, undo/redo.
 * Typically positioned at the bottom-left of the canvas.
 */
export default function CanvasToolbar({
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onZoomToFit,
  onAutoLayout,
  layoutDirection = 'vertical',
  onLayoutDirectionChange,
  displayOptions,
  onDisplayOptionsChange,
  selectedCount = 0,
  onDeleteSelected,
  onDuplicateSelected,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  isDark = false,
  position = 'bottom-left',
}: CanvasToolbarProps) {
  const [showZoomMenu, setShowZoomMenu] = useState(false);
  const [showDisplayMenu, setShowDisplayMenu] = useState(false);

  const positionClasses = {
    'bottom-left': 'bottom-4 left-4',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
    'bottom-right': 'bottom-4 right-4',
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
  };

  const buttonClass = `p-2 rounded-lg transition-colors ${
    isDark
      ? 'hover:bg-slate-700 text-slate-300 hover:text-white'
      : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
  }`;

  const disabledButtonClass = `p-2 rounded-lg ${
    isDark ? 'text-slate-600 cursor-not-allowed' : 'text-gray-300 cursor-not-allowed'
  }`;

  const dividerClass = `w-px h-6 ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`;

  const zoomPresets = [25, 50, 75, 100, 125, 150, 200];

  return (
    <div className={`absolute ${positionClasses[position]} z-10`}>
      <div className={`flex items-center gap-1 px-2 py-1.5 rounded-xl shadow-lg border ${
        isDark 
          ? 'bg-slate-800/95 border-slate-700 backdrop-blur-sm' 
          : 'bg-white/95 border-gray-200 backdrop-blur-sm'
      }`}>
        {/* Undo/Redo */}
        {(onUndo || onRedo) && (
          <>
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className={canUndo ? buttonClass : disabledButtonClass}
              title="Undo (Ctrl+Z)"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
            </button>
            <button
              onClick={onRedo}
              disabled={!canRedo}
              className={canRedo ? buttonClass : disabledButtonClass}
              title="Redo (Ctrl+Shift+Z)"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
              </svg>
            </button>
            <div className={dividerClass} />
          </>
        )}

        {/* Zoom controls */}
        <button
          onClick={onZoomOut}
          className={buttonClass}
          title="Zoom out"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
          </svg>
        </button>

        {/* Zoom percentage button with dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowZoomMenu(!showZoomMenu)}
            className={`px-2 py-1 rounded text-xs font-medium min-w-[50px] text-center transition-colors ${
              isDark
                ? 'hover:bg-slate-700 text-slate-300'
                : 'hover:bg-gray-100 text-gray-600'
            }`}
            title="Zoom level"
          >
            {Math.round(zoom * 100)}%
          </button>

          {showZoomMenu && (
            <>
              <div 
                className="fixed inset-0" 
                onClick={() => setShowZoomMenu(false)} 
              />
              <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 py-1 rounded-lg shadow-lg border min-w-[80px] ${
                isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
              }`}>
                {zoomPresets.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => {
                      onZoomReset(); // This should ideally set to specific zoom
                      setShowZoomMenu(false);
                    }}
                    className={`w-full px-3 py-1.5 text-xs text-left transition-colors ${
                      Math.round(zoom * 100) === preset
                        ? isDark
                          ? 'bg-indigo-600/20 text-indigo-300'
                          : 'bg-indigo-50 text-indigo-700'
                        : isDark
                          ? 'hover:bg-slate-700 text-slate-300'
                          : 'hover:bg-gray-50 text-gray-600'
                    }`}
                  >
                    {preset}%
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <button
          onClick={onZoomIn}
          className={buttonClass}
          title="Zoom in"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
          </svg>
        </button>

        <button
          onClick={onZoomToFit}
          className={buttonClass}
          title="Fit to view"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </button>

        {/* Layout controls */}
        {(onAutoLayout || onLayoutDirectionChange) && (
          <>
            <div className={dividerClass} />
            
            {onAutoLayout && (
              <button
                onClick={onAutoLayout}
                className={buttonClass}
                title="Auto layout"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                </svg>
              </button>
            )}

            {onLayoutDirectionChange && (
              <button
                onClick={() => onLayoutDirectionChange(layoutDirection === 'vertical' ? 'horizontal' : 'vertical')}
                className={buttonClass}
                title={`Switch to ${layoutDirection === 'vertical' ? 'horizontal' : 'vertical'} layout`}
              >
                {layoutDirection === 'vertical' ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 4v16M12 4v16M16 4v16" />
                  </svg>
                )}
              </button>
            )}
          </>
        )}

        {/* Display options dropdown */}
        {displayOptions && onDisplayOptionsChange && (
          <>
            <div className={dividerClass} />
            
            <div className="relative">
              <button
                onClick={() => setShowDisplayMenu(!showDisplayMenu)}
                className={`${buttonClass} flex items-center gap-1`}
                title="Display options"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showDisplayMenu && (
                <>
                  <div 
                    className="fixed inset-0" 
                    onClick={() => setShowDisplayMenu(false)} 
                  />
                  <div className={`absolute bottom-full left-0 mb-2 py-2 rounded-lg shadow-lg border min-w-[180px] ${
                    isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
                  }`}>
                    <div className={`px-3 pb-2 mb-1 border-b text-xs font-semibold uppercase ${
                      isDark ? 'border-slate-700 text-slate-500' : 'border-gray-100 text-gray-400'
                    }`}>
                      Display Options
                    </div>
                    
                    {[
                      { key: 'showPorts', label: 'Ports', icon: '🔌', color: 'text-blue-500' },
                      { key: 'showDataFlow', label: 'Data Flow', icon: '→', color: 'text-emerald-500' },
                      { key: 'showErrorFlow', label: 'Error Flow', icon: '⚠', color: 'text-red-500' },
                      { key: 'showOutputs', label: 'Outputs', icon: '📤', color: 'text-amber-500' },
                      { key: 'showDescriptions', label: 'Descriptions', icon: '📝', color: 'text-purple-500' },
                    ].map(({ key, label, color }) => (
                      <button
                        key={key}
                        onClick={() => {
                          onDisplayOptionsChange({
                            ...displayOptions,
                            [key]: !displayOptions[key as keyof DisplayOptions],
                          });
                        }}
                        className={`w-full px-3 py-1.5 flex items-center justify-between text-sm transition-colors ${
                          isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-50'
                        }`}
                      >
                        <span className={isDark ? 'text-slate-300' : 'text-gray-700'}>{label}</span>
                        <div className={`w-4 h-4 rounded flex items-center justify-center ${
                          displayOptions[key as keyof DisplayOptions]
                            ? `${color} ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`
                            : isDark ? 'text-slate-600' : 'text-gray-300'
                        }`}>
                          {displayOptions[key as keyof DisplayOptions] ? (
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {/* Selection actions */}
        {selectedCount > 0 && (onDeleteSelected || onDuplicateSelected) && (
          <>
            <div className={dividerClass} />
            
            <span className={`px-2 text-xs font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              {selectedCount} selected
            </span>

            {onDuplicateSelected && (
              <button
                onClick={onDuplicateSelected}
                className={buttonClass}
                title="Duplicate (Ctrl+D)"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            )}

            {onDeleteSelected && (
              <button
                onClick={onDeleteSelected}
                className={`p-2 rounded-lg transition-colors ${
                  isDark
                    ? 'hover:bg-red-900/30 text-red-400 hover:text-red-300'
                    : 'hover:bg-red-50 text-red-500 hover:text-red-600'
                }`}
                title="Delete (Delete)"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
