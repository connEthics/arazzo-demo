import { parseArazzoSpec, parseAndValidate, extractExpressionSource } from '@/lib/arazzo-parser';

/**
 * Arazzo Specification 1.1.0 Compliance Tests — `$self` (§5.8.1): self-assigned URI of the
 * document (base of relative references), and the version rules around it.
 */

const doc = (self: string | null, version = '1.1.0') => `
arazzo: ${version}
${self === null ? '' : `$self: ${self}`}
info:
  title: self test
  version: 1.0.0
sourceDescriptions:
  - name: shop
    url: ./openapi.yaml
    type: openapi
workflows:
  - workflowId: wf
    steps:
      - stepId: s1
        operationId: op
`;

const codes = (text: string) => parseAndValidate(text).diagnostics.map((d) => d.code);

describe('Arazzo Spec 1.1.0 - $self', () => {
  it('parses $self at the root', () => {
    expect(parseArazzoSpec(doc('https://example.com/a.arazzo.yaml')).$self).toBe('https://example.com/a.arazzo.yaml');
  });

  it('accepts an absolute URI without diagnostics on $self', () => {
    const diags = parseAndValidate(doc('https://example.com/a.arazzo.yaml')).diagnostics;
    expect(diags.filter((d) => d.path[0] === '$self')).toEqual([]);
    expect(diags.filter((d) => d.severity === 'error')).toEqual([]);
  });

  it('recommends $self in a 1.1.0 document (info)', () => {
    const diag = parseAndValidate(doc(null)).diagnostics.find((d) => d.code === 'arazzo-self-recommended');
    expect(diag?.severity).toBe('info');
  });

  it('rejects a $self with a fragment', () => {
    expect(codes(doc('https://example.com/a.arazzo.yaml#frag'))).toContain('arazzo-self-fragment');
  });

  it('flags $self in a 1.0.1 document', () => {
    expect(codes(doc('https://example.com/a.arazzo.yaml', '1.0.1'))).toContain('arazzo-version-feature-mismatch');
  });

  it('recognises the $self runtime expression', () => {
    expect(extractExpressionSource('$self')).toEqual({ type: 'self' });
  });

  it('positions diagnostics on 1-based lines', () => {
    const diag = parseAndValidate(doc('https://example.com/a.arazzo.yaml#frag')).diagnostics.find((d) => d.code === 'arazzo-self-fragment');
    expect(diag?.line).toBe(3);
  });
});
