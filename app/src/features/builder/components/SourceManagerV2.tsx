'use client';

import { useState } from 'react';
import { useBuilder } from '../context/BuilderContext';
import { sampleSpec, sampleSources } from '../data/sample-workflow';
import yaml from 'js-yaml';

type ImportMode = 'sample' | 'url' | 'paste';

interface SourceManagerProps {
  onStepAdded?: () => void;
  compact?: boolean;
}

// Icons
const ChevronDownIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

const ChevronUpIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
  </svg>
);

export default function SourceManager({ onStepAdded, compact = false }: SourceManagerProps) {
  const { state, dispatch } = useBuilder();
  const [url, setUrl] = useState('');
  const [pastedSpec, setPastedSpec] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [importMode, setImportMode] = useState<ImportMode>('sample');
  const [error, setError] = useState<string | null>(null);
  const [importExpanded, setImportExpanded] = useState(true);

  const sourceCount = Object.keys(state.sources).length;
  const hasWorkflow = state.spec.workflows[0]?.steps.length > 0;

  const handleLoadSample = () => {
    dispatch({
      type: 'LOAD_SAMPLE',
      payload: { spec: sampleSpec, sources: sampleSources }
    });
    setImportExpanded(false);
  };

  const parseSpec = (content: string): any => {
    try {
      return JSON.parse(content);
    } catch {
      return yaml.load(content);
    }
  };

  const handleUrlImport = async () => {
    if (!url) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(url);
      const text = await response.text();
      const content = parseSpec(text);
      
      if (!content.openapi && !content.swagger) {
        throw new Error('Invalid OpenAPI specification');
      }
      
      const name = content.info?.title?.replace(/\s+/g, '-').toLowerCase() || `source-${sourceCount + 1}`;
      
      dispatch({ type: 'ADD_SOURCE', payload: { name, content } });
      setUrl('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasteImport = () => {
    if (!pastedSpec.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const content = parseSpec(pastedSpec);
      
      if (!content.openapi && !content.swagger) {
        throw new Error('Invalid OpenAPI specification');
      }
      
      const name = content.info?.title?.replace(/\s+/g, '-').toLowerCase() || `source-${sourceCount + 1}`;
      
      dispatch({ type: 'ADD_SOURCE', payload: { name, content } });
      setPastedSpec('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col">
      {/* Import Section - Collapsible */}
      <div className="border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setImportExpanded(!importExpanded)}
          className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
        >
          <span className="text-sm font-medium">Import Sources</span>
          <div className="flex items-center gap-2">
            {sourceCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full">
                {sourceCount}
              </span>
            )}
            {importExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
          </div>
        </button>

        {importExpanded && (
          <div className="px-4 pb-4 space-y-3">
            {/* Quick Start - Load Sample */}
            {!hasWorkflow && (
              <button
                onClick={handleLoadSample}
                className="w-full px-3 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-500 hover:to-purple-500 text-sm flex items-center justify-center gap-2 shadow-md transition-all"
              >
                <span>✨</span>
                <span>Load Sample Workflow</span>
              </button>
            )}

            {/* Import Mode Tabs */}
            <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden text-xs">
              <button
                onClick={() => { setImportMode('url'); setError(null); }}
                className={`flex-1 px-3 py-1.5 transition-colors ${
                  importMode === 'url' 
                    ? 'bg-slate-100 dark:bg-slate-700 font-medium' 
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                🔗 URL
              </button>
              <button
                onClick={() => { setImportMode('paste'); setError(null); }}
                className={`flex-1 px-3 py-1.5 transition-colors border-l border-slate-200 dark:border-slate-700 ${
                  importMode === 'paste' 
                    ? 'bg-slate-100 dark:bg-slate-700 font-medium' 
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                📋 Paste
              </button>
            </div>

            {error && (
              <div className="p-2 text-xs bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded border border-red-200 dark:border-red-800">
                {error}
              </div>
            )}

            {importMode === 'url' && (
              <div className="space-y-2">
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://api.example.com/openapi.yaml"
                  className="w-full px-3 py-2 rounded-lg border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-sm"
                  onKeyDown={(e) => e.key === 'Enter' && handleUrlImport()}
                />
                <button
                  onClick={handleUrlImport}
                  disabled={isLoading || !url}
                  className="w-full px-3 py-2 bg-slate-800 dark:bg-slate-600 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50 text-sm"
                >
                  {isLoading ? 'Loading...' : 'Import'}
                </button>
              </div>
            )}

            {importMode === 'paste' && (
              <div className="space-y-2">
                <textarea
                  value={pastedSpec}
                  onChange={(e) => setPastedSpec(e.target.value)}
                  placeholder="Paste OpenAPI YAML or JSON..."
                  className="w-full px-3 py-2 rounded-lg border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-xs font-mono h-24 resize-none"
                />
                <button
                  onClick={handlePasteImport}
                  disabled={isLoading || !pastedSpec.trim()}
                  className="w-full px-3 py-2 bg-slate-800 dark:bg-slate-600 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50 text-sm"
                >
                  {isLoading ? 'Parsing...' : 'Import'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
