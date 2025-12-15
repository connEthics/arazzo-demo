import type { BadgeVariant } from '@/components/primitives/Badge';

/**
 * HTTP methods supported in Arazzo workflows
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

/**
 * Extracts HTTP method from an operationId string using common naming conventions.
 * 
 * @param operationId - The operation identifier (e.g., "findPetsByStatus", "createUser")
 * @returns The inferred HTTP method or null if not determinable
 * 
 * @example
 * extractHttpMethod('findPetsByStatus') // returns 'GET'
 * extractHttpMethod('createUser') // returns 'POST'
 * extractHttpMethod('deletePet') // returns 'DELETE'
 */
export function extractHttpMethod(operationId?: string): HttpMethod | null {
  if (!operationId) return null;
  
  const op = operationId.toLowerCase();
  
  if (op.includes('get') || op.includes('find') || op.includes('list') || 
      op.includes('search') || op.includes('retrieve') || op.includes('fetch')) {
    return 'GET';
  }
  if (op.includes('post') || op.includes('create') || op.includes('place') || 
      op.includes('add') || op.includes('upsert') || op.includes('submit')) {
    return 'POST';
  }
  if (op.includes('put') || op.includes('update') || op.includes('replace')) {
    return 'PUT';
  }
  if (op.includes('delete') || op.includes('remove') || op.includes('destroy')) {
    return 'DELETE';
  }
  if (op.includes('patch') || op.includes('modify')) {
    return 'PATCH';
  }
  
  return null;
}

/**
 * Maps HTTP methods to Badge variants for consistent styling
 */
export const METHOD_BADGE_VARIANTS: Record<HttpMethod, BadgeVariant> = {
  GET: 'method-get',
  POST: 'method-post',
  PUT: 'method-put',
  DELETE: 'method-delete',
  PATCH: 'method-patch',
};

/**
 * Gets the appropriate Badge variant for an HTTP method
 */
export function getMethodBadgeVariant(method: HttpMethod): BadgeVariant {
  return METHOD_BADGE_VARIANTS[method] || 'method-get';
}

/**
 * Tailwind CSS classes for HTTP method styling (for non-Badge use cases)
 */
export const METHOD_STYLES: Record<HttpMethod, string> = {
  GET: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  POST: 'bg-blue-100 text-blue-700 border-blue-200',
  PUT: 'bg-amber-100 text-amber-700 border-amber-200',
  DELETE: 'bg-red-100 text-red-700 border-red-200',
  PATCH: 'bg-purple-100 text-purple-700 border-purple-200',
};

/**
 * Gets method styling classes
 */
export function getMethodStyles(method: HttpMethod): string {
  return METHOD_STYLES[method] || 'bg-gray-100 text-gray-600 border-gray-200';
}

/**
 * Extracts the operation name from a potentially namespaced operationId
 * 
 * @example
 * getOperationName('petstore.findPetById') // returns 'findPetById'
 * getOperationName('findPetById') // returns 'findPetById'
 */
export function getOperationName(operationId?: string): string | undefined {
  if (!operationId) return undefined;
  return operationId.includes('.') ? operationId.split('.').pop() : operationId;
}

/**
 * Extracts the source name from a namespaced operationId
 * 
 * @example
 * getSourceFromOperationId('petstore.findPetById') // returns 'petstore'
 * getSourceFromOperationId('findPetById') // returns undefined
 */
export function getSourceFromOperationId(operationId?: string): string | undefined {
  if (!operationId || !operationId.includes('.')) return undefined;
  return operationId.split('.')[0];
}
