'use client';

import { useState } from 'react';

export interface DisplayOptions {
  showPorts: boolean;
  showDataFlow: boolean;
  showErrorFlow: boolean;
  showOutputs: boolean;
  showDescriptions: boolean;
}

interface DisplayTogglesProps {
  options: DisplayOptions;
  onChange: (options: DisplayOptions) => void;
  isDark?: boolean;
  compact?: boolean;
}

interface ToggleConfig {
  key: keyof DisplayOptions;
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
  activeColor: string;
}

const TOGGLES: ToggleConfig[] = [
  {
    key: 'showPorts',
    label: 'Show Ports',
    shortLabel: 'Ports',
    activeColor: 'text-indigo-500',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    key: 'showDataFlow',
    label: 'Show Data Flow',
    shortLabel: 'Data',
    activeColor: 'text-violet-500',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
      </svg>
    ),
  },
  {
    key: 'showErrorFlow',
    label: 'Show Error Flow',
    shortLabel: 'Errors',
    activeColor: 'text-red-500',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  },
  {
    key: 'showOutputs',
    label: 'Show Outputs',
    shortLabel: 'Outputs',
    activeColor: 'text-amber-500',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
      </svg>
    ),
  },
  {
    key: 'showDescriptions',
    label: 'Show Descriptions',
    shortLabel: 'Desc',
    activeColor: 'text-emerald-500',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
      </svg>
    ),
  },
];

/**
 * Toggle buttons for controlling display options in the Builder canvas.
 * Controls visibility of ports, data flow, error flow, outputs, and descriptions.
 */
export default function DisplayToggles({
  options,
  onChange,
  isDark = false,
  compact = false,
}: DisplayTogglesProps) {
  const handleToggle = (key: keyof DisplayOptions) => {
    onChange({
      ...options,
      [key]: !options[key],
    });
  };

  return (
    <div className={`inline-flex items-center gap-1 p-1 rounded-lg ${
      isDark ? 'bg-slate-800' : 'bg-slate-100'
    }`}>
      {TOGGLES.map((toggle) => {
        const isActive = options[toggle.key];
        return (
          <button
            key={toggle.key}
            onClick={() => handleToggle(toggle.key)}
            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-all ${
              isActive
                ? isDark
                  ? `bg-slate-700 ${toggle.activeColor}`
                  : `bg-white shadow-sm ${toggle.activeColor}`
                : isDark
                  ? 'text-slate-500 hover:text-slate-400 hover:bg-slate-700/50'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'
            }`}
            title={toggle.label}
          >
            <span className={isActive ? toggle.activeColor : ''}>{toggle.icon}</span>
            {!compact && <span>{toggle.shortLabel}</span>}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Individual toggle button for simpler use cases
 */
export function DisplayToggle({
  label,
  checked,
  onChange,
  isDark = false,
  icon,
  activeColor = 'text-indigo-500',
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  isDark?: boolean;
  icon?: React.ReactNode;
  activeColor?: string;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
        checked
          ? isDark
            ? `bg-slate-700 ${activeColor}`
            : `bg-white shadow-sm ${activeColor}`
          : isDark
            ? 'text-slate-500 hover:text-slate-400 bg-slate-800 hover:bg-slate-700'
            : 'text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200'
      }`}
    >
      {icon && <span className={checked ? activeColor : ''}>{icon}</span>}
      <span>{label}</span>
      <div className={`w-7 h-4 rounded-full relative transition-colors ${
        checked 
          ? 'bg-current opacity-30' 
          : isDark ? 'bg-slate-600' : 'bg-slate-300'
      }`}>
        <div className={`absolute top-0.5 w-3 h-3 rounded-full transition-all ${
          checked 
            ? 'left-3.5 bg-current' 
            : isDark ? 'left-0.5 bg-slate-400' : 'left-0.5 bg-white'
        }`} />
      </div>
    </button>
  );
}
