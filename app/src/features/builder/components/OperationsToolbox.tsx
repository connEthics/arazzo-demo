'use client';

import { useState, useMemo } from 'react';
import { useBuilder } from '../context/BuilderContext';
import { extractOperations, groupOperationsByTag, groupOperationsBySource, OperationItem } from '../utils/oas-helpers';
import { Card, Badge } from '@/components/primitives';

type GroupBy = 'tag' | 'source' | 'none';

interface OperationsToolboxProps {
  onOperationDragStart?: () => void;
}

export default function OperationsToolbox({ onOperationDragStart }: OperationsToolboxProps) {
  const { state, dispatch } = useBuilder();
  const [searchQuery, setSearchQuery] = useState('');
  const [groupBy, setGroupBy] = useState<GroupBy>('tag');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  
  const allOperations = extractOperations(state.sources);
  
  // Filter operations based on search
  const filteredOperations = useMemo(() => {
    if (!searchQuery.trim()) return allOperations;
    const query = searchQuery.toLowerCase();
    return allOperations.filter(op => 
      op.operationId.toLowerCase().includes(query) ||
      op.path.toLowerCase().includes(query) ||
      op.summary?.toLowerCase().includes(query) ||
      op.tags.some(t => t.toLowerCase().includes(query)) ||
      op.method.toLowerCase().includes(query)
    );
  }, [allOperations, searchQuery]);
  
  // Group operations
  const groupedOperations = useMemo(() => {
    if (groupBy === 'none') return { 'All Operations': filteredOperations };
    if (groupBy === 'source') return groupOperationsBySource(filteredOperations);
    return groupOperationsByTag(filteredOperations);
  }, [filteredOperations, groupBy]);

  const toggleGroup = (group: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(group)) {
        next.delete(group);
      } else {
        next.add(group);
      }
      return next;
    });
  };

  const onDragStart = (event: React.DragEvent, op: OperationItem) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify({ type: 'step', data: op }));
    event.dataTransfer.effectAllowed = 'move';
    onOperationDragStart?.();
  };

  // Mobile: tap to add step directly
  const onTapToAdd = (op: OperationItem) => {
    const stepCount = state.spec.workflows[0]?.steps.length || 0;
    dispatch({
      type: 'ADD_STEP',
      payload: {
        step: {
          stepId: `step_${stepCount + 1}`,
          operationId: `${op.sourceName}.${op.operationId}`,
        },
        position: { x: 100 + (stepCount * 50), y: 100 + (stepCount * 50) }
      }
    });
    onOperationDragStart?.(); // Switch to canvas view on mobile
  };

  const getMethodBadgeVariant = (method: string) => {
    switch (method) {
      case 'GET': return 'method-get';
      case 'POST': return 'method-post';
      case 'PUT': return 'method-put';
      case 'DELETE': return 'method-delete';
      case 'PATCH': return 'method-patch';
      default: return 'info';
    }
  };

  if (Object.keys(state.sources).length === 0) {
    return (
      <div className="p-4 text-center text-sm text-slate-500">
        Import a source to see available operations.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search & Controls */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-800 space-y-2">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search operations..."
            className="w-full pl-8 pr-3 py-1.5 rounded border bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-sm"
          />
          <svg 
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          )}
        </div>
        
        <div className="flex gap-1">
          <button
            onClick={() => setGroupBy('tag')}
            className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
              groupBy === 'tag' 
                ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' 
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            By Tag
          </button>
          <button
            onClick={() => setGroupBy('source')}
            className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
              groupBy === 'source' 
                ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' 
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            By Source
          </button>
          <button
            onClick={() => setGroupBy('none')}
            className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
              groupBy === 'none' 
                ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' 
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Flat
          </button>
        </div>
        
        <div className="text-xs text-slate-500 text-center">
          {filteredOperations.length} operation{filteredOperations.length !== 1 ? 's' : ''}
          {searchQuery && ` matching "${searchQuery}"`}
        </div>
      </div>

      {/* Operations List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {Object.entries(groupedOperations).map(([group, ops]) => (
          <div key={group} className="space-y-1">
            {/* Group Header */}
            <button
              onClick={() => toggleGroup(group)}
              className="w-full flex items-center justify-between px-2 py-1.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <div className="flex items-center gap-2">
                <svg 
                  className={`w-3 h-3 text-slate-500 transition-transform ${collapsedGroups.has(group) ? '' : 'rotate-90'}`} 
                  fill="currentColor" 
                  viewBox="0 0 20 20"
                >
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{group}</span>
              </div>
              <span className="text-xs text-slate-500 bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded-full">
                {ops.length}
              </span>
            </button>
            
            {/* Operations in Group */}
            {!collapsedGroups.has(group) && (
              <div className="space-y-1.5 pl-2">
                {ops.map((op, idx) => (
                  <div
                    key={`${op.sourceName}-${op.method}-${op.path}-${idx}`}
                    draggable
                    onDragStart={(e) => onDragStart(e, op)}
                    className="cursor-grab active:cursor-grabbing"
                  >
                    <Card isDark={false} className="p-2.5 hover:border-indigo-500 hover:shadow-sm transition-all group">
                      <div className="flex items-start gap-2">
                        <Badge 
                          variant={getMethodBadgeVariant(op.method) as any} 
                          size="sm"
                          className="shrink-0 mt-0.5"
                        >
                          {op.method}
                        </Badge>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate" title={op.operationId}>
                            {op.operationId}
                          </div>
                          <div className="text-xs text-slate-400 truncate font-mono" title={op.path}>
                            {op.path}
                          </div>
                          {op.summary && (
                            <div className="text-xs text-slate-500 truncate mt-0.5" title={op.summary}>
                              {op.summary}
                            </div>
                          )}
                        </div>
                        {/* Mobile: Add button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onTapToAdd(op);
                          }}
                          className="md:hidden shrink-0 ml-2 bg-indigo-500 hover:bg-indigo-600 text-white text-xs px-2 py-1 rounded transition-colors"
                        >
                          + Add
                        </button>
                      </div>
                      {groupBy !== 'source' && Object.keys(state.sources).length > 1 && (
                        <div className="mt-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                            {op.sourceName}
                          </span>
                        </div>
                      )}
                    </Card>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        
        {filteredOperations.length === 0 && (
          <div className="text-center text-sm text-slate-500 py-8">
            No operations match your search.
          </div>
        )}
      </div>
    </div>
  );
}
