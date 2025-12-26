'use client';

import { useState, useMemo } from 'react';
import { useBuilder } from '../context/BuilderContext';
import MermaidDiagram from '@/components/MermaidDiagram';
import { workflowToMermaidFlowchart, workflowToMermaidSequence } from '@/lib/mermaid-converter';
import yaml from 'js-yaml';

type ViewMode = 'flowchart' | 'sequence' | 'yaml';

export default function BuilderPreview() {
  const { state } = useBuilder();
  const [viewMode, setViewMode] = useState<ViewMode>('flowchart');
  const [isDark, setIsDark] = useState(false);

  // Generate YAML from spec
  const yamlContent = useMemo(() => {
    try {
      return yaml.dump(state.spec, { 
        indent: 2, 
        lineWidth: 120,
        noRefs: true,
        sortKeys: false
      });
    } catch {
      return '# Error generating YAML';
    }
  }, [state.spec]);

  // Generate Mermaid flowchart
  const flowchartDiagram = useMemo(() => {
    const workflowId = state.spec.workflows[0]?.workflowId;
    if (!workflowId) return '';
    try {
      return workflowToMermaidFlowchart(state.spec, workflowId, { direction: 'LR' });
    } catch (e) {
      console.error('Flowchart generation error:', e);
      return '';
    }
  }, [state.spec]);

  // Generate Mermaid sequence diagram
  const sequenceDiagram = useMemo(() => {
    const workflowId = state.spec.workflows[0]?.workflowId;
    if (!workflowId) return '';
    try {
      return workflowToMermaidSequence(state.spec, workflowId);
    } catch (e) {
      console.error('Sequence generation error:', e);
      return '';
    }
  }, [state.spec]);

  const copyToClipboard = async () => {
    const content = viewMode === 'yaml' ? yamlContent : (viewMode === 'flowchart' ? flowchartDiagram : sequenceDiagram);
    await navigator.clipboard.writeText(content);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-lg">Preview</h2>
          <button
            onClick={copyToClipboard}
            className="px-3 py-1.5 text-xs font-medium rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Copy
          </button>
        </div>
        
        {/* View mode tabs */}
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
          <button
            onClick={() => setViewMode('flowchart')}
            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              viewMode === 'flowchart'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            🔀 Flowchart
          </button>
          <button
            onClick={() => setViewMode('sequence')}
            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              viewMode === 'sequence'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            📊 Sequence
          </button>
          <button
            onClick={() => setViewMode('yaml')}
            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              viewMode === 'yaml'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            📄 YAML
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {viewMode === 'yaml' && (
          <div className="p-4">
            <pre className="text-xs font-mono bg-slate-50 dark:bg-slate-900 rounded-lg p-4 overflow-x-auto whitespace-pre-wrap border border-slate-200 dark:border-slate-700">
              {yamlContent}
            </pre>
          </div>
        )}

        {viewMode === 'flowchart' && (
          <div className="p-4 min-h-[400px]">
            {flowchartDiagram ? (
              <MermaidDiagram 
                chart={flowchartDiagram} 
                isDark={isDark}
                steps={state.spec.workflows[0]?.steps || []}
              />
            ) : (
              <div className="flex items-center justify-center h-64 text-slate-400">
                <p>Add steps to see the flowchart</p>
              </div>
            )}
          </div>
        )}

        {viewMode === 'sequence' && (
          <div className="p-4 min-h-[400px]">
            {sequenceDiagram ? (
              <MermaidDiagram 
                chart={sequenceDiagram} 
                isDark={isDark}
                steps={state.spec.workflows[0]?.steps || []}
              />
            ) : (
              <div className="flex items-center justify-center h-64 text-slate-400">
                <p>Add steps to see the sequence diagram</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer - Spec summary */}
      <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
        <div className="flex gap-4 text-xs text-slate-500">
          <span>📦 {Object.keys(state.sources).length} source(s)</span>
          <span>🔢 {state.spec.workflows[0]?.steps.length || 0} step(s)</span>
          <span>📐 Arazzo {state.spec.arazzo}</span>
        </div>
      </div>
    </div>
  );
}
