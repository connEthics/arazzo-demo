'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import ExpressionInput, { ExpressionSuggestion } from '../ExpressionInput';

// Icons
const EditIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const CloseIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const DeleteIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

export type EditMode = 'read' | 'edit';
export type FieldType = 'text' | 'expression' | 'select' | 'textarea' | 'number';
export type ActivationMode = 'toggle' | 'hover' | 'click';

interface EditableFieldProps {
  /** Current value */
  value: string;
  /** Callback when value changes (immediate update) */
  onChange: (value: string) => void;
  /** Field name/label */
  label?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Type of input */
  type?: FieldType;
  /** Options for select type */
  options?: { value: string; label: string }[];
  /** Edit activation mode: toggle (external), hover, or click */
  activationMode?: ActivationMode;
  /** External edit mode (used when activationMode='toggle') */
  editMode?: EditMode;
  /** Is the field required */
  required?: boolean;
  /** Show delete button */
  deletable?: boolean;
  /** Callback when delete is clicked */
  onDelete?: () => void;
  /** Expression suggestions for autocomplete */
  expressionSuggestions?: ExpressionSuggestion[];
  /** Dark mode */
  isDark?: boolean;
  /** Additional badge/type indicator */
  badge?: React.ReactNode;
  /** Compact variant */
  compact?: boolean;
  /** Validation function - returns error message or null */
  validate?: (value: string) => string | null;
  /** Border color for left accent */
  borderColor?: string;
  /** Custom class name */
  className?: string;
}

/**
 * EditableField - A unified component for read/edit field display
 * 
 * Supports three activation modes:
 * - toggle: External control via editMode prop
 * - hover: Edit icon appears on hover, click to edit
 * - click: Double-click anywhere to edit
 * 
 * All modes update immediately (no save button needed)
 */
export default function EditableField({
  value,
  onChange,
  label,
  placeholder,
  type = 'text',
  options = [],
  activationMode = 'hover',
  editMode: externalEditMode,
  required = false,
  deletable = false,
  onDelete,
  expressionSuggestions = [],
  isDark = false,
  badge,
  compact = false,
  validate,
  borderColor = 'border-indigo-400',
  className = '',
}: EditableFieldProps) {
  // Internal edit state (used for hover/click modes)
  const [internalEditing, setInternalEditing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  // Determine if we're in edit mode
  const isEditing = activationMode === 'toggle'
    ? externalEditMode === 'edit'
    : internalEditing;

  // Sync local value with prop
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  // Handle value change with validation
  const handleChange = useCallback((newValue: string) => {
    setLocalValue(newValue);

    // Validate if provided
    if (validate) {
      const validationError = validate(newValue);
      setError(validationError);
      if (validationError) return;
    }

    // Immediate update
    onChange(newValue);
  }, [onChange, validate]);

  // Handle blur - exit inline edit mode
  const handleBlur = useCallback(() => {
    if (activationMode !== 'toggle') {
      setInternalEditing(false);
    }
  }, [activationMode]);

  // Handle key events
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setLocalValue(value); // Revert
      setInternalEditing(false);
      setError(null);
    } else if (e.key === 'Enter' && type !== 'textarea') {
      handleBlur();
    }
  }, [value, type, handleBlur]);

  // Style classes
  const bgClass = isDark ? 'bg-slate-800' : 'bg-gray-50';
  const textClass = isDark ? 'text-white' : 'text-gray-900';
  const mutedClass = isDark ? 'text-slate-400' : 'text-gray-500';
  const hoverBgClass = isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100';
  const inputBorderClass = isDark ? 'border-slate-600' : 'border-gray-300';
  const focusRingClass = isDark ? 'focus:ring-indigo-500 focus:border-indigo-500' : 'focus:ring-indigo-500 focus:border-indigo-500';

  // Render the read-only view
  const renderReadView = () => (
    <div className="flex items-center gap-2 min-w-0 flex-1">
      {typeof value === 'string' ? (
        <code className={`text-[11px] font-mono ${mutedClass} break-all flex-1`}>
          {value || <span className="italic opacity-50">{placeholder || 'Empty'}</span>}
        </code>
      ) : (
        <span className={`text-[11px] ${mutedClass}`}>{value}</span>
      )}
    </div>
  );

  // Render the edit view
  const renderEditView = () => {
    if (type === 'expression') {
      return (
        <ExpressionInput
          value={localValue}
          onChange={handleChange}
          placeholder={placeholder}
          isDark={isDark}
          variant="compact"
          suggestions={expressionSuggestions}
        />
      );
    }

    if (type === 'select') {
      return (
        <select
          value={localValue}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={handleBlur}
          className={`w-full px-2 py-1 text-xs rounded border ${bgClass} ${inputBorderClass} ${textClass} ${focusRingClass} outline-none`}
        >
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      );
    }

    if (type === 'textarea') {
      return (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={localValue}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={3}
          className={`w-full px-2 py-1.5 text-xs font-mono rounded border resize-none ${bgClass} ${inputBorderClass} ${textClass} ${focusRingClass} outline-none`}
        />
      );
    }

    // Default: text or number input
    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type={type === 'number' ? 'number' : 'text'}
        value={localValue}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`w-full px-2 py-1 text-xs font-mono rounded border ${bgClass} ${inputBorderClass} ${textClass} ${focusRingClass} outline-none`}
      />
    );
  };

  return (
    <div
      className={`${bgClass} rounded ${compact ? 'px-2 py-1.5' : 'px-3 py-2'} border-l-2 ${borderColor} ${className} ${activationMode === 'click' && !isEditing ? 'cursor-pointer' : ''
        } transition-all duration-150`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => activationMode === 'click' && !isEditing && setInternalEditing(true)}
    >
      {/* Header row with label and actions */}
      <div className="flex items-center gap-2 mb-1">
        {label && (
          <code className={`text-[11px] font-mono font-medium ${textClass}`}>
            {label}
          </code>
        )}
        {badge}
        {required && (
          <span className="text-[9px] px-1 py-0.5 rounded bg-red-100 text-red-600">
            required
          </span>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Actions */}
        <div className={`flex items-center gap-1 transition-opacity ${activationMode === 'hover' && !isHovered && !isEditing ? 'opacity-0' : 'opacity-100'
          }`}>
          {/* Edit button (hover mode) */}
          {activationMode === 'hover' && !isEditing && (
            <button
              onClick={() => setInternalEditing(true)}
              className={`p-1 rounded transition-colors ${isDark ? 'hover:bg-slate-600 text-slate-400 hover:text-white' : 'hover:bg-gray-200 text-gray-400 hover:text-gray-700'
                }`}
              title="Edit"
            >
              <EditIcon />
            </button>
          )}

          {/* Confirm/Cancel (inline edit modes) */}
          {activationMode !== 'toggle' && isEditing && (
            <>
              <button
                onClick={() => {
                  setInternalEditing(false);
                  setError(null);
                }}
                className={`p-1 rounded transition-colors ${isDark ? 'hover:bg-emerald-500/20 text-emerald-400' : 'hover:bg-emerald-100 text-emerald-600'
                  }`}
                title="Done"
              >
                <CheckIcon />
              </button>
              <button
                onClick={() => {
                  setLocalValue(value);
                  setInternalEditing(false);
                  setError(null);
                }}
                className={`p-1 rounded transition-colors ${isDark ? 'hover:bg-slate-600 text-slate-400' : 'hover:bg-gray-200 text-gray-500'
                  }`}
                title="Cancel"
              >
                <CloseIcon />
              </button>
            </>
          )}

          {/* Delete button */}
          {deletable && onDelete && (
            <button
              onClick={onDelete}
              className={`p-1 rounded transition-colors ${isDark ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-red-100 text-red-500'
                }`}
              title="Delete"
            >
              <DeleteIcon />
            </button>
          )}
        </div>
      </div>

      {/* Value display or edit input */}
      {isEditing ? renderEditView() : renderReadView()}

      {/* Error message */}
      {error && (
        <p className="text-[10px] text-red-500 mt-1">{error}</p>
      )}
    </div>
  );
}
