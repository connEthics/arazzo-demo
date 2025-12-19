'use client';

import { useState, useMemo } from 'react';
import { useBuilder } from '../context/BuilderContext';
import { Badge } from '@/components/primitives';
import ExpressionAutocomplete from './ExpressionAutocomplete';

interface WorkflowOutput {
  name: string;
  value: string;
}

interface WorkflowOutputInspectorProps {
  /** If true, the inspector is in read-only mode and editing is disabled */
  readOnly?: boolean;
}

export default function WorkflowOutputInspector({ readOnly = false }: WorkflowOutputInspectorProps) {
  const { state, dispatch } = useBuilder();
  const [newOutputName, setNewOutputName] = useState('');
  const [newOutputValue, setNewOutputValue] = useState('');
  
  const workflow = state.spec.workflows[0];
  const steps = workflow?.steps || [];
  
  // Parse existing outputs from workflow.outputs
  const outputs: WorkflowOutput[] = workflow?.outputs
    ? Object.entries(workflow.outputs).map(([name, value]) => ({
        name,
        value: value as string
      }))
    : [];
  
  // Collect all available step outputs for autocomplete
  const availableStepOutputs = useMemo(() => {
    const result: Array<{ stepId: string; outputKey: string; expression: string }> = [];
    steps.forEach(step => {
      if (step.outputs) {
        Object.keys(step.outputs).forEach(key => {
          result.push({
            stepId: step.stepId,
            outputKey: key,
            expression: `$steps.${step.stepId}.outputs.${key}`
          });
        });
      }
    });
    return result;
  }, [steps]);

  const handleAddOutput = () => {
    if (!newOutputName.trim() || !newOutputValue.trim()) return;
    
    const currentOutputs = workflow?.outputs || {};
    
    dispatch({
      type: 'UPDATE_WORKFLOW',
      payload: {
        workflowId: workflow.workflowId,
        updates: {
          outputs: {
            ...currentOutputs,
            [newOutputName]: newOutputValue
          }
        }
      }
    });
    
    setNewOutputName('');
    setNewOutputValue('');
  };

  const handleUpdateOutput = (name: string, newValue: string) => {
    const currentOutputs = workflow?.outputs || {};
    
    dispatch({
      type: 'UPDATE_WORKFLOW',
      payload: {
        workflowId: workflow.workflowId,
        updates: {
          outputs: {
            ...currentOutputs,
            [name]: newValue
          }
        }
      }
    });
  };

  const handleRemoveOutput = (name: string) => {
    const currentOutputs = workflow?.outputs;
    if (!currentOutputs) return;
    
    const { [name]: removed, ...remainingOutputs } = currentOutputs;
    
    dispatch({
      type: 'UPDATE_WORKFLOW',
      payload: {
        workflowId: workflow.workflowId,
        updates: {
          outputs: Object.keys(remainingOutputs).length > 0 ? remainingOutputs : undefined
        }
      }
    });
  };

  // Find which step(s) contribute to each output
  const getOutputSources = (value: string): string[] => {
    const sources: string[] = [];
    const regex = /\$steps\.([^.]+)\./g;
    let match;
    while ((match = regex.exec(value)) !== null) {
      if (!sources.includes(match[1])) {
        sources.push(match[1]);
      }
    }
    return sources;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-indigo-500 to-indigo-600">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </div>
          <div>
            <h2 className="font-semibold text-white text-sm">Workflow Outputs</h2>
            <p className="text-indigo-100 text-xs">{workflow?.workflowId}</p>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Description */}
        <div className="text-xs text-slate-500 dark:text-slate-400">
          Define the outputs that this workflow returns. Map them to step outputs using expressions like <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">$steps.stepId.outputs.key</code>
        </div>
        
        {/* Existing outputs */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">
            Outputs ({outputs.length})
          </label>
          
          {outputs.length === 0 ? (
            <div className="text-xs text-slate-400 italic p-2 border border-dashed border-slate-300 dark:border-slate-700 rounded">
              No outputs defined. Add one below.
            </div>
          ) : (
            <div className="space-y-2">
              {outputs.map((output) => {
                const sources = getOutputSources(output.value);
                return (
                  <div 
                    key={output.name}
                    className="p-2 bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-sm font-medium">{output.name}</span>
                      {!readOnly && (
                        <button
                          onClick={() => handleRemoveOutput(output.name)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded"
                          title="Remove output"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                    <ExpressionAutocomplete
                      value={output.value}
                      onChange={(val) => handleUpdateOutput(output.name, val)}
                      placeholder="$steps.stepId.outputs.key"
                      disabled={readOnly}
                    />
                    {sources.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {sources.map(src => (
                          <Badge key={src} variant="step" className="text-[10px]">
                            ← {src}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        {/* Add new output - only show in edit mode */}
        {!readOnly && (
          <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">
              Add Output
            </label>
            <div className="space-y-2">
              <input
                type="text"
                value={newOutputName}
                onChange={(e) => setNewOutputName(e.target.value)}
                placeholder="Output name (e.g., result, petId)"
                className="w-full px-2 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800"
              />
              <ExpressionAutocomplete
                value={newOutputValue}
                onChange={setNewOutputValue}
                placeholder="Value expression (e.g., $steps.step_1.outputs.id)"
              />
              <button
                onClick={handleAddOutput}
                disabled={!newOutputName.trim() || !newOutputValue.trim()}
                className="w-full px-3 py-1.5 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Output
              </button>
            </div>
          </div>
        )}
        
        {/* Quick add from step outputs - only show in edit mode */}
        {!readOnly && availableStepOutputs.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">
              Quick Add from Steps
            </label>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {availableStepOutputs.map((item, idx) => {
                const isAlreadyUsed = outputs.some(o => o.value.includes(item.expression));
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      if (!isAlreadyUsed) {
                        setNewOutputName(item.outputKey);
                        setNewOutputValue(item.expression);
                      }
                    }}
                    disabled={isAlreadyUsed}
                    className={`w-full text-left px-2 py-1.5 text-xs rounded border transition-colors ${
                      isAlreadyUsed
                        ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono truncate">{item.expression}</span>
                      {isAlreadyUsed && (
                        <Badge variant="info" className="text-[9px] ml-1">used</Badge>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
