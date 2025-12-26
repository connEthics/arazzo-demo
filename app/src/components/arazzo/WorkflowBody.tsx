'use client';

import { useMemo } from 'react';
import type { Workflow, WorkflowInputs } from '@/types/arazzo';
import { SectionHeader, Badge } from '@/components/primitives';
import { InputContent, OutputContent } from '../DetailViews';

interface WorkflowBodyProps {
    workflow: Workflow;
    isDark?: boolean;
    editable?: boolean;
    onUpdate?: (updates: Partial<Workflow>) => void;
    onReorderInput?: (startIndex: number, endIndex: number) => void;
    onReorderOutput?: (startIndex: number, endIndex: number) => void;
    expressionSuggestions?: any[];
}

/**
 * Unified WorkflowBody component for Documentation and Inspector views.
 * Handles inputs and outputs of a workflow.
 */
export default function WorkflowBody({
    workflow,
    isDark = false,
    editable = false,
    onUpdate,
    onReorderInput,
    onReorderOutput,
    expressionSuggestions = []
}: WorkflowBodyProps) {
    const textClass = isDark ? 'text-white' : 'text-gray-900';
    const mutedClass = isDark ? 'text-slate-400' : 'text-gray-500';
    const codeBgClass = isDark ? 'bg-slate-800' : 'bg-gray-50';

    const inputCount = workflow.inputs?.properties ? Object.keys(workflow.inputs.properties).length : 0;
    const outputCount = workflow.outputs ? Object.keys(workflow.outputs).length : 0;

    return (
        <div className="space-y-6">
            {/* Inputs Section */}
            <div className="avoid-break px-4 sm:px-0">
                <SectionHeader
                    title="Workflow Inputs"
                    badge={<Badge variant="input" isDark={isDark} size="sm">{inputCount}</Badge>}
                    isDark={isDark}
                />
                <InputContent
                    input={{ name: 'Workflow Inputs', schema: {} }}
                    workflowInputs={workflow.inputs}
                    isDark={isDark}
                    textClass={textClass}
                    mutedClass={mutedClass}
                    codeBgClass={codeBgClass}
                    editable={editable}
                    onUpdate={(inputs) => onUpdate?.({ inputs })}
                    onReorder={onReorderInput}
                    expressionSuggestions={expressionSuggestions}
                />
            </div>

            {/* Outputs Section */}
            <div className="avoid-break px-4 sm:px-0">
                <SectionHeader
                    title="Workflow Outputs"
                    badge={<Badge variant="output" isDark={isDark} size="sm">{outputCount}</Badge>}
                    isDark={isDark}
                />
                <OutputContent
                    output={{ name: 'Workflow Outputs', value: '', allOutputs: workflow.outputs }}
                    workflowOutputs={workflow.outputs}
                    isDark={isDark}
                    textClass={textClass}
                    mutedClass={mutedClass}
                    codeBgClass={codeBgClass}
                    editable={editable}
                    onUpdate={(outputs) => onUpdate?.({ outputs })}
                    onReorder={onReorderOutput}
                    expressionSuggestions={expressionSuggestions}
                />
            </div>
        </div>
    );
}
