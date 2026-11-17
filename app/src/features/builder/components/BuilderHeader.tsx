// Builder Header Component
'use client';

import { memo } from 'react';
import WorkflowManager from './WorkflowManager';
import {
  MenuIcon,
  CloseIcon,
  DocumentationIcon,
  BuilderIcon,
  FlowchartIcon,
  SequenceIcon,
  OperationsIcon,
  InspectorIcon,
  LeftPanelIcon,
  DownloadIcon,
} from './icons';

export type ViewMode = 'builder' | 'documentation' | 'flowchart' | 'sequence';
export type MobilePanel = 'left' | 'center' | 'right';

interface BuilderHeaderProps {
  // View mode
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;

  // Workflow
  selectedWorkflowIndex: number;
  onWorkflowChange: (index: number) => void;

  // Panel toggles
  showLeftPanel: boolean;
  showRightPanel: boolean;
  onToggleLeftPanel: () => void;
  onToggleRightPanel: () => void;

  // Mobile
  isMobileMenuOpen: boolean;
  onToggleMobileMenu: () => void;
  mobilePanel: MobilePanel;
  onMobilePanelChange: (panel: MobilePanel) => void;

  // Diagram options
  hideOutputs: boolean;
  showStepNames: boolean;
  showErrorFlow: boolean;
  onHideOutputsChange: (value: boolean) => void;
  onShowStepNamesChange: (value: boolean) => void;
  onShowErrorFlowChange: (value: boolean) => void;

  // Export
  onExportYaml?: () => void;

  // Arazzo 1.1 examples gallery
  onOpenExamples?: () => void;

  // Diagnostics (@connethics/arazzo-core)
  problemCounts?: { error: number; warning: number; info: number };
  onShowProblems?: () => void;
}

const VIEW_MODES = [
  { id: 'documentation' as const, label: 'Documentation', icon: DocumentationIcon, color: 'bg-ce-primary-solid', shadow: 'shadow-blue-900/20' },
  { id: 'flowchart' as const, label: 'Flowchart', icon: FlowchartIcon, color: 'bg-ce-primary-solid', shadow: 'shadow-blue-900/20' },
  { id: 'sequence' as const, label: 'Sequence', icon: SequenceIcon, color: 'bg-ce-primary-solid', shadow: 'shadow-blue-900/20' },
  { id: 'builder' as const, label: 'Builder', icon: BuilderIcon, color: 'bg-ce-primary-solid', shadow: 'shadow-blue-900/20' },
];

function BuilderHeader({
  viewMode,
  onViewModeChange,
  selectedWorkflowIndex,
  onWorkflowChange,
  showLeftPanel,
  showRightPanel,
  onToggleLeftPanel,
  onToggleRightPanel,
  isMobileMenuOpen,
  onToggleMobileMenu,
  mobilePanel,
  onMobilePanelChange,
  hideOutputs,
  showStepNames,
  showErrorFlow,
  onHideOutputsChange,
  onShowStepNamesChange,
  onShowErrorFlowChange,
  onExportYaml,
  onOpenExamples,
  problemCounts,
  onShowProblems,
}: BuilderHeaderProps) {
  const getViewModeButtonClass = (mode: ViewMode) => {
    const config = VIEW_MODES.find(m => m.id === mode);
    const isActive = viewMode === mode;
    return `flex items-center gap-2 px-4 py-1.5 text-xs font-semibold transition-all rounded-lg ${isActive
      ? `${config?.color} text-white shadow-lg ${config?.shadow}`
      : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
      }`;
  };

  const getMobileIcon = () => {
    const mode = VIEW_MODES.find(m => m.id === viewMode);
    return mode ? <mode.icon /> : <BuilderIcon />;
  };

  return (
    <header className="flex-shrink-0 h-14 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex items-center px-4 lg:px-6 gap-4">
      {/* Mobile Menu Button */}
      <button
        onClick={onToggleMobileMenu}
        className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        aria-label="Toggle menu"
      >
        {isMobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
      </button>

      {/* Title */}
      <div className="flex items-center gap-4">
        <h1 className="font-bold text-base whitespace-nowrap text-slate-900 dark:text-white">
          <span className="hidden sm:inline">Arazzo Studio</span>
          <span className="sm:hidden">Studio</span>
        </h1>
        <div className="h-6 w-px bg-slate-200 dark:bg-slate-800" />
        {onOpenExamples && (
          <button
            onClick={onOpenExamples}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            data-testid="open-examples"
          >
            <span aria-hidden>▤</span>
            <span>Examples</span>
          </button>
        )}
        {problemCounts && onShowProblems && (
          <button
            onClick={onShowProblems}
            className="flex items-center gap-2 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Show problems (@connethics/arazzo-core validation)"
            data-testid="problem-counter"
          >
            {problemCounts.error + problemCounts.warning === 0 ? (
              <span className="text-emerald-600 dark:text-emerald-400">✓ Valid</span>
            ) : (
              <>
                <span className="text-red-600 dark:text-red-400">✕ {problemCounts.error}</span>
                <span className="text-amber-600 dark:text-amber-400">! {problemCounts.warning}</span>
              </>
            )}
            {problemCounts.info > 0 && <span className="text-blue-600 dark:text-blue-400">i {problemCounts.info}</span>}
          </button>
        )}
      </div>

      {/* Workflow Manager - Desktop */}
      <div className="hidden lg:block">
        <WorkflowManager
          selectedWorkflowIndex={selectedWorkflowIndex}
          onWorkflowChange={onWorkflowChange}
        />
      </div>

      {/* View Mode Toggle - Desktop */}
      <div className="flex-1 hidden lg:flex justify-end pr-4">
        <div className="flex items-center p-1 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/50 gap-1">
          {VIEW_MODES.map((mode) => (
            <button
              key={mode.id}
              onClick={() => onViewModeChange(mode.id)}
              className={getViewModeButtonClass(mode.id)}
            >
              <mode.icon />
              <span>{mode.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* View-specific options - Desktop */}
      <div className="hidden lg:flex items-center gap-3">
        {viewMode === 'sequence' && (
          <>
            <label className="flex items-center gap-1.5 text-[11px] cursor-pointer select-none text-slate-500">
              <input
                type="checkbox"
                checked={hideOutputs}
                onChange={(e) => onHideOutputsChange(e.target.checked)}
                className="w-3 h-3 rounded border-gray-300 text-blue-600"
              />
              Hide outputs
            </label>
            <label className="flex items-center gap-1.5 text-[11px] cursor-pointer select-none text-slate-500">
              <input
                type="checkbox"
                checked={showStepNames}
                onChange={(e) => onShowStepNamesChange(e.target.checked)}
                className="w-3 h-3 rounded border-gray-300 text-blue-600"
              />
              Show steps
            </label>
          </>
        )}
        {(viewMode === 'flowchart' || viewMode === 'sequence') && (
          <label className="flex items-center gap-1.5 text-[11px] cursor-pointer select-none text-slate-500">
            <input
              type="checkbox"
              checked={!showErrorFlow}
              onChange={(e) => onShowErrorFlowChange(!e.target.checked)}
              className="w-3 h-3 rounded border-gray-300 text-blue-600"
            />
            Hide errors
          </label>
        )}

        {/* Export Button */}
        {onExportYaml && (
          <button
            onClick={onExportYaml}
            className="flex items-center gap-1.5 px-2 py-1 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
            title="Export YAML"
          >
            <DownloadIcon />
            <span className="hidden xl:inline">Export</span>
          </button>
        )}

        {/* Panel Toggle Buttons */}
        <div className="flex items-center gap-1 ml-2 border-l border-slate-200 dark:border-slate-700 pl-3">
          <button
            onClick={onToggleLeftPanel}
            className={`p-1.5 rounded-lg text-xs transition-colors ${showLeftPanel
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300'
              : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400'
              }`}
            title={showLeftPanel ? 'Hide left panel' : 'Show left panel'}
          >
            <LeftPanelIcon />
          </button>
          <button
            onClick={onToggleRightPanel}
            className={`p-1.5 rounded-lg text-xs transition-colors ${showRightPanel
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300'
              : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400'
              }`}
            title={showRightPanel ? 'Hide inspector' : 'Show inspector'}
          >
            <InspectorIcon />
          </button>
        </div>
      </div>

      {/* Mobile Panel Switcher */}
      <div className="lg:hidden flex-1 flex justify-center">
        <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-50 dark:bg-slate-800/50">
          <button
            onClick={() => onMobilePanelChange('left')}
            className={`p-2 ${mobilePanel === 'left' ? 'bg-blue-600 text-white' : ''}`}
            aria-label="Left panel"
          >
            <OperationsIcon />
          </button>
          <button
            onClick={() => onMobilePanelChange('center')}
            className={`p-2 ${mobilePanel === 'center' ? 'bg-blue-600 text-white' : ''}`}
            aria-label="Center panel"
          >
            {getMobileIcon()}
          </button>
          <button
            onClick={() => onMobilePanelChange('right')}
            className={`p-2 ${mobilePanel === 'right' ? 'bg-blue-600 text-white' : ''}`}
            aria-label="Right panel"
          >
            <InspectorIcon />
          </button>
        </div>
      </div>
    </header>
  );
}

export default memo(BuilderHeader);
