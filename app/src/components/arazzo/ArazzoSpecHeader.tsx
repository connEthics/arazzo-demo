'use client';

import { memo } from 'react';
import type { ArazzoInfo } from '@/types/arazzo';
import { Badge } from '../primitives';
import { getThemeClasses } from '@/hooks/useThemeClasses';

interface ArazzoSpecHeaderProps {
  info: ArazzoInfo;
  arazzoVersion: string;
  isDark: boolean;
  /** Center the content (for documentation view) */
  centered?: boolean;
  /** Show the decorative icon */
  showIcon?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Reusable header component displaying Arazzo specification info.
 * Used in Overview, Documentation, and other views.
 */
function ArazzoSpecHeader({ 
  info, 
  arazzoVersion,
  isDark, 
  centered = false,
  showIcon = true,
  size = 'md',
}: ArazzoSpecHeaderProps) {
  const theme = getThemeClasses(isDark);

  const sizeStyles = {
    sm: {
      title: 'text-xl',
      summary: 'text-sm',
      description: 'text-xs',
      icon: 'w-12 h-12',
      iconSvg: 'w-6 h-6',
    },
    md: {
      title: 'text-2xl',
      summary: 'text-sm',
      description: 'text-sm',
      icon: 'w-16 h-16',
      iconSvg: 'w-8 h-8',
    },
    lg: {
      title: 'text-4xl print:text-3xl',
      summary: 'text-lg',
      description: 'text-base',
      icon: 'w-16 h-16',
      iconSvg: 'w-8 h-8',
    },
  };

  const styles = sizeStyles[size];

  if (centered) {
    return (
      <div className="text-center">
        {showIcon && (
          <div className={`${styles.icon} mx-auto mb-6 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center print:hidden`}>
            <svg className={`${styles.iconSvg} text-white`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        )}
        <h1 className={`${styles.title} font-bold ${theme.text} mb-2`}>{info.title}</h1>
        <p className={`${styles.summary} ${theme.muted} mb-4`}>Version {info.version}</p>
        {info.summary && (
          <p className={`${styles.description} ${theme.muted} mb-3 max-w-3xl mx-auto`}>{info.summary}</p>
        )}
        {info.description && (
          <p className={`${styles.description} ${theme.muted} max-w-3xl mx-auto leading-relaxed`}>{info.description}</p>
        )}
        <div className={`mt-6 inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-gray-100 text-gray-600'}`}>
          <span>Arazzo Specification</span>
          <span className="font-mono">{arazzoVersion}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        {/* Badge row - responsive */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
          <Badge variant="arazzo" isDark={isDark} size="sm">
            Arazzo {arazzoVersion}
          </Badge>
          <span className={`text-xs ${theme.muted}`}>v{info.version}</span>
        </div>
        
        {/* Title */}
        <h1 className={`${styles.title} font-bold ${theme.text} mb-2 break-words`}>
          {info.title}
        </h1>
        
        {/* Summary */}
        {info.summary && (
          <p className={`${styles.summary} ${theme.muted} mb-3`}>{info.summary}</p>
        )}
        
        {/* Description */}
        {info.description && (
          <p className={`${styles.description} ${isDark ? 'text-slate-300' : 'text-gray-600'} leading-relaxed`}>
            {info.description}
          </p>
        )}
      </div>
      
      {/* Icon - hidden on mobile, visible on sm+ */}
      {showIcon && (
        <div className={`hidden sm:flex flex-shrink-0 ${styles.icon} rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 items-center justify-center shadow-lg`}>
          <svg className={`${styles.iconSvg} text-white`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
      )}
    </div>
  );
}

export default memo(ArazzoSpecHeader);
