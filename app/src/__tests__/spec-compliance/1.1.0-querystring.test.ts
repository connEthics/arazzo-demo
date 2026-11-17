import { parseArazzoSpec, parseAndValidate } from '@/lib/arazzo-parser';
import type { Parameter } from '@/types/arazzo';

/**
 * Arazzo Specification 1.1.0 Compliance Tests — `in: querystring` (§5.8.6, OAS 3.2 alignment):
 * the whole query string as one parameter, exclusive with `query` parameters.
 */

const doc = (params: string) => `
arazzo: 1.1.0
$self: https://example.com/qs.arazzo.yaml
info:
  title: querystring test
  version: 1.0.0
sourceDescriptions:
  - name: billing
    url: ./openapi.yaml
    type: openapi
workflows:
  - workflowId: search
    inputs:
      type: object
      properties:
        filter:
          type: string
    steps:
      - stepId: searchInvoices
        operationId: searchInvoices
        parameters:
${params}
`;

const codes = (text: string) => parseAndValidate(text).diagnostics.map((d) => d.code);

describe('Arazzo Spec 1.1.0 - in: querystring', () => {
  const valid = doc(`
          - name: q
            in: querystring
            value: $inputs.filter
`);

  it('parses a querystring parameter', () => {
    const p = parseArazzoSpec(valid).workflows[0].steps[0].parameters![0] as Parameter;
    expect(p.in).toBe('querystring');
  });

  it('accepts a single querystring parameter', () => {
    expect(parseAndValidate(valid).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  });

  it('rejects querystring combined with query parameters', () => {
    expect(codes(doc(`
          - name: q
            in: querystring
            value: $inputs.filter
          - name: page
            in: query
            value: 1
`))).toContain('arazzo-param-querystring-exclusive');
  });

  it('warns on several querystring parameters', () => {
    expect(codes(doc(`
          - name: q1
            in: querystring
            value: a=1
          - name: q2
            in: querystring
            value: b=2
`))).toContain('arazzo-param-querystring-single');
  });

  it('flags querystring in a 1.0.1 document (not a 1.0 location)', () => {
    const text = valid.replace('arazzo: 1.1.0', 'arazzo: 1.0.1');
    expect(codes(text)).toContain('arazzo-version-feature-mismatch');
  });
});
