import { describe, expect, it } from 'vitest';
import { operationLabel, shortOperationId } from '../src/format';

describe('operation label (node secondary line, detail panels)', () => {
  it('drops the $sourceDescriptions.<source>. prefix', () => {
    expect(shortOperationId('$sourceDescriptions.commerce.createInvoice')).toBe('createInvoice');
    expect(shortOperationId('petStoreApi.loginUser')).toBe('petStoreApi.loginUser');
    expect(shortOperationId('createInvoice')).toBe('createInvoice');
  });

  it('prefers METHOD /path when the operation is resolved', () => {
    const operationId = '$sourceDescriptions.commerce.createInvoice';
    expect(operationLabel({ operationId, method: 'POST', path: '/invoices', methodSource: 'openapi' })).toBe('POST /invoices');
    expect(operationLabel({ method: 'GET', path: '/pets/{id}', methodSource: 'operationPath' })).toBe('GET /pets/{id}');
    // Unresolved: short operationId.
    expect(operationLabel({ operationId, methodSource: 'unresolved' })).toBe('createInvoice');
    expect(operationLabel({ operationId, method: 'POST' })).toBe('createInvoice');
  });

  it('returns nothing when no operation is known', () => {
    expect(operationLabel({})).toBeUndefined();
    expect(operationLabel({ operationId: '$sourceDescriptions.commerce.' })).toBeUndefined();
  });
});
