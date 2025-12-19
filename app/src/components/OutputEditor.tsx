'use client';

import { useState, useCallback } from 'react';

interface OutputEntry {
  name: string;
  value: string;
}

interface OutputEditorProps {
  /** Current workflow outputs mapping */
  outputs: Record<string, string>;
  /** Handler for output updates */
  onOutputsChange: (outputs: Record<string, string>) => void;
  /** Close handler */
  onClose?: () => void;
  /** Dark mode */
  isDark?: boolean;
  /** Expression suggestions for autocomplete */
  expressionSuggestions?: Array<{ expression: string; label: string; type: string }>;
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

const ExpressionIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
  </svg>
);

/**
 * OutputEditor - Form for editing workflow outputs (key-value expression mappings)
 */
export default function OutputEditor({
  outputs,
  onOutputsChange,
  onClose,
  isDark = false,
  expressionSuggestions = [],
}: OutputEditorProps) {
  const [expandedOutputs, setExpandedOutputs] = useState<Set<string>>(new Set());
  const [newOutputName, setNewOutputName] = useState('');

  // Convert outputs to array format for editing
  const entries: OutputEntry[] = Object.entries(outputs).map(([name, value]) => ({
    name,
    value,
  }));

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
    const name = newOutputName.trim() || `output${entries.length + 1}`;
    
    // Check for duplicates
    if (outputs[name]) {
      return;
    }

    onOutputsChange({
      ...outputs,
      [name]: '$response.body',
    });
    
    setNewOutputName('');
    setExpandedOutputs(prev => new Set([...prev, name]));
  }, [outputs, newOutputName, entries.length, onOutputsChange]);

  // Update output
  const handleUpdateOutput = useCallback((
    oldName: string,
    newName: string,
    newValue: string
  ) => {
    const newOutputs = { ...outputs };
    
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
  }, [outputs, onOutputsChange]);

  // Delete output
  const handleDeleteOutput = useCallback((name: string) => {
    const newOutputs = { ...outputs };
    delete newOutputs[name];
    
    onOutputsChange(newOutputs);
    
    setExpandedOutputs(prev => {
      const next = new Set(prev);
      next.delete(name);
      return next;
    });
  }, [outputs, onOutputsChange]);

  // Insert expression suggestion
  const handleInsertExpression = useCallback((outputName: string, expression: string) => {
    handleUpdateOutput(outputName, outputName, expression);
  }, [handleUpdateOutput]);

  const bgClass = isDark ? 'bg-slate-900' : 'bg-white';
  const borderClass = isDark ? 'border-slate-700' : 'border-gray-200';
  const textClass = isDark ? 'text-white' : 'text-gray-900';
  const mutedClass = isDark ? 'text-slate-400' : 'text-gray-500';
  const inputBgClass = isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-gray-300';

  return (
    <div className={`h-full flex flex-col ${bgClass}`}>
      {/* Header */}
      <div className={`flex-shrink-0 px-4 py-3 border-b ${borderClass}`}>
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
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
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

                    {/* Expression Value */}
                    <div>
                      <label className={`block text-xs font-medium mb-1 ${mutedClass}`}>
                        Expression Value
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={entry.value}
                          onChange={(e) => handleUpdateOutput(entry.name, entry.name, e.target.value)}
                          className={`w-full px-3 py-1.5 text-sm font-mono rounded border ${inputBgClass} ${textClass} focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                          placeholder="$response.body.id"
                        />
                      </div>
                      <p className={`text-[10px] mt-1 ${mutedClass}`}>
                        Use runtime expressions like $response.body, $steps.stepId.outputs.value
                      </p>
                    </div>

                    {/* Quick Expression Suggestions */}
                    {expressionSuggestions.length > 0 && (
                      <div>
                        <label className={`block text-xs font-medium mb-2 ${mutedClass}`}>
                          Quick Insert
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {expressionSuggestions.slice(0, 8).map((suggestion) => (
                            <button
                              key={suggestion.expression}
                              onClick={() => handleInsertExpression(entry.name, suggestion.expression)}
                              className={`flex items-center gap-1 px-2 py-1 text-xs rounded border transition-colors ${
                                isDark
                                  ? 'border-slate-600 hover:bg-slate-700 text-slate-300'
                                  : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                              }`}
                              title={suggestion.label}
                            >
                              <ExpressionIcon />
                              <span className="font-mono truncate max-w-[120px]">
                                {suggestion.expression}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
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
    </div>
  );
}
