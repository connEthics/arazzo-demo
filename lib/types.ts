// Arazzo Specification Types
export interface ArazzoDocument {
  arazzo: string;
  info: ArazzoInfo;
  sourceDescriptions?: SourceDescription[];
  workflows: Workflow[];
  components?: Components;
}

export interface ArazzoInfo {
  title: string;
  summary?: string;
  description?: string;
  version: string;
}

export interface SourceDescription {
  name: string;
  type?: string;
  url?: string;
}

export interface Workflow {
  workflowId: string;
  summary?: string;
  description?: string;
  inputs?: any;
  steps: Step[];
  outputs?: any;
  parameters?: Parameter[];
  successActions?: SuccessAction[];
  failureActions?: FailureAction[];
}

export interface Step {
  stepId: string;
  description?: string;
  operationId?: string;
  operationPath?: string;
  workflowId?: string;
  parameters?: Parameter[];
  requestBody?: RequestBody;
  successCriteria?: Criterion[];
  onSuccess?: SuccessAction[];
  onFailure?: FailureAction[];
  outputs?: Record<string, string>;
}

export interface Parameter {
  name: string;
  in?: string;
  value?: any;
}

export interface RequestBody {
  contentType?: string;
  payload?: any;
}

export interface Criterion {
  condition: string;
  type?: string;
}

export interface SuccessAction {
  name: string;
  type: string;
  workflowId?: string;
  stepId?: string;
}

export interface FailureAction {
  name: string;
  type: string;
  workflowId?: string;
  stepId?: string;
}

export interface Components {
  inputs?: Record<string, any>;
  parameters?: Record<string, Parameter>;
  successActions?: Record<string, SuccessAction>;
  failureActions?: Record<string, FailureAction>;
}
