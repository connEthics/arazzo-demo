/**
 * Arazzo 1.1 example gallery (app/public/workflows, see its README.md).
 * `id` is the folder name (or the file stem of the two historical documents) and the value of
 * `/builder?example=<id>`.
 */
import { parse as parseYaml } from 'yaml';
import { parseArazzoSpec } from '@/lib/arazzo-parser';
import type { ArazzoSpec } from '@/types/arazzo';

export interface ExampleEntry {
  id: string;
  title: string;
  /** Served path of the Arazzo document. */
  path: string;
  /** Served path of the example README (when it has one). */
  readme?: string;
  summary: string;
  /** Arazzo 1.1 features showcased. */
  features: string[];
  category: 'MCP' | 'E2E' | 'Classic';
  /** Step selected after loading. */
  defaultStepId?: string;
}

export const EXAMPLES: ExampleEntry[] = [
  {
    id: 'mcp-travel-booking',
    title: 'Travel booking as MCP tools',
    path: '/workflows/mcp-travel-booking/mcp-travel-booking.arazzo.yaml',
    readme: '/workflows/mcp-travel-booking/README.md',
    summary: 'quote_trip (read-only) then book_trip: booking, payment, confirmation and compensations — one workflow = one MCP tool.',
    features: ['$self', 'reusable failure action', 'MCP mapping'],
    category: 'MCP',
  },
  {
    id: 'mcp-support-refund',
    title: 'Support agent refund + refund.issued',
    path: '/workflows/mcp-support-refund/mcp-support-refund.arazzo.yaml',
    readme: '/workflows/mcp-support-refund/README.md',
    summary: 'Eligibility, HTTP refund, then an AsyncAPI send of refund.issued, guarded by successCriteria and onFailure: end.',
    features: ['asyncapi source', 'channelPath', 'action: send'],
    category: 'MCP',
  },
  {
    id: 'e2e-order-to-cash',
    title: 'Order-to-cash (HTTP + events)',
    path: '/workflows/e2e-order-to-cash/e2e-order-to-cash.arazzo.yaml',
    readme: '/workflows/e2e-order-to-cash/README.md',
    summary: 'POST order, receive order.confirmed (correlationId, timeout 6000 ms), payment, invoice ∥ shipment joined by dependsOn.',
    features: ['action: receive', 'correlationId', 'timeout', 'dependsOn', 'Selector (RFC 9535)'],
    category: 'E2E',
  },
  {
    id: 'e2e-session-renewal',
    title: 'Session renewal on 401',
    path: '/workflows/e2e-session-renewal/e2e-session-renewal.arazzo.yaml',
    readme: '/workflows/e2e-session-renewal/README.md',
    summary: 'A 401 triggers a retry failure action that calls renewSession with parameters, then the step is replayed.',
    features: ['action parameters', 'retryLimit / retryAfter', 'in: querystring'],
    category: 'E2E',
  },
  {
    id: 'e2e-onboarding-entreprise-fr',
    title: 'French B2B onboarding',
    path: '/workflows/e2e-onboarding-entreprise-fr/e2e-onboarding-entreprise-fr.arazzo.yaml',
    readme: '/workflows/e2e-onboarding-entreprise-fr/README.md',
    summary: 'SIREN lookup (INPI/SIRENE-like stub), KYC, account creation, account.created webhook.',
    features: ['action: send (webhook)', 'workflowId step + parameters', 'FR descriptions'],
    category: 'E2E',
  },
  {
    id: 'pet-adoption',
    title: 'Pet adoption (Petstore)',
    path: '/workflows/pet-adoption.arazzo.yaml',
    summary: 'Classic multi-workflow example on the Swagger Petstore, migrated to 1.1.',
    features: ['$self', 'JSON Pointer outputs'],
    category: 'Classic',
    defaultStepId: 'placeOrderWithCoupon',
  },
  {
    id: 'ecommerce-onboarding',
    title: 'E-commerce customer onboarding',
    path: '/workflows/ecommerce-onboarding.arazzo.yaml',
    summary: 'Magento → Stripe → Salesforce onboarding with three OpenAPI sources (remote, not loaded in the browser).',
    features: ['qualified operationIds', 'Selector (RFC 9535)'],
    category: 'Classic',
  },
];

export const DEFAULT_EXAMPLE_ID = 'pet-adoption';

export function findExample(id: string | null | undefined): ExampleEntry | undefined {
  return id ? EXAMPLES.find((e) => e.id === id) : undefined;
}

export interface LoadedExample {
  spec: ArazzoSpec;
  /** Parsed OpenAPI / AsyncAPI documents by source name. */
  sources: Record<string, unknown>;
  /** Sources the browser could not load (remote URL, fetch error). */
  skippedSources: string[];
}

/**
 * Loads an Arazzo document and the OpenAPI / AsyncAPI sources the browser can reach: relative
 * `url`s are resolved against the served location of the document (the `$self` of the examples
 * points at the production site, another origin), remote URLs of other origins are skipped (CORS).
 */
export async function loadArazzoWithSources(path: string, fetchImpl: typeof fetch = fetch): Promise<LoadedExample> {
  const res = await fetchImpl(path);
  if (!res.ok) throw new Error(`Cannot load ${path} (HTTP ${res.status})`);
  const spec = parseArazzoSpec(await res.text());
  const base = new URL(path, typeof window !== 'undefined' ? window.location.href : 'http://localhost/');
  const sources: Record<string, unknown> = {};
  const skippedSources: string[] = [];
  await Promise.all(
    (spec.sourceDescriptions ?? []).map(async (sd) => {
      if (sd.type === 'arazzo' || !sd.url) return;
      const url = new URL(sd.url, base);
      if (url.origin !== base.origin) {
        skippedSources.push(sd.name);
        return;
      }
      try {
        const r = await fetchImpl(url.pathname + url.search);
        if (!r.ok) throw new Error(String(r.status));
        sources[sd.name] = parseYaml(await r.text());
      } catch {
        skippedSources.push(sd.name);
      }
    }),
  );
  return { spec, sources, skippedSources };
}
