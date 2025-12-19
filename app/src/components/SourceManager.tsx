'use client';

import { useState, useCallback } from 'react';
import OpenAPILoader, { OpenAPISpec } from './OpenAPILoader';

export interface ManagedSource {
  id: string;
  name: string;
  type: 'arazzo' | 'openapi';
  url?: string;
  fileName?: string;
  operationCount?: number;
  isMain?: boolean;
}

interface SourceManagerProps {
  sources: ManagedSource[];
  onAddSource: (source: OpenAPISpec) => void;
  onRemoveSource: (sourceId: string) => void;
  onSelectSource: (sourceId: string) => void;
  selectedSourceId?: string | null;
  isDark?: boolean;
  mainSpecLoaded?: boolean;
  onLoadMainSpec?: () => void;
}

/**
 * Source Manager panel for the left sidebar.
 * Manages Arazzo main spec and additional OpenAPI sources.
 */
export default function SourceManager({
  sources,
  onAddSource,
  onRemoveSource,
  onSelectSource,
  selectedSourceId,
  isDark = false,
  mainSpecLoaded = false,
  onLoadMainSpec,
}: SourceManagerProps) {
  const [showLoader, setShowLoader] = useState(false);
  const [activeTab, setActiveTab] = useState<'sources' | 'add'>('sources');

  const handleAddSource = useCallback((spec: OpenAPISpec) => {
    onAddSource(spec);
    setShowLoader(false);
    setActiveTab('sources');
  }, [onAddSource]);

  const arazzoSources = sources.filter(s => s.type === 'arazzo');
  const openApiSources = sources.filter(s => s.type === 'openapi');

  return (
    <div className={`h-full flex flex-col ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
      {/* Header */}
      <div className={`flex-shrink-0 px-3 py-2 border-b ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between">
          <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Sources
          </h3>
          <button
            onClick={() => setActiveTab(activeTab === 'add' ? 'sources' : 'add')}
            className={`p-1.5 rounded-lg transition-colors ${
              activeTab === 'add'
                ? 'bg-indigo-600 text-white'
                : isDark
                  ? 'hover:bg-slate-800 text-slate-400 hover:text-white'
                  : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
            }`}
            title={activeTab === 'add' ? 'Cancel' : 'Add source'}
          >
            <svg className={`w-4 h-4 transition-transform ${activeTab === 'add' ? 'rotate-45' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'add' ? (
          <div className="p-3">
            <OpenAPILoader
              onLoad={handleAddSource}
              onError={(error) => console.error(error)}
              isDark={isDark}
              existingSources={sources.map(s => s.name)}
            />
          </div>
        ) : (
          <div className="p-3 space-y-4">
            {/* Main Arazzo Spec */}
            <div>
              <h4 className={`text-xs uppercase font-semibold mb-2 px-1 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                Arazzo Spec
              </h4>
              {arazzoSources.length > 0 ? (
                <div className="space-y-1">
                  {arazzoSources.map((source) => (
                    <SourceItem
                      key={source.id}
                      source={source}
                      isSelected={selectedSourceId === source.id}
                      onSelect={() => onSelectSource(source.id)}
                      onRemove={() => onRemoveSource(source.id)}
                      isDark={isDark}
                    />
                  ))}
                </div>
              ) : (
                <div className={`p-3 rounded-lg border-2 border-dashed text-center ${
                  isDark ? 'border-slate-700 text-slate-500' : 'border-gray-200 text-gray-400'
                }`}>
                  <svg className="w-8 h-8 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-xs">No Arazzo spec loaded</p>
                  {onLoadMainSpec && (
                    <button
                      onClick={onLoadMainSpec}
                      className="mt-2 text-xs text-indigo-500 hover:text-indigo-400 underline"
                    >
                      Load sample
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* OpenAPI Sources */}
            <div>
              <h4 className={`text-xs uppercase font-semibold mb-2 px-1 flex items-center justify-between ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                <span>OpenAPI Sources</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${isDark ? 'bg-slate-800' : 'bg-gray-100'}`}>
                  {openApiSources.length}
                </span>
              </h4>
              {openApiSources.length > 0 ? (
                <div className="space-y-1">
                  {openApiSources.map((source) => (
                    <SourceItem
                      key={source.id}
                      source={source}
                      isSelected={selectedSourceId === source.id}
                      onSelect={() => onSelectSource(source.id)}
                      onRemove={() => onRemoveSource(source.id)}
                      isDark={isDark}
                    />
                  ))}
                </div>
              ) : (
                <div className={`p-3 rounded-lg border-2 border-dashed text-center ${
                  isDark ? 'border-slate-700 text-slate-500' : 'border-gray-200 text-gray-400'
                }`}>
                  <p className="text-xs">No OpenAPI sources</p>
                  <button
                    onClick={() => setActiveTab('add')}
                    className="mt-1 text-xs text-indigo-500 hover:text-indigo-400 underline"
                  >
                    Add source
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className={`flex-shrink-0 px-3 py-2 border-t text-xs ${isDark ? 'border-slate-700 text-slate-500' : 'border-gray-200 text-gray-400'}`}>
        <div className="flex items-center justify-between">
          <span>{sources.length} source{sources.length !== 1 ? 's' : ''}</span>
          <span>
            {sources.reduce((acc, s) => acc + (s.operationCount || 0), 0)} operations
          </span>
        </div>
      </div>
    </div>
  );
}

// Source Item Component
interface SourceItemProps {
  source: ManagedSource;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  isDark: boolean;
}

function SourceItem({ source, isSelected, onSelect, onRemove, isDark }: SourceItemProps) {
  return (
    <div
      onClick={onSelect}
      className={`group flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer transition-all ${
        isSelected
          ? isDark
            ? 'bg-indigo-600/20 border border-indigo-500/50'
            : 'bg-indigo-50 border border-indigo-200'
          : isDark
            ? 'hover:bg-slate-800 border border-transparent'
            : 'hover:bg-gray-50 border border-transparent'
      }`}
    >
      {/* Icon */}
      <div className={`w-8 h-8 rounded flex items-center justify-center flex-shrink-0 ${
        source.type === 'arazzo'
          ? isDark ? 'bg-purple-500/20' : 'bg-purple-100'
          : isDark ? 'bg-blue-500/20' : 'bg-blue-100'
      }`}>
        {source.type === 'arazzo' ? (
          <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
          </svg>
        ) : (
          <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {source.name}
        </div>
        <div className={`text-xs truncate ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
          {source.url || source.fileName || source.type}
          {source.operationCount !== undefined && (
            <span className="ml-1">• {source.operationCount} ops</span>
          )}
        </div>
      </div>

      {/* Actions */}
      {!source.isMain && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className={`p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
            isDark
              ? 'hover:bg-red-500/20 text-slate-400 hover:text-red-400'
              : 'hover:bg-red-50 text-gray-400 hover:text-red-500'
          }`}
          title="Remove source"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
