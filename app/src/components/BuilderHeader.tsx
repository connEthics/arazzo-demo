'use client';

import { useState } from 'react';
import ViewModeSelector, { ViewMode } from './ViewModeSelector';
import WorkflowSelector, { WorkflowSelectorItem } from './WorkflowSelector';

interface BuilderHeaderProps {
  // Navigation
  onBack?: () => void;
  
  // View mode
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  
  // Workflow selector
  workflows: WorkflowSelectorItem[];
  selectedWorkflowId: string | null;
  onWorkflowSelect: (workflowId: string) => void;
  onWorkflowAdd: () => void;
  onWorkflowRename: (workflowId: string, newName: string) => void;
  onWorkflowDelete?: (workflowId: string) => void;
  
  // Theme
  isDark?: boolean;
  onThemeToggle?: () => void;
  
  // Title
  title?: string;
}

/**
 * Complete header bar for the Builder screen.
 * Combines: Navigation, Title, WorkflowSelector, ViewModeSelector, Theme toggle.
 * Note: DisplayToggles have been moved to CanvasToolbar as they only apply to Builder mode canvas.
 */
export default function BuilderHeader({
  onBack,
  viewMode,
  onViewModeChange,
  workflows,
  selectedWorkflowId,
  onWorkflowSelect,
  onWorkflowAdd,
  onWorkflowRename,
  onWorkflowDelete,
  isDark = false,
  onThemeToggle,
  title = 'Arazzo Builder',
}: BuilderHeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className={`flex-shrink-0 border-b ${isDark ? 'border-slate-800 bg-slate-900' : 'border-gray-200 bg-white'}`}>
      <div className="px-4 py-3">
        {/* Main row */}
        <div className="flex items-center justify-between gap-4">
          {/* Left section: Navigation + Title + Workflow */}
          <div className="flex items-center gap-3 min-w-0 flex-shrink-0">
            {/* Mobile menu button - only visible on small screens */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={`md:hidden p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-gray-100 text-gray-500'}`}
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>

            {/* Back button */}
            {onBack && (
              <button
                onClick={onBack}
                className={`hidden sm:flex items-center gap-1.5 text-sm ${isDark ? 'text-slate-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back
              </button>
            )}

            {/* Separator */}
            {onBack && (
              <div className={`hidden sm:block w-px h-6 ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
            )}

            {/* Title */}
            <h1 className={`text-lg font-bold whitespace-nowrap ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {title}
            </h1>

            {/* Separator - visible on lg+ */}
            <div className={`hidden lg:block w-px h-6 ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />

            {/* Workflow Selector - visible on lg+ */}
            <div className="hidden lg:block">
              <WorkflowSelector
                workflows={workflows}
                selectedWorkflowId={selectedWorkflowId}
                onSelect={onWorkflowSelect}
                onAdd={onWorkflowAdd}
                onRename={onWorkflowRename}
                onDelete={onWorkflowDelete}
                isDark={isDark}
              />
            </div>
          </div>

          {/* Center section: View Mode */}
          {/* md-lg: compact (icons only), lg+: full with labels */}
          <div className="hidden md:block flex-shrink-0">
            {/* Compact mode on md screens */}
            <div className="xl:hidden">
              <ViewModeSelector
                mode={viewMode}
                onModeChange={onViewModeChange}
                isDark={isDark}
                compact={true}
              />
            </div>
            {/* Full mode on xl+ screens */}
            <div className="hidden xl:block">
              <ViewModeSelector
                mode={viewMode}
                onModeChange={onViewModeChange}
                isDark={isDark}
                compact={false}
              />
            </div>
          </div>

          {/* Right section: Theme toggle */}
          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            {onThemeToggle && (
              <button
                onClick={onThemeToggle}
                className={`p-2 rounded-lg transition-colors ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-yellow-400' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}
                title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDark ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>
            )}

            {/* Mobile back button */}
            {onBack && (
              <button
                onClick={onBack}
                className={`sm:hidden p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-gray-100 text-gray-500'}`}
                aria-label="Back"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Mobile expanded menu - only workflow and view mode */}
        {isMobileMenuOpen && (
          <div className={`md:hidden mt-3 pt-3 border-t space-y-3 ${isDark ? 'border-slate-800' : 'border-gray-200'}`}>
            {/* Workflow Selector */}
            <div>
              <label className={`block text-xs font-semibold uppercase mb-2 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                Workflow
              </label>
              <WorkflowSelector
                workflows={workflows}
                selectedWorkflowId={selectedWorkflowId}
                onSelect={(id) => {
                  onWorkflowSelect(id);
                  setIsMobileMenuOpen(false);
                }}
                onAdd={() => {
                  onWorkflowAdd();
                  setIsMobileMenuOpen(false);
                }}
                onRename={onWorkflowRename}
                onDelete={onWorkflowDelete}
                isDark={isDark}
              />
            </div>

            {/* View Mode */}
            <div>
              <label className={`block text-xs font-semibold uppercase mb-2 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                View Mode
              </label>
              <ViewModeSelector
                mode={viewMode}
                onModeChange={(mode) => {
                  onViewModeChange(mode);
                  setIsMobileMenuOpen(false);
                }}
                isDark={isDark}
              />
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
