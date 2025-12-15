'use client';

import { memo } from 'react';
import ReactMarkdown from 'react-markdown';

interface MarkdownTextProps {
  content: string;
  isDark: boolean;
  className?: string;
  variant?: 'default' | 'compact';
}

function MarkdownText({ content, isDark, className = '', variant = 'default' }: MarkdownTextProps) {
  const textClass = isDark ? 'text-slate-300' : 'text-gray-600';
  const linkClass = isDark ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-500';
  const codeClass = isDark ? 'bg-slate-700 text-slate-200' : 'bg-gray-100 text-gray-800';
  
  const sizeClass = variant === 'compact' ? 'text-xs' : 'text-sm';

  return (
    <div className={`${textClass} ${sizeClass} ${className} markdown-content`}>
      <ReactMarkdown
        components={{
          // Paragraphs
          p: ({ children }) => (
            <p className="mb-2 last:mb-0">{children}</p>
          ),
          // Bold
          strong: ({ children }) => (
            <strong className="font-semibold">{children}</strong>
          ),
          // Italic
          em: ({ children }) => (
            <em className="italic">{children}</em>
          ),
          // Links
          a: ({ href, children }) => (
            <a 
              href={href} 
              target="_blank" 
              rel="noopener noreferrer"
              className={`${linkClass} hover:underline`}
            >
              {children}
            </a>
          ),
          // Inline code
          code: ({ children }) => (
            <code className={`${codeClass} px-1 py-0.5 rounded text-[11px] font-mono`}>
              {children}
            </code>
          ),
          // Unordered lists
          ul: ({ children }) => (
            <ul className="list-disc list-inside mb-2 space-y-0.5 last:mb-0">
              {children}
            </ul>
          ),
          // Ordered lists
          ol: ({ children }) => (
            <ol className="list-decimal list-inside mb-2 space-y-0.5 last:mb-0">
              {children}
            </ol>
          ),
          // List items
          li: ({ children }) => (
            <li className="leading-relaxed">{children}</li>
          ),
          // Headings (if used)
          h1: ({ children }) => (
            <h1 className="text-lg font-bold mb-2">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-base font-bold mb-2">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm font-bold mb-1">{children}</h3>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export default memo(MarkdownText);
