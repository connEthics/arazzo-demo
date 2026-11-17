import { parseArazzoSpec, parseAndValidate } from '@/lib/arazzo-parser';

/**
 * Arazzo Specification 1.1.0 Compliance Tests — AsyncAPI steps (§5.8.3, §5.8.5)
 * `type: asyncapi` sources, `channelPath` + `action: send | receive`, `correlationId`, `timeout`.
 * Validation is delegated to @connethics/arazzo-core (official JSON Schema 1.1 + semantic rules).
 */

const doc = (steps: string, version = '1.1.0') => `
arazzo: ${version}
$self: https://example.com/orders.arazzo.yaml
info:
  title: Async test
  version: 1.0.0
sourceDescriptions:
  - name: shop
    url: ./openapi.yaml
    type: openapi
  - name: events
    url: ./asyncapi.yaml
    type: asyncapi
workflows:
  - workflowId: orderFlow
    steps:
${steps}
`;

const codes = (text: string) => parseAndValidate(text).diagnostics.map((d) => d.code);
const errors = (text: string) => parseAndValidate(text).diagnostics.filter((d) => d.severity === 'error');

describe('Arazzo Spec 1.1.0 - AsyncAPI steps', () => {
  const valid = doc(`
      - stepId: createOrder
        operationId: $sourceDescriptions.shop.createOrder
        outputs:
          orderId: $response.body#/id
      - stepId: awaitConfirmation
        channelPath: '{$sourceDescriptions.events.url}#/channels/orderConfirmed'
        action: receive
        correlationId: $steps.createOrder.outputs.orderId
        timeout: 6000
        successCriteria:
          - condition: $message.payload#/status == 'confirmed'
      - stepId: notify
        channelPath: '{$sourceDescriptions.events.url}#/channels/orderNotified'
        action: send
        requestBody:
          payload:
            orderId: $steps.createOrder.outputs.orderId
`);

  it('parses an asyncapi source and AsyncAPI steps', () => {
    const spec = parseArazzoSpec(valid);
    expect(spec.sourceDescriptions[1].type).toBe('asyncapi');
    const [, receive, send] = spec.workflows[0].steps;
    expect(receive.channelPath).toBe('{$sourceDescriptions.events.url}#/channels/orderConfirmed');
    expect(receive.action).toBe('receive');
    expect(receive.correlationId).toBe('$steps.createOrder.outputs.orderId');
    expect(receive.timeout).toBe(6000);
    expect(send.action).toBe('send');
  });

  it('validates a correct hybrid HTTP + AsyncAPI workflow without errors', () => {
    expect(errors(valid)).toEqual([]);
  });

  it('rejects correlationId on a send step', () => {
    const text = doc(`
      - stepId: notify
        channelPath: '{$sourceDescriptions.events.url}#/channels/orderNotified'
        action: send
        correlationId: abc
`);
    expect(codes(text)).toContain('arazzo-async-correlation-receive-only');
  });

  it('requires action on an AsyncAPI step', () => {
    const text = doc(`
      - stepId: wait
        channelPath: '{$sourceDescriptions.events.url}#/channels/orderConfirmed'
`);
    expect(codes(text)).toContain('arazzo-async-action-required');
  });

  it('rejects action on an HTTP step', () => {
    const text = doc(`
      - stepId: createOrder
        operationId: $sourceDescriptions.shop.createOrder
        action: send
`);
    expect(errors(text).length).toBeGreaterThan(0);
  });

  it('enforces exactly one step target (operationId / channelPath)', () => {
    const text = doc(`
      - stepId: both
        operationId: $sourceDescriptions.shop.createOrder
        channelPath: '{$sourceDescriptions.events.url}#/channels/orderConfirmed'
        action: receive
`);
    expect(codes(text)).toContain('arazzo-step-target-exclusive');
  });

  it('flags a non-positive timeout', () => {
    const text = doc(`
      - stepId: wait
        channelPath: '{$sourceDescriptions.events.url}#/channels/orderConfirmed'
        action: receive
        timeout: -5
`);
    expect(codes(text)).toContain('arazzo-step-timeout-positive');
  });

  it('warns when AsyncAPI features are used in a 1.0.1 document', () => {
    expect(codes(valid.replace('arazzo: 1.1.0', 'arazzo: 1.0.1'))).toContain('arazzo-version-feature-mismatch');
  });
});
