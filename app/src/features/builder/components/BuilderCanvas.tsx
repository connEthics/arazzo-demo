'use client';

import { useCallback, useRef, useEffect, useMemo, useState } from 'react';
import { 
  ReactFlow, 
  Background, 
  useNodesState, 
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  ReactFlowProvider,
  Node,
  MarkerType,
  useReactFlow,
  XYPosition,
  useOnSelectionChange,
  useViewport
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useBuilder } from '../context/BuilderContext';
import { UnifiedStepNode } from '@/components/nodes';
import { WorkflowInputNode, WorkflowOutputNode } from './nodes';
import { extractOperations } from '../utils/oas-helpers';
import CanvasToolbar from '@/components/CanvasToolbar';
import type { Step, SuccessAction, FailureAction } from '@/types/arazzo';

const nodeTypes = {
  step: UnifiedStepNode,
  workflowInput: WorkflowInputNode,
  workflowOutput: WorkflowOutputNode,
};

// Edge types for different connection types
type EdgeType = 'success' | 'failure' | 'data';

/**
 * Calculate topological order of steps based on connections.
 * Returns: { ordered: Step[], startStepIds: string[], endStepIds: string[] }
 * - startStepIds: steps with no predecessor (connected from START)
 * - endStepIds: steps with no successor (connected to END)
 */
function getTopologicalInfo(steps: Step[]): {
  ordered: Step[];
  startStepIds: Set<string>;
  endStepIds: Set<string>;
} {
  if (steps.length === 0) return { ordered: [], startStepIds: new Set(), endStepIds: new Set() };
  
  // Build adjacency map (stepId -> target stepIds)
  const successors = new Map<string, Set<string>>();
  const predecessors = new Map<string, Set<string>>();
  
  steps.forEach(step => {
    successors.set(step.stepId, new Set());
    predecessors.set(step.stepId, new Set());
  });
  
  // Collect edges from onSuccess goto actions
  steps.forEach(step => {
    step.onSuccess?.forEach(action => {
      if ('reference' in action) return;
      const a = action as SuccessAction;
      if (a.type === 'goto' && a.stepId && predecessors.has(a.stepId)) {
        successors.get(step.stepId)?.add(a.stepId);
        predecessors.get(a.stepId)?.add(step.stepId);
      }
    });
  });
  
  // Find steps with no predecessors (start nodes)
  const startSteps = steps.filter(s => predecessors.get(s.stepId)?.size === 0);
  
  // BFS to get order
  const ordered: Step[] = [];
  const visited = new Set<string>();
  
  // If no clear start, use all steps as potential starts (original order)
  const queue = startSteps.length > 0 ? [...startSteps] : [...steps];
  
  while (queue.length > 0) {
    const step = queue.shift()!;
    if (visited.has(step.stepId)) continue;
    visited.add(step.stepId);
    ordered.push(step);
    
    // Add successors to queue
    const succs = successors.get(step.stepId) || new Set();
    succs.forEach(succId => {
      const succStep = steps.find(s => s.stepId === succId);
      if (succStep && !visited.has(succId)) {
        queue.push(succStep);
      }
    });
  }
  
  // Add any remaining steps not in the graph
  steps.forEach(step => {
    if (!visited.has(step.stepId)) {
      ordered.push(step);
    }
  });
  
  // Find end steps (no successors)
  const endStepIds = new Set<string>();
  steps.forEach(step => {
    if ((successors.get(step.stepId)?.size || 0) === 0) {
      endStepIds.add(step.stepId);
    }
  });
  
  // Start steps (no predecessors) - if none found, all steps are starts
  const startStepIds = startSteps.length > 0 
    ? new Set(startSteps.map(s => s.stepId))
    : new Set(steps.map(s => s.stepId));
  
  return { ordered, startStepIds, endStepIds };
}

interface BuilderCanvasProps {
  onNodeClick?: () => void;
}

function BuilderCanvasContent({ 
  onNodeClick: onNodeClickProp,
}: BuilderCanvasProps) {
  const { state, dispatch } = useBuilder();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  // Use step index as key for positions (stable across renames)
  const nodePositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  
  // Local state for React Flow
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  
  // Track selected nodes
  const [selectedNodes, setSelectedNodes] = useState<Node[]>([]);
  
  // Display options managed internally
  const [displayOptions, setDisplayOptions] = useState({
    showPorts: true,
    showDataFlow: true,
    showErrorFlow: true,
    showOutputs: true,
    showDescriptions: false,
  });
  
  // Layout direction
  const [layoutDirection, setLayoutDirection] = useState<'horizontal' | 'vertical'>('horizontal');
  
  useOnSelectionChange({
    onChange: ({ nodes: selectedN }) => {
      setSelectedNodes(selectedN);
    },
  });

  // Get operations to derive method info
  const operations = useMemo(() => extractOperations(state.sources), [state.sources]);
  
  // Build stepId to node index map for edge creation
  const stepIdToNodeId = useMemo(() => {
    const steps = state.spec.workflows[state.selectedWorkflowIndex]?.steps || [];
    const map = new Map<string, string>();
    steps.forEach((step, idx) => {
      map.set(step.stepId, `node-${idx}`);
    });
    return map;
  }, [state.spec.workflows]);
  
  // Get all valid stepIds for validation
  const validStepIds = useMemo(() => {
    const steps = state.spec.workflows[state.selectedWorkflowIndex]?.steps || [];
    return new Set(steps.map(s => s.stepId));
  }, [state.spec.workflows]);
  
  // Get topological info (start/end steps)
  const topoInfo = useMemo(() => {
    const steps = state.spec.workflows[state.selectedWorkflowIndex]?.steps || [];
    return getTopologicalInfo(steps);
  }, [state.spec.workflows]);

  // Sync nodes with global state steps - rebuild nodes when steps change
  useEffect(() => {
    const workflow = state.spec.workflows[state.selectedWorkflowIndex];
    const steps = workflow?.steps || [];
    const newNodes: Node[] = [];
    
    // Add INPUT node (workflow input)
    const workflowInputs = workflow?.inputs?.properties 
      ? Object.entries(workflow.inputs.properties).map(([name, schema]) => ({
          name,
          type: (schema as { type?: string })?.type
        }))
      : [];
    
    newNodes.push({
      id: 'node-input',
      type: 'workflowInput',
      position: nodePositionsRef.current.get('input') || { x: 50, y: 200 },
      data: {
        workflowId: workflow?.workflowId || 'workflow',
        inputs: workflowInputs,
        description: workflow?.description,
        isSelected: state.selectedNodeType === 'input'
      }
    });
    
    // Build step nodes using topological order for positioning
    const { ordered, startStepIds, endStepIds } = topoInfo;
    const stepPositions = new Map<string, { x: number; y: number }>();
    
    // Calculate positions based on topological order
    ordered.forEach((step, topoIdx) => {
      const existingPos = nodePositionsRef.current.get(step.stepId);
      if (existingPos) {
        stepPositions.set(step.stepId, existingPos);
      } else {
        // Position based on topological order: X increases with order, Y staggered
        const x = 300 + (topoIdx * 320);
        const y = 150 + ((topoIdx % 3) * 80);
        stepPositions.set(step.stepId, { x, y });
      }
    });
    
    // Add step nodes
    steps.forEach((step, idx) => {
      const position = stepPositions.get(step.stepId) || { x: 300 + (idx * 320), y: 200 };
      
      // Store position by stepId
      nodePositionsRef.current.set(step.stepId, position);
      
      // Get method from operations
      const opId = step.operationId?.split('.').pop() || '';
      const sourceName = step.operationId?.split('.')[0] || '';
      const operation = operations.find(op => op.operationId === opId && op.sourceName === sourceName);
      
      // Extract parameters for display (filter out reusable refs)
      const parameters = step.parameters
        ?.filter(p => typeof p === 'object' && 'name' in p && !('reference' in p))
        .map(p => {
          const param = p as { name: string; in?: string };
          return { name: param.name, in: param.in };
        }) || [];
      
      // Count invalid links for this step
      let invalidLinkCount = 0;
      step.onSuccess?.forEach(action => {
        if (!('reference' in action)) {
          const a = action as SuccessAction;
          if (a.type === 'goto' && a.stepId && !validStepIds.has(a.stepId)) invalidLinkCount++;
        }
      });
      step.onFailure?.forEach(action => {
        if (!('reference' in action)) {
          const a = action as FailureAction;
          if ((a.type === 'goto' || a.type === 'retry') && a.stepId && !validStepIds.has(a.stepId)) invalidLinkCount++;
        }
      });
      
      // Check data links in parameters
      let hasDataLinks = false;
      step.parameters?.forEach(param => {
        if (!('reference' in param)) {
          const p = param as { value?: unknown };
          const valueStr = String(p.value || '');
          const match = valueStr.match(/\$steps\.([^.]+)\./);
          if (match) {
            hasDataLinks = true;
            if (!validStepIds.has(match[1])) invalidLinkCount++;
          }
        }
      });
      
      // Show expanded view if: showPorts is on, or the node has data links
      const shouldExpand = displayOptions.showPorts || hasDataLinks;
      
      // Mark if this is a start or end step
      const isStartStep = startStepIds.has(step.stepId);
      const isEndStep = endStepIds.has(step.stepId);
      
      newNodes.push({
        id: `node-${idx}`,
        type: 'step',
        position,
        data: {
          stepId: step.stepId,
          stepIndex: idx,
          operationId: opId,
          method: operation?.method || 'GET',
          sourceName,
          parameters,
          outputs: step.outputs,
          isSelected: state.selectedStepId === step.stepId,
          mode: 'edit',
          expanded: shouldExpand,
          hasInvalidLinks: invalidLinkCount > 0,
          invalidLinkCount,
          hasDataLinks,
          isStartStep,
          isEndStep
        }
      });
    });
    
    // Add OUTPUT node (workflow output)
    const lastStepX = Math.max(...Array.from(stepPositions.values()).map(p => p.x), 300);
    newNodes.push({
      id: 'node-output',
      type: 'workflowOutput',
      position: nodePositionsRef.current.get('output') || { x: lastStepX + 350, y: 200 },
      data: {
        workflowId: workflow?.workflowId || 'workflow',
        outputs: workflow?.outputs,
        isSelected: state.selectedNodeType === 'output'
      }
    });
    
    setNodes(newNodes);
  }, [state.spec.workflows, state.selectedStepId, state.selectedNodeType, operations, validStepIds, displayOptions.showPorts, topoInfo, setNodes]);

  // Sync edges with global state (onSuccess/onFailure/data links)
  useEffect(() => {
    const steps = state.spec.workflows[state.selectedWorkflowIndex]?.steps || [];
    const newEdges: Edge[] = [];
    const { startStepIds, endStepIds } = topoInfo;
    
    // Add edges from INPUT to first steps (those with no predecessors)
    startStepIds.forEach(stepId => {
      const targetNodeId = stepIdToNodeId.get(stepId);
      if (targetNodeId) {
        newEdges.push({
          id: `input-to-${stepId}`,
          source: 'node-input',
          target: targetNodeId,
          sourceHandle: 'flow-out',
          targetHandle: 'flow-in',
          type: 'smoothstep',
          animated: false,
          style: { stroke: '#10b981', strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' },
          data: { type: 'input' }
        });
      }
    });
    
    // Add edges from last steps (those with no successors) to END
    endStepIds.forEach(stepId => {
      const sourceNodeId = stepIdToNodeId.get(stepId);
      if (sourceNodeId) {
        newEdges.push({
          id: `${stepId}-to-output`,
          source: sourceNodeId,
          target: 'node-output',
          sourceHandle: 'flow-out',
          targetHandle: 'flow-in',
          type: 'smoothstep',
          animated: false,
          style: { stroke: '#6366f1', strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' },
          data: { type: 'output' }
        });
      }
    });
    
    steps.forEach((step, srcIdx) => {
      const sourceNodeId = `node-${srcIdx}`;
      
      // Process onSuccess actions (goto)
      step.onSuccess?.forEach((action, actionIdx) => {
        if ('reference' in action) return;
        const a = action as SuccessAction;
        if (a.type === 'goto' && a.stepId) {
          const targetNodeId = stepIdToNodeId.get(a.stepId);
          const isInvalid = !validStepIds.has(a.stepId);
          
          if (targetNodeId || isInvalid) {
            newEdges.push({
              id: `success-${step.stepId}-${a.stepId}-${actionIdx}`,
              source: sourceNodeId,
              target: targetNodeId || sourceNodeId, // Loop back if invalid
              sourceHandle: 'flow-out',
              targetHandle: 'flow-in',
              type: 'smoothstep',
              animated: false,
              style: { 
                stroke: isInvalid ? '#ef4444' : '#10b981', 
                strokeWidth: 2,
                strokeDasharray: isInvalid ? '5,5' : undefined
              },
              markerEnd: { type: MarkerType.ArrowClosed, color: isInvalid ? '#ef4444' : '#10b981' },
              label: isInvalid ? `⚠️ ${a.stepId}` : undefined,
              labelStyle: { fill: '#ef4444', fontWeight: 600, fontSize: 10 },
              data: { type: 'success', actionName: a.name, isInvalid }
            });
          }
        }
      });
      
      // Process onFailure actions (goto/retry)
      if (displayOptions.showErrorFlow) {
        step.onFailure?.forEach((action, actionIdx) => {
          if ('reference' in action) return;
          const a = action as FailureAction;
          if ((a.type === 'goto' || a.type === 'retry') && a.stepId) {
            const targetNodeId = stepIdToNodeId.get(a.stepId);
            const isInvalid = !validStepIds.has(a.stepId);
            
            if (targetNodeId || isInvalid) {
              newEdges.push({
                id: `failure-${step.stepId}-${a.stepId}-${actionIdx}`,
                source: sourceNodeId,
                target: targetNodeId || sourceNodeId,
                sourceHandle: 'flow-out',
                targetHandle: 'flow-in',
                type: 'smoothstep',
                animated: a.type === 'retry',
                style: { 
                  stroke: '#ef4444', 
                  strokeWidth: 2,
                  strokeDasharray: isInvalid ? '5,5' : '8,4'
                },
                markerEnd: { type: MarkerType.ArrowClosed, color: '#ef4444' },
                label: a.type === 'retry' ? `🔄 retry` : (isInvalid ? `⚠️ ${a.stepId}` : undefined),
                labelStyle: { fill: '#ef4444', fontWeight: 600, fontSize: 10 },
                data: { type: 'failure', actionName: a.name, isInvalid }
              });
            }
          }
        });
      }
      
      // Process data links from parameter values ($steps.xxx.outputs.yyy)
      if (displayOptions.showDataFlow) {
        step.parameters?.forEach((param) => {
          if ('reference' in param) return;
          const p = param as { name: string; value?: unknown };
          const valueStr = String(p.value || '');
          
          // Match $steps.stepId.outputs.outputKey pattern
          const dataLinkMatch = valueStr.match(/\$steps\.([^.]+)\.outputs\.([^.\s}]+)/);
          if (dataLinkMatch) {
            const [, refStepId, outputKey] = dataLinkMatch;
            const sourceDataNodeId = stepIdToNodeId.get(refStepId);
            const isInvalid = !validStepIds.has(refStepId);
            
            if (sourceDataNodeId || isInvalid) {
              newEdges.push({
                id: `data-${refStepId}-${outputKey}-${step.stepId}-${p.name}`,
                source: sourceDataNodeId || sourceNodeId,
                target: sourceNodeId,
                sourceHandle: `output-${outputKey}`,
                targetHandle: `input-${p.name}`,
                type: 'smoothstep',
                animated: false,
                style: { 
                  stroke: isInvalid ? '#ef4444' : '#6366f1', 
                  strokeWidth: 1.5,
                  strokeDasharray: isInvalid ? '3,3' : undefined,
                  opacity: 0.7
                },
                markerEnd: { type: MarkerType.ArrowClosed, color: isInvalid ? '#ef4444' : '#6366f1', width: 12, height: 12 },
                data: { type: 'data', fromStep: refStepId, outputKey, toParam: p.name, isInvalid }
              });
            }
          }
        });
      }
    });
    
    setEdges(newEdges);
  }, [state.spec.workflows, stepIdToNodeId, validStepIds, displayOptions.showErrorFlow, displayOptions.showDataFlow, topoInfo, setEdges]);

  // Update positions ref when nodes move
  const handleNodesChange = useCallback((changes: any) => {
    onNodesChange(changes);
    // Update position ref for moved nodes
    changes.forEach((change: any) => {
      if (change.type === 'position' && change.position) {
        const nodeId = change.id;
        if (nodeId === 'node-input') {
          nodePositionsRef.current.set('input', change.position);
        } else if (nodeId === 'node-output') {
          nodePositionsRef.current.set('output', change.position);
        } else {
          // For step nodes, find the stepId
          const node = nodes.find(n => n.id === nodeId);
          if (node?.data?.stepId) {
            nodePositionsRef.current.set(node.data.stepId as string, change.position);
          }
        }
      }
    });
  }, [onNodesChange, nodes]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    // Handle different node types
    if (node.id === 'node-input') {
      dispatch({ type: 'SELECT_NODE', payload: { nodeType: 'input' } });
    } else if (node.id === 'node-output') {
      dispatch({ type: 'SELECT_NODE', payload: { nodeType: 'output' } });
    } else {
      const stepId = node.data?.stepId as string;
      dispatch({ type: 'SELECT_NODE', payload: { nodeType: 'step', stepId } });
    }
    onNodeClickProp?.(); // Switch to inspector on mobile
  }, [dispatch, onNodeClickProp]);

  const onConnect = useCallback(
    (params: Connection) => {
      // Don't add edge manually - it will be created from state sync
      if (params.source && params.target) {
        // Find stepIds from node data
        const sourceNode = nodes.find(n => n.id === params.source);
        const targetNode = nodes.find(n => n.id === params.target);
        if (sourceNode?.data?.stepId && targetNode?.data?.stepId) {
          dispatch({ 
            type: 'ADD_CONNECTION', 
            payload: { 
              sourceStepId: sourceNode.data.stepId as string, 
              targetStepId: targetNode.data.stepId as string 
            } 
          });
        }
      }
    },
    [dispatch, nodes],
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Helper: find if drop point is near an edge
  const findEdgeAtPoint = useCallback((x: number, y: number): { sourceStepId: string; targetStepId: string } | null => {
    // Check each edge to see if drop point is near it
    // Only consider step-to-step success edges (not input/output or data edges)
    for (const edge of edges) {
      if (!edge.data || edge.data.type !== 'success') continue;
      
      // Get source and target node positions
      const sourceNode = nodes.find(n => n.id === edge.source);
      const targetNode = nodes.find(n => n.id === edge.target);
      
      if (!sourceNode || !targetNode) continue;
      if (!sourceNode.data?.stepId || !targetNode.data?.stepId) continue;
      
      // Simple distance check: is point near the midpoint of the edge?
      const sourcePos = sourceNode.position;
      const targetPos = targetNode.position;
      
      // Calculate midpoint
      const midX = (sourcePos.x + targetPos.x) / 2 + 120; // Offset for node width
      const midY = (sourcePos.y + targetPos.y) / 2 + 40;  // Offset for node height
      
      // Check if drop point is within threshold of midpoint
      const threshold = 80;
      const distance = Math.sqrt(Math.pow(x - midX, 2) + Math.pow(y - midY, 2));
      
      if (distance < threshold) {
        return {
          sourceStepId: sourceNode.data.stepId as string,
          targetStepId: targetNode.data.stepId as string
        };
      }
    }
    return null;
  }, [edges, nodes]);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      if (!reactFlowWrapper.current) return;

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const dataStr = event.dataTransfer.getData('application/reactflow');
      
      if (!dataStr) return;

      const { type, data } = JSON.parse(dataStr);
      
      // Get current step count for unique ID
      const currentStepCount = state.spec.workflows[state.selectedWorkflowIndex]?.steps.length || 0;

      // Calculate position (screen coords relative to canvas)
      const position = {
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      };

      const stepId = `step_${currentStepCount + 1}`;
      
      // Store position by stepId
      nodePositionsRef.current.set(stepId, position);
      
      // Find the operation to extract parameters and generate outputs
      const operation = operations.find(op => 
        op.operationId === data.operationId && op.sourceName === data.sourceName
      );
      
      // Auto-populate parameters from OAS (only required ones with placeholder values)
      const parameters = operation?.parameters
        ?.filter(p => p.required)
        .map(p => ({
          name: p.name,
          in: p.in,
          value: `{${p.name}}` as string // Placeholder for required params
        })) || [];
      
      // Auto-generate outputs from response schema
      const outputs: Record<string, string> = {};
      const successResponse = operation?.responses?.find(r => r.statusCode.startsWith('2'));
      if (successResponse?.content) {
        const jsonContent = successResponse.content['application/json'];
        if (jsonContent?.schema) {
          // Extract output keys from schema properties
          if (jsonContent.schema.properties) {
            Object.keys(jsonContent.schema.properties).slice(0, 5).forEach(key => {
              outputs[key] = `$response.body#/${key}`;
            });
          } else if (jsonContent.schema.type === 'array' && jsonContent.schema.items?.properties) {
            // Array response - output the items
            outputs['items'] = '$response.body';
          } else {
            // Simple response
            outputs['result'] = '$response.body';
          }
        }
      }
      
      const newStep = {
        stepId,
        operationId: `${data.sourceName}.${data.operationId}`,
        parameters: parameters.length > 0 ? parameters : undefined,
        outputs: Object.keys(outputs).length > 0 ? outputs : undefined,
      };
      
      // Check if dropped on an edge between two steps
      const edgeAtPoint = findEdgeAtPoint(position.x, position.y);
      
      if (edgeAtPoint) {
        // Insert step between existing connected steps
        dispatch({ 
          type: 'INSERT_STEP_ON_EDGE', 
          payload: { 
            step: newStep,
            sourceStepId: edgeAtPoint.sourceStepId,
            targetStepId: edgeAtPoint.targetStepId,
            position 
          } 
        });
      } else {
        // Just add step without any connections
        dispatch({ 
          type: 'ADD_STEP', 
          payload: { 
            step: newStep,
            position 
          } 
        });
      }
    },
    [state.spec.workflows, operations, dispatch, findEdgeAtPoint]
  );

  // Handle edge deletion - remove goTo from source step
  const handleEdgesChange = useCallback((changes: any) => {
    onEdgesChange(changes);
    
    // Check for edge removals
    changes.forEach((change: any) => {
      if (change.type === 'remove') {
        // Find the removed edge
        const removedEdge = edges.find(e => e.id === change.id);
        if (removedEdge?.data?.type === 'success' && !removedEdge.data.isInvalid) {
          // Get source and target stepIds
          const sourceNode = nodes.find(n => n.id === removedEdge.source);
          const targetNode = nodes.find(n => n.id === removedEdge.target);
          
          if (sourceNode?.data?.stepId && targetNode?.data?.stepId) {
            dispatch({
              type: 'DELETE_CONNECTION',
              payload: {
                sourceStepId: sourceNode.data.stepId as string,
                targetStepId: targetNode.data.stepId as string
              }
            });
          }
        }
      }
    });
  }, [onEdgesChange, edges, nodes, dispatch]);

  // Zoom controls - defined early for use in handleAutoLayout
  const { zoomIn, zoomOut, fitView, setViewport, getNodes } = useReactFlow();
  const { zoom } = useViewport();

  // Auto-layout handler with direction support
  const handleAutoLayout = useCallback((direction?: 'horizontal' | 'vertical') => {
    const steps = state.spec.workflows[state.selectedWorkflowIndex]?.steps || [];
    if (steps.length === 0) return;
    
    const dir = direction || layoutDirection;
    const startX = 300;
    const startY = 150;
    
    // Calculate new positions
    const newPositions = new Map<string, { x: number; y: number }>();
    
    if (dir === 'horizontal') {
      // Horizontal layout: steps flow left to right in rows
      const gapX = 350;
      const gapY = 280;
      const maxRows = Math.max(2, Math.ceil(Math.sqrt(steps.length / 2)));
      
      steps.forEach((step, idx) => {
        const row = idx % maxRows;
        const col = Math.floor(idx / maxRows);
        newPositions.set(step.stepId, {
          x: startX + (col * gapX),
          y: startY + (row * gapY)
        });
      });
    } else {
      // Vertical layout: steps flow top to bottom in columns
      const gapX = 320;
      const gapY = 250;
      const maxCols = Math.max(2, Math.ceil(Math.sqrt(steps.length * 2)));
      
      steps.forEach((step, idx) => {
        const col = idx % maxCols;
        const row = Math.floor(idx / maxCols);
        newPositions.set(step.stepId, {
          x: startX + (col * gapX),
          y: startY + (row * gapY)
        });
      });
    }
    
    // Calculate bounds for input/output nodes
    let maxX = 0;
    newPositions.forEach(pos => {
      if (pos.x > maxX) maxX = pos.x;
    });
    
    // Update nodePositionsRef
    newPositions.forEach((pos, stepId) => {
      nodePositionsRef.current.set(stepId, pos);
    });
    nodePositionsRef.current.set('input', { x: 50, y: startY });
    nodePositionsRef.current.set('output', { x: maxX + 350, y: startY });
    
    // Apply positions directly to nodes
    setNodes(currentNodes => 
      currentNodes.map(node => {
        if (node.id === 'node-input') {
          return { ...node, position: { x: 50, y: startY } };
        }
        if (node.id === 'node-output') {
          return { ...node, position: { x: maxX + 350, y: startY } };
        }
        const stepId = node.data?.stepId as string;
        const newPos = newPositions.get(stepId);
        if (newPos) {
          return { ...node, position: newPos };
        }
        return node;
      })
    );
    
    // Fit view after layout
    setTimeout(() => fitView({ duration: 300, padding: 0.15 }), 100);
  }, [state.spec.workflows, state.selectedWorkflowIndex, setNodes, layoutDirection, fitView]);

  // Auto-layout when sample is loaded
  useEffect(() => {
    if (state.needsAutoLayout && nodes.length > 1) {
      // Wait a bit for nodes to be rendered, then auto-layout
      const timer = setTimeout(() => {
        handleAutoLayout('horizontal');
        dispatch({ type: 'CLEAR_AUTO_LAYOUT' });
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [state.needsAutoLayout, nodes.length, handleAutoLayout, dispatch]);

  // Delete selected nodes
  const handleDeleteSelected = useCallback(() => {
    selectedNodes.forEach(node => {
      if (node.data?.stepId) {
        dispatch({ type: 'DELETE_STEP', payload: { stepId: node.data.stepId as string } });
      }
    });
  }, [selectedNodes, dispatch]);

  // Count selected step nodes (not input/output)
  const selectedStepCount = selectedNodes.filter(n => n.type === 'step').length;
  
  const handleZoomIn = useCallback(() => zoomIn({ duration: 200 }), [zoomIn]);
  const handleZoomOut = useCallback(() => zoomOut({ duration: 200 }), [zoomOut]);
  const handleZoomReset = useCallback(() => setViewport({ x: 0, y: 0, zoom: 1 }, { duration: 200 }), [setViewport]);
  const handleZoomToFit = useCallback(() => fitView({ duration: 300, padding: 0.2 }), [fitView]);
  
  // Layout direction change
  const handleLayoutDirectionChange = useCallback((direction: 'horizontal' | 'vertical') => {
    setLayoutDirection(direction);
    handleAutoLayout(direction);
  }, [handleAutoLayout]);

  return (
    <div className="w-full h-full" ref={reactFlowWrapper}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        onDragOver={onDragOver}
        onDrop={onDrop}
        fitView
        panOnScroll
        selectionOnDrag
        panOnDrag
        selectionKeyCode="Shift"
        multiSelectionKeyCode="Shift"
        zoomOnScroll
        zoomOnPinch
        zoomOnDoubleClick={false}
      >
        <Background />
        <CanvasToolbar
          zoom={zoom}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onZoomReset={handleZoomReset}
          onZoomToFit={handleZoomToFit}
          onAutoLayout={() => handleAutoLayout()}
          layoutDirection={layoutDirection}
          onLayoutDirectionChange={handleLayoutDirectionChange}
          displayOptions={displayOptions}
          onDisplayOptionsChange={setDisplayOptions}
          selectedCount={selectedStepCount}
          onDeleteSelected={selectedStepCount > 0 ? handleDeleteSelected : undefined}
          position="bottom-center"
        />
      </ReactFlow>
    </div>
  );
}

export default function BuilderCanvas(props: BuilderCanvasProps) {
  return (
    <ReactFlowProvider>
      <BuilderCanvasContent {...props} />
    </ReactFlowProvider>
  );
}
