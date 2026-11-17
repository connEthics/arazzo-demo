'use client';

import { memo, useMemo, useState } from 'react';
import { useBuilder } from '../context/BuilderContext';
import { countBySeverity, diagnosticTarget, formatPath, type Diagnostic, type Severity } from '@/lib/arazzo-parser';

/**
 * Problems panel: diagnostics of @connethics/arazzo-core (official JSON Schema 1.0 / 1.1 +
 * semantic rules) for the spec being edited. Clicking a diagnostic selects the workflow and the
 * step it points at (when its JSON path targets a step) and highlights the path in the YAML view.
 */

const SEVERITY_STYLE: Record<Severity, { label: string; icon: string; text: string; dot: string }> = {
  error: { label: 'errors', icon: '✕', text: 'text-red-600 dark:text-red-400', dot: 'bg-red-500' },
  warning: { label: 'warnings', icon: '!', text: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500' },
  info: { label: 'info', icon: 'i', text: 'text-blue-600 dark:text-blue-400', dot: 'bg-blue-500' },
  hint: { label: 'hints', icon: '·', text: 'text-slate-500', dot: 'bg-slate-400' },
};

interface DiagnosticsPanelProps {
  /** Called when a diagnostic targets a step (selects it in the current view). */
  onRevealStep?: (workflowIndex: number, stepId: string) => void;
}

function DiagnosticsPanel({ onRevealStep }: DiagnosticsPanelProps) {
  const { state, dispatch, diagnostics } = useBuilder();
  const [hidden, setHidden] = useState<Set<Severity>>(() => new Set<Severity>(['hint']));
  const counts = useMemo(() => countBySeverity(diagnostics), [diagnostics]);
  const visible = useMemo(() => diagnostics.filter((d) => !hidden.has(d.severity)), [diagnostics, hidden]);

  const toggle = (sev: Severity) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(sev)) next.delete(sev);
      else next.add(sev);
      return next;
    });

  const reveal = (d: Diagnostic) => {
    const target = diagnosticTarget(state.spec, d.path);
    if (target) {
      if (target.workflowIndex !== state.selectedWorkflowIndex) {
        dispatch({ type: 'SET_WORKFLOW_INDEX', payload: target.workflowIndex });
      }
      if (target.stepId) {
        dispatch({ type: 'SELECT_NODE', payload: { nodeType: 'step', id: target.stepId } });
        onRevealStep?.(target.workflowIndex, target.stepId);
      }
    }
    if (d.path.length > 0) dispatch({ type: 'REVEAL_PATH', payload: d.path });
  };

  return (
    <div className="flex flex-col h-full" data-testid="diagnostics-panel">
      <div className="flex flex-wrap items-center gap-1 px-3 py-2 border-b border-slate-200 dark:border-slate-800">
        {(['error', 'warning', 'info', 'hint'] as Severity[]).map((sev) => (
          <button
            key={sev}
            type="button"
            onClick={() => toggle(sev)}
            aria-pressed={!hidden.has(sev)}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[10px] font-medium whitespace-nowrap transition-colors ${
              hidden.has(sev)
                ? 'border-slate-200 dark:border-slate-700 text-slate-400 opacity-60'
                : `border-slate-300 dark:border-slate-600 ${SEVERITY_STYLE[sev].text}`
            }`}
            title={`${hidden.has(sev) ? 'Show' : 'Hide'} ${SEVERITY_STYLE[sev].label.toLowerCase()}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${SEVERITY_STYLE[sev].dot}`} />
            {counts[sev]} {SEVERITY_STYLE[sev].label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {visible.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500">
            {diagnostics.length === 0 ? (
              <>
                <div className="text-emerald-500 text-lg mb-1">✓</div>
                No problem found — valid Arazzo {state.spec.arazzo}.
              </>
            ) : (
              'All diagnostics are filtered out.'
            )}
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {visible.map((d, i) => {
              const target = diagnosticTarget(state.spec, d.path);
              return (
                <li key={`${d.code}-${i}`}>
                  <button
                    type="button"
                    onClick={() => reveal(d)}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                    title={target?.stepId ? `Select step ${target.stepId}` : 'Highlight in YAML'}
                  >
                    <div className="flex items-start gap-2">
                      <span className={`mt-0.5 text-[10px] font-bold w-3 text-center ${SEVERITY_STYLE[d.severity].text}`}>
                        {SEVERITY_STYLE[d.severity].icon}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-slate-800 dark:text-slate-200 leading-snug">{d.message}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-slate-500">
                          <code className="font-mono">{d.code}</code>
                          {d.path.length > 0 && <code className="font-mono truncate max-w-full">{formatPath(d.path)}</code>}
                          {target?.stepId && (
                            <span className="px-1.5 rounded bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 font-mono">
                              {target.stepId}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <div className="px-3 py-1.5 border-t border-slate-200 dark:border-slate-800 text-[10px] text-slate-400">
        @connethics/arazzo-core · JSON Schema {state.spec.arazzo?.startsWith('1.0') ? '1.0' : '1.1'} + semantic rules
      </div>
    </div>
  );
}

export default memo(DiagnosticsPanel);
