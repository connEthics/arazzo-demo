'use client';

import { useState } from 'react';
import OpenAPILoader, { OpenAPISpec } from './OpenAPILoader';

interface OpenAPILoaderShowcaseProps {
  isDark: boolean;
}

export default function OpenAPILoaderShowcase({ isDark }: OpenAPILoaderShowcaseProps) {
  const [loadedSpecs, setLoadedSpecs] = useState<OpenAPISpec[]>([]);
  const [lastError, setLastError] = useState<string | null>(null);

  const handleLoad = (spec: OpenAPISpec) => {
    setLoadedSpecs(prev => [...prev, spec]);
    setLastError(null);
  };

  const handleError = (error: string) => {
    setLastError(error);
  };

  const handleRemove = (index: number) => {
    setLoadedSpecs(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">OpenAPI Loader</h2>
        <p className={`${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
          Load OpenAPI specifications from file upload, URL, or sample specs.
          Used to add source descriptions in the Arazzo Builder.
        </p>
      </div>

      {/* Loader Component */}
      <div className={`rounded-xl border overflow-hidden ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-gray-200 bg-white'}`}>
        <div className={`px-4 py-3 border-b ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-100 bg-gray-50'}`}>
          <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Loader</h3>
          <p className={`text-sm mt-0.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Try loading an OpenAPI spec using the tabs below
          </p>
        </div>
        
        <div className="p-4">
          <OpenAPILoader
            onLoad={handleLoad}
            onError={handleError}
            isDark={isDark}
            existingSources={loadedSpecs.map(s => s.name)}
          />
        </div>

        {/* Error Display */}
        {lastError && (
          <div className={`mx-4 mb-4 p-3 rounded-lg border ${isDark ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-red-50 border-red-200 text-red-600'}`}>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm">{lastError}</span>
              <button 
                onClick={() => setLastError(null)} 
                className="ml-auto text-xs underline hover:no-underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Loaded Specs */}
      <div className={`rounded-xl border overflow-hidden ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-gray-200 bg-white'}`}>
        <div className={`px-4 py-3 border-b ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-100 bg-gray-50'}`}>
          <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Loaded Specifications
            {loadedSpecs.length > 0 && (
              <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${isDark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}`}>
                {loadedSpecs.length}
              </span>
            )}
          </h3>
          <p className={`text-sm mt-0.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Specs loaded will appear here
          </p>
        </div>

        <div className="p-4">
          {loadedSpecs.length === 0 ? (
            <div className={`text-center py-8 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
              <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm">No specifications loaded yet</p>
              <p className="text-xs mt-1">Use the loader above to add OpenAPI specs</p>
            </div>
          ) : (
            <div className="space-y-3">
              {loadedSpecs.map((spec, idx) => (
                <div 
                  key={idx}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${isDark ? 'border-slate-700 bg-slate-900/50' : 'border-gray-200 bg-gray-50'}`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    spec.format === 'yaml' 
                      ? isDark ? 'bg-amber-500/20' : 'bg-amber-100'
                      : isDark ? 'bg-blue-500/20' : 'bg-blue-100'
                  }`}>
                    <span className={`text-xs font-bold uppercase ${
                      spec.format === 'yaml'
                        ? 'text-amber-500'
                        : 'text-blue-500'
                    }`}>
                      {spec.format}
                    </span>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className={`font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {spec.name}
                    </div>
                    <div className={`text-xs truncate ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                      {spec.url || spec.fileName || 'Loaded from file'}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded ${isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'}`}>
                      ✓ Loaded
                    </span>
                    <button
                      onClick={() => handleRemove(idx)}
                      className={`p-1.5 rounded hover:bg-red-500/10 transition-colors ${isDark ? 'text-slate-400 hover:text-red-400' : 'text-gray-400 hover:text-red-500'}`}
                      title="Remove"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className={`p-4 rounded-lg border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
          <h4 className={`font-semibold mb-2 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            File Upload
          </h4>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Drag & drop or browse for local OpenAPI files (YAML/JSON)
          </p>
        </div>
        
        <div className={`p-4 rounded-lg border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
          <h4 className={`font-semibold mb-2 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            URL Loading
          </h4>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Fetch OpenAPI specs from any publicly accessible URL
          </p>
        </div>
        
        <div className={`p-4 rounded-lg border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
          <h4 className={`font-semibold mb-2 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <svg className="w-5 h-5 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
            </svg>
            Sample Specs
          </h4>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Pre-loaded sample specifications to get started quickly
          </p>
        </div>
      </div>

      {/* Usage Note */}
      <div className={`p-4 rounded-lg border ${isDark ? 'border-indigo-500/30 bg-indigo-500/10' : 'border-indigo-200 bg-indigo-50'}`}>
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h4 className={`font-semibold mb-1 ${isDark ? 'text-indigo-300' : 'text-indigo-900'}`}>
              Integration with Builder
            </h4>
            <p className={`text-sm ${isDark ? 'text-indigo-200/80' : 'text-indigo-700'}`}>
              When integrated with the Builder, loaded specs become source descriptions 
              in the Arazzo spec. Operations from the OpenAPI spec can then be referenced 
              by steps in workflows.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
