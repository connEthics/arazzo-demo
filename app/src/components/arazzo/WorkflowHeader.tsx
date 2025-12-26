'use client';

import { useMemo } from 'react';
import type { Workflow } from '@/types/arazzo';
import { Badge, EditableField } from '@/components/primitives';

export type WorkflowHeaderVariant = 'card' | 'inspector' | 'header';

interface WorkflowHeaderProps {
    workflow: Workflow;
    variant?: WorkflowHeaderVariant;
    index?: number;
    isDark?: boolean;
    editable?: boolean;
    onUpdate?: (updates: Partial<Workflow>) => void;
    className?: string;
    style?: React.CSSProperties;
    onClick?: () => void;
}

/**
 * Unified WorkflowHeader component used across Documentation views and Inspection views.
 */
export default function WorkflowHeader({
    workflow,
    variant = 'header',
    index,
    isDark = false,
    editable = false,
    onUpdate,
    className = '',
    style,
    onClick,
}: WorkflowHeaderProps) {
    const containerClasses = useMemo(() => {
        switch (variant) {
            case 'header':
                return `mb-6 ${className}`;
            case 'inspector':
                return `p-4 border-b border-slate-200 dark:border-slate-800 ${className}`;
            default:
                return className;
        }
    }, [variant, className]);

    const title = workflow.summary || workflow.workflowId;

    return (
        <div className={containerClasses} onClick={onClick} style={style}>
            <div className="flex items-center gap-3 mb-2 flex-wrap">
                {index !== undefined && (
                    <Badge variant="step" size="xs" isDark={isDark} className="uppercase font-semibold">
                        Workflow {index + 1}
                    </Badge>
                )}

                {editable && onUpdate ? (
                    <EditableField
                        value={workflow.summary || ''}
                        onChange={(val) => onUpdate({ summary: val })}
                        placeholder="Workflow Summary"
                        isDark={isDark}
                        className="text-2xl font-bold"
                        compact
                        activationMode="click"
                    />
                ) : (
                    <h2 className="text-2xl font-bold print:text-xl truncate">
                        {title}
                    </h2>
                )}
            </div>

            <div className="flex items-center gap-2 mb-3">
                {editable && onUpdate ? (
                    <div className="flex items-center gap-2">
                        <Badge variant="workflow" size="xs">ID</Badge>
                        <EditableField
                            value={workflow.workflowId}
                            onChange={(val) => onUpdate({ workflowId: val })}
                            isDark={isDark}
                            className="font-mono text-sm"
                            compact
                            activationMode="hover"
                        />
                    </div>
                ) : (
                    <code className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'} font-mono`}>
                        {workflow.workflowId}
                    </code>
                )}
            </div>

            {editable && onUpdate ? (
                <EditableField
                    value={workflow.description || ''}
                    onChange={(val) => onUpdate({ description: val })}
                    placeholder="Add workflow description..."
                    type="textarea"
                    isDark={isDark}
                    className={`mt-3 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}
                    compact
                    activationMode="click"
                />
            ) : (
                workflow.description && (
                    <p className={`mt-3 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                        {workflow.description}
                    </p>
                )
            )}
        </div>
    );
}
