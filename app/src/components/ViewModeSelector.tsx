'use client';

import { useState } from 'react';

export type ViewMode = 'documentation' | 'builder' | 'flowchart' | 'sequence';

interface ViewModeSelectorProps {
  mode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  isDark?: boolean;
  disabled?: boolean;
  compact?: boolean;
}

const VIEW_MODES: { id: ViewMode; label: string; icon: React.ReactNode; description: string }[] = [
  {
    id: 'documentation',
    label: 'Documentation',
    description: 'Unified overview with table of contents',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    id: 'flowchart',
    label: 'Flowchart',
    description: 'Mermaid flowchart diagram',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
      </svg>
    ),
  },
  {
    id: 'sequence',
    label: 'Sequence',
    description: 'Mermaid sequence diagram',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    ),
  },
  {
    id: 'builder',
    label: 'Builder',
    description: 'Visual drag & drop editor',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
      </svg>
    ),
  },
];

/**
 * Selector for switching between view modes in the Builder.
 * Supports: Documentation, Builder, Flowchart, Sequence
 */
export default function ViewModeSelector({
  mode,
  onModeChange,
  isDark = false,
  disabled = false,
  compact = false,
}: ViewModeSelectorProps) {
  const [showTooltip, setShowTooltip] = useState<ViewMode | null>(null);

  return (
    <div className={`inline-flex items-center rounded-lg p-0.5 ${
      isDark ? 'bg-slate-800' : 'bg-slate-100'
    }`}>
      {VIEW_MODES.map((viewMode) => (
        <div key={viewMode.id} className="relative">
          <button
            onClick={() => onModeChange(viewMode.id)}
            disabled={disabled}
            onMouseEnter={() => setShowTooltip(viewMode.id)}
            onMouseLeave={() => setShowTooltip(null)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              mode === viewMode.id
                ? viewMode.id === 'builder'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : viewMode.id === 'documentation'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : viewMode.id === 'flowchart'
                      ? 'bg-sky-600 text-white shadow-sm'
                      : viewMode.id === 'sequence'
                        ? 'bg-violet-600 text-white shadow-sm'
                        : isDark
                          ? 'bg-slate-600 text-white shadow-sm'
                          : 'bg-white text-slate-900 shadow-sm'
                : isDark
                  ? 'text-slate-400 hover:text-slate-300'
                  : 'text-slate-500 hover:text-slate-700'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            title={viewMode.description}
          >
            {viewMode.icon}
            {!compact && viewMode.label}
          </button>
          
          {/* Tooltip */}
          {compact && showTooltip === viewMode.id && (
            <div className={`absolute top-full mt-1 left-1/2 -translate-x-1/2 px-2 py-1 text-xs rounded shadow-lg whitespace-nowrap z-50 ${
              isDark ? 'bg-slate-700 text-white' : 'bg-gray-800 text-white'
            }`}>
              {viewMode.label}
              <div className={`absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 ${
                isDark ? 'bg-slate-700' : 'bg-gray-800'
              }`} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
