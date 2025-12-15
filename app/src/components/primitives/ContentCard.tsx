'use client';

import { memo, ReactNode } from 'react';
import { getThemeClasses } from '@/hooks/useThemeClasses';

interface ContentCardProps {
  /** Card content */
  children: ReactNode;
  /** Dark mode toggle */
  isDark: boolean;
  /** Padding size */
  padding?: 'sm' | 'md' | 'lg';
  /** Additional CSS classes */
  className?: string;
}

const paddingStyles: Record<string, string> = {
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

/**
 * A content card with consistent styling for page sections.
 * 
 * @example
 * <ContentCard isDark={isDark} padding="md">
 *   <SectionHeader title="Inputs" ... />
 *   <div>Content here</div>
 * </ContentCard>
 */
function ContentCard({
  children,
  isDark,
  padding = 'md',
  className = '',
}: ContentCardProps) {
  const theme = getThemeClasses(isDark);

  return (
    <div className={`${theme.cardBg} rounded-xl border ${theme.border} ${paddingStyles[padding]} ${className}`}>
      {children}
    </div>
  );
}

export default memo(ContentCard);
