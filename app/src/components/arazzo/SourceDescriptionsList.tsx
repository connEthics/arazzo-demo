'use client';

import { memo } from 'react';
import type { SourceDescription } from '@/types/arazzo';
import { Badge } from '../primitives';
import { getThemeClasses } from '@/hooks/useThemeClasses';

interface SourceDescriptionsListProps {
  sources: SourceDescription[];
  isDark: boolean;
  /** Show description if available */
  showDescription?: boolean;
  /** Compact mode for smaller spaces */
  compact?: boolean;
}

/**
 * Reusable component to display a list of API source descriptions.
 * Used in Overview, Documentation, and other views.
 */
function SourceDescriptionsList({ 
  sources, 
  isDark, 
  showDescription = true,
  compact = false,
}: SourceDescriptionsListProps) {
  const theme = getThemeClasses(isDark);

  if (!sources || sources.length === 0) {
    return null;
  }

  return (
    <div className={compact ? 'space-y-2' : 'grid gap-3'}>
      {sources.map((source) => (
        <div 
          key={source.name}
          className={`${compact ? 'p-3' : 'p-4'} rounded-lg border ${theme.border} ${theme.hover} transition-colors ${theme.cardBg}`}
        >
          {/* Header row - responsive */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <Badge 
                variant={source.type === 'openapi' ? 'openapi' : 'arazzo'} 
                isDark={isDark} 
                size="xs"
              >
                {source.type || 'unknown'}
              </Badge>
              <span className={`font-medium ${theme.text} truncate`}>{source.name}</span>
            </div>
            {source.url && (
              <code className={`text-xs ${theme.muted} font-mono break-all sm:break-normal sm:truncate max-w-full sm:max-w-xs lg:max-w-md`}>
                {source.url}
              </code>
            )}
          </div>
          
          {/* Description - optional */}
          {showDescription && source.description && (
            <p className={`text-sm ${theme.muted} mt-2`}>{source.description}</p>
          )}
        </div>
      ))}
    </div>
  );
}

export default memo(SourceDescriptionsList);
