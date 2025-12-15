import { parseArazzoSpec } from '@/lib/arazzo-parser';
import { ArazzoSpec } from '@/types/arazzo';

/**
 * Arazzo Specification 1.0.1 Compliance Tests
 * Section: Steps
 * 
 * This test suite verifies that the parser correctly handles the 'Step' object
 * as defined in the Arazzo Specification 1.0.1.
 */

describe('Arazzo Spec 1.0.1 - Steps Compliance', () => {
  
  // Helper to create a minimal valid spec wrapper around steps
  const createSpecWithSteps = (stepsYaml: string) => `
arazzo: 1.0.1
info:
  title: Test Spec
  version: 1.0.0
sourceDescriptions: []
workflows:
  - workflowId: test-workflow
    summary: Test Workflow
    steps:
${stepsYaml}
`;

  it('should parse a basic step with required fields (Spec Example 4.6.5.2)', () => {
    const yaml = createSpecWithSteps(`
      - stepId: loginStep
        description: This step demonstrates the user login step
        operationId: loginUser
        parameters:
          - name: username
            in: query
            value: $inputs.username
          - name: password
            in: query
            value: $inputs.password
        successCriteria:
          - condition: $statusCode == 200
        outputs:
            tokenExpires: $response.header.X-Expires-After
            rateLimit: $response.header.X-Rate-Limit
            sessionToken: $response.body
    `);

    const result = parseArazzoSpec(yaml);
    const step = result.workflows[0].steps[0];

    expect(step.stepId).toBe('loginStep');
    expect(step.operationId).toBe('loginUser');
    expect(step.description).toBe('This step demonstrates the user login step');
    expect(step.parameters).toHaveLength(2);
    expect(step.successCriteria?.[0].condition).toBe('$statusCode == 200');
    expect(step.outputs?.tokenExpires).toBe('$response.header.X-Expires-After');
  });

  it('should parse step with operationPath (Spec Example 4.6.5.2)', () => {
    const yaml = createSpecWithSteps(`
      - stepId: getPetStep
        description: retrieve a pet by status from the GET pets endpoint
        operationPath: '{$sourceDescriptions.petStoreDescription.url}#/paths/~1pet~1findByStatus/get'
        parameters:
          - name: status
            in: query
            value: 'available'
          - name: Authorization
            in: header
            value: $steps.loginUser.outputs.sessionToken
        successCriteria:
          - condition: $statusCode == 200
        outputs:
            availablePets: $response.body
    `);

    const result = parseArazzoSpec(yaml);
    const step = result.workflows[0].steps[0];

    expect(step.stepId).toBe('getPetStep');
    expect(step.operationPath).toBe('{$sourceDescriptions.petStoreDescription.url}#/paths/~1pet~1findByStatus/get');
    expect(step.parameters?.[0].value).toBe('available');
  });

  it('should parse onSuccess navigation (Spec Example 4.6.7.2)', () => {
    const yaml = createSpecWithSteps(`
      - stepId: source-step
        operationId: op1
        onSuccess:
          - name: JoinWaitingList
            type: goto
            stepId: joinWaitingListStep
            criteria:
                - context: $response.body
                  condition: $[?count(@.pets) > 0]
                  type: jsonpath
    `);

    const result = parseArazzoSpec(yaml);
    const step = result.workflows[0].steps[0];

    expect(step.onSuccess).toBeDefined();
    expect(step.onSuccess?.[0].name).toBe('JoinWaitingList');
    expect(step.onSuccess?.[0].type).toBe('goto');
    expect(step.onSuccess?.[0].stepId).toBe('joinWaitingListStep');
    expect(step.onSuccess?.[0].criteria?.[0].type).toBe('jsonpath');
  });

  it('should parse onFailure navigation (Spec Example 4.6.8.2)', () => {
    const yaml = createSpecWithSteps(`
      - stepId: flaky-step
        operationId: op2
        onFailure:
          - name: retryStep
            type: retry
            retryAfter: 1
            retryLimit: 5
            criteria:
                - condition: $statusCode == 503
    `);

    const result = parseArazzoSpec(yaml);
    const step = result.workflows[0].steps[0];

    expect(step.onFailure).toBeDefined();
    expect(step.onFailure?.[0].name).toBe('retryStep');
    expect(step.onFailure?.[0].type).toBe('retry');
    expect(step.onFailure?.[0].retryAfter).toBe(1);
    expect(step.onFailure?.[0].retryLimit).toBe(5);
  });
});
