// ═══════════════════════════════════════════════════════════════════════════════
// Arazzo Specification Types
// Based on Arazzo 1.0.1 specification (16 January 2025)
// https://spec.openapis.org/arazzo/latest.html
// ═══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────────
// 4.6.1 Arazzo Specification Object (Root)
// ─────────────────────────────────────────────────────────────────────────────────
export interface ArazzoSpec {
  /** REQUIRED. Version number of the Arazzo Specification (e.g., "1.0.1") */
  arazzo: string;
  /** REQUIRED. Metadata about the workflows */
  info: ArazzoInfo;
  /** REQUIRED. List of source descriptions (OpenAPI or Arazzo). Must have at least one entry. */
  sourceDescriptions: SourceDescription[];
  /** REQUIRED. List of workflows. Must have at least one entry. */
  workflows: Workflow[];
  /** Optional. Reusable components for the Arazzo Description */
  components?: Components;
}

// ─────────────────────────────────────────────────────────────────────────────────
// 4.6.2 Info Object
// ─────────────────────────────────────────────────────────────────────────────────
export interface ArazzoInfo {
  /** REQUIRED. Human readable title of the Arazzo Description */
  title: string;
  /** REQUIRED. Version identifier of the Arazzo document */
  version: string;
  /** Short summary of the Arazzo Description */
  summary?: string;
  /** Description of the purpose of the workflows. CommonMark syntax MAY be used. */
  description?: string;
}

// ─────────────────────────────────────────────────────────────────────────────────
// 4.6.3 Source Description Object
// ─────────────────────────────────────────────────────────────────────────────────
export interface SourceDescription {
  /** REQUIRED. Unique name for the source description. Should match [A-Za-z0-9_\-]+ */
  name: string;
  /** REQUIRED. URL to the source description (OpenAPI or Arazzo document) */
  url: string;
  /** Type of source description: "openapi" or "arazzo" */
  type?: 'openapi' | 'arazzo';
  /** Description of the source */
  description?: string;
}

// ─────────────────────────────────────────────────────────────────────────────────
// 4.6.4 Workflow Object
// ─────────────────────────────────────────────────────────────────────────────────
export interface Workflow {
  /** REQUIRED. Unique string to represent the workflow. Should match [A-Za-z0-9_\-]+ */
  workflowId: string;
  /** Summary of the purpose or objective of the workflow */
  summary?: string;
  /** Description of the workflow. CommonMark syntax MAY be used. */
  description?: string;
  /** JSON Schema 2020-12 object representing input parameters */
  inputs?: WorkflowInputs;
  /** List of workflow IDs that MUST be completed before this workflow */
  dependsOn?: string[];
  /** REQUIRED. Ordered list of steps */
  steps: Step[];
  /** Success actions applicable for all steps (can be overridden at step level) */
  successActions?: (SuccessAction | ReusableObject)[];
  /** Failure actions applicable for all steps (can be overridden at step level) */
  failureActions?: (FailureAction | ReusableObject)[];
  /** Map between friendly name and dynamic output value */
  outputs?: Record<string, string>;
  /** Parameters applicable for all steps (can be overridden at step level) */
  parameters?: (Parameter | ReusableObject)[];
}

// ─────────────────────────────────────────────────────────────────────────────────
// Workflow Inputs (JSON Schema subset)
// ─────────────────────────────────────────────────────────────────────────────────
export interface WorkflowInputs {
  type: string;
  required?: string[];
  properties?: Record<string, SchemaProperty>;
}

export interface SchemaProperty {
  type: string;
  description?: string;
  default?: unknown;
  enum?: string[];
  format?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  example?: unknown;
  const?: unknown;
  items?: SchemaProperty;
  properties?: Record<string, SchemaProperty>;
  additionalProperties?: SchemaProperty | boolean;
}

// ─────────────────────────────────────────────────────────────────────────────────
// 4.6.5 Step Object
// ─────────────────────────────────────────────────────────────────────────────────
export interface Step {
  /** REQUIRED. Unique string to represent the step. Should match [A-Za-z0-9_\-]+ */
  stepId: string;
  /** Description of the step. CommonMark syntax MAY be used. */
  description?: string;
  /** Name of an existing operation (mutually exclusive with operationPath and workflowId) */
  operationId?: string;
  /** Reference to Source Description + JSON Pointer to operation (mutually exclusive) */
  operationPath?: string;
  /** Reference to another workflow (mutually exclusive with operationId and operationPath) */
  workflowId?: string;
  /** Parameters to pass to the operation or workflow */
  parameters?: (Parameter | ReusableObject)[];
  /** Request body for the operation */
  requestBody?: RequestBody;
  /** Assertions to determine success of the step */
  successCriteria?: Criterion[];
  /** Actions to take upon step success */
  onSuccess?: (SuccessAction | ReusableObject)[];
  /** Actions to take upon step failure */
  onFailure?: (FailureAction | ReusableObject)[];
  /** Map between friendly name and dynamic output value */
  outputs?: Record<string, string>;
  /** Extension: Condition to skip this step */
  'x-skip'?: string;
}

// ─────────────────────────────────────────────────────────────────────────────────
// 4.6.6 Parameter Object
// ─────────────────────────────────────────────────────────────────────────────────
export interface Parameter {
  /** REQUIRED. Name of the parameter (case sensitive) */
  name: string;
  /** Location of the parameter. Required when step specifies operationId/operationPath */
  in?: 'path' | 'query' | 'header' | 'cookie';
  /** REQUIRED. Value to pass (can be constant or Runtime Expression) */
  value: ParameterValue;
}

/** Parameter value can be any JSON value or a Runtime Expression string */
export type ParameterValue = string | number | boolean | null | Record<string, unknown> | unknown[];

// ─────────────────────────────────────────────────────────────────────────────────
// 4.6.7 Success Action Object
// ─────────────────────────────────────────────────────────────────────────────────
export interface SuccessAction {
  /** REQUIRED. Name of the success action (case sensitive) */
  name: string;
  /** REQUIRED. Type of action: "end" or "goto" */
  type: 'end' | 'goto';
  /** Workflow to transfer to (only for "goto" type, mutually exclusive with stepId) */
  workflowId?: string;
  /** Step to transfer to (only for "goto" type, mutually exclusive with workflowId) */
  stepId?: string;
  /** Criteria to determine if this action should be executed */
  criteria?: Criterion[];
  /** Outputs to return (extension) */
  outputs?: Record<string, string>;
}

// ─────────────────────────────────────────────────────────────────────────────────
// 4.6.8 Failure Action Object
// ─────────────────────────────────────────────────────────────────────────────────
export interface FailureAction {
  /** REQUIRED. Name of the failure action (case sensitive) */
  name: string;
  /** REQUIRED. Type of action: "end", "retry", or "goto" */
  type: 'end' | 'retry' | 'goto';
  /** Workflow to transfer to (for "goto" or "retry" types) */
  workflowId?: string;
  /** Step to transfer to (for "goto" or "retry" types) */
  stepId?: string;
  /** Seconds to delay before retry (only for "retry" type) */
  retryAfter?: number;
  /** Maximum retry attempts (only for "retry" type, default: 1) */
  retryLimit?: number;
  /** Criteria to determine if this action should be executed */
  criteria?: Criterion[];
  /** Outputs to return (extension) */
  outputs?: Record<string, string>;
}

// ─────────────────────────────────────────────────────────────────────────────────
// 4.6.9 Components Object
// ─────────────────────────────────────────────────────────────────────────────────
export interface Components {
  /** Reusable JSON Schema objects for workflow inputs */
  inputs?: Record<string, WorkflowInputs>;
  /** Reusable Parameter Objects */
  parameters?: Record<string, Parameter>;
  /** Reusable Success Action Objects */
  successActions?: Record<string, SuccessAction>;
  /** Reusable Failure Action Objects */
  failureActions?: Record<string, FailureAction>;
  /** Extension: Reusable schema definitions */
  schemas?: Record<string, SchemaDefinition>;
}

export interface SchemaDefinition {
  type: string;
  required?: string[];
  properties?: Record<string, SchemaProperty>;
  items?: SchemaProperty;
  additionalProperties?: SchemaProperty | boolean;
}

// ─────────────────────────────────────────────────────────────────────────────────
// 4.6.10 Reusable Object
// ─────────────────────────────────────────────────────────────────────────────────
export interface ReusableObject {
  /** REQUIRED. Runtime Expression to reference the desired object (e.g., $components.parameters.foo) */
  reference: string;
  /** Optional value to override (only for parameter references) */
  value?: ParameterValue;
}

/** Type guard to check if an object is a ReusableObject */
export function isReusableObject(obj: unknown): obj is ReusableObject {
  return typeof obj === 'object' && obj !== null && 'reference' in obj;
}

// ─────────────────────────────────────────────────────────────────────────────────
// 4.6.11 Criterion Object
// ─────────────────────────────────────────────────────────────────────────────────
export interface Criterion {
  /** REQUIRED. Condition to apply (simple expression, regex, JSONPath, or XPath) */
  condition: string;
  /** Runtime Expression to set context for the condition (required if type is specified) */
  context?: string;
  /** Type of condition: "simple", "regex", "jsonpath", "xpath", or CriterionExpressionType */
  type?: CriterionType;
}

/** Criterion type can be a simple string or a detailed expression type object */
export type CriterionType = 'simple' | 'regex' | 'jsonpath' | 'xpath' | CriterionExpressionType;

// ─────────────────────────────────────────────────────────────────────────────────
// 4.6.12 Criterion Expression Type Object
// ─────────────────────────────────────────────────────────────────────────────────
export interface CriterionExpressionType {
  /** REQUIRED. Type of condition: "jsonpath" or "xpath" */
  type: 'jsonpath' | 'xpath';
  /** REQUIRED. Version of the expression type */
  version: CriterionExpressionVersion;
}

/** Allowed versions for JSONPath and XPath expressions */
export type CriterionExpressionVersion = 
  | 'draft-goessner-dispatch-jsonpath-00'  // JSONPath
  | 'xpath-30'  // XPath 3.0
  | 'xpath-20'  // XPath 2.0
  | 'xpath-10'; // XPath 1.0

// ─────────────────────────────────────────────────────────────────────────────────
// 4.6.13 Request Body Object
// ─────────────────────────────────────────────────────────────────────────────────
export interface RequestBody {
  /** Content-Type for the request (e.g., "application/json") */
  contentType?: string;
  /** Request body payload (can be any value including Runtime Expressions) */
  payload: RequestBodyPayload;
  /** List of locations and values to set within the payload */
  replacements?: PayloadReplacement[];
}

/** Payload can be any JSON value, a string template, or an object */
export type RequestBodyPayload = string | number | boolean | null | Record<string, unknown> | unknown[];

// ─────────────────────────────────────────────────────────────────────────────────
// 4.6.14 Payload Replacement Object
// ─────────────────────────────────────────────────────────────────────────────────
export interface PayloadReplacement {
  /** REQUIRED. JSON Pointer or XPath Expression to identify location in payload */
  target: string;
  /** REQUIRED. Value to set at the target location (can be constant or Runtime Expression) */
  value: ParameterValue;
}

// ─────────────────────────────────────────────────────────────────────────────────
// Legacy type aliases for backward compatibility
// ─────────────────────────────────────────────────────────────────────────────────

/** @deprecated Use Criterion instead */
export type SuccessCriterion = Criterion;

/** @deprecated Use Criterion instead */
export interface ActionCriterion {
  condition: string;
}

// ─────────────────────────────────────────────────────────────────────────────────
// Utility types for resolved objects (after $ref resolution)
// ─────────────────────────────────────────────────────────────────────────────────

/** Step with all ReusableObjects resolved to their actual values */
export interface ResolvedStep extends Omit<Step, 'parameters' | 'onSuccess' | 'onFailure'> {
  parameters?: Parameter[];
  onSuccess?: SuccessAction[];
  onFailure?: FailureAction[];
}

/** Workflow with all ReusableObjects resolved */
export interface ResolvedWorkflow extends Omit<Workflow, 'parameters' | 'successActions' | 'failureActions'> {
  parameters?: Parameter[];
  successActions?: SuccessAction[];
  failureActions?: FailureAction[];
}
