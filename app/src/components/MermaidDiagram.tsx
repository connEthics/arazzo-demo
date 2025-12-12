'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import mermaid from 'mermaid';
import type { Step, SourceDescription } from '@/types/arazzo';
import type { DetailData } from './DetailDrawer';

interface MermaidDiagramProps {
  chart: string;
  isDark?: boolean;
  steps?: Step[];
  sources?: SourceDescription[];
  workflowOutputs?: Record<string, string>;
  selectedStepId?: string | null;
  onDetailSelect?: (data: DetailData | null) => void;
  // Legacy prop for backward compatibility
  onStepSelect?: (step: Step | null) => void;
  // Simple callback for node clicks when steps not available
  onNodeClick?: (nodeId: string) => void;
}

export default function MermaidDiagram({ 
  chart, 
  isDark = false, 
  steps = [], 
  sources = [],
  workflowOutputs = {},
  selectedStepId,
  onDetailSelect,
  onStepSelect,
  onNodeClick
}: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [svgContent, setSvgContent] = useState<string>('');

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: isDark ? 'dark' : 'default',
      securityLevel: 'loose',
      flowchart: {
        useMaxWidth: false,
        htmlLabels: true,
        curve: 'basis',
      },
      sequence: {
        useMaxWidth: false,
        showSequenceNumbers: true,
        mirrorActors: false,
      },
    });
  }, [isDark]);

  useEffect(() => {
    const renderChart = async () => {
      if (!chart || !containerRef.current) return;

      try {
        setError(null);
        const id = `mermaid-${Date.now()}`;
        const { svg } = await mermaid.render(id, chart);
        setSvgContent(svg);
      } catch (e) {
        console.error('Mermaid render error:', e);
        setError(e instanceof Error ? e.message : 'Failed to render diagram');
        setSvgContent('');
      }
    };

    renderChart();
  }, [chart, isDark]);

  // Apply highlight to selected step
  useEffect(() => {
    if (!containerRef.current || !svgContent) return;
    
    const svg = containerRef.current.querySelector('svg');
    if (!svg) return;

    // Remove previous highlights
    svg.querySelectorAll('.selected-step-highlight').forEach(el => {
      el.classList.remove('selected-step-highlight');
    });

    if (!selectedStepId) return;

    // Find and highlight the selected step - be very specific
    const sanitizedId = selectedStepId.replace(/[^a-zA-Z0-9_]/g, '_');
    let found = false;
    
    // For flowcharts: find nodes by their ID which contains the step ID
    svg.querySelectorAll('.node').forEach(node => {
      const nodeId = node.id || '';
      // Match only if the node ID specifically contains our step ID
      // Mermaid generates IDs like "flowchart-stepId-123"
      if (nodeId.includes(`-${sanitizedId}-`) || 
          nodeId.includes(`-${sanitizedId}`) ||
          nodeId.endsWith(sanitizedId)) {
        node.classList.add('selected-step-highlight');
        found = true;
      }
    });

    // For sequence diagrams: find by text content in messageText or notes
    if (!found) {
      // Find all text elements and check if they contain the step ID
      svg.querySelectorAll('.messageText, text').forEach(textEl => {
        const text = textEl.textContent || '';
        if (text.includes(selectedStepId)) {
          // Highlight the parent group or the message line
          const parentGroup = textEl.closest('g');
          if (parentGroup) {
            // Find the associated line or rect
            const line = parentGroup.querySelector('line');
            const rect = parentGroup.querySelector('rect');
            if (line) {
              line.classList.add('selected-step-highlight');
              found = true;
            }
            if (rect) {
              parentGroup.classList.add('selected-step-highlight');
              found = true;
            }
            // Also highlight the text itself
            if (!found) {
              parentGroup.classList.add('selected-step-highlight');
              found = true;
            }
          }
        }
      });

      // Also check notes which may contain step info
      svg.querySelectorAll('.note').forEach(note => {
        const noteText = note.textContent || '';
        if (noteText.includes(selectedStepId)) {
          note.classList.add('selected-step-highlight');
        }
      });
    }
  }, [svgContent, selectedStepId]);

  // Handle click on SVG elements
  const handleClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as Element;
    
    // Helper to find source for a step
    const getSourceForStep = (step: Step) => {
      if (step.operationId?.includes('.')) {
        const sourceName = step.operationId.split('.')[0];
        return sources.find(s => s.name === sourceName);
      }
      return sources[0];
    };
    
    // Find the closest group element
    const noteGroup = target.closest('g');
    if (!noteGroup) {
      // Click on background - close panel
      if ((target as HTMLElement).tagName === 'svg' || 
          (target as HTMLElement).classList?.contains('mermaid-container')) {
        onDetailSelect?.(null);
        onStepSelect?.(null);
      }
      return;
    }
    
    // Get text content from this group
    const textElements = noteGroup.querySelectorAll('text, tspan');
    let groupText = '';
    textElements.forEach(el => {
      groupText += ' ' + (el.textContent || '');
    });
    groupText = groupText.trim();
    
    const groupId = noteGroup.id || '';
    
    // Check if this is an actor (sequence diagram participant)
    const actorBox = target.closest('.actor-box, .actor');
    if (actorBox || noteGroup.classList.contains('actor')) {
      // Find which source this actor represents
      for (const source of sources) {
        if (groupText.includes(source.name) || groupId.includes(source.name)) {
          e.stopPropagation();
          onDetailSelect?.({ type: 'source', source });
          return;
        }
      }
      // Also check for Client actor
      if (groupText.includes('Client') || groupText.includes('Workflow')) {
        e.stopPropagation();
        onDetailSelect?.({ 
          type: 'source', 
          source: { name: 'Client', url: '', type: 'arazzo', description: 'The workflow client initiating the API calls' } 
        });
        return;
      }
    }

    // Check for output messages (dashed lines with output text)
    const outputMatch = groupText.match(/output[s]?\s*[:\s]\s*(\w+)/i);
    if (outputMatch) {
      const outputName = outputMatch[1];
      // Find which step this output belongs to
      for (const step of steps) {
        if (step.outputs && step.outputs[outputName]) {
          e.stopPropagation();
          onDetailSelect?.({ 
            type: 'output', 
            output: { name: outputName, value: step.outputs[outputName], stepId: step.stepId } 
          });
          return;
        }
      }
      // Check workflow outputs
      if (workflowOutputs[outputName]) {
        e.stopPropagation();
        onDetailSelect?.({ 
          type: 'output', 
          output: { name: outputName, value: workflowOutputs[outputName] } 
        });
        return;
      }
    }

    // Check for input references
    const inputMatch = groupText.match(/\$inputs\.(\w+)/);
    if (inputMatch) {
      const inputName = inputMatch[1];
      e.stopPropagation();
      onDetailSelect?.({ 
        type: 'input', 
        input: { name: inputName, schema: {} } 
      });
      return;
    }
    
    // Find the step that matches this specific group's text
    for (const step of steps) {
      const stepIdRegex = new RegExp(`(^|[^a-zA-Z0-9_-])${step.stepId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^a-zA-Z0-9_-])`);
      
      if (stepIdRegex.test(groupText) || groupId.includes(step.stepId)) {
        e.stopPropagation();
        // Find the source for this step
        const sourceForStep = getSourceForStep(step);
        onDetailSelect?.({ type: 'step', step, sourceForStep });
        onStepSelect?.(step);
        onNodeClick?.(step.stepId);
        return;
      }
    }
    
    // For flowchart nodes, also check parent groups
    const nodeElement = target.closest('.node, .cluster, [id*="flowchart"]');
    if (nodeElement) {
      const nodeId = nodeElement.id || '';
      const nodeText = nodeElement.textContent || '';
      
      for (const step of steps) {
        const sanitizedId = step.stepId.replace(/[^a-zA-Z0-9_]/g, '_');
        if (nodeId.includes(sanitizedId) || nodeText.includes(step.stepId)) {
          e.stopPropagation();
          const sourceForStep = getSourceForStep(step);
          onDetailSelect?.({ type: 'step', step, sourceForStep });
          onStepSelect?.(step);
          onNodeClick?.(step.stepId);
          return;
        }
      }
      
      // If no steps provided but we have onNodeClick, try to extract step ID from node
      if (onNodeClick && steps.length === 0) {
        // Try to find step ID pattern in node text or ID
        const stepIdMatch = nodeText.match(/([a-z][a-z0-9_-]*)/i);
        if (stepIdMatch) {
          e.stopPropagation();
          onNodeClick(stepIdMatch[1]);
          return;
        }
      }
    }
  }, [onDetailSelect, onStepSelect, onNodeClick, steps, sources, workflowOutputs]);

  if (error) {
    return (
      <div className={`flex items-center justify-center h-full p-4 ${isDark ? 'text-red-400' : 'text-red-600'}`}>
        <div className="text-center">
          <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm">Mermaid Error</p>
          <p className="text-xs mt-1 opacity-75">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      onClick={handleClick}
      className={`mermaid-container w-full h-full overflow-auto p-6 pt-8 cursor-pointer`}
      style={{ minHeight: '100%' }}
    >
      <div 
        className="inline-block min-w-max"
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />
      <style jsx global>{`
        .mermaid-container .node:hover,
        .mermaid-container .messageText:hover,
        .mermaid-container .actor:hover,
        .mermaid-container .actor-box:hover,
        .mermaid-container .note:hover,
        .mermaid-container [class*="note"]:hover {
          filter: brightness(1.1);
          cursor: pointer;
        }
        .mermaid-container .node rect,
        .mermaid-container .node polygon,
        .mermaid-container .actor rect,
        .mermaid-container .note rect {
          transition: filter 0.15s ease, stroke 0.2s ease, stroke-width 0.2s ease;
        }
        .mermaid-container text {
          cursor: pointer;
        }
        /* Selected step highlight */
        .mermaid-container .selected-step-highlight rect,
        .mermaid-container .selected-step-highlight polygon,
        .mermaid-container .selected-step-highlight circle {
          stroke: #6366f1 !important;
          stroke-width: 3px !important;
          filter: drop-shadow(0 0 8px rgba(99, 102, 241, 0.6));
        }
        /* Sequence diagram line highlight */
        .mermaid-container line.selected-step-highlight {
          stroke: #6366f1 !important;
          stroke-width: 3px !important;
          filter: drop-shadow(0 0 8px rgba(99, 102, 241, 0.6));
        }
        /* Sequence diagram text highlight */
        .mermaid-container .selected-step-highlight text,
        .mermaid-container .selected-step-highlight .messageText {
          fill: #6366f1 !important;
          font-weight: bold !important;
        }
        .mermaid-container .selected-step-highlight {
          animation: pulse-highlight 2s ease-in-out infinite;
        }
        @keyframes pulse-highlight {
          0%, 100% {
            filter: drop-shadow(0 0 6px rgba(99, 102, 241, 0.5));
          }
          50% {
            filter: drop-shadow(0 0 12px rgba(99, 102, 241, 0.8));
          }
        }
      `}</style>
    </div>
  );
}
