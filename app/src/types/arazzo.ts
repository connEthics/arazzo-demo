// ═══════════════════════════════════════════════════════════════════════════════
// Arazzo Specification Types
// Based on Arazzo 1.0.1 specification
// ═══════════════════════════════════════════════════════════════════════════════

export interface ArazzoSpec {
  arazzo: string;
  info: ArazzoInfo;
  sourceDescriptions?: SourceDescription[];
  workflows: Workflow[];
  components?: Components;
}

export interface ArazzoInfo {
  title: string;
  version: string;
  description?: string;
  summary?: string;
}

export interface SourceDescription {
  name: string;
  url: string;
  type: 'openapi' | 'arazzo';
  description?: string;
}

export interface Workflow {
  workflowId: string;
  summary?: string;
  description?: string;
  inputs?: WorkflowInputs;
  steps: Step[];
  outputs?: Record<string, string>;
  parameters?: Parameter[];
}

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
}

export interface Step {
  stepId: string;
  description?: string;
  operationId?: string;
  operationPath?: string;
  workflowId?: string;
  parameters?: Parameter[];
  requestBody?: RequestBody;
  successCriteria?: SuccessCriterion[];
  outputs?: Record<string, string>;
  onSuccess?: SuccessAction[];
  onFailure?: FailureAction[];
  'x-skip'?: string;
}

export interface Parameter {
  name: string;
  in: 'query' | 'header' | 'path' | 'cookie';
  value: string;
}

export interface RequestBody {
  contentType?: string;
  payload: Record<string, unknown>;
}

export interface SuccessCriterion {
  condition: string;
  context?: string;
  type?: 'jsonpath' | 'simple';
}

export interface SuccessAction {
  name: string;
  type: 'goto' | 'end' | 'retry';
  stepId?: string;
  workflowId?: string;
  criteria?: ActionCriterion[];
  outputs?: Record<string, string>;
}

export interface FailureAction {
  name: string;
  type: 'goto' | 'end' | 'retry';
  stepId?: string;
  workflowId?: string;
  criteria?: ActionCriterion[];
  outputs?: Record<string, string>;
  retryAfter?: number;
  retryLimit?: number;
}

export interface ActionCriterion {
  condition: string;
}

export interface Components {
  inputs?: Record<string, WorkflowInputs>;
  schemas?: Record<string, SchemaDefinition>;
  parameters?: Record<string, Parameter>;
  successActions?: Record<string, SuccessAction>;
  failureActions?: Record<string, FailureAction>;
}

export interface SchemaDefinition {
  type: string;
  required?: string[];
  properties?: Record<string, SchemaProperty>;
  items?: SchemaProperty;
  additionalProperties?: SchemaProperty | boolean;
}
