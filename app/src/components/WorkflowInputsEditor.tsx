'use client';

import { useState } from 'react';
import type { WorkflowInputs } from '@/types/arazzo';
import SchemaEditor from './SchemaEditor';
import SchemaViewer from './arazzo/SchemaViewer';

interface WorkflowInputsEditorProps {
  inputs: WorkflowInputs;
  onChange: (inputs: WorkflowInputs) => void;
  isDark: boolean;
}

export default function WorkflowInputsEditor({
  inputs,
  onChange,
  isDark
}: WorkflowInputsEditorProps) {
  const [editingProp, setEditingProp] = useState<string | null>(null);
  const properties = inputs.properties ? Object.keys(inputs.properties) : [];

  const handleUpdate = (oldName: string, newName: string, newSchema: any, newRequired: boolean) => {
    const newProps = { ...(inputs.properties || {}) };
    
    // Handle rename
    if (newName !== oldName) {
      // Preserve order: create new object with keys in correct order
      const orderedProps: Record<string, any> = {};
      properties.forEach(key => {
        if (key === oldName) {
          orderedProps[newName] = newSchema;
        } else {
          orderedProps[key] = newProps[key];
        }
      });
      
      // Update required list
      let requiredList = [...(inputs.required || [])];
      if (requiredList.includes(oldName)) {
        requiredList = requiredList.map(r => r === oldName ? newName : r);
      }
      
      onChange({ ...inputs, properties: orderedProps, required: requiredList });
      
      // Update editing prop name if we renamed the one being edited
      if (editingProp === oldName) {
        setEditingProp(newName);
      }
    } else {
      // Just update schema
      newProps[newName] = newSchema;
      
      // Update required list
      let requiredList = [...(inputs.required || [])];
      if (newRequired) {
        if (!requiredList.includes(newName)) requiredList.push(newName);
      } else {
        requiredList = requiredList.filter(r => r !== newName);
      }
      
      onChange({ ...inputs, properties: newProps, required: requiredList });
    }
  };

  const handleDelete = (name: string) => {
    const newProps = { ...(inputs.properties || {}) };
    delete newProps[name];
    const newRequired = (inputs.required || []).filter(r => r !== name);
    onChange({ ...inputs, properties: newProps, required: newRequired });
    if (editingProp === name) {
      setEditingProp(null);
    }
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= properties.length) return;

    const newProps: Record<string, any> = {};
    const movedProp = properties[index];
    
    // Reconstruct object in new order
    const newOrder = [...properties];
    newOrder.splice(index, 1);
    newOrder.splice(newIndex, 0, movedProp);
    
    newOrder.forEach(key => {
      newProps[key] = inputs.properties![key];
    });

    onChange({ ...inputs, properties: newProps });
  };

  const handleAdd = () => {
    const newProps = { ...(inputs.properties || {}) };
    const nextId = properties.length + 1;
    const newName = `input_${nextId}`;
    newProps[newName] = { type: 'string', description: 'New input' };
    onChange({ ...inputs, properties: newProps });
    setEditingProp(newName);
  };
  
  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {properties.map((propName, index) => (
          <div key={propName} className="relative group">
            {editingProp === propName ? (
              <div className="relative">
                <SchemaEditor
                  name={propName}
                  schema={inputs.properties![propName]}
                  required={inputs.required?.includes(propName)}
                  isDark={isDark}
                  onChange={(newName, newSchema, newRequired) => handleUpdate(propName, newName, newSchema, newRequired)}
                  onDelete={() => handleDelete(propName)}
                />
                <div className="flex justify-end mt-2">
                  <button
                    onClick={() => setEditingProp(null)}
                    className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                      isDark 
                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white' 
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    }`}
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative">
                <SchemaViewer
                  name={propName}
                  schema={inputs.properties![propName]}
                  required={inputs.required?.includes(propName)}
                  isDark={isDark}
                />
                {/* Action Buttons Overlay */}
                <div className={`absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity rounded-md p-1 shadow-sm border ${
                  isDark 
                    ? 'bg-slate-800/90 border-slate-700' 
                    : 'bg-white/90 border-gray-200'
                }`}>
                  <button
                    onClick={() => setEditingProp(propName)}
                    className={`p-1.5 rounded transition-colors ${
                      isDark ? 'hover:bg-slate-700 text-slate-400 hover:text-indigo-400' : 'hover:bg-gray-100 text-gray-400 hover:text-indigo-600'
                    }`}
                    title="Edit"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  
                  {index > 0 && (
                    <button
                      onClick={() => handleMove(index, 'up')}
                      className={`p-1.5 rounded transition-colors ${
                        isDark ? 'hover:bg-slate-700 text-slate-400 hover:text-slate-200' : 'hover:bg-gray-100 text-gray-400 hover:text-gray-700'
                      }`}
                      title="Move Up"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                  )}
                  
                  {index < properties.length - 1 && (
                    <button
                      onClick={() => handleMove(index, 'down')}
                      className={`p-1.5 rounded transition-colors ${
                        isDark ? 'hover:bg-slate-700 text-slate-400 hover:text-slate-200' : 'hover:bg-gray-100 text-gray-400 hover:text-gray-700'
                      }`}
                      title="Move Down"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  )}

                  <button
                    onClick={() => handleDelete(propName)}
                    className={`p-1.5 rounded transition-colors ${
                      isDark ? 'hover:bg-red-900/30 text-slate-400 hover:text-red-400' : 'hover:bg-red-50 text-gray-400 hover:text-red-600'
                    }`}
                    title="Delete"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      <button
        onClick={handleAdd}
        className={`w-full py-2 rounded-lg border-2 border-dashed flex items-center justify-center gap-2 transition-colors ${
          isDark 
            ? 'border-slate-700 hover:border-slate-600 text-slate-400 hover:text-slate-300 hover:bg-slate-800' 
            : 'border-gray-200 hover:border-gray-300 text-gray-500 hover:text-gray-600 hover:bg-gray-50'
        }`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        <span className="text-sm font-medium">Add Input</span>
      </button>
    </div>
  );
}
