// Catalog of validation rules (R1 § c, research/01-spec-delta-1.1.md).
// `layer` tells which layer emits the code:
//   - schema   : translated from an Ajv error of the official JSON Schema;
//   - semantic : computed by the semantic layer;
//   - both     : the schema covers part of the rule, the semantic layer the rest
//                (duplicates are removed: same code + same path).

export type Severity = 'error' | 'warning' | 'info' | 'hint';

export interface RuleInfo {
  severity: Severity;
  layer: 'schema' | 'semantic' | 'both';
  section: string;
  summary: string;
  /** false when the rule needs the source documents (OpenAPI / AsyncAPI / Arazzo) to be loaded. */
  implemented: boolean;
  /** Why the rule is not implemented. */
  reason?: string;
}

const NEEDS_SOURCES = 'Requires loading and parsing the referenced source documents (out of scope for a document-local validator).';

export const RULES = {
  // c.1 Version, structure, schema
  'arazzo-schema': { severity: 'error', layer: 'schema', section: '§5.8', summary: 'Fallback for JSON Schema errors not mapped to a more specific rule', implemented: true },
  'arazzo-version-format': { severity: 'error', layer: 'both', section: '§5.1, §5.8.1.1', summary: '`arazzo` is required and has the major.minor.patch form', implemented: true },
  'arazzo-version': { severity: 'warning', layer: 'semantic', section: '§5.1', summary: 'Unknown major.minor version (R1 `arazzo-version-unknown`): no schema applies, only semantic rules run', implemented: true },
  'arazzo-version-feature-mismatch': { severity: 'error', layer: 'semantic', section: '§5.1', summary: '1.1 feature used in a 1.0.x document (warning when the 1.0 schema silently accepts it)', implemented: true },
  'arazzo-migration-param-object-value': { severity: 'error', layer: 'schema', section: '§5.8.6.1', summary: '1.1: a literal object Parameter.value (valid in 1.0) is rejected unless it is a Selector', implemented: true },
  'arazzo-self-recommended': { severity: 'info', layer: 'semantic', section: '§5.5.2, §5.6.1', summary: '1.1: `$self` is recommended for identity-based referencing', implemented: true },
  'arazzo-self-fragment': { severity: 'error', layer: 'schema', section: '§5.8.1.1', summary: '`$self` MUST NOT contain a fragment', implemented: true },
  'arazzo-self-uri-reference': { severity: 'error', layer: 'semantic', section: '§5.8.1.1', summary: '`$self` must be a valid RFC 3986 URI-reference', implemented: true },
  'arazzo-self-relative': { severity: 'info', layer: 'semantic', section: '§5.6.1, App. B', summary: 'Relative `$self` is resolved against the retrieval URI (less portable)', implemented: true },
  'arazzo-unknown-field': { severity: 'error', layer: 'schema', section: '§5.8, §5.10', summary: 'Field not defined by the specification and not an `x-` extension', implemented: true },
  'arazzo-extension-reserved-prefix': { severity: 'warning', layer: 'semantic', section: '§5.10', summary: '`x-oai-`, `x-oas-` and `x-arazzo` prefixes are reserved', implemented: true },
  'arazzo-reusable-no-extension': { severity: 'error', layer: 'schema', section: '§5.8.10.1', summary: 'No additional field on a Reusable Object', implemented: true },
  // c.2 Identifiers & uniqueness
  'arazzo-workflow-id-unique': { severity: 'error', layer: 'semantic', section: '§5.8.4.1', summary: '`workflowId` unique in the document', implemented: true },
  'arazzo-step-id-unique': { severity: 'error', layer: 'semantic', section: '§5.8.5.1', summary: '`stepId` unique in its workflow', implemented: true },
  'arazzo-source-name-unique': { severity: 'error', layer: 'semantic', section: '§5.8.3.1', summary: 'Source description names are unique', implemented: true },
  'arazzo-source-name-pattern': { severity: 'error', layer: 'schema', section: '§5.8.3.1', summary: 'Source name matches [A-Za-z0-9_-]+', implemented: true },
  'arazzo-source-type-enum': { severity: 'error', layer: 'schema', section: '§5.8.3.1', summary: 'Source `type` is openapi, asyncapi (1.1) or arazzo', implemented: true },
  'arazzo-id-pattern': { severity: 'warning', layer: 'semantic', section: '§5.8.4.1, §5.8.5.1, §5.9', summary: '`workflowId` / `stepId` SHOULD match [A-Za-z0-9_-]+', implemented: true },
  'arazzo-key-pattern': { severity: 'error', layer: 'both', section: '§5.8.4.1, §5.8.9', summary: 'Output and component keys match ^[a-zA-Z0-9.\\-_]+$', implemented: true },
  'arazzo-parameter-unique': { severity: 'error', layer: 'semantic', section: '§5.8.6', summary: 'No duplicate parameter (name + in) in a list', implemented: true },
  'arazzo-action-name-unique': { severity: 'error', layer: 'semantic', section: '§5.8.7', summary: 'No duplicate action name in a list', implemented: true },
  // c.3 Step targets
  'arazzo-step-target-exclusive': { severity: 'error', layer: 'semantic', section: '§5.8.5.1', summary: 'Exactly one of operationId, operationPath, workflowId, channelPath', implemented: true },
  'arazzo-step-target-missing': { severity: 'error', layer: 'semantic', section: '§5.8.5.1', summary: 'A step needs a target', implemented: true },
  'arazzo-step-operation-id-qualified': { severity: 'error', layer: 'semantic', section: '§5.8.5.1', summary: 'With several non-arazzo sources, operationId MUST be $sourceDescriptions.<name>.<id>', implemented: true },
  'arazzo-step-operation-resolved': { severity: 'error', layer: 'semantic', section: '§5.8.5.1', summary: 'operationId / operationPath resolved in the source', implemented: false, reason: NEEDS_SOURCES },
  'arazzo-step-operation-path-format': { severity: 'error', layer: 'semantic', section: '§5.8.5.1, §5.6.2', summary: 'operationPath = {$sourceDescriptions.<name>.url}#<json-pointer>', implemented: true },
  'arazzo-step-operation-path-source-type': { severity: 'error', layer: 'semantic', section: '§5.8.5.1', summary: 'operationPath targets an openapi source', implemented: true },
  'arazzo-step-prefer-operation-id': { severity: 'info', layer: 'semantic', section: '§5.8.5.1', summary: 'Prefer operationId when the operation has one', implemented: false, reason: NEEDS_SOURCES },
  'arazzo-channel-path-format': { severity: 'warning', layer: 'semantic', section: '§5.8.5.1', summary: '1.1: channelPath = {$sourceDescriptions.<name>.url}#/channels/<key> (warning until the OAI publishes a normative example, R1 § d.5)', implemented: true },
  'arazzo-channel-path-source-type': { severity: 'error', layer: 'semantic', section: '§5.8.5.1', summary: '1.1: channelPath targets an asyncapi source', implemented: true },
  'arazzo-step-workflow-resolved': { severity: 'error', layer: 'semantic', section: '§5.8.5.1', summary: 'Step workflowId: local workflow or $sourceDescriptions.<arazzo>.<wf>', implemented: true },
  'arazzo-step-workflow-qualified': { severity: 'error', layer: 'semantic', section: '§5.8.5.1', summary: 'A workflow of another document MUST be referenced with $sourceDescriptions', implemented: true },
  'arazzo-step-workflow-requestbody': { severity: 'warning', layer: 'semantic', section: '§5.8.5.1', summary: 'requestBody has no effect on a workflow step', implemented: true },
  'arazzo-source-type-recommended': { severity: 'warning', layer: 'semantic', section: '§5.8.3.1', summary: 'Source used by an async step or operationPath should declare its type', implemented: true },
  // c.4 AsyncAPI
  'arazzo-async-action-enum': { severity: 'error', layer: 'both', section: '§5.8.5.1', summary: 'action ∈ {send, receive}', implemented: true },
  'arazzo-async-action-only-asyncapi': { severity: 'error', layer: 'semantic', section: '§5.8.5.1', summary: 'action only on AsyncAPI steps', implemented: true },
  'arazzo-async-action-required': { severity: 'error', layer: 'both', section: '§5.8.5.1', summary: 'AsyncAPI steps declare action', implemented: true },
  'arazzo-async-action-mismatch': { severity: 'warning', layer: 'semantic', section: '§5.8.5.1, §5.8.5.3', summary: 'action consistent with the AsyncAPI operation action', implemented: false, reason: NEEDS_SOURCES },
  'arazzo-async-correlation-receive-only': { severity: 'error', layer: 'both', section: '§5.8.5.1', summary: 'correlationId only with action: receive', implemented: true },
  'arazzo-async-correlation-only-asyncapi': { severity: 'error', layer: 'semantic', section: '§5.8.5.1', summary: 'correlationId only on AsyncAPI steps', implemented: true },
  'arazzo-async-correlation-type': { severity: 'warning', layer: 'semantic', section: '§5.8.5.1', summary: 'correlationId should be a string (runtime expression)', implemented: true },
  'arazzo-step-timeout-positive': { severity: 'warning', layer: 'both', section: '§5.8.5.1', summary: 'timeout is a positive integer (ms)', implemented: true },
  'arazzo-async-receive-timeout-recommended': { severity: 'info', layer: 'semantic', section: '§5.8.5.3', summary: 'receive without timeout may wait forever', implemented: true },
  'arazzo-async-receive-success-criteria': { severity: 'info', layer: 'semantic', section: '§5.8.5.3', summary: 'receive should define successCriteria', implemented: true },
  'arazzo-async-http-expression': { severity: 'warning', layer: 'semantic', section: '§5.9, §5.8.5.3', summary: '$statusCode / $request / $response in an AsyncAPI step', implemented: true },
  'arazzo-async-param-in': { severity: 'warning', layer: 'semantic', section: '§5.8.6', summary: 'AsyncAPI step parameters: only header / channel make sense', implemented: true },
  'arazzo-param-in-channel': { severity: 'error', layer: 'semantic', section: '§5.8.6 (DEV PR #615)', summary: 'in: channel outside an AsyncAPI step (info on AsyncAPI steps: post-1.1.0 clarification)', implemented: true },
  // c.5 dependsOn
  'arazzo-step-depends-on-shape': { severity: 'error', layer: 'schema', section: '§5.8.5.1', summary: 'Valid dependsOn form, non-empty, unique', implemented: true },
  'arazzo-step-depends-on-resolved': { severity: 'error', layer: 'semantic', section: '§5.8.5.1', summary: 'dependsOn target exists', implemented: true },
  'arazzo-step-depends-on-self': { severity: 'error', layer: 'semantic', section: '§5.8.5.1', summary: 'A step cannot depend on itself', implemented: true },
  'arazzo-step-depends-on-cycle': { severity: 'error', layer: 'semantic', section: '§5.8.5.2.4', summary: 'No cycle in explicit + implicit ($steps.X.outputs) dependencies', implemented: true },
  'arazzo-step-forward-output-reference': { severity: 'error', layer: 'semantic', section: '§5.8.5.2.5', summary: 'Without dependsOn, no reference to the outputs of a later step', implemented: true },
  'arazzo-step-depends-on-sync': { severity: 'info', layer: 'semantic', section: '§5.8.5.2.1', summary: 'dependsOn in a purely synchronous context: array order is recommended', implemented: true },
  'arazzo-workflow-depends-on-resolved': { severity: 'error', layer: 'semantic', section: '§5.8.4.1', summary: 'Workflow.dependsOn target exists', implemented: true },
  'arazzo-workflow-depends-on-qualified': { severity: 'error', layer: 'semantic', section: '§5.8.4.1', summary: 'Remote workflows go through $sourceDescriptions', implemented: true },
  'arazzo-workflow-depends-on-cycle': { severity: 'error', layer: 'semantic', section: '§5.8.4.1', summary: 'No cycle between workflows', implemented: true },
  // c.6 Actions
  'arazzo-action-goto-target': { severity: 'error', layer: 'schema', section: '§5.8.7.1, §5.8.8.1', summary: 'goto needs exactly one of stepId / workflowId', implemented: true },
  'arazzo-action-target-exclusive': { severity: 'error', layer: 'semantic', section: '§5.8.8.1', summary: 'stepId and workflowId are exclusive (also for retry)', implemented: true },
  'arazzo-action-goto-step-exists': { severity: 'error', layer: 'semantic', section: '§5.8.7.1, §5.8.8.1', summary: 'Target stepId exists in the current workflow', implemented: true },
  'arazzo-action-goto-workflow-exists': { severity: 'error', layer: 'semantic', section: '§5.8.7.1, §5.8.8.1', summary: 'Target workflowId exists', implemented: true },
  'arazzo-action-field-irrelevant': { severity: 'warning', layer: 'semantic', section: '§5.8.7.1, §5.8.8.1', summary: 'Field without effect for this action type', implemented: true },
  'arazzo-action-retry-values': { severity: 'error', layer: 'schema', section: '§5.8.8.1', summary: 'retryAfter ≥ 0, retryLimit integer ≥ 0', implemented: true },
  'arazzo-action-parameters-require-workflow': { severity: 'error', layer: 'schema', section: '§5.8.7.1, §5.8.8.1', summary: '1.1: action parameters only with workflowId', implemented: true },
  'arazzo-action-parameters-shape': { severity: 'error', layer: 'semantic', section: '§5.8.7.1, §5.8.8.1', summary: '1.1: action parameters are Parameter (no in) or Reusable Objects', implemented: true },
  'arazzo-action-parameters-no-in': { severity: 'error', layer: 'semantic', section: '§5.8.7.1, §5.8.8.1', summary: '1.1: `in` MUST NOT be used in action parameters', implemented: true },
  'arazzo-workflow-parameters-match-inputs': { severity: 'warning', layer: 'semantic', section: '§5.8.5.1, §5.8.6.1', summary: 'Parameters passed to a workflow match its inputs', implemented: true },
  'arazzo-workflow-step-param-in': { severity: 'info', layer: 'semantic', section: '§5.8.6.1', summary: '`in` is ignored on workflow step parameters', implemented: true },
  // c.7 Parameters, components
  'arazzo-param-in-required': { severity: 'error', layer: 'schema', section: '§5.8.6.1', summary: '`in` required for operation targets', implemented: true },
  'arazzo-param-in-enum': { severity: 'error', layer: 'schema', section: '§5.8.6.1', summary: '`in` value is valid', implemented: true },
  'arazzo-param-querystring-exclusive': { severity: 'error', layer: 'semantic', section: '§5.8.6', summary: '1.1: querystring cannot coexist with query', implemented: true },
  'arazzo-param-querystring-single': { severity: 'warning', layer: 'semantic', section: '§5.8.6', summary: '1.1: at most one querystring parameter', implemented: true },
  'arazzo-param-querystring-string': { severity: 'error', layer: 'semantic', section: '§5.8.6.1', summary: '1.1: querystring value resolves to a string', implemented: true },
  'arazzo-param-resolved': { severity: 'warning', layer: 'semantic', section: '§5.8.6, §5.9.1', summary: 'Parameter exists in the target operation', implemented: false, reason: NEEDS_SOURCES },
  'arazzo-reusable-reference-resolved': { severity: 'error', layer: 'semantic', section: '§5.8.10.1, §5.9', summary: 'Reusable reference points to an existing component', implemented: true },
  'arazzo-reusable-reference-kind': { severity: 'error', layer: 'semantic', section: '§5.8.4.1, §5.8.5.1', summary: 'Component kind matches the context', implemented: true },
  'arazzo-reusable-value-parameter-only': { severity: 'warning', layer: 'semantic', section: '§5.8.10.1', summary: 'Reusable `value` only for parameters', implemented: true },
  'arazzo-components-inputs-ref': { severity: 'error', layer: 'semantic', section: '§5.8.10, §5.9', summary: '$components.inputs.* is not a runtime expression: use $ref', implemented: true },
  'arazzo-components-ref-resolved': { severity: 'error', layer: 'semantic', section: '§5.6.2', summary: 'Local $ref in inputs resolves', implemented: true },
  'arazzo-components-unused': { severity: 'info', layer: 'semantic', section: '§5.8.9', summary: 'Component never referenced', implemented: true },
  // c.8 Criterion, Selector, ETO, PayloadReplacement
  'arazzo-criterion-context-required': { severity: 'error', layer: 'schema', section: '§5.8.11.5', summary: '`context` required when `type` is set', implemented: true },
  'arazzo-criterion-type-enum': { severity: 'error', layer: 'schema', section: '§5.8.11.5', summary: 'Criterion type is valid', implemented: true },
  'arazzo-criterion-eto-jsonpointer': { severity: 'warning', layer: 'semantic', section: '§5.8.11.5, §5.8.12', summary: 'jsonpointer has no condition semantics', implemented: true },
  'arazzo-criterion-syntax': { severity: 'error', layer: 'semantic', section: '§5.8.11.1-4', summary: 'Condition syntax valid for its type', implemented: true },
  'arazzo-criterion-embedded-expression': { severity: 'error', layer: 'semantic', section: '§5.8.11.3', summary: 'regex / jsonpath / xpath: runtime expressions MUST be embedded in {}', implemented: true },
  'arazzo-success-criteria-non-empty': { severity: 'error', layer: 'schema', section: '§5.8.5.1', summary: 'successCriteria not empty', implemented: true },
  'arazzo-eto-version': { severity: 'error', layer: 'schema', section: '§5.8.12.1', summary: 'Expression Type Object: type + compatible version', implemented: true },
  'arazzo-selector-required-fields': { severity: 'error', layer: 'schema', section: '§5.8.13.1', summary: 'Selector: context, selector, type required', implemented: true },
  'arazzo-selector-context-structured': { severity: 'warning', layer: 'semantic', section: '§5.8.13.1', summary: 'Selector context points to structured data', implemented: true },
  'arazzo-selector-syntax': { severity: 'error', layer: 'semantic', section: '§5.8.13.1', summary: 'selector valid for its type', implemented: true },
  'arazzo-selector-misplaced': { severity: 'warning', layer: 'semantic', section: '§5.8.13', summary: 'Selector-shaped object where it is taken literally (Reusable.value)', implemented: true },
  'arazzo-replacement-target-syntax': { severity: 'error', layer: 'semantic', section: '§5.8.15.1', summary: 'target consistent with targetSelectorType / content type', implemented: true },
  'arazzo-replacement-literal-value': { severity: 'info', layer: 'semantic', section: '§5.8.15.1, DEV PR #614', summary: 'Non-string literal value (neutralised S11 false positive)', implemented: true },
  // c.9 Runtime expressions
  'arazzo-expression-syntax': { severity: 'error', layer: 'semantic', section: '§5.9', summary: 'Runtime expression respects the ABNF', implemented: true },
  'arazzo-expression-steps-resolved': { severity: 'error', layer: 'semantic', section: '§5.9, §5.8.5.1', summary: '$steps.<id>.outputs.<name> resolves', implemented: true },
  'arazzo-expression-workflows-resolved': { severity: 'error', layer: 'semantic', section: '§5.9', summary: '$workflows.<id>.(inputs|outputs).<name> resolves', implemented: true },
  'arazzo-expression-inputs-declared': { severity: 'warning', layer: 'semantic', section: '§5.9', summary: '$inputs.<name> declared in the workflow inputs', implemented: true },
  'arazzo-expression-source-resolved': { severity: 'error', layer: 'semantic', section: '§5.9.2', summary: '$sourceDescriptions.<name> exists', implemented: true },
  'arazzo-expression-components-resolved': { severity: 'error', layer: 'semantic', section: '§5.9', summary: '$components.<type>.<key> exists', implemented: true },
  'arazzo-expression-self-defined': { severity: 'warning', layer: 'semantic', section: '§5.9.1', summary: '1.1: $self used without a root $self', implemented: true },
  'arazzo-expression-message-context': { severity: 'warning', layer: 'semantic', section: '§5.9.1', summary: '1.1: $message outside an AsyncAPI step', implemented: true },
  'arazzo-expression-components-scope': { severity: 'info', layer: 'semantic', section: '§5.8.9', summary: 'Components are document-scoped (remote workflows)', implemented: false, reason: NEEDS_SOURCES },
  // c.10 Sources
  'arazzo-source-url-uri-reference': { severity: 'error', layer: 'semantic', section: '§5.8.3.1', summary: 'url is a valid URI-reference', implemented: true },
  'arazzo-source-unresolvable': { severity: 'warning', layer: 'semantic', section: '§5.5', summary: 'Source cannot be loaded', implemented: false, reason: NEEDS_SOURCES },
  'arazzo-source-identity': { severity: 'warning', layer: 'semantic', section: '§5.5.2', summary: 'Absolute url vs $self identity', implemented: false, reason: NEEDS_SOURCES },
  'arazzo-source-type-mismatch': { severity: 'error', layer: 'semantic', section: '§5.8.3.1', summary: 'Declared type vs loaded document', implemented: false, reason: NEEDS_SOURCES },
  'arazzo-source-unused': { severity: 'info', layer: 'semantic', section: '§5.8.3', summary: 'Source never referenced', implemented: true },
} as const satisfies Record<string, RuleInfo>;

export type RuleId = keyof typeof RULES;

/**
 * Codes used by arazzo-vscode ≤ 1.x and their replacement, to ease the
 * migration of the extension (lot V1).
 */
export const LEGACY_CODE_MAP: Readonly<Record<string, RuleId>> = {
  'arazzo-mutual-exclusive': 'arazzo-step-target-exclusive',
  'arazzo-operation-required': 'arazzo-step-target-missing',
  'arazzo-ref-dependsOn': 'arazzo-workflow-depends-on-resolved',
  'arazzo-source-type': 'arazzo-source-type-enum',
  'arazzo-duplicate-stepId': 'arazzo-step-id-unique',
  'arazzo-version': 'arazzo-version',
};
