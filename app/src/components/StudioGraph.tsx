'use client';

import '@connethics/arazzo-flow/style.css';
import { useMemo } from 'react';
import { ArazzoGraphFromDocument, createOpenApiResolver } from '@connethics/arazzo-flow';
import type { Diagnostic, GraphNode } from '@connethics/arazzo-core';

/**
 * Studio wrapper around <ArazzoGraphFromDocument> (@connethics/arazzo-flow, vendored): ConnEthics
 * light / dark palette from `isDark`, HTTP method badges resolved from the loaded OpenAPI sources,
 * core diagnostics shown on the nodes. Client-only: import it with `next/dynamic` and `ssr: false`.
 */

export type StudioGraphSelection =
  | { kind: 'step'; stepId: string }
  | { kind: 'input' }
  | { kind: 'output' }
  | null;

export interface StudioGraphProps {
  /** Parsed Arazzo document (builder state or `parseArazzo(text).doc`). */
  doc: unknown;
  workflowId: string;
  isDark?: boolean;
  /** Parsed OpenAPI / AsyncAPI documents keyed by source name (method badges). */
  sources?: Record<string, unknown>;
  diagnostics?: Diagnostic[];
  selectedStepId?: string | null;
  onSelect?: (selection: StudioGraphSelection) => void;
  showFailureEdges?: boolean;
  layout?: 'TB' | 'LR';
  lanes?: 'off' | 'clusters' | 'lanes';
  showList?: boolean;
  className?: string;
  fallback?: React.ReactNode;
}

function toSelection(id: string | null, node: GraphNode | null): StudioGraphSelection {
  if (!id || !node) return null;
  if (node.kind === 'input') return { kind: 'input' };
  if (node.kind === 'output' || node.kind === 'end-success') return { kind: 'output' };
  if (node.step) return { kind: 'step', stepId: node.step.stepId };
  return null;
}

export default function StudioGraph({
  doc,
  workflowId,
  isDark = false,
  sources,
  diagnostics,
  selectedStepId,
  onSelect,
  showFailureEdges = true,
  layout = 'TB',
  lanes = 'off',
  showList,
  className,
  fallback,
}: StudioGraphProps) {
  const resolveOperation = useMemo(
    () => (sources && Object.keys(sources).length > 0 ? createOpenApiResolver(sources) : undefined),
    [sources],
  );

  return (
    <ArazzoGraphFromDocument
      doc={doc}
      workflowId={workflowId}
      resolveOperation={resolveOperation}
      diagnostics={diagnostics}
      theme={isDark ? 'connethics-dark' : 'connethics-light'}
      lang="en"
      layout={layout}
      lanes={lanes}
      showList={showList}
      showFailureEdges={showFailureEdges}
      selectedStepId={selectedStepId ?? null}
      onSelectStep={onSelect ? (id, node) => onSelect(toSelection(id, node)) : undefined}
      className={className}
      fallback={
        fallback ?? (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">Workflow “{workflowId}” not found</div>
        )
      }
    />
  );
}
