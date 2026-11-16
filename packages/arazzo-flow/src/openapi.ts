/**
 * `resolveOperation` for `workflowToGraph`: HTTP method + path of an `operationId`, read from the
 * OpenAPI documents the host has loaded (UI-SPEC §4.2: badge from the resolved OpenAPI, never guessed).
 */
import type { OperationInfo, SourceDescription, Step } from '@connethics/arazzo-core';

const METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace', 'query'];

type Doc = { paths?: Record<string, unknown>; webhooks?: Record<string, unknown> };

function index(doc: Doc): Map<string, OperationInfo> {
  const out = new Map<string, OperationInfo>();
  for (const [section, entries] of [['paths', doc.paths], ['webhooks', doc.webhooks]] as const) {
    if (!entries || typeof entries !== 'object') continue;
    for (const [p, item] of Object.entries(entries)) {
      if (!item || typeof item !== 'object') continue;
      for (const m of METHODS) {
        const op = (item as Record<string, unknown>)[m] as { operationId?: unknown } | undefined;
        if (op && typeof op.operationId === 'string' && !out.has(op.operationId)) {
          out.set(op.operationId, section === 'paths' ? { method: m.toUpperCase(), path: p } : { method: m.toUpperCase(), path: `webhook ${p}` });
        }
      }
    }
  }
  return out;
}

/**
 * @param sources OpenAPI documents (parsed JSON/YAML) keyed by `sourceDescriptions[].name`.
 */
export function createOpenApiResolver(sources: Record<string, unknown>) {
  const indexes = new Map(Object.entries(sources).map(([name, d]) => [name, index((d ?? {}) as Doc)]));
  return (step: Step, source: SourceDescription | undefined): OperationInfo | undefined => {
    const raw = typeof step.operationId === 'string' ? step.operationId : undefined;
    if (!raw) return undefined;
    const m = /^\$sourceDescriptions\.([^.]+)\.(.+)$/.exec(raw);
    const name = m ? m[1]! : source?.name;
    const id = m ? m[2]! : raw;
    if (name && indexes.has(name)) return indexes.get(name)!.get(id);
    for (const idx of indexes.values()) {
      const hit = idx.get(id);
      if (hit) return hit;
    }
    return undefined;
  };
}
