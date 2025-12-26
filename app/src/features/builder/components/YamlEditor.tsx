'use client';

import { useMemo, useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import yaml from 'js-yaml';
import { parseDocument, LineCounter } from 'yaml';
import { useBuilder } from '../context/BuilderContext';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

interface YamlEditorProps {
  isDark?: boolean;
}

export default function YamlEditor({ isDark = false }: YamlEditorProps) {
  const { state, dispatch } = useBuilder();
  const [localYaml, setLocalYaml] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const editorRef = useRef<any>(null);
  const decorationsRef = useRef<string[]>([]);

  // Convert current spec to YAML for display
  const specYaml = useMemo(() => {
    try {
      return yaml.dump(state.spec, {
        indent: 2,
        lineWidth: -1,
        noRefs: true,
        sortKeys: false
      });
    } catch (e) {
      return '# Error converting spec to YAML';
    }
  }, [state.spec]);

  // Sync local YAML when spec changes (if not actively editing)
  useEffect(() => {
    if (!isEditing) {
      setLocalYaml(specYaml);
    }
  }, [specYaml, isEditing]);

  // Handle highlighting when lastModifiedPath changes
  useEffect(() => {
    if (!state.lastModifiedPath || !editorRef.current || isEditing) return;

    try {
      const lineCounter = new LineCounter();
      const doc = parseDocument(localYaml, { lineCounter });
      const node = doc.getIn(state.lastModifiedPath, true) as any;
      
      if (node && node.range) {
        // Get line number (1-based for Monaco)
        // yaml package uses 0-based indexing for range
        // lineCounter.linePos returns 1-based line and col
        const startPos = lineCounter.linePos(node.range[0]);
        const endPos = lineCounter.linePos(node.range[1]);
        
        if (startPos && endPos) {
          const range = {
            startLineNumber: startPos.line,
            startColumn: startPos.col,
            endLineNumber: endPos.line,
            endColumn: endPos.col
          };

          // Reveal line
          editorRef.current.revealLineInCenter(range.startLineNumber);

          // Add decoration
          const newDecorations = [
            {
              range,
              options: {
                isWholeLine: true,
                className: isDark ? 'bg-indigo-900/40' : 'bg-indigo-100',
                linesDecorationsClassName: isDark ? 'bg-indigo-500 w-1' : 'bg-indigo-500 w-1', // Gutter marker
              },
            },
          ];

          decorationsRef.current = editorRef.current.deltaDecorations(
            decorationsRef.current,
            newDecorations
          );

          // Remove decoration after 2 seconds
          setTimeout(() => {
            if (editorRef.current) {
              decorationsRef.current = editorRef.current.deltaDecorations(
                decorationsRef.current,
                []
              );
            }
          }, 2000);
        }
      }
    } catch (e) {
      console.error('Failed to highlight YAML line:', e);
    }
  }, [state.lastModifiedPath, localYaml, isEditing, isDark]);

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
  };

  const handleEditorChange = (value: string | undefined) => {
    setLocalYaml(value || '');
    setIsEditing(true);
    setError(null);

    // Try to parse and validate
    try {
      const parsed = yaml.load(value || '') as any;
      if (!parsed?.arazzo) {
        setError('Missing "arazzo" field');
        return;
      }
      if (!parsed?.workflows || !Array.isArray(parsed.workflows)) {
        setError('Missing or invalid "workflows" array');
        return;
      }
      // Valid - update spec
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid YAML');
    }
  };

  const handleApplyChanges = () => {
    try {
      const parsed = yaml.load(localYaml) as any;
      if (!parsed?.arazzo || !parsed?.workflows) {
        setError('Invalid Arazzo spec');
        return;
      }
      
      dispatch({
        type: 'LOAD_SPEC',
        payload: parsed
      });
      setIsEditing(false);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to apply changes');
    }
  };

  const handleResetChanges = () => {
    setLocalYaml(specYaml);
    setIsEditing(false);
    setError(null);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className={`flex items-center justify-between px-3 py-2 border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">YAML</span>
          {isEditing && (
            <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded">
              Modified
            </span>
          )}
        </div>
        {isEditing && (
          <div className="flex items-center gap-1">
            <button
              onClick={handleResetChanges}
              className="px-2 py-1 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            >
              Reset
            </button>
            <button
              onClick={handleApplyChanges}
              disabled={!!error}
              className="px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Apply
            </button>
          </div>
        )}
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <MonacoEditor
          height="100%"
          language="yaml"
          theme={isDark ? 'vs-dark' : 'light'}
          value={localYaml}
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          options={{
            minimap: { enabled: false },
            fontSize: 11,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            automaticLayout: true,
            folding: true,
            tabSize: 2,
            renderWhitespace: 'selection',
            scrollbar: {
              vertical: 'auto',
              horizontal: 'auto',
            },
          }}
        />
      </div>

      {/* Footer */}
      <div className={`flex items-center justify-between px-3 py-1.5 border-t ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
        <div className="flex-1">
          {error ? (
            <span className="text-red-500 text-[10px] flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </span>
          ) : (
            <span className="text-emerald-600 dark:text-emerald-400 text-[10px] flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {state.spec.workflows.length} workflow(s) • {state.spec.workflows[0]?.steps.length || 0} steps
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
