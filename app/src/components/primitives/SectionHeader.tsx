'use client';

import { memo, ReactNode, createElement } from 'react';
import { getThemeClasses } from '@/hooks/useThemeClasses';

type HeadingLevel = 'h1' | 'h2' | 'h3' | 'h4';

interface SectionHeaderProps {
  /** The section title text */
  title: string;
  /** Optional icon to display before the title */
  icon?: ReactNode;
  /** Optional badge/count to display after the title */
  badge?: ReactNode;
  /** Optional actions to display on the right side */
  actions?: ReactNode;
  /** Heading level for semantic HTML */
  level?: HeadingLevel;
  /** Dark mode toggle */
  isDark: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
}

const sizeStyles: Record<string, { heading: string; icon: string }> = {
  sm: { heading: 'text-sm font-semibold', icon: 'w-4 h-4' },
  md: { heading: 'text-lg font-semibold', icon: 'w-5 h-5' },
  lg: { heading: 'text-xl font-bold', icon: 'w-6 h-6' },
};

/**
 * A consistent section header component with optional icon, badge, and actions.
 * Used throughout the application for section titles.
 * 
 * @example
 * <SectionHeader
 *   title="Workflow Inputs"
 *   icon={<InputIcon />}
 *   badge={<Badge variant="input" size="xs">3</Badge>}
 *   level="h2"
 *   isDark={isDark}
 * />
 */
function SectionHeader({
  title,
  icon,
  badge,
  actions,
  level = 'h2',
  isDark,
  className = '',
  size = 'md',
}: SectionHeaderProps) {
  const theme = getThemeClasses(isDark);
  const styles = sizeStyles[size];

  const headingContent = (
    <>
      {icon && <span className={styles.icon}>{icon}</span>}
      {title}
      {badge}
    </>
  );

  return (
    <div className={`flex items-center justify-between mb-4 ${className}`}>
      {createElement(
        level,
        { className: `${styles.heading} ${theme.text} flex items-center gap-2` },
        headingContent
      )}
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export default memo(SectionHeader);
