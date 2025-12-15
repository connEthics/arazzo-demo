'use client';

import { useMemo } from 'react';

export interface ThemeClasses {
  // Backgrounds
  bg: string;
  cardBg: string;
  codeBg: string;
  
  // Text
  text: string;
  muted: string;
  
  // Borders
  border: string;
  
  // Interactive
  hover: string;
  
  // Full class strings for common patterns
  card: string;
  section: string;
}

/**
 * Hook to get consistent theme classes based on dark mode state.
 * Centralizes all theme-related Tailwind class logic.
 */
export function useThemeClasses(isDark: boolean): ThemeClasses {
  return useMemo(() => ({
    // Backgrounds
    bg: isDark ? 'bg-slate-950' : 'bg-gray-50',
    cardBg: isDark ? 'bg-slate-900' : 'bg-white',
    codeBg: isDark ? 'bg-slate-800' : 'bg-gray-50',
    
    // Text
    text: isDark ? 'text-white' : 'text-gray-900',
    muted: isDark ? 'text-slate-400' : 'text-gray-500',
    
    // Borders
    border: isDark ? 'border-slate-800' : 'border-gray-200',
    
    // Interactive
    hover: isDark ? 'hover:bg-slate-800' : 'hover:bg-gray-50',
    
    // Composite patterns
    card: isDark 
      ? 'bg-slate-900 border-slate-800' 
      : 'bg-white border-gray-200',
    section: isDark 
      ? 'bg-slate-900 border-slate-800 rounded-xl border p-6' 
      : 'bg-white border-gray-200 rounded-xl border p-6',
  }), [isDark]);
}

/**
 * Non-hook version for use in components that receive isDark as prop
 * and don't need memoization (e.g., already memoized components)
 */
export function getThemeClasses(isDark: boolean): ThemeClasses {
  return {
    bg: isDark ? 'bg-slate-950' : 'bg-gray-50',
    cardBg: isDark ? 'bg-slate-900' : 'bg-white',
    codeBg: isDark ? 'bg-slate-800' : 'bg-gray-50',
    text: isDark ? 'text-white' : 'text-gray-900',
    muted: isDark ? 'text-slate-400' : 'text-gray-500',
    border: isDark ? 'border-slate-800' : 'border-gray-200',
    hover: isDark ? 'hover:bg-slate-800' : 'hover:bg-gray-50',
    card: isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200',
    section: isDark 
      ? 'bg-slate-900 border-slate-800 rounded-xl border p-6' 
      : 'bg-white border-gray-200 rounded-xl border p-6',
  };
}

export default useThemeClasses;
