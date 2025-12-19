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
}

const VIEW_MODES = [
  { id: 'documentation' as const, label: 'Documentation', icon: DocumentationIcon },
  { id: 'builder' as const, label: 'Builder', icon: BuilderIcon },
  { id: 'flowchart' as const, label: 'Flowchart', icon: FlowchartIcon },
  { id: 'sequence' as const, label: 'Sequence', icon: SequenceIcon },
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
}: BuilderHeaderProps) {
  const getViewModeButtonClass = (mode: ViewMode) => {
    const isActive = viewMode === mode;
    return `flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
      isActive 
        ? 'bg-indigo-600 text-white' 
        : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
    }`;
  };

  const getMobileIcon = () => {
    const mode = VIEW_MODES.find(m => m.id === viewMode);
    return mode ? <mode.icon /> : <BuilderIcon />;
  };

  return (
    <header className="flex-shrink-0 h-12 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex items-center px-3 lg:px-4 gap-2 lg:gap-4">
      {/* Mobile Menu Button */}
      <button
        onClick={onToggleMobileMenu}
        className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        aria-label="Toggle menu"
      >
        {isMobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
      </button>
      
      {/* Title */}
      <h1 className="font-bold text-base whitespace-nowrap">
        <span className="hidden sm:inline">Arazzo Builder</span>
        <span className="sm:hidden">Builder</span>
      </h1>
      
      {/* Workflow Manager - Desktop */}
      <div className="hidden lg:block">
        <WorkflowManager 
          selectedWorkflowIndex={selectedWorkflowIndex}
          onWorkflowChange={onWorkflowChange}
        />
      </div>
      
      {/* View Mode Toggle - Desktop */}
      <div className="flex-1 hidden lg:flex justify-center">
        <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-50 dark:bg-slate-800/50">
          {VIEW_MODES.map((mode, index) => (
            <button
              key={mode.id}
              onClick={() => onViewModeChange(mode.id)}
              className={`${getViewModeButtonClass(mode.id)} ${index > 0 ? 'border-l border-slate-200 dark:border-slate-700' : ''}`}
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
                className="w-3 h-3 rounded border-gray-300 text-indigo-600" 
              />
              Hide outputs
            </label>
            <label className="flex items-center gap-1.5 text-[11px] cursor-pointer select-none text-slate-500">
              <input 
                type="checkbox" 
                checked={showStepNames} 
                onChange={(e) => onShowStepNamesChange(e.target.checked)} 
                className="w-3 h-3 rounded border-gray-300 text-indigo-600" 
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
              className="w-3 h-3 rounded border-gray-300 text-indigo-600" 
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
            className={`p-1.5 rounded-lg text-xs transition-colors ${
              showLeftPanel 
                ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300' 
                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400'
            }`}
            title={showLeftPanel ? 'Hide left panel' : 'Show left panel'}
          >
            <LeftPanelIcon />
          </button>
          <button
            onClick={onToggleRightPanel}
            className={`p-1.5 rounded-lg text-xs transition-colors ${
              showRightPanel 
                ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300' 
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
            className={`p-2 ${mobilePanel === 'left' ? 'bg-indigo-600 text-white' : ''}`}
            aria-label="Left panel"
          >
            <OperationsIcon />
          </button>
          <button
            onClick={() => onMobilePanelChange('center')}
            className={`p-2 ${mobilePanel === 'center' ? 'bg-indigo-600 text-white' : ''}`}
            aria-label="Center panel"
          >
            {getMobileIcon()}
          </button>
          <button
            onClick={() => onMobilePanelChange('right')}
            className={`p-2 ${mobilePanel === 'right' ? 'bg-indigo-600 text-white' : ''}`}
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
