'use client';

import { useState } from 'react';
import type { OutputValue, Selector, ExpressionTypeName } from '@/types/arazzo';
import { isSelector } from '@/types/arazzo';
import type { ExpressionSuggestion } from '../ExpressionInput';
import { EditableField } from '../primitives';

/**
 * OutputsEditor — edits a map of outputs (step or workflow). Each value is either a runtime
 * expression (`$response.body#/id`) or, in Arazzo 1.1, a Selector Object
 * `{ context, selector, type }` (JSONPath RFC 9535, JSON Pointer RFC 6901 or XPath 3.1).
 */

const SELECTOR_TYPES: { value: ExpressionTypeName; label: string; placeholder: string }[] = [
  { value: 'jsonpath', label: 'JSONPath (RFC 9535)', placeholder: '$.items[0].id' },
  { value: 'jsonpointer', label: 'JSON Pointer (RFC 6901)', placeholder: '/items/0/id' },
  { value: 'xpath', label: 'XPath 3.1', placeholder: '/order/id' },
];

interface OutputsEditorProps {
  outputs: Record<string, OutputValue>;
  onChange: (outputs: Record<string, OutputValue>) => void;
  isDark?: boolean;
  expressionSuggestions?: ExpressionSuggestion[];
  /** Name given to a new output */
  newName?: (existing: string[]) => string;
  onReorder?: (startIndex: number, endIndex: number) => void;
  /** Default context of a new Selector (`$response.body`, `$message.payload`…) */
  defaultContext?: string;
}

function selectorTypeName(sel: Selector): ExpressionTypeName {
  return typeof sel.type === 'string' ? sel.type : sel.type.type;
}

function renameKey(outputs: Record<string, OutputValue>, from: string, to: string): Record<string, OutputValue> {
  const out: Record<string, OutputValue> = {};
  for (const [k, v] of Object.entries(outputs)) out[k === from ? to : k] = v;
  return out;
}

export default function OutputsEditor({
  outputs,
  onChange,
  isDark = false,
  expressionSuggestions = [],
  newName = (existing) => `output_${existing.length + 1}`,
  onReorder,
  defaultContext = '$response.body',
}: OutputsEditorProps) {
  const entries = Object.entries(outputs);
  const inputClass = `w-full px-2 py-1 rounded border text-xs font-mono outline-none focus:ring-2 focus:ring-indigo-500/30 ${
    isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-gray-200 text-gray-800'
  }`;
  const labelClass = `text-[10px] uppercase font-semibold ${isDark ? 'text-slate-500' : 'text-gray-400'}`;

  const setValue = (key: string, value: OutputValue) => onChange({ ...outputs, [key]: value });

  return (
    <div className="space-y-2" data-testid="outputs-editor">
      {entries.length === 0 && (
        <p className={`text-xs italic ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>No outputs defined.</p>
      )}
      {entries.map(([key, value], index) => (
        <OutputRow
          key={`${index}-${key}`}
          name={key}
          value={value}
          isDark={isDark}
          inputClass={inputClass}
          labelClass={labelClass}
          expressionSuggestions={expressionSuggestions}
          defaultContext={defaultContext}
          onRename={(to) => {
            if (!to || to === key || to in outputs) return;
            onChange(renameKey(outputs, key, to));
          }}
          onValue={(v) => setValue(key, v)}
          onDelete={() => {
            const next = { ...outputs };
            delete next[key];
            onChange(next);
          }}
          onMoveUp={onReorder && index > 0 ? () => onReorder(index, index - 1) : undefined}
          onMoveDown={onReorder && index < entries.length - 1 ? () => onReorder(index, index + 1) : undefined}
        />
      ))}
      <button
        type="button"
        onClick={() => onChange({ ...outputs, [newName(Object.keys(outputs))]: '' })}
        className={`w-full py-1.5 rounded-lg border-2 border-dashed text-xs font-medium transition-colors ${
          isDark
            ? 'border-slate-700 text-slate-400 hover:border-slate-600 hover:bg-slate-800'
            : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
        }`}
      >
        + Add output
      </button>
    </div>
  );
}

function OutputRow({
  name,
  value,
  isDark,
  inputClass,
  labelClass,
  expressionSuggestions,
  defaultContext,
  onRename,
  onValue,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  name: string;
  value: OutputValue;
  isDark: boolean;
  inputClass: string;
  labelClass: string;
  expressionSuggestions: ExpressionSuggestion[];
  defaultContext: string;
  onRename: (to: string) => void;
  onValue: (value: OutputValue) => void;
  onDelete: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}) {
  const [draftName, setDraftName] = useState(name);
  const selector = isSelector(value) ? value : null;
  const mode: 'expression' | 'selector' = selector ? 'selector' : 'expression';
  const toggleBtn = (active: boolean) =>
    `px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition-colors ${
      active
        ? 'bg-indigo-600 text-white'
        : isDark
          ? 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          : 'bg-white text-gray-500 hover:bg-gray-100'
    }`;

  return (
    <div
      className={`p-2 rounded-lg border space-y-2 border-l-2 border-l-amber-400 ${
        isDark ? 'bg-slate-900/60 border-slate-700' : 'bg-white border-gray-200'
      }`}
      data-testid={`output-row-${name}`}
    >
      <div className="flex items-center gap-2">
        <input
          aria-label="Output name"
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          onBlur={() => (draftName.trim() ? onRename(draftName.trim()) : setDraftName(name))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          }}
          className={`${inputClass} flex-1 font-semibold`}
        />
        <div className={`flex rounded overflow-hidden border ${isDark ? 'border-slate-700' : 'border-gray-200'}`} role="group" aria-label="Output kind">
          <button
            type="button"
            aria-pressed={mode === 'expression'}
            className={toggleBtn(mode === 'expression')}
            onClick={() => selector && onValue(selector.context)}
            title="Runtime expression"
          >
            Expr
          </button>
          <button
            type="button"
            aria-pressed={mode === 'selector'}
            className={toggleBtn(mode === 'selector')}
            onClick={() =>
              !selector &&
              onValue({
                context: typeof value === 'string' && value.startsWith('$') && !value.includes('#') ? value : defaultContext,
                selector: '',
                type: 'jsonpath',
              })
            }
            title="Arazzo 1.1 Selector Object"
          >
            Selector
          </button>
        </div>
        {(onMoveUp || onMoveDown) && (
          <div className="flex flex-col">
            <button type="button" disabled={!onMoveUp} onClick={onMoveUp} className="text-[9px] leading-none disabled:opacity-30" aria-label="Move up">▲</button>
            <button type="button" disabled={!onMoveDown} onClick={onMoveDown} className="text-[9px] leading-none disabled:opacity-30" aria-label="Move down">▼</button>
          </div>
        )}
        <button type="button" onClick={onDelete} className="text-red-400 hover:text-red-500 p-1" aria-label={`Delete output ${name}`} title="Delete">
          ✕
        </button>
      </div>

      {selector ? (
        <div className="grid grid-cols-1 gap-1.5">
          <label className="space-y-0.5">
            <span className={labelClass}>context</span>
            <input
              className={inputClass}
              value={selector.context}
              placeholder="$response.body"
              onChange={(e) => onValue({ ...selector, context: e.target.value })}
            />
          </label>
          <label className="space-y-0.5">
            <span className={labelClass}>selector</span>
            <input
              className={inputClass}
              value={selector.selector}
              placeholder={SELECTOR_TYPES.find((t) => t.value === selectorTypeName(selector))?.placeholder}
              onChange={(e) => onValue({ ...selector, selector: e.target.value })}
            />
          </label>
          <label className="space-y-0.5">
            <span className={labelClass}>type</span>
            <select
              className={inputClass}
              value={selectorTypeName(selector)}
              onChange={(e) => onValue({ ...selector, type: e.target.value as ExpressionTypeName })}
            >
              {SELECTOR_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : (
        <EditableField
          value={typeof value === 'string' ? value : ''}
          onChange={(v) => onValue(v)}
          placeholder="$response.body#/id"
          type="expression"
          isDark={isDark}
          expressionSuggestions={expressionSuggestions}
          compact
          activationMode="click"
        />
      )}
    </div>
  );
}
