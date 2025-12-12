'use client';

import { useCallback, useMemo, useState, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  ConnectionMode,
  BackgroundVariant,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import ELK from 'elkjs/lib/elk.bundled.js';

import { InputNode, StepNode, OutputNode } from './nodes';
import type { Step } from '@/types/arazzo';
import type { DetailData } from './DetailDrawer';

// Initialize ELK
const elk = new ELK();

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

export type LayoutDirection = 'horizontal' | 'vertical';

interface ArazzoFlowProps {
  nodes: Node[];
  edges: Edge[];
  workflowId?: string;
  isDark?: boolean;
  onDetailSelect?: (data: DetailData | null) => void;
  // Legacy prop for backward compatibility
  onStepSelect?: (step: Step | null) => void;
}

// ─────────────────────────────────────────────────────────────────────────────────
// ELK Layout Engine
// ─────────────────────────────────────────────────────────────────────────────────

const NODE_WIDTH = 280;
const NODE_HEIGHT = 100;

async function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
  direction: LayoutDirection
): Promise<{ nodes: Node[]; edges: Edge[] }> {
  const isHorizontal = direction === 'horizontal';
  
  const elkGraph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': isHorizontal ? 'RIGHT' : 'DOWN',
      'elk.spacing.nodeNode': '60',
      'elk.layered.spacing.nodeNodeBetweenLayers': '80',
      'elk.layered.spacing.edgeNodeBetweenLayers': '40',
      'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
      'elk.edgeRouting': 'SPLINES',
      'elk.layered.mergeEdges': 'true',
      'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
    },
    children: nodes.map((node) => ({
      id: node.id,
      width: node.type === 'step' ? NODE_WIDTH : NODE_WIDTH - 40,
      height: node.type === 'step' ? NODE_HEIGHT : NODE_HEIGHT - 20,
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
    })),
  };

  const layoutedGraph = await elk.layout(elkGraph);

  const layoutedNodes = nodes.map((node) => {
    const layoutedNode = layoutedGraph.children?.find((n) => n.id === node.id);
    return {
      ...node,
      position: {
        x: layoutedNode?.x ?? node.position.x,
        y: layoutedNode?.y ?? node.position.y,
      },
      data: {
        ...node.data,
        direction, // Pass direction to node for handle positioning
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}

// ─────────────────────────────────────────────────────────────────────────────────
// Direction Toggle Icons
// ─────────────────────────────────────────────────────────────────────────────────

const HorizontalIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
  </svg>
);

const VerticalIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
  </svg>
);

// ─────────────────────────────────────────────────────────────────────────────────
// Inner Flow Component
// ─────────────────────────────────────────────────────────────────────────────────

interface FlowContentProps {
  initialNodes: Node[];
  initialEdges: Edge[];
  workflowId?: string;
  isDark: boolean;
  onDetailSelect?: (data: DetailData | null) => void;
  onStepSelect?: (step: Step | null) => void;
}

function FlowContent({ 
  initialNodes, 
  initialEdges, 
  workflowId, 
  isDark, 
  onDetailSelect, 
  onStepSelect 
}: FlowContentProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [direction, setDirection] = useState<LayoutDirection>('vertical');
  const [isLayouting, setIsLayouting] = useState(false);

  // Apply ELK layout
  const applyLayout = useCallback(async (nodesToLayout: Node[], edgesToLayout: Edge[], dir: LayoutDirection) => {
    if (nodesToLayout.length === 0) return;
    
    setIsLayouting(true);
    try {
      const { nodes: layoutedNodes, edges: layoutedEdges } = await getLayoutedElements(
        nodesToLayout,
        edgesToLayout,
        dir
      );
      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
    } catch (error) {
      console.error('Layout error:', error);
      // Fallback to original positions
      setNodes(nodesToLayout);
      setEdges(edgesToLayout);
    }
    setIsLayouting(false);
  }, [setNodes, setEdges]);

  // Apply layout when nodes/edges or direction changes
  useEffect(() => {
    applyLayout(initialNodes, initialEdges, direction);
  }, [initialNodes, initialEdges, direction, applyLayout]);

  const handleDirectionChange = useCallback((newDirection: LayoutDirection) => {
    setDirection(newDirection);
  }, []);

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    if (node.type === 'step' && node.data?.step) {
      const step = node.data.step as Step;
      onDetailSelect?.({ type: 'step', step });
      onStepSelect?.(step);
    } else if (node.type === 'input' && node.data) {
      onDetailSelect?.({
        type: 'input',
        input: {
          name: 'Workflow Inputs',
          schema: {}
        }
      });
    } else if (node.type === 'output' && node.data) {
      const outputData = node.data as {
        label: string;
        properties: string[];
        expressions: Record<string, string>;
      };
      onDetailSelect?.({
        type: 'output',
        output: {
          name: 'Workflow Outputs',
          value: '',
          allOutputs: outputData.expressions
        }
      });
    }
  }, [onDetailSelect, onStepSelect]);

  const onPaneClick = useCallback(() => {
    onDetailSelect?.(null);
    onStepSelect?.(null);
  }, [onDetailSelect, onStepSelect]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={onNodeClick}
      onPaneClick={onPaneClick}
      nodeTypes={nodeTypes}
      defaultEdgeOptions={defaultEdgeOptions}
      connectionMode={ConnectionMode.Loose}
      fitView
      fitViewOptions={{ padding: 0.3, maxZoom: 1.5 }}
      minZoom={0.1}
      maxZoom={2}
      nodesDraggable={true}
      nodesConnectable={false}
      elementsSelectable={true}
      panOnScroll={true}
      zoomOnScroll={true}
      zoomOnDoubleClick={true}
      selectNodesOnDrag={false}
      proOptions={{ hideAttribution: true }}
    >
      <Background 
        variant={BackgroundVariant.Dots} 
        gap={20} 
        size={1} 
        color={isDark ? '#334155' : '#d1d5db'} 
      />
      <Controls 
        showInteractive={false}
        className={`rounded-lg ${isDark ? '[&>button]:bg-slate-800 [&>button]:border-slate-700 [&>button]:text-white [&>button]:hover:bg-slate-700' : 'bg-white border-gray-200'}`}
      />
      <MiniMap
        className={`rounded-lg ${isDark ? '!bg-slate-800 !border-slate-700' : '!bg-white !border-gray-200'}`}
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
        pannable
        zoomable
      />
      
      {/* Direction Toggle Panel */}
      <Panel position="top-right" className="flex gap-1">
        <button
          onClick={() => handleDirectionChange('horizontal')}
          disabled={isLayouting}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            direction === 'horizontal'
              ? 'bg-indigo-600 text-white shadow-lg'
              : isDark
                ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200 shadow-sm'
          } ${isLayouting ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <HorizontalIcon />
          Horizontal
        </button>
        <button
          onClick={() => handleDirectionChange('vertical')}
          disabled={isLayouting}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            direction === 'vertical'
              ? 'bg-indigo-600 text-white shadow-lg'
              : isDark
                ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200 shadow-sm'
          } ${isLayouting ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <VerticalIcon />
          Vertical
        </button>
      </Panel>
      
      {/* Workflow ID Badge */}
      {workflowId && (
        <Panel position="top-left">
          <div className={`backdrop-blur px-3 py-1.5 rounded-lg border transition-colors ${isDark ? 'bg-slate-800/90 border-slate-700' : 'bg-white/90 border-gray-200 shadow-sm'}`}>
            <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Workflow:</span>
            <span className={`font-mono ml-2 text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{workflowId}</span>
          </div>
        </Panel>
      )}
      
      {/* Loading overlay */}
      {isLayouting && (
        <Panel position="top-center">
          <div className={`px-3 py-1.5 rounded-lg text-xs ${
            isDark ? 'bg-slate-800 text-slate-300 border border-slate-700' : 'bg-white text-gray-600 shadow-md'
          }`}>
            Calculating layout...
          </div>
        </Panel>
      )}
    </ReactFlow>
  );
}

// ─────────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────────

export default function ArazzoFlow({ 
  nodes: initialNodes, 
  edges: initialEdges, 
  workflowId, 
  isDark = false, 
  onDetailSelect,
  onStepSelect 
}: ArazzoFlowProps) {
  return (
    <div className={`w-full h-full rounded-lg overflow-hidden transition-colors ${isDark ? 'bg-slate-900' : 'bg-gray-50'}`}>
      <ReactFlowProvider>
        <FlowContent
          initialNodes={initialNodes}
          initialEdges={initialEdges}
          workflowId={workflowId}
          isDark={isDark}
          onDetailSelect={onDetailSelect}
          onStepSelect={onStepSelect}
        />
      </ReactFlowProvider>
    </div>
  );
}
