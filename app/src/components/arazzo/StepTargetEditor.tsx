'use client';

import { useMemo } from 'react';
import type { Step, AsyncAction } from '@/types/arazzo';
import { Badge, Card } from '../primitives';
import { stepTargetKind, switchTargetUpdates, type StepTargetKind } from '@/lib/step-target';

export { stepTargetKind, switchTargetUpdates, type StepTargetKind };

/**
 * StepTargetEditor — Arazzo 1.1 step fields:
 * - the step target, exactly one of operationId / operationPath / workflowId / channelPath;
 * - AsyncAPI steps (channelPath): `action` (send | receive), `correlationId` (receive only);
 * - `timeout` (positive integer, milliseconds);
 * - `dependsOn` (multi-selection of the other steps of the workflow, 1.1 join point).
 *
 * Changing the target kind clears the other targets (and the AsyncAPI-only fields), so that the
 * edited step always satisfies `arazzo-step-target-exclusive`.
 */

const TARGETS: { value: StepTargetKind; label: string; placeholder: string }[] = [
  { value: 'operationId', label: 'OpenAPI operationId', placeholder: '$sourceDescriptions.shop.createOrder' },
  { value: 'operationPath', label: 'OpenAPI operationPath', placeholder: '{$sourceDescriptions.shop.url}#/paths/~1orders/post' },
  { value: 'workflowId', label: 'Workflow', placeholder: 'renewSession' },
  { value: 'channelPath', label: 'AsyncAPI channel (1.1)', placeholder: '{$sourceDescriptions.events.url}#/channels/orderConfirmed' },
];

interface StepTargetEditorProps {
  step: Step;
  isDark?: boolean;
  editable?: boolean;
  onUpdate?: (updates: Partial<Step>) => void;
  /** stepIds of the current workflow (dependsOn candidates) */
  availableSteps?: string[];
  onStepClick?: (stepId: string) => void;
}

export default function StepTargetEditor({ step, isDark = false, editable = false, onUpdate, availableSteps = [], onStepClick }: StepTargetEditorProps) {
  const kind = stepTargetKind(step);
  const canEdit = editable && !!onUpdate;
  // AsyncAPI step: a channelPath, or an AsyncAPI operationId / operationPath declaring an action
  const isAsync = kind === 'channelPath' || step.action !== undefined;
  const dependsOn = useMemo(() => step.dependsOn ?? [], [step.dependsOn]);
  const candidates = useMemo(() => availableSteps.filter((id) => id && id !== step.stepId), [availableSteps, step.stepId]);
  // Remote / cross-workflow dependencies ($workflows.x.steps.y) are kept as-is.
  const externalDeps = dependsOn.filter((d) => !candidates.includes(d));

  const inputClass = `w-full px-2 py-1 rounded border text-xs font-mono outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-50 ${
    isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-gray-200 text-gray-800'
  }`;
  const labelClass = `text-[10px] uppercase font-semibold ${isDark ? 'text-slate-500' : 'text-gray-400'}`;
  const mutedClass = isDark ? 'text-slate-400' : 'text-gray-500';

  const toggleDep = (id: string) => {
    const next = dependsOn.includes(id) ? dependsOn.filter((d) => d !== id) : [...dependsOn, id];
    onUpdate?.({ dependsOn: next.length ? next : undefined });
  };

  const kindBadge = isAsync ? (
    <Badge variant="asyncapi" isDark={isDark} size="xs">
      AsyncAPI {step.action ?? '?'}
    </Badge>
  ) : kind === 'workflowId' ? (
    <Badge variant="workflow" isDark={isDark} size="xs">Workflow</Badge>
  ) : kind ? (
    <Badge variant="openapi" isDark={isDark} size="xs">HTTP</Badge>
  ) : (
    <Badge variant="error" isDark={isDark} size="xs">No target</Badge>
  );

  if (!canEdit) {
    const hasAny = isAsync || step.timeout !== undefined || dependsOn.length > 0;
    if (!hasAny) return null;
    return (
      <Card title="Arazzo 1.1" isDark={isDark} badge={kindBadge}>
        <dl className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-1 text-xs" data-testid="step-11-fields">
          {isAsync && (
            <>
              {step.channelPath !== undefined && (
                <>
                  <dt className={mutedClass}>channelPath</dt>
                  <dd className="font-mono break-all">{step.channelPath}</dd>
                </>
              )}
              <dt className={mutedClass}>action</dt>
              <dd className="font-mono">{step.action ?? '—'}</dd>
            </>
          )}
          {step.correlationId !== undefined && (
            <>
              <dt className={mutedClass}>correlationId</dt>
              <dd className="font-mono break-all">{step.correlationId}</dd>
            </>
          )}
          {step.timeout !== undefined && (
            <>
              <dt className={mutedClass}>timeout</dt>
              <dd className="font-mono">{step.timeout} ms</dd>
            </>
          )}
          {dependsOn.length > 0 && (
            <>
              <dt className={mutedClass}>dependsOn</dt>
              <dd className="flex flex-wrap gap-1">
                {dependsOn.map((d) => (
                  <button key={d} type="button" onClick={() => onStepClick?.(d)} className="font-mono text-blue-500 hover:underline">
                    {d}
                  </button>
                ))}
              </dd>
            </>
          )}
        </dl>
      </Card>
    );
  }

  return (
    <Card title="Target & Arazzo 1.1" isDark={isDark} badge={kindBadge} className="focus-within:z-20">
      <div className="space-y-2.5" data-testid="step-11-fields">
        {/* Target (exclusive) */}
        <div className="grid grid-cols-1 gap-1.5">
          <label className="space-y-0.5">
            <span className={labelClass}>Target</span>
            <select
              aria-label="Step target kind"
              className={inputClass}
              value={kind ?? ''}
              onChange={(e) => onUpdate!(switchTargetUpdates(step, e.target.value as StepTargetKind))}
            >
              {!kind && <option value="">— choose —</option>}
              {TARGETS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          {kind && (
            <label className="space-y-0.5">
              <span className={labelClass}>{kind}</span>
              <input
                aria-label={kind}
                className={inputClass}
                value={(step[kind] as string | undefined) ?? ''}
                placeholder={TARGETS.find((t) => t.value === kind)?.placeholder}
                onChange={(e) => onUpdate!({ [kind]: e.target.value } as Partial<Step>)}
              />
            </label>
          )}
        </div>

        {/* AsyncAPI operation referenced by operationId / operationPath (1.1) */}
        {kind && kind !== 'channelPath' && kind !== 'workflowId' && (
          <label className={`flex items-center gap-2 text-xs ${mutedClass}`}>
            <input
              type="checkbox"
              aria-label="AsyncAPI operation"
              checked={step.action !== undefined}
              onChange={(e) => onUpdate!(e.target.checked ? { action: 'receive' } : { action: undefined, correlationId: undefined })}
            />
            AsyncAPI operation (send / receive)
          </label>
        )}

        {/* AsyncAPI */}
        {isAsync && (
          <div className="grid grid-cols-2 gap-1.5">
            <label className="space-y-0.5">
              <span className={labelClass}>action</span>
              <select
                aria-label="action"
                className={inputClass}
                value={step.action ?? ''}
                onChange={(e) => {
                  const action = e.target.value as AsyncAction;
                  onUpdate!(action === 'send' ? { action, correlationId: undefined } : { action });
                }}
              >
                <option value="send">send</option>
                <option value="receive">receive</option>
              </select>
            </label>
            <label className="space-y-0.5">
              <span className={labelClass}>correlationId</span>
              <input
                aria-label="correlationId"
                className={inputClass}
                disabled={step.action !== 'receive'}
                title={step.action !== 'receive' ? 'correlationId is only allowed with action: receive' : undefined}
                value={step.correlationId ?? ''}
                placeholder="$steps.createOrder.outputs.orderId"
                onChange={(e) => onUpdate!({ correlationId: e.target.value || undefined })}
              />
            </label>
          </div>
        )}

        <label className="block space-y-0.5">
          <span className={labelClass}>timeout (ms)</span>
          <input
            aria-label="timeout"
            type="number"
            min={1}
            step={1}
            className={inputClass}
            value={step.timeout ?? ''}
            placeholder={isAsync && step.action === 'receive' ? '6000 (recommended for receive)' : 'none'}
            onChange={(e) => {
              const raw = e.target.value;
              const n = Number.parseInt(raw, 10);
              onUpdate!({ timeout: raw === '' || !Number.isFinite(n) || n <= 0 ? undefined : n });
            }}
          />
        </label>

        {/* dependsOn */}
        <div className="space-y-1">
          <span className={labelClass}>dependsOn</span>
          {candidates.length === 0 && externalDeps.length === 0 ? (
            <p className={`text-xs italic ${mutedClass}`}>No other step in this workflow.</p>
          ) : (
            <div className="flex flex-wrap gap-1" role="group" aria-label="dependsOn">
              {candidates.map((id) => {
                const active = dependsOn.includes(id);
                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleDep(id)}
                    className={`px-2 py-0.5 rounded-full border text-[11px] font-mono transition-colors ${
                      active
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : isDark
                          ? 'border-slate-700 text-slate-300 hover:border-blue-500'
                          : 'border-gray-200 text-gray-600 hover:border-blue-400'
                    }`}
                  >
                    {active ? '✓ ' : ''}
                    {id}
                  </button>
                );
              })}
              {externalDeps.map((d) => (
                <button
                  key={d}
                  type="button"
                  aria-pressed
                  onClick={() => toggleDep(d)}
                  title="Remove this dependency"
                  className="px-2 py-0.5 rounded-full border border-dashed border-blue-400 text-[11px] font-mono text-blue-500"
                >
                  {d} ✕
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
