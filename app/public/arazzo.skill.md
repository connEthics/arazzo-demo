# Arazzo 1.1 Skill File

> **For AI coding assistants** (Claude Code, Cursor, GitHub Copilot, Cline…): how to write, review and fix
> [Arazzo](https://spec.openapis.org/arazzo/v1.1.0.html) workflow documents, expose them as MCP tools and
> run them as E2E tests. Maintained by **Arazzo Studio by ConnEthics** — https://arazzo.connethics.com

## What is Arazzo?

Arazzo is the OpenAPI Initiative standard for describing **sequences of API calls** (workflows): steps,
data flow between steps, success criteria, branching, retries and failure handling. It is readable by
humans, and deterministic for tools: code generators, test runners and agent servers.

| | |
|---|---|
| Current version | **1.1.0**, published 2026-05-17 |
| Spec | https://spec.openapis.org/arazzo/v1.1.0.html |
| JSON Schema 1.1 | `https://spec.openapis.org/arazzo/1.1/schema/2026-04-15` (accepts only `arazzo: 1.1.x`) |
| JSON Schema 1.0 | `https://spec.openapis.org/arazzo/1.0/schema/2025-10-15` (accepts only `arazzo: 1.0.x`) |
| Sources a step can target | OpenAPI operations, **AsyncAPI** operations or channels (new in 1.1), other Arazzo workflows |
| Not in 1.1 | MCP, A2A, gRPC or GraphQL step types, loops, functions, human-in-the-loop steps (all on the OAI **roadmap**) |

1.0.x documents stay valid 1.0.x documents. Tools pick the schema from the `arazzo` field, so a 1.1 feature
in a `1.0.x` document is an error, or is silently misread.

## Golden rules for assistants

1. New documents use `arazzo: 1.1.0`. Do not bump an existing 1.0.x file unless asked; if asked, see *Migrating*.
2. **Never invent `operationId`s.** Read the OpenAPI/AsyncAPI source and use the exact IDs it declares.
3. With **more than one** non-`arazzo` source, `operationId` **must** be qualified: `$sourceDescriptions.<source>.<operationId>`. Qualify it always; it is the portable form.
4. Read response data with **JSON Pointer**: `$response.body#/items/0/id`, not `$response.body.items[0].id`.
5. Every success or failure action needs both `name` and `type`.
6. Write assertions as **`simple` criteria with JSON Pointer**. It is the only form that behaves the same on every runner.
7. Keep IDs referenceable: `workflowId`, `stepId` and source `name` match `[A-Za-z0-9_-]+`. No dots, no spaces.
8. Say that Arazzo orchestrates APIs **behind** an MCP tool. Never say that Arazzo 1.1 calls MCP tools or A2A agents.

---

## Document skeleton

```yaml
arazzo: 1.1.0                          # REQUIRED, major.minor.patch
$self: https://example.com/flows/checkout.arazzo.yaml   # 1.1, optional: canonical URI, no '#fragment'
info:                                  # REQUIRED
  title: Checkout                      # REQUIRED
  version: 1.0.0                       # REQUIRED (version of this document)
  summary: One-line summary
  description: CommonMark allowed
sourceDescriptions:                    # REQUIRED, at least 1
  - name: shop                         # unique, [A-Za-z0-9_-]+
    url: ./shop.openapi.yaml           # relative or absolute URI
    type: openapi                      # openapi | asyncapi (1.1) | arazzo
workflows:                             # REQUIRED, at least 1
  - workflowId: checkout               # unique in the document
    summary: Buy a cart
    inputs:                            # JSON Schema (2020-12) of the workflow inputs
      type: object
      required: [cartId]
      properties:
        cartId: { type: string }
    dependsOn: []                      # workflowIds that must complete first (rarely needed)
    parameters: []                     # applied to every step
    successActions: []                 # defaults for every step
    failureActions: []
    steps:                             # REQUIRED, at least 1
      - stepId: getCart                # unique in the workflow
        operationId: $sourceDescriptions.shop.getCart
        parameters:
          - name: cartId
            in: path
            value: $inputs.cartId
        successCriteria:
          - condition: $statusCode == 200
        outputs:
          total: $response.body#/total
    outputs:
      total: $steps.getCart.outputs.total
components:                            # reusable, referenced with $components.<kind>.<key>
  inputs: {}                           # referenced with $ref: '#/components/inputs/<key>'
  parameters: {}
  successActions: {}
  failureActions: {}
```

## Step targets: exactly one per step

| Target | Source type | Form |
|---|---|---|
| `operationId` | `openapi` or `asyncapi` | `$sourceDescriptions.shop.createOrder` (a bare `createOrder` works only with a single source) |
| `operationPath` | `openapi` | `'{$sourceDescriptions.shop.url}#/paths/~1orders~1{orderId}/get'`, an escaped JSON Pointer |
| `channelPath` | `asyncapi` (1.1) | `'{$sourceDescriptions.events.url}#/channels/orderPlaced'`, always with `action` |
| `workflowId` | local or `arazzo` | `refreshSession`, or `$sourceDescriptions.<arazzoSource>.<workflowId>` for another document |

A step on an AsyncAPI source **must** declare `action: send | receive`. Never put `action`, `correlationId` or
`channelPath` on an OpenAPI step.

Calling another workflow from a step. Parameters map to the inputs of the called workflow and carry no `in`:

```yaml
- stepId: verifyCompany
  workflowId: verifyAndCreateAccount
  parameters:
    - name: siren
      value: $inputs.siren
  outputs:
    accountId: $outputs.accountId      # outputs of the called workflow
```

## Parameters

| `in` | Use |
|---|---|
| `path`, `query`, `header`, `cookie` | HTTP parameters, by name |
| `querystring` (1.1) | the **whole** query string as one string value; cannot coexist with `query` parameters on the same operation |
| `channel` | AsyncAPI channel address parameter (in the 1.1 schema; text clarified after 1.1.0) |
| *(omitted)* | only when the target is a `workflowId`: the parameter is a workflow input |

`value` is a literal, a runtime expression, a `{…}` interpolated string, or (1.1) a Selector Object.
In 1.1 a plain object literal (`value: {a: 1}`) is **rejected** by the schema: serialise it as a string or use a Selector.

## Runtime expressions

| Expression | Meaning |
|---|---|
| `$url`, `$method`, `$statusCode` | current HTTP call |
| `$request.header.X-Id`, `$request.query.q`, `$request.path.id`, `$request.body#/a/b` | request sent by the step |
| `$response.header.Location`, `$response.body`, `$response.body#/items/0/id` | response received |
| `$message.header.traceId`, `$message.payload#/orderId` | **1.1**, AsyncAPI message of the step |
| `$inputs.cartId`, `$inputs.customer#/email` | inputs of the current workflow |
| `$outputs.total` | outputs of the current workflow (in a `workflowId` step: of the called workflow) |
| `$steps.getCart.outputs.total` | a **declared** output of a step in the same workflow |
| `$workflows.checkout.outputs.total`, `$workflows.checkout.inputs.cartId` | another workflow of the document |
| `$sourceDescriptions.shop.url`, `$sourceDescriptions.shop.createOrder` | source field, or operation/workflow ID |
| `$components.parameters.page`, `$components.failureActions.retry503` | reusable objects (there is **no** `$components.inputs`) |
| `$self` | **1.1**, the canonical URI of this document |

- Interpolation: `value: Bearer {$steps.login.outputs.token}`. Structured values are serialised as JSON.
- `$steps.x.response…` and `$steps.x.request…` do not exist: declare an `outputs` entry and read `$steps.x.outputs.name`.
- `$response.body.a.b` is outside the 1.1 grammar. Write `$response.body#/a/b`.

## Success criteria

```yaml
successCriteria:                                  # all criteria must pass (logical AND)
  - condition: $statusCode == 201                 # simple (default type)
  - condition: $response.body#/status == 'pending'   # strings in single quotes, case-insensitive compare
  - condition: $inputs.amount <= $response.body#/maxRefundableAmount
  - context: $response.header.Location            # regex and jsonpath/xpath REQUIRE context
    condition: '^https://'
    type: regex
  - context: $response.body
    condition: $.items[?@.status == 'unpaid']     # 1.1: passes when the nodelist is non-empty
    type:
      type: jsonpath
      version: rfc9535
```

- Operators in `simple`: `== != < <= > >= && || !`, parentheses. `null` is falsy, and any evaluation error is a **fail**.
- Embed runtime expressions in `regex`, `jsonpath` and `xpath` conditions with `{…}`: `$[?@.id == '{$inputs.id}']`.
- If `successCriteria` is present, it must contain at least one criterion.

## Actions: `end`, `goto`, `retry`

```yaml
onSuccess:
  - name: skipShipping
    type: goto
    stepId: closeOrder                 # same workflow; OR workflowId: otherWorkflow
    criteria:
      - condition: $response.body#/digital == true
onFailure:
  - name: retryWhenBusy
    type: retry
    retryAfter: 2                      # SECONDS (not milliseconds)
    retryLimit: 3                      # default 1
    criteria:
      - condition: $statusCode == 503
  - name: giveUp
    type: end                          # stop: the workflow fails
  - reference: $components.failureActions.notifyOps   # reusable action
```

- Actions are evaluated in order, and the first one whose `criteria` match wins.
- Without `onSuccess`, the next step in the array runs. Without `onFailure`, the workflow fails.
- `stepId` and `workflowId` are mutually exclusive. A `goto` needs one of them.

---

## What's new in 1.1

### AsyncAPI sources, `send` and `receive`

```yaml
sourceDescriptions:
  - name: shop
    url: ./shop.openapi.yaml
    type: openapi
  - name: events
    url: ./shop.asyncapi.yaml          # AsyncAPI 3.0
    type: asyncapi
```

```yaml
- stepId: publishOrderPlaced           # send: done as soon as the message is published
  channelPath: '{$sourceDescriptions.events.url}#/channels/orderPlaced'
  action: send
  parameters:
    - name: traceId                    # message header
      in: header
      value: $inputs.traceId
  requestBody:                         # the message payload
    contentType: application/json
    payload:
      orderId: $steps.createOrder.outputs.orderId
```

- A `send` step completes on publication. Arazzo does not model broker acknowledgements.
- A `receive` step completes when a matching message arrives. It fails on `timeout`.

### `correlationId` (`receive` only)

```yaml
- stepId: awaitConfirmation
  operationId: $sourceDescriptions.events.receiveOrderConfirmed
  action: receive
  correlationId: $steps.createOrder.outputs.orderId   # matched against the AsyncAPI message correlationId
  timeout: 6000
  successCriteria:
    - condition: $message.payload#/status == 'confirmed'
  outputs:
    warehouseId: $message.payload#/warehouseId
```

Declare a Correlation ID Object on the AsyncAPI message, for example `location: $message.payload#/orderId`.
Use `$message.*` in AsyncAPI steps only. `$statusCode`, `$response.*` and `$request.*` mean nothing there.

### `timeout`

An integer number of **milliseconds**, allowed on **any** step: HTTP, AsyncAPI or workflow. When it expires,
the step fails and `onFailure` runs. `timeout: "6s"` and `timeout: 1.5` are invalid. There is no default value,
so always set one on a `receive` step.

### Step-level `dependsOn`

```yaml
- stepId: createInvoice
  operationId: $sourceDescriptions.shop.createInvoice
  dependsOn: [awaitConfirmation]       # fan-out: invoice and shipment both wait for confirmation
- stepId: createShipment
  operationId: $sourceDescriptions.shop.createShipment
  dependsOn: [awaitConfirmation]
- stepId: closeOrder
  operationId: $sourceDescriptions.shop.closeOrder
  dependsOn: [createInvoice, createShipment]           # join: waits for both
```

- There are three valid forms: `stepId`, `$workflows.<wf>.steps.<step>` and `$sourceDescriptions.<arazzoSource>.<wf>.steps.<step>`.
- `$steps.x` is **invalid** here. The list cannot be empty, cannot contain duplicates, and cannot form a cycle.
- `dependsOn` creates a prerequisite and a join point. It does **not** trigger the referenced step.
- `$steps.x.outputs.*` references are implicit dependencies.
- Use `dependsOn` mainly with asynchronous steps. In a purely synchronous workflow, rely on array order.

### Selector Object

`{context, selector, type}`, with `jsonpath`, `xpath` or `jsonpointer`. It is allowed in workflow and step
`outputs`, in `Parameter.value`, in `requestBody.payload` and in `replacements[].value`. It is not allowed in criteria.

```yaml
outputs:
  invoiceNumber:
    context: $response.body
    selector: /invoice/number
    type: jsonpointer
  shippedSkus:
    context: $steps.closeOrder.outputs.summary
    selector: $.lines[?@.shipped == true].sku
    type:
      type: jsonpath
      version: rfc9535
```

### Expression Type Object

This object replaces the 1.0 *Criterion Expression Type Object*. It is used in Criterion `type`, Selector
`type` and `replacements[].targetSelectorType`.

| `type` | allowed `version` | default when only the string is given |
|---|---|---|
| `jsonpath` | `rfc9535`, `draft-goessner-dispatch-jsonpath-00` | `rfc9535` |
| `xpath` | `xpath-31`, `xpath-30`, `xpath-20`, `xpath-10` | `xpath-31` |
| `jsonpointer` | `rfc6901` (Selectors and replacements only, never a criterion) | `rfc6901` |

### `in: querystring`

```yaml
parameters:
  - name: invoiceFilter
    in: querystring                    # no other `in: query` parameter on this operation
    value: status=unpaid&sort=-dueDate&limit={$inputs.pageSize}
```

### `$self`

`$self` is a root field holding an absolute or relative URI-reference, without a fragment. It is the base URI
for relative references, and the **identity** other documents use to reference this one. Publish it at a stable
URL. Some runners (arazzo-cli) resolve relative source `url`s against `$self`.

### Reusing a workflow from an action

`retry` or `goto` with a `workflowId` can pass `parameters`, which map to the inputs of that workflow and carry
no `in`. With `retry`, the workflow runs first, then the current step is replayed, up to `retryLimit` times.

```yaml
onFailure:
  - name: refreshThenRetry
    type: retry
    workflowId: refreshSession
    parameters:
      - name: refreshToken
        value: $inputs.refreshToken
    retryAfter: 1
    retryLimit: 1
    criteria:
      - condition: $statusCode == 401
```

### Also clarified in 1.1

- The runtime-expression grammar was rewritten (identifiers, `#` JSON Pointer suffix, interpolation).
- Truthy and falsy semantics are defined per criterion type.
- `$sourceDescriptions.<name>.<ref>` resolves an operation or workflow ID first, then a source field.
- The `x-oai-`, `x-oas-` and `x-arazzo` extension prefixes are reserved, as they already were in 1.0.

### Putting it together (valid against the 1.1 schema)

```yaml
arazzo: 1.1.0
$self: https://example.com/flows/order-flow.arazzo.yaml
info:
  title: Order flow (Arazzo 1.1 tour)
  version: 1.0.0
sourceDescriptions:
  - name: shop
    url: ./shop.openapi.yaml
    type: openapi
  - name: events
    url: ./shop.asyncapi.yaml
    type: asyncapi
workflows:
  - workflowId: refreshSession
    summary: Exchange a refresh token for a new access token
    inputs:
      type: object
      required: [refreshToken]
      properties:
        refreshToken: { type: string }
    steps:
      - stepId: refresh
        operationId: $sourceDescriptions.shop.refreshToken
        requestBody:
          contentType: application/json
          payload:
            refreshToken: $inputs.refreshToken
        successCriteria:
          - condition: $statusCode == 200
        outputs:
          accessToken: $response.body#/accessToken
    outputs:
      accessToken: $steps.refresh.outputs.accessToken

  - workflowId: placeOrder
    summary: Order, wait for confirmation, then invoice and ship in parallel
    inputs:
      type: object
      required: [accessToken, refreshToken, sku, quantity]
      properties:
        accessToken: { type: string }
        refreshToken: { type: string }
        sku: { type: string }
        quantity: { type: integer, minimum: 1 }
    steps:
      - stepId: createOrder
        operationId: $sourceDescriptions.shop.createOrder
        parameters:
          - name: Authorization
            in: header
            value: Bearer {$inputs.accessToken}
        requestBody:
          contentType: application/json
          payload:
            sku: $inputs.sku
            quantity: $inputs.quantity
        successCriteria:
          - condition: $statusCode == 201
          - condition: $response.body#/status == 'pending'
        onFailure:
          - name: refreshThenRetry
            type: retry
            workflowId: refreshSession
            parameters:
              - name: refreshToken
                value: $inputs.refreshToken
            retryAfter: 1
            retryLimit: 1
            criteria:
              - condition: $statusCode == 401
        outputs:
          orderId: $response.body#/id
      - stepId: publishOrderPlaced
        channelPath: '{$sourceDescriptions.events.url}#/channels/orderPlaced'
        action: send
        requestBody:
          contentType: application/json
          payload:
            orderId: $steps.createOrder.outputs.orderId
      - stepId: awaitConfirmation
        operationId: $sourceDescriptions.events.receiveOrderConfirmed
        action: receive
        correlationId: $steps.createOrder.outputs.orderId
        timeout: 6000
        dependsOn: [publishOrderPlaced]
        successCriteria:
          - condition: $message.payload#/status == 'confirmed'
      - stepId: createInvoice
        operationId: $sourceDescriptions.shop.createInvoice
        dependsOn: [awaitConfirmation]
        requestBody:
          contentType: application/json
          payload:
            orderId: $steps.createOrder.outputs.orderId
        successCriteria:
          - condition: $statusCode == 201
      - stepId: createShipment
        operationId: $sourceDescriptions.shop.createShipment
        dependsOn: [awaitConfirmation]
        requestBody:
          contentType: application/json
          payload:
            orderId: $steps.createOrder.outputs.orderId
        successCriteria:
          - condition: $statusCode == 201
      - stepId: getOrderSummary
        operationId: $sourceDescriptions.shop.getOrder
        dependsOn: [createInvoice, createShipment]
        parameters:
          - name: orderId
            in: path
            value: $steps.createOrder.outputs.orderId
          - name: view
            in: querystring
            value: expand=lines,invoice
        successCriteria:
          - condition: $statusCode == 200
          - condition: $response.body#/status == 'closed'
        outputs:
          summary: $response.body
          invoiceNumber:
            context: $response.body
            selector: /invoice/number
            type: jsonpointer
    outputs:
      orderId: $steps.createOrder.outputs.orderId
      invoiceNumber: $steps.getOrderSummary.outputs.invoiceNumber
      shippedSkus:
        context: $steps.getOrderSummary.outputs.summary
        selector: $.lines[?@.shipped == true].sku
        type:
          type: jsonpath
          version: rfc9535
```

### Migrating 1.0.x to 1.1.0

1. Set `arazzo: 1.1.0` and add `$self`, the published URL of the document.
2. Replace object literals in `Parameter.value` with strings or Selectors. The 1.1 schema rejects them.
3. Move non-standard fields to `x-` extensions, for example `components.schemas` to `x-schemas`.
   `unevaluatedProperties: false` rejects unknown fields everywhere.
4. Rewrite `$response.body.a.b` as `$response.body#/a/b`, and qualify `operationId`s.
5. Optional: Goessner JSONPath filters become Selectors with `version: rfc9535`.

---

## Exposing a workflow as an MCP tool

**Pattern: one Arazzo workflow = one MCP tool.** An MCP server publishes a workflow as a tool. A deterministic
Arazzo engine runs the steps, retries and compensations behind it. The agent makes one call per intent and sees
only the final result, so no tokens are spent and no guesswork happens between steps.
Arazzo 1.1 **cannot call** an MCP tool: MCP step types are a roadmap item, not part of the spec.

### Mapping

| Arazzo (Workflow Object) | MCP `Tool` / `CallToolResult` | Rule |
|---|---|---|
| `workflowId` | `name` | identity by default; ≤ 128 chars, unique in the server |
| `summary` | `title`, `annotations.title` | copy |
| `summary` + `description` | `description` | action verb, side effects, preconditions, behaviour on failure, what not to do |
| `inputs` | `inputSchema` | `type: object`, `$ref`s inlined, **hidden inputs removed**, `additionalProperties: false`, a `description` on each property |
| `outputs` | `structuredContent` + `outputSchema` | declared outputs only, plus `status`, `correlationId` and `error`. The schema is derived from the OpenAPI response schemas, because Arazzo outputs are untyped |
| `successCriteria`, `onFailure` | `isError: true` + `error.code` | retries and compensations run **in the engine**. A business failure is `isError`, not a JSON-RPC error |
| HTTP methods of all reachable steps (including `onFailure` targets and sub-workflows), `action: send` | `annotations` | worst case, from the resolved OpenAPI and never guessed from the `operationId` |

### Naming rules

- Use one narrow business intent per workflow, named `verb_noun` in `snake_case`: `quote_trip`, `book_trip`, `issue_refund`.
- Stay inside `[A-Za-z0-9_-]`. MCP also allows `.`, but Arazzo IDs should not contain it.
  Add a namespace (`travel.book_trip`) at publication time and record the rename in the mapping.
- Always pair a **read-only preview** tool with the mutating one: `quote_trip` + `book_trip`, `check_refund_eligibility` + `issue_refund`.
- Never expose step IDs, host names or source URLs in names or descriptions.

### Annotations: always set all four

| Reachable steps | `readOnlyHint` | `destructiveHint` | `idempotentHint` |
|---|---|---|---|
| only `GET`, `HEAD`, `OPTIONS` (or AsyncAPI `receive`) | `true` | `false` | `true` |
| additive `POST` or `PATCH` | `false` | `false` | `false`, unless the idempotency key is derived from the tool arguments |
| any `PUT` or `DELETE`, compensation steps included | `false` | `true` | `true` if PUT/DELETE are the only mutations |
| financial, legal or irreversible effect (payment, refund, e-mail) | `false` | **`true`** (forced) | depends on the keys |

Keep `openWorldHint: true` unless every source is closed and internal. The MCP defaults are pessimistic, so never
rely on them. Annotations are hints for the client, not a security control.

### Guardrails

- **Opt-in.** Expose only workflows marked with the ConnEthics extension `x-connethics-mcp: { expose: tool }`.
  Never use the reserved `x-oai-`, `x-oas-` or `x-arazzo` prefixes, nor `x-mcp-*`.
- **Deterministic checks in the workflow.** Use `successCriteria` with caps (`$inputs.amount <= 500`),
  `onFailure: end` before any side effect, compensation steps, and an `Idempotency-Key` header.
- **Hidden inputs.** Credentials, payment tokens, idempotency keys and tenant IDs are injected by the server from a vault,
  a generator or a token claim. They never appear in `inputSchema`.
- **Human confirmation for destructive tools.** The MCP server runs the read-only preview, asks the user through
  elicitation, then runs the mutating workflow with locked inputs that `successCriteria` re-checks. If the client
  cannot elicit, the server refuses.
- **Two separate auth layers.** OAuth 2.1 between the MCP client and the server, with per-tool scopes. Separate
  credentials per `sourceDescription` between the engine and the APIs. **No token passthrough.**
- **Output whitelist.** Return only declared outputs. Never return raw bodies or free-text fields such as customer
  notes, which are prompt-injection vectors.
- **Review the mapping like code.** Commit it, review it in PRs, and use a digest of the Arazzo document to detect drift.

```yaml
- workflowId: issue_refund
  summary: Refund an eligible order and publish refund.issued
  x-connethics-mcp:                      # ConnEthics convention, not part of Arazzo or MCP
    expose: tool
    hiddenInputs: [idempotencyKey, agentId]
    confirmation:
      previewWorkflowId: check_refund_eligibility
    sideEffects:
      createRefund: financial
  inputs:
    type: object
    required: [orderId, amount, idempotencyKey, agentId]
    properties:
      orderId: { type: string, pattern: '^ORD-[0-9]{8}$' }
      amount: { type: number, exclusiveMinimum: 0, maximum: 500 }
      idempotencyKey: { type: string }
      agentId: { type: string }
  steps:
    - stepId: checkEligibility
      operationId: $sourceDescriptions.support.getRefundEligibility
      parameters:
        - name: orderId
          in: path
          value: $inputs.orderId
      successCriteria:
        - condition: $statusCode == 200
        - condition: $response.body#/eligible == true
        - condition: $inputs.amount <= $response.body#/maxRefundableAmount
      onFailure:
        - name: notEligible
          type: end                      # nothing refunded, nothing published
```

### `mcp-tools.json` (excerpt)

The `tool` part is served as-is in `tools/list`. The `binding` part stays on the server and is never sent to clients.

```json
{
  "formatVersion": "1.0.0",
  "generatedFrom": {
    "arazzoDocument": "./mcp-travel-booking.arazzo.yaml",
    "arazzoVersion": "1.1.0",
    "digest": "sha256-…"
  },
  "mcp": { "protocolVersions": ["2026-07-28", "2025-11-25", "2025-06-18"] },
  "tools": [
    {
      "tool": {
        "name": "book_trip",
        "title": "Book and pay for a trip",
        "description": "Books and pays for a flight end to end. Irreversible financial side effect: the user must confirm the displayed price first. Never ask for a card number.",
        "inputSchema": { "type": "object", "additionalProperties": false, "properties": { "…": {} } },
        "outputSchema": { "type": "object", "required": ["status", "correlationId"], "properties": { "…": {} } },
        "annotations": { "readOnlyHint": false, "destructiveHint": true, "idempotentHint": false, "openWorldHint": true }
      },
      "binding": {
        "workflowId": "book_trip",
        "hiddenInputs": {
          "paymentMethodToken": { "source": "vault", "ref": "vault://travel-demo/users/{sub}/payment-methods/default" },
          "idempotencyKey": { "source": "server", "generator": "uuid-v4" },
          "confirmedTotalPrice": { "source": "confirmation", "from": "$preview.outputs.totalPrice.amount" }
        },
        "outputs": { "bookingReference": "$outputs.bookingReference" },
        "errors": [{ "code": "PRICE_CHANGED", "when": { "stepId": "priceOffer", "on": "successCriteria" }, "retryableByAgent": false, "message": "…" }],
        "confirmation": { "required": true, "mode": "elicitation-form", "previewWorkflowId": "quote_trip", "whenClientLacksElicitation": "reject" },
        "auth": { "requiredScopes": ["travel:book", "payments:charge"] },
        "limits": { "rateLimit": { "perPrincipal": "5/hour" }, "timeoutMs": 60000 }
      }
    }
  ]
}
```

The full files are in the `mcp-travel-booking` and `mcp-support-refund` examples. Their mapping checks are:
`destructiveHint: true` requires `confirmation.required: true`, no visible input may look like a secret, and the digest
must match the Arazzo document.

---

## Writing an executable E2E test with Arazzo

A workflow is a test scenario. `successCriteria` are its assertions, and `outputs` carry data to the next step.

1. **Portable assertions: `simple` + JSON Pointer.** For example, `$response.body#/status == 'confirmed'`. This is the
   only form that passes the same way on Respect, Specmatic, Jentic, @usearazzo and arazzo-cli.
   JSONPath criteria behave differently across runners: Respect wraps the root, so `$[?@.x == 1]` passes there and
   fails on strict RFC 9535 runners, while `$.x` does the opposite.
2. **Qualified `operationId`s** (`$sourceDescriptions.api.op`): arazzo-cli requires them with several sources.
3. **Outputs as expressions** (`$response.body#/id`) in any workflow run by Respect. Show Selectors only in
   workflows run by arazzo-cli.
4. **Negative cases are separate workflows** that assert the error contract, and **succeed** when the API refuses:
   `$statusCode == 401` and `$response.body#/code == 'SESSION_EXPIRED'`.
5. **Deterministic mocks.** Put `example`s in the OpenAPI responses and align the IDs between the HTTP mock and the
   event mock, so that correlation works.
6. Give every step `successCriteria`, because Specmatic rejects steps without them, and give every `receive` step a `timeout`.

### Recipe: Prism + Respect (HTTP), pinned versions

```bash
# 1. Mock the OpenAPI source (serves its examples, deterministic)
npx -y @stoplight/prism-cli@5.16.0 mock -h 127.0.0.1 -p 4010 ./openapi.yaml &

# 2. Lint: picks the 1.0 or 1.1 schema from the `arazzo` field
npx -y @redocly/cli@2.79.0 lint ./order-flow.arazzo.yaml

# 3. Run: --server overrides a sourceDescription, --input sets workflow inputs
npx -y @redocly/cli@2.79.0 respect ./order-flow.arazzo.yaml \
  --server shop=http://127.0.0.1:4010 \
  --input sku=BOOK-42 \
  --json-output reports/respect.json

# 4. JUnit for CI (Respect has no JUnit output)
node ci/respect-to-junit.mjs reports/respect.json > reports/junit.xml
```

Pin both versions: `@redocly/cli` ships several releases a week. Respect's exit code is reliable.

### Runner limits (measured 2026-11-16)

| Need | Use | Limit |
|---|---|---|
| HTTP steps, CI | **Redocly Respect 2.79.0** (MIT) | Selector Objects **are not evaluated**: the raw object is sent, as in `/orders/[object Object]`, a silent false positive. No AsyncAPI at all. No XPath. Truthy JSONPath is not applied |
| `receive` on Kafka | **arazzo-cli 0.9.0** (MIT, built from source) + Kafka + Microcks or a scripted producer | Kafka only. `send` is refused. JUnit is native (`arazzo-cli test --format junit`) |
| `send` | Specmatic Arazzo (`specmatic/enterprise:1.29.2`, **commercial**, trial licence) | Selector in `jsonpointer` only, no JSONPath criteria. Judge on `workflow_outputs.json` |
| Agent execution | Jentic arazzo-runner | not for CI: exit code 0 even when the workflow fails |

**No open-source runner executes `action: send`** as of November 2026. For `send` steps, validate the document
(`redocly lint`, `arazzo-cli validate`) and check the event contract separately. Also beware of the `action`
point of view: arazzo-cli expects an AsyncAPI written from the consumer side, while Specmatic expects the AsyncAPI
of the system under test (send and receive inverted). State the convention in the README.

---

## Validation checklist

The JSON Schema covers structure. The rules below need a semantic linter such as `@connethics/arazzo-core`.

| Area | Rule | Severity |
|---|---|---|
| Version | `arazzo` is `major.minor.patch`. Validate a 1.1.x document with the 1.1 schema | error |
| Version | 1.1 feature in a `1.0.x` document (`$self`, `asyncapi`, `channelPath`, `action`, `correlationId`, `timeout`, step `dependsOn`, `querystring`, action `parameters`, Selector, `$message`) | error/warning |
| Structure | unknown field that does not start with `x-` | error |
| Structure | `$self` contains a `#fragment` | error |
| IDs | `workflowId` unique in the document, `stepId` unique in its workflow, source `name` unique and matching `[A-Za-z0-9_-]+` | error |
| IDs | `workflowId` or `stepId` outside `[A-Za-z0-9_-]+` cannot be referenced | warning |
| Targets | exactly one of `operationId`, `operationPath`, `channelPath`, `workflowId` | error |
| Targets | several non-arazzo sources with an unqualified `operationId` | error |
| Targets | `operationPath` targets an `openapi` source, `channelPath` an `asyncapi` source | error |
| Async | `action` only on AsyncAPI steps and required there. `correlationId` only with `receive` | error |
| Async | `timeout` is an integer > 0 (ms). `receive` has no `timeout` | warning / info |
| dependsOn | valid form, target exists, not itself, no cycle (implicit `$steps` references included) | error |
| Order | without any `dependsOn`, no reference to the output of a later step | error |
| Actions | `name` and `type` present. `goto` has `stepId` xor `workflowId`, and the target exists | error |
| Actions | `retryAfter` ≥ 0 (s), `retryLimit` ≥ 0. Action `parameters` only with `workflowId`, without `in` | error |
| Actions | action parameters should match the target workflow's `inputs` | warning |
| Params | `in` is required for operations. `querystring` excludes `query`. A `querystring` value is a string | error |
| Criteria | `context` required when `type` is set. No `type: jsonpointer` criterion. No empty `successCriteria` | error |
| Selector | `context`, `selector` and `type` all required, and `selector` valid for its type | error |
| References | `$steps.x.outputs.y` declared, `$inputs.x` declared, `$components.*` and `$sourceDescriptions.*` exist | error / warning |
| Extensions | `x-oai-*`, `x-oas-*` and `x-arazzo*` are reserved | warning |

## Common mistakes

| Wrong | Right |
|---|---|
| `operationId: petstore.findPets` | `operationId: $sourceDescriptions.petstore.findPets` |
| `operationPath: "{$sourceDescriptions.petstore}/pets"` | `operationPath: '{$sourceDescriptions.petstore.url}#/paths/~1pets/get'` |
| `value: $response.body.data[0].id` | `value: $response.body#/data/0/id` |
| `value: $steps.find.response.body` | `outputs: {pets: $response.body}` on `find`, then `$steps.find.outputs.pets` |
| action `{type: retry}` with no `name` | `{name: retryWhenBusy, type: retry, retryAfter: 2}` |
| `retryAfter: 1000` (meaning 1 s) | `retryAfter: 1`, because the unit is seconds |
| `timeout: 6s` | `timeout: 6000`, because the unit is milliseconds |
| `condition: "$x =~ /^https/"` with `type: regex` | `context: $x`, `condition: '^https'`, `type: regex` |
| `dependsOn: [$steps.createOrder]` | `dependsOn: [createOrder]` |
| `channelPath: orders` | `channelPath: '{$sourceDescriptions.events.url}#/channels/orders'` |
| `correlationId` on a `send` step | `correlationId` on `receive` only |
| `reference: $components.inputs.paging` | `inputs: {$ref: '#/components/inputs/paging'}` |
| `value: {a: 1}` in 1.1 | `value: '{"a":1}'`, or a Selector |
| "Arazzo orchestrates MCP tools" | "An MCP server exposes Arazzo workflows as tools" |

---

## Quick reference card

```yaml
arazzo: 1.1.0
info:
  title: Minimal workflow
  version: 1.0.0
sourceDescriptions:
  - name: api
    url: ./openapi.yaml
    type: openapi
workflows:
  - workflowId: main
    inputs:
      type: object
      properties:
        id: { type: string }
    steps:
      - stepId: getItem
        operationId: $sourceDescriptions.api.getItem
        parameters:
          - name: id
            in: path
            value: $inputs.id
        successCriteria:
          - condition: $statusCode == 200
        onFailure:
          - name: retryOnce
            type: retry
            retryAfter: 2
            retryLimit: 1
        outputs:
          name: $response.body#/name
    outputs:
      name: $steps.getItem.outputs.name
```

```text
Targets    operationId | operationPath | channelPath + action | workflowId      (exactly one)
Async      action: send|receive · correlationId (receive) · timeout: <ms> · $message.payload#/…
Order      array order · dependsOn: [stepId | $workflows.w.steps.s | $sourceDescriptions.src.w.steps.s]
Params     in: path|query|querystring|header|cookie|channel · no `in` for workflow inputs
Criteria   simple (default) | regex | jsonpath | xpath | {type, version} · context required unless simple
Selector   {context, selector, type: jsonpath|xpath|jsonpointer|{type, version}}
Actions    end | goto (stepId xor workflowId) | retry (retryAfter s, retryLimit) · name + type required
Reuse      $components.parameters|successActions|failureActions.<key> · inputs via $ref
Units      retryAfter = seconds · timeout = milliseconds
```

## Examples (all valid Arazzo 1.1.0, executed 2026-11-16)

Browse them at https://arazzo.connethics.com/workflows/ (source: `app/public/workflows/` in
https://github.com/connEthics/arazzo-demo). Each one has its OpenAPI/AsyncAPI stubs, `inputs.json` and a README
with the run commands and the observed results.

| Example | Shows |
|---|---|
| `mcp-travel-booking/` | `quote_trip` (read-only) + `book_trip` (payment, compensations) and `mcp-tools.json` |
| `mcp-support-refund/` | HTTP refund + AsyncAPI `send` of `refund.issued`, guardrails, `mcp-tools.json` |
| `e2e-order-to-cash/` | `receive` + `correlationId` + `timeout`, `dependsOn` fan-out and join, Selectors |
| `e2e-session-renewal/` | 401 → `retry` action reusing `renewSession` with `parameters`, `in: querystring`, negative case |
| `e2e-onboarding-entreprise-fr/` | B2B onboarding (French company registry stub), `workflowId` step, webhook `send` |
| `ci/arazzo-e2e.yml.example` | GitHub Actions: lint, Prism + Respect matrix, Kafka `receive` job, optional Specmatic job |

## Tooling

- **Arazzo Studio by ConnEthics**: https://arazzo.connethics.com. A visual viewer and builder, with Mermaid export.
- **Arazzo for VS Code — by ConnEthics**: [`connethics.arazzo-vscode`](https://marketplace.visualstudio.com/items?itemName=connethics.arazzo-vscode).
  It offers a preview, a flowchart, an outline and diagnostics. Arazzo 1.1 support is rolling out.
- **`@connethics/arazzo-core`** (MIT, `packages/arazzo-core` in arazzo-demo). It validates 1.0.x and 1.1.x documents in two
  layers: the official JSON Schemas, then semantic rules with codes such as `arazzo-step-target-exclusive`. It also builds
  a renderer-agnostic workflow graph and exports Mermaid. npm publication is planned.
- **Redocly CLI** (`lint`, `respect`), **arazzo-cli**, **Specmatic**, **Prism** and **Microcks**, as described above.

---

**Spec**: Arazzo 1.1.0 · **Skill file**: 2.0.0 (2026-11) · **License**: MIT (this file) · **By** ConnEthics — https://connethics.com
