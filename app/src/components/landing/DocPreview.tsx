// Illustrative documentation card for the `capturePayment` step of orderToCash,
// styled with the ConnEthics tokens (follows light/dark).

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="px-4 py-3 sm:px-5 border-t border-ce-border">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-ce-subtle mb-2">{label}</div>
      {children}
    </div>
  );
}

export default function DocPreview() {
  return (
    <div className="rounded-2xl border border-ce-border bg-ce-raised [font-variant-ligatures:none] shadow-[var(--ce-shadow-lg)] overflow-hidden text-left">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-ce-border bg-ce-surface">
        <span className="text-xs font-medium text-ce-muted">orderToCash</span>
        <span className="text-xs text-ce-subtle" aria-hidden="true">/</span>
        <span className="text-xs font-medium text-ce-text">Step 3 of 6</span>
      </div>

      <div className="px-4 py-4 sm:px-5 flex items-start gap-3">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-ce-primary-solid text-xs font-bold text-ce-on-primary">
          3
        </span>
        <div className="min-w-0">
          <div className="font-mono text-base font-semibold text-ce-text break-all">capturePayment</div>
          <p className="mt-1 text-sm text-ce-muted">POST /payments — only after the order confirmation.</p>
        </div>
      </div>

      <Row label="Operation">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded px-1.5 py-0.5 font-mono text-[11px] font-bold bg-[var(--ce-method-post-bg)] text-[var(--ce-method-post-text)]">
            POST
          </span>
          <code className="font-mono text-[13px] text-ce-text break-all">$sourceDescriptions.commerce.capturePayment</code>
        </div>
      </Row>

      <Row label="Depends on">
        <span className="inline-flex items-center gap-2 rounded-md border border-[var(--ce-graph-depends-on-fg)] bg-[var(--ce-graph-depends-on-bg)] px-2 py-0.5 font-mono text-[12px] text-[var(--ce-graph-depends-on-text)]">
          awaitOrderConfirmation
        </span>
      </Row>

      <Row label="Success criteria">
        <ul className="space-y-1.5">
          {["$statusCode == 201", "$response.body#/status == 'captured'"].map((c) => (
            <li
              key={c}
              className="flex items-center gap-2 rounded-md border-l-2 border-[var(--ce-status-success-fg)] bg-[var(--ce-status-success-bg)] px-2.5 py-1"
            >
              <span className="text-[10px] font-bold uppercase text-[var(--ce-status-success-text)]">simple</span>
              <code className="font-mono text-[12px] text-ce-text break-all">{c}</code>
            </li>
          ))}
        </ul>
      </Row>

      <Row label="Outputs">
        <div className="flex flex-wrap items-center gap-2 font-mono text-[12px]">
          <span className="text-ce-text">paymentId</span>
          <span className="text-ce-subtle">←</span>
          <code className="text-[var(--ce-graph-output-text)]">$response.body#/id</code>
        </div>
      </Row>
    </div>
  );
}
