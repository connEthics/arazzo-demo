'use client';

import { memo, useState, ReactNode } from 'react';

interface CardProps {
  title?: string;
  children: ReactNode;
  isDark: boolean;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  icon?: ReactNode;
  badge?: ReactNode;
  actions?: ReactNode;
  className?: string;
  noPadding?: boolean;
}

function Card({
  title,
  children,
  isDark,
  collapsible = false,
  defaultExpanded = true,
  icon,
  badge,
  actions,
  className = '',
  noPadding = false
}: CardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const bgClass = isDark ? 'bg-slate-800/50' : 'bg-gray-50';
  const borderClass = isDark ? 'border-slate-700' : 'border-gray-200';
  const mutedClass = isDark ? 'text-slate-500' : 'text-gray-400';

  const handleToggle = () => {
    if (collapsible) {
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <div className={`${bgClass} rounded-lg border ${borderClass} relative ${className}`}>
      {title && (
        <div
          className={`flex items-center justify-between px-3 py-2 ${collapsible ? 'cursor-pointer hover:bg-opacity-80' : ''} ${isExpanded ? `border-b ${borderClass}` : ''
            }`}
          onClick={handleToggle}
        >
          <div className="flex items-center gap-2">
            {icon}
            <h4 className={`text-[10px] uppercase font-semibold ${mutedClass}`}>
              {title}
            </h4>
            {badge}
          </div>
          <div className="flex items-center gap-2">
            {actions}
            {collapsible && (
              <svg
                className={`w-4 h-4 ${mutedClass} transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            )}
          </div>
        </div>
      )}
      {isExpanded && (
        <div className={noPadding ? '' : 'p-3'}>
          {children}
        </div>
      )}
    </div>
  );
}

export default memo(Card);
