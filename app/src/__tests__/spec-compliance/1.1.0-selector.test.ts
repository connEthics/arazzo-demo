import { parseArazzoSpec, parseAndValidate } from '@/lib/arazzo-parser';
import { isSelector, outputValueToString } from '@/types/arazzo';

/**
 * Arazzo Specification 1.1.0 Compliance Tests — Selector Object (§5.8.13) and
 * Expression Type Object (§5.8.12): outputs `{ context, selector, type }`.
 */

const doc = (outputs: string, version = '1.1.0') => `
arazzo: ${version}
$self: https://example.com/selector.arazzo.yaml
info:
  title: Selector test
  version: 1.0.0
sourceDescriptions:
  - name: shop
    url: ./openapi.yaml
    type: openapi
workflows:
  - workflowId: listOrders
    steps:
      - stepId: list
        operationId: listOrders
        outputs:
${outputs}
`;

const diagnostics = (text: string) => parseAndValidate(text).diagnostics;

describe('Arazzo Spec 1.1.0 - Selector Object', () => {
  const valid = doc(`
          firstId:
            context: $response.body
            selector: $.items[0].id
            type: jsonpath
          total:
            context: $response.body
            selector: /total
            type:
              type: jsonpointer
              version: rfc6901
          raw: $response.body#/items
`);

  it('parses Selector outputs next to runtime expressions', () => {
    const outputs = parseArazzoSpec(valid).workflows[0].steps[0].outputs!;
    expect(isSelector(outputs.firstId)).toBe(true);
    expect(isSelector(outputs.raw)).toBe(false);
    expect(outputValueToString(outputs.firstId)).toBe('$response.body ▸ $.items[0].id (jsonpath)');
    expect(outputValueToString(outputs.total)).toBe('$response.body ▸ /total (jsonpointer rfc6901)');
  });

  it('accepts JSONPath (RFC 9535) and JSON Pointer selectors in a 1.1.0 document', () => {
    expect(diagnostics(valid).filter((d) => d.severity === 'error')).toEqual([]);
  });

  it('reports an invalid JSONPath selector', () => {
    const text = doc(`
          broken:
            context: $response.body
            selector: $.items[?(
            type: jsonpath
`);
    expect(diagnostics(text).map((d) => d.code)).toContain('arazzo-selector-syntax');
  });

  it('reports a Selector without its required fields', () => {
    const text = doc(`
          partial:
            context: $response.body
            type: jsonpath
`);
    expect(diagnostics(text).some((d) => d.severity === 'error')).toBe(true);
  });

  it('flags Selector Objects in a 1.0.x document (they require arazzo 1.1.0)', () => {
    const codes = diagnostics(valid.replace('arazzo: 1.1.0', 'arazzo: 1.0.1')).map((d) => d.code);
    expect(codes).toContain('arazzo-version-feature-mismatch');
  });
});
