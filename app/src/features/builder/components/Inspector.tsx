'use client';

import { useBuilder } from '../context/BuilderContext';
import StepInspector from './StepInspector';
import WorkflowInputInspector from './WorkflowInputInspector';
import WorkflowOutputInspector from './WorkflowOutputInspector';

interface InspectorProps {
  /** If true, the inspector is in read-only mode and editing is disabled */
  readOnly?: boolean;
}

/**
 * Inspector component that switches between different inspector views
 * based on the selected node type (step, input, or output).
 */
export default function Inspector({ readOnly = false }: InspectorProps) {
  const { state } = useBuilder();
  
  switch (state.selectedNodeType) {
    case 'input':
      return <WorkflowInputInspector readOnly={readOnly} />;
    case 'output':
      return <WorkflowOutputInspector readOnly={readOnly} />;
    case 'step':
      return <StepInspector readOnly={readOnly} />;
    default:
      return (
        <div className="flex flex-col h-full items-center justify-center p-6 text-center">
          <div className="w-16 h-16 mb-4 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
            </svg>
          </div>
          <h3 className="font-medium text-slate-700 dark:text-slate-300 mb-1">
            No Selection
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-[200px]">
            Click on a node in the canvas to inspect and edit its properties.
          </p>
          <div className="mt-4 space-y-2 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-emerald-500" />
              <span>INPUT - Workflow inputs</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-slate-500" />
              <span>STEP - API operations</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-indigo-500" />
              <span>OUTPUT - Workflow outputs</span>
            </div>
          </div>
        </div>
      );
  }
}
