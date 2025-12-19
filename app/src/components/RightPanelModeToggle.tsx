'use client';

import { useState } from 'react';

export type RightPanelMode = 'read' | 'edit';

interface RightPanelModeToggleProps {
  mode: RightPanelMode;
  onModeChange: (mode: RightPanelMode) => void;
  isDark?: boolean;
  disabled?: boolean;
}

/**
 * Toggle button to switch between Read (DetailDrawer) and Edit (Inspector) modes
 * in the right panel of the Builder.
 */
export default function RightPanelModeToggle({ 
  mode, 
  onModeChange, 
  isDark = false,
  disabled = false 
}: RightPanelModeToggleProps) {
  return (
    <div className={`inline-flex items-center rounded-lg p-0.5 ${
      isDark ? 'bg-slate-800' : 'bg-slate-100'
    }`}>
      {/* Read Mode Button */}
      <button
        onClick={() => onModeChange('read')}
        disabled={disabled}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
          mode === 'read'
            ? isDark
              ? 'bg-slate-700 text-white shadow-sm'
              : 'bg-white text-slate-900 shadow-sm'
            : isDark
              ? 'text-slate-400 hover:text-slate-300'
              : 'text-slate-500 hover:text-slate-700'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        title="View details (read-only)"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
        Read
      </button>

      {/* Edit Mode Button */}
      <button
        onClick={() => onModeChange('edit')}
        disabled={disabled}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
          mode === 'edit'
            ? isDark
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-indigo-600 text-white shadow-sm'
            : isDark
              ? 'text-slate-400 hover:text-slate-300'
              : 'text-slate-500 hover:text-slate-700'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        title="Edit properties"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        Edit
      </button>
    </div>
  );
}
