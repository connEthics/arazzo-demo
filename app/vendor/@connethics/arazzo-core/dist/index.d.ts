import { Document } from 'yaml';

/** Specification Extensions (§ 5.10): any `x-` prefixed field, value of any type. */
type Extensions = {
    [key: `x-${string}`]: unknown;
};
/** A Runtime Expression (§ 5.9), e.g. `$steps.login.outputs.token`. */
type RuntimeExpression = string;
interface ArazzoDocument extends Extensions {
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
type ArazzoSpec = ArazzoDocument;
interface Info extends Extensions {
    /** REQUIRED. */
    title: string;
    summary?: string;
    /** CommonMark. */
    description?: string;
    /** REQUIRED. Version of the Arazzo document (not of the spec). */
    version: string;
}
/** @deprecated Use {@link Info}. */
type ArazzoInfo = Info;
/** `asyncapi` is 1.1. */
type SourceDescriptionType = 'openapi' | 'asyncapi' | 'arazzo';
interface SourceDescription extends Extensions {
    /** REQUIRED. Unique name, `[A-Za-z0-9_\-]+`. */
    name: string;
    /** REQUIRED. URI-reference of the source document. */
    url: string;
    type?: SourceDescriptionType;
}
interface Workflow extends Extensions {
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
type OutputValue = RuntimeExpression | Selector;
interface JsonSchema {
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
type WorkflowInputs = JsonSchema;
/** @deprecated Use {@link JsonSchema}. */
type SchemaProperty = JsonSchema;
/** @deprecated Use {@link JsonSchema}. */
type SchemaDefinition = JsonSchema;
/** 1.1. AsyncAPI step action. */
type AsyncAction = 'send' | 'receive';
interface Step extends Extensions {
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
/**
 * `querystring` is 1.1 (OAS 3.2). `channel` is accepted by the 1.1 schema and
 * clarified in the 1.1 development branch (AsyncAPI channel parameter).
 */
type ParameterLocation = 'path' | 'query' | 'querystring' | 'header' | 'cookie' | 'channel';
interface Parameter extends Extensions {
    /** REQUIRED. Case sensitive. */
    name: string;
    /** Required when the step targets an operation; MUST NOT be used for workflows or action parameters. */
    in?: ParameterLocation;
    /** REQUIRED. Literal, runtime expression, or (1.1) Selector Object. */
    value: ParameterValue;
}
/** Literal value, runtime expression (string) or (1.1) Selector Object. */
type ParameterValue = string | number | boolean | null | unknown[] | Selector | Record<string, unknown>;
type SuccessActionType = 'end' | 'goto';
type FailureActionType = 'end' | 'goto' | 'retry';
interface SuccessAction extends Extensions {
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
interface FailureAction extends Extensions {
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
type ActionParameter = Omit<Parameter, 'in'>;
interface Components extends Extensions {
    /** Referenced with `$ref: '#/components/inputs/<name>'` (not a runtime expression). */
    inputs?: Record<string, JsonSchema>;
    /** `$components.parameters.<name>` */
    parameters?: Record<string, Parameter>;
    /** `$components.successActions.<name>` */
    successActions?: Record<string, SuccessAction>;
    /** `$components.failureActions.<name>` */
    failureActions?: Record<string, FailureAction>;
}
interface ReusableObject {
    /** REQUIRED. `$components.{parameters|successActions|failureActions}.<name>`. */
    reference: RuntimeExpression;
    /** Overrides the value of a referenced parameter (parameters only). */
    value?: unknown;
}
type CriterionTypeName = 'simple' | 'regex' | 'jsonpath' | 'xpath';
interface Criterion extends Extensions {
    /** Runtime expression setting the context; REQUIRED when `type` is set. */
    context?: RuntimeExpression;
    /** REQUIRED. */
    condition: string;
    /** Default `simple`. */
    type?: CriterionTypeName | ExpressionType;
}
/** @deprecated Use `Criterion['type']`. */
type CriterionType = NonNullable<Criterion['type']>;
type JsonPathVersion = 'rfc9535' | 'draft-goessner-dispatch-jsonpath-00';
type XPathVersion = 'xpath-31' | 'xpath-30' | 'xpath-20' | 'xpath-10';
type JsonPointerVersion = 'rfc6901';
/** `jsonpointer`, `rfc9535` and `xpath-31` are 1.1. */
type ExpressionType = Extensions & ({
    type: 'jsonpath';
    version: JsonPathVersion;
} | {
    type: 'xpath';
    version: XPathVersion;
} | {
    type: 'jsonpointer';
    version: JsonPointerVersion;
});
type ExpressionTypeName = ExpressionType['type'];
type ExpressionVersion = ExpressionType['version'];
/** Default version per expression type (§ 5.8.12.1, 1.1). */
declare const DEFAULT_EXPRESSION_VERSIONS: Readonly<Record<ExpressionTypeName, ExpressionVersion>>;
/** @deprecated Use {@link ExpressionType}. */
type CriterionExpressionType = ExpressionType;
/** @deprecated Use {@link ExpressionVersion}. */
type CriterionExpressionVersion = ExpressionVersion;
interface Selector extends Extensions {
    /** REQUIRED. Runtime expression evaluating to structured data (`$response.body`, `$message.payload`…). */
    context: RuntimeExpression;
    /** REQUIRED. JSONPath, XPath or JSON Pointer expression. */
    selector: string;
    /** REQUIRED. */
    type: ExpressionTypeName | ExpressionType;
}
interface RequestBody extends Extensions {
    contentType?: string;
    /** Literal, runtime expressions, or (1.1) Selector Objects. For `send` steps: the message payload. */
    payload?: unknown;
    replacements?: PayloadReplacement[];
}
/** @deprecated Use `RequestBody['payload']`. */
type RequestBodyPayload = unknown;
interface PayloadReplacement extends Extensions {
    /** REQUIRED. JSON Pointer, XPath or (1.1) JSONPath, according to `targetSelectorType`. */
    target: string;
    /** 1.1. Defaults to JSON Pointer for JSON payloads and XPath for XML payloads. */
    targetSelectorType?: ExpressionTypeName | ExpressionType;
    /** REQUIRED. Literal, runtime expression or (1.1) Selector Object. */
    value: unknown;
}
/** True for a Reusable Object (`{ reference: … }`). */
declare function isReusableObject(obj: unknown): obj is ReusableObject;
/** True for an object shaped like a Selector Object (`context`, `selector`, `type`). */
declare function isSelector(obj: unknown): obj is Selector;
/** True for an Expression Type Object (`{ type, version }`). */
declare function isExpressionType(obj: unknown): obj is ExpressionType;
interface ResolvedStep extends Omit<Step, 'parameters' | 'onSuccess' | 'onFailure'> {
    parameters?: Parameter[];
    onSuccess?: SuccessAction[];
    onFailure?: FailureAction[];
}
interface ResolvedWorkflow extends Omit<Workflow, 'parameters' | 'successActions' | 'failureActions'> {
    parameters?: Parameter[];
    successActions?: SuccessAction[];
    failureActions?: FailureAction[];
}
/** @deprecated `description` is not a Source Description field; use `x-description`. */
interface LegacySourceDescription extends SourceDescription {
    description?: string;
}
/** @deprecated `outputs` is not an action field. */
interface LegacySuccessAction extends SuccessAction {
    outputs?: Record<string, string>;
}
/** @deprecated `outputs` is not an action field. */
interface LegacyFailureAction extends FailureAction {
    outputs?: Record<string, string>;
}
/** @deprecated Use {@link Criterion}. */
type SuccessCriterion = Criterion;
/** @deprecated Use {@link Criterion}. */
interface ActionCriterion {
    condition: string;
}

/** A path inside the document, e.g. `['workflows', 0, 'steps', 2, 'operationId']`. */
type JsonPath = (string | number)[];
/** Character offsets (0-based, end exclusive) in the source text. */
interface SourceRange {
    start: number;
    end: number;
}
interface LocatedRange extends SourceRange {
    /** False when the path does not exist and the range of its nearest existing ancestor is returned. */
    exact: boolean;
    /** Range of the mapping key when the target is the value of a mapping entry. */
    key?: SourceRange;
    /** Range of the value node (absent for `key:` without value). */
    value?: SourceRange;
}
interface ParseError {
    code: 'yaml-syntax' | 'yaml-warning';
    message: string;
    severity: 'error' | 'warning';
    range: SourceRange;
}
interface ParseResult {
    /** Plain JS value of the document (`undefined` when the YAML is empty or unusable). */
    doc: ArazzoDocument | undefined;
    /** The `yaml` v2 Document, kept to map JSON paths back to source ranges ({@link locate}). */
    yamlDoc: Document.Parsed;
    /** YAML syntax errors and warnings. */
    errors: ParseError[];
    /** Value of the `arazzo` field, or `null`. */
    version: string | null;
    /** True when the root is a mapping with an `arazzo` key. */
    isArazzo: boolean;
}
/**
 * Parse an Arazzo document (YAML or JSON). Never throws: syntax problems are
 * returned in `errors` and `doc` is whatever could be recovered.
 */
declare function parseArazzo(text: string): ParseResult;
/**
 * Map a JSON path to a source range. When the path does not exist (e.g. a
 * missing required field) the range of its nearest existing ancestor is
 * returned with `exact: false` — preferably its key (`info:`), so editors
 * underline a short span.
 */
declare function locate(yamlDoc: Document, path: JsonPath): LocatedRange | undefined;
/**
 * Compact range for a diagnostic: the key of a mapping entry for collections
 * and missing fields, the value for scalars, and the first entry of mapping
 * items of a sequence (`- stepId: foo` rather than the whole step).
 */
declare function diagnosticRange(yamlDoc: Document, path: JsonPath, preferKey?: boolean): SourceRange | undefined;
/** Line/column helper (0-based) for consumers that do not have an editor API. */
declare function createLineIndex(text: string): (offset: number) => {
    line: number;
    character: number;
};
/** Convert a JSON Pointer (`/workflows/0/steps`) to a path, using `doc` to type array indexes. */
declare function pointerToPath(pointer: string, doc?: unknown): JsonPath;
/** Convert a path to a JSON Pointer. */
declare function pathToPointer(path: JsonPath): string;

type Severity = 'error' | 'warning' | 'info' | 'hint';
interface RuleInfo {
    severity: Severity;
    layer: 'schema' | 'semantic' | 'both';
    section: string;
    summary: string;
    /** false when the rule needs the source documents (OpenAPI / AsyncAPI / Arazzo) to be loaded. */
    implemented: boolean;
    /** Why the rule is not implemented. */
    reason?: string;
}
declare const RULES: {
    readonly 'arazzo-schema': {
        readonly severity: "error";
        readonly layer: "schema";
        readonly section: "§5.8";
        readonly summary: "Fallback for JSON Schema errors not mapped to a more specific rule";
        readonly implemented: true;
    };
    readonly 'arazzo-version-format': {
        readonly severity: "error";
        readonly layer: "both";
        readonly section: "§5.1, §5.8.1.1";
        readonly summary: "`arazzo` is required and has the major.minor.patch form";
        readonly implemented: true;
    };
    readonly 'arazzo-version': {
        readonly severity: "warning";
        readonly layer: "semantic";
        readonly section: "§5.1";
        readonly summary: "Unknown major.minor version (R1 `arazzo-version-unknown`): no schema applies, only semantic rules run";
        readonly implemented: true;
    };
    readonly 'arazzo-version-feature-mismatch': {
        readonly severity: "error";
        readonly layer: "semantic";
        readonly section: "§5.1";
        readonly summary: "1.1 feature used in a 1.0.x document (warning when the 1.0 schema silently accepts it)";
        readonly implemented: true;
    };
    readonly 'arazzo-migration-param-object-value': {
        readonly severity: "error";
        readonly layer: "schema";
        readonly section: "§5.8.6.1";
        readonly summary: "1.1: a literal object Parameter.value (valid in 1.0) is rejected unless it is a Selector";
        readonly implemented: true;
    };
    readonly 'arazzo-self-recommended': {
        readonly severity: "info";
        readonly layer: "semantic";
        readonly section: "§5.5.2, §5.6.1";
        readonly summary: "1.1: `$self` is recommended for identity-based referencing";
        readonly implemented: true;
    };
    readonly 'arazzo-self-fragment': {
        readonly severity: "error";
        readonly layer: "schema";
        readonly section: "§5.8.1.1";
        readonly summary: "`$self` MUST NOT contain a fragment";
        readonly implemented: true;
    };
    readonly 'arazzo-self-uri-reference': {
        readonly severity: "error";
        readonly layer: "semantic";
        readonly section: "§5.8.1.1";
        readonly summary: "`$self` must be a valid RFC 3986 URI-reference";
        readonly implemented: true;
    };
    readonly 'arazzo-self-relative': {
        readonly severity: "info";
        readonly layer: "semantic";
        readonly section: "§5.6.1, App. B";
        readonly summary: "Relative `$self` is resolved against the retrieval URI (less portable)";
        readonly implemented: true;
    };
    readonly 'arazzo-unknown-field': {
        readonly severity: "error";
        readonly layer: "schema";
        readonly section: "§5.8, §5.10";
        readonly summary: "Field not defined by the specification and not an `x-` extension";
        readonly implemented: true;
    };
    readonly 'arazzo-extension-reserved-prefix': {
        readonly severity: "warning";
        readonly layer: "semantic";
        readonly section: "§5.10";
        readonly summary: "`x-oai-`, `x-oas-` and `x-arazzo` prefixes are reserved";
        readonly implemented: true;
    };
    readonly 'arazzo-reusable-no-extension': {
        readonly severity: "error";
        readonly layer: "schema";
        readonly section: "§5.8.10.1";
        readonly summary: "No additional field on a Reusable Object";
        readonly implemented: true;
    };
    readonly 'arazzo-workflow-id-unique': {
        readonly severity: "error";
        readonly layer: "semantic";
        readonly section: "§5.8.4.1";
        readonly summary: "`workflowId` unique in the document";
        readonly implemented: true;
    };
    readonly 'arazzo-step-id-unique': {
        readonly severity: "error";
        readonly layer: "semantic";
        readonly section: "§5.8.5.1";
        readonly summary: "`stepId` unique in its workflow";
        readonly implemented: true;
    };
    readonly 'arazzo-source-name-unique': {
        readonly severity: "error";
        readonly layer: "semantic";
        readonly section: "§5.8.3.1";
        readonly summary: "Source description names are unique";
        readonly implemented: true;
    };
    readonly 'arazzo-source-name-pattern': {
        readonly severity: "error";
        readonly layer: "schema";
        readonly section: "§5.8.3.1";
        readonly summary: "Source name matches [A-Za-z0-9_-]+";
        readonly implemented: true;
    };
    readonly 'arazzo-source-type-enum': {
        readonly severity: "error";
        readonly layer: "schema";
        readonly section: "§5.8.3.1";
        readonly summary: "Source `type` is openapi, asyncapi (1.1) or arazzo";
        readonly implemented: true;
    };
    readonly 'arazzo-id-pattern': {
        readonly severity: "warning";
        readonly layer: "semantic";
        readonly section: "§5.8.4.1, §5.8.5.1, §5.9";
        readonly summary: "`workflowId` / `stepId` SHOULD match [A-Za-z0-9_-]+";
        readonly implemented: true;
    };
    readonly 'arazzo-key-pattern': {
        readonly severity: "error";
        readonly layer: "both";
        readonly section: "§5.8.4.1, §5.8.9";
        readonly summary: "Output and component keys match ^[a-zA-Z0-9.\\-_]+$";
        readonly implemented: true;
    };
    readonly 'arazzo-parameter-unique': {
        readonly severity: "error";
        readonly layer: "semantic";
        readonly section: "§5.8.6";
        readonly summary: "No duplicate parameter (name + in) in a list";
        readonly implemented: true;
    };
    readonly 'arazzo-action-name-unique': {
        readonly severity: "error";
        readonly layer: "semantic";
        readonly section: "§5.8.7";
        readonly summary: "No duplicate action name in a list";
        readonly implemented: true;
    };
    readonly 'arazzo-step-target-exclusive': {
        readonly severity: "error";
        readonly layer: "semantic";
        readonly section: "§5.8.5.1";
        readonly summary: "Exactly one of operationId, operationPath, workflowId, channelPath";
        readonly implemented: true;
    };
    readonly 'arazzo-step-target-missing': {
        readonly severity: "error";
        readonly layer: "semantic";
        readonly section: "§5.8.5.1";
        readonly summary: "A step needs a target";
        readonly implemented: true;
    };
    readonly 'arazzo-step-operation-id-qualified': {
        readonly severity: "error";
        readonly layer: "semantic";
        readonly section: "§5.8.5.1";
        readonly summary: "With several non-arazzo sources, operationId MUST be $sourceDescriptions.<name>.<id>";
        readonly implemented: true;
    };
    readonly 'arazzo-step-operation-resolved': {
        readonly severity: "error";
        readonly layer: "semantic";
        readonly section: "§5.8.5.1";
        readonly summary: "operationId / operationPath resolved in the source";
        readonly implemented: false;
        readonly reason: "Requires loading and parsing the referenced source documents (out of scope for a document-local validator).";
    };
    readonly 'arazzo-step-operation-path-format': {
        readonly severity: "error";
        readonly layer: "semantic";
        readonly section: "§5.8.5.1, §5.6.2";
        readonly summary: "operationPath = {$sourceDescriptions.<name>.url}#<json-pointer>";
        readonly implemented: true;
    };
    readonly 'arazzo-step-operation-path-source-type': {
        readonly severity: "error";
        readonly layer: "semantic";
        readonly section: "§5.8.5.1";
        readonly summary: "operationPath targets an openapi source";
        readonly implemented: true;
    };
    readonly 'arazzo-step-prefer-operation-id': {
        readonly severity: "info";
        readonly layer: "semantic";
        readonly section: "§5.8.5.1";
        readonly summary: "Prefer operationId when the operation has one";
        readonly implemented: false;
        readonly reason: "Requires loading and parsing the referenced source documents (out of scope for a document-local validator).";
    };
    readonly 'arazzo-channel-path-format': {
        readonly severity: "warning";
        readonly layer: "semantic";
        readonly section: "§5.8.5.1";
        readonly summary: "1.1: channelPath = {$sourceDescriptions.<name>.url}#/channels/<key> (warning until the OAI publishes a normative example, R1 § d.5)";
        readonly implemented: true;
    };
    readonly 'arazzo-channel-path-source-type': {
        readonly severity: "error";
        readonly layer: "semantic";
        readonly section: "§5.8.5.1";
        readonly summary: "1.1: channelPath targets an asyncapi source";
        readonly implemented: true;
    };
    readonly 'arazzo-step-workflow-resolved': {
        readonly severity: "error";
        readonly layer: "semantic";
        readonly section: "§5.8.5.1";
        readonly summary: "Step workflowId: local workflow or $sourceDescriptions.<arazzo>.<wf>";
        readonly implemented: true;
    };
    readonly 'arazzo-step-workflow-qualified': {
        readonly severity: "error";
        readonly layer: "semantic";
        readonly section: "§5.8.5.1";
        readonly summary: "A workflow of another document MUST be referenced with $sourceDescriptions";
        readonly implemented: true;
    };
    readonly 'arazzo-step-workflow-requestbody': {
        readonly severity: "warning";
        readonly layer: "semantic";
        readonly section: "§5.8.5.1";
        readonly summary: "requestBody has no effect on a workflow step";
        readonly implemented: true;
    };
    readonly 'arazzo-source-type-recommended': {
        readonly severity: "warning";
        readonly layer: "semantic";
        readonly section: "§5.8.3.1";
        readonly summary: "Source used by an async step or operationPath should declare its type";
        readonly implemented: true;
    };
    readonly 'arazzo-async-action-enum': {
        readonly severity: "error";
        readonly layer: "both";
        readonly section: "§5.8.5.1";
        readonly summary: "action ∈ {send, receive}";
        readonly implemented: true;
    };
    readonly 'arazzo-async-action-only-asyncapi': {
        readonly severity: "error";
        readonly layer: "semantic";
        readonly section: "§5.8.5.1";
        readonly summary: "action only on AsyncAPI steps";
        readonly implemented: true;
    };
    readonly 'arazzo-async-action-required': {
        readonly severity: "error";
        readonly layer: "both";
        readonly section: "§5.8.5.1";
        readonly summary: "AsyncAPI steps declare action";
        readonly implemented: true;
    };
    readonly 'arazzo-async-action-mismatch': {
        readonly severity: "warning";
        readonly layer: "semantic";
        readonly section: "§5.8.5.1, §5.8.5.3";
        readonly summary: "action consistent with the AsyncAPI operation action";
        readonly implemented: false;
        readonly reason: "Requires loading and parsing the referenced source documents (out of scope for a document-local validator).";
    };
    readonly 'arazzo-async-correlation-receive-only': {
        readonly severity: "error";
        readonly layer: "both";
        readonly section: "§5.8.5.1";
        readonly summary: "correlationId only with action: receive";
        readonly implemented: true;
    };
    readonly 'arazzo-async-correlation-only-asyncapi': {
        readonly severity: "error";
        readonly layer: "semantic";
        readonly section: "§5.8.5.1";
        readonly summary: "correlationId only on AsyncAPI steps";
        readonly implemented: true;
    };
    readonly 'arazzo-async-correlation-type': {
        readonly severity: "warning";
        readonly layer: "semantic";
        readonly section: "§5.8.5.1";
        readonly summary: "correlationId should be a string (runtime expression)";
        readonly implemented: true;
    };
    readonly 'arazzo-step-timeout-positive': {
        readonly severity: "warning";
        readonly layer: "both";
        readonly section: "§5.8.5.1";
        readonly summary: "timeout is a positive integer (ms)";
        readonly implemented: true;
    };
    readonly 'arazzo-async-receive-timeout-recommended': {
        readonly severity: "info";
        readonly layer: "semantic";
        readonly section: "§5.8.5.3";
        readonly summary: "receive without timeout may wait forever";
        readonly implemented: true;
    };
    readonly 'arazzo-async-receive-success-criteria': {
        readonly severity: "info";
        readonly layer: "semantic";
        readonly section: "§5.8.5.3";
        readonly summary: "receive should define successCriteria";
        readonly implemented: true;
    };
    readonly 'arazzo-async-http-expression': {
        readonly severity: "warning";
        readonly layer: "semantic";
        readonly section: "§5.9, §5.8.5.3";
        readonly summary: "$statusCode / $request / $response in an AsyncAPI step";
        readonly implemented: true;
    };
    readonly 'arazzo-async-param-in': {
        readonly severity: "warning";
        readonly layer: "semantic";
        readonly section: "§5.8.6";
        readonly summary: "AsyncAPI step parameters: only header / channel make sense";
        readonly implemented: true;
    };
    readonly 'arazzo-param-in-channel': {
        readonly severity: "error";
        readonly layer: "semantic";
        readonly section: "§5.8.6 (DEV PR #615)";
        readonly summary: "in: channel outside an AsyncAPI step (info on AsyncAPI steps: post-1.1.0 clarification)";
        readonly implemented: true;
    };
    readonly 'arazzo-step-depends-on-shape': {
        readonly severity: "error";
        readonly layer: "schema";
        readonly section: "§5.8.5.1";
        readonly summary: "Valid dependsOn form, non-empty, unique";
        readonly implemented: true;
    };
    readonly 'arazzo-step-depends-on-resolved': {
        readonly severity: "error";
        readonly layer: "semantic";
        readonly section: "§5.8.5.1";
        readonly summary: "dependsOn target exists";
        readonly implemented: true;
    };
    readonly 'arazzo-step-depends-on-self': {
        readonly severity: "error";
        readonly layer: "semantic";
        readonly section: "§5.8.5.1";
        readonly summary: "A step cannot depend on itself";
        readonly implemented: true;
    };
    readonly 'arazzo-step-depends-on-cycle': {
        readonly severity: "error";
        readonly layer: "semantic";
        readonly section: "§5.8.5.2.4";
        readonly summary: "No cycle in explicit + implicit ($steps.X.outputs) dependencies";
        readonly implemented: true;
    };
    readonly 'arazzo-step-forward-output-reference': {
        readonly severity: "error";
        readonly layer: "semantic";
        readonly section: "§5.8.5.2.5";
        readonly summary: "Without dependsOn, no reference to the outputs of a later step";
        readonly implemented: true;
    };
    readonly 'arazzo-step-depends-on-sync': {
        readonly severity: "info";
        readonly layer: "semantic";
        readonly section: "§5.8.5.2.1";
        readonly summary: "dependsOn in a purely synchronous context: array order is recommended";
        readonly implemented: true;
    };
    readonly 'arazzo-workflow-depends-on-resolved': {
        readonly severity: "error";
        readonly layer: "semantic";
        readonly section: "§5.8.4.1";
        readonly summary: "Workflow.dependsOn target exists";
        readonly implemented: true;
    };
    readonly 'arazzo-workflow-depends-on-qualified': {
        readonly severity: "error";
        readonly layer: "semantic";
        readonly section: "§5.8.4.1";
        readonly summary: "Remote workflows go through $sourceDescriptions";
        readonly implemented: true;
    };
    readonly 'arazzo-workflow-depends-on-cycle': {
        readonly severity: "error";
        readonly layer: "semantic";
        readonly section: "§5.8.4.1";
        readonly summary: "No cycle between workflows";
        readonly implemented: true;
    };
    readonly 'arazzo-action-goto-target': {
        readonly severity: "error";
        readonly layer: "schema";
        readonly section: "§5.8.7.1, §5.8.8.1";
        readonly summary: "goto needs exactly one of stepId / workflowId";
        readonly implemented: true;
    };
    readonly 'arazzo-action-target-exclusive': {
        readonly severity: "error";
        readonly layer: "semantic";
        readonly section: "§5.8.8.1";
        readonly summary: "stepId and workflowId are exclusive (also for retry)";
        readonly implemented: true;
    };
    readonly 'arazzo-action-goto-step-exists': {
        readonly severity: "error";
        readonly layer: "semantic";
        readonly section: "§5.8.7.1, §5.8.8.1";
        readonly summary: "Target stepId exists in the current workflow";
        readonly implemented: true;
    };
    readonly 'arazzo-action-goto-workflow-exists': {
        readonly severity: "error";
        readonly layer: "semantic";
        readonly section: "§5.8.7.1, §5.8.8.1";
        readonly summary: "Target workflowId exists";
        readonly implemented: true;
    };
    readonly 'arazzo-action-field-irrelevant': {
        readonly severity: "warning";
        readonly layer: "semantic";
        readonly section: "§5.8.7.1, §5.8.8.1";
        readonly summary: "Field without effect for this action type";
        readonly implemented: true;
    };
    readonly 'arazzo-action-retry-values': {
        readonly severity: "error";
        readonly layer: "schema";
        readonly section: "§5.8.8.1";
        readonly summary: "retryAfter ≥ 0, retryLimit integer ≥ 0";
        readonly implemented: true;
    };
    readonly 'arazzo-action-parameters-require-workflow': {
        readonly severity: "error";
        readonly layer: "schema";
        readonly section: "§5.8.7.1, §5.8.8.1";
        readonly summary: "1.1: action parameters only with workflowId";
        readonly implemented: true;
    };
    readonly 'arazzo-action-parameters-shape': {
        readonly severity: "error";
        readonly layer: "semantic";
        readonly section: "§5.8.7.1, §5.8.8.1";
        readonly summary: "1.1: action parameters are Parameter (no in) or Reusable Objects";
        readonly implemented: true;
    };
    readonly 'arazzo-action-parameters-no-in': {
        readonly severity: "error";
        readonly layer: "semantic";
        readonly section: "§5.8.7.1, §5.8.8.1";
        readonly summary: "1.1: `in` MUST NOT be used in action parameters";
        readonly implemented: true;
    };
    readonly 'arazzo-workflow-parameters-match-inputs': {
        readonly severity: "warning";
        readonly layer: "semantic";
        readonly section: "§5.8.5.1, §5.8.6.1";
        readonly summary: "Parameters passed to a workflow match its inputs";
        readonly implemented: true;
    };
    readonly 'arazzo-workflow-step-param-in': {
        readonly severity: "info";
        readonly layer: "semantic";
        readonly section: "§5.8.6.1";
        readonly summary: "`in` is ignored on workflow step parameters";
        readonly implemented: true;
    };
    readonly 'arazzo-param-in-required': {
        readonly severity: "error";
        readonly layer: "schema";
        readonly section: "§5.8.6.1";
        readonly summary: "`in` required for operation targets";
        readonly implemented: true;
    };
    readonly 'arazzo-param-in-enum': {
        readonly severity: "error";
        readonly layer: "schema";
        readonly section: "§5.8.6.1";
        readonly summary: "`in` value is valid";
        readonly implemented: true;
    };
    readonly 'arazzo-param-querystring-exclusive': {
        readonly severity: "error";
        readonly layer: "semantic";
        readonly section: "§5.8.6";
        readonly summary: "1.1: querystring cannot coexist with query";
        readonly implemented: true;
    };
    readonly 'arazzo-param-querystring-single': {
        readonly severity: "warning";
        readonly layer: "semantic";
        readonly section: "§5.8.6";
        readonly summary: "1.1: at most one querystring parameter";
        readonly implemented: true;
    };
    readonly 'arazzo-param-querystring-string': {
        readonly severity: "error";
        readonly layer: "semantic";
        readonly section: "§5.8.6.1";
        readonly summary: "1.1: querystring value resolves to a string";
        readonly implemented: true;
    };
    readonly 'arazzo-param-resolved': {
        readonly severity: "warning";
        readonly layer: "semantic";
        readonly section: "§5.8.6, §5.9.1";
        readonly summary: "Parameter exists in the target operation";
        readonly implemented: false;
        readonly reason: "Requires loading and parsing the referenced source documents (out of scope for a document-local validator).";
    };
    readonly 'arazzo-reusable-reference-resolved': {
        readonly severity: "error";
        readonly layer: "semantic";
        readonly section: "§5.8.10.1, §5.9";
        readonly summary: "Reusable reference points to an existing component";
        readonly implemented: true;
    };
    readonly 'arazzo-reusable-reference-kind': {
        readonly severity: "error";
        readonly layer: "semantic";
        readonly section: "§5.8.4.1, §5.8.5.1";
        readonly summary: "Component kind matches the context";
        readonly implemented: true;
    };
    readonly 'arazzo-reusable-value-parameter-only': {
        readonly severity: "warning";
        readonly layer: "semantic";
        readonly section: "§5.8.10.1";
        readonly summary: "Reusable `value` only for parameters";
        readonly implemented: true;
    };
    readonly 'arazzo-components-inputs-ref': {
        readonly severity: "error";
        readonly layer: "semantic";
        readonly section: "§5.8.10, §5.9";
        readonly summary: "$components.inputs.* is not a runtime expression: use $ref";
        readonly implemented: true;
    };
    readonly 'arazzo-components-ref-resolved': {
        readonly severity: "error";
        readonly layer: "semantic";
        readonly section: "§5.6.2";
        readonly summary: "Local $ref in inputs resolves";
        readonly implemented: true;
    };
    readonly 'arazzo-components-unused': {
        readonly severity: "info";
        readonly layer: "semantic";
        readonly section: "§5.8.9";
        readonly summary: "Component never referenced";
        readonly implemented: true;
    };
    readonly 'arazzo-criterion-context-required': {
        readonly severity: "error";
        readonly layer: "schema";
        readonly section: "§5.8.11.5";
        readonly summary: "`context` required when `type` is set";
        readonly implemented: true;
    };
    readonly 'arazzo-criterion-type-enum': {
        readonly severity: "error";
        readonly layer: "schema";
        readonly section: "§5.8.11.5";
        readonly summary: "Criterion type is valid";
        readonly implemented: true;
    };
    readonly 'arazzo-criterion-eto-jsonpointer': {
        readonly severity: "warning";
        readonly layer: "semantic";
        readonly section: "§5.8.11.5, §5.8.12";
        readonly summary: "jsonpointer has no condition semantics";
        readonly implemented: true;
    };
    readonly 'arazzo-criterion-syntax': {
        readonly severity: "error";
        readonly layer: "semantic";
        readonly section: "§5.8.11.1-4";
        readonly summary: "Condition syntax valid for its type";
        readonly implemented: true;
    };
    readonly 'arazzo-criterion-embedded-expression': {
        readonly severity: "error";
        readonly layer: "semantic";
        readonly section: "§5.8.11.3";
        readonly summary: "regex / jsonpath / xpath: runtime expressions MUST be embedded in {}";
        readonly implemented: true;
    };
    readonly 'arazzo-success-criteria-non-empty': {
        readonly severity: "error";
        readonly layer: "schema";
        readonly section: "§5.8.5.1";
        readonly summary: "successCriteria not empty";
        readonly implemented: true;
    };
    readonly 'arazzo-eto-version': {
        readonly severity: "error";
        readonly layer: "schema";
        readonly section: "§5.8.12.1";
        readonly summary: "Expression Type Object: type + compatible version";
        readonly implemented: true;
    };
    readonly 'arazzo-selector-required-fields': {
        readonly severity: "error";
        readonly layer: "schema";
        readonly section: "§5.8.13.1";
        readonly summary: "Selector: context, selector, type required";
        readonly implemented: true;
    };
    readonly 'arazzo-selector-context-structured': {
        readonly severity: "warning";
        readonly layer: "semantic";
        readonly section: "§5.8.13.1";
        readonly summary: "Selector context points to structured data";
        readonly implemented: true;
    };
    readonly 'arazzo-selector-syntax': {
        readonly severity: "error";
        readonly layer: "semantic";
        readonly section: "§5.8.13.1";
        readonly summary: "selector valid for its type";
        readonly implemented: true;
    };
    readonly 'arazzo-selector-misplaced': {
        readonly severity: "warning";
        readonly layer: "semantic";
        readonly section: "§5.8.13";
        readonly summary: "Selector-shaped object where it is taken literally (Reusable.value)";
        readonly implemented: true;
    };
    readonly 'arazzo-replacement-target-syntax': {
        readonly severity: "error";
        readonly layer: "semantic";
        readonly section: "§5.8.15.1";
        readonly summary: "target consistent with targetSelectorType / content type";
        readonly implemented: true;
    };
    readonly 'arazzo-replacement-literal-value': {
        readonly severity: "info";
        readonly layer: "semantic";
        readonly section: "§5.8.15.1, DEV PR #614";
        readonly summary: "Non-string literal value (neutralised S11 false positive)";
        readonly implemented: true;
    };
    readonly 'arazzo-expression-syntax': {
        readonly severity: "error";
        readonly layer: "semantic";
        readonly section: "§5.9";
        readonly summary: "Runtime expression respects the ABNF";
        readonly implemented: true;
    };
    readonly 'arazzo-expression-steps-resolved': {
        readonly severity: "error";
        readonly layer: "semantic";
        readonly section: "§5.9, §5.8.5.1";
        readonly summary: "$steps.<id>.outputs.<name> resolves";
        readonly implemented: true;
    };
    readonly 'arazzo-expression-workflows-resolved': {
        readonly severity: "error";
        readonly layer: "semantic";
        readonly section: "§5.9";
        readonly summary: "$workflows.<id>.(inputs|outputs).<name> resolves";
        readonly implemented: true;
    };
    readonly 'arazzo-expression-inputs-declared': {
        readonly severity: "warning";
        readonly layer: "semantic";
        readonly section: "§5.9";
        readonly summary: "$inputs.<name> declared in the workflow inputs";
        readonly implemented: true;
    };
    readonly 'arazzo-expression-source-resolved': {
        readonly severity: "error";
        readonly layer: "semantic";
        readonly section: "§5.9.2";
        readonly summary: "$sourceDescriptions.<name> exists";
        readonly implemented: true;
    };
    readonly 'arazzo-expression-components-resolved': {
        readonly severity: "error";
        readonly layer: "semantic";
        readonly section: "§5.9";
        readonly summary: "$components.<type>.<key> exists";
        readonly implemented: true;
    };
    readonly 'arazzo-expression-self-defined': {
        readonly severity: "warning";
        readonly layer: "semantic";
        readonly section: "§5.9.1";
        readonly summary: "1.1: $self used without a root $self";
        readonly implemented: true;
    };
    readonly 'arazzo-expression-message-context': {
        readonly severity: "warning";
        readonly layer: "semantic";
        readonly section: "§5.9.1";
        readonly summary: "1.1: $message outside an AsyncAPI step";
        readonly implemented: true;
    };
    readonly 'arazzo-expression-components-scope': {
        readonly severity: "info";
        readonly layer: "semantic";
        readonly section: "§5.8.9";
        readonly summary: "Components are document-scoped (remote workflows)";
        readonly implemented: false;
        readonly reason: "Requires loading and parsing the referenced source documents (out of scope for a document-local validator).";
    };
    readonly 'arazzo-source-url-uri-reference': {
        readonly severity: "error";
        readonly layer: "semantic";
        readonly section: "§5.8.3.1";
        readonly summary: "url is a valid URI-reference";
        readonly implemented: true;
    };
    readonly 'arazzo-source-unresolvable': {
        readonly severity: "warning";
        readonly layer: "semantic";
        readonly section: "§5.5";
        readonly summary: "Source cannot be loaded";
        readonly implemented: false;
        readonly reason: "Requires loading and parsing the referenced source documents (out of scope for a document-local validator).";
    };
    readonly 'arazzo-source-identity': {
        readonly severity: "warning";
        readonly layer: "semantic";
        readonly section: "§5.5.2";
        readonly summary: "Absolute url vs $self identity";
        readonly implemented: false;
        readonly reason: "Requires loading and parsing the referenced source documents (out of scope for a document-local validator).";
    };
    readonly 'arazzo-source-type-mismatch': {
        readonly severity: "error";
        readonly layer: "semantic";
        readonly section: "§5.8.3.1";
        readonly summary: "Declared type vs loaded document";
        readonly implemented: false;
        readonly reason: "Requires loading and parsing the referenced source documents (out of scope for a document-local validator).";
    };
    readonly 'arazzo-source-unused': {
        readonly severity: "info";
        readonly layer: "semantic";
        readonly section: "§5.8.3";
        readonly summary: "Source never referenced";
        readonly implemented: true;
    };
};
type RuleId = keyof typeof RULES;
/**
 * Codes used by arazzo-vscode ≤ 1.x and their replacement, to ease the
 * migration of the extension (lot V1).
 */
declare const LEGACY_CODE_MAP: Readonly<Record<string, RuleId>>;

interface Diagnostic {
    /** Rule id (see {@link RULES}). */
    code: RuleId;
    message: string;
    severity: Severity;
    /** JSON path of the offending value (may point to a missing property). */
    path: JsonPath;
    /** Source range, when a `yamlDoc` was given to `validate`. */
    range?: SourceRange;
    /** Layer that produced the diagnostic. */
    source: 'schema' | 'semantic';
}

interface ValidateOptions {
    /** The `yaml` Document returned by {@link parseArazzo}: diagnostics then get a `range`. */
    yamlDoc?: Document;
    /** Skip the JSON Schema layer. */
    skipSchema?: boolean;
    /** Skip the semantic layer. */
    skipSemantic?: boolean;
    /** Drop diagnostics below this severity (default: keep all, including `info`). */
    minSeverity?: Severity;
    /** Re-throw internal errors of semantic rules (tests). */
    debug?: boolean;
}
/**
 * Validate an Arazzo document (plain JS value, e.g. `parseArazzo(text).doc`).
 *
 * - Layer (a): official JSON Schema 1.0 or 1.1 (selected by `arazzo`).
 * - Layer (b): semantic rules (references, uniqueness, AsyncAPI, dependsOn…).
 *
 * The result never contains two diagnostics with the same `code` and `path`.
 */
declare function validate(doc: unknown, opts?: ValidateOptions): Diagnostic[];
interface TextValidationResult extends ParseResult {
    diagnostics: Diagnostic[];
}
/** Parse + validate in one call (YAML syntax errors stay in `errors`). */
declare function validateText(text: string, opts?: Omit<ValidateOptions, 'yamlDoc'>): TextValidationResult;

/** Versions published by the OAI and known by this package. */
declare const KNOWN_ARAZZO_VERSIONS: readonly ["1.0.0", "1.0.1", "1.1.0"];
/** `major.minor` feature sets supported by the validator (one JSON Schema each). */
type ArazzoMinor = '1.0' | '1.1';
/** Latest published version, used for migrations. */
declare const LATEST_ARAZZO_VERSION = "1.1.0";
/** True when `root` is an object with an `arazzo` key (Arazzo document heuristic used by the editors). */
declare function isArazzoDocument(root: unknown): boolean;
/** The `arazzo` field as a string (numbers are stringified), or `null`. */
declare function getArazzoVersion(root: unknown): string | null;
/** `major.minor` of a well-formed version string (`1.1.0` → `1.1`), or `null`. */
declare function getArazzoMinor(version: string | null | undefined): string | null;
/** The supported feature set for a version (`1.0.x` → `1.0`, `1.1.x` → `1.1`), or `null`. */
declare function getSupportedMinor(version: string | null | undefined): ArazzoMinor | null;
/**
 * True for any `1.0.x` / `1.1.x` version (patch releases and pre-release
 * suffixes included, as accepted by the official schemas).
 */
declare function isKnownArazzoVersion(version: string): boolean;
/** True when the version string has the `major.minor.patch` form. */
declare function isWellFormedArazzoVersion(version: string): boolean;

interface FeatureUse {
    path: JsonPath;
    feature: string;
    severity: 'error' | 'warning';
}
/** 1.1 features used in a document, with the severity they deserve in a 1.0.x document. */
declare function detect11Features(doc: unknown): FeatureUse[];

type StepTargetKind = 'operationId' | 'operationPath' | 'workflowId' | 'channelPath';
/** Targets present on a step (exactly one when valid). */
declare function stepTargets(step: unknown): StepTargetKind[];
interface ResolvedSource {
    name?: string;
    type?: SourceDescriptionType;
    /** `explicit` = $sourceDescriptions / {$sourceDescriptions…url}; `legacy` = `name.operationId`; `single` = only candidate source. */
    how?: 'explicit' | 'legacy' | 'single';
    /** Name used in the step but not declared. */
    unknownName?: string;
}
/** Which source description a step talks to (best effort, never guesses across several sources). */
declare function resolveStepSource(doc: unknown, step: unknown): ResolvedSource;
interface Resolved<T> {
    value: T;
    /** Index in the original list. */
    index: number;
    /** Set when the item was a Reusable Object. */
    reference?: string;
    /** Component name when resolved from `$components`. */
    componentName?: string;
}
declare const resolveParameters: (doc: unknown, list: unknown) => Resolved<Parameter>[];
declare const resolveSuccessActions: (doc: unknown, list: unknown) => Resolved<SuccessAction>[];
declare const resolveFailureActions: (doc: unknown, list: unknown) => Resolved<FailureAction>[];
interface EffectiveAction<T> extends Resolved<T> {
    /** Where the action is declared. */
    origin: 'step' | 'workflow';
}
/**
 * Actions applicable to a step: the step's own actions, then the workflow-level
 * ones not overridden by name (§ 5.8.4.1 "can be overridden at the step level
 * but cannot be removed there").
 */
declare function effectiveActions<T extends {
    name?: unknown;
}>(doc: unknown, workflow: unknown, step: unknown, kind: 'success' | 'failure'): EffectiveAction<T>[];

type GraphNodeKind = 'input' | 'step-http' | 'step-async-send' | 'step-async-receive' | 'step-workflow' | 'join' | 'output' | 'end-success' | 'end-failure'
/** Target of a `goto workflowId`, of a workflow step, or of a cross-workflow dependsOn (R5 "Référence de workflow"). */
 | 'workflow-ref';
type GraphEdgeKind = 'sequence' | 'success-goto' | 'failure-goto' | 'retry' | 'end' | 'depends-on' | 'workflow-call';
interface StepInfo {
    stepId: string;
    /** 0-based position in `steps`. */
    index: number;
    description?: string;
    operationId?: string;
    operationPath?: string;
    channelPath?: string;
    workflowId?: string;
    /** Source description the step talks to (never guessed across several sources). */
    source?: {
        name: string;
        type?: SourceDescriptionType;
        how: NonNullable<ResolvedSource['how']>;
    };
    /** HTTP method in upper case, only when known (operationPath or resolver) — never inferred from the operationId. */
    method?: string;
    /** HTTP path template (`/pets/{id}`), when known. */
    path?: string;
    methodSource?: 'operationPath' | 'resolver';
    action?: AsyncAction;
    correlationId?: unknown;
    /** Milliseconds. */
    timeout?: number;
    dependsOn?: string[];
    successCriteria: Criterion[];
    outputs: string[];
    parameters: {
        name: string;
        in?: string;
    }[];
    hasRequestBody: boolean;
    /** Workflow-level success/failure actions apply to this step. */
    usesWorkflowActions: boolean;
    /** For workflow steps: the called workflow lives in another document. */
    external?: boolean;
}
interface InputProperty {
    name: string;
    required: boolean;
    type?: string;
    description?: string;
    default?: unknown;
}
interface GraphNode {
    id: string;
    kind: GraphNodeKind;
    label: string;
    /** Lane / cluster ({@link GraphGroup.id}). */
    group: string;
    step?: StepInfo;
    /** `input` nodes. */
    properties?: InputProperty[];
    /** `output` nodes: output name → expression or Selector. */
    outputs?: Record<string, OutputValue>;
    /** `join` nodes: ids of the nodes waited for. */
    waitsFor?: string[];
    /** `workflow-ref` nodes. */
    ref?: {
        workflowId: string;
        stepId?: string;
        sourceName?: string;
        external: boolean;
        resolved: boolean;
        summary?: string;
        stepCount?: number;
    };
}
interface GraphEdge {
    id: string;
    kind: GraphEdgeKind;
    source: string;
    target: string;
    /** Default short label (renderers may build their own from the data). */
    label?: string;
    /** For `end`, goto and retry edges. */
    outcome?: 'success' | 'failure';
    /** The action behind the edge (resolved from `$components` when needed). */
    action?: {
        name: string;
        type: string;
        origin: 'step' | 'workflow';
        component?: string;
    };
    criteria?: Criterion[];
    /** True when the edge only applies if its criteria match. */
    conditional: boolean;
    /** `retry` edges: effective limit (default 1 per § 5.8.8.1) and delay in seconds. */
    retryLimit?: number;
    retryAfter?: number;
    retryLimitIsDefault?: boolean;
    /** `retry` edge towards the step/workflow executed before retrying (the self-loop is a separate edge). */
    via?: boolean;
    /** goto to another workflow. */
    transfer?: boolean;
    /** Implicit failure (no onFailure): only with `includeImplicitFailures`. */
    implicit?: boolean;
}
interface GraphGroup {
    id: string;
    kind: 'source' | 'workflow' | 'unknown';
    label: string;
    sourceName?: string;
    sourceType?: SourceDescriptionType;
    nodeIds: string[];
}
interface WorkflowGraph {
    workflowId: string;
    /**
     * Position of the workflow in `workflows` (document order). Lets consumers map
     * diagnostics paths (`['workflows', workflowIndex, 'steps', step.index, …]`) onto nodes.
     */
    workflowIndex: number;
    summary?: string;
    nodes: GraphNode[];
    edges: GraphEdge[];
    /** Lanes by sourceDescription (document order), plus the neutral "workflow" lane. */
    groups: GraphGroup[];
}
interface OperationInfo {
    method?: string;
    path?: string;
}
interface GraphOptions {
    /** Resolve the HTTP method / path of a step from the loaded OpenAPI document (consumer side). */
    resolveOperation?: (step: Step, source: SourceDescription | undefined) => OperationInfo | undefined;
    /** Draw workflow-level successActions / failureActions on each step (default true). Edges carry `action.origin`. */
    includeWorkflowActions?: boolean;
    /** Draw an implicit failure edge to "end-failure" for steps without failure actions (default false). */
    includeImplicitFailures?: boolean;
}
declare const WORKFLOW_LANE = "lane:workflow";
declare const UNKNOWN_LANE = "lane:unknown";
/** `{$sourceDescriptions.x.url}#/paths/~1pets~1{id}/get` → `{ method: 'GET', path: '/pets/{id}' }`. */
declare function operationFromPath(operationPath: string): OperationInfo | undefined;
/**
 * Build the graph of one workflow. Throws when the workflow does not exist.
 */
declare function workflowToGraph(doc: unknown, workflowId: string, opts?: GraphOptions): WorkflowGraph;
interface MermaidOptions {
    direction?: 'TB' | 'LR' | 'BT' | 'RL';
    /** Wrap nodes in one subgraph per lane. */
    lanes?: boolean;
    /** Omit failure-goto, retry and failure end edges. */
    hideFailures?: boolean;
}
/** Mermaid `flowchart` source for a graph built by {@link workflowToGraph}. */
declare function graphToMermaid(graph: WorkflowGraph, opts?: MermaidOptions): string;

type ExpressionRoot = 'url' | 'method' | 'statusCode' | 'request' | 'response' | 'message' | 'inputs' | 'outputs' | 'steps' | 'workflows' | 'sourceDescriptions' | 'components' | 'self';
declare const EXPRESSION_ROOTS: readonly ExpressionRoot[];
interface ParsedExpression {
    /** The expression text (without surrounding `{}`). */
    raw: string;
    root: ExpressionRoot;
    /** `$request.header.X` → `header`; `$response.body` → `body`… */
    source?: 'header' | 'query' | 'path' | 'body' | 'payload';
    /** Header / query / path parameter name. */
    name?: string;
    /** `$steps.<stepId>`, `$workflows.<workflowId>`, `$sourceDescriptions.<name>`. */
    id?: string;
    /** `$steps.x.outputs.<field>`, `$workflows.x.inputs.<field>`, `$inputs.<field>`, `$outputs.<field>`, `$components.parameters.<field>`… */
    field?: string;
    /** `inputs` / `outputs` for `$workflows`; `parameters` / `successActions` / `failureActions` for `$components`. */
    section?: string;
    /** `$sourceDescriptions.<name>.<reference>`. */
    reference?: string;
    /** JSON Pointer after `#`. */
    pointer?: string;
}
interface ExpressionProblem {
    message: string;
    severity: 'error' | 'warning';
}
type ExpressionParseResult = {
    ok: true;
    expression: ParsedExpression;
    warning?: ExpressionProblem;
} | {
    ok: false;
    problem: ExpressionProblem;
};
/**
 * Parse a runtime expression against the 1.1 ABNF (§ 5.9), which is a
 * superset of the 1.0 grammar except for `$message` and `$self` (reported by
 * the caller as version mismatch for 1.0 documents).
 *
 * Common but non-ABNF forms such as `$response.body.items[0].id` are accepted
 * with a warning suggesting the JSON Pointer form (`$response.body#/items/0/id`).
 */
declare function parseRuntimeExpression(expr: string): ExpressionParseResult;
interface EmbeddedExpression {
    expression: string;
    /** Offset of `{` in the host string. */
    start: number;
    /** Offset after `}`. */
    end: number;
}
/** Expressions embedded in a string with `{$…}` (§ 5.9 "expression-string"). */
declare function findEmbeddedExpressions(text: string): EmbeddedExpression[];
/**
 * All runtime expressions found in a value: the whole string when it starts
 * with `$`, otherwise the `{$…}` embedded ones.
 */
declare function expressionsInString(text: string): string[];
/** Error message, or `null` when valid. Accepts the URI fragment form (`#/a`). */
declare function checkJsonPointer(ptr: string): string | null;
/** Error message, or `null` when the JSONPath query is syntactically valid (RFC 9535). */
declare function checkJsonPath(query: string): string | null;
/** Lenient XPath check: non-empty, balanced brackets and quotes. */
declare function checkXPath(expr: string): string | null;
/** Error message, or `null` when the ECMA-262 regular expression compiles. */
declare function checkRegex(pattern: string): string | null;
interface SimpleConditionResult {
    error: string | null;
    /** Runtime expressions found in the condition (for resolution checks). */
    expressions: string[];
}
/**
 * Check a `simple` condition: literals (numbers, `'strings'`, true/false/null),
 * runtime expressions (bare or `{…}`), `== != < <= > >=`, `! && ||`, parentheses.
 */
declare function checkSimpleCondition(condition: string): SimpleConditionResult;
/** True when `s` is a syntactically valid RFC 3986 URI-reference. */
declare function isUriReference(s: string): boolean;

/** Official JSON Schema for Arazzo 1.0.x (https://spec.openapis.org/arazzo/1.0/schema/2025-10-15). */
declare const ARAZZO_SCHEMA_1_0: Record<string, unknown>;
/** Official JSON Schema for Arazzo 1.1.x (https://spec.openapis.org/arazzo/1.1/schema/2026-04-15). */
declare const ARAZZO_SCHEMA_1_1: Record<string, unknown>;

export { ARAZZO_SCHEMA_1_0, ARAZZO_SCHEMA_1_1, type ActionCriterion, type ActionParameter, type ArazzoDocument, type ArazzoInfo, type ArazzoMinor, type ArazzoSpec, type AsyncAction, type Components, type Criterion, type CriterionExpressionType, type CriterionExpressionVersion, type CriterionType, type CriterionTypeName, DEFAULT_EXPRESSION_VERSIONS, type Diagnostic, EXPRESSION_ROOTS, type EffectiveAction, type ExpressionParseResult, type ExpressionRoot, type ExpressionType, type ExpressionTypeName, type ExpressionVersion, type Extensions, type FailureAction, type FailureActionType, type FeatureUse, type GraphEdge, type GraphEdgeKind, type GraphGroup, type GraphNode, type GraphNodeKind, type GraphOptions, type Info, type InputProperty, type JsonPath, type JsonPathVersion, type JsonPointerVersion, type JsonSchema, KNOWN_ARAZZO_VERSIONS, LATEST_ARAZZO_VERSION, LEGACY_CODE_MAP, type LegacyFailureAction, type LegacySourceDescription, type LegacySuccessAction, type LocatedRange, type MermaidOptions, type OperationInfo, type OutputValue, type Parameter, type ParameterLocation, type ParameterValue, type ParseError, type ParseResult, type ParsedExpression, type PayloadReplacement, RULES, type RequestBody, type RequestBodyPayload, type Resolved, type ResolvedSource, type ResolvedStep, type ResolvedWorkflow, type ReusableObject, type RuleId, type RuleInfo, type RuntimeExpression, type SchemaDefinition, type SchemaProperty, type Selector, type Severity, type SourceDescription, type SourceDescriptionType, type SourceRange, type Step, type StepInfo, type SuccessAction, type SuccessActionType, type SuccessCriterion, type TextValidationResult, UNKNOWN_LANE, type ValidateOptions, WORKFLOW_LANE, type Workflow, type WorkflowGraph, type WorkflowInputs, type XPathVersion, checkJsonPath, checkJsonPointer, checkRegex, checkSimpleCondition, checkXPath, createLineIndex, detect11Features, diagnosticRange, effectiveActions, expressionsInString, findEmbeddedExpressions, getArazzoMinor, getArazzoVersion, getSupportedMinor, graphToMermaid, isArazzoDocument, isExpressionType, isKnownArazzoVersion, isReusableObject, isSelector, isUriReference, isWellFormedArazzoVersion, locate, operationFromPath, parseArazzo, parseRuntimeExpression, pathToPointer, pointerToPath, resolveFailureActions, resolveParameters, resolveStepSource, resolveSuccessActions, stepTargets, validate, validateText, workflowToGraph };
