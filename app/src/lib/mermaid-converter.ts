import type { ArazzoSpec, Step } from '@/types/arazzo';

// ═══════════════════════════════════════════════════════════════════════════════
// Mermaid Flowchart Generator
// ═══════════════════════════════════════════════════════════════════════════════

export interface MermaidOptions {
  hideErrorFlows?: boolean;
  hideOutputs?: boolean;
  showStepNames?: boolean;
  direction?: 'TB' | 'LR' | 'BT' | 'RL';
}

export function workflowToMermaidFlowchart(
  spec: ArazzoSpec,
  workflowId: string,
  options: MermaidOptions = {}
): string {
  const { hideErrorFlows = false, direction = 'TB' } = options;
  const workflow = spec.workflows.find(w => w.workflowId === workflowId);
  if (!workflow) throw new Error(`Workflow not found: ${workflowId}`);

  const lines: string[] = [];
  lines.push(`flowchart ${direction}`);
  lines.push('');
  
  // Styles
  lines.push('  %% Styles');
  lines.push('  classDef inputNode fill:#d1fae5,stroke:#10b981,stroke-width:2px,color:#065f46');
  lines.push('  classDef stepNode fill:#e0e7ff,stroke:#6366f1,stroke-width:2px,color:#3730a3');
  lines.push('  classDef outputNode fill:#fef3c7,stroke:#f59e0b,stroke-width:2px,color:#92400e');
  lines.push('  classDef errorNode fill:#fee2e2,stroke:#ef4444,stroke-width:2px,color:#991b1b');
  lines.push('');

  // Input node
  const inputProps = workflow.inputs?.properties 
    ? Object.keys(workflow.inputs.properties).join(', ')
    : 'none';
  lines.push(`  %% Input`);
  lines.push(`  INPUT[/"📥 Inputs: ${sanitizeLabel(inputProps)}"/]:::inputNode`);
  lines.push('');

  // Step nodes
  lines.push('  %% Steps');
  workflow.steps.forEach((step) => {
    const method = extractHttpMethod(step.operationId);
    const methodBadge = method ? `[${method}] ` : '';
    const label = `${methodBadge}${sanitizeLabel(step.stepId)}`;
    lines.push(`  ${sanitizeId(step.stepId)}["${label}"]:::stepNode`);
  });
  lines.push('');

  // Output node
  if (workflow.outputs) {
    const outputProps = Object.keys(workflow.outputs).join(', ');
    lines.push('  %% Output');
    lines.push(`  OUTPUT[/"📤 Outputs: ${sanitizeLabel(outputProps)}"/]:::outputNode`);
    lines.push('');
  }

  // Edges
  lines.push('  %% Connections');
  
  // Input to first step
  if (workflow.steps.length > 0) {
    lines.push(`  INPUT --> ${sanitizeId(workflow.steps[0].stepId)}`);
  }

  // Step connections
  for (let i = 0; i < workflow.steps.length; i++) {
    const step = workflow.steps[i];
    const nextStep = workflow.steps[i + 1];
    
    // Default sequential flow
    const hasExplicitNext = step.onSuccess?.some(a => a.type === 'goto' || a.type === 'end');
    if (nextStep && !hasExplicitNext) {
      lines.push(`  ${sanitizeId(step.stepId)} --> ${sanitizeId(nextStep.stepId)}`);
    }

    // onSuccess flows
    if (step.onSuccess) {
      step.onSuccess.forEach((action) => {
        if (action.type === 'goto' && action.stepId) {
          const label = sanitizeLabel(action.name || 'success');
          lines.push(`  ${sanitizeId(step.stepId)} -->|"✓ ${label}"| ${sanitizeId(action.stepId)}`);
        } else if (action.type === 'end') {
          lines.push(`  ${sanitizeId(step.stepId)} -->|"✓ end"| OUTPUT`);
        }
      });
    }

    // onFailure flows (if not hidden)
    if (!hideErrorFlows && step.onFailure) {
      step.onFailure.forEach((action) => {
        if (action.type === 'goto' && action.stepId) {
          const label = sanitizeLabel(action.name || 'failure');
          lines.push(`  ${sanitizeId(step.stepId)} -.->|"✗ ${label}"| ${sanitizeId(action.stepId)}`);
        } else if (action.type === 'end') {
          lines.push(`  ${sanitizeId(step.stepId)} -.->|"✗ end"| END_ERROR["❌ Error"]:::errorNode`);
        }
      });
    }
  }

  // Last step to output
  if (workflow.outputs && workflow.steps.length > 0) {
    const lastStep = workflow.steps[workflow.steps.length - 1];
    const hasExplicitEnd = lastStep.onSuccess?.some(a => a.type === 'end');
    if (!hasExplicitEnd) {
      lines.push(`  ${sanitizeId(lastStep.stepId)} --> OUTPUT`);
    }
  }

  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// Mermaid Sequence Diagram Generator
// ═══════════════════════════════════════════════════════════════════════════════

export function workflowToMermaidSequence(
  spec: ArazzoSpec,
  workflowId: string,
  options: MermaidOptions = {}
): string {
  const { hideErrorFlows = false, hideOutputs = false, showStepNames = false } = options;
  const workflow = spec.workflows.find(w => w.workflowId === workflowId);
  if (!workflow) throw new Error(`Workflow not found: ${workflowId}`);

  const lines: string[] = [];
  lines.push('sequenceDiagram');
  lines.push('  autonumber');
  lines.push('');
  
  // Participants
  lines.push('  %% Participants');
  lines.push('  participant Client');
  
  // Extract unique API sources
  const apiSources = new Set<string>();
  workflow.steps.forEach(step => {
    const source = extractSourceFromStep(step, spec);
    if (source) apiSources.add(source);
  });
  
  apiSources.forEach(source => {
    lines.push(`  participant ${sanitizeId(source)} as ${source}`);
  });
  lines.push('');

  // Workflow title
  lines.push(`  Note over Client: 🚀 ${sanitizeLabel(workflow.summary || workflow.workflowId)}`);
  lines.push('');

  // Step interactions
  workflow.steps.forEach((step, index) => {
    const source = extractSourceFromStep(step, spec) || 'API';
    const method = extractHttpMethod(step.operationId);
    const operation = getOperationLabel(step);
    
    lines.push(`  %% Step ${index + 1}: ${step.stepId}`);
    
    // Show step name in a box (optional)
    if (showStepNames) {
      lines.push(`  rect rgb(238, 242, 255)`);
      lines.push(`  Note over Client,${sanitizeId(source)}: 📌 ${sanitizeLabel(step.stepId)}`);
    }
    
    // Request
    const requestLabel = method ? `${method} ${sanitizeLabel(operation)}` : sanitizeLabel(operation);
    lines.push(`  Client->>+${sanitizeId(source)}: ${requestLabel}`);
    
    // Success response
    if (step.successCriteria && step.successCriteria.length > 0) {
      const criteria = sanitizeLabel(step.successCriteria[0].condition || '200 OK');
      lines.push(`  ${sanitizeId(source)}-->>-Client: ${criteria}`);
    } else {
      lines.push(`  ${sanitizeId(source)}-->>-Client: Response`);
    }

    // Outputs note (optionally hidden)
    if (!hideOutputs && step.outputs && Object.keys(step.outputs).length > 0) {
      const outputs = Object.keys(step.outputs).join(', ');
      lines.push(`  Note right of Client: 📦 ${sanitizeLabel(outputs)}`);
    }

    // Error handling (if not hidden)
    if (!hideErrorFlows && step.onFailure && step.onFailure.length > 0) {
      lines.push(`  alt Error handling`);
      step.onFailure.forEach(action => {
        if (action.type === 'goto' && action.stepId) {
          lines.push(`    Client->>Client: Retry → ${sanitizeLabel(action.stepId)}`);
        } else if (action.type === 'end') {
          lines.push(`    Client->>Client: ❌ Abort workflow`);
        }
      });
      lines.push(`  end`);
    }

    // Close step rect
    if (showStepNames) {
      lines.push(`  end`);
    }

    lines.push('');
  });

  // Final output
  if (workflow.outputs) {
    const outputs = Object.keys(workflow.outputs).join(', ');
    lines.push(`  Note over Client: ✅ Complete: ${sanitizeLabel(outputs)}`);
  }

  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// Utilities
// ═══════════════════════════════════════════════════════════════════════════════

function sanitizeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_]/g, '_');
}

function sanitizeLabel(label: string): string {
  // Escape or remove characters that break Mermaid syntax
  return label
    .replace(/"/g, "'")          // Replace double quotes
    .replace(/\$/g, '')          // Remove $ signs that cause issues
    .replace(/\[/g, '(')         // Replace brackets
    .replace(/\]/g, ')')
    .replace(/[<>]/g, '')        // Remove angle brackets
    .replace(/[:;]/g, ' ')       // Replace colons and semicolons with space
    .replace(/\|\|/g, ' OR ')    // Replace || with OR
    .replace(/&&/g, ' AND ')     // Replace && with AND
    .replace(/\|/g, '/')         // Replace single | with /
    .replace(/\n/g, ' ')         // Replace newlines
    .trim();
}

function extractHttpMethod(operationId?: string): string | null {
  if (!operationId) return null;
  // Remove source prefix if present (e.g., "magentoApi.searchCustomers" -> "searchCustomers")
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
  // 1. Check operationId for source prefix (e.g., "magentoApi.searchCustomers")
  if (step.operationId && step.operationId.includes('.')) {
    const sourceName = step.operationId.split('.')[0];
    // Find matching sourceDescription and use its name directly
    const sourceDesc = spec.sourceDescriptions?.find(s => s.name === sourceName);
    if (sourceDesc) {
      return sourceDesc.name;  // Use the exact name from sourceDescriptions
    }
    return sourceName;
  }
  
  // 2. Check operationPath for source reference
  if (step.operationPath) {
    const match = step.operationPath.match(/\$sourceDescriptions\.(\w+)/);
    if (match) {
      const sourceDesc = spec.sourceDescriptions?.find(s => s.name === match[1]);
      if (sourceDesc) {
        return sourceDesc.name;
      }
      return match[1];
    }
  }
  
  // 3. Default to first source description
  if (spec.sourceDescriptions && spec.sourceDescriptions.length > 0) {
    return spec.sourceDescriptions[0].name;
  }
  
  return 'API';
}

function getOperationLabel(step: Step): string {
  if (!step.operationId) return step.stepId;
  
  // Extract operation name from "sourceApi.operationName"
  if (step.operationId.includes('.')) {
    return step.operationId.split('.').pop()!;
  }
  return step.operationId;
}
