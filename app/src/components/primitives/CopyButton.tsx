'use client';

import { useState } from 'react';

interface CopyButtonProps {
  text: string;
  isDark: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export default function CopyButton({ text, isDark, size = 'md', className = '' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const sizeClasses = size === 'sm' ? 'p-1' : 'p-1.5';
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';

  return (
    <button
      onClick={handleCopy}
      className={`rounded transition-all print:hidden ${sizeClasses} ${
        copied 
          ? 'bg-emerald-500 text-white' 
          : isDark 
            ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' 
            : 'bg-gray-200 hover:bg-gray-300 text-gray-600'
      } ${className}`}
      title={copied ? 'Copied!' : 'Copy to clipboard'}
    >
      {copied ? (
        <svg className={iconSize} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className={iconSize} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      )}
    </button>
  );
}
