'use client';

import { useState, useCallback, useMemo } from 'react';
import type { WorkflowInputs } from '@/types/arazzo';
import RightPanelModeToggle, { RightPanelMode } from './RightPanelModeToggle';
import ExpressionInput, { ExpressionSuggestion } from './ExpressionInput';
import { Card, Badge, PropertyList } from './primitives';
import { SchemaViewer } from './arazzo';

interface InputProperty {
  name: string;
  type: string;
  description?: string;
  default?: unknown;
}

interface InputPanelProps {
  /** Current workflow inputs schema */
  inputs?: WorkflowInputs;
  /** Handler for input updates (enables edit mode) */
  onInputsChange?: (inputs: WorkflowInputs) => void;
  /** Initial mode */
  initialMode?: RightPanelMode;
  /** Dark mode */
  isDark?: boolean;
  /** Close handler */
  onClose?: () => void;
  /** Expression suggestions for autocomplete */
  expressionSuggestions?: ExpressionSuggestion[];
}

// Icons
const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const ChevronIcon = ({ expanded }: { expanded: boolean }) => (
  <svg 
    className={`w-4 h-4 transition-transform ${expanded ? 'rotate-90' : ''}`} 
    fill="none" 
    stroke="currentColor" 
    viewBox="0 0 24 24"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

const TYPE_OPTIONS = ['string', 'number', 'integer', 'boolean', 'array', 'object'];

/**
 * InputPanel - Unified component for viewing and editing workflow inputs
 * Combines read mode (documentation view) and edit mode (form editor)
 */
export default function InputPanel({
  inputs,
  onInputsChange,
  initialMode = 'read',
  isDark = false,
  onClose,
  expressionSuggestions = [],
}: InputPanelProps) {
  const [mode, setMode] = useState<RightPanelMode>(initialMode);
  const [expandedInputs, setExpandedInputs] = useState<Set<string>>(new Set());
  const [newPropertyName, setNewPropertyName] = useState('');

  // Check if editing is available
  const canEdit = !!onInputsChange;

  // Ensure we have a valid inputs object
  const safeInputs: WorkflowInputs = inputs || { type: 'object', properties: {} };

  // Convert inputs to array format for editing
  const properties: InputProperty[] = useMemo(() => {
    if (!safeInputs.properties) return [];
    return Object.entries(safeInputs.properties).map(([name, schema]) => ({
      name,
      type: schema.type || 'string',
      description: schema.description,
      default: schema.default,
    }));
  }, [safeInputs.properties]);

  const required = safeInputs.required || [];

  // Toggle input expansion
  const toggleInput = useCallback((name: string) => {
    setExpandedInputs(prev => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }, []);

  // Add new property
  const handleAddProperty = useCallback(() => {
    if (!onInputsChange) return;
    const name = newPropertyName.trim() || `input${properties.length + 1}`;
    
    // Check for duplicates
    if (safeInputs.properties?.[name]) {
      return;
    }

    const newInputs: WorkflowInputs = {
      ...safeInputs,
      type: safeInputs.type || 'object',
      properties: {
        ...safeInputs.properties,
        [name]: { type: 'string' },
      },
    };
    
    onInputsChange(newInputs);
    setNewPropertyName('');
    setExpandedInputs(prev => new Set([...prev, name]));
  }, [safeInputs, newPropertyName, properties.length, onInputsChange]);

  // Update property
  const handleUpdateProperty = useCallback((
    oldName: string,
    updates: Partial<InputProperty>
  ) => {
    if (!onInputsChange) return;
    const newProperties = { ...safeInputs.properties };
    const currentSchema = newProperties[oldName] || { type: 'string' };
    
    // If renaming
    if (updates.name && updates.name !== oldName) {
      delete newProperties[oldName];
      newProperties[updates.name] = {
        ...currentSchema,
        type: updates.type || currentSchema.type,
        description: updates.description !== undefined ? updates.description : currentSchema.description,
        default: updates.default !== undefined ? updates.default : currentSchema.default,
      };
      
      // Update required array
      let newRequired = (safeInputs.required || []).filter(r => r !== oldName);
      if (required.includes(oldName)) {
        newRequired = [...newRequired, updates.name];
      }
      
      // Update expanded state
      setExpandedInputs(prev => {
        const next = new Set(prev);
        next.delete(oldName);
        next.add(updates.name!);
        return next;
      });
      
      onInputsChange({
        ...safeInputs,
        properties: newProperties,
        required: newRequired.length > 0 ? newRequired : undefined,
      });
    } else {
      // Just update schema
      newProperties[oldName] = {
        ...currentSchema,
        type: updates.type || currentSchema.type,
        description: updates.description !== undefined ? updates.description : currentSchema.description,
        default: updates.default !== undefined ? updates.default : currentSchema.default,
      };
      
      onInputsChange({
        ...safeInputs,
        properties: newProperties,
      });
    }
  }, [safeInputs, required, onInputsChange]);

  // Toggle required
  const handleToggleRequired = useCallback((name: string) => {
    if (!onInputsChange) return;
    const isRequired = required.includes(name);
    const newRequired = isRequired
      ? required.filter(r => r !== name)
      : [...required, name];
    
    onInputsChange({
      ...safeInputs,
      required: newRequired.length > 0 ? newRequired : undefined,
    });
  }, [safeInputs, required, onInputsChange]);

  // Delete property
  const handleDeleteProperty = useCallback((name: string) => {
    if (!onInputsChange) return;
    const newProperties = { ...safeInputs.properties };
    delete newProperties[name];
    
    const newRequired = (safeInputs.required || []).filter(r => r !== name);
    
    onInputsChange({
      ...safeInputs,
      properties: newProperties,
      required: newRequired.length > 0 ? newRequired : undefined,
    });
    
    setExpandedInputs(prev => {
      const next = new Set(prev);
      next.delete(name);
      return next;
    });
  }, [safeInputs, onInputsChange]);

  const bgClass = isDark ? 'bg-slate-900' : 'bg-white';
  const borderClass = isDark ? 'border-slate-700' : 'border-gray-200';
  const textClass = isDark ? 'text-white' : 'text-gray-900';
  const mutedClass = isDark ? 'text-slate-400' : 'text-gray-500';
  const inputBgClass = isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-gray-300';

  return (
    <div className={`h-full flex flex-col ${bgClass}`}>
      {/* Header with Mode Toggle */}
      <div className={`flex-shrink-0 px-4 py-3 border-b ${borderClass}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
            </div>
            <div>
              <h3 className={`font-semibold ${textClass}`}>Workflow Inputs</h3>
              <p className={`text-xs ${mutedClass}`}>
                {properties.length} input{properties.length !== 1 ? 's' : ''} defined
              </p>
            </div>
          </div>
          {canEdit && (
            <RightPanelModeToggle
              mode={mode}
              onModeChange={setMode}
              isDark={isDark}
            />
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {mode === 'read' ? (
          /* ========== READ MODE ========== */
          <div className="space-y-4">
            {properties.length === 0 ? (
              <div className={`text-center py-8 ${mutedClass}`}>
                <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <p className="text-sm font-medium">No inputs defined</p>
                <p className="text-xs mt-1">
                  {canEdit ? 'Switch to Edit mode to add inputs' : 'This workflow has no inputs'}
                </p>
              </div>
            ) : (
              <Card title="Properties" isDark={isDark} badge={
                <Badge variant="input" isDark={isDark} size="xs">{properties.length}</Badge>
              }>
                <div className="space-y-3">
                  {properties.map(prop => (
                    <SchemaViewer
                      key={prop.name}
                      name={prop.name}
                      schema={{
                        type: prop.type,
                        description: prop.description,
                        default: prop.default,
                      }}
                      required={required.includes(prop.name)}
                      isDark={isDark}
                    />
                  ))}
                </div>
              </Card>
            )}
          </div>
        ) : (
          /* ========== EDIT MODE ========== */
          <div className="space-y-3">
            {properties.length === 0 ? (
              <div className={`text-center py-8 ${mutedClass}`}>
                <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <p className="text-sm font-medium">No inputs defined</p>
                <p className="text-xs mt-1">Add inputs to accept data from users or parent workflows</p>
              </div>
            ) : (
              properties.map((prop) => {
                const isExpanded = expandedInputs.has(prop.name);
                const isRequired = required.includes(prop.name);
                
                return (
                  <div 
                    key={prop.name}
                    className={`rounded-lg border ${borderClass} overflow-hidden`}
                  >
                    {/* Property Header */}
                    <div 
                      className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors`}
                      onClick={() => toggleInput(prop.name)}
                    >
                      <ChevronIcon expanded={isExpanded} />
                      <span className={`font-mono text-sm font-medium flex-1 ${textClass}`}>
                        {prop.name}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        isDark ? 'bg-slate-700 text-slate-300' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {prop.type}
                      </span>
                      {isRequired && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                          required
                        </span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteProperty(prop.name);
                        }}
                        className="p-1 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                        title="Delete input"
                      >
                        <TrashIcon />
                      </button>
                    </div>

                    {/* Property Editor (expanded) */}
                    {isExpanded && (
                      <div className={`px-3 pb-3 pt-2 border-t ${borderClass} space-y-3`}>
                        {/* Name */}
                        <div>
                          <label className={`block text-xs font-medium mb-1 ${mutedClass}`}>
                            Name
                          </label>
                          <input
                            type="text"
                            value={prop.name}
                            onChange={(e) => handleUpdateProperty(prop.name, { name: e.target.value })}
                            className={`w-full px-3 py-1.5 text-sm rounded border ${inputBgClass} ${textClass} focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                          />
                        </div>

                        {/* Type */}
                        <div>
                          <label className={`block text-xs font-medium mb-1 ${mutedClass}`}>
                            Type
                          </label>
                          <select
                            value={prop.type}
                            onChange={(e) => handleUpdateProperty(prop.name, { type: e.target.value })}
                            className={`w-full px-3 py-1.5 text-sm rounded border ${inputBgClass} ${textClass} focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                          >
                            {TYPE_OPTIONS.map(type => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </select>
                        </div>

                        {/* Description */}
                        <div>
                          <label className={`block text-xs font-medium mb-1 ${mutedClass}`}>
                            Description
                          </label>
                          <textarea
                            value={prop.description || ''}
                            onChange={(e) => handleUpdateProperty(prop.name, { description: e.target.value })}
                            rows={2}
                            className={`w-full px-3 py-1.5 text-sm rounded border ${inputBgClass} ${textClass} focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none`}
                            placeholder="Optional description..."
                          />
                        </div>

                        {/* Default Value */}
                        <div>
                          <ExpressionInput
                            label="Default Value"
                            value={String(prop.default ?? '')}
                            onChange={(newValue) => {
                              let value: unknown = newValue;
                              if (prop.type === 'number' || prop.type === 'integer') {
                                value = Number(value) || undefined;
                              } else if (prop.type === 'boolean') {
                                value = value === 'true';
                              }
                              handleUpdateProperty(prop.name, { default: value });
                            }}
                            placeholder="Optional default value or expression..."
                            isDark={isDark}
                            suggestions={expressionSuggestions}
                            variant="compact"
                            helpText="Use $ to insert expressions like $inputs.value"
                          />
                        </div>

                        {/* Required Toggle */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleRequired(prop.name)}
                            className={`flex items-center gap-2 px-3 py-1.5 text-xs rounded border transition-colors ${
                              isRequired
                                ? 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700 text-red-700 dark:text-red-300'
                                : `${inputBgClass} ${mutedClass} hover:bg-slate-100 dark:hover:bg-slate-700`
                            }`}
                          >
                            <span className={`w-3 h-3 rounded border-2 flex items-center justify-center ${
                              isRequired 
                                ? 'bg-red-500 border-red-500' 
                                : 'border-current'
                            }`}>
                              {isRequired && (
                                <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </span>
                            Required
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {/* Add New Property */}
            <div className={`flex gap-2 pt-2`}>
              <input
                type="text"
                value={newPropertyName}
                onChange={(e) => setNewPropertyName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddProperty()}
                placeholder="New input name..."
                className={`flex-1 px-3 py-2 text-sm rounded border ${inputBgClass} ${textClass} focus:outline-none focus:ring-2 focus:ring-indigo-500`}
              />
              <button
                onClick={handleAddProperty}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded transition-colors"
              >
                <PlusIcon />
                Add
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
