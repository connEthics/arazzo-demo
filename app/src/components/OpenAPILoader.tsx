'use client';

import { useState, useRef, useCallback } from 'react';
import yaml from 'js-yaml';

export interface OpenAPISpec {
  name: string;
  url?: string;
  content: object;
  format: 'yaml' | 'json';
  fileName?: string;
}

interface OpenAPILoaderProps {
  onLoad: (spec: OpenAPISpec) => void;
  onError?: (error: string) => void;
  isDark?: boolean;
  existingSources?: string[];
}

type LoadMethod = 'file' | 'url' | 'sample';

const SAMPLE_SPECS = [
  { name: 'Petstore API', url: '/openapi/petstore.yaml' },
];

/**
 * Component to load OpenAPI specifications from file, URL, or sample.
 * Used to add source descriptions in the Arazzo Builder.
 */
export default function OpenAPILoader({ 
  onLoad, 
  onError,
  isDark = false,
  existingSources = []
}: OpenAPILoaderProps) {
  const [loadMethod, setLoadMethod] = useState<LoadMethod>('file');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseSpec = useCallback((content: string, fileName?: string): { content: object; format: 'yaml' | 'json' } | null => {
    // Try JSON first
    try {
      return { content: JSON.parse(content), format: 'json' };
    } catch {
      // Try YAML
      try {
        const parsed = yaml.load(content);
        if (typeof parsed === 'object' && parsed !== null) {
          return { content: parsed as object, format: 'yaml' };
        }
      } catch (e) {
        onError?.(`Failed to parse file: ${e instanceof Error ? e.message : 'Unknown error'}`);
      }
    }
    return null;
  }, [onError]);

  const extractSpecName = (spec: object): string => {
    const info = (spec as { info?: { title?: string } }).info;
    return info?.title || 'Unnamed API';
  };

  const handleFileUpload = useCallback(async (file: File) => {
    setLoading(true);
    try {
      const text = await file.text();
      const result = parseSpec(text, file.name);
      if (result) {
        const name = extractSpecName(result.content);
        onLoad({
          name,
          content: result.content,
          format: result.format,
          fileName: file.name
        });
      }
    } catch (e) {
      onError?.(`Failed to read file: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, [parseSpec, onLoad, onError]);

  const handleUrlLoad = useCallback(async () => {
    if (!url.trim()) {
      onError?.('Please enter a URL');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const text = await response.text();
      const result = parseSpec(text);
      if (result) {
        const name = extractSpecName(result.content);
        onLoad({
          name,
          url,
          content: result.content,
          format: result.format
        });
      }
    } catch (e) {
      onError?.(`Failed to fetch URL: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, [url, parseSpec, onLoad, onError]);

  const handleSampleLoad = useCallback(async (sampleUrl: string) => {
    setLoading(true);
    try {
      const response = await fetch(sampleUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const text = await response.text();
      const result = parseSpec(text);
      if (result) {
        const name = extractSpecName(result.content);
        onLoad({
          name,
          url: sampleUrl,
          content: result.content,
          format: result.format
        });
      }
    } catch (e) {
      onError?.(`Failed to load sample: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, [parseSpec, onLoad, onError]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  }, [handleFileUpload]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  }, [handleFileUpload]);

  const tabClass = (method: LoadMethod) => `
    flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg border-b-2 transition-all
    ${loadMethod === method
      ? isDark
        ? 'border-indigo-500 text-indigo-400 bg-slate-800/50'
        : 'border-indigo-500 text-indigo-600 bg-indigo-50'
      : isDark
        ? 'border-transparent text-slate-400 hover:text-slate-300 hover:border-slate-600'
        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
    }
  `;

  return (
    <div className={`rounded-lg border overflow-hidden ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
      {/* Tabs */}
      <div className={`flex border-b ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
        <button onClick={() => setLoadMethod('file')} className={tabClass('file')}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          Upload File
        </button>
        <button onClick={() => setLoadMethod('url')} className={tabClass('url')}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          From URL
        </button>
        <button onClick={() => setLoadMethod('sample')} className={tabClass('sample')}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
          </svg>
          Sample
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {loadMethod === 'file' && (
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all ${
              dragActive
                ? isDark
                  ? 'border-indigo-500 bg-indigo-500/10'
                  : 'border-indigo-400 bg-indigo-50'
                : isDark
                  ? 'border-slate-600 hover:border-slate-500'
                  : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".yaml,.yml,.json"
              onChange={handleFileChange}
              className="hidden"
            />
            
            <svg className={`w-10 h-10 mx-auto mb-3 ${isDark ? 'text-slate-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            
            <p className={`text-sm mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
              Drag & drop your OpenAPI file here
            </p>
            <p className={`text-xs mb-4 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
              Supports YAML and JSON formats
            </p>
            
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                isDark
                  ? 'bg-slate-700 text-white hover:bg-slate-600'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading ? 'Loading...' : 'Browse Files'}
            </button>
          </div>
        )}

        {loadMethod === 'url' && (
          <div className="space-y-3">
            <label className={`block text-xs font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              OpenAPI Specification URL
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/openapi.yaml"
                className={`flex-1 px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  isDark
                    ? 'bg-slate-900 border-slate-600 text-white placeholder-slate-500'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                }`}
              />
              <button
                onClick={handleUrlLoad}
                disabled={loading || !url.trim()}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                  loading || !url.trim()
                    ? 'bg-slate-500 text-slate-300 cursor-not-allowed'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                {loading ? 'Loading...' : 'Load'}
              </button>
            </div>
            <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
              Enter a URL to a publicly accessible OpenAPI specification file
            </p>
          </div>
        )}

        {loadMethod === 'sample' && (
          <div className="space-y-2">
            <p className={`text-xs mb-3 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              Load a sample OpenAPI specification to get started
            </p>
            {SAMPLE_SPECS.map((sample) => (
              <button
                key={sample.url}
                onClick={() => handleSampleLoad(sample.url)}
                disabled={loading || existingSources.includes(sample.name)}
                className={`w-full flex items-center justify-between px-4 py-3 text-sm rounded-lg border transition-all ${
                  existingSources.includes(sample.name)
                    ? isDark
                      ? 'bg-slate-900/50 border-slate-700 text-slate-500'
                      : 'bg-gray-50 border-gray-200 text-gray-400'
                    : isDark
                      ? 'bg-slate-900/50 border-slate-700 hover:border-indigo-500/50 text-white hover:bg-slate-900'
                      : 'bg-gray-50 border-gray-200 hover:border-indigo-300 text-gray-900 hover:bg-indigo-50'
                } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    isDark ? 'bg-indigo-500/20' : 'bg-indigo-100'
                  }`}>
                    <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <div className="font-medium">{sample.name}</div>
                    <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                      {sample.url}
                    </div>
                  </div>
                </div>
                {existingSources.includes(sample.name) ? (
                  <span className={`text-xs px-2 py-1 rounded ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-gray-200 text-gray-500'}`}>
                    Already loaded
                  </span>
                ) : (
                  <svg className={`w-5 h-5 ${isDark ? 'text-slate-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
