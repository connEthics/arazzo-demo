'use client';

import { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  ConnectionMode,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { InputNode, StepNode, OutputNode } from './nodes';

// Register custom node types
const nodeTypes = {
  input: InputNode,
  step: StepNode,
  output: OutputNode,
};

// Custom edge styles
const defaultEdgeOptions = {
  type: 'smoothstep',
  animated: true,
  style: { stroke: '#6366f1', strokeWidth: 2 },
};

interface ArazzoFlowProps {
  nodes: Node[];
  edges: Edge[];
  workflowId?: string;
  isDark?: boolean;
}

export default function ArazzoFlow({ nodes: initialNodes, edges: initialEdges, workflowId, isDark = false }: ArazzoFlowProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes/edges when props change
  useMemo(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    console.log('Node clicked:', node);
  }, []);

  return (
    <div className={`w-full h-full rounded-lg overflow-hidden transition-colors ${isDark ? 'bg-slate-900' : 'bg-gray-50'}`}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        connectionMode={ConnectionMode.Loose}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        attributionPosition="bottom-left"
      >
        <Background 
          variant={BackgroundVariant.Dots} 
          gap={20} 
          size={1} 
          color={isDark ? '#334155' : '#d1d5db'} 
        />
        <Controls 
          className={`rounded-lg ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}
          showZoom={true}
          showFitView={true}
          showInteractive={true}
        />
        <MiniMap
          className={`rounded-lg ${isDark ? 'bg-slate-800' : 'bg-white border border-gray-200'}`}
          nodeColor={(node) => {
            switch (node.type) {
              case 'input':
                return '#22c55e';
              case 'output':
                return '#f59e0b';
              case 'step':
                return '#6366f1';
              default:
                return '#64748b';
            }
          }}
          maskColor={isDark ? 'rgba(15, 23, 42, 0.8)' : 'rgba(249, 250, 251, 0.8)'}
        />
      </ReactFlow>
      
      {workflowId && (
        <div className={`absolute top-4 left-4 backdrop-blur px-3 py-1.5 rounded-lg border transition-colors ${isDark ? 'bg-slate-800/90 border-slate-700' : 'bg-white/90 border-gray-200'}`}>
          <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Workflow:</span>
          <span className={`font-mono ml-2 text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{workflowId}</span>
        </div>
      )}
    </div>
  );
}
