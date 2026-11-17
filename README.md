# Arazzo Studio by ConnEthics

**API workflows humans can read and machines can run.**

Arazzo Studio is a free, in-browser editor for [Arazzo](https://spec.openapis.org/arazzo/v1.1.0.html) **1.1**, the OpenAPI Initiative standard for multi-step API workflows. Write the YAML, see the workflow graph, generate the documentation. The same file can then run as an end-to-end test with an Arazzo runner and back a tool for your AI agents.

👉 **[arazzo.connethics.com](https://arazzo.connethics.com)** · editor at [`/builder`](https://arazzo.connethics.com/builder)

![Arazzo 1.1.0](https://img.shields.io/badge/Arazzo-1.1.0-2563eb)
![Next.js](https://img.shields.io/badge/Next.js-16-0f172a?logo=next.js)
![Core packages: MIT](https://img.shields.io/badge/core%20packages-MIT-2563eb)
![App: source-available](https://img.shields.io/badge/app-source--available-64748b)

![Arazzo Studio landing page](app/public/screenshots/v2/landing-desktop-light.png)

## What it does

- **Arazzo 1.1.0**, backward compatible with 1.0.x.
- **AsyncAPI steps**: `channelPath`, `action: send | receive`, `correlationId`, `timeout`, next to OpenAPI operations.
- **`dependsOn`**: fan-out and join, drawn with a dedicated dotted edge and a junction node.
- **Selector Objects**: JSONPath (RFC 9535), XPath and JSON Pointer, with the declared expression type.
- **Validation** against the official OpenAPI Initiative JSON Schema (1.1 and 1.0), plus semantic rules (unknown steps or sources, `dependsOn` cycles, unresolved expressions).
- **YAML, graph and documentation in sync**: Monaco editor, interactive graph, generated docs, Mermaid export.

Related tools from ConnEthics:

- **Arazzo for VS Code — by ConnEthics**: validation, graph and documentation preview in your editor ([Marketplace](https://marketplace.visualstudio.com/items?itemName=connethics.arazzo-vscode), [source](https://github.com/connEthics/arazzo-vscode)).
- **AI skill file** [`arazzo.skill.md`](arazzo.skill.md): teaches Claude Code, Cursor, GitHub Copilot or Cline to write and review Arazzo 1.1, expose workflows as MCP tools and run them as E2E tests.

## Monorepo structure

```
arazzo-demo/
├── app/                          # Arazzo Studio (Next.js 16, App Router) — not an npm workspace member
│   ├── src/
│   │   ├── app/                  # Routes: / (landing), /builder (Studio), /showcase
│   │   ├── components/           # UI components (landing/ = landing page sections)
│   │   ├── features/builder/     # Studio: editor, canvas, inspectors
│   │   ├── lib/                  # Parsing, Mermaid and swimlane converters
│   │   └── styles/brand-tokens.css  # ConnEthics design tokens (--ce-*)
│   └── public/
│       ├── workflows/            # Arazzo 1.1.0 examples (see below)
│       ├── openapi/              # OpenAPI stubs for the historical examples
│       └── arazzo.skill.md       # AI skill file served by the landing page
├── packages/
│   ├── arazzo-core/              # @connethics/arazzo-core — types, parsing, validation, graph model, Mermaid (MIT)
│   └── arazzo-flow/              # @connethics/arazzo-flow — read-only React workflow graph (MIT)
├── scripts/sync-shared.mjs       # Copies core/flow into arazzo-vscode and the ConnEthics website
├── docs/                         # Arazzo reference and front-end architecture notes
└── arazzo.skill.md
```

The root `package.json` is an npm workspace for `packages/*` only. The Studio in `app/` is installed, built and deployed on its own.

## Examples

All examples are Arazzo **1.1.0** documents with their OpenAPI / AsyncAPI stubs, inputs and a README that records what was actually run. Index and validation details: [`app/public/workflows/README.md`](app/public/workflows/README.md).

| Use case | Example | Highlights |
|---|---|---|
| MCP tools for AI agents | [`mcp-travel-booking`](app/public/workflows/mcp-travel-booking/) | `quote_trip` (read-only) and `book_trip` with compensations, `mcp-tools.json` |
| MCP tools for AI agents | [`mcp-support-refund`](app/public/workflows/mcp-support-refund/) | Guard-rail `successCriteria`, AsyncAPI `send` |
| Executable E2E tests | [`e2e-order-to-cash`](app/public/workflows/e2e-order-to-cash/) | `receive` with `correlationId` and `timeout`, `dependsOn` fan-out and join, Selectors |
| Executable E2E tests | [`e2e-session-renewal`](app/public/workflows/e2e-session-renewal/) | Failure action calling a reusable workflow with `parameters`, retry |
| Partner integration docs | [`e2e-onboarding-entreprise-fr`](app/public/workflows/e2e-onboarding-entreprise-fr/) | Company lookup, KYC, account, webhook; `workflowId` step |
| Historical (migrated to 1.1) | [`pet-adoption`](app/public/workflows/pet-adoption.arazzo.yaml), [`ecommerce-onboarding`](app/public/workflows/ecommerce-onboarding.arazzo.yaml) | Loaded by the Studio demo; Selector Objects |

Once deployed, each file is also served at `https://arazzo.connethics.com/workflows/…`.

## Quick start

Prerequisites: Node.js 22 or later.

```bash
git clone https://github.com/connEthics/arazzo-demo.git
cd arazzo-demo

# Shared packages (optional, for core/flow development)
npm install
npm run build && npm test

# Arazzo Studio
cd app
npm install
npm run dev        # http://localhost:3000
npm run build && npm start
```

### Deploy to Vercel

Import the repository in [Vercel](https://vercel.com/new) and set the **root directory to `app`**. `vercel.json` serves `/workflows/*` with a YAML content type and CORS.

## Brand

Colors, typography and the Arazzo mark come from the ConnEthics design tokens (`app/src/styles/brand-tokens.css`, generated from `tokens.json`): primary blue `#2563eb`, orange as a decorative accent only, slate neutrals, Inter and JetBrains Mono. The page follows the system light or dark theme.

## License

This repository contains code under **two different licenses**:

| Part | License |
|---|---|
| `packages/arazzo-core` (`@connethics/arazzo-core`) | **MIT** © 2026 ConnEthics, see [`packages/arazzo-core/LICENSE`](packages/arazzo-core/LICENSE). The bundled JSON Schemas are the OpenAPI Initiative's (Apache-2.0). |
| `packages/arazzo-flow` (`@connethics/arazzo-flow`) | **MIT** © 2026 ConnEthics, see [`packages/arazzo-flow/LICENSE`](packages/arazzo-flow/LICENSE). |
| The Arazzo Studio application (`app/` and everything else) | The terms in [`LICENSE.md`](LICENSE.md), including its MIT exception for `app/src/components/arazzo/` ([conditions](app/src/components/arazzo/LICENSE)). |

**Using the hosted Studio at arazzo.connethics.com is free.** The application source is published so you can read and study it, but `LICENSE.md` does not grant the right to use, copy, modify or redistribute it without written authorization from ConnEthics. It is therefore *not* open source in the OSI sense.

**In progress:** ConnEthics intends to move the application to a source-available license with a defined path to open source (the Functional Source License, FSL-1.1-MIT, is under consideration). Until `LICENSE.md` is updated, it is the only text that applies to the application. For licensing questions: [connethics.com](https://www.connethics.com).

Third-party dependencies keep their own licenses: MIT (Next.js, React, React Flow, Mermaid, Monaco Editor, js-yaml, yaml, react-markdown, Tailwind CSS), EPL-2.0 (ELK.js), Apache-2.0 (TypeScript).

## Resources

- [Arazzo Specification 1.1.0](https://spec.openapis.org/arazzo/v1.1.0.html)
- [OpenAPI Initiative](https://www.openapis.org/)
- [Arazzo for VS Code — by ConnEthics](https://marketplace.visualstudio.com/items?itemName=connethics.arazzo-vscode)

---

<p align="center">
  Arazzo Studio by <a href="https://www.connethics.com">ConnEthics</a>.<br>
  Arazzo is a specification of the OpenAPI Initiative. Arazzo Studio is an independent tool, not an official OAI product.
</p>
