'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';

export interface ExpressionSuggestion {
  expression: string;
  label: string;
  description?: string;
  type: 'output' | 'input' | 'context' | 'step' | 'response';
  stepId?: string;
  outputKey?: string;
}

interface ExpressionInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
  disabled?: boolean;
  isDark?: boolean;
  /** Available suggestions */
  suggestions?: ExpressionSuggestion[];
  /** Variant for different use cases */
  variant?: 'default' | 'compact' | 'inline';
  /** Show quick suggestion buttons */
  showQuickSuggestions?: boolean;
  /** Quick suggestion expressions to show as buttons */
  quickSuggestions?: string[];
  /** Error message */
  error?: string;
  /** Help text */
  helpText?: string;
  /** Blur handler */
  onBlur?: () => void;
}

const DEFAULT_SUGGESTIONS: ExpressionSuggestion[] = [
  // Context expressions
  { expression: '$statusCode', label: 'Status Code', description: 'HTTP response status code', type: 'context' },
  { expression: '$response.body', label: 'Response Body', description: 'Full response body', type: 'response' },
  { expression: '$response.header.content-type', label: 'Content-Type', description: 'Response content type header', type: 'response' },
  { expression: '$url', label: 'Request URL', description: 'The request URL', type: 'context' },
  { expression: '$method', label: 'HTTP Method', description: 'The HTTP method used', type: 'context' },
  // Input expressions
  { expression: '$inputs.', label: 'Workflow Input', description: 'Access workflow input values', type: 'input' },
  // Step output expressions
  { expression: '$steps.', label: 'Step Output', description: 'Access outputs from previous steps', type: 'output' },
];

const QUICK_SUGGESTIONS_DEFAULT = [
  '$statusCode == 200',
  '$response.body',
  '$response.body.length > 0',
];

/**
 * Expression input field with autocomplete for Arazzo expressions.
 * Provides suggestions for $statusCode, $response, $inputs, $steps, etc.
 */
export default function ExpressionInput({
  value,
  onChange,
  placeholder = 'Enter expression (type $ for suggestions)',
  label,
  className = '',
  disabled = false,
  isDark = false,
  suggestions = DEFAULT_SUGGESTIONS,
  variant = 'default',
  showQuickSuggestions = false,
  quickSuggestions = QUICK_SUGGESTIONS_DEFAULT,
  error,
  helpText,
  onBlur,
}: ExpressionInputProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filter, setFilter] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter suggestions based on current input
  const filteredSuggestions = useMemo(() => {
    if (!filter) return suggestions;
    const lowerFilter = filter.toLowerCase();
    return suggestions.filter(s =>
      s.expression.toLowerCase().includes(lowerFilter) ||
      s.label.toLowerCase().includes(lowerFilter) ||
      s.description?.toLowerCase().includes(lowerFilter)
    );
  }, [suggestions, filter]);

  // Handle input change
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    const cursorPosition = e.target.selectionStart ?? newValue.length;
    onChange(newValue);

    // Show suggestions when typing $ or after $ (only looking back from cursor)
    const textBeforeCursor = newValue.substring(0, cursorPosition);
    if (textBeforeCursor.includes('$')) {
      const lastDollar = textBeforeCursor.lastIndexOf('$');
      setFilter(textBeforeCursor.substring(lastDollar));
      setShowDropdown(true);
      setSelectedIndex(0);
    } else {
      setShowDropdown(false);
    }
  }, [onChange]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showDropdown || filteredSuggestions.length === 0) return;

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
        setShowDropdown(false);
        break;
    }
  }, [showDropdown, filteredSuggestions, selectedIndex]);

  // Select a suggestion
  const selectSuggestion = useCallback((suggestion: ExpressionSuggestion) => {
    const cursorPosition = inputRef.current?.selectionStart ?? value.length;
    const textBeforeCursor = value.substring(0, cursorPosition);
    const textAfterCursor = value.substring(cursorPosition);

    const lastDollar = textBeforeCursor.lastIndexOf('$');

    if (lastDollar === -1) {
      onChange(value + suggestion.expression);
    } else {
      const prefix = value.substring(0, lastDollar);
      // We replace from the last $ up to the cursor with the suggestion, 
      // then re-attach the rest of the string.
      onChange(prefix + suggestion.expression + textAfterCursor);
    }

    setShowDropdown(false);
    // Use a small timeout to ensure focus and cursor position after React update
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  }, [value, onChange]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        inputRef.current && !inputRef.current.contains(e.target as Node) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll selected suggestion into view
  useEffect(() => {
    if (dropdownRef.current && showDropdown) {
      const selected = dropdownRef.current.children[selectedIndex] as HTMLElement;
      if (selected) {
        selected.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex, showDropdown]);

  const getTypeIcon = (type: ExpressionSuggestion['type']) => {
    const iconClass = 'w-3.5 h-3.5';
    switch (type) {
      case 'output':
        return <span className="text-amber-500">📤</span>;
      case 'input':
        return <span className="text-emerald-500">📥</span>;
      case 'context':
        return <span className="text-indigo-500">⚡</span>;
      case 'step':
        return <span className="text-purple-500">🔗</span>;
      case 'response':
        return <span className="text-blue-500">📨</span>;
      default:
        return <span className={iconClass}>•</span>;
    }
  };

  const getTypeBadgeColor = (type: ExpressionSuggestion['type']) => {
    switch (type) {
      case 'output':
        return isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-600';
      case 'input':
        return isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600';
      case 'context':
        return isDark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600';
      case 'step':
        return isDark ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-600';
      case 'response':
        return isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600';
      default:
        return isDark ? 'bg-slate-500/20 text-slate-400' : 'bg-gray-100 text-gray-600';
    }
  };

  const inputSizeClasses = {
    default: 'px-3 py-2 text-sm',
    compact: 'px-2 py-1.5 text-xs',
    inline: 'px-2 py-1 text-xs',
  };

  return (
    <div className={`relative ${className}`}>
      {/* Label */}
      {label && (
        <label className={`block text-xs font-semibold uppercase mb-1.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
          {label}
        </label>
      )}

      {/* Input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={onBlur}
          onFocus={(e) => {
            if (!disabled && value.includes('$')) {
              const cursorPosition = e.target.selectionStart ?? value.length;
              const textBeforeCursor = value.substring(0, cursorPosition);
              const lastDollar = textBeforeCursor.lastIndexOf('$');
              if (lastDollar !== -1) {
                setFilter(textBeforeCursor.substring(lastDollar));
                setShowDropdown(true);
              }
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full rounded-lg border font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors ${inputSizeClasses[variant]} ${isDark
            ? 'bg-slate-800 border-slate-600 text-white placeholder-slate-500'
            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
            } ${error ? 'border-red-500 focus:ring-red-500' : ''} ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
        />

        {/* Expression indicator */}
        {value.startsWith('$') && (
          <div className={`absolute right-2 top-1/2 -translate-y-1/2 text-xs px-1.5 py-0.5 rounded ${isDark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600'
            }`}>
            expr
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <p className="mt-1 text-xs text-red-500">{error}</p>
      )}

      {/* Help text */}
      {helpText && !error && (
        <p className={`mt-1 text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{helpText}</p>
      )}

      {/* Quick Suggestions */}
      {showQuickSuggestions && quickSuggestions.length > 0 && !disabled && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {quickSuggestions.map((expr) => (
            <button
              key={expr}
              type="button"
              onClick={() => { onChange(expr); inputRef.current?.focus(); }}
              className={`px-2 py-1 text-xs font-mono rounded-md transition-colors ${value === expr
                ? 'bg-indigo-600 text-white'
                : isDark
                  ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                }`}
            >
              {expr}
            </button>
          ))}
        </div>
      )}

      {/* Suggestions Dropdown */}
      {showDropdown && filteredSuggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className={`absolute z-50 top-full left-0 right-0 mt-1 rounded-lg shadow-lg max-h-64 overflow-y-auto border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
            }`}
        >
          {filteredSuggestions.map((suggestion, idx) => (
            <div
              key={suggestion.expression}
              onMouseDown={(e) => {
                e.preventDefault(); // Prevent input blur
                selectSuggestion(suggestion);
              }}
              className={`px-3 py-2.5 cursor-pointer flex items-start gap-2 text-sm border-b last:border-b-0 ${isDark ? 'border-slate-700' : 'border-gray-100'
                } ${idx === selectedIndex
                  ? isDark
                    ? 'bg-indigo-900/30 text-indigo-300'
                    : 'bg-indigo-50 text-indigo-700'
                  : isDark
                    ? 'hover:bg-slate-700'
                    : 'hover:bg-gray-50'
                }`}
            >
              <span className="mt-0.5">{getTypeIcon(suggestion.type)}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <code className={`text-xs font-mono truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {suggestion.expression}
                  </code>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded ${getTypeBadgeColor(suggestion.type)}`}>
                    {suggestion.type}
                  </span>
                </div>
                <div className={`text-[11px] truncate ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  {suggestion.label}
                  {suggestion.description && ` - ${suggestion.description}`}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Export default suggestions for reuse
export { DEFAULT_SUGGESTIONS, QUICK_SUGGESTIONS_DEFAULT };
