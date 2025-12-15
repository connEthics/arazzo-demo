'use client';

import { memo, ReactNode } from 'react';
import { getThemeClasses } from '@/hooks/useThemeClasses';

type MaxWidth = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl' | 'full';

interface PageContainerProps {
  /** Page content */
  children: ReactNode;
  /** Dark mode toggle */
  isDark: boolean;
  /** Maximum width of content area */
  maxWidth?: MaxWidth;
  /** Padding size */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** Additional CSS classes */
  className?: string;
}

const maxWidthStyles: Record<MaxWidth, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
  '6xl': 'max-w-6xl',
  '7xl': 'max-w-7xl',
  full: 'max-w-full',
};

const paddingStyles: Record<string, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

/**
 * A consistent page container with scrollable area and max-width content.
 * Used as the outer wrapper for full-page views.
 * 
 * @example
 * <PageContainer isDark={isDark} maxWidth="4xl" padding="md">
 *   <ContentCard isDark={isDark}>...</ContentCard>
 * </PageContainer>
 */
function PageContainer({
  children,
  isDark,
  maxWidth = '4xl',
  padding = 'md',
  className = '',
}: PageContainerProps) {
  const theme = getThemeClasses(isDark);

  return (
    <div className={`h-full overflow-auto ${theme.bg} ${className}`}>
      <div className={`${maxWidthStyles[maxWidth]} mx-auto ${paddingStyles[padding]} space-y-6`}>
        {children}
      </div>
    </div>
  );
}

export default memo(PageContainer);
