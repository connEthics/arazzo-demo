import React from 'react';
import { Badge } from '@/components/primitives';

interface Feature {
  category: string;
  name: string;
  status: 'supported' | 'partial' | 'planned';
  description: string;
  specSection?: string;
  specUrl?: string;
}

const SPEC_BASE_URL = 'https://spec.openapis.org/arazzo/v1.0.1.html';

const features: Feature[] = [
  // Source Descriptions
  { category: 'Source Descriptions', name: 'OpenAPI Source', status: 'supported', description: 'Support for type: openapi', specSection: '4.6.3', specUrl: '#source-description-object' },
  { category: 'Source Descriptions', name: 'Arazzo Source', status: 'supported', description: 'Support for type: arazzo', specSection: '4.6.3', specUrl: '#source-description-object' },
  { category: 'Source Descriptions', name: 'x- Extensions', status: 'supported', description: 'Support for vendor extensions', specSection: '4.8', specUrl: '#specification-extensions' },
  
  // Workflows
  { category: 'Workflows', name: 'Inputs', status: 'supported', description: 'Workflow-level inputs definition', specSection: '4.6.4', specUrl: '#workflow-object' },
  { category: 'Workflows', name: 'Outputs', status: 'supported', description: 'Workflow-level outputs mapping', specSection: '4.6.4', specUrl: '#workflow-object' },
  { category: 'Workflows', name: 'Parameters', status: 'supported', description: 'Global parameters for steps', specSection: '4.6.4', specUrl: '#workflow-object' },
  { category: 'Workflows', name: 'SuccessActions', status: 'supported', description: 'Workflow-level success actions', specSection: '4.6.4', specUrl: '#workflow-object' },
  { category: 'Workflows', name: 'FailureActions', status: 'supported', description: 'Workflow-level failure actions', specSection: '4.6.4', specUrl: '#workflow-object' },

  // Steps
  { category: 'Steps', name: 'Step ID & Operation', status: 'supported', description: 'Basic step identification', specSection: '4.6.5', specUrl: '#step-object' },
  { category: 'Steps', name: 'Parameters', status: 'supported', description: 'Step-specific parameters', specSection: '4.6.5', specUrl: '#step-object' },
  { category: 'Steps', name: 'Request Body', status: 'supported', description: 'Payload definition', specSection: '4.6.13', specUrl: '#request-body-object' },
  { category: 'Steps', name: 'Success Criteria', status: 'supported', description: 'Conditions for success', specSection: '4.6.11', specUrl: '#criterion-object' },
  { category: 'Steps', name: 'OnSuccess Navigation', status: 'supported', description: 'goto, end actions', specSection: '4.6.7', specUrl: '#success-action-object' },
  { category: 'Steps', name: 'OnFailure Navigation', status: 'supported', description: 'retry, goto, end actions', specSection: '4.6.8', specUrl: '#failure-action-object' },
  { category: 'Steps', name: 'Outputs Mapping', status: 'supported', description: 'Extracting values from response', specSection: '4.6.5', specUrl: '#step-object' },

  // Runtime Expressions
  { category: 'Expressions', name: '$url', status: 'supported', description: 'Access to source URL', specSection: '4.7', specUrl: '#runtime-expressions' },
  { category: 'Expressions', name: '$method', status: 'supported', description: 'Access to HTTP method', specSection: '4.7', specUrl: '#runtime-expressions' },
  { category: 'Expressions', name: '$statusCode', status: 'supported', description: 'Access to response status', specSection: '4.7', specUrl: '#runtime-expressions' },
  { category: 'Expressions', name: '$request', status: 'supported', description: 'Access to request data', specSection: '4.7', specUrl: '#runtime-expressions' },
  { category: 'Expressions', name: '$response', status: 'supported', description: 'Access to response body/headers', specSection: '4.7', specUrl: '#runtime-expressions' },
  { category: 'Expressions', name: '$inputs', status: 'supported', description: 'Access to workflow inputs', specSection: '4.7', specUrl: '#runtime-expressions' },
  { category: 'Expressions', name: '$outputs', status: 'supported', description: 'Access to step outputs', specSection: '4.7', specUrl: '#runtime-expressions' },
  { category: 'Expressions', name: '$steps', status: 'supported', description: 'Access to other steps', specSection: '4.7', specUrl: '#runtime-expressions' },
  { category: 'Expressions', name: '$components', status: 'supported', description: 'Access to reusable components', specSection: '4.7', specUrl: '#runtime-expressions' },
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
            <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Arazzo 1.0.1 Compliance Matrix</h3>
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              Current support status for the Arazzo Specification 1.0.1
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
