import { builderReducer } from '../context/BuilderContext';
import { BuilderState } from '../types/builder';
import { switchTargetUpdates } from '@/lib/step-target';

describe('builderReducer', () => {
  const initialState: BuilderState = {
    spec: {
      arazzo: '1.0.1',
      info: { title: 'Test', version: '1.0.0' },
      sourceDescriptions: [],
      workflows: [{ workflowId: 'wf-1', steps: [] }]
    },
    selectedStepId: null,
    selectedComponentKey: null,
    selectedNodeType: null,
    selectedWorkflowIndex: 0,
    sources: {},
    needsAutoLayout: false
  };

  it('should add a step to the spec', () => {
    const action = {
      type: 'ADD_STEP' as const,
      payload: {
        step: { stepId: 'step-1', operationId: 'op-1' },
        position: { x: 0, y: 0 }
      }
    };

    const newState = builderReducer(initialState, action);
    
    expect(newState.spec.workflows[0].steps).toHaveLength(1);
    expect(newState.spec.workflows[0].steps[0].stepId).toBe('step-1');
  });

  it('should update a step in the spec', () => {
    const stateWithStep = {
      ...initialState,
      spec: {
        ...initialState.spec,
        workflows: [{ 
          workflowId: 'wf-1', 
          steps: [{ stepId: 'step-1', operationId: 'op-1' }] 
        }]
      }
    };

    const action = {
      type: 'UPDATE_STEP' as const,
      payload: {
        stepId: 'step-1',
        updates: { description: 'Updated' }
      }
    };

    const newState = builderReducer(stateWithStep, action);
    expect(newState.spec.workflows[0].steps[0].description).toBe('Updated');
  });

  describe('step renaming with reference updates', () => {
    it('should update onSuccess references when a step is renamed', () => {
      const stateWithSteps: BuilderState = {
        ...initialState,
        spec: {
          ...initialState.spec,
          workflows: [{
            workflowId: 'wf-1',
            steps: [
              { stepId: 'step-1', operationId: 'op-1', onSuccess: [{ type: 'goto', stepId: 'step-2', name: 'goto-step-2' }] },
              { stepId: 'step-2', operationId: 'op-2' }
            ]
          }]
        }
      };

      const action = {
        type: 'UPDATE_STEP' as const,
        payload: {
          stepId: 'step-2',
          updates: { stepId: 'renamed-step' }
        }
      };

      const newState = builderReducer(stateWithSteps, action);
      
      // Step should be renamed
      expect(newState.spec.workflows[0].steps[1].stepId).toBe('renamed-step');
      
      // onSuccess reference in step-1 should be updated
      const step1 = newState.spec.workflows[0].steps[0];
      const gotoAction = step1.onSuccess?.[0] as { type: string; stepId: string; name: string };
      expect(gotoAction.stepId).toBe('renamed-step');
      expect(gotoAction.name).toBe('goto-renamed-step');
    });

    it('should update onFailure references when a step is renamed', () => {
      const stateWithSteps: BuilderState = {
        ...initialState,
        spec: {
          ...initialState.spec,
          workflows: [{
            workflowId: 'wf-1',
            steps: [
              { stepId: 'step-1', operationId: 'op-1', onFailure: [{ type: 'goto', stepId: 'step-2', name: 'error-goto' }] },
              { stepId: 'step-2', operationId: 'op-2' }
            ]
          }]
        }
      };

      const action = {
        type: 'UPDATE_STEP' as const,
        payload: {
          stepId: 'step-2',
          updates: { stepId: 'error-handler' }
        }
      };

      const newState = builderReducer(stateWithSteps, action);
      
      // onFailure reference in step-1 should be updated
      const step1 = newState.spec.workflows[0].steps[0];
      const gotoAction = step1.onFailure?.[0] as { type: string; stepId: string; name: string };
      expect(gotoAction.stepId).toBe('error-handler');
    });

    it('should update parameter references when a step is renamed', () => {
      const stateWithSteps: BuilderState = {
        ...initialState,
        spec: {
          ...initialState.spec,
          workflows: [{
            workflowId: 'wf-1',
            steps: [
              { stepId: 'step-1', operationId: 'op-1', outputs: { petId: '$response.body#/id' } },
              { 
                stepId: 'step-2', 
                operationId: 'op-2', 
                parameters: [{ name: 'petId', in: 'path', value: '$steps.step-1.outputs.petId' }]
              }
            ]
          }]
        }
      };

      const action = {
        type: 'UPDATE_STEP' as const,
        payload: {
          stepId: 'step-1',
          updates: { stepId: 'create-pet' }
        }
      };

      const newState = builderReducer(stateWithSteps, action);
      
      // Step should be renamed
      expect(newState.spec.workflows[0].steps[0].stepId).toBe('create-pet');
      
      // Parameter reference in step-2 should be updated
      const step2 = newState.spec.workflows[0].steps[1];
      const param = step2.parameters?.[0] as { name: string; value: string };
      expect(param.value).toBe('$steps.create-pet.outputs.petId');
    });

    it('should update selectedStepId when the selected step is renamed', () => {
      const stateWithSteps: BuilderState = {
        ...initialState,
        selectedStepId: 'step-1',
        spec: {
          ...initialState.spec,
          workflows: [{
            workflowId: 'wf-1',
            steps: [{ stepId: 'step-1', operationId: 'op-1' }]
          }]
        }
      };

      const action = {
        type: 'UPDATE_STEP' as const,
        payload: {
          stepId: 'step-1',
          updates: { stepId: 'new-name' }
        }
      };

      const newState = builderReducer(stateWithSteps, action);
      
      expect(newState.selectedStepId).toBe('new-name');
      expect(newState.spec.workflows[0].steps[0].stepId).toBe('new-name');
    });
  });

  describe('Arazzo 1.1 fields', () => {
    const stateWith11 = (): BuilderState => ({
      ...initialState,
      spec: {
        ...initialState.spec,
        arazzo: '1.1.0',
        workflows: [{
          workflowId: 'wf-1',
          steps: [
            { stepId: 'pay', operationId: 'pay' },
            { stepId: 'invoice', operationId: 'invoice', dependsOn: ['pay'] },
            { stepId: 'close', operationId: 'close', dependsOn: ['pay', 'invoice'] },
          ]
        }]
      }
    });

    it('renames dependsOn references when a step is renamed', () => {
      const s = builderReducer(stateWith11(), { type: 'UPDATE_STEP', payload: { stepId: 'pay', updates: { stepId: 'payment' } } });
      const steps = s.spec.workflows[0].steps;
      expect(steps[1].dependsOn).toEqual(['payment']);
      expect(steps[2].dependsOn).toEqual(['payment', 'invoice']);
    });

    it('removes dependsOn references when a step is deleted', () => {
      const s = builderReducer(stateWith11(), { type: 'DELETE_STEP', payload: { stepId: 'pay' } });
      const steps = s.spec.workflows[0].steps;
      expect(steps[0].dependsOn).toBeUndefined();
      expect(steps[1].dependsOn).toEqual(['invoice']);
    });

    it('drops fields set to undefined (switch to an AsyncAPI target)', () => {
      const s = builderReducer(stateWith11(), {
        type: 'UPDATE_STEP',
        payload: { stepId: 'pay', updates: switchTargetUpdates({ stepId: 'pay', operationId: 'pay' }, 'channelPath') }
      });
      const step = s.spec.workflows[0].steps[0];
      expect('operationId' in step).toBe(false);
      expect(step.channelPath).toBe('');
      expect(step.action).toBe('receive');
    });

    it('stores AsyncAPI fields, timeout and Selector outputs', () => {
      const s = builderReducer(stateWith11(), {
        type: 'UPDATE_STEP',
        payload: {
          stepId: 'invoice',
          updates: {
            timeout: 6000,
            outputs: { id: { context: '$response.body', selector: '$.id', type: 'jsonpath' } }
          }
        }
      });
      const step = s.spec.workflows[0].steps[1];
      expect(step.timeout).toBe(6000);
      expect(step.outputs?.id).toEqual({ context: '$response.body', selector: '$.id', type: 'jsonpath' });
    });

    it('switching back to an HTTP target clears action and correlationId', () => {
      const updates = switchTargetUpdates(
        { stepId: 'wait', channelPath: '{$sourceDescriptions.ev.url}#/channels/c', action: 'receive', correlationId: '$inputs.id' },
        'operationId'
      );
      expect(updates).toMatchObject({ operationId: '', channelPath: undefined, action: undefined, correlationId: undefined });
    });

    it('adds an AsyncAPI source', () => {
      const s = builderReducer(initialState, { type: 'ADD_SOURCE', payload: { name: 'events', content: { asyncapi: '3.0.0' }, type: 'asyncapi' } });
      expect(s.spec.sourceDescriptions[0]).toMatchObject({ name: 'events', type: 'asyncapi' });
      expect(s.sources.events).toEqual({ asyncapi: '3.0.0' });
    });
  });
});
