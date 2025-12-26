'use client';

import { useMemo } from 'react';
import type { Step } from '@/types/arazzo';
import { Badge, EditableField } from '@/components/primitives';
import { extractHttpMethod, getMethodBadgeVariant, type HttpMethod } from '@/lib/arazzo-utils';

export type StepHeaderVariant = 'node' | 'card' | 'inspector';

interface StepHeaderProps {
    step: Step;
    variant?: StepHeaderVariant;
    index?: number;
    sourceName?: string;
    isDark?: boolean;
    editable?: boolean;
    onUpdate?: (updates: Partial<Step>) => void;
    className?: string;
    style?: React.CSSProperties;
    onClick?: () => void;
    children?: React.ReactNode;
}

/**
 * Unified StepHeader component used across Visualization (Nodes), 
 * Documentation (Cards), and Inspection views.
 */
export default function StepHeader({
    step,
    variant = 'card',
    index,
    sourceName,
    isDark = false,
    editable = false,
    onUpdate,
    className = '',
    style,
    onClick,
    children
}: StepHeaderProps) {
    const method = useMemo(() => extractHttpMethod(step.operationId), [step.operationId]);

    const operationName = useMemo(() => {
        if (!step.operationId) return null;
        return step.operationId.includes('.')
            ? step.operationId.split('.').pop()
            : step.operationId;
    }, [step.operationId]);

    const resolvedSourceName = useMemo(() => {
        if (sourceName) return sourceName;
        if (step.operationId?.includes('.')) {
            return step.operationId.split('.')[0];
        }
        return null;
    }, [sourceName, step.operationId]);

    // View specific styles
    const containerClasses = useMemo(() => {
        switch (variant) {
            case 'node':
                return `bg-indigo-50 dark:bg-indigo-900/20 border-b border-indigo-100 dark:border-indigo-800 px-3 py-2 flex items-center gap-2 flex-wrap ${className}`;
            case 'card':
                return `flex items-center gap-3 p-3 transition-opacity ${className}`;
            case 'inspector':
                return `p-4 border-b border-slate-200 dark:border-slate-800 ${className}`;
            default:
                return className;
        }
    }, [variant, className]);

    return (
        <div className={containerClasses} onClick={onClick} style={style}>
            {/* Index/Icon - Usually for list/card views */}
            {index !== undefined && variant === 'card' && (
                <span className={`w-7 h-7 rounded flex items-center justify-center text-xs font-bold ${getMethodBg(method)} text-white flex-shrink-0`}>
                    {index + 1}
                </span>
            )}

            {/* Main Content Info */}
            <div className="flex-1 min-w-0 flex flex-col gap-1">
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Step Badge */}
                    <Badge variant="step" size="xs" isDark={isDark} className="uppercase text-[10px]">
                        Step
                    </Badge>

                    {/* Step ID - Editable if needed */}
                    {editable && onUpdate && variant === 'inspector' ? (
                        <EditableField
                            value={step.stepId}
                            onChange={(val) => onUpdate({ stepId: val })}
                            activationMode="hover"
                            isDark={isDark}
                            className="font-semibold text-sm"
                            compact
                        />
                    ) : (
                        <h4 className={`font-semibold ${variant === 'node' ? 'text-sm' : 'text-base'} truncate`}>
                            {step.stepId}
                        </h4>
                    )}

                    {/* HTTP Method Badge */}
                    {method && (
                        <Badge
                            variant={getMethodBadgeVariant(method as HttpMethod)}
                            size="xs"
                            isDark={isDark}
                        >
                            {method}
                        </Badge>
                    )}

                    {/* Operation Path/ID or Workflow ID */}
                    {(operationName || step.workflowId) && variant !== 'node' && (
                        <div className="flex items-center">
                            {editable && onUpdate && variant === 'inspector' ? (
                                <EditableField
                                    value={step.operationId || step.workflowId || ''}
                                    onChange={(val) => {
                                        if (step.workflowId) {
                                            onUpdate({ workflowId: val });
                                        } else {
                                            onUpdate({ operationId: val });
                                        }
                                    }}
                                    isDark={isDark}
                                    className="font-mono text-xs"
                                    compact
                                    activationMode="hover"
                                    badge={step.workflowId ? <Badge variant="workflow" size="xs">Workflow</Badge> : undefined}
                                />
                            ) : (
                                <div className="flex items-center gap-1">
                                    {step.workflowId && <Badge variant="workflow" size="xs" isDark={isDark}>Workflow</Badge>}
                                    <code className={`text-xs px-2 py-0.5 rounded ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-gray-100 text-gray-600'}`}>
                                        {operationName || step.workflowId}
                                    </code>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Source Badge */}
                    {resolvedSourceName && (
                        <Badge variant="source" size="xs" isDark={isDark} className="uppercase">
                            {resolvedSourceName}
                        </Badge>
                    )}
                </div>

                {/* Description line */}
                {(variant === 'card' || (variant === 'inspector' && !editable)) && step.description && (
                    <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'} line-clamp-1 truncate`}>
                        {step.description}
                    </p>
                )}

                {/* Editable Description for Inspector */}
                {variant === 'inspector' && editable && onUpdate && (
                    <div className="mt-1">
                        <EditableField
                            value={step.description || ''}
                            onChange={(val) => onUpdate({ description: val })}
                            placeholder="Add description..."
                            type="textarea"
                            isDark={isDark}
                            className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}
                            compact
                            activationMode="hover"
                        />
                    </div>
                )}
            </div>

            {/* Trailing Icon (usually for Cards) */}
            {variant === 'card' && (
                <svg className="w-5 h-5 text-slate-400 rotate-0 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            )}
        </div>
    );
}

// Internal helper for card backgrounds if we still want methods-specific accent
function getMethodBg(method: string | null) {
    switch (method) {
        case 'GET': return 'bg-blue-500';
        case 'POST': return 'bg-emerald-500';
        case 'PUT':
        case 'PATCH': return 'bg-amber-500';
        case 'DELETE': return 'bg-red-500';
        default: return 'bg-indigo-500';
    }
}
