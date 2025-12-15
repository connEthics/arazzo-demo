'use client';

import { memo, useState, ReactNode } from 'react';
import { getThemeClasses } from '@/hooks/useThemeClasses';

interface CollapsibleSectionProps {
  /** The header content (always visible) */
  header: ReactNode;
  /** The collapsible body content */
  children: ReactNode;
  /** Dark mode toggle */
  isDark: boolean;
  /** Initial open state */
  defaultOpen?: boolean;
  /** Controlled open state */
  isOpen?: boolean;
  /** Callback when open state changes */
  onToggle?: (isOpen: boolean) => void;
  /** Visual variant */
  variant?: 'default' | 'card' | 'timeline';
  /** Additional CSS classes for the container */
  className?: string;
  /** Additional CSS classes for the content area */
  contentClassName?: string;
}

/**
 * A collapsible section component with header and expandable content.
 * Supports both controlled and uncontrolled modes.
 * 
 * @example
 * <CollapsibleSection
 *   header={<div>Step 1: Find Pets</div>}
 *   isDark={isDark}
 *   defaultOpen={false}
 * >
 *   <StepDetails step={step} />
 * </CollapsibleSection>
 */
function CollapsibleSection({
  header,
  children,
  isDark,
  defaultOpen = false,
  isOpen: controlledIsOpen,
  onToggle,
  variant = 'default',
  className = '',
  contentClassName = '',
}: CollapsibleSectionProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const theme = getThemeClasses(isDark);
  
  // Support both controlled and uncontrolled modes
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalOpen;
  
  const handleToggle = () => {
    const newState = !isOpen;
    if (controlledIsOpen === undefined) {
      setInternalOpen(newState);
    }
    onToggle?.(newState);
  };

  // Variant-specific styles
  const variantStyles = {
    default: {
      container: `rounded-lg border ${theme.border} ${theme.cardBg} overflow-hidden`,
      header: `w-full px-4 py-3 flex items-center justify-between gap-3 text-left transition-colors ${theme.hover}`,
      content: `px-4 pb-4 pt-2 border-t ${theme.border}`,
    },
    card: {
      container: `rounded-xl border ${theme.border} ${theme.cardBg} overflow-hidden shadow-sm`,
      header: `w-full px-5 py-4 flex items-center justify-between gap-3 text-left transition-colors ${theme.hover}`,
      content: `px-5 pb-5 pt-3 border-t ${theme.border}`,
    },
    timeline: {
      container: `rounded-lg border ${theme.border} ${theme.cardBg} overflow-hidden`,
      header: `w-full px-4 py-3 flex items-center justify-between gap-3 text-left transition-colors ${theme.hover}`,
      content: `px-4 pb-4 pt-2 border-t ${theme.border}`,
    },
  };

  const styles = variantStyles[variant];

  return (
    <div className={`${styles.container} ${className}`}>
      {/* Header - clickable */}
      <button onClick={handleToggle} className={styles.header}>
        <div className="flex-1 min-w-0">{header}</div>
        <svg 
          className={`w-4 h-4 ${theme.muted} transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Content - collapsible */}
      {isOpen && (
        <div className={`${styles.content} ${contentClassName}`}>
          {children}
        </div>
      )}
    </div>
  );
}

export default memo(CollapsibleSection);
