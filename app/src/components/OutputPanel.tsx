'use client';

import { useState, useCallback, useMemo } from 'react';
import RightPanelModeToggle, { RightPanelMode } from './RightPanelModeToggle';
import ExpressionInput, { ExpressionSuggestion } from './ExpressionInput';
import { Card, Badge, PropertyList, CodeBlock } from './primitives';

interface OutputEntry {
  name: string;
  value: string;
}

interface OutputPanelProps {
  /** Current workflow outputs mapping */
  outputs?: Record<string, string>;
  /** Handler for output updates (enables edit mode) */
  onOutputsChange?: (outputs: Record<string, string>) => void;
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

/**
 * OutputPanel - Unified component for viewing and editing workflow outputs
 * Combines read mode (documentation view) and edit mode (form editor)
 */
export default function OutputPanel({
  outputs,
  onOutputsChange,
  initialMode = 'read',
  isDark = false,
  onClose,
  expressionSuggestions = [],
}: OutputPanelProps) {
  const [mode, setMode] = useState<RightPanelMode>(initialMode);
  const [expandedOutputs, setExpandedOutputs] = useState<Set<string>>(new Set());
  const [newOutputName, setNewOutputName] = useState('');

  // Check if editing is available
  const canEdit = !!onOutputsChange;

  // Ensure we have a valid outputs object
  const safeOutputs: Record<string, string> = outputs || {};

  // Convert outputs to array format
  const entries: OutputEntry[] = useMemo(() => {
    return Object.entries(safeOutputs).map(([name, value]) => ({
      name,
      value,
    }));
  }, [safeOutputs]);

  // Toggle output expansion
  const toggleOutput = useCallback((name: string) => {
    setExpandedOutputs(prev => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }, []);

  // Add new output
  const handleAddOutput = useCallback(() => {
    if (!onOutputsChange) return;
    const name = newOutputName.trim() || `output${entries.length + 1}`;
    
    // Check for duplicates
    if (safeOutputs[name]) {
      return;
    }

    onOutputsChange({
      ...safeOutputs,
      [name]: '$response.body',
    });
    
    setNewOutputName('');
    setExpandedOutputs(prev => new Set([...prev, name]));
  }, [safeOutputs, newOutputName, entries.length, onOutputsChange]);

  // Update output
  const handleUpdateOutput = useCallback((
    oldName: string,
    newName: string,
    newValue: string
  ) => {
    if (!onOutputsChange) return;
    const newOutputs = { ...safeOutputs };
    
    // If renaming
    if (newName !== oldName) {
      delete newOutputs[oldName];
      newOutputs[newName] = newValue;
      
      // Update expanded state
      setExpandedOutputs(prev => {
        const next = new Set(prev);
        next.delete(oldName);
        next.add(newName);
        return next;
      });
    } else {
      newOutputs[oldName] = newValue;
    }
    
    onOutputsChange(newOutputs);
  }, [safeOutputs, onOutputsChange]);

  // Delete output
  const handleDeleteOutput = useCallback((name: string) => {
    if (!onOutputsChange) return;
    const newOutputs = { ...safeOutputs };
    delete newOutputs[name];
    
    onOutputsChange(newOutputs);
    
    setExpandedOutputs(prev => {
      const next = new Set(prev);
      next.delete(name);
      return next;
    });
  }, [safeOutputs, onOutputsChange]);

  const bgClass = isDark ? 'bg-slate-900' : 'bg-white';
  const borderClass = isDark ? 'border-slate-700' : 'border-gray-200';
  const textClass = isDark ? 'text-white' : 'text-gray-900';
  const mutedClass = isDark ? 'text-slate-400' : 'text-gray-500';
  const inputBgClass = isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-gray-300';

  // Prepare items for PropertyList in read mode
  const outputItems = useMemo(() => {
    return entries.map(entry => ({
      name: entry.name,
      value: entry.value,
    }));
  }, [entries]);

  return (
    <div className={`h-full flex flex-col ${bgClass}`}>
      {/* Header with Mode Toggle */}
      <div className={`flex-shrink-0 px-4 py-3 border-b ${borderClass}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </div>
            <div>
              <h3 className={`font-semibold ${textClass}`}>Workflow Outputs</h3>
              <p className={`text-xs ${mutedClass}`}>
                {entries.length} output{entries.length !== 1 ? 's' : ''} defined
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
            {entries.length === 0 ? (
              <div className={`text-center py-8 ${mutedClass}`}>
                <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <p className="text-sm font-medium">No outputs defined</p>
                <p className="text-xs mt-1">
                  {canEdit ? 'Switch to Edit mode to add outputs' : 'This workflow has no outputs'}
                </p>
              </div>
            ) : (
              <Card title="Outputs" isDark={isDark} badge={
                <Badge variant="output" isDark={isDark} size="xs">{entries.length}</Badge>
              }>
                <PropertyList 
                  items={outputItems}
                  isDark={isDark}
                  variant="compact"
                  borderColor="border-amber-400"
                  maxItems={10}
                />
              </Card>
            )}
          </div>
        ) : (
          /* ========== EDIT MODE ========== */
          <div className="space-y-3">
            {entries.length === 0 ? (
              <div className={`text-center py-8 ${mutedClass}`}>
                <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <p className="text-sm font-medium">No outputs defined</p>
                <p className="text-xs mt-1">Add outputs to expose data to parent workflows or users</p>
              </div>
            ) : (
              entries.map((entry) => {
                const isExpanded = expandedOutputs.has(entry.name);
                
                return (
                  <div 
                    key={entry.name}
                    className={`rounded-lg border ${borderClass} overflow-hidden`}
                  >
                    {/* Output Header */}
                    <div 
                      className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors`}
                      onClick={() => toggleOutput(entry.name)}
                    >
                      <ChevronIcon expanded={isExpanded} />
                      <span className={`font-mono text-sm font-medium flex-1 ${textClass}`}>
                        {entry.name}
                      </span>
                      <code className={`text-xs truncate max-w-[150px] ${mutedClass}`}>
                        {entry.value}
                      </code>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteOutput(entry.name);
                        }}
                        className="p-1 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                        title="Delete output"
                      >
                        <TrashIcon />
                      </button>
                    </div>

                    {/* Output Editor (expanded) */}
                    {isExpanded && (
                      <div className={`px-3 pb-3 pt-2 border-t ${borderClass} space-y-3`}>
                        {/* Name */}
                        <div>
                          <label className={`block text-xs font-medium mb-1 ${mutedClass}`}>
                            Output Name
                          </label>
                          <input
                            type="text"
                            value={entry.name}
                            onChange={(e) => handleUpdateOutput(entry.name, e.target.value, entry.value)}
                            className={`w-full px-3 py-1.5 text-sm rounded border ${inputBgClass} ${textClass} focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                          />
                        </div>

                        {/* Expression Value with Autocomplete */}
                        <ExpressionInput
                          label="Expression Value"
                          value={entry.value}
                          onChange={(newValue) => handleUpdateOutput(entry.name, entry.name, newValue)}
                          placeholder="$response.body.id"
                          isDark={isDark}
                          suggestions={expressionSuggestions}
                          variant="compact"
                          showQuickSuggestions={true}
                          quickSuggestions={[
                            '$response.body',
                            '$response.body.id',
                            '$statusCode',
                          ]}
                          helpText="Type $ for autocomplete suggestions"
                        />
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {/* Add New Output */}
            <div className={`flex gap-2 pt-2`}>
              <input
                type="text"
                value={newOutputName}
                onChange={(e) => setNewOutputName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddOutput()}
                placeholder="New output name..."
                className={`flex-1 px-3 py-2 text-sm rounded border ${inputBgClass} ${textClass} focus:outline-none focus:ring-2 focus:ring-indigo-500`}
              />
              <button
                onClick={handleAddOutput}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-amber-600 hover:bg-amber-500 text-white rounded transition-colors"
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
