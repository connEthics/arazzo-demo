'use client';

import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import type { Step, SourceDescription, Parameter, Criterion, FailureAction, SuccessAction, RequestBodyPayload } from '@/types/arazzo';
import { isReusableObject } from '@/types/arazzo';
import { extractHttpMethod, getMethodBadgeVariant } from '@/lib/arazzo-utils';

// Import internal components
import { ReusableRef, CriterionBadge, ActionList, PayloadReplacements, SchemaViewer } from './index';
import { Card, Badge, CodeBlock, PropertyList, MarkdownText, EditableField, EditableListItem } from '../primitives';
import type { ParameterItem, ParameterIn } from '../primitives/EditableListItem';
import type { ExpressionSuggestion } from '../ExpressionInput';
import ActionFormEditor, { Action } from '../ActionFormEditor';

export type StepBodyVariant = 'full' | 'compact';

interface StepBodyProps {
    step: Step;
    variant?: StepBodyVariant;
    sourceForStep?: SourceDescription;
    isDark?: boolean;
    editable?: boolean;
    onStepUpdate?: (updates: Partial<Step>) => void;
    onStepClick?: (stepId: string) => void;
    onRefClick?: (reference: string) => void;
    expressionSuggestions?: ExpressionSuggestion[];
    availableSteps?: string[];
    forceExpanded?: boolean;
}

/**
 * Unified StepBody component.
 * variant='full': Complete details for Inspector and Documentation cards.
 * variant='compact': Summary version for React Flow nodes.
 */
export default function StepBody({
    step,
    variant = 'full',
    sourceForStep,
    isDark = false,
    editable = false,
    onStepUpdate,
    onStepClick,
    onRefClick,
    expressionSuggestions = [],
    availableSteps = [],
    forceExpanded = false
}: StepBodyProps) {
    const [newlyAddedKey, setNewlyAddedKey] = useState<string | null>(null);
    const [isEditingPayload, setIsEditingPayload] = useState(false);
    const [tempPayload, setTempPayload] = useState<string>('');
    const editContainerRef = useRef<HTMLDivElement>(null);

    // --- Helpers for Updates ---
    const handleUpdate = useCallback((updates: Partial<Step>) => onStepUpdate?.(updates), [onStepUpdate]);

    // Handle click outside to save/close request body editor
    useEffect(() => {
        if (!isEditingPayload) return;

        const handleClickOutside = (event: MouseEvent) => {
            if (editContainerRef.current && !editContainerRef.current.contains(event.target as Node)) {
                // Save and close
                let payload: RequestBodyPayload;
                try {
                    payload = JSON.parse(tempPayload) as RequestBodyPayload;
                } catch {
                    payload = tempPayload;
                }
                handleUpdate({
                    requestBody: { ...step.requestBody!, payload }
                });
                setIsEditingPayload(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isEditingPayload, tempPayload, step.requestBody, handleUpdate]);

    const canEdit = editable && !!onStepUpdate;
    const mutedClass = isDark ? 'text-slate-400' : 'text-gray-500';
    const textClass = isDark ? 'text-white' : 'text-gray-900';
    const codeBgClass = isDark ? 'bg-slate-800' : 'bg-gray-50';

    // --- Data Preparation ---
    const parameterItems = useMemo(() => step.parameters
        ?.filter((p): p is Parameter => !isReusableObject(p))
        .map(p => ({
            name: p.name,
            value: typeof p.value === 'string' ? p.value : JSON.stringify(p.value),
            type: p.in || undefined,
        })) || [], [step.parameters]);

    const outputItems = useMemo(() => step.outputs
        ? Object.entries(step.outputs).map(([key, value]) => ({
            name: key,
            value: typeof value === 'string' ? value : JSON.stringify(value),
        }))
        : [], [step.outputs]);


    // --- COMPACT VARIANT (Nodes) ---
    if (variant === 'compact') {
        return (
            <div className="p-3 space-y-2 overflow-hidden">
                {step.description && (
                    <p className={`${mutedClass} text-xs line-clamp-2`}>{step.description}</p>
                )}

                {step.operationId && (
                    <div className={`text-[10px] ${mutedClass} font-mono ${codeBgClass} px-2 py-1 rounded border border-slate-200 dark:border-slate-800 truncate`}>
                        {step.operationId}
                    </div>
                )}

                {/* Short info for outputs */}
                {outputItems.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                        {outputItems.slice(0, 3).map((item) => (
                            <Badge key={item.name} variant="output" size="xs" isDark={isDark}>
                                {item.name}
                            </Badge>
                        ))}
                        {outputItems.length > 3 && (
                            <span className="text-[9px] text-slate-400">+{outputItems.length - 3}</span>
                        )}
                    </div>
                )}

                {/* Connection indicators */}
                <div className="flex gap-1.5 pt-1">
                    {step.onSuccess && (
                        <Badge variant="success" size="xs" isDark={isDark} className="text-[9px]">✓ onSuccess</Badge>
                    )}
                    {step.onFailure && (
                        <Badge variant="error" size="xs" isDark={isDark} className="text-[9px]">✗ onFailure</Badge>
                    )}
                </div>
            </div>
        );
    }

    // --- FULL VARIANT (Inspector/Cards) ---
    return (
        <div className="space-y-4">
            {/* Parameters */}
            {(step.parameters && step.parameters.length > 0) || canEdit ? (
                <Card
                    title="Parameters"
                    isDark={isDark}
                    className={canEdit ? 'focus-within:z-20' : ''}
                    badge={<Badge variant="info" isDark={isDark} size="xs">{step.parameters?.length || 0}</Badge>}
                    actions={canEdit && (
                        <button
                            onClick={() => {
                                const newParams = [...(step.parameters || []), { name: '', in: 'query' as Parameter['in'], value: '' }];
                                handleUpdate({ parameters: newParams });
                                setNewlyAddedKey(`param-${newParams.length - 1}`);
                            }}
                            className="text-xs text-indigo-500 hover:text-indigo-400 flex items-center gap-1"
                        >
                            + Add
                        </button>
                    )}
                >
                    <div className="space-y-2">
                        {canEdit ? (
                            <div className="space-y-2">
                                {step.parameters?.map((param, idx) => {
                                    if (isReusableObject(param)) return null;
                                    const p = param as Parameter;
                                    const itemKey = `param-${idx}`;
                                    return (
                                        <EditableListItem
                                            key={itemKey}
                                            type="parameter"
                                            item={{
                                                name: p.name || '',
                                                in: (p.in as ParameterIn) || 'query',
                                                value: typeof p.value === 'string' ? p.value : JSON.stringify(p.value),
                                            }}
                                            isNew={newlyAddedKey === itemKey}
                                            onChange={(updated) => {
                                                const newParams = [...(step.parameters || [])];
                                                newParams[idx] = { name: updated.name, in: updated.in as Parameter['in'], value: updated.value } as Parameter;
                                                handleUpdate({ parameters: newParams });
                                            }}
                                            onDelete={() => {
                                                const newParams = step.parameters?.filter((_, i) => i !== idx);
                                                handleUpdate({ parameters: newParams });
                                            }}
                                            isDark={isDark}
                                            expressionSuggestions={expressionSuggestions}
                                        />
                                    );
                                })}
                            </div>
                        ) : (
                            parameterItems.length > 0 && (
                                <PropertyList
                                    items={parameterItems}
                                    isDark={isDark}
                                    variant="compact"
                                    maxItems={6}
                                    forceExpanded={forceExpanded}
                                />
                            )
                        )}
                    </div>
                </Card>
            ) : null}

            {/* Request Body */}
            {(step.requestBody || canEdit) && (variant === 'full') && (
                <Card
                    title="Request Body"
                    isDark={isDark}
                    className={canEdit ? 'focus-within:z-20' : ''}
                    badge={step.requestBody?.contentType && <Badge variant="info" isDark={isDark} size="xs">{step.requestBody.contentType}</Badge>}
                    actions={canEdit && (
                        <div className="flex items-center gap-2">
                            {step.requestBody && (
                                <>
                                    {isEditingPayload ? (
                                        <button
                                            key="save-body"
                                            onMouseDown={(e) => e.stopPropagation()}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                // Save
                                                let payload: RequestBodyPayload;
                                                try {
                                                    payload = JSON.parse(tempPayload) as RequestBodyPayload;
                                                } catch {
                                                    payload = tempPayload;
                                                }
                                                handleUpdate({
                                                    requestBody: { ...step.requestBody!, payload }
                                                });
                                                setIsEditingPayload(false);
                                            }}
                                            className="text-xs flex items-center gap-1 text-emerald-500 hover:text-emerald-400"
                                        >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            Save
                                        </button>
                                    ) : (
                                        <button
                                            key="edit-body"
                                            onMouseDown={(e) => e.stopPropagation()}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                // Start editing
                                                setTempPayload(typeof step.requestBody!.payload === 'string'
                                                    ? step.requestBody!.payload
                                                    : JSON.stringify(step.requestBody!.payload, null, 2));
                                                setIsEditingPayload(true);
                                            }}
                                            className="text-xs flex items-center gap-1 text-indigo-500 hover:text-indigo-400"
                                        >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                            Edit
                                        </button>
                                    )}
                                </>
                            )}
                            {!step.requestBody && (
                                <button
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onClick={() => handleUpdate({ requestBody: { contentType: 'application/json', payload: {} } })}
                                    className="text-xs text-indigo-500 hover:text-indigo-400"
                                >
                                    + Add Body
                                </button>
                            )}
                        </div>
                    )}
                >
                    {step.requestBody ? (
                        <div className="space-y-3">
                            {isEditingPayload && canEdit ? (
                                <div className="space-y-3" ref={editContainerRef}>
                                    <div className="flex gap-2 items-center">
                                        <div className={`flex-1 flex items-center gap-2 px-2 py-1 rounded border text-[10px] uppercase font-bold ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-400' : 'bg-gray-50 border-gray-100 text-gray-500'}`}>
                                            ContentType:
                                            <select
                                                value={step.requestBody.contentType || 'application/json'}
                                                onChange={(e) => handleUpdate({
                                                    requestBody: { ...step.requestBody!, contentType: e.target.value }
                                                })}
                                                className={`flex-1 bg-transparent border-none outline-none text-xs font-semibold ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}
                                            >
                                                <option value="application/json">application/json</option>
                                                <option value="application/xml">application/xml</option>
                                                <option value="application/x-www-form-urlencoded">form-urlencoded</option>
                                                <option value="multipart/form-data">multipart/form-data</option>
                                            </select>
                                        </div>
                                        <button
                                            onMouseDown={(e) => e.stopPropagation()}
                                            onClick={() => {
                                                if (window.confirm('Remove this request body?')) {
                                                    handleUpdate({ requestBody: undefined });
                                                    setIsEditingPayload(false);
                                                }
                                            }}
                                            className="text-red-400 hover:text-red-500 transition-colors p-1"
                                            title="Remove Request Body"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                    <div className="relative">
                                        <textarea
                                            autoFocus
                                            value={tempPayload}
                                            onChange={(e) => setTempPayload(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Escape') {
                                                    setIsEditingPayload(false);
                                                } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                                                    let payload: RequestBodyPayload;
                                                    try {
                                                        payload = JSON.parse(tempPayload) as RequestBodyPayload;
                                                    } catch {
                                                        payload = tempPayload;
                                                    }
                                                    handleUpdate({
                                                        requestBody: { ...step.requestBody!, payload }
                                                    });
                                                    setIsEditingPayload(false);
                                                }
                                            }}
                                            className={`w-full px-3 py-2 rounded-md border text-xs font-mono h-32 resize-none transition-all
                                                ${isDark ? 'bg-slate-800 border-slate-700 text-cyan-400 focus:border-indigo-500' : 'bg-gray-50 border-gray-200 text-indigo-600 focus:border-indigo-400'}
                                                focus:ring-2 focus:ring-indigo-500/20 outline-none shadow-inner`}
                                            placeholder='{"key": "$inputs.value"}'
                                        />
                                        <div className="absolute right-2 bottom-2 pointer-events-none opacity-40 text-[9px] font-medium">
                                            Press Esc to cancel or click away to save
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div
                                    className={`${canEdit ? 'cursor-edit group relative' : ''}`}
                                    onClick={() => {
                                        if (canEdit) {
                                            setTempPayload(typeof step.requestBody!.payload === 'string'
                                                ? step.requestBody!.payload
                                                : JSON.stringify(step.requestBody!.payload, null, 2));
                                            setIsEditingPayload(true);
                                        }
                                    }}
                                >
                                    <CodeBlock
                                        code={typeof step.requestBody?.payload === 'string' ? step.requestBody.payload : JSON.stringify(step.requestBody?.payload, null, 2) || ''}
                                        language="json"
                                        isDark={isDark}
                                        maxHeight={150}
                                        forceExpanded={forceExpanded}
                                    />
                                    {canEdit && (
                                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                            <Badge variant="info" size="xs" isDark={isDark}>Click to edit</Badge>
                                        </div>
                                    )}
                                </div>
                            )}

                            {step.requestBody?.replacements && step.requestBody.replacements.length > 0 && (
                                <PayloadReplacements replacements={step.requestBody.replacements} isDark={isDark} />
                            )}
                        </div>
                    ) : (
                        <p className={`text-xs italic ${mutedClass}`}>No request body defined.</p>
                    )}
                </Card>
            )}

            {/* Success Criteria */}
            {(step.successCriteria || canEdit) && (
                <Card
                    title="Success Criteria"
                    isDark={isDark}
                    className={canEdit ? 'focus-within:z-20' : ''}
                    icon={<span className="text-emerald-500">✓</span>}
                    actions={canEdit && (
                        <button
                            onClick={() => handleUpdate({ successCriteria: [...(step.successCriteria || []), { condition: '' }] })}
                            className="text-xs text-indigo-500 hover:text-indigo-400"
                        >
                            + Add
                        </button>
                    )}
                >
                    <div className="space-y-3">
                        {canEdit ? (
                            <div className="space-y-3">
                                {step.successCriteria?.map((criteria, idx) => {
                                    const condition = typeof criteria === 'string' ? criteria : criteria.condition;
                                    return (
                                        <div key={idx} className={`group flex gap-2 items-start p-2 rounded-lg border border-dashed transition-colors ${isDark ? 'border-slate-700 bg-slate-800/30 hover:border-emerald-500/50' : 'border-slate-200 bg-gray-50/50 hover:border-emerald-500/50'}`}>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-[10px] uppercase font-bold text-emerald-500 mb-1 opacity-70">Condition {idx + 1}</div>
                                                <EditableField
                                                    value={condition}
                                                    onChange={(value) => {
                                                        const newCriteria = [...(step.successCriteria || [])];
                                                        const current = typeof criteria === 'string' ? { condition: criteria } : criteria;
                                                        newCriteria[idx] = { ...current, condition: value };
                                                        handleUpdate({ successCriteria: newCriteria });
                                                    }}
                                                    placeholder="$statusCode == 200"
                                                    type="expression"
                                                    isDark={isDark}
                                                    expressionSuggestions={expressionSuggestions}
                                                    borderColor="border-emerald-400"
                                                    compact
                                                    activationMode="click"
                                                />
                                            </div>
                                            <button
                                                onMouseDown={(e) => e.stopPropagation()}
                                                onClick={() => {
                                                    const newCriteria = step.successCriteria?.filter((_, i) => i !== idx);
                                                    handleUpdate({ successCriteria: newCriteria });
                                                }}
                                                className="text-red-400 hover:text-red-500 transition-colors p-1 mt-4"
                                                title="Remove Criteria"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    );
                                })}
                                {(!step.successCriteria || step.successCriteria.length === 0) && (
                                    <p className={`text-xs italic ${mutedClass}`}>Default behavior: any 2XX response is success.</p>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {step.successCriteria?.map((criteria, idx) => {
                                    const criterion = typeof criteria === 'string' ? { condition: criteria } : criteria;
                                    return <CriterionBadge key={idx} criterion={criterion as Criterion} isDark={isDark} showDetails />;
                                })}
                                {(!step.successCriteria || step.successCriteria.length === 0) && (
                                    <p className={`text-xs italic ${mutedClass}`}>Default behavior: any 2XX response is success.</p>
                                )}
                            </div>
                        )}
                    </div>
                </Card>
            )}

            {/* Success Actions */}
            {(step.onSuccess || canEdit) && (
                <Card
                    isDark={isDark}
                    className={canEdit ? 'focus-within:z-20' : ''}
                >
                    <div className="space-y-2">
                        {canEdit ? (
                            <ActionFormEditor
                                variant="success"
                                actions={(step.onSuccess || []) as Action[]}
                                onChange={(newActions) => handleUpdate({ onSuccess: newActions as SuccessAction[] })}
                                isDark={isDark}
                                availableSteps={availableSteps}
                                onStepClick={onStepClick}
                            />
                        ) : (
                            <>
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-5 h-5 rounded flex items-center justify-center bg-emerald-500/10 text-emerald-500">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <span className={`text-xs font-semibold uppercase ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                                        On Success
                                    </span>
                                    {(step.onSuccess?.length || 0) > 0 && (
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${isDark ? 'bg-slate-700 text-slate-400' : 'bg-gray-100 text-gray-500'}`}>
                                            {step.onSuccess?.length}
                                        </span>
                                    )}
                                </div>
                                <ActionList actions={step.onSuccess || []} type="success" isDark={isDark} onStepClick={onStepClick} onRefClick={onRefClick} />
                            </>
                        )}
                    </div>
                </Card>
            )}

            {/* Failure Actions */}
            {(step.onFailure || canEdit) && (
                <Card
                    isDark={isDark}
                    className={canEdit ? 'focus-within:z-20' : ''}
                >
                    <div className="space-y-2">
                        {canEdit ? (
                            <ActionFormEditor
                                variant="failure"
                                actions={(step.onFailure || []) as Action[]}
                                onChange={(newActions) => handleUpdate({ onFailure: newActions as FailureAction[] })}
                                isDark={isDark}
                                availableSteps={availableSteps}
                                onStepClick={onStepClick}
                            />
                        ) : (
                            <>
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-5 h-5 rounded flex items-center justify-center bg-red-500/10 text-red-500">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </div>
                                    <span className={`text-xs font-semibold uppercase ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                                        On Failure
                                    </span>
                                    {(step.onFailure?.length || 0) > 0 && (
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${isDark ? 'bg-slate-700 text-slate-400' : 'bg-gray-100 text-gray-500'}`}>
                                            {step.onFailure?.length}
                                        </span>
                                    )}
                                </div>
                                <ActionList actions={step.onFailure || []} type="failure" isDark={isDark} onStepClick={onStepClick} onRefClick={onRefClick} />
                            </>
                        )}
                    </div>
                </Card>
            )}

            {/* Outputs Extraction */}
            {(outputItems.length > 0 || canEdit) && (
                <Card
                    title="Extracted Outputs"
                    isDark={isDark}
                    className={canEdit ? 'focus-within:z-20' : ''}
                    actions={canEdit && (
                        <button
                            onClick={() => {
                                const newOutputs = { ...(step.outputs || {}), '': '' };
                                handleUpdate({ outputs: newOutputs });
                                setNewlyAddedKey(`output-${Object.keys(newOutputs).length - 1}`);
                            }}
                            className="text-xs text-amber-500 hover:text-amber-400"
                        >
                            + Add
                        </button>
                    )}
                >
                    {canEdit ? (
                        <div className="space-y-2">
                            {Object.entries(step.outputs || {}).map(([key, value], idx) => {
                                const itemKey = `output-${idx}`;
                                return (
                                    <EditableListItem
                                        key={itemKey}
                                        type="output"
                                        item={{ key, value: typeof value === 'string' ? value : JSON.stringify(value) }}
                                        isNew={newlyAddedKey === itemKey}
                                        onChange={(updated) => {
                                            const newOutputs = { ...step.outputs };
                                            // If key changed, we need to handle it carefully
                                            if (updated.key !== key) {
                                                delete newOutputs[key];
                                            }
                                            newOutputs[updated.key] = updated.value;
                                            handleUpdate({ outputs: newOutputs });
                                        }}
                                        onDelete={() => {
                                            const newOutputs = { ...step.outputs };
                                            delete newOutputs[key];
                                            handleUpdate({ outputs: newOutputs });
                                        }}
                                        isDark={isDark}
                                        expressionSuggestions={expressionSuggestions}
                                    />
                                );
                            })}
                        </div>
                    ) : (
                        <PropertyList items={outputItems} isDark={isDark} variant="compact" />
                    )}
                </Card>
            )}
        </div>
    );
}
