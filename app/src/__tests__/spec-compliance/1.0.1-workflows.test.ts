import { parseArazzoSpec } from '@/lib/arazzo-parser';

/**
 * Arazzo Specification 1.0.1 Compliance Tests
 * Section: Workflows
 * 
 * This test suite verifies that the parser correctly handles the 'Workflow' object
 * structure, including inputs, outputs, and parameters.
 */

describe('Arazzo Spec 1.0.1 - Workflows Compliance', () => {
  
  const createSpecWithWorkflow = (workflowYaml: string) => `
arazzo: 1.0.1
info:
  title: Test Spec
  version: 1.0.0
sourceDescriptions: []
workflows:
${workflowYaml}
`;

  it('should parse workflow basic metadata (Spec Example 4.6.4.2)', () => {
    const yaml = createSpecWithWorkflow(`
  - workflowId: loginUser
    summary: Login User
    description: This workflow lays out the steps to login a user
    steps: []
    `);

    const result = parseArazzoSpec(yaml);
    const workflow = result.workflows[0];

    expect(workflow.workflowId).toBe('loginUser');
    expect(workflow.summary).toBe('Login User');
    expect(workflow.description).toBe('This workflow lays out the steps to login a user');
  });

  it('should parse workflow inputs (Spec Example 4.6.4.2)', () => {
    const yaml = createSpecWithWorkflow(`
  - workflowId: loginUser
    inputs:
        type: object
        properties:
            username:
                type: string
            password:
                type: string
    steps: []
    `);

    const result = parseArazzoSpec(yaml);
    const workflow = result.workflows[0];

    expect(workflow.inputs).toBeDefined();
    expect(workflow.inputs?.type).toBe('object');
    expect(workflow.inputs?.properties?.username.type).toBe('string');
    expect(workflow.inputs?.properties?.password.type).toBe('string');
  });

  it('should parse workflow outputs (Spec Example 4.6.4.2)', () => {
    const yaml = createSpecWithWorkflow(`
  - workflowId: loginUser
    steps: []
    outputs:
        tokenExpires: $steps.loginStep.outputs.tokenExpires
    `);

    const result = parseArazzoSpec(yaml);
    const workflow = result.workflows[0];

    expect(workflow.outputs).toBeDefined();
    expect(workflow.outputs?.tokenExpires).toBe('$steps.loginStep.outputs.tokenExpires');
  });

  it('should parse workflow parameters', () => {
    const yaml = createSpecWithWorkflow(`
  - workflowId: param-workflow
    parameters:
      - name: headerParam
        in: header
        value: "some-value"
      - name: queryParam
        in: query
        value: $inputs.query
    steps: []
    `);

    const result = parseArazzoSpec(yaml);
    const workflow = result.workflows[0];

    expect(workflow.parameters).toHaveLength(2);
    expect(workflow.parameters?.[0].in).toBe('header');
    expect(workflow.parameters?.[1].value).toBe('$inputs.query');
  });
});
