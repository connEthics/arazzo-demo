// Builder Mobile Menu Component
'use client';

import { memo } from 'react';
import { useBuilder } from '../context/BuilderContext';
import {
  CloseIcon,
  DocumentationIcon,
  BuilderIcon,
  FlowchartIcon,
  SequenceIcon,
} from './icons';

export type ViewMode = 'builder' | 'documentation' | 'flowchart' | 'sequence';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  selectedWorkflowIndex: number;
  onWorkflowChange: (index: number) => void;
  hideOutputs: boolean;
  showStepNames: boolean;
  showErrorFlow: boolean;
  onHideOutputsChange: (value: boolean) => void;
  onShowStepNamesChange: (value: boolean) => void;
  onShowErrorFlowChange: (value: boolean) => void;
}

const VIEW_MODES = [
  { id: 'documentation' as const, label: 'Documentation', icon: DocumentationIcon },
  { id: 'builder' as const, label: 'Builder', icon: BuilderIcon },
  { id: 'flowchart' as const, label: 'Flowchart', icon: FlowchartIcon },
  { id: 'sequence' as const, label: 'Sequence', icon: SequenceIcon },
];

function MobileMenu({
  isOpen,
  onClose,
  viewMode,
  onViewModeChange,
  selectedWorkflowIndex,
  onWorkflowChange,
  hideOutputs,
  showStepNames,
  showErrorFlow,
  onHideOutputsChange,
  onShowStepNamesChange,
  onShowErrorFlowChange,
}: MobileMenuProps) {
  const { state } = useBuilder();

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className="lg:hidden fixed inset-0 bg-black/50 z-40" 
        onClick={onClose} 
      />
      
      {/* Menu Panel */}
      <div className="lg:hidden fixed top-0 left-0 bottom-0 w-72 z-50 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transform transition-transform duration-300 ease-in-out">
        <div className="p-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Menu</h2>
            <button 
              onClick={onClose} 
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <CloseIcon />
            </button>
          </div>
          
          {/* Workflow Selector */}
          {state.spec.workflows.length > 0 && (
            <div className="mb-6">
              <label className="block text-xs font-medium mb-2 text-slate-500">
                Workflow
              </label>
              <select
                value={selectedWorkflowIndex}
                onChange={(e) => { 
                  onWorkflowChange(Number(e.target.value)); 
                  onClose(); 
                }}
                className="w-full px-3 py-2 rounded-lg text-sm font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                {state.spec.workflows.map((wf, idx) => (
                  <option key={wf.workflowId} value={idx}>
                    {wf.workflowId}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          {/* View Mode Options */}
          <div className="space-y-1">
            <label className="block text-xs font-medium mb-2 text-slate-500">
              View Mode
            </label>
            {VIEW_MODES.map((item) => (
              <button
                key={item.id}
                onClick={() => { 
                  onViewModeChange(item.id); 
                  onClose(); 
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  viewMode === item.id 
                    ? 'bg-indigo-600 text-white' 
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <item.icon />
                {item.label}
              </button>
            ))}
          </div>
          
          {/* Diagram Options */}
          {(viewMode === 'flowchart' || viewMode === 'sequence') && (
            <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800 space-y-2">
              <label className="block text-xs font-medium mb-2 text-slate-500">
                Options
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={!showErrorFlow} 
                  onChange={(e) => onShowErrorFlowChange(!e.target.checked)} 
                  className="rounded" 
                />
                Hide error flows
              </label>
              {viewMode === 'sequence' && (
                <>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={hideOutputs} 
                      onChange={(e) => onHideOutputsChange(e.target.checked)} 
                      className="rounded" 
                    />
                    Hide outputs
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={showStepNames} 
                      onChange={(e) => onShowStepNamesChange(e.target.checked)} 
                      className="rounded" 
                    />
                    Show step names
                  </label>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default memo(MobileMenu);
