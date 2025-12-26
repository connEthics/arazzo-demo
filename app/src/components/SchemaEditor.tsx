'use client';

import { useState, useEffect } from 'react';
import { Badge } from './primitives';

interface SchemaEditorProps {
  name: string;
  schema: any;
  required?: boolean;
  isDark: boolean;
  onChange: (name: string, schema: any, required: boolean) => void;
  onDelete?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

const TYPE_OPTIONS = ['string', 'number', 'integer', 'boolean', 'array', 'object'];

export default function SchemaEditor({
  name,
  schema,
  required = false,
  isDark,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown
}: SchemaEditorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localName, setLocalName] = useState(name);
  
  // Sync local name if prop changes externally (but not while editing ideally)
  useEffect(() => {
    setLocalName(name);
  }, [name]);
  
  const textClass = isDark ? 'text-white' : 'text-gray-900';
  const mutedClass = isDark ? 'text-slate-400' : 'text-gray-500';
  const borderClass = isDark ? 'border-slate-700' : 'border-gray-200';
  const bgClass = isDark ? 'bg-slate-800' : 'bg-white';
  const inputBgClass = isDark ? 'bg-slate-900' : 'bg-gray-50';
  const inputBorderClass = isDark ? 'border-slate-600' : 'border-gray-300';

  const handleChange = (field: string, value: any) => {
    const newSchema = { ...schema, [field]: value };
    if (value === '' || value === undefined) {
      delete newSchema[field];
    }
    onChange(name, newSchema, required);
  };

  const handleEnumChange = (value: string) => {
    const enumArray = value.split(',').map(s => s.trim()).filter(s => s);
    handleChange('enum', enumArray.length > 0 ? enumArray : undefined);
  };

  return (
    <div className={`rounded-lg border ${borderClass} ${bgClass} mb-3 transition-all shadow-sm`}>
      {/* Header / Summary Line */}
      <div className="p-3 flex items-start gap-3">
        {/* Drag/Move Handles */}
        <div className="flex flex-col gap-1 pt-1.5">
          {onMoveUp && (
            <button onClick={onMoveUp} className={`text-slate-400 hover:text-slate-600 dark:hover:text-slate-200`}>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
            </button>
          )}
          {onMoveDown && (
            <button onClick={onMoveDown} className={`text-slate-400 hover:text-slate-600 dark:hover:text-slate-200`}>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 space-y-3">
          {/* Top Row: Name, Type, Required */}
          <div className="flex items-start gap-3 flex-wrap">
            <div className="flex-1 min-w-[120px]">
              <label className={`block text-[10px] uppercase font-bold mb-1 ${mutedClass}`}>Name</label>
              <input
                type="text"
                value={localName}
                onChange={(e) => setLocalName(e.target.value)}
                onBlur={() => {
                  if (localName !== name) {
                    onChange(localName, schema, required);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.currentTarget.blur();
                  }
                }}
                className={`w-full px-2 py-1.5 text-sm rounded border ${inputBgClass} ${inputBorderClass} ${textClass} focus:ring-1 focus:ring-indigo-500 outline-none`}
                placeholder="property_name"
              />
            </div>
            
            <div className="w-32">
              <label className={`block text-[10px] uppercase font-bold mb-1 ${mutedClass}`}>Type</label>
              <select
                value={schema.type || 'string'}
                onChange={(e) => handleChange('type', e.target.value)}
                className={`w-full px-2 py-1.5 text-sm rounded border ${inputBgClass} ${inputBorderClass} ${textClass} focus:ring-1 focus:ring-indigo-500 outline-none`}
              >
                {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div className="pt-6">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={required}
                  onChange={(e) => onChange(name, schema, e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className={`text-sm font-medium ${textClass}`}>Required</span>
              </label>
            </div>
          </div>

          {/* Description - Always visible or collapsible? Let's make it always visible for WYSIWYG feel */}
          <div>
            <input
              type="text"
              value={schema.description || ''}
              onChange={(e) => handleChange('description', e.target.value)}
              className={`w-full px-2 py-1.5 text-xs rounded border ${inputBgClass} ${inputBorderClass} ${textClass} placeholder-opacity-50 focus:ring-1 focus:ring-indigo-500 outline-none`}
              placeholder="Description..."
            />
          </div>

          {/* Advanced Details Toggle */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`flex items-center gap-1 text-xs font-medium ${isDark ? 'text-indigo-400' : 'text-indigo-600'} hover:underline`}
          >
            {isExpanded ? 'Hide Details' : 'Show Details (Default, Enum, Validation)'}
            <svg className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Expanded Details */}
          {isExpanded && (
            <div className={`grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t ${borderClass}`}>
              
              {/* Default Value */}
              <div>
                <label className={`block text-[10px] uppercase font-bold mb-1 ${mutedClass}`}>Default Value</label>
                <input
                  type="text"
                  value={schema.default !== undefined ? String(schema.default) : ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    // Try to parse numbers/booleans if type matches
                    let parsed: any = val;
                    if (schema.type === 'number' || schema.type === 'integer') parsed = Number(val);
                    if (schema.type === 'boolean') parsed = val === 'true';
                    if (val === '') parsed = undefined;
                    handleChange('default', parsed);
                  }}
                  className={`w-full px-2 py-1.5 text-xs rounded border ${inputBgClass} ${inputBorderClass} ${textClass} focus:ring-1 focus:ring-indigo-500 outline-none`}
                  placeholder="Default value"
                />
              </div>

              {/* Example */}
              <div>
                <label className={`block text-[10px] uppercase font-bold mb-1 ${mutedClass}`}>Example</label>
                <input
                  type="text"
                  value={schema.example !== undefined ? String(schema.example) : ''}
                  onChange={(e) => handleChange('example', e.target.value)}
                  className={`w-full px-2 py-1.5 text-xs rounded border ${inputBgClass} ${inputBorderClass} ${textClass} focus:ring-1 focus:ring-indigo-500 outline-none`}
                  placeholder="Example value"
                />
              </div>

              {/* Enum */}
              <div className="col-span-full">
                <label className={`block text-[10px] uppercase font-bold mb-1 ${mutedClass}`}>Enum Values (comma separated)</label>
                <input
                  type="text"
                  value={schema.enum ? schema.enum.join(', ') : ''}
                  onChange={(e) => handleEnumChange(e.target.value)}
                  className={`w-full px-2 py-1.5 text-xs rounded border ${inputBgClass} ${inputBorderClass} ${textClass} focus:ring-1 focus:ring-indigo-500 outline-none`}
                  placeholder="available, pending, sold"
                />
              </div>

              {/* Validation: Min/Max (Number) */}
              {(schema.type === 'number' || schema.type === 'integer') && (
                <>
                  <div>
                    <label className={`block text-[10px] uppercase font-bold mb-1 ${mutedClass}`}>Minimum</label>
                    <input
                      type="number"
                      value={schema.minimum ?? ''}
                      onChange={(e) => handleChange('minimum', e.target.value ? Number(e.target.value) : undefined)}
                      className={`w-full px-2 py-1.5 text-xs rounded border ${inputBgClass} ${inputBorderClass} ${textClass} focus:ring-1 focus:ring-indigo-500 outline-none`}
                    />
                  </div>
                  <div>
                    <label className={`block text-[10px] uppercase font-bold mb-1 ${mutedClass}`}>Maximum</label>
                    <input
                      type="number"
                      value={schema.maximum ?? ''}
                      onChange={(e) => handleChange('maximum', e.target.value ? Number(e.target.value) : undefined)}
                      className={`w-full px-2 py-1.5 text-xs rounded border ${inputBgClass} ${inputBorderClass} ${textClass} focus:ring-1 focus:ring-indigo-500 outline-none`}
                    />
                  </div>
                </>
              )}

              {/* Validation: Min/Max Length (String) */}
              {schema.type === 'string' && (
                <>
                  <div>
                    <label className={`block text-[10px] uppercase font-bold mb-1 ${mutedClass}`}>Min Length</label>
                    <input
                      type="number"
                      value={schema.minLength ?? ''}
                      onChange={(e) => handleChange('minLength', e.target.value ? Number(e.target.value) : undefined)}
                      className={`w-full px-2 py-1.5 text-xs rounded border ${inputBgClass} ${inputBorderClass} ${textClass} focus:ring-1 focus:ring-indigo-500 outline-none`}
                    />
                  </div>
                  <div>
                    <label className={`block text-[10px] uppercase font-bold mb-1 ${mutedClass}`}>Max Length</label>
                    <input
                      type="number"
                      value={schema.maxLength ?? ''}
                      onChange={(e) => handleChange('maxLength', e.target.value ? Number(e.target.value) : undefined)}
                      className={`w-full px-2 py-1.5 text-xs rounded border ${inputBgClass} ${inputBorderClass} ${textClass} focus:ring-1 focus:ring-indigo-500 outline-none`}
                    />
                  </div>
                  <div className="col-span-full">
                    <label className={`block text-[10px] uppercase font-bold mb-1 ${mutedClass}`}>Pattern (Regex)</label>
                    <input
                      type="text"
                      value={schema.pattern ?? ''}
                      onChange={(e) => handleChange('pattern', e.target.value)}
                      className={`w-full px-2 py-1.5 text-xs rounded border ${inputBgClass} ${inputBorderClass} ${textClass} font-mono focus:ring-1 focus:ring-indigo-500 outline-none`}
                      placeholder="^[a-z]+$"
                    />
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Delete Button */}
        {onDelete && (
          <button
            onClick={onDelete}
            className={`p-1.5 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors`}
            title="Delete Property"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
