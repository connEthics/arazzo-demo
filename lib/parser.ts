import yaml from 'js-yaml';
import { ArazzoDocument } from './types';

export function parseArazzo(content: string, format: 'json' | 'yaml'): ArazzoDocument {
  try {
    if (format === 'json') {
      return JSON.parse(content) as ArazzoDocument;
    } else {
      return yaml.load(content) as ArazzoDocument;
    }
  } catch (error) {
    throw new Error(`Failed to parse Arazzo document: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function validateArazzo(doc: ArazzoDocument): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check required fields
  if (!doc.arazzo) {
    errors.push('Missing required field: arazzo');
  }
  if (!doc.info) {
    errors.push('Missing required field: info');
  } else {
    if (!doc.info.title) {
      errors.push('Missing required field: info.title');
    }
    if (!doc.info.version) {
      errors.push('Missing required field: info.version');
    }
  }
  if (!doc.workflows || !Array.isArray(doc.workflows) || doc.workflows.length === 0) {
    errors.push('Missing or empty required field: workflows');
  } else {
    doc.workflows.forEach((workflow, idx) => {
      if (!workflow.workflowId) {
        errors.push(`Workflow ${idx}: Missing required field: workflowId`);
      }
      if (!workflow.steps || !Array.isArray(workflow.steps) || workflow.steps.length === 0) {
        errors.push(`Workflow ${workflow.workflowId || idx}: Missing or empty required field: steps`);
      } else {
        workflow.steps.forEach((step, stepIdx) => {
          if (!step.stepId) {
            errors.push(`Workflow ${workflow.workflowId || idx}, Step ${stepIdx}: Missing required field: stepId`);
          }
          // At least one of operationId, operationPath, or workflowId should be present
          if (!step.operationId && !step.operationPath && !step.workflowId) {
            errors.push(
              `Workflow ${workflow.workflowId || idx}, Step ${step.stepId || stepIdx}: Must have at least one of: operationId, operationPath, or workflowId`
            );
          }
        });
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
