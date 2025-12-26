'use client';

import { useState, useRef, useEffect } from 'react';
import ExpressionInput, { ExpressionSuggestion } from '../ExpressionInput';

// Icons
const EditIcon = () => (
  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
  </svg>
);

const DeleteIcon = () => (
  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const UpIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
  </svg>
);

const DownIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

export type ParameterIn = 'query' | 'path' | 'header' | 'cookie';

export interface ParameterItem {
  name: string;
  in: ParameterIn;
  value: string;
  required?: boolean;
}

export interface OutputItem {
  key: string;
  value: string;
}

interface EditableListItemBaseProps {
  isDark?: boolean;
  onDelete?: () => void;
  expressionSuggestions?: ExpressionSuggestion[];
  borderColor?: string;
  isNew?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

interface EditableParameterItemProps extends EditableListItemBaseProps {
  type: 'parameter';
  item: ParameterItem;
  onChange: (item: ParameterItem) => void;
  showRequired?: boolean;
  hideIn?: boolean;
}

interface EditableOutputItemProps extends EditableListItemBaseProps {
  type: 'output';
  item: OutputItem;
  onChange: (item: OutputItem) => void;
}

type EditableListItemProps = EditableParameterItemProps | EditableOutputItemProps;

const PARAMETER_IN_OPTIONS: { value: ParameterIn; label: string; color: string }[] = [
  { value: 'query', label: 'query', color: 'bg-blue-500/20 text-blue-400' },
  { value: 'path', label: 'path', color: 'bg-purple-500/20 text-purple-400' },
  { value: 'header', label: 'header', color: 'bg-amber-500/20 text-amber-400' },
  { value: 'cookie', label: 'cookie', color: 'bg-pink-500/20 text-pink-400' },
];

export default function EditableListItem(props: EditableListItemProps) {
  const {
    isDark = false,
    onDelete,
    expressionSuggestions = [],
    borderColor = 'border-blue-400',
    isNew = false,
    onMoveUp,
    onMoveDown
  } = props;

  const [isHovered, setIsHovered] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(isNew ? 'name' : null);
  const [localValue, setLocalValue] = useState('');
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingField === 'name' && props.type === 'parameter') {
      setLocalValue(props.item.name);
    } else if (editingField === 'key' && props.type === 'output') {
      setLocalValue(props.item.key);
    }
  }, [editingField]); // Don't depend on props.item to avoid resetting while typing if parent updates

  useEffect(() => {
    if ((editingField === 'name' || editingField === 'key') && nameInputRef.current) {
      nameInputRef.current.focus();
      // nameInputRef.current.select(); // Optional: select all on focus
    }
  }, [editingField]);

  const bgClass = isDark ? 'bg-slate-800' : 'bg-white';
  const borderClass = isDark ? 'border-slate-700' : 'border-gray-200';
  const textClass = isDark ? 'text-white' : 'text-gray-900';
  const mutedClass = isDark ? 'text-slate-400' : 'text-gray-500';
  const inputBgClass = isDark ? 'bg-slate-700' : 'bg-gray-50';
  const inputBorderClass = isDark ? 'border-slate-600' : 'border-gray-300';

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === 'Escape') {
      setEditingField(null);
    }
  };

  const renderMovementControls = () => (
    <div className={`flex flex-col gap-0.5 transition-opacity ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
      {onMoveUp && (
        <button
          onClick={onMoveUp}
          className={`p-0.5 rounded transition-colors ${isDark ? 'text-slate-500 hover:text-white hover:bg-slate-700' : 'text-slate-400 hover:text-slate-900 hover:bg-gray-100'}`}
          title="Move up"
        >
          <UpIcon />
        </button>
      )}
      {onMoveDown && (
        <button
          onClick={onMoveDown}
          className={`p-0.5 rounded transition-colors ${isDark ? 'text-slate-500 hover:text-white hover:bg-slate-700' : 'text-slate-400 hover:text-slate-900 hover:bg-gray-100'}`}
          title="Move down"
        >
          <DownIcon />
        </button>
      )}
    </div>
  );

  if (props.type === 'parameter') {
    const { item, onChange, showRequired, hideIn } = props;
    const currentInOption = PARAMETER_IN_OPTIONS.find(o => o.value === item.in) || PARAMETER_IN_OPTIONS[0];

    return (
      <div
        className={`group relative flex items-start gap-2 p-2 rounded-lg border-l-2 ${borderColor} ${bgClass} border ${borderClass} transition-all hover:shadow-sm`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {showRequired && (
          <div className="flex items-center h-6">
            <input
              type="checkbox"
              checked={item.required || false}
              onChange={(e) => onChange({ ...item, required: e.target.checked })}
              className="w-3.5 h-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              title="Required"
            />
          </div>
        )}

        <div className="flex items-center gap-1.5 min-w-[80px]">
          {editingField === 'name' ? (
            <input
              ref={nameInputRef}
              type="text"
              value={localValue}
              onChange={(e) => setLocalValue(e.target.value)}
              onBlur={() => {
                if (localValue !== item.name) {
                  onChange({ ...item, name: localValue });
                }
                setEditingField(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (localValue !== item.name) {
                    onChange({ ...item, name: localValue });
                  }
                  setEditingField(null);
                } else if (e.key === 'Escape') {
                  setEditingField(null);
                }
              }}
              className={`w-full px-1.5 py-0.5 text-xs font-medium rounded border outline-none ${inputBgClass} ${inputBorderClass} ${textClass} focus:ring-1 focus:ring-indigo-500`}
              autoFocus
            />
          ) : (
            <span
              className={`text-xs font-medium cursor-pointer px-1 py-0.5 rounded transition-colors ${textClass} hover:${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}
              onClick={() => setEditingField('name')}
            >
              {item.name || 'param_name'}
            </span>
          )}
        </div>

        {!hideIn && (
          <div className="flex-shrink-0">
            {editingField === 'in' ? (
              <select
                value={item.in}
                onChange={(e) => {
                  onChange({ ...item, in: e.target.value as ParameterIn });
                  setEditingField(null);
                }}
                className={`text-[10px] px-1.5 py-0.5 rounded border outline-none ${inputBgClass} ${inputBorderClass} ${textClass}`}
                autoFocus
              >
                {PARAMETER_IN_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            ) : (
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded cursor-pointer transition-opacity ${isDark ? currentInOption.color : currentInOption.color.replace('/20', '/30')} hover:opacity-80`}
                onClick={() => setEditingField('in')}
              >
                {item.in}
              </span>
            )}
          </div>
        )}

        <div className="flex-1 min-w-0">
          {editingField === 'value' ? (
            <ExpressionInput
              value={item.value}
              onChange={(val) => onChange({ ...item, value: val })}
              onBlur={() => setEditingField(null)}
              isDark={isDark}
              variant="compact"
              suggestions={expressionSuggestions}
            />
          ) : (
            <span
              className={`text-xs font-mono cursor-pointer px-1.5 py-0.5 rounded transition-colors block truncate ${item.value.startsWith('$') ? (isDark ? 'text-cyan-400' : 'text-cyan-600') : mutedClass} hover:${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}
              onClick={() => setEditingField('value')}
            >
              {item.value || 'Click to set value'}
            </span>
          )}
        </div>

        {onDelete && (
          <button
            onClick={onDelete}
            className={`flex-shrink-0 p-1 rounded transition-all ${isHovered ? 'opacity-100' : 'opacity-0'} ${isDark ? 'text-red-400 hover:bg-red-500/20' : 'text-red-500 hover:bg-red-50'}`}
          >
            <DeleteIcon />
          </button>
        )}

        {renderMovementControls()}
      </div>
    );
  }

  if (props.type === 'output') {
    const { item, onChange } = props;

    return (
      <div
        className={`group relative flex items-start gap-2 p-2 rounded-lg border-l-2 ${borderColor} ${bgClass} border ${borderClass} transition-all hover:shadow-sm`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="flex items-center gap-1.5 min-w-[80px]">
          {editingField === 'key' ? (
            <input
              ref={nameInputRef}
              type="text"
              value={localValue}
              onChange={(e) => setLocalValue(e.target.value)}
              onBlur={() => {
                if (localValue !== item.key) {
                  onChange({ ...item, key: localValue });
                }
                setEditingField(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (localValue !== item.key) {
                    onChange({ ...item, key: localValue });
                  }
                  setEditingField(null);
                } else if (e.key === 'Escape') {
                  setEditingField(null);
                }
              }}
              className={`w-full px-1.5 py-0.5 text-xs font-medium rounded border outline-none ${inputBgClass} ${inputBorderClass} ${textClass} focus:ring-1 focus:ring-indigo-500`}
              autoFocus
            />
          ) : (
            <span
              className={`text-xs font-medium cursor-pointer px-1 py-0.5 rounded transition-colors ${textClass} hover:${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}
              onClick={() => setEditingField('key')}
            >
              {item.key || 'output_name'}
            </span>
          )}
        </div>

        <span className={mutedClass}>→</span>

        <div className="flex-1 min-w-0">
          {editingField === 'value' ? (
            <ExpressionInput
              value={item.value}
              onChange={(val) => onChange({ ...item, value: val })}
              onBlur={() => setEditingField(null)}
              isDark={isDark}
              variant="compact"
              suggestions={expressionSuggestions}
            />
          ) : (
            <span
              className={`text-xs font-mono cursor-pointer px-1.5 py-0.5 rounded transition-colors block truncate ${item.value.startsWith('$') ? (isDark ? 'text-amber-400' : 'text-amber-600') : mutedClass} hover:${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}
              onClick={() => setEditingField('value')}
            >
              {item.value || 'Click to set expression'}
            </span>
          )}
        </div>

        {onDelete && (
          <button
            onClick={onDelete}
            className={`flex-shrink-0 p-1 rounded transition-all ${isHovered ? 'opacity-100' : 'opacity-0'} ${isDark ? 'text-red-400 hover:bg-red-500/20' : 'text-red-500 hover:bg-red-50'}`}
          >
            <DeleteIcon />
          </button>
        )}

        {renderMovementControls()}
      </div>
    );
  }

  return null;
}

export { EditableListItem };
