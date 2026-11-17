
import { splitOperationId } from '@/lib/arazzo-utils';

/* eslint-disable @typescript-eslint/no-explicit-any -- OpenAPI schemas are free-form JSON consumed by SchemaViewer */
type JsonSchemaLike = any;
/* eslint-enable @typescript-eslint/no-explicit-any */

export interface OASParameter {
  name: string;
  in: 'query' | 'querystring' | 'path' | 'header' | 'cookie';
  required?: boolean;
  description?: string;
  schema?: JsonSchemaLike;
  example?: unknown;
}

export interface OASRequestBody {
  description?: string;
  required?: boolean;
  content?: Record<string, { schema?: JsonSchemaLike; example?: unknown }>;
}

export interface OASResponse {
  statusCode: string;
  description?: string;
  content?: Record<string, { schema?: JsonSchemaLike; example?: unknown }>;
}

type RawParam = { name: string; in: OASParameter['in']; required?: boolean; description?: string; schema?: JsonSchemaLike; example?: unknown };
type RawOperation = {
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: RawParam[];
  requestBody?: OASRequestBody;
  responses?: Record<string, { description?: string; content?: OASResponse['content'] }>;
};
type RawPathItem = Record<string, unknown> & { parameters?: RawParam[] };

/** Type of a source document: OpenAPI (`openapi` / `swagger`) or, Arazzo 1.1, AsyncAPI. */
export function detectSourceType(content: unknown): 'openapi' | 'asyncapi' | null {
  if (!content || typeof content !== 'object') return null;
  const c = content as Record<string, unknown>;
  if (c.asyncapi) return 'asyncapi';
  if (c.openapi || c.swagger) return 'openapi';
  return null;
}

export interface OperationItem {
  sourceName: string;
  operationId: string;
  method: string;
  path: string;
  summary?: string;
  tags: string[];
  description?: string;
  parameters: OASParameter[];
  requestBody?: OASRequestBody;
  responses: OASResponse[];
}

export function extractOperations(sources: Record<string, unknown>): OperationItem[] {
  const operations: OperationItem[] = [];

  Object.entries(sources).forEach(([sourceName, doc]) => {
    const oas = (doc ?? {}) as { paths?: Record<string, RawPathItem> };
    if (!oas.paths) return;

    Object.entries(oas.paths).forEach(([path, pathItem]) => {
      // Collect path-level parameters
      const pathParams: OASParameter[] = (pathItem.parameters || []).map((p) => ({
        name: p.name,
        in: p.in,
        required: p.required,
        description: p.description,
        schema: p.schema,
        example: p.example
      }));

      ['get', 'post', 'put', 'delete', 'patch'].forEach(method => {
        if (pathItem[method]) {
          const op = pathItem[method] as RawOperation;
          
          // Merge path and operation parameters
          const opParams: OASParameter[] = (op.parameters || []).map((p) => ({
            name: p.name,
            in: p.in,
            required: p.required,
            description: p.description,
            schema: p.schema,
            example: p.example
          }));
          
          const allParams = [...pathParams, ...opParams];
          
          // Extract request body
          let requestBody: OASRequestBody | undefined;
          if (op.requestBody) {
            requestBody = {
              description: op.requestBody.description,
              required: op.requestBody.required,
              content: op.requestBody.content
            };
          }
          
          // Extract responses
          const responses: OASResponse[] = Object.entries(op.responses || {}).map(([code, resp]) => ({
            statusCode: code,
            description: resp.description,
            content: resp.content
          }));

          operations.push({
            sourceName,
            operationId: op.operationId || `${method}${path.replace(/\//g, '_')}`,
            method: method.toUpperCase(),
            path,
            summary: op.summary,
            description: op.description,
            tags: op.tags || ['Other'],
            parameters: allParams,
            requestBody,
            responses
          });
        }
      });
    });
  });

  return operations;
}

export function getOperationByStepId(sources: Record<string, unknown>, operationIdOrPath: string, sourceName?: string): OperationItem | undefined {
  const operations = extractOperations(sources);

  // "$sourceDescriptions.<source>.<operationId>" (1.1), "<source>.<operationId>" or "<operationId>"
  const ref = splitOperationId(operationIdOrPath);
  const searchSourceName = ref.sourceName ?? sourceName;
  const searchOperationId = ref.operationName ?? operationIdOrPath;
  
  return operations.find(op => 
    op.operationId === searchOperationId && (!searchSourceName || op.sourceName === searchSourceName)
  );
}

export function groupOperationsByTag(operations: OperationItem[]): Record<string, OperationItem[]> {
  const grouped: Record<string, OperationItem[]> = {};
  
  operations.forEach(op => {
    const tag = op.tags[0] || 'Other';
    if (!grouped[tag]) grouped[tag] = [];
    grouped[tag].push(op);
  });
  
  // Sort tags alphabetically, but keep 'Other' last
  const sortedGrouped: Record<string, OperationItem[]> = {};
  Object.keys(grouped)
    .sort((a, b) => {
      if (a === 'Other') return 1;
      if (b === 'Other') return -1;
      return a.localeCompare(b);
    })
    .forEach(key => {
      sortedGrouped[key] = grouped[key];
    });
  
  return sortedGrouped;
}

export function groupOperationsBySource(operations: OperationItem[]): Record<string, OperationItem[]> {
  const grouped: Record<string, OperationItem[]> = {};
  
  operations.forEach(op => {
    if (!grouped[op.sourceName]) grouped[op.sourceName] = [];
    grouped[op.sourceName].push(op);
  });
  
  return grouped;
}
