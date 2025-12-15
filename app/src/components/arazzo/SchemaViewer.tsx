'use client';

import { useState } from 'react';
import { Badge } from '../primitives';

// Recursive component to display schema properties with validation rules
export default function SchemaViewer({ 
  name, 
  schema, 
  required, 
  isDark, 
  level = 0,
  defaultCollapsed = false,
}: { 
  name: string; 
  schema: any; 
  required?: boolean; 
  isDark: boolean; 
  level?: number;
  defaultCollapsed?: boolean;
}) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed && level === 0);
  
  const textClass = isDark ? 'text-white' : 'text-gray-900';
  const mutedClass = isDark ? 'text-slate-400' : 'text-gray-500';
  const borderClass = isDark ? 'border-slate-700' : 'border-gray-200';
  const bgClass = isDark ? 'bg-slate-800' : 'bg-gray-50';
  const hoverClass = isDark ? 'hover:bg-slate-700/50' : 'hover:bg-gray-100/50';
  
  const isObject = schema.type === 'object' && schema.properties;
  const isArray = schema.type === 'array';
  const hasDetails = schema.default !== undefined || schema.enum || 
    schema.minLength !== undefined || schema.maxLength !== undefined || 
    schema.pattern || schema.minimum !== undefined || schema.maximum !== undefined ||
    schema.example !== undefined || isObject || isArray;

  // Count properties for badge
  const propCount = isObject ? Object.keys(schema.properties).length : 0;
  
  return (
    <div className={`rounded border ${borderClass} ${bgClass} overflow-hidden mb-2`}>
      {/* Header - clickable */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={`w-full px-3 py-2 flex items-center justify-between gap-2 text-left transition-colors ${hoverClass}`}
      >
        <div className="flex items-center gap-2 flex-wrap min-w-0 flex-1">
          <code className={`text-sm font-mono font-medium ${textClass}`}>{name}</code>
          {schema.type && (
            <Badge variant={`type-${schema.type}` as any} isDark={isDark} size="xs">
              {schema.type}
              {schema.format && ` (${schema.format})`}
            </Badge>
          )}
          {required && (
            <Badge variant="required" isDark={isDark} size="xs">Required</Badge>
          )}
          {isObject && propCount > 0 && isCollapsed && (
            <span className={`text-[10px] ${mutedClass}`}>{propCount} props</span>
          )}
        </div>
        {hasDetails && (
          <svg 
            className={`w-4 h-4 ${mutedClass} transition-transform flex-shrink-0 ${isCollapsed ? '' : 'rotate-180'}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>
      
      {/* Description - always visible if present */}
      {schema.description && (
        <div className={`px-3 pb-2 ${isCollapsed ? '' : `border-b ${borderClass}`}`}>
          <p className={`text-xs ${mutedClass}`}>{schema.description}</p>
        </div>
      )}

      {/* Details Body - collapsible */}
      {!isCollapsed && hasDetails && (
        <div className={`px-3 pb-2 space-y-2 pt-2 bg-opacity-50 ${isDark ? 'bg-black/20' : 'bg-gray-50/50'}`}>
          
          {/* Default Value */}
          {schema.default !== undefined && (
            <div className="flex items-center gap-2 text-xs">
              <span className={mutedClass}>Default:</span>
              <code className={`font-mono ${textClass}`}>{JSON.stringify(schema.default)}</code>
            </div>
          )}

          {/* Enum Values */}
          {schema.enum && (
            <div className="flex flex-wrap gap-1">
              {schema.enum.map((val: any, idx: number) => (
                <Badge key={idx} variant="info" isDark={isDark} size="xs">{val}</Badge>
              ))}
            </div>
          )}

          {/* Validation Rules */}
          {(schema.minLength !== undefined || schema.maxLength !== undefined || schema.pattern || 
            schema.minimum !== undefined || schema.maximum !== undefined) && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
              {schema.minLength !== undefined && (
                <span className={mutedClass}>Min Len: <code className={textClass}>{schema.minLength}</code></span>
              )}
              {schema.maxLength !== undefined && (
                <span className={mutedClass}>Max Len: <code className={textClass}>{schema.maxLength}</code></span>
              )}
              {schema.minimum !== undefined && (
                <span className={mutedClass}>Min: <code className={textClass}>{schema.minimum}</code></span>
              )}
              {schema.maximum !== undefined && (
                <span className={mutedClass}>Max: <code className={textClass}>{schema.maximum}</code></span>
              )}
              {schema.pattern && (
                <span className={mutedClass}>Pattern: <code className={`${textClass} break-all`}>{schema.pattern}</code></span>
              )}
            </div>
          )}

          {/* Example - only show if defined */}
          {schema.example !== undefined && (
            <div className="text-xs">
              <span className={`${mutedClass} block mb-0.5`}>Example:</span>
              <code className={`block font-mono p-1 rounded ${isDark ? 'bg-black/30' : 'bg-white'} ${textClass} break-all`}>
                {JSON.stringify(schema.example)}
              </code>
            </div>
          )}

          {/* Nested Properties (Object) */}
          {isObject && (
            <div className="mt-2 pl-2 border-l-2 border-indigo-400/30">
              <span className={`text-[10px] uppercase font-semibold ${mutedClass} block mb-2`}>Properties</span>
              {Object.entries(schema.properties).map(([propName, propSchema]: [string, any]) => (
                <SchemaViewer
                  key={propName}
                  name={propName}
                  schema={propSchema}
                  required={schema.required?.includes(propName)}
                  isDark={isDark}
                  level={level + 1}
                  defaultCollapsed={defaultCollapsed}
                />
              ))}
            </div>
          )}

          {/* Array Items */}
          {isArray && schema.items && (
            <div className="mt-2 pl-2 border-l-2 border-blue-400/30">
              <span className={`text-[10px] uppercase font-semibold ${mutedClass} block mb-2`}>Array Items</span>
              <SchemaViewer
                name="items"
                schema={schema.items}
                isDark={isDark}
                level={level + 1}
                defaultCollapsed={defaultCollapsed}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
