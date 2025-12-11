'use client';

import React, { useCallback } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Workflow } from '@/lib/types';

interface WorkflowVisualizerProps {
  workflow: Workflow;
}

const WorkflowVisualizer: React.FC<WorkflowVisualizerProps> = ({ workflow }) => {
  const createNodesAndEdges = useCallback(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Create start node
    nodes.push({
      id: 'start',
      type: 'input',
      data: { label: '▶ Start' },
      position: { x: 250, y: 0 },
      style: {
        background: '#10b981',
        color: 'white',
        border: '2px solid #059669',
        borderRadius: '8px',
        padding: '10px',
        fontWeight: 'bold',
      },
    });

    // Create step nodes
    workflow.steps.forEach((step, index) => {
      const yPosition = 100 + index * 150;
      const operationType = step.operationId || step.operationPath || step.workflowId || 'unknown';
      
      nodes.push({
        id: step.stepId,
        data: {
          label: (
            <div className="text-sm">
              <div className="font-bold mb-1">{step.stepId}</div>
              <div className="text-xs text-gray-600">{step.description || operationType}</div>
            </div>
          ),
        },
        position: { x: 250, y: yPosition },
        style: {
          background: '#3b82f6',
          color: 'white',
          border: '2px solid #2563eb',
          borderRadius: '8px',
          padding: '12px',
          minWidth: '200px',
        },
      });

      // Create edge from previous step or start
      if (index === 0) {
        edges.push({
          id: `start-${step.stepId}`,
          source: 'start',
          target: step.stepId,
          type: 'smoothstep',
          animated: true,
          markerEnd: {
            type: MarkerType.ArrowClosed,
          },
        });
      } else {
        edges.push({
          id: `${workflow.steps[index - 1].stepId}-${step.stepId}`,
          source: workflow.steps[index - 1].stepId,
          target: step.stepId,
          type: 'smoothstep',
          animated: true,
          markerEnd: {
            type: MarkerType.ArrowClosed,
          },
        });
      }
    });

    // Create end node
    const lastStep = workflow.steps[workflow.steps.length - 1];
    const endYPosition = 100 + workflow.steps.length * 150;
    nodes.push({
      id: 'end',
      type: 'output',
      data: { label: '✓ Complete' },
      position: { x: 250, y: endYPosition },
      style: {
        background: '#8b5cf6',
        color: 'white',
        border: '2px solid #7c3aed',
        borderRadius: '8px',
        padding: '10px',
        fontWeight: 'bold',
      },
    });

    edges.push({
      id: `${lastStep.stepId}-end`,
      source: lastStep.stepId,
      target: 'end',
      type: 'smoothstep',
      animated: true,
      markerEnd: {
        type: MarkerType.ArrowClosed,
      },
    });

    return { nodes, edges };
  }, [workflow]);

  const { nodes: initialNodes, edges: initialEdges } = createNodesAndEdges();
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  return (
    <div className="w-full h-[600px] bg-gray-50 rounded-lg border-2 border-gray-200">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
};

export default WorkflowVisualizer;
