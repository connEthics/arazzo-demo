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
  defaultCollapsed = true,
}: { 
  name: string; 
  schema: any; 
  required?: boolean; 
  isDark: boolean; 
  level?: number;
  defaultCollapsed?: boolean;
}) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  
  const textClass = isDark ? 'text-white' : 'text-gray-900';
  const mutedClass = isDark ? 'text-slate-400' : 'text-gray-500';
  const borderClass = isDark ? 'border-slate-700' : 'border-gray-200';
  const bgClass = isDark ? 'bg-slate-800' : 'bg-white';
  const hoverClass = isDark ? 'hover:bg-slate-700/50' : 'hover:bg-gray-50';
  
  const isObject = schema.type === 'object' && schema.properties;
  const isArray = schema.type === 'array';
  const hasDetails = schema.default !== undefined || schema.enum || 
    schema.minLength !== undefined || schema.maxLength !== undefined || 
    schema.pattern || schema.minimum !== undefined || schema.maximum !== undefined ||
    schema.example !== undefined || isObject || isArray;

  // Count properties for badge
  const propCount = isObject ? Object.keys(schema.properties).length : 0;
  
  return (
    <div className={`rounded-lg border ${borderClass} ${bgClass} overflow-hidden mb-3 transition-all duration-200 shadow-sm`}>
      {/* Header - clickable */}
      <div
        onClick={() => hasDetails && setIsCollapsed(!isCollapsed)}
        className={`w-full px-4 py-3 flex items-start justify-between gap-4 text-left transition-colors ${hasDetails ? `cursor-pointer ${hoverClass}` : ''}`}
      >
        <div className="flex-1 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-mono font-semibold text-sm ${textClass}`}>{name}</span>
            {schema.type && (
              <Badge variant={`type-${schema.type}` as any} isDark={isDark} size="xs">
                {schema.type.toUpperCase()}
                {schema.format && ` (${schema.format})`}
              </Badge>
            )}
            {required && (
              <Badge variant="required" isDark={isDark} size="xs">REQUIRED</Badge>
            )}
            {isObject && propCount > 0 && isCollapsed && (
              <span className={`text-[10px] ${mutedClass}`}>{propCount} props</span>
            )}
          </div>
          
          {/* Description - always visible */}
          {schema.description && (
            <p className={`text-sm ${mutedClass} leading-relaxed`}>{schema.description}</p>
          )}
        </div>

        {hasDetails && (
          <div className={`mt-1 p-1 rounded-full ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-200'} transition-colors`}>
            <svg 
              className={`w-4 h-4 ${mutedClass} transition-transform duration-200 ${isCollapsed ? '' : 'rotate-180'}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        )}
      </div>

      {/* Details Body - collapsible */}
      {!isCollapsed && hasDetails && (
        <div className={`px-4 pb-4 pt-2 border-t ${borderClass} ${isDark ? 'bg-black/10' : 'bg-gray-50/30'}`}>
          <div className="space-y-3">
            
            {/* Default Value */}
            {schema.default !== undefined && (
              <div className="flex items-center gap-2 text-sm">
                <span className={`${mutedClass} font-medium`}>Default:</span>
                <code className={`font-mono ${textClass} px-1.5 py-0.5 rounded ${isDark ? 'bg-slate-700' : 'bg-white'} border ${borderClass}`}>
                  {JSON.stringify(schema.default)}
                </code>
              </div>
            )}

            {/* Enum Values */}
            {schema.enum && (
              <div className="space-y-1.5">
                <span className={`text-xs font-medium uppercase ${mutedClass}`}>Allowed Values</span>
                <div className="flex flex-wrap gap-1.5">
                  {schema.enum.map((val: any, idx: number) => (
                    <Badge key={idx} variant="info" isDark={isDark} size="sm">{val}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Validation Rules */}
            {(schema.minLength !== undefined || schema.maxLength !== undefined || schema.pattern || 
              schema.minimum !== undefined || schema.maximum !== undefined) && (
              <div className="space-y-1.5">
                <span className={`text-xs font-medium uppercase ${mutedClass}`}>Constraints</span>
                <div className="flex flex-wrap gap-3 text-xs">
                  {schema.minLength !== undefined && (
                    <span className={`${mutedClass} flex items-center gap-1`}>
                      Min Length: <code className={`${textClass} font-mono`}>{schema.minLength}</code>
                    </span>
                  )}
                  {schema.maxLength !== undefined && (
                    <span className={`${mutedClass} flex items-center gap-1`}>
                      Max Length: <code className={`${textClass} font-mono`}>{schema.maxLength}</code>
                    </span>
                  )}
                  {schema.minimum !== undefined && (
                    <span className={`${mutedClass} flex items-center gap-1`}>
                      Min: <code className={`${textClass} font-mono`}>{schema.minimum}</code>
                    </span>
                  )}
                  {schema.maximum !== undefined && (
                    <span className={`${mutedClass} flex items-center gap-1`}>
                      Max: <code className={`${textClass} font-mono`}>{schema.maximum}</code>
                    </span>
                  )}
                  {schema.pattern && (
                    <span className={`${mutedClass} flex items-center gap-1`}>
                      Pattern: <code className={`${textClass} font-mono break-all`}>{schema.pattern}</code>
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Example */}
            {schema.example !== undefined && (
              <div className="space-y-1.5">
                <span className={`text-xs font-medium uppercase ${mutedClass}`}>Example</span>
                <code className={`block font-mono p-2 rounded ${isDark ? 'bg-black/30' : 'bg-white'} border ${borderClass} ${textClass} text-xs break-all`}>
                  {JSON.stringify(schema.example, null, 2)}
                </code>
              </div>
            )}

            {/* Nested Properties (Object) */}
            {isObject && (
              <div className="mt-3 pl-3 border-l-2 border-indigo-400/30 space-y-3">
                <span className={`text-xs font-semibold uppercase ${mutedClass} tracking-wider`}>Properties</span>
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
              <div className="mt-3 pl-3 border-l-2 border-blue-400/30 space-y-3">
                <span className={`text-xs font-semibold uppercase ${mutedClass} tracking-wider`}>Array Items</span>
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
        </div>
      )}
    </div>
  );
}
