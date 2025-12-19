'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';

interface Suggestion {
  expression: string;
  label: string;
  type: 'output' | 'input' | 'context';
  stepId?: string;
  outputKey?: string;
}

interface ExpressionAutocompleteStandaloneProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  currentStepId?: string;
  className?: string;
  disabled?: boolean;
  isDark?: boolean;
  /** Available suggestions - can be passed in for standalone use */
  suggestions?: Suggestion[];
}

/**
 * Standalone version of ExpressionAutocomplete that doesn't require BuilderContext.
 * For use in showcase and testing.
 */
export default function ExpressionAutocompleteStandalone({
  value,
  onChange,
  placeholder = '$steps.stepId.outputs.key',
  currentStepId,
  className = '',
  disabled = false,
  isDark = false,
  suggestions: externalSuggestions,
}: ExpressionAutocompleteStandaloneProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filter, setFilter] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Default suggestions if none provided
  const allSuggestions = useMemo<Suggestion[]>(() => {
    if (externalSuggestions) return externalSuggestions;
    
    return [
      // Step outputs
      { expression: '$steps.find-pets.outputs.availablePets', label: 'find-pets → availablePets', type: 'output', stepId: 'find-pets', outputKey: 'availablePets' },
      { expression: '$steps.find-pets.outputs.petCount', label: 'find-pets → petCount', type: 'output', stepId: 'find-pets', outputKey: 'petCount' },
      { expression: '$steps.select-pet.outputs.selectedPet', label: 'select-pet → selectedPet', type: 'output', stepId: 'select-pet', outputKey: 'selectedPet' },
      { expression: '$steps.place-order.outputs.orderId', label: 'place-order → orderId', type: 'output', stepId: 'place-order', outputKey: 'orderId' },
      // Workflow inputs
      { expression: '$inputs.petType', label: 'Input: petType', type: 'input' },
      { expression: '$inputs.maxPrice', label: 'Input: maxPrice', type: 'input' },
      { expression: '$inputs.customerId', label: 'Input: customerId', type: 'input' },
      // Context expressions
      { expression: '$url', label: 'Request URL', type: 'context' },
      { expression: '$method', label: 'HTTP Method', type: 'context' },
      { expression: '$statusCode', label: 'Response Status Code', type: 'context' },
      { expression: '$response.body', label: 'Response Body', type: 'context' },
      { expression: '$response.header.', label: 'Response Header', type: 'context' },
    ];
  }, [externalSuggestions]);

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
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
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
  }, [onChange]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
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
  }, [showSuggestions, filteredSuggestions, selectedIndex]);

  // Select a suggestion
  const selectSuggestion = useCallback((suggestion: Suggestion) => {
    // Replace the $... part with the selected expression
    const lastDollar = value.lastIndexOf('$');
    const prefix = lastDollar > 0 ? value.substring(0, lastDollar) : '';
    onChange(prefix + suggestion.expression);
    setShowSuggestions(false);
    inputRef.current?.focus();
  }, [value, onChange]);

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

  const getTypeBadge = (type: Suggestion['type']) => {
    switch (type) {
      case 'output':
        return <span className={`text-[9px] px-1 py-0.5 rounded ${isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-600'}`}>output</span>;
      case 'input':
        return <span className={`text-[9px] px-1 py-0.5 rounded ${isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'}`}>input</span>;
      case 'context':
        return <span className={`text-[9px] px-1 py-0.5 rounded ${isDark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}`}>context</span>;
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
        className={`w-full px-3 py-2 rounded-lg border text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
          isDark 
            ? 'bg-slate-800 border-slate-600 text-white placeholder-slate-500' 
            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
        } ${disabled ? 'opacity-60 cursor-not-allowed' : ''} ${className}`}
      />
      
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className={`absolute z-50 top-full left-0 right-0 mt-1 rounded-lg shadow-lg max-h-64 overflow-y-auto border ${
            isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
          }`}
        >
          {filteredSuggestions.map((suggestion, idx) => (
            <div
              key={suggestion.expression}
              onClick={() => selectSuggestion(suggestion)}
              className={`px-3 py-2.5 cursor-pointer flex items-center gap-2 text-sm border-b last:border-b-0 ${
                isDark ? 'border-slate-700' : 'border-gray-100'
              } ${
                idx === selectedIndex
                  ? isDark 
                    ? 'bg-indigo-900/30 text-indigo-300'
                    : 'bg-indigo-50 text-indigo-700'
                  : isDark
                    ? 'hover:bg-slate-700'
                    : 'hover:bg-gray-50'
              }`}
            >
              {getTypeIcon(suggestion.type)}
              <div className="flex-1 min-w-0">
                <div className={`font-mono text-xs truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {suggestion.expression}
                </div>
                <div className={`text-[11px] truncate ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  {suggestion.label}
                </div>
              </div>
              {getTypeBadge(suggestion.type)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
