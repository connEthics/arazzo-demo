// E1 examples (app/public/workflows, written by lot E1): every `*.arazzo.yaml`
// declaring `arazzo: 1.1.x` must validate with 0 error. Read-only: this test
// never modifies these files.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { validateText, workflowToGraph, graphToMermaid } from '../src/index.js';
import { duplicates, format } from './helpers.js';

const root = join(__dirname, '..', '..', '..', 'app', 'public', 'workflows');

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : name.endsWith('.arazzo.yaml') ? [p] : [];
  });
}

const files = walk(root).filter((f) => /^arazzo:\s*['"]?1\.1\./m.test(readFileSync(f, 'utf8')));

describe.skipIf(files.length === 0)('E1 workflows (arazzo 1.1)', () => {
  for (const file of files) {
    it(relative(root, file), () => {
      const r = validateText(readFileSync(file, 'utf8'));
      expect(r.errors).toEqual([]);
      expect(duplicates(r.diagnostics)).toEqual([]);
      const errors = r.diagnostics.filter((d) => d.severity === 'error');
      expect(format(errors)).toBe('');
      // Every workflow can be turned into a graph and a Mermaid diagram.
      for (const wf of r.doc?.workflows ?? []) {
        const g = workflowToGraph(r.doc, wf.workflowId);
        expect(g.nodes.length).toBeGreaterThan(1);
        expect(graphToMermaid(g)).toMatch(/^flowchart TB/);
      }
    });
  }
});

// Fan-out / join of the e2e order-to-cash example (UI-SPEC M3): createInvoice and
// createShipment both depend on capturePayment and must stay parallel.
const orderToCash = join(root, 'e2e-order-to-cash', 'e2e-order-to-cash.arazzo.yaml');
describe.skipIf(!existsSync(orderToCash))('E1 e2e-order-to-cash graph', () => {
  it('draws createInvoice and createShipment in parallel before the join', () => {
    const r = validateText(readFileSync(orderToCash, 'utf8'));
    const g = workflowToGraph(r.doc, 'orderToCash');
    const pairs = (kind: string) => g.edges.filter((e) => e.kind === kind).map((e) => `${e.source}->${e.target}`);
    expect(pairs('sequence')).toEqual(['input->step:createOrder', 'step:closeOrder->output']);
    expect(pairs('depends-on')).toEqual([
      'step:createOrder->step:awaitOrderConfirmation',
      'step:awaitOrderConfirmation->step:capturePayment',
      'step:capturePayment->step:createInvoice',
      'step:capturePayment->step:createShipment',
      'step:createInvoice->join:closeOrder',
      'step:createShipment->join:closeOrder',
      'join:closeOrder->step:closeOrder',
    ]);
  });
});
