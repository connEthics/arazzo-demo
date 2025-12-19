'use client';

import { useState } from 'react';
import { useBuilder } from '../context/BuilderContext';
import { Badge } from '@/components/primitives';
import type { BadgeVariant } from '@/components/primitives/Badge';

interface WorkflowInput {
  name: string;
  type: string;
  description?: string;
  required?: boolean;
}

interface WorkflowInputInspectorProps {
  /** If true, the inspector is in read-only mode and editing is disabled */
  readOnly?: boolean;
}

export default function WorkflowInputInspector({ readOnly = false }: WorkflowInputInspectorProps) {
  const { state, dispatch } = useBuilder();
  const [newInputName, setNewInputName] = useState('');
  const [newInputType, setNewInputType] = useState('string');
  
  const workflow = state.spec.workflows[0];
  
  // Parse existing inputs from workflow.inputs schema
  const inputs: WorkflowInput[] = workflow?.inputs?.properties
    ? Object.entries(workflow.inputs.properties).map(([name, schema]) => ({
        name,
        type: (schema as { type?: string })?.type || 'string',
        description: (schema as { description?: string })?.description,
        required: workflow.inputs?.required?.includes(name)
      }))
    : [];

  const handleAddInput = () => {
    if (!newInputName.trim()) return;
    
    const currentInputs = workflow?.inputs || { type: 'object', properties: {} };
    const newProperties = {
      ...currentInputs.properties,
      [newInputName]: { type: newInputType }
    };
    
    dispatch({
      type: 'UPDATE_WORKFLOW',
      payload: {
        workflowId: workflow.workflowId,
        updates: {
          inputs: {
            ...currentInputs,
            type: 'object',
            properties: newProperties
          }
        }
      }
    });
    
    setNewInputName('');
  };

  const handleRemoveInput = (name: string) => {
    const currentInputs = workflow?.inputs;
    if (!currentInputs?.properties) return;
    
    const { [name]: removed, ...remainingProps } = currentInputs.properties;
    
    dispatch({
      type: 'UPDATE_WORKFLOW',
      payload: {
        workflowId: workflow.workflowId,
        updates: {
          inputs: {
            ...currentInputs,
            properties: remainingProps,
            required: currentInputs.required?.filter(r => r !== name)
          }
        }
      }
    });
  };

  const handleToggleRequired = (name: string) => {
    const currentInputs = workflow?.inputs;
    if (!currentInputs) return;
    
    const currentRequired = currentInputs.required || [];
    const isRequired = currentRequired.includes(name);
    
    dispatch({
      type: 'UPDATE_WORKFLOW',
      payload: {
        workflowId: workflow.workflowId,
        updates: {
          inputs: {
            ...currentInputs,
            required: isRequired
              ? currentRequired.filter(r => r !== name)
              : [...currentRequired, name]
          }
        }
      }
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-emerald-500 to-emerald-600">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
          </div>
          <div>
            <h2 className="font-semibold text-white text-sm">Workflow Inputs</h2>
            <p className="text-emerald-100 text-xs">{workflow?.workflowId}</p>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Description */}
        <div className="text-xs text-slate-500 dark:text-slate-400">
          Define the input parameters that this workflow expects. These can be referenced using <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">$inputs.name</code>
        </div>
        
        {/* Existing inputs */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">
            Inputs ({inputs.length})
          </label>
          
          {inputs.length === 0 ? (
            <div className="text-xs text-slate-400 italic p-2 border border-dashed border-slate-300 dark:border-slate-700 rounded">
              No inputs defined. Add one below.
            </div>
          ) : (
            <div className="space-y-2">
              {inputs.map((input) => (
                <div 
                  key={input.name}
                  className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm truncate">{input.name}</span>
                      <Badge variant={`type-${input.type}` as BadgeVariant} className="text-[10px]">{input.type}</Badge>
                      {input.required && (
                        <Badge variant="required" className="text-[10px]">required</Badge>
                      )}
                    </div>
                    {input.description && (
                      <p className="text-xs text-slate-500 truncate">{input.description}</p>
                    )}
                  </div>
                  {!readOnly && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleToggleRequired(input.name)}
                        className={`p-1 rounded text-xs transition-colors ${
                          input.required 
                            ? 'text-indigo-600 hover:bg-indigo-50' 
                            : 'text-slate-400 hover:bg-slate-100'
                        }`}
                        title={input.required ? 'Make optional' : 'Make required'}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleRemoveInput(input.name)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded"
                        title="Remove input"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Add new input - only show in edit mode */}
        {!readOnly && (
          <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">
              Add Input
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newInputName}
                onChange={(e) => setNewInputName(e.target.value)}
                placeholder="Input name"
                className="flex-1 px-2 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800"
                onKeyDown={(e) => e.key === 'Enter' && handleAddInput()}
              />
              <select
                value={newInputType}
                onChange={(e) => setNewInputType(e.target.value)}
                className="px-2 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800"
              >
                <option value="string">string</option>
                <option value="number">number</option>
                <option value="integer">integer</option>
                <option value="boolean">boolean</option>
                <option value="object">object</option>
                <option value="array">array</option>
              </select>
              <button
                onClick={handleAddInput}
                disabled={!newInputName.trim()}
                className="px-3 py-1.5 bg-emerald-600 text-white text-sm rounded hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add
              </button>
            </div>
          </div>
        )}
        
        {/* Usage hint */}
        {inputs.length > 0 && (
          <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded border border-emerald-200 dark:border-emerald-800">
            <p className="text-xs text-emerald-700 dark:text-emerald-400">
              <strong>Usage:</strong> Reference inputs in step parameters using:
            </p>
            <ul className="mt-1 space-y-0.5">
              {inputs.slice(0, 3).map(input => (
                <li key={input.name} className="text-xs font-mono text-emerald-600 dark:text-emerald-300">
                  $inputs.{input.name}
                </li>
              ))}
              {inputs.length > 3 && (
                <li className="text-xs text-emerald-500">...and {inputs.length - 3} more</li>
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
