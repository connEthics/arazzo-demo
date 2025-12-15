import { extractExpressionSource } from '@/lib/arazzo-parser';

/**
 * Arazzo Specification 1.0.1 Compliance Tests
 * Section: Runtime Expressions
 * 
 * This test suite verifies that the parser correctly handles Runtime Expressions
 * used for data mapping between steps and inputs.
 */

describe('Arazzo Spec 1.0.1 - Runtime Expressions Compliance', () => {
  
  it('should extract source from $inputs expression (Spec Example 4.7.1)', () => {
    const expr = '$inputs.username';
    const result = extractExpressionSource(expr);

    expect(result).toEqual({
      type: 'inputs',
      source: 'username'
    });
  });

  it('should extract source from $steps expression (Spec Example 4.7.1)', () => {
    const expr = '$steps.someStepId.outputs.pets';
    const result = extractExpressionSource(expr);

    expect(result).toEqual({
      type: 'steps',
      source: 'someStepId',
      field: 'pets'
    });
  });

  it('should handle $url expression', () => {
    expect(extractExpressionSource('$url')).toEqual({ type: 'url' });
  });

  it('should handle $method expression', () => {
    expect(extractExpressionSource('$method')).toEqual({ type: 'method' });
  });

  it('should handle $statusCode expression', () => {
    expect(extractExpressionSource('$statusCode')).toEqual({ type: 'statusCode' });
  });

  it('should handle $request expressions', () => {
    expect(extractExpressionSource('$request.body')).toEqual({ type: 'request', part: 'body' });
    expect(extractExpressionSource('$request.header.Auth')).toEqual({ type: 'request', part: 'header', name: 'Auth' });
    expect(extractExpressionSource('$request.query.limit')).toEqual({ type: 'request', part: 'query', name: 'limit' });
    expect(extractExpressionSource('$request.path.id')).toEqual({ type: 'request', part: 'path', name: 'id' });
  });

  it('should handle $response expressions', () => {
    expect(extractExpressionSource('$response.body')).toEqual({ type: 'response', part: 'body' });
    expect(extractExpressionSource('$response.header.ETag')).toEqual({ type: 'response', part: 'header', name: 'ETag' });
  });

  it('should handle $components expressions', () => {
    expect(extractExpressionSource('$components.inputs.userId')).toEqual({ 
      type: 'components', 
      category: 'inputs', 
      name: 'userId' 
    });
    expect(extractExpressionSource('$components.parameters.limit')).toEqual({ 
      type: 'components', 
      category: 'parameters', 
      name: 'limit' 
    });
  });

  it('should return null for invalid expressions', () => {
    expect(extractExpressionSource('plainString')).toBeNull();
    expect(extractExpressionSource('$unknown.variable')).toBeNull();
  });

  // Note: The current implementation of extractExpressionSource might be limited.
  // These tests document current behavior and expected compliance.
  
  it('should handle expressions in complex strings (future)', () => {
    // This test might fail if the parser only handles exact matches
    // It serves as documentation for needed improvements
    const expr = 'Prefix $inputs.userId Suffix';
    // Current implementation uses match() which finds the pattern anywhere
    const result = extractExpressionSource(expr);
    
    expect(result).toEqual({
      type: 'inputs',
      source: 'userId'
    });
  });
});
