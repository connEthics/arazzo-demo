'use client';

import React from 'react';
import { Workflow, Step } from '@/lib/types';

interface WorkflowDetailsProps {
  workflow: Workflow;
}

const WorkflowDetails: React.FC<WorkflowDetailsProps> = ({ workflow }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{workflow.workflowId}</h2>
        {workflow.summary && (
          <p className="text-gray-600 mb-2">{workflow.summary}</p>
        )}
        {workflow.description && (
          <p className="text-sm text-gray-500">{workflow.description}</p>
        )}
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Workflow Steps</h3>
        <div className="space-y-4">
          {workflow.steps.map((step: Step, index: number) => (
            <div key={step.stepId} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-1">{step.stepId}</h4>
                  {step.description && (
                    <p className="text-sm text-gray-600 mb-2">{step.description}</p>
                  )}
                  
                  <div className="space-y-2 text-xs">
                    {step.operationId && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-700">Operation:</span>
                        <code className="bg-gray-100 px-2 py-1 rounded">{step.operationId}</code>
                      </div>
                    )}
                    {step.operationPath && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-700">Path:</span>
                        <code className="bg-gray-100 px-2 py-1 rounded">{step.operationPath}</code>
                      </div>
                    )}
                    {step.workflowId && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-700">Sub-workflow:</span>
                        <code className="bg-gray-100 px-2 py-1 rounded">{step.workflowId}</code>
                      </div>
                    )}
                    {step.parameters && step.parameters.length > 0 && (
                      <div>
                        <span className="font-medium text-gray-700 block mb-1">Parameters:</span>
                        <div className="ml-2 space-y-1">
                          {step.parameters.map((param, idx) => (
                            <div key={idx} className="text-gray-600">
                              • {param.name} {param.in && `(${param.in})`}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {step.outputs && Object.keys(step.outputs).length > 0 && (
                      <div>
                        <span className="font-medium text-gray-700 block mb-1">Outputs:</span>
                        <div className="ml-2 space-y-1">
                          {Object.entries(step.outputs).map(([key, value]) => (
                            <div key={key} className="text-gray-600">
                              • {key}: <code className="bg-gray-100 px-1 rounded text-xs">{value}</code>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WorkflowDetails;
