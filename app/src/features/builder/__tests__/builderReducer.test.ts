import { builderReducer } from '../context/BuilderContext';
import { BuilderState } from '../types/builder';

describe('builderReducer', () => {
  const initialState: BuilderState = {
    spec: {
      arazzo: '1.0.1',
      info: { title: 'Test', version: '1.0.0' },
      sourceDescriptions: [],
      workflows: [{ workflowId: 'wf-1', steps: [] }]
    },
    selectedStepId: null,
    sources: {}
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
});
