import { parseArazzoSpec } from '@/lib/arazzo-parser';

/**
 * Arazzo Specification 1.0.1 Compliance Tests
 * Section: Components
 * 
 * This test suite verifies that the parser correctly handles the 'Components' object
 * for reusable definitions.
 */

describe('Arazzo Spec 1.0.1 - Components Compliance', () => {
  
  const createSpecWithComponents = (componentsYaml: string) => `
arazzo: 1.0.1
info:
  title: Test Spec
  version: 1.0.0
sourceDescriptions: []
components:
${componentsYaml}
workflows:
  - workflowId: test
    steps: []
`;

  it('should parse reusable inputs (Spec Example 4.6.9.2)', () => {
    const yaml = createSpecWithComponents(`
  inputs:
    pagination:
      type: object
      properties:
        page:
          type: integer
          format: int32
        pageSize:
          type: integer
          format: int32
    `);

    const result = parseArazzoSpec(yaml);
    
    expect(result.components?.inputs).toBeDefined();
    expect(result.components?.inputs?.['pagination'].type).toBe('object');
    expect(result.components?.inputs?.['pagination'].properties?.page.type).toBe('integer');
  });

  it('should parse reusable parameters (Spec Example 4.6.9.2)', () => {
    const yaml = createSpecWithComponents(`
  parameters:
    storeId:
      name: storeId
      in: header
      value: $inputs.x-store-id
    `);

    const result = parseArazzoSpec(yaml);
    
    expect(result.components?.parameters).toBeDefined();
    expect(result.components?.parameters?.['storeId'].in).toBe('header');
    expect(result.components?.parameters?.['storeId'].value).toBe('$inputs.x-store-id');
  });

  it('should parse reusable failureActions (Spec Example 4.6.9.2)', () => {
    const yaml = createSpecWithComponents(`
  failureActions:
    refreshToken:
      name: refreshExpiredToken
      type: retry
      retryAfter: 1
      retryLimit: 5
      workflowId: refreshTokenWorkflowId
      criteria:
          - condition: $statusCode == 401
    `);

    const result = parseArazzoSpec(yaml);
    
    expect(result.components?.failureActions).toBeDefined();
    expect(result.components?.failureActions?.['refreshToken'].type).toBe('retry');
    expect(result.components?.failureActions?.['refreshToken'].retryLimit).toBe(5);
    expect(result.components?.failureActions?.['refreshToken'].workflowId).toBe('refreshTokenWorkflowId');
  });
});
