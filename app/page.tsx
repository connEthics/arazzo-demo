'use client';

import React, { useState } from 'react';
import FileUpload from '@/components/FileUpload';
import WorkflowVisualizer from '@/components/WorkflowVisualizer';
import WorkflowDetails from '@/components/WorkflowDetails';
import { ArazzoDocument } from '@/lib/types';
import { parseArazzo, validateArazzo } from '@/lib/parser';

export default function Home() {
  const [arazzoDoc, setArazzoDoc] = useState<ArazzoDocument | null>(null);
  const [selectedWorkflowIndex, setSelectedWorkflowIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const handleFileLoad = (content: string, format: 'json' | 'yaml') => {
    try {
      const doc = parseArazzo(content, format);
      const validation = validateArazzo(doc);
      
      if (!validation.valid) {
        setValidationErrors(validation.errors);
        setError('Validation errors found. See details below.');
      } else {
        setValidationErrors([]);
        setError(null);
      }
      
      setArazzoDoc(doc);
      setSelectedWorkflowIndex(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file');
      setArazzoDoc(null);
      setValidationErrors([]);
    }
  };

  const loadExample = async (exampleFile: string) => {
    try {
      const response = await fetch(`/examples/${exampleFile}`);
      const content = await response.text();
      const format = exampleFile.endsWith('.json') ? 'json' : 'yaml';
      handleFileLoad(content, format);
    } catch (err) {
      setError('Failed to load example file');
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-gray-900">
            Arazzo Visualization Tool
          </h1>
          <p className="text-lg text-gray-600">
            Visualize and explore Arazzo API workflow specifications
          </p>
        </div>

        {/* Examples */}
        {!arazzoDoc && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Try an Example
            </h2>
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => loadExample('user-auth.yaml')}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                User Authentication Workflow
              </button>
              <button
                onClick={() => loadExample('ecommerce-order.json')}
                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
              >
                E-commerce Order Workflow
              </button>
            </div>
          </div>
        )}

        {/* File Upload */}
        {!arazzoDoc && <FileUpload onFileLoad={handleFileLoad} />}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="text-red-500 text-xl">⚠️</div>
              <div className="flex-1">
                <h3 className="font-semibold text-red-800 mb-1">Error</h3>
                <p className="text-red-700">{error}</p>
                {validationErrors.length > 0 && (
                  <div className="mt-2">
                    <h4 className="font-medium text-red-800 text-sm mb-1">Validation Errors:</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-red-700">
                      {validationErrors.map((err, idx) => (
                        <li key={idx}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Document Info and Workflow Selection */}
        {arazzoDoc && (
          <>
            <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {arazzoDoc.info.title}
                </h2>
                {arazzoDoc.info.summary && (
                  <p className="text-gray-600 mt-1">{arazzoDoc.info.summary}</p>
                )}
                {arazzoDoc.info.description && (
                  <p className="text-sm text-gray-500 mt-2">{arazzoDoc.info.description}</p>
                )}
                <div className="flex gap-4 mt-3 text-sm text-gray-600">
                  <span>Version: {arazzoDoc.info.version}</span>
                  <span>Arazzo Spec: {arazzoDoc.arazzo}</span>
                </div>
              </div>

              {arazzoDoc.workflows.length > 1 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Workflow:
                  </label>
                  <select
                    value={selectedWorkflowIndex}
                    onChange={(e) => setSelectedWorkflowIndex(Number(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {arazzoDoc.workflows.map((workflow, index) => (
                      <option key={workflow.workflowId} value={index}>
                        {workflow.workflowId} - {workflow.summary || 'No summary'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                onClick={() => {
                  setArazzoDoc(null);
                  setError(null);
                  setValidationErrors([]);
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Load Different File
              </button>
            </div>

            {/* Visualization */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-gray-800">
                Workflow Visualization
              </h3>
              <WorkflowVisualizer workflow={arazzoDoc.workflows[selectedWorkflowIndex]} />
            </div>

            {/* Details */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-gray-800">
                Workflow Details
              </h3>
              <WorkflowDetails workflow={arazzoDoc.workflows[selectedWorkflowIndex]} />
            </div>
          </>
        )}

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 pt-8 border-t border-gray-200">
          <p>
            Learn more about{' '}
            <a
              href="https://www.openapis.org/arazzo-specification"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              Arazzo Specification
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
