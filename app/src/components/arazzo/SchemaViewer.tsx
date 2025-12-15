'use client';

import { memo, useState } from 'react';
import type { SchemaProperty, SchemaDefinition } from '@/types/arazzo';
import { Badge, CodeBlock } from '../primitives';

// ═══════════════════════════════════════════════════════════════════════════════
// SchemaViewer Component
// Displays component schemas from Arazzo specification
// Supports both collection view (schemas prop) and single property view (name/schema props)
// ═══════════════════════════════════════════════════════════════════════════════

interface SchemaViewerProps {
  // Collection mode - display multiple schemas
  schemas?: Record<string, SchemaDefinition>;
  // Single schema mode - display a single property
  name?: string;
  schema?: any;
  required?: boolean;
  level?: number;
  // Common props
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

// Single property schema viewer (recursive, for inline use in DetailViews)
function SingleSchemaViewer({ 
  name, 
  schema, 
  required, 
  isDark = false, 
  level = 0 
}: { 
  name: string; 
  schema: any; 
  required?: boolean; 
  isDark: boolean; 
  level?: number;
}) {
  const textClass = isDark ? 'text-white' : 'text-gray-900';
  const mutedClass = isDark ? 'text-slate-400' : 'text-gray-500';
  const borderClass = isDark ? 'border-slate-700' : 'border-gray-200';
  const bgClass = isDark ? 'bg-slate-800' : 'bg-gray-50';
  
  const isObject = schema.type === 'object' && schema.properties;
  const isArray = schema.type === 'array';
  
  return (
    <div className={`rounded border ${borderClass} ${bgClass} overflow-hidden mb-2`}>
      {/* Header */}
      <div className="px-3 py-2 flex flex-col gap-1">
        <div className="flex items-center gap-2 flex-wrap">
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
        </div>
        
        {schema.description && (
          <p className={`text-xs ${mutedClass}`}>{schema.description}</p>
        )}
      </div>

      {/* Details Body */}
      <div className={`px-3 pb-2 space-y-2 border-t ${borderClass} pt-2 bg-opacity-50 ${isDark ? 'bg-black/20' : 'bg-gray-50/50'}`}>
        
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

        {/* Example */}
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
              <SingleSchemaViewer
                key={propName}
                name={propName}
                schema={propSchema}
                required={schema.required?.includes(propName)}
                isDark={isDark}
                level={level + 1}
              />
            ))}
          </div>
        )}

        {/* Array Items */}
        {isArray && schema.items && (
          <div className="mt-2 pl-2 border-l-2 border-blue-400/30">
            <span className={`text-[10px] uppercase font-semibold ${mutedClass} block mb-2`}>Array Items</span>
            <SingleSchemaViewer
              name="items"
              schema={schema.items}
              isDark={isDark}
              level={level + 1}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function SchemaViewer({ schemas, name, schema, required, level = 0, isDark = false, forceExpanded }: SchemaViewerProps) {
  // Single schema mode (for inline property display in DetailViews)
  if (name && schema) {
    return (
      <SingleSchemaViewer
        name={name}
        schema={schema}
        required={required}
        isDark={isDark}
        level={level}
      />
    );
  }

  // Collection mode (for displaying multiple schemas)
  if (!schemas) return null;
  
  const schemaNames = Object.keys(schemas);

  if (schemaNames.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Schema Cards */}
      <div className="space-y-3">
        {schemaNames.map((schemaName) => (
          <SchemaCard
            key={schemaName}
            name={schemaName}
            schema={schemas[schemaName]}
            isDark={isDark}
            forceExpanded={forceExpanded}
          />
        ))}
      </div>
    </div>
  );
}

export default memo(SchemaViewer);
