import { parseArazzoSpec } from '@/lib/arazzo-parser';

/**
 * Arazzo Specification 1.0.1 Compliance Tests
 * Section: Source Descriptions
 * 
 * This test suite verifies that the parser correctly handles the 'SourceDescriptions' object
 * as defined in the Arazzo Specification 1.0.1.
 */

describe('Arazzo Spec 1.0.1 - Source Descriptions Compliance', () => {
  
  const createSpecWithSources = (sourcesYaml: string) => `
arazzo: 1.0.1
info:
  title: Test Spec
  version: 1.0.0
sourceDescriptions:
${sourcesYaml}
workflows:
  - workflowId: test
    steps: []
`;

  it('should parse openapi source description (Spec Example 4.6.3.2)', () => {
    const yaml = createSpecWithSources(`
  - name: petStoreDescription
    url: https://github.com/swagger-api/swagger-petstore/blob/master/src/main/resources/openapi.yaml
    type: openapi
    `);

    const result = parseArazzoSpec(yaml);
    const source = result.sourceDescriptions[0];

    expect(source.name).toBe('petStoreDescription');
    expect(source.type).toBe('openapi');
    expect(source.url).toBe('https://github.com/swagger-api/swagger-petstore/blob/master/src/main/resources/openapi.yaml');
  });

  it('should parse arazzo source description', () => {
    const yaml = createSpecWithSources(`
  - name: other-workflow
    type: arazzo
    url: ./other.arazzo.yaml
    `);

    const result = parseArazzoSpec(yaml);
    const source = result.sourceDescriptions[0];

    expect(source.name).toBe('other-workflow');
    expect(source.type).toBe('arazzo');
    expect(source.url).toBe('./other.arazzo.yaml');
  });

  it('should parse x- extensions in source description', () => {
    const yaml = createSpecWithSources(`
  - name: extended-source
    type: openapi
    url: ./api.yaml
    x-custom-field: custom-value
    `);

    const result = parseArazzoSpec(yaml);
    const source = result.sourceDescriptions[0];

    expect(source['x-custom-field']).toBe('custom-value');
  });
});
