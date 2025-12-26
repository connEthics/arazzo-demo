
export interface OASParameter {
  name: string;
  in: 'query' | 'path' | 'header' | 'cookie';
  required?: boolean;
  description?: string;
  schema?: any;
  example?: any;
}

export interface OASRequestBody {
  description?: string;
  required?: boolean;
  content?: Record<string, { schema?: any; example?: any }>;
}

export interface OASResponse {
  statusCode: string;
  description?: string;
  content?: Record<string, { schema?: any; example?: any }>;
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

export function extractOperations(sources: Record<string, any>): OperationItem[] {
  const operations: OperationItem[] = [];

  Object.entries(sources).forEach(([sourceName, oas]) => {
    if (!oas.paths) return;

    Object.entries(oas.paths).forEach(([path, pathItem]: [string, any]) => {
      // Collect path-level parameters
      const pathParams: OASParameter[] = (pathItem.parameters || []).map((p: any) => ({
        name: p.name,
        in: p.in,
        required: p.required,
        description: p.description,
        schema: p.schema,
        example: p.example
      }));

      ['get', 'post', 'put', 'delete', 'patch'].forEach(method => {
        if (pathItem[method]) {
          const op = pathItem[method];
          
          // Merge path and operation parameters
          const opParams: OASParameter[] = (op.parameters || []).map((p: any) => ({
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
          const responses: OASResponse[] = Object.entries(op.responses || {}).map(([code, resp]: [string, any]) => ({
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

export function getOperationByStepId(sources: Record<string, any>, operationIdOrPath: string, sourceName?: string): OperationItem | undefined {
  const operations = extractOperations(sources);
  
  // operationIdOrPath can be "sourceName.operationId" or just "operationId"
  let searchSourceName = sourceName;
  let searchOperationId = operationIdOrPath;
  
  if (operationIdOrPath.includes('.')) {
    const parts = operationIdOrPath.split('.');
    searchSourceName = parts[0];
    searchOperationId = parts.slice(1).join('.');
  }
  
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
