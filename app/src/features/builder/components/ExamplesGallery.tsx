'use client';

import { useEffect } from 'react';
import { EXAMPLES, type ExampleEntry } from '../data/examples';

interface ExamplesGalleryProps {
  open: boolean;
  onClose: () => void;
  onLoad: (example: ExampleEntry) => void;
  loadingId?: string | null;
  error?: string | null;
}

const CATEGORY_STYLE: Record<ExampleEntry['category'], string> = {
  MCP: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  E2E: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  Classic: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
};

/** Modal listing the Arazzo 1.1 examples of app/public/workflows; loads one with its sources. */
export default function ExamplesGallery({ open, onClose, onLoad, loadingId, error }: ExamplesGalleryProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="examples-title">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-4xl max-h-[85vh] flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl">
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 id="examples-title" className="text-lg font-semibold text-slate-900 dark:text-white">Arazzo 1.1 examples</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Concrete, validated documents with their OpenAPI 3.1 / AsyncAPI 3.0 stubs. Loading one replaces the current spec.
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Close">
            ✕
          </button>
        </div>
        {error && <div className="mx-6 mt-3 px-3 py-2 rounded bg-red-50 dark:bg-red-900/30 text-xs text-red-700 dark:text-red-300">{error}</div>}
        <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-3">
          {EXAMPLES.map((ex) => (
            <div
              key={ex.id}
              className="flex flex-col rounded-xl border border-slate-200 dark:border-slate-700 p-4 hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
              data-testid={`example-${ex.id}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${CATEGORY_STYLE[ex.category]}`}>{ex.category}</span>
                <h3 className="font-semibold text-sm text-slate-900 dark:text-white">{ex.title}</h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 flex-1">{ex.summary}</p>
              <div className="flex flex-wrap gap-1 mt-2">
                {ex.features.map((f) => (
                  <span key={f} className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-[10px] font-mono text-blue-700 dark:text-blue-300">
                    {f}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => onLoad(ex)}
                  disabled={!!loadingId}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold disabled:opacity-50"
                >
                  {loadingId === ex.id ? 'Loading…' : 'Open in builder'}
                </button>
                <a href={ex.path} target="_blank" rel="noopener noreferrer" className="text-xs text-slate-500 hover:text-blue-600">
                  YAML
                </a>
                {ex.readme && (
                  <a href={ex.readme} target="_blank" rel="noopener noreferrer" className="text-xs text-slate-500 hover:text-blue-600">
                    README
                  </a>
                )}
                <code className="ml-auto text-[10px] text-slate-400">?example={ex.id}</code>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
