'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { EXAMPLES, loadArazzoWithSources, type LoadedExample } from '@/features/builder/data/examples';
import { validateSpec, type Diagnostic } from '@/lib/arazzo-parser';

const StudioGraph = dynamic(() => import('./StudioGraph'), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-sm text-slate-400">Loading graph…</div>,
});

interface ArazzoGraphShowcaseProps {
  isDark: boolean;
  /** Example loaded first (gallery id). */
  initialExample?: string;
}

/** Showcase of the shared <ArazzoGraph> (@connethics/arazzo-flow) on the Arazzo 1.1 examples. */
export default function ArazzoGraphShowcase({ isDark, initialExample = 'e2e-order-to-cash' }: ArazzoGraphShowcaseProps) {
  const [exampleId, setExampleId] = useState(initialExample);
  const [loaded, setLoaded] = useState<(LoadedExample & { id: string; diagnostics: Diagnostic[] }) | null>(null);
  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const [lanes, setLanes] = useState<'off' | 'lanes'>('off');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const example = EXAMPLES.find((e) => e.id === exampleId);
    if (!example) return;
    loadArazzoWithSources(example.path)
      .then((result) => {
        if (cancelled) return;
        setLoaded({ ...result, id: example.id, diagnostics: validateSpec(result.spec) });
        setWorkflowId(result.spec.workflows[0]?.workflowId ?? null);
        setError(null);
      })
      .catch((e: unknown) => !cancelled && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      cancelled = true;
    };
  }, [exampleId]);

  const selectClass = `px-2 py-1 rounded border text-sm ${isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-gray-200 text-gray-800'}`;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <select aria-label="Example" className={selectClass} value={exampleId} onChange={(e) => setExampleId(e.target.value)}>
          {EXAMPLES.map((e) => (
            <option key={e.id} value={e.id}>
              {e.title}
            </option>
          ))}
        </select>
        {loaded && loaded.spec.workflows.length > 1 && (
          <select aria-label="Workflow" className={selectClass} value={workflowId ?? ''} onChange={(e) => setWorkflowId(e.target.value)}>
            {loaded.spec.workflows.map((w) => (
              <option key={w.workflowId} value={w.workflowId}>
                {w.workflowId}
              </option>
            ))}
          </select>
        )}
        <label className={`flex items-center gap-1.5 text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
          <input type="checkbox" checked={lanes === 'lanes'} onChange={(e) => setLanes(e.target.checked ? 'lanes' : 'off')} />
          Lanes by source
        </label>
        {loaded && (
          <span className={`ml-auto text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            {loaded.diagnostics.filter((d) => d.severity === 'error').length} error(s) ·{' '}
            {loaded.diagnostics.filter((d) => d.severity === 'warning').length} warning(s)
          </span>
        )}
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div
        className="h-[640px] rounded-lg overflow-hidden border"
        style={{ borderColor: isDark ? '#334155' : '#e5e7eb' }}
        data-testid="graph-showcase"
      >
        {loaded && workflowId && (
          <StudioGraph
            key={`${loaded.id}/${workflowId}`}
            doc={loaded.spec}
            workflowId={workflowId}
            isDark={isDark}
            sources={loaded.sources}
            diagnostics={loaded.diagnostics}
            lanes={lanes}
          />
        )}
      </div>
    </div>
  );
}
