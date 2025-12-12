import type { ArazzoSpec, Step, SuccessAction, FailureAction } from '@/types/arazzo';
import { isReusableObject } from '@/types/arazzo';

// ═══════════════════════════════════════════════════════════════════════════════
// Swimlane Diagram Generator
// Creates a horizontal swimlane diagram showing actor interactions
// ═══════════════════════════════════════════════════════════════════════════════

export interface SwimlaneOptions {
  hideErrorFlows?: boolean;
  showStepDetails?: boolean;
}

interface ActorLane {
  name: string;
  displayName: string;
  steps: Step[];
  color: string;
}

export function workflowToSwimlaneDiagram(
  spec: ArazzoSpec,
  workflowId: string,
  options: SwimlaneOptions = {}
): string {
  const { hideErrorFlows = false, showStepDetails = true } = options;
  const workflow = spec.workflows.find(w => w.workflowId === workflowId);
  if (!workflow) throw new Error(`Workflow not found: ${workflowId}`);

  const lines: string[] = [];
  lines.push('flowchart LR');
  lines.push('');

  // Define lane colors
  const laneColors = [
    { bg: '#e0f2fe', border: '#0ea5e9', text: '#0c4a6e' }, // sky
    { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' }, // amber
    { bg: '#e0e7ff', border: '#6366f1', text: '#3730a3' }, // indigo
    { bg: '#dcfce7', border: '#22c55e', text: '#166534' }, // green
    { bg: '#fce7f3', border: '#ec4899', text: '#9d174d' }, // pink
    { bg: '#f3e8ff', border: '#a855f7', text: '#6b21a8' }, // purple
  ];

  // Collect all actors/sources
  const actorMap = new Map<string, ActorLane>();
  
  // Always add Client as first lane
  actorMap.set('Client', {
    name: 'Client',
    displayName: '🖥️ Client',
    steps: [],
    color: laneColors[0].bg,
  });

  // Extract sources from steps
  workflow.steps.forEach((step, index) => {
    const source = extractSourceFromStep(step, spec);
    if (source && !actorMap.has(source)) {
      const colorIndex = (actorMap.size) % laneColors.length;
      actorMap.set(source, {
        name: source,
        displayName: `🔌 ${source}`,
        steps: [],
        color: laneColors[colorIndex].bg,
      });
    }
    // Assign step to its source lane
    if (source) {
      actorMap.get(source)?.steps.push(step);
    }
  });

  // Style definitions
  lines.push('  %% Styles');
  let colorIdx = 0;
  actorMap.forEach((lane, name) => {
    const color = laneColors[colorIdx % laneColors.length];
    lines.push(`  classDef lane${colorIdx} fill:${color.bg},stroke:${color.border},stroke-width:2px,color:${color.text}`);
    colorIdx++;
  });
  lines.push('  classDef eventNode fill:#fff,stroke:#6366f1,stroke-width:2px,color:#3730a3,stroke-dasharray:0');
  lines.push('  classDef requestEdge stroke:#10b981,stroke-width:2px');
  lines.push('  classDef responseEdge stroke:#f59e0b,stroke-width:2px,stroke-dasharray:5 5');
  lines.push('');

  // Create subgraphs for each lane
  colorIdx = 0;
  actorMap.forEach((lane, name) => {
    const safeName = sanitizeId(name);
    lines.push(`  subgraph ${safeName}["${lane.displayName}"]`);
    lines.push(`    direction TB`);
    
    if (name === 'Client') {
      // Client lane contains workflow start/end and decision points
      lines.push(`    START((🚀)):::lane${colorIdx}`);
      if (workflow.outputs) {
        lines.push(`    END((✅)):::lane${colorIdx}`);
      }
    }
    
    // Add steps that belong to this lane
    lane.steps.forEach((step) => {
      const stepId = sanitizeId(step.stepId);
      const method = extractHttpMethod(step.operationId);
      const label = showStepDetails && method 
        ? `${method}<br/>${sanitizeLabel(step.stepId)}`
        : sanitizeLabel(step.stepId);
      lines.push(`    ${stepId}["${label}"]:::lane${colorIdx}`);
    });
    
    lines.push(`  end`);
    lines.push('');
    colorIdx++;
  });

  // Create interaction events between lanes
  lines.push('  %% Events/Interactions');
  let eventCounter = 0;
  
  workflow.steps.forEach((step, stepIndex) => {
    const source = extractSourceFromStep(step, spec) || 'API';
    const stepId = sanitizeId(step.stepId);
    const method = extractHttpMethod(step.operationId);
    
    // Request: Client -> Source
    const reqEventId = `req_${eventCounter}`;
    const reqLabel = method ? `${method}` : 'call';
    lines.push(`  ${reqEventId}{{"${reqLabel}"}}:::eventNode`);
    
    if (stepIndex === 0) {
      lines.push(`  START --> ${reqEventId}`);
    }
    lines.push(`  ${reqEventId} --> ${stepId}`);
    
    // Response: Source -> Client (or next step)
    const resEventId = `res_${eventCounter}`;
    const resLabel = step.successCriteria?.[0]?.condition 
      ? sanitizeLabel(step.successCriteria[0].condition).slice(0, 15)
      : '200 OK';
    lines.push(`  ${resEventId}{{"${resLabel}"}}:::eventNode`);
    lines.push(`  ${stepId} --> ${resEventId}`);
    
    // Connect to next step or end
    const nextStep = workflow.steps[stepIndex + 1];
    if (nextStep) {
      const nextReqId = `req_${eventCounter + 1}`;
      // Check if there's explicit flow control
      const hasExplicitNext = step.onSuccess?.some(a => {
        if (isReusableObject(a)) return false;
        const action = a as SuccessAction;
        return action.type === 'goto' || action.type === 'end';
      });
      if (!hasExplicitNext) {
        lines.push(`  ${resEventId} --> req_${eventCounter + 1}`);
      }
    } else if (workflow.outputs) {
      lines.push(`  ${resEventId} --> END`);
    }
    
    // Handle onSuccess goto
    if (step.onSuccess) {
      step.onSuccess.forEach((action) => {
        if (isReusableObject(action)) return;
        const a = action as SuccessAction;
        if (a.type === 'goto' && a.stepId) {
          // Find the index of target step to connect to its request event
          const targetIndex = workflow.steps.findIndex(s => s.stepId === a.stepId);
          if (targetIndex !== -1) {
            lines.push(`  ${resEventId} -.->|"${sanitizeLabel(a.name || 'goto')}"| req_${targetIndex}`);
          }
        } else if (a.type === 'end' && workflow.outputs) {
          lines.push(`  ${resEventId} --> END`);
        }
      });
    }
    
    // Handle onFailure (if not hidden)
    if (!hideErrorFlows && step.onFailure) {
      step.onFailure.forEach((action) => {
        if (isReusableObject(action)) return;
        const a = action as FailureAction;
        if (a.type === 'goto' && a.stepId) {
          const targetIndex = workflow.steps.findIndex(s => s.stepId === a.stepId);
          if (targetIndex !== -1) {
            lines.push(`  ${resEventId} -.->|"❌ ${sanitizeLabel(a.name || 'retry')}"| req_${targetIndex}`);
          }
        }
      });
    }
    
    eventCounter++;
  });

  // Link styles
  lines.push('');
  lines.push('  %% Link styles');
  lines.push('  linkStyle default stroke:#64748b,stroke-width:1px');

  return lines.join('\n');
}

// Alternative: Pure horizontal swimlane with events on edges
export function workflowToHorizontalSwimlane(
  spec: ArazzoSpec,
  workflowId: string,
  options: SwimlaneOptions = {}
): string {
  const { hideErrorFlows = false } = options;
  const workflow = spec.workflows.find(w => w.workflowId === workflowId);
  if (!workflow) throw new Error(`Workflow not found: ${workflowId}`);

  const lines: string[] = [];
  lines.push('flowchart TB');
  lines.push('');

  // Styles
  lines.push('  %% Styles');
  lines.push('  classDef clientLane fill:#e0f2fe,stroke:#0ea5e9,stroke-width:3px,color:#0c4a6e');
  lines.push('  classDef apiLane fill:#fef3c7,stroke:#f59e0b,stroke-width:3px,color:#92400e');
  lines.push('  classDef stepNode fill:#e0e7ff,stroke:#6366f1,stroke-width:2px,color:#3730a3');
  lines.push('  classDef inputNode fill:#dcfce7,stroke:#22c55e,stroke-width:2px,color:#166534');
  lines.push('  classDef outputNode fill:#fce7f3,stroke:#ec4899,stroke-width:2px,color:#9d174d');
  lines.push('');

  // Get all unique sources
  const sources = new Set<string>();
  workflow.steps.forEach(step => {
    const source = extractSourceFromStep(step, spec);
    if (source) sources.add(source);
  });

  // Client Lane
  lines.push('  subgraph CLIENT["🖥️ Client / Workflow"]');
  lines.push('    direction LR');
  lines.push('    c_start(["🚀 Start"]):::inputNode');
  
  workflow.steps.forEach((step, idx) => {
    lines.push(`    c_${idx}[/"📤 ${sanitizeLabel(step.stepId)}"/]:::clientLane`);
  });
  
  if (workflow.outputs) {
    lines.push('    c_end(["✅ Complete"]):::outputNode');
  }
  lines.push('  end');
  lines.push('');

  // API Lanes
  sources.forEach(source => {
    const safeName = sanitizeId(source);
    lines.push(`  subgraph ${safeName}["🔌 ${source}"]`);
    lines.push('    direction LR');
    
    workflow.steps.forEach((step, idx) => {
      const stepSource = extractSourceFromStep(step, spec);
      if (stepSource === source) {
        const method = extractHttpMethod(step.operationId);
        const opLabel = getOperationLabel(step);
        lines.push(`    api_${idx}["${method || 'API'}: ${sanitizeLabel(opLabel)}"]:::apiLane`);
      }
    });
    
    lines.push('  end');
    lines.push('');
  });

  // Connections
  lines.push('  %% Flow connections');
  
  // Start to first client step
  if (workflow.steps.length > 0) {
    lines.push('  c_start --> c_0');
  }

  // Client to API and back
  workflow.steps.forEach((step, idx) => {
    const method = extractHttpMethod(step.operationId);
    lines.push(`  c_${idx} -->|"${method || 'request'}"| api_${idx}`);
    
    const response = step.successCriteria?.[0]?.condition || '200';
    const nextIdx = idx + 1;
    
    if (nextIdx < workflow.steps.length) {
      lines.push(`  api_${idx} -->|"${sanitizeLabel(response)}"| c_${nextIdx}`);
    } else if (workflow.outputs) {
      lines.push(`  api_${idx} -->|"${sanitizeLabel(response)}"| c_end`);
    }

    // Handle explicit flows
    if (step.onSuccess) {
      step.onSuccess.forEach((action) => {
        if (isReusableObject(action)) return;
        const a = action as SuccessAction;
        if (a.type === 'goto' && a.stepId) {
          const targetIdx = workflow.steps.findIndex(s => s.stepId === a.stepId);
          if (targetIdx !== -1) {
            lines.push(`  api_${idx} -.->|"${sanitizeLabel(a.name || 'goto')}"| c_${targetIdx}`);
          }
        }
      });
    }

    if (!hideErrorFlows && step.onFailure) {
      step.onFailure.forEach((action) => {
        if (isReusableObject(action)) return;
        const a = action as FailureAction;
        if (a.type === 'goto' && a.stepId) {
          const targetIdx = workflow.steps.findIndex(s => s.stepId === a.stepId);
          if (targetIdx !== -1) {
            lines.push(`  api_${idx} -.->|"❌ retry"| c_${targetIdx}`);
          }
        }
      });
    }
  });

  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// Utilities
// ═══════════════════════════════════════════════════════════════════════════════

function sanitizeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_]/g, '_');
}

function sanitizeLabel(label: string): string {
  return label
    .replace(/"/g, "'")
    .replace(/\$/g, '')
    .replace(/\[/g, '(')
    .replace(/\]/g, ')')
    .replace(/[<>]/g, '')
    .replace(/[:;]/g, ' ')
    .replace(/\|\|/g, ' OR ')
    .replace(/&&/g, ' AND ')
    .replace(/\|/g, '/')
    .replace(/\n/g, ' ')
    .trim();
}

function extractHttpMethod(operationId?: string): string | null {
  if (!operationId) return null;
  const opPart = operationId.includes('.') ? operationId.split('.').pop()! : operationId;
  const op = opPart.toLowerCase();
  if (op.includes('get') || op.includes('find') || op.includes('list') || op.includes('search') || op.includes('retrieve') || op.includes('verify')) return 'GET';
  if (op.includes('post') || op.includes('create') || op.includes('place') || op.includes('add') || op.includes('log') || op.includes('upsert')) return 'POST';
  if (op.includes('put') || op.includes('update')) return 'PUT';
  if (op.includes('delete') || op.includes('remove')) return 'DELETE';
  if (op.includes('patch')) return 'PATCH';
  return null;
}

function extractSourceFromStep(step: Step, spec: ArazzoSpec): string | null {
  if (step.operationId && step.operationId.includes('.')) {
    const sourceName = step.operationId.split('.')[0];
    const sourceDesc = spec.sourceDescriptions?.find(s => s.name === sourceName);
    if (sourceDesc) return sourceDesc.name;
    return sourceName;
  }
  
  if (step.operationPath) {
    const match = step.operationPath.match(/\$sourceDescriptions\.(\w+)/);
    if (match) {
      const sourceDesc = spec.sourceDescriptions?.find(s => s.name === match[1]);
      if (sourceDesc) return sourceDesc.name;
      return match[1];
    }
  }
  
  if (spec.sourceDescriptions && spec.sourceDescriptions.length > 0) {
    return spec.sourceDescriptions[0].name;
  }
  
  return 'API';
}

function getOperationLabel(step: Step): string {
  if (!step.operationId) return step.stepId;
  if (step.operationId.includes('.')) {
    return step.operationId.split('.').pop()!;
  }
  return step.operationId;
}
