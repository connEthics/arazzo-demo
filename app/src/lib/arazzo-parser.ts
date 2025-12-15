import yaml from 'js-yaml';
import type { ArazzoSpec, SuccessAction, FailureAction } from '@/types/arazzo';
import { isReusableObject } from '@/types/arazzo';
import type { Node, Edge } from '@xyflow/react';

// ═══════════════════════════════════════════════════════════════════════════════
// YAML Parser
// ═══════════════════════════════════════════════════════════════════════════════

export function parseArazzoSpec(input: string): ArazzoSpec {
  const spec = yaml.load(input) as ArazzoSpec;
  
  if (!spec.arazzo) {
    throw new Error('Missing required field: arazzo (version)');
  }
  if (!spec.workflows || !Array.isArray(spec.workflows) || spec.workflows.length === 0) {
    throw new Error('Missing or empty required field: workflows');
  }
  if (!spec.info) {
    throw new Error('Missing required field: info');
  }
  
  return spec;
}

// ═══════════════════════════════════════════════════════════════════════════════
// React Flow Converter
// ═══════════════════════════════════════════════════════════════════════════════

export interface FlowData {
  nodes: Node[];
  edges: Edge[];
}

export interface FlowOptions {
  hideErrorFlows?: boolean;
}

export function workflowToFlow(spec: ArazzoSpec, workflowId: string, options: FlowOptions = {}): FlowData {
  const { hideErrorFlows = false } = options;
  const workflow = spec.workflows.find(w => w.workflowId === workflowId);
  if (!workflow) {
    throw new Error(`Workflow not found: ${workflowId}`);
  }
  
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  
  const verticalGap = 140;
  const horizontalGap = 320;
  
  // Calculate positions for branching
  const branchOffsets = new Map<string, number>();
  
  // Input node
  const inputProperties = workflow.inputs?.properties 
    ? Object.keys(workflow.inputs.properties)
    : [];
  
  nodes.push({
    id: 'input',
    type: 'input',
    position: { x: 400, y: 0 },
    data: {
      label: 'Workflow Inputs',
      properties: inputProperties,
      required: workflow.inputs?.required || [],
      schema: workflow.inputs?.properties || {},
    },
  });
  
  // Step nodes
  workflow.steps.forEach((step, index) => {
    const hasOnSuccess = step.onSuccess && step.onSuccess.length > 0;
    const hasOnFailure = step.onFailure && step.onFailure.length > 0;
    const hasSkip = !!step['x-skip'];
    
    // Check if this step is a branch target
    const xOffset = branchOffsets.get(step.stepId) || 0;
    
    nodes.push({
      id: step.stepId,
      type: 'step',
      position: { 
        x: 400 + xOffset, 
        y: (index + 1) * verticalGap 
      },
      data: {
        step,
        hasOnSuccess,
        hasOnFailure,
        hasSkip,
        method: extractHttpMethod(step.operationId),
      },
    });
    
    // Track branch targets for positioning
    if (step.onSuccess) {
      step.onSuccess.forEach((action, actionIndex) => {
        if (!isReusableObject(action)) {
          const a = action as SuccessAction;
          if (a.type === 'goto' && a.stepId) {
            const offset = (actionIndex + 1) * horizontalGap;
            branchOffsets.set(a.stepId, offset);
          }
        }
      });
    }
    if (step.onFailure) {
      step.onFailure.forEach((action, actionIndex) => {
        if (!isReusableObject(action)) {
          const a = action as FailureAction;
          if (a.type === 'goto' && a.stepId) {
            const offset = -(actionIndex + 1) * horizontalGap;
            branchOffsets.set(a.stepId, offset);
          }
        }
      });
    }
  });
  
  // Output node
  if (workflow.outputs) {
    const outputProperties = Object.keys(workflow.outputs);
    nodes.push({
      id: 'output',
      type: 'output',
      position: { x: 400, y: (workflow.steps.length + 1) * verticalGap },
      data: {
        label: 'Workflow Outputs',
        properties: outputProperties,
        expressions: workflow.outputs,
      },
    });
  }
  
  // Edges
  // Input to first step
  if (workflow.steps.length > 0) {
    edges.push({
      id: 'e-input-first',
      source: 'input',
      target: workflow.steps[0].stepId,
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#10b981', strokeWidth: 1.5 },
    });
  }
  
  // Sequential step connections
  for (let i = 0; i < workflow.steps.length - 1; i++) {
    const currentStep = workflow.steps[i];
    const nextStep = workflow.steps[i + 1];
    
    // Only add default edge if no onSuccess goto overrides it
    const hasGotoNext = currentStep.onSuccess?.some(a => {
      if (isReusableObject(a)) return false;
      const action = a as SuccessAction;
      return action.type === 'goto' && action.stepId === nextStep.stepId;
    });
    
    const hasEnd = currentStep.onSuccess?.some(a => {
      if (isReusableObject(a)) return false;
      return (a as SuccessAction).type === 'end';
    });
    
    if (!hasGotoNext && !hasEnd) {
      edges.push({
        id: `e-${currentStep.stepId}-${nextStep.stepId}`,
        source: currentStep.stepId,
        target: nextStep.stepId,
        type: 'smoothstep',
        style: { stroke: '#6366f1', strokeWidth: 1.5 },
      });
    }
  }
  
  // onSuccess edges
  workflow.steps.forEach(step => {
    if (step.onSuccess) {
      step.onSuccess.forEach((action, index) => {
        if (isReusableObject(action)) return;
        const a = action as SuccessAction;
        if (a.type === 'goto' && a.stepId) {
          edges.push({
            id: `e-success-${step.stepId}-${a.stepId}-${index}`,
            source: step.stepId,
            target: a.stepId,
            type: 'smoothstep',
            animated: true,
            label: `✓ ${a.name || 'success'}`,
            labelStyle: { fill: '#10b981', fontSize: 10 },
            labelBgStyle: { fill: '#ffffff', fillOpacity: 0.9 },
            style: { stroke: '#10b981', strokeWidth: 1.5, strokeDasharray: '4,4' },
          });
        }
      });
    }
    
    // onFailure edges (conditionally hidden)
    if (!hideErrorFlows && step.onFailure) {
      step.onFailure.forEach((action, index) => {
        if (isReusableObject(action)) return;
        const a = action as FailureAction;
        if (a.type === 'goto' && a.stepId) {
          edges.push({
            id: `e-failure-${step.stepId}-${a.stepId}-${index}`,
            source: step.stepId,
            target: a.stepId,
            type: 'smoothstep',
            animated: true,
            label: `✗ ${a.name || 'failure'}`,
            labelStyle: { fill: '#ef4444', fontSize: 10 },
            labelBgStyle: { fill: '#ffffff', fillOpacity: 0.9 },
            style: { stroke: '#ef4444', strokeWidth: 1.5, strokeDasharray: '4,4' },
          });
        }
      });
    }
  });
  
  // Last step to output
  if (workflow.outputs && workflow.steps.length > 0) {
    const lastStep = workflow.steps[workflow.steps.length - 1];
    edges.push({
      id: `e-${lastStep.stepId}-output`,
      source: lastStep.stepId,
      target: 'output',
      type: 'smoothstep',
      style: { stroke: '#f59e0b', strokeWidth: 1.5 },
    });
  }
  
  return { nodes, edges };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Utilities
// ═══════════════════════════════════════════════════════════════════════════════

export function extractHttpMethod(operationId?: string): string | null {
  if (!operationId) return null;
  const op = operationId.toLowerCase();
  if (op.includes('get') || op.includes('find') || op.includes('list') || op.includes('search')) return 'GET';
  if (op.includes('post') || op.includes('create') || op.includes('place') || op.includes('add')) return 'POST';
  if (op.includes('put') || op.includes('update')) return 'PUT';
  if (op.includes('delete') || op.includes('remove')) return 'DELETE';
  return null;
}

export type ExpressionSource = 
  | { type: 'inputs'; source: string }
  | { type: 'steps'; source: string; field: string }
  | { type: 'url' }
  | { type: 'method' }
  | { type: 'statusCode' }
  | { type: 'request'; part: 'header' | 'query' | 'path' | 'body'; name?: string }
  | { type: 'response'; part: 'header' | 'body'; name?: string }
  | { type: 'components'; category: string; name: string };

export function extractExpressionSource(expr: string): ExpressionSource | null {
  // $url
  if (expr === '$url') return { type: 'url' };
  
  // $method
  if (expr === '$method') return { type: 'method' };
  
  // $statusCode
  if (expr === '$statusCode') return { type: 'statusCode' };

  // $inputs.name
  const inputMatch = expr.match(/\$inputs\.([\w-]+)/);
  if (inputMatch) {
    return { type: 'inputs', source: inputMatch[1] };
  }
  
  // $steps.stepId.outputs.name
  const stepMatch = expr.match(/\$steps\.([\w-]+)\.outputs\.([\w-]+)/);
  if (stepMatch) {
    return { type: 'steps', source: stepMatch[1], field: stepMatch[2] };
  }

  // $request.body
  if (expr === '$request.body') return { type: 'request', part: 'body' };

  // $request.header.name, $request.query.name, $request.path.name
  const requestMatch = expr.match(/\$request\.(header|query|path)\.([\w-]+)/);
  if (requestMatch) {
    return { 
      type: 'request', 
      part: requestMatch[1] as 'header' | 'query' | 'path', 
      name: requestMatch[2] 
    };
  }

  // $response.body
  if (expr === '$response.body') return { type: 'response', part: 'body' };

  // $response.header.name
  const responseMatch = expr.match(/\$response\.header\.([\w-]+)/);
  if (responseMatch) {
    return { 
      type: 'response', 
      part: 'header', 
      name: responseMatch[1] 
    };
  }

  // $components.category.name
  const componentMatch = expr.match(/\$components\.(inputs|parameters|successActions|failureActions)\.([\w-]+)/);
  if (componentMatch) {
    return { 
      type: 'components', 
      category: componentMatch[1], 
      name: componentMatch[2] 
    };
  }
  
  return null;
}
