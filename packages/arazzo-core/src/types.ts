// ═══════════════════════════════════════════════════════════════════════════════
// Arazzo Specification types — 1.1.0, backward compatible with 1.0.x
// Spec: https://spec.openapis.org/arazzo/v1.1.0.html (section numbers § 5.x)
// 1.0.1: https://spec.openapis.org/arazzo/v1.0.1.html (section numbers § 4.x)
//
// Fields marked "1.1" only exist in Arazzo 1.1.x documents: using them in a
// document that declares `arazzo: 1.0.x` triggers the
// `arazzo-version-feature-mismatch` diagnostic.
// ═══════════════════════════════════════════════════════════════════════════════

/** Specification Extensions (§ 5.10): any `x-` prefixed field, value of any type. */
export type Extensions = { [key: `x-${string}`]: unknown };

/** A Runtime Expression (§ 5.9), e.g. `$steps.login.outputs.token`. */
export type RuntimeExpression = string;

// ─────────────────────────────────────────────────────────────────────────────
// § 5.8.1 Arazzo Specification Object (root)
// ─────────────────────────────────────────────────────────────────────────────
export interface ArazzoDocument extends Extensions {
  /** REQUIRED. Version of the Arazzo Specification (`1.0.0`, `1.0.1`, `1.1.0`…). */
  arazzo: string;
  /**
   * 1.1. URI-reference (RFC 3986 § 4.1) identifying this document, without
   * fragment. Used as base URI and for identity-based references (§ 5.5.2, § 5.6.1).
   */
  $self?: string;
  /** REQUIRED. Metadata about the API workflows. */
  info: Info;
  /** REQUIRED. At least one entry. */
  sourceDescriptions: SourceDescription[];
  /** REQUIRED. At least one entry. */
  workflows: Workflow[];
  components?: Components;
}

/** @deprecated Use {@link ArazzoDocument}. Kept for compatibility with the former `types/arazzo.ts`. */
export type ArazzoSpec = ArazzoDocument;

// ─────────────────────────────────────────────────────────────────────────────
// § 5.8.2 Info Object
// ─────────────────────────────────────────────────────────────────────────────
export interface Info extends Extensions {
  /** REQUIRED. */
  title: string;
  summary?: string;
  /** CommonMark. */
  description?: string;
  /** REQUIRED. Version of the Arazzo document (not of the spec). */
  version: string;
}

/** @deprecated Use {@link Info}. */
export type ArazzoInfo = Info;

// ─────────────────────────────────────────────────────────────────────────────
// § 5.8.3 Source Description Object
// ─────────────────────────────────────────────────────────────────────────────
/** `asyncapi` is 1.1. */
export type SourceDescriptionType = 'openapi' | 'asyncapi' | 'arazzo';

export interface SourceDescription extends Extensions {
  /** REQUIRED. Unique name, `[A-Za-z0-9_\-]+`. */
  name: string;
  /** REQUIRED. URI-reference of the source document. */
  url: string;
  type?: SourceDescriptionType;
  // NOTE: the former `description` field does not exist in the specification
  // (rejected by both official schemas). Use an extension such as
  // `x-description` instead, see {@link LegacySourceDescription}.
}

// ─────────────────────────────────────────────────────────────────────────────
// § 5.8.4 Workflow Object
// ─────────────────────────────────────────────────────────────────────────────
export interface Workflow extends Extensions {
  /** REQUIRED. Unique in the document, SHOULD match `[A-Za-z0-9_\-]+`. */
  workflowId: string;
  summary?: string;
  description?: string;
  /** JSON Schema 2020-12 describing the workflow inputs. */
  inputs?: JsonSchema;
  /** Local `workflowId`s or `$sourceDescriptions.<name>.<workflowId>`. */
  dependsOn?: string[];
  /** REQUIRED. At least one step. */
  steps: Step[];
  successActions?: (SuccessAction | ReusableObject)[];
  failureActions?: (FailureAction | ReusableObject)[];
  /** Output name (`^[a-zA-Z0-9.\-_]+$`) → runtime expression, or Selector (1.1). */
  outputs?: Record<string, OutputValue>;
  parameters?: (Parameter | ReusableObject)[];
}

/** Workflow / step output value: a runtime expression, or (1.1) a Selector Object. */
export type OutputValue = RuntimeExpression | Selector;

// ─────────────────────────────────────────────────────────────────────────────
// JSON Schema (workflow inputs, components.inputs) — permissive subset
// ─────────────────────────────────────────────────────────────────────────────
export interface JsonSchema {
  $ref?: string;
  $id?: string;
  $anchor?: string;
  $defs?: Record<string, JsonSchema>;
  type?: string | string[];
  title?: string;
  description?: string;
  required?: string[];
  properties?: Record<string, JsonSchema>;
  additionalProperties?: JsonSchema | boolean;
  items?: JsonSchema | boolean;
  enum?: unknown[];
  const?: unknown;
  default?: unknown;
  examples?: unknown[];
  /** Non-standard but common. */
  example?: unknown;
  format?: string;
  pattern?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  minItems?: number;
  maxItems?: number;
  allOf?: JsonSchema[];
  anyOf?: JsonSchema[];
  oneOf?: JsonSchema[];
  not?: JsonSchema;
  [keyword: string]: unknown;
}

/** @deprecated Use {@link JsonSchema}. */
export type WorkflowInputs = JsonSchema;
/** @deprecated Use {@link JsonSchema}. */
export type SchemaProperty = JsonSchema;
/** @deprecated Use {@link JsonSchema}. */
export type SchemaDefinition = JsonSchema;

// ─────────────────────────────────────────────────────────────────────────────
// § 5.8.5 Step Object
// Exactly one target among operationId, operationPath, workflowId, channelPath.
// ─────────────────────────────────────────────────────────────────────────────
/** 1.1. AsyncAPI step action. */
export type AsyncAction = 'send' | 'receive';

export interface Step extends Extensions {
  /** REQUIRED. Unique in the workflow, SHOULD match `[A-Za-z0-9_\-]+`. */
  stepId: string;
  description?: string;
  /** Operation of an OpenAPI or (1.1) AsyncAPI source. Qualify with `$sourceDescriptions.<name>.` when several sources exist. */
  operationId?: string;
  /** `{$sourceDescriptions.<name>.url}#<json-pointer>` to an OpenAPI operation. */
  operationPath?: string;
  /** Local workflowId or `$sourceDescriptions.<name>.<workflowId>`. */
  workflowId?: string;
  /** 1.1. `{$sourceDescriptions.<name>.url}#/channels/<key>` (AsyncAPI channel). */
  channelPath?: string;
  /** 1.1. Required for AsyncAPI steps. */
  action?: AsyncAction;
  /** 1.1. Only for AsyncAPI steps with `action: receive`; typically a runtime expression. */
  correlationId?: string;
  /** 1.1. Maximum duration in milliseconds before the step fails. */
  timeout?: number;
  /** 1.1. Prerequisite steps: `stepId`, `$workflows.<w>.steps.<s>` or `$sourceDescriptions.<n>.<w>.steps.<s>`. */
  dependsOn?: string[];
  parameters?: (Parameter | ReusableObject)[];
  requestBody?: RequestBody;
  /** If present, at least one criterion. */
  successCriteria?: Criterion[];
  onSuccess?: (SuccessAction | ReusableObject)[];
  onFailure?: (FailureAction | ReusableObject)[];
  outputs?: Record<string, OutputValue>;
}

// ─────────────────────────────────────────────────────────────────────────────
// § 5.8.6 Parameter Object
// ─────────────────────────────────────────────────────────────────────────────
/**
 * `querystring` is 1.1 (OAS 3.2). `channel` is accepted by the 1.1 schema and
 * clarified in the 1.1 development branch (AsyncAPI channel parameter).
 */
export type ParameterLocation = 'path' | 'query' | 'querystring' | 'header' | 'cookie' | 'channel';

export interface Parameter extends Extensions {
  /** REQUIRED. Case sensitive. */
  name: string;
  /** Required when the step targets an operation; MUST NOT be used for workflows or action parameters. */
  in?: ParameterLocation;
  /** REQUIRED. Literal, runtime expression, or (1.1) Selector Object. */
  value: ParameterValue;
}

/** Literal value, runtime expression (string) or (1.1) Selector Object. */
export type ParameterValue = string | number | boolean | null | unknown[] | Selector | Record<string, unknown>;

// ─────────────────────────────────────────────────────────────────────────────
// § 5.8.7 Success Action Object / § 5.8.8 Failure Action Object
// ─────────────────────────────────────────────────────────────────────────────
export type SuccessActionType = 'end' | 'goto';
export type FailureActionType = 'end' | 'goto' | 'retry';

export interface SuccessAction extends Extensions {
  /** REQUIRED. Identity of the action (unique within a list). */
  name: string;
  /** REQUIRED. */
  type: SuccessActionType;
  /** `goto` target workflow (exclusive with `stepId`). */
  workflowId?: string;
  /** `goto` target step of the current workflow (exclusive with `workflowId`). */
  stepId?: string;
  /** 1.1. Inputs passed to `workflowId` (no `in`). */
  parameters?: (ActionParameter | ReusableObject)[];
  criteria?: Criterion[];
}

export interface FailureAction extends Extensions {
  name: string;
  type: FailureActionType;
  /** `goto` target, or workflow to run before a `retry`. */
  workflowId?: string;
  /** `goto` target, or step to run before a `retry`. */
  stepId?: string;
  /** 1.1. Inputs passed to `workflowId` (no `in`). */
  parameters?: (ActionParameter | ReusableObject)[];
  /** Seconds (decimal) before retrying; `retry` only, ≥ 0. */
  retryAfter?: number;
  /** Maximum number of retries; `retry` only, integer ≥ 0, default 1. */
  retryLimit?: number;
  criteria?: Criterion[];
}

/** 1.1. Parameter passed to a workflow from an action: no `in`. */
export type ActionParameter = Omit<Parameter, 'in'>;

// ─────────────────────────────────────────────────────────────────────────────
// § 5.8.9 Components Object
// ─────────────────────────────────────────────────────────────────────────────
export interface Components extends Extensions {
  /** Referenced with `$ref: '#/components/inputs/<name>'` (not a runtime expression). */
  inputs?: Record<string, JsonSchema>;
  /** `$components.parameters.<name>` */
  parameters?: Record<string, Parameter>;
  /** `$components.successActions.<name>` */
  successActions?: Record<string, SuccessAction>;
  /** `$components.failureActions.<name>` */
  failureActions?: Record<string, FailureAction>;
}

// ─────────────────────────────────────────────────────────────────────────────
// § 5.8.10 Reusable Object
// ─────────────────────────────────────────────────────────────────────────────
export interface ReusableObject {
  /** REQUIRED. `$components.{parameters|successActions|failureActions}.<name>`. */
  reference: RuntimeExpression;
  /** Overrides the value of a referenced parameter (parameters only). */
  value?: unknown;
}

// ─────────────────────────────────────────────────────────────────────────────
// § 5.8.11 Criterion Object
// ─────────────────────────────────────────────────────────────────────────────
export type CriterionTypeName = 'simple' | 'regex' | 'jsonpath' | 'xpath';

export interface Criterion extends Extensions {
  /** Runtime expression setting the context; REQUIRED when `type` is set. */
  context?: RuntimeExpression;
  /** REQUIRED. */
  condition: string;
  /** Default `simple`. */
  type?: CriterionTypeName | ExpressionType;
}

/** @deprecated Use `Criterion['type']`. */
export type CriterionType = NonNullable<Criterion['type']>;

// ─────────────────────────────────────────────────────────────────────────────
// § 5.8.12 Expression Type Object (1.0: "Criterion Expression Type Object")
// ─────────────────────────────────────────────────────────────────────────────
export type JsonPathVersion = 'rfc9535' | 'draft-goessner-dispatch-jsonpath-00';
export type XPathVersion = 'xpath-31' | 'xpath-30' | 'xpath-20' | 'xpath-10';
export type JsonPointerVersion = 'rfc6901';

/** `jsonpointer`, `rfc9535` and `xpath-31` are 1.1. */
export type ExpressionType = Extensions &
  (
    | { type: 'jsonpath'; version: JsonPathVersion }
    | { type: 'xpath'; version: XPathVersion }
    | { type: 'jsonpointer'; version: JsonPointerVersion }
  );

export type ExpressionTypeName = ExpressionType['type'];
export type ExpressionVersion = ExpressionType['version'];

/** Default version per expression type (§ 5.8.12.1, 1.1). */
export const DEFAULT_EXPRESSION_VERSIONS: Readonly<Record<ExpressionTypeName, ExpressionVersion>> = {
  jsonpath: 'rfc9535',
  xpath: 'xpath-31',
  jsonpointer: 'rfc6901',
};

/** @deprecated Use {@link ExpressionType}. */
export type CriterionExpressionType = ExpressionType;
/** @deprecated Use {@link ExpressionVersion}. */
export type CriterionExpressionVersion = ExpressionVersion;

// ─────────────────────────────────────────────────────────────────────────────
// § 5.8.13 Selector Object (1.1)
// ─────────────────────────────────────────────────────────────────────────────
export interface Selector extends Extensions {
  /** REQUIRED. Runtime expression evaluating to structured data (`$response.body`, `$message.payload`…). */
  context: RuntimeExpression;
  /** REQUIRED. JSONPath, XPath or JSON Pointer expression. */
  selector: string;
  /** REQUIRED. */
  type: ExpressionTypeName | ExpressionType;
}

// ─────────────────────────────────────────────────────────────────────────────
// § 5.8.14 Request Body Object / § 5.8.15 Payload Replacement Object
// ─────────────────────────────────────────────────────────────────────────────
export interface RequestBody extends Extensions {
  contentType?: string;
  /** Literal, runtime expressions, or (1.1) Selector Objects. For `send` steps: the message payload. */
  payload?: unknown;
  replacements?: PayloadReplacement[];
}

/** @deprecated Use `RequestBody['payload']`. */
export type RequestBodyPayload = unknown;

export interface PayloadReplacement extends Extensions {
  /** REQUIRED. JSON Pointer, XPath or (1.1) JSONPath, according to `targetSelectorType`. */
  target: string;
  /** 1.1. Defaults to JSON Pointer for JSON payloads and XPath for XML payloads. */
  targetSelectorType?: ExpressionTypeName | ExpressionType;
  /** REQUIRED. Literal, runtime expression or (1.1) Selector Object. */
  value: unknown;
}

// ─────────────────────────────────────────────────────────────────────────────
// Type guards
// ─────────────────────────────────────────────────────────────────────────────
const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** True for a Reusable Object (`{ reference: … }`). */
export function isReusableObject(obj: unknown): obj is ReusableObject {
  return isPlainObject(obj) && typeof obj.reference === 'string';
}

/** True for an object shaped like a Selector Object (`context`, `selector`, `type`). */
export function isSelector(obj: unknown): obj is Selector {
  return isPlainObject(obj) && 'context' in obj && 'selector' in obj && 'type' in obj;
}

/** True for an Expression Type Object (`{ type, version }`). */
export function isExpressionType(obj: unknown): obj is ExpressionType {
  return isPlainObject(obj) && typeof obj.type === 'string' && 'version' in obj;
}

// ─────────────────────────────────────────────────────────────────────────────
// Resolved shapes (after Reusable Object resolution)
// ─────────────────────────────────────────────────────────────────────────────
export interface ResolvedStep extends Omit<Step, 'parameters' | 'onSuccess' | 'onFailure'> {
  parameters?: Parameter[];
  onSuccess?: SuccessAction[];
  onFailure?: FailureAction[];
}

export interface ResolvedWorkflow extends Omit<Workflow, 'parameters' | 'successActions' | 'failureActions'> {
  parameters?: Parameter[];
  successActions?: SuccessAction[];
  failureActions?: FailureAction[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Legacy compatibility (former `types/arazzo.ts` of arazzo-demo / arazzo-vscode)
// These fields are NOT part of the specification and are reported as
// `arazzo-unknown-field` by the validator. Prefer `x-` extensions.
// ─────────────────────────────────────────────────────────────────────────────
/** @deprecated `description` is not a Source Description field; use `x-description`. */
export interface LegacySourceDescription extends SourceDescription {
  description?: string;
}
/** @deprecated `outputs` is not an action field. */
export interface LegacySuccessAction extends SuccessAction {
  outputs?: Record<string, string>;
}
/** @deprecated `outputs` is not an action field. */
export interface LegacyFailureAction extends FailureAction {
  outputs?: Record<string, string>;
}
/** @deprecated Use {@link Criterion}. */
export type SuccessCriterion = Criterion;
/** @deprecated Use {@link Criterion}. */
export interface ActionCriterion {
  condition: string;
}
