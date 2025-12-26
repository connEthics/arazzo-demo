'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useBuilder } from '../context/BuilderContext';

interface ExpressionAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  currentStepId?: string;
  className?: string;
  disabled?: boolean;
}

interface Suggestion {
  expression: string;
  label: string;
  type: 'output' | 'input' | 'context';
  stepId?: string;
  outputKey?: string;
}

/**
 * Input field with autocomplete for Arazzo expressions.
 * Suggests:
 * - $steps.{stepId}.outputs.{key} - outputs from previous steps
 * - $inputs.{key} - workflow inputs
 * - $url, $method, $statusCode - context values
 */
export default function ExpressionAutocomplete({
  value,
  onChange,
  placeholder = '$steps.stepId.outputs.key',
  currentStepId,
  className = '',
  disabled = false
}: ExpressionAutocompleteProps) {
  const { state } = useBuilder();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filter, setFilter] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Build available suggestions from all steps
  const allSuggestions = useMemo<Suggestion[]>(() => {
    const suggestions: Suggestion[] = [];
    const steps = state.spec.workflows[0]?.steps || [];
    
    // Add outputs from other steps
    steps.forEach(step => {
      // Skip current step
      if (step.stepId === currentStepId) return;
      
      if (step.outputs) {
        Object.keys(step.outputs).forEach(outputKey => {
          suggestions.push({
            expression: `$steps.${step.stepId}.outputs.${outputKey}`,
            label: `${step.stepId} → ${outputKey}`,
            type: 'output',
            stepId: step.stepId,
            outputKey
          });
        });
      }
    });
    
    // Add workflow inputs
    const workflow = state.spec.workflows[0];
    if (workflow?.inputs?.properties) {
      Object.keys(workflow.inputs.properties).forEach(inputKey => {
        suggestions.push({
          expression: `$inputs.${inputKey}`,
          label: `Input: ${inputKey}`,
          type: 'input'
        });
      });
    }
    
    // Add common context expressions
    suggestions.push(
      { expression: '$url', label: 'Request URL', type: 'context' },
      { expression: '$method', label: 'HTTP Method', type: 'context' },
      { expression: '$statusCode', label: 'Response Status Code', type: 'context' },
      { expression: '$response.body', label: 'Response Body', type: 'context' },
      { expression: '$response.header.', label: 'Response Header', type: 'context' }
    );
    
    return suggestions;
  }, [state.spec.workflows, currentStepId]);

  // Filter suggestions based on current input
  const filteredSuggestions = useMemo(() => {
    if (!filter) return allSuggestions;
    const lowerFilter = filter.toLowerCase();
    return allSuggestions.filter(s => 
      s.expression.toLowerCase().includes(lowerFilter) ||
      s.label.toLowerCase().includes(lowerFilter)
    );
  }, [allSuggestions, filter]);

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    
    // Show suggestions when typing $ or after $
    if (newValue.includes('$')) {
      const lastDollar = newValue.lastIndexOf('$');
      setFilter(newValue.substring(lastDollar));
      setShowSuggestions(true);
      setSelectedIndex(0);
    } else {
      setShowSuggestions(false);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || filteredSuggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, filteredSuggestions.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
      case 'Tab':
        e.preventDefault();
        selectSuggestion(filteredSuggestions[selectedIndex]);
        break;
      case 'Escape':
        setShowSuggestions(false);
        break;
    }
  };

  // Select a suggestion
  const selectSuggestion = (suggestion: Suggestion) => {
    // Replace the $... part with the selected expression
    const lastDollar = value.lastIndexOf('$');
    const prefix = lastDollar > 0 ? value.substring(0, lastDollar) : '';
    onChange(prefix + suggestion.expression);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        inputRef.current && !inputRef.current.contains(e.target as Node) &&
        suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll selected suggestion into view
  useEffect(() => {
    if (suggestionsRef.current && showSuggestions) {
      const selected = suggestionsRef.current.children[selectedIndex] as HTMLElement;
      if (selected) {
        selected.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex, showSuggestions]);

  const getTypeIcon = (type: Suggestion['type']) => {
    switch (type) {
      case 'output':
        return <span className="text-amber-500">📤</span>;
      case 'input':
        return <span className="text-emerald-500">📥</span>;
      case 'context':
        return <span className="text-indigo-500">⚡</span>;
    }
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (!disabled && value.includes('$')) {
            const lastDollar = value.lastIndexOf('$');
            setFilter(value.substring(lastDollar));
            setShowSuggestions(true);
          }
        }}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full px-2 py-1 rounded border bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-xs font-mono ${disabled ? 'opacity-60 cursor-not-allowed' : ''} ${className}`}
      />
      
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-48 overflow-y-auto"
        >
          {filteredSuggestions.map((suggestion, idx) => (
            <div
              key={suggestion.expression}
              onClick={() => selectSuggestion(suggestion)}
              className={`px-3 py-2 cursor-pointer flex items-center gap-2 text-xs ${
                idx === selectedIndex
                  ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              {getTypeIcon(suggestion.type)}
              <div className="flex-1 min-w-0">
                <div className="font-mono truncate">{suggestion.expression}</div>
                <div className="text-[10px] text-slate-400 truncate">{suggestion.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
