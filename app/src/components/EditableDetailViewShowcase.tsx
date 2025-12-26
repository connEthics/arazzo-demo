'use client';

import { useState } from 'react';
import EditableField, { EditMode, ActivationMode } from './primitives/EditableField';
import EditableListItem, { ParameterItem, OutputItem, ParameterIn } from './primitives/EditableListItem';
import { ExpressionSuggestion } from './ExpressionInput';
import { Card, Badge } from './primitives';
import ActionFormEditor, { Action } from './ActionFormEditor';

// Sample data mimicking step content
interface SampleStep {
  stepId: string;
  operationId: string;
  description: string;
  parameters: ParameterItem[];
  outputs: OutputItem[];
}

// Expression suggestions
const EXPRESSION_SUGGESTIONS: ExpressionSuggestion[] = [
  { expression: '$statusCode', label: 'Status Code', type: 'context' },
  { expression: '$response.body', label: 'Response Body', type: 'response' },
  { expression: '$response.body.id', label: 'Body ID', type: 'response' },
  { expression: '$inputs.userId', label: 'User ID', type: 'input' },
  { expression: '$inputs.petType', label: 'Pet Type', type: 'input' },
  { expression: '$steps.login.outputs.token', label: 'Login Token', type: 'output' },
];

// Mode Toggle Component
function ModeToggle({ 
  mode, 
  onChange, 
  isDark 
}: { 
  mode: EditMode; 
  onChange: (mode: EditMode) => void; 
  isDark: boolean;
}) {
  return (
    <div className={`inline-flex rounded-lg p-0.5 ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>
      <button
        onClick={() => onChange('read')}
        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
          mode === 'read'
            ? isDark ? 'bg-slate-600 text-white shadow' : 'bg-white text-gray-900 shadow'
            : isDark ? 'text-slate-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        👁 Read
      </button>
      <button
        onClick={() => onChange('edit')}
        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
          mode === 'edit'
            ? isDark ? 'bg-indigo-600 text-white shadow' : 'bg-indigo-600 text-white shadow'
            : isDark ? 'text-slate-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        ✏️ Edit
      </button>
    </div>
  );
}

// Section with editable fields
function EditableSection({
  title,
  badge,
  isDark,
  children,
  editMode,
  activationMode,
  onAdd,
  addLabel,
}: {
  title: string;
  badge?: React.ReactNode;
  isDark: boolean;
  children: React.ReactNode;
  editMode?: EditMode;
  activationMode: ActivationMode;
  onAdd?: () => void;
  addLabel?: string;
}) {
  const [mobileEditActive, setMobileEditActive] = useState(false);

  // For mobile: show edit button per section
  const showMobileEdit = activationMode === 'hover';
  
  // Show add button when in edit mode (toggle) or always visible (hover)
  const showAddButton = onAdd && (
    (activationMode === 'toggle' && editMode === 'edit') ||
    activationMode === 'hover'
  );

  return (
    <div className={`rounded-lg border ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-gray-200 bg-white'}`}>
      <div className={`flex items-center justify-between px-3 py-2 border-b ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
        <div className="flex items-center gap-2">
          <h4 className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{title}</h4>
          {badge}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Add button */}
          {showAddButton && (
            <button
              onClick={onAdd}
              className={`px-2 py-1 text-xs rounded transition-colors flex items-center gap-1 ${
                isDark 
                  ? 'bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30' 
                  : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
              }`}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {addLabel || 'Add'}
            </button>
          )}
          
          {/* Mobile: Section edit button */}
          {showMobileEdit && (
            <button
              onClick={() => setMobileEditActive(!mobileEditActive)}
              className={`md:hidden px-2 py-1 text-xs rounded transition-colors ${
                mobileEditActive
                  ? 'bg-indigo-600 text-white'
                  : isDark ? 'bg-slate-700 text-slate-300' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {mobileEditActive ? '✓ Done' : '✏️ Edit'}
            </button>
          )}
        </div>
      </div>
      <div className="p-3 space-y-2">
        {children}
      </div>
    </div>
  );
}

interface EditableDetailViewShowcaseProps {
  isDark: boolean;
}

export default function EditableDetailViewShowcase({ isDark }: EditableDetailViewShowcaseProps) {
  
  // Track which items are newly added (for auto-focus)
  const [newItemId, setNewItemId] = useState<string | null>(null);

  // Sample step data - separate state for each mode demo
  const [stepToggle, setStepToggle] = useState<SampleStep>({
    stepId: 'find-pets',
    operationId: 'petstore.findPetsByStatus',
    description: 'Search for available pets matching the user criteria',
    parameters: [
      { name: 'status', in: 'query', value: 'available' },
      { name: 'petType', in: 'query', value: '$inputs.petType' },
    ],
    outputs: [
      { key: 'pets', value: '$response.body' },
      { key: 'count', value: '$response.body.length' },
    ],
  });

  const [stepHover, setStepHover] = useState<SampleStep>({
    stepId: 'get-pet-details',
    operationId: 'petstore.getPetById',
    description: 'Fetch detailed information about a specific pet',
    parameters: [
      { name: 'petId', in: 'path', value: '$steps.find-pets.outputs.pets[0].id' },
    ],
    outputs: [
      { key: 'pet', value: '$response.body' },
      { key: 'price', value: '$response.body.price' },
    ],
  });

  // Actions state for ActionFormEditor demo
  const [actionsToggle, setActionsToggle] = useState<Action[]>([
    { type: 'goto', stepId: 'process-order' },
  ]);
  const [actionsHover, setActionsHover] = useState<Action[]>([
    { type: 'retry', retryAfter: 5, retryLimit: 3 },
  ]);

  // Edit mode for toggle demo
  const [editMode, setEditMode] = useState<EditMode>('read');

  // Helper to update step fields
  const updateStep = (
    setStep: React.Dispatch<React.SetStateAction<SampleStep>>,
    field: keyof SampleStep,
    value: string
  ) => {
    setStep(prev => ({ ...prev, [field]: value }));
  };

  // Update parameter at index
  const updateParameter = (
    setStep: React.Dispatch<React.SetStateAction<SampleStep>>,
    index: number,
    updatedParam: ParameterItem
  ) => {
    setStep(prev => {
      const params = [...prev.parameters];
      params[index] = updatedParam;
      return { ...prev, parameters: params };
    });
  };

  // Delete parameter at index
  const deleteParameter = (
    setStep: React.Dispatch<React.SetStateAction<SampleStep>>,
    index: number
  ) => {
    setStep(prev => ({
      ...prev,
      parameters: prev.parameters.filter((_, i) => i !== index),
    }));
  };

  // Update output at index
  const updateOutput = (
    setStep: React.Dispatch<React.SetStateAction<SampleStep>>,
    index: number,
    updatedOutput: OutputItem
  ) => {
    setStep(prev => {
      const outputs = [...prev.outputs];
      outputs[index] = updatedOutput;
      return { ...prev, outputs };
    });
  };

  // Delete output at index
  const deleteOutput = (
    setStep: React.Dispatch<React.SetStateAction<SampleStep>>,
    index: number
  ) => {
    setStep(prev => ({
      ...prev,
      outputs: prev.outputs.filter((_, i) => i !== index),
    }));
  };

  // Add new parameter
  const addParameter = (
    setStep: React.Dispatch<React.SetStateAction<SampleStep>>
  ) => {
    const id = `param_${Date.now()}`;
    setNewItemId(id);
    setStep(prev => ({
      ...prev,
      parameters: [...prev.parameters, { name: id, in: 'query' as ParameterIn, value: '' }],
    }));
  };

  // Add new output
  const addOutput = (
    setStep: React.Dispatch<React.SetStateAction<SampleStep>>
  ) => {
    const id = `output_${Date.now()}`;
    setNewItemId(id);
    setStep(prev => ({
      ...prev,
      outputs: [...prev.outputs, { key: id, value: '' }],
    }));
  };

  const bgClass = isDark ? 'bg-slate-900' : 'bg-gray-50';
  const textClass = isDark ? 'text-white' : 'text-gray-900';

  return (
    <div className={`min-h-screen ${bgClass} p-6`}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className={`text-2xl font-bold ${textClass} mb-2`}>
            Editable Detail View - Mode Comparison
          </h1>
          <p className={`${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
            Compare different edit activation modes: Toggle (external control) vs Hover (inline)
          </p>
        </div>

        {/* Comparison Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* === MODE 1: Toggle (External Control) === */}
          <div className={`rounded-xl border-2 ${isDark ? 'border-indigo-500/30 bg-slate-800' : 'border-indigo-200 bg-white'} p-4`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className={`text-lg font-semibold ${textClass}`}>Mode: Toggle</h2>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  External Read/Edit switch
                </p>
              </div>
              <ModeToggle mode={editMode} onChange={setEditMode} isDark={isDark} />
            </div>

            {/* Hint */}
            <div className={`mb-4 p-2 rounded text-xs ${
              editMode === 'edit' 
                ? isDark ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-50 text-indigo-700'
                : isDark ? 'bg-slate-700 text-slate-400' : 'bg-gray-100 text-gray-600'
            }`}>
              {editMode === 'edit' 
                ? '✏️ Edit mode active - All fields are editable'
                : '👁 Read mode - Toggle to edit to make changes'}
            </div>

            <div className="space-y-4">
              {/* General Info */}
              <EditableSection 
                title="General" 
                isDark={isDark} 
                editMode={editMode}
                activationMode="toggle"
              >
                <EditableField
                  label="stepId"
                  value={stepToggle.stepId}
                  onChange={(v) => updateStep(setStepToggle, 'stepId', v)}
                  activationMode="toggle"
                  editMode={editMode}
                  isDark={isDark}
                  required
                  validate={(v) => v.length < 2 ? 'Min 2 characters' : null}
                />
                <EditableField
                  label="operationId"
                  value={stepToggle.operationId}
                  onChange={(v) => updateStep(setStepToggle, 'operationId', v)}
                  activationMode="toggle"
                  editMode={editMode}
                  isDark={isDark}
                  badge={<Badge variant="method-get" isDark={isDark} size="xs">GET</Badge>}
                />
                <EditableField
                  label="description"
                  value={stepToggle.description}
                  onChange={(v) => updateStep(setStepToggle, 'description', v)}
                  type="textarea"
                  activationMode="toggle"
                  editMode={editMode}
                  isDark={isDark}
                  placeholder="Describe what this step does..."
                />
              </EditableSection>

              {/* Parameters */}
              <EditableSection 
                title="Parameters" 
                badge={<Badge variant="info" isDark={isDark} size="xs">{stepToggle.parameters.length}</Badge>}
                isDark={isDark}
                editMode={editMode}
                activationMode="toggle"
                onAdd={() => addParameter(setStepToggle)}
                addLabel="Add Param"
              >
                {stepToggle.parameters.map((param, idx) => (
                  <EditableListItem
                    key={`${param.name}-${idx}`}
                    type="parameter"
                    item={param}
                    onChange={(updated) => updateParameter(setStepToggle, idx, updated)}
                    onDelete={() => deleteParameter(setStepToggle, idx)}
                    isDark={isDark}
                    expressionSuggestions={EXPRESSION_SUGGESTIONS}
                    borderColor="border-blue-400"
                    isNew={param.name === newItemId}
                  />
                ))}
                {stepToggle.parameters.length === 0 && (
                  <p className={`text-xs italic ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                    No parameters yet. Click &quot;Add Param&quot; to add one.
                  </p>
                )}
              </EditableSection>

              {/* Outputs */}
              <EditableSection 
                title="Outputs" 
                badge={<Badge variant="output" isDark={isDark} size="xs">{stepToggle.outputs.length}</Badge>}
                isDark={isDark}
                editMode={editMode}
                activationMode="toggle"
                onAdd={() => addOutput(setStepToggle)}
                addLabel="Add Output"
              >
                {stepToggle.outputs.map((output, idx) => (
                  <EditableListItem
                    key={`${output.key}-${idx}`}
                    type="output"
                    item={output}
                    onChange={(updated) => updateOutput(setStepToggle, idx, updated)}
                    onDelete={() => deleteOutput(setStepToggle, idx)}
                    isDark={isDark}
                    expressionSuggestions={EXPRESSION_SUGGESTIONS}
                    borderColor="border-amber-400"
                    isNew={output.key === newItemId}
                  />
                ))}
                {stepToggle.outputs.length === 0 && (
                  <p className={`text-xs italic ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                    No outputs yet. Click &quot;Add Output&quot; to add one.
                  </p>
                )}
              </EditableSection>

              {/* Actions - Using ActionFormEditor */}
              <div className={`rounded-lg border ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-gray-200 bg-white'} p-3`}>
                <h4 className={`text-sm font-medium mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Actions (via ActionFormEditor)
                </h4>
                <ActionFormEditor
                  actions={actionsToggle}
                  onChange={setActionsToggle}
                  variant="success"
                  isDark={isDark}
                  readOnly={editMode === 'read'}
                  availableSteps={['process-order', 'validate-payment', 'send-confirmation']}
                />
              </div>
            </div>
          </div>

          {/* === MODE 2: Hover (Inline Edit) === */}
          <div className={`rounded-xl border-2 ${isDark ? 'border-emerald-500/30 bg-slate-800' : 'border-emerald-200 bg-white'} p-4`}>
            <div className="mb-4">
              <h2 className={`text-lg font-semibold ${textClass}`}>Mode: Hover</h2>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                Edit icon appears on hover, click to edit inline
              </p>
            </div>

            {/* Hint */}
            <div className={`mb-4 p-2 rounded text-xs ${isDark ? 'bg-slate-700 text-slate-400' : 'bg-gray-100 text-gray-600'}`}>
              🖱️ Hover over any field to see the edit button, or use section Edit on mobile
            </div>

            <div className="space-y-4">
              {/* General Info */}
              <EditableSection 
                title="General" 
                isDark={isDark}
                activationMode="hover"
              >
                <EditableField
                  label="stepId"
                  value={stepHover.stepId}
                  onChange={(v) => updateStep(setStepHover, 'stepId', v)}
                  activationMode="hover"
                  isDark={isDark}
                  required
                  validate={(v) => v.length < 2 ? 'Min 2 characters' : null}
                />
                <EditableField
                  label="operationId"
                  value={stepHover.operationId}
                  onChange={(v) => updateStep(setStepHover, 'operationId', v)}
                  activationMode="hover"
                  isDark={isDark}
                  badge={<Badge variant="method-get" isDark={isDark} size="xs">GET</Badge>}
                />
                <EditableField
                  label="description"
                  value={stepHover.description}
                  onChange={(v) => updateStep(setStepHover, 'description', v)}
                  type="textarea"
                  activationMode="hover"
                  isDark={isDark}
                  placeholder="Describe what this step does..."
                />
              </EditableSection>

              {/* Parameters */}
              <EditableSection 
                title="Parameters" 
                badge={<Badge variant="info" isDark={isDark} size="xs">{stepHover.parameters.length}</Badge>}
                isDark={isDark}
                activationMode="hover"
                onAdd={() => addParameter(setStepHover)}
                addLabel="Add Param"
              >
                {stepHover.parameters.map((param, idx) => (
                  <EditableListItem
                    key={`${param.name}-${idx}`}
                    type="parameter"
                    item={param}
                    onChange={(updated) => updateParameter(setStepHover, idx, updated)}
                    onDelete={() => deleteParameter(setStepHover, idx)}
                    isDark={isDark}
                    expressionSuggestions={EXPRESSION_SUGGESTIONS}
                    borderColor="border-blue-400"
                    isNew={param.name === newItemId}
                  />
                ))}
                {stepHover.parameters.length === 0 && (
                  <p className={`text-xs italic ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                    No parameters. Click &quot;Add Param&quot; to add one.
                  </p>
                )}
              </EditableSection>

              {/* Outputs */}
              <EditableSection 
                title="Outputs" 
                badge={<Badge variant="output" isDark={isDark} size="xs">{stepHover.outputs.length}</Badge>}
                isDark={isDark}
                activationMode="hover"
                onAdd={() => addOutput(setStepHover)}
                addLabel="Add Output"
              >
                {stepHover.outputs.map((output, idx) => (
                  <EditableListItem
                    key={`${output.key}-${idx}`}
                    type="output"
                    item={output}
                    onChange={(updated) => updateOutput(setStepHover, idx, updated)}
                    onDelete={() => deleteOutput(setStepHover, idx)}
                    isDark={isDark}
                    expressionSuggestions={EXPRESSION_SUGGESTIONS}
                    borderColor="border-amber-400"
                    isNew={output.key === newItemId}
                  />
                ))}
                {stepHover.outputs.length === 0 && (
                  <p className={`text-xs italic ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                    No outputs. Click &quot;Add Output&quot; to add one.
                  </p>
                )}
              </EditableSection>

              {/* Actions - Using ActionFormEditor (always visible) */}
              <div className={`rounded-lg border ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-gray-200 bg-white'} p-3`}>
                <h4 className={`text-sm font-medium mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Actions (always editable in hover mode)
                </h4>
                <ActionFormEditor
                  actions={actionsHover}
                  onChange={setActionsHover}
                  variant="failure"
                  isDark={isDark}
                  readOnly={false}
                  availableSteps={['retry-step', 'fallback-step', 'error-handler']}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Comparison Summary */}
        <div className={`mt-8 rounded-xl border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'} p-6`}>
          <h3 className={`text-lg font-semibold ${textClass} mb-4`}>Comparison Summary</h3>
          <div className="overflow-x-auto">
            <table className={`w-full text-sm ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
              <thead>
                <tr className={isDark ? 'border-slate-600' : 'border-gray-200'}>
                  <th className="text-left py-2 px-3 font-medium">Aspect</th>
                  <th className="text-left py-2 px-3 font-medium">Toggle Mode</th>
                  <th className="text-left py-2 px-3 font-medium">Hover Mode</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                <tr>
                  <td className="py-2 px-3">Activation</td>
                  <td className="py-2 px-3">External switch (Read/Edit button)</td>
                  <td className="py-2 px-3">Hover → Click edit icon</td>
                </tr>
                <tr>
                  <td className="py-2 px-3">UX Clarity</td>
                  <td className="py-2 px-3">✅ Very clear mode indication</td>
                  <td className="py-2 px-3">✅ Quick inline edits</td>
                </tr>
                <tr>
                  <td className="py-2 px-3">Speed</td>
                  <td className="py-2 px-3">⚡ Good for bulk edits</td>
                  <td className="py-2 px-3">⚡⚡ Fast single field edits</td>
                </tr>
                <tr>
                  <td className="py-2 px-3">Mobile</td>
                  <td className="py-2 px-3">✅ Works well</td>
                  <td className="py-2 px-3">📱 Section edit button fallback</td>
                </tr>
                <tr>
                  <td className="py-2 px-3">Accidental edits</td>
                  <td className="py-2 px-3">✅ Prevented (must toggle)</td>
                  <td className="py-2 px-3">⚠️ Possible (mitigated by confirm)</td>
                </tr>
                <tr>
                  <td className="py-2 px-3">Add/Delete items</td>
                  <td className="py-2 px-3">✅ Visible only in Edit mode</td>
                  <td className="py-2 px-3">✅ Always visible (Add), delete on hover</td>
                </tr>
                <tr>
                  <td className="py-2 px-3">Actions (onSuccess/onFailure)</td>
                  <td className="py-2 px-3">🔒 Uses ActionFormEditor, respects readOnly</td>
                  <td className="py-2 px-3">✏️ ActionFormEditor always editable</td>
                </tr>
                <tr>
                  <td className="py-2 px-3">Best for</td>
                  <td className="py-2 px-3">Form-like editing, complex data</td>
                  <td className="py-2 px-3">Quick fixes, power users</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Debug: Current State */}
        <div className={`mt-6 rounded-lg border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-gray-50'} p-4`}>
          <h4 className={`text-sm font-medium ${textClass} mb-2`}>Debug: Current State</h4>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'} mb-1`}>Toggle Mode:</p>
              <pre className={`text-[10px] ${isDark ? 'text-slate-300' : 'text-gray-600'} overflow-auto max-h-40`}>
                {JSON.stringify({ step: stepToggle, actions: actionsToggle }, null, 2)}
              </pre>
            </div>
            <div>
              <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'} mb-1`}>Hover Mode:</p>
              <pre className={`text-[10px] ${isDark ? 'text-slate-300' : 'text-gray-600'} overflow-auto max-h-40`}>
                {JSON.stringify({ step: stepHover, actions: actionsHover }, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
