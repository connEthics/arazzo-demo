/**
 * Step target helpers (Arazzo 1.1): exactly one of operationId / operationPath / workflowId /
 * channelPath. Pure functions shared by the inspector and the reducer tests.
 */
import type { Step } from '@/types/arazzo';

export type StepTargetKind = 'operationId' | 'operationPath' | 'workflowId' | 'channelPath';

export function stepTargetKind(step: Pick<Step, StepTargetKind>): StepTargetKind | null {
  if (step.channelPath !== undefined) return 'channelPath';
  if (step.workflowId !== undefined) return 'workflowId';
  if (step.operationPath !== undefined) return 'operationPath';
  if (step.operationId !== undefined) return 'operationId';
  return null;
}

/** Updates that switch a step to another target kind (keeping the value when possible). */
export function switchTargetUpdates(step: Step, kind: StepTargetKind): Partial<Step> {
  const current = stepTargetKind(step);
  const value = current ? (step[current] as string | undefined) ?? '' : '';
  const updates: Partial<Step> = { operationId: undefined, operationPath: undefined, workflowId: undefined, channelPath: undefined };
  updates[kind] = kind === current ? value : '';
  if (kind === 'channelPath') {
    updates.action = step.action ?? 'receive';
  } else {
    updates.action = undefined;
    updates.correlationId = undefined;
  }
  return updates;
}

