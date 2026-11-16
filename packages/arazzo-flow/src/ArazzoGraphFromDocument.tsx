/**
 * <ArazzoGraphFromDocument doc workflowId /> — convenience wrapper: runs `workflowToGraph`
 * (and, unless disabled, builds the graphs of the local workflows it references so they can be
 * expanded inline), then renders <ArazzoGraph>.
 */
import { forwardRef, useMemo } from 'react';
import { workflowToGraph, type GraphOptions, type WorkflowGraph } from '@connethics/arazzo-core';
import { ArazzoGraph, type ArazzoGraphApi, type ArazzoGraphProps } from './ArazzoGraph';

export interface ArazzoGraphFromDocumentProps extends Omit<ArazzoGraphProps, 'graph' | 'subgraphs'> {
  /** Parsed Arazzo document (`parseArazzo(text).doc`). */
  doc: unknown;
  workflowId: string;
  /** HTTP method / path of a step from the loaded OpenAPI (see `createOpenApiResolver`). */
  resolveOperation?: GraphOptions['resolveOperation'];
  /** Draw implicit failures (hidden by default in the toolbar; this only builds them). Default true. */
  includeImplicitFailures?: boolean;
  /** Expand local sub-workflows (workflow steps, retry/goto via a workflow) as groups. Default true. */
  expandSubworkflows?: boolean;
  /** Rendered when the workflow does not exist. */
  fallback?: React.ReactNode;
}

function localRefs(g: WorkflowGraph): string[] {
  return g.nodes.filter((n) => n.kind === 'workflow-ref' && n.ref && !n.ref.external && n.ref.resolved && !n.ref.stepId).map((n) => n.ref!.workflowId);
}

export const ArazzoGraphFromDocument = forwardRef<ArazzoGraphApi, ArazzoGraphFromDocumentProps>(function ArazzoGraphFromDocument(
  { doc, workflowId, resolveOperation, includeImplicitFailures = true, expandSubworkflows = true, fallback = null, ...rest },
  ref,
) {
  const built = useMemo(() => {
    const opts: GraphOptions = { includeImplicitFailures };
    if (resolveOperation) opts.resolveOperation = resolveOperation;
    try {
      const graph = workflowToGraph(doc, workflowId, opts);
      const subgraphs: Record<string, WorkflowGraph> = {};
      if (expandSubworkflows) {
        for (const wf of localRefs(graph)) {
          if (wf !== workflowId && !subgraphs[wf]) {
            try {
              subgraphs[wf] = workflowToGraph(doc, wf, opts);
            } catch {
              /* unresolved: kept as a reference */
            }
          }
        }
      }
      return { graph, subgraphs };
    } catch {
      return null;
    }
  }, [doc, workflowId, resolveOperation, includeImplicitFailures, expandSubworkflows]);
  if (!built) return <>{fallback}</>;
  return <ArazzoGraph ref={ref} {...rest} graph={built.graph} subgraphs={built.subgraphs} />;
});
