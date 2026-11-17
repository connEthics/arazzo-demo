// Static, illustrative rendering of the `orderToCash` workflow
// (app/public/workflows/e2e-order-to-cash/e2e-order-to-cash.arazzo.yaml).
// Colors and dash patterns come from the ConnEthics graph tokens (--ce-graph-*, --ce-method-*),
// so it follows light/dark like the Studio graph. Color never carries meaning alone:
// each kind also has a badge text, and edges have distinct dash patterns.

type Kind = "step-http" | "async-receive";

type StepNode = {
  id: string;
  kind: Kind;
  badge: string;
  meta: string;
  x: number;
  y: number;
  w: number;
};

const H = 54;

const NODES: StepNode[] = [
  { id: "createOrder", kind: "step-http", badge: "POST", meta: "/orders", x: 100, y: 72, w: 220 },
  { id: "awaitOrderConfirmation", kind: "async-receive", badge: "↙ RECEIVE", meta: "order.confirmed", x: 100, y: 162, w: 220 },
  { id: "capturePayment", kind: "step-http", badge: "POST", meta: "/payments", x: 100, y: 252, w: 220 },
  { id: "createInvoice", kind: "step-http", badge: "POST", meta: "/invoices", x: 6, y: 356, w: 198 },
  { id: "createShipment", kind: "step-http", badge: "POST", meta: "/shipments", x: 216, y: 356, w: 198 },
  { id: "closeOrder", kind: "step-http", badge: "POST", meta: "/orders/{orderId}/close", x: 100, y: 486, w: 220 },
];

const v = (name: string) => `var(--ce-${name})`;

function Node({ n }: { n: StepNode }) {
  const isHttp = n.kind === "step-http";
  const badgeBg = isHttp ? v("method-post-bg") : v("graph-async-receive-bg");
  const badgeText = isHttp ? v("method-post-text") : v("graph-async-receive-text");
  const badgeW = isHttp ? 38 : 70;
  return (
    <g>
      <rect
        x={n.x}
        y={n.y}
        width={n.w}
        height={H}
        rx="8"
        style={{ fill: v("graph-node-bg"), stroke: v(`graph-${n.kind}-fg`) }}
        strokeWidth="1.5"
      />
      <rect x={n.x} y={n.y} width="5" height={H} rx="2.5" style={{ fill: v(`graph-${n.kind}-fg`) }} />
      <text x={n.x + 16} y={n.y + 22} className="font-mono" fontSize="12.5" fontWeight="600" style={{ fill: v("text-default") }}>
        {n.id}
      </text>
      <rect
        x={n.x + 16}
        y={n.y + 31}
        width={badgeW}
        height="15"
        rx="4"
        style={{ fill: badgeBg, stroke: isHttp ? "none" : v("graph-async-receive-fg") }}
        strokeWidth="1"
      />
      <text
        x={n.x + 16 + badgeW / 2}
        y={n.y + 42}
        textAnchor="middle"
        className="font-mono"
        fontSize="9.5"
        fontWeight="700"
        style={{ fill: badgeText }}
      >
        {n.badge}
      </text>
      <text x={n.x + 22 + badgeW} y={n.y + 42.5} className="font-sans" fontSize="11" style={{ fill: v("text-muted") }}>
        {n.meta}
      </text>
    </g>
  );
}

function Pill({ x, y, w, label, kind }: { x: number; y: number; w: number; label: string; kind: "input" | "output" | "failure" }) {
  const fg = kind === "failure" ? v("graph-failure-fg") : v(`graph-${kind}-fg`);
  const bg = kind === "failure" ? v("graph-failure-bg") : v(`graph-${kind}-bg`);
  const text = kind === "failure" ? v("graph-failure-text") : v(`graph-${kind}-text`);
  return (
    <g>
      <rect x={x} y={y} width={w} height="30" rx="15" style={{ fill: bg, stroke: fg }} strokeWidth="1.5" />
      <text x={x + w / 2} y={y + 19.5} textAnchor="middle" className="font-sans" fontSize="11.5" fontWeight="600" style={{ fill: text }}>
        {label}
      </text>
    </g>
  );
}

const seq = { stroke: v("graph-sequence-fg"), strokeWidth: 1.5, fill: "none" } as const;
const dep = {
  stroke: v("graph-depends-on-fg"),
  strokeWidth: 2.25,
  strokeDasharray: "0.5 4.5",
  strokeLinecap: "round",
  fill: "none",
} as const;
const fail = { stroke: v("graph-failure-fg"), strokeWidth: 1.5, strokeDasharray: "6 4", fill: "none" } as const;

export default function WorkflowGraphPreview() {
  return (
    <figure className="m-0">
      <svg
        viewBox="0 0 420 610"
        className="w-full h-auto max-w-[420px] mx-auto block"
        role="img"
        aria-labelledby="otc-title otc-desc"
      >
        <title id="otc-title">Workflow graph of orderToCash</title>
        <desc id="otc-desc">
          Inputs, then createOrder, then awaitOrderConfirmation (AsyncAPI receive, fails on timeout), then capturePayment.
          createInvoice and createShipment both depend on capturePayment and join before closeOrder, then outputs.
        </desc>
        <defs>
          <marker id="otc-arrow-seq" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0L10 5L0 10z" style={{ fill: v("graph-sequence-fg") }} />
          </marker>
          <marker id="otc-arrow-dep" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0L10 5L0 10z" style={{ fill: v("graph-depends-on-fg") }} />
          </marker>
          <marker id="otc-arrow-fail" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0L10 5L0 10z" style={{ fill: v("graph-failure-fg") }} />
          </marker>
        </defs>

        {/* edges */}
        <path d="M210 42 V70" style={seq} markerEnd="url(#otc-arrow-seq)" />
        <path d="M210 126 V160" style={seq} markerEnd="url(#otc-arrow-seq)" />
        <path d="M210 216 V250" style={seq} markerEnd="url(#otc-arrow-seq)" />
        <path d="M320 189 C 345 189, 360 200, 360 226" style={fail} markerEnd="url(#otc-arrow-fail)" />
        <path d="M190 306 C 190 330, 105 326, 105 354" style={dep} markerEnd="url(#otc-arrow-dep)" />
        <path d="M230 306 C 230 330, 315 326, 315 354" style={dep} markerEnd="url(#otc-arrow-dep)" />
        <path d="M105 410 C 105 436, 190 440, 203 448" style={dep} />
        <path d="M315 410 C 315 436, 230 440, 217 448" style={dep} />
        <path d="M210 459 V484" style={dep} markerEnd="url(#otc-arrow-dep)" />
        <path d="M210 540 V566" style={seq} markerEnd="url(#otc-arrow-seq)" />

        {/* edge labels */}
        <text x="232" y="333" className="font-mono" fontSize="10.5" style={{ fill: v("graph-depends-on-text") }}>
          dependsOn
        </text>

        <Pill x={150} y={12} w={120} label="inputs · 3" kind="input" />
        {NODES.map((n) => (
          <Node key={n.id} n={n} />
        ))}
        {/* dependsOn junction */}
        <circle cx="210" cy="452" r="7" style={{ fill: v("graph-depends-on-bg"), stroke: v("graph-depends-on-fg") }} strokeWidth="2" />
        <Pill x={322} y={228} w={92} label="✗ timeout" kind="failure" />
        <Pill x={140} y={568} w={140} label="outputs · 6" kind="output" />
      </svg>
      <figcaption className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-ce-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm border-[1.5px] border-[var(--ce-graph-step-http-fg)] bg-[var(--ce-graph-step-http-bg)]" />
          HTTP step
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm border-[1.5px] border-[var(--ce-graph-async-receive-fg)] bg-[var(--ce-graph-async-receive-bg)]" />
          AsyncAPI receive
        </span>
        <span className="inline-flex items-center gap-1.5">
          <svg width="22" height="6" aria-hidden="true">
            <path d="M2 3H20" style={dep} />
          </svg>
          dependsOn
        </span>
        <span className="inline-flex items-center gap-1.5">
          <svg width="22" height="6" aria-hidden="true">
            <path d="M1 3H21" style={fail} />
          </svg>
          failure
        </span>
      </figcaption>
    </figure>
  );
}
