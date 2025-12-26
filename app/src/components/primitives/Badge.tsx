'use client';

import { memo } from 'react';

export type BadgeVariant = 
  | 'step' 
  | 'source' 
  | 'input' 
  | 'output' 
  | 'workflow'
  | 'success' 
  | 'failure' 
  | 'error'
  | 'warning'
  | 'info'
  | 'openapi' 
  | 'arazzo'
  | 'required'
  | 'reference'
  | 'method-get'
  | 'method-post'
  | 'method-put'
  | 'method-patch'
  | 'method-delete'
  | 'type-simple'
  | 'type-regex'
  | 'type-jsonpath'
  | 'type-xpath'
  | 'type-string'
  | 'type-number'
  | 'type-integer'
  | 'type-boolean'
  | 'type-object'
  | 'type-array'
  | 'type-null'
  | 'type-unknown';

interface BadgeProps {
  variant: BadgeVariant;
  children: React.ReactNode;
  isDark?: boolean;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

const variantStyles: Record<BadgeVariant, { light: string; dark: string }> = {
  step: { 
    light: 'bg-indigo-100 text-indigo-700 border-indigo-200', 
    dark: 'bg-indigo-900/50 text-indigo-300 border-indigo-700' 
  },
  source: { 
    light: 'bg-purple-100 text-purple-700 border-purple-200', 
    dark: 'bg-purple-900/50 text-purple-300 border-purple-700' 
  },
  input: { 
    light: 'bg-emerald-100 text-emerald-700 border-emerald-200', 
    dark: 'bg-emerald-900/50 text-emerald-300 border-emerald-700' 
  },
  output: { 
    light: 'bg-violet-100 text-violet-700 border-violet-200', 
    dark: 'bg-violet-900/50 text-violet-300 border-violet-700' 
  },
  success: { 
    light: 'bg-emerald-100 text-emerald-700 border-emerald-200', 
    dark: 'bg-emerald-900/50 text-emerald-300 border-emerald-700' 
  },
  failure: { 
    light: 'bg-red-100 text-red-700 border-red-200', 
    dark: 'bg-red-900/50 text-red-300 border-red-700' 
  },
  error: { 
    light: 'bg-red-100 text-red-700 border-red-200', 
    dark: 'bg-red-900/50 text-red-300 border-red-700' 
  },
  warning: { 
    light: 'bg-amber-100 text-amber-700 border-amber-200', 
    dark: 'bg-amber-900/50 text-amber-300 border-amber-700' 
  },
  info: { 
    light: 'bg-blue-100 text-blue-700 border-blue-200', 
    dark: 'bg-blue-900/50 text-blue-300 border-blue-700' 
  },
  openapi: { 
    light: 'bg-blue-100 text-blue-700 border-blue-200', 
    dark: 'bg-blue-900/50 text-blue-300 border-blue-700' 
  },
  arazzo: { 
    light: 'bg-purple-100 text-purple-700 border-purple-200', 
    dark: 'bg-purple-900/50 text-purple-300 border-purple-700' 
  },
  required: { 
    light: 'bg-red-100 text-red-600 border-red-200', 
    dark: 'bg-red-900/50 text-red-400 border-red-700' 
  },
  reference: { 
    light: 'bg-cyan-100 text-cyan-700 border-cyan-200', 
    dark: 'bg-cyan-900/50 text-cyan-300 border-cyan-700' 
  },
  'method-get': { 
    light: 'bg-emerald-100 text-emerald-700 border-emerald-200', 
    dark: 'bg-emerald-900/50 text-emerald-300 border-emerald-700' 
  },
  'method-post': { 
    light: 'bg-blue-100 text-blue-700 border-blue-200', 
    dark: 'bg-blue-900/50 text-blue-300 border-blue-700' 
  },
  'method-put': { 
    light: 'bg-amber-100 text-amber-700 border-amber-200', 
    dark: 'bg-amber-900/50 text-amber-300 border-amber-700' 
  },
  'method-patch': { 
    light: 'bg-orange-100 text-orange-700 border-orange-200', 
    dark: 'bg-orange-900/50 text-orange-300 border-orange-700' 
  },
  'method-delete': { 
    light: 'bg-red-100 text-red-700 border-red-200', 
    dark: 'bg-red-900/50 text-red-300 border-red-700' 
  },
  'type-simple': { 
    light: 'bg-gray-100 text-gray-700 border-gray-200', 
    dark: 'bg-gray-800 text-gray-300 border-gray-600' 
  },
  'type-regex': { 
    light: 'bg-violet-100 text-violet-700 border-violet-200', 
    dark: 'bg-violet-900/50 text-violet-300 border-violet-700' 
  },
  'type-jsonpath': { 
    light: 'bg-teal-100 text-teal-700 border-teal-200', 
    dark: 'bg-teal-900/50 text-teal-300 border-teal-700' 
  },
  'type-xpath': { 
    light: 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200', 
    dark: 'bg-fuchsia-900/50 text-fuchsia-300 border-fuchsia-700' 
  },
  workflow: { 
    light: 'bg-violet-100 text-violet-700 border-violet-200', 
    dark: 'bg-violet-900/50 text-violet-300 border-violet-700' 
  },
  'type-string': { 
    light: 'bg-green-100 text-green-700 border-green-200', 
    dark: 'bg-green-900/50 text-green-300 border-green-700' 
  },
  'type-number': { 
    light: 'bg-blue-100 text-blue-700 border-blue-200', 
    dark: 'bg-blue-900/50 text-blue-300 border-blue-700' 
  },
  'type-integer': { 
    light: 'bg-blue-100 text-blue-700 border-blue-200', 
    dark: 'bg-blue-900/50 text-blue-300 border-blue-700' 
  },
  'type-boolean': { 
    light: 'bg-pink-100 text-pink-700 border-pink-200', 
    dark: 'bg-pink-900/50 text-pink-300 border-pink-700' 
  },
  'type-object': { 
    light: 'bg-slate-100 text-slate-700 border-slate-200', 
    dark: 'bg-slate-700/50 text-slate-300 border-slate-600' 
  },
  'type-array': { 
    light: 'bg-cyan-100 text-cyan-700 border-cyan-200', 
    dark: 'bg-cyan-900/50 text-cyan-300 border-cyan-700' 
  },
  'type-null': { 
    light: 'bg-gray-100 text-gray-700 border-gray-200', 
    dark: 'bg-gray-800 text-gray-300 border-gray-600' 
  },
  'type-unknown': { 
    light: 'bg-gray-100 text-gray-700 border-gray-200', 
    dark: 'bg-gray-800 text-gray-300 border-gray-600' 
  },
};

const sizeStyles = {
  xs: 'text-[9px] px-1 py-0.5',
  sm: 'text-[10px] px-1.5 py-0.5',
  md: 'text-xs px-2 py-1',
};

function Badge({ variant, children, isDark = false, size = 'sm', className = '' }: BadgeProps) {
  const style = variantStyles[variant] || variantStyles['type-unknown'];
  const colors = isDark ? style.dark : style.light;

  return (
    <span className={`inline-flex items-center font-semibold uppercase rounded border ${colors} ${sizeStyles[size]} ${className}`}>
      {children}
    </span>
  );
}

export default memo(Badge);
