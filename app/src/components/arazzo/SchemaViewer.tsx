'use client';

import { memo, useState } from 'react';
import type { SchemaProperty, SchemaDefinition } from '@/types/arazzo';
import { Badge, CodeBlock } from '../primitives';

// ═══════════════════════════════════════════════════════════════════════════════
// SchemaViewer Component
// Displays component schemas from Arazzo specification
// ═══════════════════════════════════════════════════════════════════════════════

interface SchemaViewerProps {
  schemas: Record<string, SchemaDefinition>;
  isDark?: boolean;
  forceExpanded?: boolean;
}

interface SchemaCardProps {
  name: string;
  schema: SchemaDefinition;
  isDark: boolean;
  forceExpanded?: boolean;
}

function SchemaCard({ name, schema, isDark, forceExpanded }: SchemaCardProps) {
  const [isExpanded, setIsExpanded] = useState(forceExpanded ?? false);
  
  const textClass = isDark ? 'text-white' : 'text-gray-900';
  const mutedClass = isDark ? 'text-slate-400' : 'text-gray-500';
  const borderClass = isDark ? 'border-slate-700' : 'border-gray-200';
  const bgClass = isDark ? 'bg-slate-800' : 'bg-gray-50';
  
  const properties = schema.properties || {};
  const propertyNames = Object.keys(properties);
  const requiredProps = schema.required || [];

  return (
    <div className={`rounded-lg border ${borderClass} overflow-hidden`}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full px-4 py-3 flex items-center justify-between ${bgClass} hover:bg-opacity-80 transition-colors`}
      >
        <div className="flex items-center gap-3">
          <code className={`text-sm font-semibold ${textClass}`}>{name}</code>
          <Badge variant="type-object" isDark={isDark}>{schema.type || 'object'}</Badge>
          {propertyNames.length > 0 && (
            <span className={`text-xs ${mutedClass}`}>{propertyNames.length} properties</span>
          )}
        </div>
        <svg 
          className={`w-4 h-4 transition-transform ${mutedClass} ${isExpanded ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {/* Content */}
      {isExpanded && (
        <div className={`border-t ${borderClass}`}>
          {/* Properties Table */}
          {propertyNames.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className={bgClass}>
                  <tr className={`border-b ${borderClass}`}>
                    <th className={`px-4 py-2 text-left font-medium ${mutedClass}`}>Property</th>
                    <th className={`px-4 py-2 text-left font-medium ${mutedClass}`}>Type</th>
                    <th className={`px-4 py-2 text-left font-medium ${mutedClass}`}>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {propertyNames.map((propName) => {
                    const prop = properties[propName] as SchemaProperty;
                    const isRequired = requiredProps.includes(propName);
                    
                    return (
                      <tr key={propName} className={`border-b ${borderClass} last:border-b-0`}>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <code className={`font-mono ${textClass}`}>{propName}</code>
                            {isRequired && (
                              <span className="text-red-500 text-xs">*</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          <code className={`text-xs ${mutedClass}`}>
                            {prop.type || 'any'}
                            {prop.format && <span className="text-blue-500 ml-1">({prop.format})</span>}
                          </code>
                        </td>
                        <td className={`px-4 py-2 ${mutedClass}`}>
                          {prop.description || prop.example ? (
                            <div>
                              {prop.description && <span>{prop.description}</span>}
                              {prop.example !== undefined && (
                                <code className={`block text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                                  Example: {JSON.stringify(prop.example)}
                                </code>
                              )}
                            </div>
                          ) : (
                            <span className="italic">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          
          {/* JSON Schema Preview */}
          <details className={`border-t ${borderClass}`}>
            <summary className={`px-4 py-2 cursor-pointer text-sm font-medium ${mutedClass} hover:${isDark ? 'bg-slate-700' : 'bg-gray-50'}`}>
              JSON Schema
            </summary>
            <div className="px-4 pb-4">
              <CodeBlock
                code={JSON.stringify(schema, null, 2)}
                language="json"
                isDark={isDark}
              />
            </div>
          </details>
        </div>
      )}
    </div>
  );
}

function SchemaViewer({ schemas, isDark = false, forceExpanded }: SchemaViewerProps) {
  const schemaNames = Object.keys(schemas);

  if (schemaNames.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Schema Cards */}
      <div className="space-y-3">
        {schemaNames.map((name) => (
          <SchemaCard
            key={name}
            name={name}
            schema={schemas[name]}
            isDark={isDark}
            forceExpanded={forceExpanded}
          />
        ))}
      </div>
    </div>
  );
}

export default memo(SchemaViewer);
