'use client';

import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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
  const tableClass = isDark ? 'border-slate-600' : 'border-gray-300';
  const tableHeaderClass = isDark ? 'bg-slate-700/50' : 'bg-gray-100';
  const tableRowClass = isDark ? 'even:bg-slate-800/30' : 'even:bg-gray-50';
  
  const sizeClass = variant === 'compact' ? 'text-xs' : 'text-sm';

  return (
    <div className={`${textClass} ${sizeClass} ${className} markdown-content`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
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
          // Code blocks (fenced)
          pre: ({ children }) => (
            <pre className={`${codeClass} p-2 rounded-md overflow-x-auto mb-2 last:mb-0`}>
              {children}
            </pre>
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
          // Headings
          h1: ({ children }) => (
            <h1 className="text-lg font-bold mb-2">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-base font-bold mb-2">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm font-bold mb-1">{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-xs font-bold mb-1">{children}</h4>
          ),
          // Tables (GFM)
          table: ({ children }) => (
            <div className="overflow-x-auto mb-2 last:mb-0">
              <table className={`min-w-full border ${tableClass} rounded-md overflow-hidden`}>
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className={tableHeaderClass}>
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-inherit">
              {children}
            </tbody>
          ),
          tr: ({ children }) => (
            <tr className={tableRowClass}>
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th className={`px-2 py-1.5 text-left font-semibold border-b ${tableClass}`}>
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className={`px-2 py-1 border-b ${tableClass}`}>
              {children}
            </td>
          ),
          // Horizontal rule
          hr: () => (
            <hr className={`my-2 border-t ${tableClass}`} />
          ),
          // Blockquote
          blockquote: ({ children }) => (
            <blockquote className={`pl-3 border-l-2 ${isDark ? 'border-slate-500 text-slate-400' : 'border-gray-400 text-gray-500'} italic mb-2 last:mb-0`}>
              {children}
            </blockquote>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export default memo(MarkdownText);
