import React from 'react';

interface Feature {
  category: string;
  name: string;
  status: 'supported' | 'partial' | 'planned';
  description: string;
  specSection?: string;
  specUrl?: string;
  /** New in Arazzo 1.1.0 */
  since11?: boolean;
}

/** Arazzo 1.1.0 (published 17 May 2026). 1.0.x documents remain valid and supported. */
export const SPEC_VERSION = '1.1.0';
export const SPEC_BASE_URL = 'https://spec.openapis.org/arazzo/v1.1.0.html';

export const features: Feature[] = [
  // Document
  { category: 'Document', name: 'arazzo 1.1.0 / 1.0.x', status: 'supported', description: 'Version detection; official JSON Schema 1.1 (2026-04-15) or 1.0 (2025-10-15) chosen from the arazzo field', specSection: '5.8.1', specUrl: '#arazzo-specification-object' },
  { category: 'Document', name: '$self', status: 'supported', description: 'Self-assigned document URI, validated as a URI reference; info when missing in a 1.1 document', specSection: '5.8.1', specUrl: '#arazzo-specification-object', since11: true },
  { category: 'Document', name: 'Reserved extension prefixes', status: 'supported', description: 'x- extensions kept; x-oai-, x-oas- and x-arazzo flagged as reserved', specSection: '5.10', specUrl: '#specification-extensions', since11: true },

  // Source Descriptions
  { category: 'Source Descriptions', name: 'OpenAPI Source', status: 'supported', description: 'type: openapi, loaded in the builder for method badges and parameters', specSection: '5.8.3', specUrl: '#source-description-object' },
  { category: 'Source Descriptions', name: 'AsyncAPI Source', status: 'supported', description: 'type: asyncapi, accepted by the source manager and loaded with the examples', specSection: '5.8.3', specUrl: '#source-description-object', since11: true },
  { category: 'Source Descriptions', name: 'Arazzo Source', status: 'supported', description: 'type: arazzo (remote workflows referenced through $sourceDescriptions)', specSection: '5.8.3', specUrl: '#source-description-object' },

  // Workflows
  { category: 'Workflows', name: 'Inputs / Outputs', status: 'supported', description: 'JSON Schema inputs; outputs as runtime expressions or Selector Objects', specSection: '5.8.4', specUrl: '#workflow-object' },
  { category: 'Workflows', name: 'Parameters & default actions', status: 'supported', description: 'Workflow-level parameters, successActions and failureActions', specSection: '5.8.4', specUrl: '#workflow-object' },
  { category: 'Workflows', name: 'Workflow dependsOn', status: 'supported', description: 'Resolved, cycle-checked workflow prerequisites', specSection: '5.8.4', specUrl: '#workflow-object' },

  // Steps
  { category: 'Steps', name: 'Exclusive step target', status: 'supported', description: 'Exactly one of operationId, operationPath, workflowId, channelPath (target selector in the inspector)', specSection: '5.8.5', specUrl: '#step-object' },
  { category: 'Steps', name: 'AsyncAPI step (channelPath)', status: 'supported', description: 'channelPath + action send | receive, edited in the inspector and drawn as send / receive nodes', specSection: '5.8.5', specUrl: '#step-object', since11: true },
  { category: 'Steps', name: 'correlationId', status: 'supported', description: 'Only with action: receive (enforced by the inspector and the validator)', specSection: '5.8.5', specUrl: '#step-object', since11: true },
  { category: 'Steps', name: 'timeout', status: 'supported', description: 'Positive integer, milliseconds', specSection: '5.8.5', specUrl: '#step-object', since11: true },
  { category: 'Steps', name: 'Step dependsOn', status: 'supported', description: 'Multi-selection of prerequisite steps; join node in the graph; cycle detection', specSection: '5.8.5', specUrl: '#step-object', since11: true },
  { category: 'Steps', name: 'Request Body & replacements', status: 'supported', description: 'Payload (message payload for send steps) and payload replacements', specSection: '5.8.14', specUrl: '#request-body-object' },
  { category: 'Steps', name: 'Success Criteria', status: 'supported', description: 'simple, regex, jsonpath, xpath criteria; truthy / falsy semantics left to runners', specSection: '5.8.11', specUrl: '#criterion-object' },
  { category: 'Steps', name: 'OnSuccess / OnFailure', status: 'supported', description: 'goto, end, retry (retryAfter, retryLimit)', specSection: '5.8.7', specUrl: '#success-action-object' },
  { category: 'Steps', name: 'Action parameters', status: 'partial', description: 'parameters passed to a workflowId from an action: validated and displayed, not edited in forms', specSection: '5.8.8', specUrl: '#failure-action-object', since11: true },

  // Parameters
  { category: 'Parameters', name: 'in: path / query / header / cookie', status: 'supported', description: 'Parameter locations of OpenAPI operations', specSection: '5.8.6', specUrl: '#parameter-object' },
  { category: 'Parameters', name: 'in: querystring', status: 'supported', description: 'Whole query string (OAS 3.2); exclusive with query parameters', specSection: '5.8.6', specUrl: '#parameter-object', since11: true },

  // Selectors & expressions
  { category: 'Selectors & Expressions', name: 'Selector Object', status: 'supported', description: 'context / selector / type outputs, edited with the Expr | Selector toggle', specSection: '5.8.13', specUrl: '#selector-object', since11: true },
  { category: 'Selectors & Expressions', name: 'Expression Type Object', status: 'partial', description: 'jsonpath rfc9535, xpath-31, jsonpointer rfc6901: validated; versions shown as read-only', specSection: '5.8.12', specUrl: '#expression-type-object', since11: true },
  { category: 'Selectors & Expressions', name: '$url, $method, $statusCode', status: 'supported', description: 'HTTP context expressions', specSection: '5.9', specUrl: '#runtime-expressions' },
  { category: 'Selectors & Expressions', name: '$request / $response', status: 'supported', description: 'Request and response data (JSON Pointer fragments)', specSection: '5.9', specUrl: '#runtime-expressions' },
  { category: 'Selectors & Expressions', name: '$message', status: 'supported', description: 'AsyncAPI message header / payload', specSection: '5.9', specUrl: '#runtime-expressions', since11: true },
  { category: 'Selectors & Expressions', name: '$inputs, $outputs, $steps, $workflows', status: 'supported', description: 'Workflow data, resolved by the validator', specSection: '5.9', specUrl: '#runtime-expressions' },
  { category: 'Selectors & Expressions', name: '$components, $sourceDescriptions', status: 'supported', description: 'Reusable components and source references', specSection: '5.9', specUrl: '#runtime-expressions' },

  // Tooling
  { category: 'Validation & Tooling', name: 'Official JSON Schemas', status: 'supported', description: '@connethics/arazzo-core: Ajv 2020-12, precompiled, 1.0 and 1.1', specSection: '—' },
  { category: 'Validation & Tooling', name: 'Semantic rules', status: 'supported', description: '97 rules (references, cycles, AsyncAPI, querystring, version mismatch); diagnostics panel in the builder', specSection: '—' },
  { category: 'Validation & Tooling', name: 'Rules needing the source documents', status: 'planned', description: 'Operation / channel resolution against the loaded OpenAPI and AsyncAPI documents', specSection: '—' },
];

interface ComplianceMatrixProps {
  isDark: boolean;
}

export default function ComplianceMatrix({ isDark }: ComplianceMatrixProps) {
  // Group features by category
  const groupedFeatures = features.reduce((acc, feature) => {
    if (!acc[feature.category]) {
      acc[feature.category] = [];
    }
    acc[feature.category].push(feature);
    return acc;
  }, {} as Record<string, Feature[]>);

  return (
    <div className="space-y-8">
      <div className={`p-6 rounded-xl border ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-gray-200 bg-white'}`}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Arazzo {SPEC_VERSION} Compliance Matrix</h3>
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              Current support status for the{' '}
              <a href={SPEC_BASE_URL} target="_blank" rel="noopener noreferrer" className={`underline ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
                Arazzo Specification {SPEC_VERSION}
              </a>
              {' '}(1.0.x documents remain supported). Rows marked <strong>1.1</strong> are new in this version.
            </p>
          </div>
          <div className="flex gap-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span className={`text-xs ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>Supported</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <span className={`text-xs ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>Partial</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-500"></span>
              <span className={`text-xs ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>Planned</span>
            </div>
          </div>
        </div>

        <div className="grid gap-6">
          {Object.entries(groupedFeatures).map(([category, categoryFeatures]) => (
            <div key={category} className="space-y-3">
              <h4 className={`text-sm font-semibold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                {category}
              </h4>
              <div className={`rounded-lg border overflow-hidden ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                <table className="w-full text-sm text-left">
                  <thead className={`${isDark ? 'bg-slate-800 text-slate-300' : 'bg-gray-50 text-gray-600'}`}>
                    <tr>
                      <th className="px-4 py-3 font-medium">Feature</th>
                      <th className="px-4 py-3 font-medium">Spec Section</th>
                      <th className="px-4 py-3 font-medium">Description</th>
                      <th className="px-4 py-3 font-medium text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDark ? 'divide-slate-700 bg-slate-900/50' : 'divide-gray-200 bg-white'}`}>
                    {categoryFeatures.map((feature) => (
                      <tr key={feature.name} className={`transition-colors ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-gray-50'}`}>
                        <td className={`px-4 py-3 font-medium ${isDark ? 'text-slate-200' : 'text-gray-900'}`}>
                          {feature.name}
                          {feature.since11 && (
                            <span className={`ml-2 align-middle px-1.5 py-0.5 rounded text-[10px] font-bold ${isDark ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>
                              1.1
                            </span>
                          )}
                        </td>
                        <td className={`px-4 py-3 font-mono text-xs ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
                          {feature.specUrl ? (
                            <a 
                              href={`${SPEC_BASE_URL}${feature.specUrl}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`hover:underline ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}
                            >
                              {feature.specSection}
                            </a>
                          ) : (
                            feature.specSection
                          )}
                        </td>
                        <td className={`px-4 py-3 ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                          {feature.description}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                            ${feature.status === 'supported' 
                              ? (isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-100 text-emerald-800') 
                              : feature.status === 'partial'
                                ? (isDark ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-100 text-amber-800')
                                : (isDark ? 'bg-slate-700 text-slate-400' : 'bg-gray-100 text-gray-600')
                            }`}>
                            {feature.status === 'supported' && (
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                            {feature.status.charAt(0).toUpperCase() + feature.status.slice(1)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
