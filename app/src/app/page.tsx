import type { Metadata } from "next";
import Link from "next/link";
import { BrandLockup, ConnEthics } from "@/components/landing/BrandLockup";
import WorkflowGraphPreview from "@/components/landing/WorkflowGraphPreview";
import DocPreview from "@/components/landing/DocPreview";
import CodeWindow, { kv, type Line } from "@/components/landing/CodeWindow";
import {
  ArrowRightIcon,
  BookIcon,
  BotIcon,
  CheckCircleIcon,
  CheckIcon,
  CodeIcon,
  DownloadIcon,
  EventsIcon,
  ExternalIcon,
  GitHubIcon,
  HandshakeIcon,
  JoinIcon,
  LayersIcon,
  RepeatIcon,
  SelectorIcon,
  ShieldCheckIcon,
  SparklesIcon,
  TestIcon,
} from "@/components/landing/icons";

export const metadata: Metadata = {
  title: {
    absolute: "Arazzo Studio by ConnEthics — API workflows humans can read and machines can run",
  },
  description:
    "Edit, visualize and document Arazzo 1.1 API workflows in your browser: OpenAPI and AsyncAPI steps, dependsOn, Selectors, validation against the official schema. Free to use, MIT-licensed core packages.",
};

// ---------------------------------------------------------------------------
// Links
// ---------------------------------------------------------------------------

const STUDIO = "/builder";
const MARKETPLACE = "https://marketplace.visualstudio.com/items?itemName=connethics.arazzo-vscode";
const REPO = "https://github.com/connEthics/arazzo-demo";
const VSCODE_REPO = "https://github.com/connEthics/arazzo-vscode";
const EXAMPLES_TREE = `${REPO}/tree/main/app/public/workflows`;
const SPEC = "https://spec.openapis.org/arazzo/v1.1.0.html";
const CONNETHICS = "https://www.connethics.com";

// ---------------------------------------------------------------------------
// Shared styles
// ---------------------------------------------------------------------------

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ce-focus";
const btnPrimary = `inline-flex items-center justify-center gap-2 rounded-xl bg-ce-primary-solid px-6 py-3 font-semibold text-ce-on-primary shadow-[var(--ce-shadow-md)] transition-colors hover:bg-ce-primary-solid-hover ${focusRing}`;
const btnSecondary = `inline-flex items-center justify-center gap-2 rounded-xl border border-ce-border bg-ce-raised px-6 py-3 font-semibold text-ce-text transition-colors hover:bg-ce-hover hover:border-ce-border-strong ${focusRing}`;
const textLink = `inline-flex items-center gap-1.5 font-medium text-ce-link underline-offset-4 hover:underline ${focusRing} rounded`;
const eyebrow = "text-sm font-semibold uppercase tracking-wider text-ce-primary";
const h2 = "text-3xl sm:text-4xl font-bold tracking-tight text-ce-text";
const lead = "text-lg text-ce-muted";

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------

const features = [
  {
    icon: <EventsIcon />,
    title: "AsyncAPI steps",
    tag: "new in 1.1",
    description:
      "Put event-driven steps next to HTTP calls: channelPath, action send / receive, correlationId and timeout. Each kind has its own shape, color and icon in the graph.",
  },
  {
    icon: <JoinIcon />,
    title: "dependsOn, fan-out and join",
    tag: "new in 1.1",
    description:
      "Steps that wait for several others meet at a junction. dependsOn edges use their own dotted pattern, so you can tell them apart without relying on color.",
  },
  {
    icon: <SelectorIcon />,
    title: "Selector Objects",
    tag: "new in 1.1",
    description:
      "Extract values with JSONPath (RFC 9535), XPath or JSON Pointer, with the expression type and version declared, and see them exactly as written.",
  },
  {
    icon: <ShieldCheckIcon />,
    title: "Official schema validation",
    tag: "1.1 + 1.0",
    description:
      "Documents are checked against the official OpenAPI Initiative JSON Schema, then against semantic rules: unknown steps or sources, dependsOn cycles, unresolved expressions.",
  },
  {
    icon: <RepeatIcon />,
    title: "Reusable workflows",
    tag: "new in 1.1",
    description:
      "Failure and success actions can call another workflow with parameters, for example renew the session, then retry. $self gives the document a stable identity.",
  },
  {
    icon: <LayersIcon />,
    title: "YAML, graph and docs in sync",
    tag: "Studio",
    description:
      "Edit in a Monaco YAML editor, click a node to inspect its step, switch to generated documentation, and export the diagram to Mermaid.",
  },
];

type UseCase = {
  icon: React.ReactNode;
  title: string;
  pitch: string;
  body: string;
  note: string;
  examples: { label: string; detail: string; href: string }[];
};

const useCases: UseCase[] = [
  {
    icon: <BotIcon />,
    title: "MCP tools for AI agents",
    pitch: "Agents choose the intent; workflows guarantee the sequence.",
    body: "Expose a few reviewed workflows as MCP tools instead of one tool per endpoint. Retries and failure paths are declared once, on the server side.",
    note: "MCP is not an Arazzo step type: an MCP server reads the workflow and runs it.",
    examples: [
      {
        label: "mcp-travel-booking",
        detail: "quote_trip (read-only) and book_trip, with compensations",
        href: "/workflows/mcp-travel-booking/mcp-travel-booking.arazzo.yaml",
      },
      {
        label: "mcp-support-refund",
        detail: "eligibility, refund, then an AsyncAPI send",
        href: "/workflows/mcp-support-refund/mcp-support-refund.arazzo.yaml",
      },
    ],
  },
  {
    icon: <TestIcon />,
    title: "Executable end-to-end tests",
    pitch: "Reads like a spec, runs like a test.",
    body: "Success criteria, retries and timeouts are part of the document, so an Arazzo runner can play the journey in CI against a mock or a sandbox.",
    note: "Runner support for 1.1 varies. Each example documents what was actually run.",
    examples: [
      {
        label: "e2e-order-to-cash",
        detail: "receive with timeout, dependsOn fan-out and join",
        href: "/workflows/e2e-order-to-cash/e2e-order-to-cash.arazzo.yaml",
      },
      {
        label: "e2e-session-renewal",
        detail: "401, reusable renewSession workflow, retry",
        href: "/workflows/e2e-session-renewal/e2e-session-renewal.arazzo.yaml",
      },
    ],
  },
  {
    icon: <HandshakeIcon />,
    title: "Partner integration docs",
    pitch: "Document the journey, not just the endpoints.",
    body: "Turn the integration knowledge that lives in wikis and people's heads into a versioned journey that partners can read, review and run on a sandbox.",
    note: "The graph and the documentation are generated from the same file.",
    examples: [
      {
        label: "e2e-onboarding-entreprise-fr",
        detail: "company lookup, KYC, account, webhook",
        href: "/workflows/e2e-onboarding-entreprise-fr/e2e-onboarding-entreprise-fr.arazzo.yaml",
      },
      {
        label: "ecommerce-onboarding",
        detail: "three APIs, Selector Objects",
        href: "/workflows/ecommerce-onboarding.arazzo.yaml",
      },
    ],
  },
];

const vscodeLines: Line[] = [
  kv("arazzo", "1.1.0"),
  { tokens: [{ t: "workflows", k: "key" }, { t: ":" }] },
  kv("workflowId", "orderToCash", { dash: true, indent: 2 }),
  { tokens: [{ t: "steps", k: "key" }, { t: ":" }], indent: 4 },
  kv("stepId", "awaitOrderConfirmation", { dash: true, indent: 6 }),
  kv("operationId", ">-", { indent: 8, kind: "com" }),
  { tokens: [{ t: "$sourceDescriptions.orderEvents.receiveOrderConfirmed", k: "str" }], indent: 10 },
  kv("action", "receive", { indent: 8, kind: "kw", highlight: true }),
  kv("correlationId", "$steps.createOrder.outputs.orderId", { indent: 8, highlight: true }),
  kv("timeout", "6000", { indent: 8, kind: "num", highlight: true }),
  { tokens: [{ t: "dependsOn", k: "key" }, { t: ": [" }, { t: "createOrder", k: "str" }, { t: "]" }], indent: 8 },
  { tokens: [] },
];

const skillLines: Line[] = [
  { tokens: [{ t: "# Arazzo 1.1 Skill File", k: "head" }] },
  { tokens: [] },
  { tokens: [{ t: "> For AI coding assistants (Claude Code, Cursor,", k: "com" }] },
  { tokens: [{ t: "> GitHub Copilot, Cline…): how to write, review", k: "com" }] },
  { tokens: [{ t: "> and fix Arazzo workflow documents, expose them", k: "com" }] },
  { tokens: [{ t: "> as MCP tools and run them as E2E tests.", k: "com" }] },
  { tokens: [] },
  { tokens: [{ t: "| Current version | ", k: undefined }, { t: "**1.1.0**", k: "str" }, { t: " |" }], highlight: true },
  { tokens: [{ t: "| Sources | OpenAPI, " }, { t: "AsyncAPI", k: "str" }, { t: " |" }], highlight: true },
  { tokens: [] },
];

const whatLines: Line[] = [
  kv("arazzo", "1.1.0"),
  { tokens: [{ t: "info", k: "key" }, { t: ":" }] },
  kv("title", "Order to cash", { indent: 2 }),
  kv("version", "1.0.0", { indent: 2 }),
  { tokens: [{ t: "sourceDescriptions", k: "key" }, { t: ":" }] },
  kv("name", "commerce", { dash: true, indent: 2 }),
  kv("type", "openapi", { indent: 4, kind: "kw" }),
  kv("name", "orderEvents", { dash: true, indent: 2 }),
  kv("type", "asyncapi", { indent: 4, kind: "kw", highlight: true }),
  { tokens: [{ t: "workflows", k: "key" }, { t: ":" }] },
  kv("workflowId", "orderToCash", { dash: true, indent: 2 }),
  { tokens: [{ t: "steps", k: "key" }, { t: ":" }], indent: 4 },
  kv("stepId", "closeOrder", { dash: true, indent: 6 }),
  kv("operationId", "$sourceDescriptions.commerce.closeOrder", { indent: 8 }),
  {
    tokens: [{ t: "dependsOn", k: "key" }, { t: ": [" }, { t: "createInvoice", k: "str" }, { t: ", " }, { t: "createShipment", k: "str" }, { t: "]" }],
    indent: 8,
    highlight: true,
  },
  { tokens: [{ t: "successCriteria", k: "key" }, { t: ":" }], indent: 8 },
  kv("condition", "$statusCode == 200", { dash: true, indent: 10 }),
];

// ---------------------------------------------------------------------------
// Small building blocks
// ---------------------------------------------------------------------------

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <CheckIcon className="mt-0.5 h-5 w-5 shrink-0 text-ce-primary" />
      <span className="text-ce-muted">{children}</span>
    </li>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-ce-sunken px-1.5 py-0.5 font-mono text-[0.85em] text-ce-text [font-variant-ligatures:none]">{children}</code>
  );
}

/** Decorative tapestry background: blue warp and orange weft threads, very low opacity. */
function Tapestry({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 ${className}`}
      style={{
        backgroundImage: [
          "repeating-linear-gradient(90deg, transparent 0 46px, color-mix(in oklab, var(--ce-primary) 9%, transparent) 46px 52px)",
          "repeating-linear-gradient(0deg, transparent 0 46px, color-mix(in oklab, var(--ce-accent-brand) 7%, transparent) 46px 52px)",
        ].join(", "),
        maskImage: "radial-gradient(ellipse 80% 70% at 70% 30%, black 10%, transparent 75%)",
        WebkitMaskImage: "radial-gradient(ellipse 80% 70% at 70% 30%, black 10%, transparent 75%)",
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-ce-canvas font-sans text-ce-text">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-ce-primary-solid focus:px-4 focus:py-2 focus:text-ce-on-primary"
      >
        Skip to content
      </a>

      {/* Navigation */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-ce-border bg-ce-canvas/85 backdrop-blur-lg">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8" aria-label="Main">
          <Link href="/" className={`rounded-lg ${focusRing}`} aria-label="Arazzo Studio by ConnEthics, home">
            <BrandLockup size={34} />
          </Link>
          <div className="flex items-center gap-2 sm:gap-6">
            <div className="hidden items-center gap-6 text-sm font-medium text-ce-muted lg:flex">
              <a href="#features" className={`hover:text-ce-text ${focusRing} rounded`}>Features</a>
              <a href="#use-cases" className={`hover:text-ce-text ${focusRing} rounded`}>Use cases</a>
              <a href="#vscode" className={`hover:text-ce-text ${focusRing} rounded`}>VS Code</a>
              <a href="#ai-skill" className={`hover:text-ce-text ${focusRing} rounded`}>AI skill</a>
            </div>
            <a
              href={REPO}
              target="_blank"
              rel="noopener noreferrer"
              className={`hidden rounded-lg p-2 text-ce-muted transition-colors hover:text-ce-text sm:block ${focusRing}`}
              aria-label="Arazzo Studio on GitHub"
            >
              <GitHubIcon className="h-6 w-6" />
            </a>
            <Link
              href={STUDIO}
              className={`rounded-lg bg-ce-primary-solid px-3.5 py-2 text-sm font-semibold text-ce-on-primary transition-colors hover:bg-ce-primary-solid-hover sm:px-4 ${focusRing}`}
            >
              Open Studio
            </Link>
          </div>
        </nav>
      </header>

      <main id="main">
        {/* Hero */}
        <section className="relative overflow-hidden px-4 pb-16 pt-28 sm:px-6 sm:pt-32 lg:px-8 lg:pb-24">
          <Tapestry />
          <div className="relative mx-auto grid max-w-7xl items-center [&>*]:min-w-0 gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
            <div className="text-center lg:text-left">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-ce-border bg-ce-raised px-3.5 py-1.5 text-sm font-medium text-ce-muted shadow-[var(--ce-shadow-xs)]">
                <span className="h-2 w-2 rounded-full bg-ce-accent-brand" aria-hidden="true" />
                <span>
                  Now with <span className="font-mono text-ce-text">arazzo: 1.1.0</span>
                </span>
              </div>

              <h1 className="mb-6 text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
                API workflows humans can read and <span className="text-ce-primary">machines can run</span>.
              </h1>

              <p className={`${lead} mx-auto mb-8 max-w-2xl lg:mx-0`}>
                Arazzo Studio is a free, in-browser editor for{" "}
                <a href={SPEC} target="_blank" rel="noopener noreferrer" className="font-medium text-ce-link underline underline-offset-4">
                  Arazzo
                </a>
                , the OpenAPI Initiative standard for multi-step API workflows. Write the YAML, see the graph, publish the
                docs. The same file can then run as an end-to-end test and back a dependable tool for your AI agents.
              </p>

              <div className="flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center lg:justify-start">
                <Link href={STUDIO} className={`group ${btnPrimary} text-lg`}>
                  Open Arazzo Studio
                  <ArrowRightIcon className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <a href={MARKETPLACE} target="_blank" rel="noopener noreferrer" className={`${btnSecondary} text-lg`}>
                  <CodeIcon className="h-5 w-5" />
                  Install for VS Code
                </a>
              </div>

              <p className="mt-5 text-sm text-ce-subtle">
                No sign-up. Free to use · MIT-licensed core packages.
              </p>
            </div>

            <div className="relative">
              <div className="rounded-2xl border border-ce-border bg-ce-raised p-1.5 shadow-[var(--ce-shadow-xl)]">
                <div className="flex items-center gap-2 rounded-t-xl border-b border-ce-border bg-ce-surface px-4 py-2.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-ce-border-strong/40" aria-hidden="true" />
                  <span className="h-2.5 w-2.5 rounded-full bg-ce-border-strong/40" aria-hidden="true" />
                  <span className="h-2.5 w-2.5 rounded-full bg-ce-border-strong/40" aria-hidden="true" />
                  <span className="ml-2 truncate rounded-md bg-ce-sunken px-3 py-0.5 font-mono text-xs text-ce-muted">
                    arazzo.connethics.com/builder
                  </span>
                </div>
                <div className="rounded-b-xl bg-ce-canvas px-3 pb-5 pt-5 sm:px-6">
                  <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-mono text-sm font-semibold text-ce-text">orderToCash</span>
                    <span className="text-xs text-ce-subtle">e2e-order-to-cash.arazzo.yaml</span>
                  </div>
                  <WorkflowGraphPreview />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Compliance strip */}
        <section aria-label="Specification support" className="border-y border-ce-border bg-ce-surface">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-center gap-4 px-4 py-6 text-sm sm:px-6 md:flex-row md:flex-wrap md:gap-x-10 lg:px-8">
            <div className="flex items-center gap-2.5">
              <span className="rounded-md bg-ce-primary-subtle px-2 py-0.5 font-mono text-sm font-semibold text-ce-primary-subtle-text">
                Arazzo 1.1.0
              </span>
              <span className="font-medium text-ce-text">Built for the current specification</span>
            </div>
            <div className="flex items-center gap-2 text-ce-muted">
              <CheckCircleIcon className="h-5 w-5 text-ce-success" />
              Official OAI JSON Schema, 1.1 and 1.0
            </div>
            <div className="flex items-center gap-2 text-ce-muted">
              <CheckCircleIcon className="h-5 w-5 text-ce-success" />
              Semantic rules beyond the schema
            </div>
            <Link href="/showcase" className={`group ${textLink}`}>
              View compliance matrix
              <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="scroll-mt-20 px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto mb-14 max-w-3xl text-center">
              <p className={eyebrow}>Features</p>
              <h2 className={`${h2} mt-3`}>Everything Arazzo 1.1 can say, made visible</h2>
              <p className={`${lead} mt-4`}>
                Events next to HTTP calls, explicit dependencies, precise data extraction, and a validator that knows the
                official schema.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {features.map((f) => (
                <article
                  key={f.title}
                  className="group rounded-2xl border border-ce-border bg-ce-raised p-6 transition-shadow hover:shadow-[var(--ce-shadow-md)]"
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-ce-primary-subtle text-ce-primary">
                      {f.icon}
                    </div>
                    <span className="rounded-full border border-ce-border px-2.5 py-0.5 text-xs font-medium text-ce-muted">
                      {f.tag}
                    </span>
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-ce-text">{f.title}</h3>
                  <p className="text-ce-muted">{f.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Documentation preview */}
        <section className="bg-ce-surface px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl items-center [&>*]:min-w-0 gap-12 lg:grid-cols-2">
            <div className="order-2 lg:order-1">
              <DocPreview />
            </div>
            <div className="order-1 lg:order-2">
              <p className={eyebrow}>Documentation</p>
              <h2 className={`${h2} mt-3 mb-5`}>Docs your partners can actually follow</h2>
              <p className={`${lead} mb-6`}>
                Turn a workflow into readable documentation: every step with its operation, dependencies, success
                criteria and outputs, rendered from the YAML you already maintain.
              </p>
              <ul className="space-y-3">
                <Bullet>Markdown descriptions, rendered as you write them</Bullet>
                <Bullet>Inputs and outputs shown as JSON Schema</Bullet>
                <Bullet>Success criteria and failure paths for each step</Bullet>
                <Bullet>Light and dark themes, printable</Bullet>
              </ul>
            </div>
          </div>
        </section>

        {/* Use cases */}
        <section id="use-cases" className="scroll-mt-20 px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto mb-14 max-w-3xl text-center">
              <p className={eyebrow}>Use cases</p>
              <h2 className={`${h2} mt-3`}>Write it once, use it three times</h2>
              <p className={`${lead} mt-4`}>
                The same Arazzo workflow documents the journey for your partners, runs as an end-to-end test in your CI,
                and becomes a dependable tool for your AI agents. Every example below is a real Arazzo 1.1.0 file you can
                open.
              </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              {useCases.map((u) => (
                <article key={u.title} className="flex flex-col rounded-2xl border border-ce-border bg-ce-raised p-6">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-ce-primary-subtle text-ce-primary">
                    {u.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-ce-text">{u.title}</h3>
                  <p className="mt-1 font-medium text-ce-primary">{u.pitch}</p>
                  <p className="mt-3 text-ce-muted">{u.body}</p>
                  <p className="mt-3 mb-5 text-sm text-ce-subtle">{u.note}</p>
                  <ul className="mt-auto space-y-2 border-t border-ce-border pt-5">
                    {u.examples.map((e) => (
                      <li key={e.href}>
                        <a
                          href={e.href}
                          className={`group block rounded-lg border border-ce-border px-3 py-2.5 transition-colors hover:border-ce-border-strong hover:bg-ce-hover ${focusRing}`}
                        >
                          <span className="flex items-center justify-between gap-2">
                            <span className="truncate font-mono text-sm font-semibold text-ce-link">{e.label}</span>
                            <ExternalIcon className="h-4 w-4 shrink-0 text-ce-subtle" />
                          </span>
                          <span className="mt-0.5 block text-sm text-ce-muted">{e.detail}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>

            <p className="mt-8 text-center">
              <a href={EXAMPLES_TREE} target="_blank" rel="noopener noreferrer" className={`group ${textLink}`}>
                Browse all examples, with READMEs and run logs
                <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </a>
            </p>
          </div>
        </section>

        {/* VS Code extension */}
        <section id="vscode" className="scroll-mt-20 px-4 pb-20 sm:px-6 lg:px-8">
          <div className="relative mx-auto max-w-7xl overflow-hidden rounded-3xl border border-ce-border bg-ce-surface p-6 sm:p-10 lg:p-12">
            <Tapestry className="opacity-70" />
            <div className="relative grid items-center gap-12 [&>*]:min-w-0 lg:grid-cols-2">
              <div className="text-center lg:text-left">
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-ce-border bg-ce-raised px-3 py-1 text-sm font-medium text-ce-muted">
                  <CodeIcon className="h-4 w-4 shrink-0 text-ce-primary" />
                  <span>
                    Arazzo for VS Code — by <ConnEthics />
                  </span>
                </div>
                <h2 className={`${h2} mb-4`}>The same graph, inside your editor</h2>
                <p className={`${lead} mx-auto mb-8 max-w-xl lg:mx-0`}>
                  Validation as you type, the workflow graph and the documentation preview next to your YAML. Click a node to
                  jump to its step. The panels follow your VS Code theme.
                </p>
                <div className="flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center lg:justify-start">
                  <a href={MARKETPLACE} target="_blank" rel="noopener noreferrer" className={btnPrimary}>
                    <DownloadIcon className="h-5 w-5" />
                    Install from the Marketplace
                  </a>
                  <a href={VSCODE_REPO} target="_blank" rel="noopener noreferrer" className={btnSecondary}>
                    <GitHubIcon className="h-5 w-5" />
                    View source
                  </a>
                </div>
              </div>

              <div className="relative pb-8 lg:pb-0">
                <CodeWindow
                  filename="e2e-order-to-cash.arazzo.yaml"
                  lines={vscodeLines}
                  badge={
                    <div className="absolute -bottom-6 right-4 flex items-center gap-3 rounded-lg border border-ce-border bg-ce-raised p-3 shadow-[var(--ce-shadow-lg)] sm:-right-4">
                      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-ce-primary-subtle text-ce-primary">
                        <JoinIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-xs text-ce-muted">Live preview</div>
                        <div className="text-sm font-semibold text-ce-text">Workflow graph</div>
                      </div>
                    </div>
                  }
                />
              </div>
            </div>
          </div>
        </section>

        {/* AI skill file */}
        <section id="ai-skill" className="scroll-mt-20 px-4 pb-20 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl items-center [&>*]:min-w-0 gap-12 rounded-3xl border border-ce-border bg-ce-raised p-6 sm:p-10 lg:grid-cols-2 lg:p-12">
            <div className="order-2 relative pb-8 lg:order-1 lg:pb-0">
              <CodeWindow
                filename="arazzo.skill.md"
                lines={skillLines}
                badge={
                  <div className="absolute -bottom-6 right-4 flex items-center gap-3 rounded-lg border border-ce-border bg-ce-raised p-3 shadow-[var(--ce-shadow-lg)] sm:-right-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-ce-accent-subtle text-ce-accent-text">
                      <SparklesIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-xs text-ce-muted">One Markdown file</div>
                      <div className="text-sm font-semibold text-ce-text">Any coding assistant</div>
                    </div>
                  </div>
                }
              />
            </div>
            <div className="order-1 text-center lg:order-2 lg:text-left">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-ce-border bg-ce-surface px-3 py-1 text-sm font-medium text-ce-muted">
                <SparklesIcon className="h-4 w-4 text-ce-accent" />
                AI skill file · Arazzo 1.1
              </div>
              <h2 className={`${h2} mb-4`}>Teach your AI assistant Arazzo 1.1</h2>
              <p className={`${lead} mx-auto mb-8 max-w-xl lg:mx-0`}>
                Drop <Code>arazzo.skill.md</Code> into Claude Code, Cursor, GitHub Copilot or Cline. It covers the 1.1
                structure, AsyncAPI steps, <Code>dependsOn</Code> and Selectors, and how to expose workflows as MCP tools or
                run them as end-to-end tests.
              </p>
              <div className="flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center lg:justify-start">
                <a href="/arazzo.skill.md" download="arazzo.skill.md" className={btnPrimary}>
                  <DownloadIcon className="h-5 w-5" />
                  Download arazzo.skill.md
                </a>
                <a href={`${REPO}/blob/main/arazzo.skill.md`} target="_blank" rel="noopener noreferrer" className={btnSecondary}>
                  <GitHubIcon className="h-5 w-5" />
                  Read on GitHub
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* What is Arazzo */}
        <section className="bg-ce-surface px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl items-center [&>*]:min-w-0 gap-12 lg:grid-cols-2">
            <div>
              <p className={eyebrow}>What is Arazzo?</p>
              <h2 className={`${h2} mt-3 mb-5`}>Intent, not endpoints</h2>
              <p className={`${lead} mb-6`}>
                Your APIs expose verbs; your customers and agents are after outcomes. Arazzo, an open OpenAPI Initiative
                standard, describes the path between the two: the steps, the dependencies, the success criteria.
              </p>
              <ul className="space-y-3">
                <Bullet>Sequences of OpenAPI operations and, since 1.1, AsyncAPI channels</Bullet>
                <Bullet>Data passed between steps with runtime expressions and Selectors</Bullet>
                <Bullet>Success criteria, retries and failure paths, declared up front</Bullet>
                <Bullet>Reusable workflows, called from steps or from actions</Bullet>
              </ul>
              <p className="mt-6 rounded-xl border border-ce-border bg-ce-raised p-4 text-sm text-ce-muted">
                <span className="font-semibold text-ce-text">What it is not:</span> an execution engine. Runners and MCP
                servers do the running. Arazzo 1.1 has no loops, data transformations or human-approval steps yet; they are
                on the OpenAPI Initiative roadmap.
              </p>
              <a href={SPEC} target="_blank" rel="noopener noreferrer" className={`mt-6 ${textLink}`}>
                <BookIcon className="h-4 w-4" />
                Read the Arazzo 1.1.0 specification
                <ExternalIcon className="h-4 w-4" />
              </a>
            </div>
            <CodeWindow filename="order-to-cash.arazzo.yaml" lines={whatLines} />
          </div>
        </section>

        {/* ConnEthics CTA */}
        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl border border-[#1e293b] bg-[#0f172a] px-6 py-14 text-center sm:px-12">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage: [
                  "repeating-linear-gradient(90deg, transparent 0 58px, rgb(37 99 235 / 0.22) 58px 66px)",
                  "repeating-linear-gradient(0deg, transparent 0 58px, rgb(249 115 22 / 0.12) 58px 66px)",
                ].join(", "),
                maskImage: "radial-gradient(ellipse 70% 90% at 50% 100%, black, transparent 80%)",
                WebkitMaskImage: "radial-gradient(ellipse 70% 90% at 50% 100%, black, transparent 80%)",
              }}
            />
            <div className="relative">
              <p className="text-sm font-semibold uppercase tracking-wider text-[#fdba74]">Work with ConnEthics</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#f1f5f9] sm:text-4xl">
                Put Arazzo to work on your own APIs
              </h2>
              <p className="mx-auto mt-5 max-w-2xl text-lg text-[#cbd5e1]">
                ConnEthics helps teams map the integration journeys that matter, write them as Arazzo workflows, run them in
                CI and expose them safely to AI agents, with the governance that goes with it.
              </p>
              <div className="mt-9 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
                <a
                  href={CONNETHICS}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2563eb] px-6 py-3 text-lg font-semibold text-white transition-colors hover:bg-[#1d4ed8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#60a5fa]"
                >
                  Talk to ConnEthics
                  <ExternalIcon className="h-5 w-5" />
                </a>
                <Link
                  href={STUDIO}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#475569] px-6 py-3 text-lg font-semibold text-[#f1f5f9] transition-colors hover:bg-[#1e293b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#60a5fa]"
                >
                  Open Arazzo Studio
                  <ArrowRightIcon className="h-5 w-5" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-ce-border bg-ce-surface px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
            <div className="max-w-sm">
              <BrandLockup variant="stacked" size={40} />
              <p className="mt-4 text-sm text-ce-muted">Free to use · MIT-licensed core packages:</p>
              <ul className="mt-1.5 space-y-0.5 font-mono text-[13px] text-ce-muted">
                <li>@connethics/arazzo-core</li>
                <li>@connethics/arazzo-flow</li>
              </ul>
            </div>
            <nav aria-label="Footer" className="grid grid-cols-2 gap-x-12 gap-y-3 text-sm sm:grid-cols-3">
              <Link href={STUDIO} className={`text-ce-muted hover:text-ce-text ${focusRing} rounded`}>Arazzo Studio</Link>
              <Link href="/showcase" className={`text-ce-muted hover:text-ce-text ${focusRing} rounded`}>Showcase</Link>
              <a href={MARKETPLACE} target="_blank" rel="noopener noreferrer" className={`text-ce-muted hover:text-ce-text ${focusRing} rounded`}>
                VS Code extension
              </a>
              <a href={EXAMPLES_TREE} target="_blank" rel="noopener noreferrer" className={`text-ce-muted hover:text-ce-text ${focusRing} rounded`}>
                Examples
              </a>
              <a href={REPO} target="_blank" rel="noopener noreferrer" className={`text-ce-muted hover:text-ce-text ${focusRing} rounded`}>
                GitHub
              </a>
              <a href={SPEC} target="_blank" rel="noopener noreferrer" className={`text-ce-muted hover:text-ce-text ${focusRing} rounded`}>
                Arazzo 1.1.0 spec
              </a>
              <a href={CONNETHICS} target="_blank" rel="noopener noreferrer" className={`text-ce-muted hover:text-ce-text ${focusRing} rounded`}>
                ConnEthics
              </a>
              <a href={`${CONNETHICS}/privacy`} target="_blank" rel="noopener noreferrer" className={`text-ce-muted hover:text-ce-text ${focusRing} rounded`}>
                Privacy
              </a>
            </nav>
          </div>
          <div className="mt-10 flex flex-col gap-2 border-t border-ce-border pt-6 text-xs text-ce-subtle sm:flex-row sm:justify-between">
            <p>© 2026 ConnEthics.</p>
            <p>
              Arazzo is a specification of the OpenAPI Initiative. Arazzo Studio is an independent tool, not an official OAI
              product.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
