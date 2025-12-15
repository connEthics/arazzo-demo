'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import mermaid from 'mermaid';
import type { Step, SourceDescription, WorkflowInputs } from '@/types/arazzo';
import type { DetailData } from './DetailDrawer';

interface MermaidDiagramProps {
  chart: string;
  isDark?: boolean;
  steps?: Step[];
  sources?: SourceDescription[];
  workflowInputs?: WorkflowInputs;
  workflowOutputs?: Record<string, string>;
  selectedStepId?: string | null;
  selectedType?: 'step' | 'input' | 'output' | null;
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
  workflowInputs,
  workflowOutputs = {},
  selectedStepId,
  selectedType,
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
        mirrorActors: true,
        actorMargin: 80,
        messageMargin: 40,
        boxMargin: 10,
        boxTextMargin: 5,
        noteMargin: 10,
        bottomMarginAdj: 10,
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

  // Apply highlight to selected element (step, input, or output)
  useEffect(() => {
    if (!containerRef.current || !svgContent) return;
    
    const svg = containerRef.current.querySelector('svg');
    if (!svg) return;

    // Remove previous highlights
    svg.querySelectorAll('.selected-step-highlight, .selected-input-highlight, .selected-output-highlight').forEach(el => {
      el.classList.remove('selected-step-highlight', 'selected-input-highlight', 'selected-output-highlight');
    });

    // Determine highlight class based on selection type
    const getHighlightClass = () => {
      if (selectedType === 'input') return 'selected-input-highlight';
      if (selectedType === 'output') return 'selected-output-highlight';
      return 'selected-step-highlight';
    };
    const highlightClass = getHighlightClass();

    // Handle input selection
    if (selectedType === 'input') {
      // Flowchart: find INPUT node
      svg.querySelectorAll('.node').forEach(node => {
        const nodeId = (node.id || '').toLowerCase();
        const nodeText = (node.textContent || '').toLowerCase();
        if (nodeId.includes('input') || nodeText.includes('📥') || nodeText.includes('inputs')) {
          node.classList.add(highlightClass);
        }
      });
      // Sequence: find 🚀 note
      svg.querySelectorAll('.note, [class*="note"]').forEach(note => {
        const noteText = note.textContent || '';
        if (noteText.includes('🚀')) {
          note.classList.add(highlightClass);
        }
      });
      return;
    }

    // Handle output selection
    if (selectedType === 'output') {
      // Flowchart: find OUTPUT node
      svg.querySelectorAll('.node').forEach(node => {
        const nodeId = (node.id || '').toLowerCase();
        const nodeText = (node.textContent || '').toLowerCase();
        if (nodeId.includes('output') || nodeText.includes('📤') || nodeText.includes('outputs')) {
          node.classList.add(highlightClass);
        }
      });
      // Sequence: find ✅ note
      svg.querySelectorAll('.note, [class*="note"]').forEach(note => {
        const noteText = note.textContent || '';
        if (noteText.includes('✅')) {
          note.classList.add(highlightClass);
        }
      });
      return;
    }

    // Handle step selection
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
        node.classList.add(highlightClass);
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
              line.classList.add(highlightClass);
              found = true;
            }
            if (rect) {
              parentGroup.classList.add(highlightClass);
              found = true;
            }
            // Also highlight the text itself
            if (!found) {
              parentGroup.classList.add(highlightClass);
              found = true;
            }
          }
        }
      });

      // Also check notes which may contain step info
      svg.querySelectorAll('.note').forEach(note => {
        const noteText = note.textContent || '';
        if (noteText.includes(selectedStepId)) {
          note.classList.add(highlightClass);
        }
      });
    }
  }, [svgContent, selectedStepId, selectedType]);

  // Apply consistent colors to sequence diagram notes based on content
  useEffect(() => {
    if (!containerRef.current || !svgContent) return;
    
    const svg = containerRef.current.querySelector('svg');
    if (!svg) return;

    // Find all note groups - Mermaid uses various selectors
    // Look for g elements that contain both a rect and text with note content
    const allGroups = svg.querySelectorAll('g');
    
    allGroups.forEach(group => {
      const rect = group.querySelector('rect');
      const textContent = group.textContent || '';
      
      // Skip if no rect or this is an actor/other element
      if (!rect) return;
      
      // Check if this group contains note-like content (emojis we use)
      const isInputNote = textContent.includes('🚀');
      const isOutputNote = textContent.includes('✅');
      const isStepOutputNote = textContent.includes('📦');
      const isStepNote = textContent.includes('🔹') || textContent.includes('📌');
      
      // Only process if it matches one of our note types
      if (!isInputNote && !isOutputNote && !isStepOutputNote && !isStepNote) return;
      
      const groupEl = group as unknown as HTMLElement;
      
      if (isInputNote) {
        // Input note - Green, CLICKABLE with visual indicator
        rect.setAttribute('fill', '#d1fae5');
        rect.setAttribute('stroke', '#10b981');
        rect.setAttribute('stroke-width', '2.5');
        rect.setAttribute('rx', '8');
        rect.setAttribute('ry', '8');
        rect.style.cursor = 'pointer';
        rect.style.filter = 'drop-shadow(0 2px 4px rgba(16, 185, 129, 0.3))';
        
        groupEl.style.cursor = 'pointer';
        groupEl.onmouseenter = () => {
          rect.setAttribute('stroke-width', '3');
          rect.style.filter = 'drop-shadow(0 4px 8px rgba(16, 185, 129, 0.5))';
        };
        groupEl.onmouseleave = () => {
          rect.setAttribute('stroke-width', '2.5');
          rect.style.filter = 'drop-shadow(0 2px 4px rgba(16, 185, 129, 0.3))';
        };
      } else if (isOutputNote) {
        // Output note - Amber, CLICKABLE with visual indicator
        rect.setAttribute('fill', '#fef3c7');
        rect.setAttribute('stroke', '#f59e0b');
        rect.setAttribute('stroke-width', '2.5');
        rect.setAttribute('rx', '8');
        rect.setAttribute('ry', '8');
        rect.style.cursor = 'pointer';
        rect.style.filter = 'drop-shadow(0 2px 4px rgba(245, 158, 11, 0.3))';
        
        groupEl.style.cursor = 'pointer';
        groupEl.onmouseenter = () => {
          rect.setAttribute('stroke-width', '3');
          rect.style.filter = 'drop-shadow(0 4px 8px rgba(245, 158, 11, 0.5))';
        };
        groupEl.onmouseleave = () => {
          rect.setAttribute('stroke-width', '2.5');
          rect.style.filter = 'drop-shadow(0 2px 4px rgba(245, 158, 11, 0.3))';
        };
      } else if (isStepOutputNote) {
        // Step output - Light gray, NOT clickable (info only)
        rect.setAttribute('fill', '#f8fafc');
        rect.setAttribute('stroke', '#cbd5e1');
        rect.setAttribute('stroke-width', '1');
        rect.setAttribute('rx', '4');
        rect.setAttribute('ry', '4');
        rect.style.cursor = 'default';
        groupEl.style.pointerEvents = 'none';
      } else if (isStepNote) {
        // Step header note - Blue/Indigo style, CLICKABLE
        rect.setAttribute('fill', '#e0e7ff');
        rect.setAttribute('stroke', '#6366f1');
        rect.setAttribute('stroke-width', '2.5');
        rect.setAttribute('rx', '8');
        rect.setAttribute('ry', '8');
        rect.style.cursor = 'pointer';
        rect.style.filter = 'drop-shadow(0 2px 6px rgba(99, 102, 241, 0.3))';
        
        groupEl.style.cursor = 'pointer';
        groupEl.onmouseenter = () => {
          rect.setAttribute('stroke-width', '3');
          rect.setAttribute('fill', '#c7d2fe');
          rect.style.filter = 'drop-shadow(0 4px 10px rgba(99, 102, 241, 0.5))';
        };
        groupEl.onmouseleave = () => {
          rect.setAttribute('stroke-width', '2.5');
          rect.setAttribute('fill', '#e0e7ff');
          rect.style.filter = 'drop-shadow(0 2px 6px rgba(99, 102, 241, 0.3))';
        };
      }
    });

    // Disable click on actors
    svg.querySelectorAll('.actor').forEach(actor => {
      (actor as HTMLElement).style.pointerEvents = 'none';
    });
  }, [svgContent, selectedStepId, selectedType]);

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
    
    // Also check parent node element for flowchart
    const nodeElement = target.closest('.node, [id*="flowchart"]');
    const nodeId = nodeElement?.id || '';
    const nodeText = nodeElement?.textContent || '';
    
    // Check for INPUT node click (flowchart) - check FIRST before other checks
    // Mermaid generates IDs like "flowchart-INPUT-0" for node INPUT
    const isInputNode = groupText.includes('📥') || 
                        nodeText.includes('📥') ||
                        groupText.toLowerCase().includes('inputs:') ||
                        nodeText.toLowerCase().includes('inputs:') ||
                        nodeId.toLowerCase().includes('input') ||
                        groupId.toLowerCase().includes('input');
    if (isInputNode) {
      e.stopPropagation();
      onDetailSelect?.({ 
        type: 'input', 
        input: { 
          name: 'Workflow Inputs', 
          schema: workflowInputs?.properties || {} 
        } 
      });
      return;
    }

    // Check for OUTPUT node click (flowchart)
    // Mermaid generates IDs like "flowchart-OUTPUT-0" for node OUTPUT
    const isOutputNode = groupText.includes('📤') || 
                         nodeText.includes('📤') ||
                         groupText.toLowerCase().includes('outputs:') ||
                         nodeText.toLowerCase().includes('outputs:') ||
                         nodeId.toLowerCase().includes('output') ||
                         groupId.toLowerCase().includes('output');
    if (isOutputNode) {
      e.stopPropagation();
      onDetailSelect?.({ 
        type: 'output', 
        output: { 
          name: 'Workflow Outputs', 
          value: '', 
          allOutputs: workflowOutputs 
        } 
      });
      return;
    }
    
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

    // Check for sequence diagram notes with workflow summary (input)
    const workflowStartMatch = groupText.match(/🚀/i);
    if (workflowStartMatch) {
      e.stopPropagation();
      onDetailSelect?.({ 
        type: 'input', 
        input: { 
          name: 'Workflow Inputs', 
          schema: workflowInputs?.properties || {} 
        } 
      });
      return;
    }

    // Check for step header notes (🔹) - these are clickable step identifiers
    if (groupText.includes('🔹')) {
      // Extract step info from the note text: "🔹 1. [GET] step-id"
      for (const step of steps) {
        if (groupText.includes(step.stepId)) {
          e.stopPropagation();
          const sourceForStep = getSourceForStep(step);
          onDetailSelect?.({ type: 'step', step, sourceForStep });
          onStepSelect?.(step);
          onNodeClick?.(step.stepId);
          return;
        }
      }
    }

    // Check for sequence diagram final note with outputs (✅ Complete)
    const workflowCompleteMatch = groupText.match(/✅\s*Complete/i);
    if (workflowCompleteMatch) {
      e.stopPropagation();
      onDetailSelect?.({ 
        type: 'output', 
        output: { 
          name: 'Workflow Outputs', 
          value: '', 
          allOutputs: workflowOutputs 
        } 
      });
      return;
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
    const flowchartNodeElement = target.closest('.node, .cluster, [id*="flowchart"]');
    if (flowchartNodeElement) {
      const flowNodeId = flowchartNodeElement.id || '';
      const flowNodeText = flowchartNodeElement.textContent || '';
      
      for (const step of steps) {
        const sanitizedId = step.stepId.replace(/[^a-zA-Z0-9_]/g, '_');
        if (flowNodeId.includes(sanitizedId) || flowNodeText.includes(step.stepId)) {
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
        const stepIdMatch = flowNodeText.match(/([a-z][a-z0-9_-]*)/i);
        if (stepIdMatch) {
          e.stopPropagation();
          onNodeClick(stepIdMatch[1]);
          return;
        }
      }
    }
  }, [onDetailSelect, onStepSelect, onNodeClick, steps, sources, workflowOutputs, workflowInputs]);

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
        /* Clickable elements - visual hint */
        .mermaid-container .node,
        .mermaid-container .actor,
        .mermaid-container .actor-box,
        .mermaid-container .note,
        .mermaid-container [class*="note"] {
          cursor: pointer;
        }
        
        /* ===== PERMANENT VISUAL INDICATORS FOR CLICKABLE ELEMENTS ===== */
        
        /* Notes are clickable - add permanent visual indicator */
        .mermaid-container .note rect {
          filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.15));
        }
        
        /* Actors are clickable - add subtle shadow */
        .mermaid-container .actor rect {
          filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1));
        }
        
        /* ===== HOVER EFFECTS ===== */
        
        /* Flowchart nodes hover */
        .mermaid-container .node:hover rect,
        .mermaid-container .node:hover polygon {
          filter: brightness(1.05);
          stroke-width: 2.5px !important;
        }
        
        /* Sequence diagram - Actor hover (blue) */
        .mermaid-container .actor:hover rect,
        .mermaid-container .actor-box:hover rect {
          stroke: #6366f1 !important;
          stroke-width: 2.5px !important;
          filter: drop-shadow(0 2px 6px rgba(99, 102, 241, 0.4));
        }
        
        /* Sequence diagram - Notes hover - enhanced shadow */
        .mermaid-container .note:hover rect {
          stroke-width: 2.5px !important;
          filter: drop-shadow(0 3px 8px rgba(0, 0, 0, 0.25));
          transform: translateY(-1px);
        }
        
        /* Message text and lines - NOT clickable, no hover effect */
        .mermaid-container .messageText,
        .mermaid-container line,
        .mermaid-container path.messageLine0,
        .mermaid-container path.messageLine1 {
          pointer-events: none;
        }
        
        /* Smooth transitions for all interactive elements */
        .mermaid-container .node rect,
        .mermaid-container .node polygon,
        .mermaid-container .actor rect,
        .mermaid-container .note rect,
        .mermaid-container line,
        .mermaid-container .messageText,
        .mermaid-container path {
          transition: filter 0.15s ease, stroke 0.15s ease, stroke-width 0.15s ease, fill 0.15s ease;
        }
        
        .mermaid-container text {
          cursor: pointer;
          transition: fill 0.15s ease, font-weight 0.15s ease;
        }
        
        /* ===== STEP SELECTION (Blue/Indigo) ===== */
        .mermaid-container .selected-step-highlight rect,
        .mermaid-container .selected-step-highlight polygon,
        .mermaid-container .selected-step-highlight circle {
          stroke: #6366f1 !important;
          stroke-width: 3px !important;
          filter: drop-shadow(0 0 8px rgba(99, 102, 241, 0.6));
        }
        .mermaid-container line.selected-step-highlight {
          stroke: #6366f1 !important;
          stroke-width: 3px !important;
          filter: drop-shadow(0 0 8px rgba(99, 102, 241, 0.6));
        }
        .mermaid-container .selected-step-highlight text,
        .mermaid-container .selected-step-highlight .messageText {
          fill: #6366f1 !important;
          font-weight: bold !important;
        }
        .mermaid-container .selected-step-highlight {
          animation: pulse-step 2s ease-in-out infinite;
        }
        @keyframes pulse-step {
          0%, 100% { filter: drop-shadow(0 0 6px rgba(99, 102, 241, 0.5)); }
          50% { filter: drop-shadow(0 0 12px rgba(99, 102, 241, 0.8)); }
        }
        
        /* ===== INPUT SELECTION (Green/Emerald) ===== */
        .mermaid-container .selected-input-highlight rect,
        .mermaid-container .selected-input-highlight polygon,
        .mermaid-container .selected-input-highlight circle {
          stroke: #10b981 !important;
          stroke-width: 3px !important;
          fill: #d1fae5 !important;
          filter: drop-shadow(0 0 8px rgba(16, 185, 129, 0.6));
        }
        .mermaid-container line.selected-input-highlight {
          stroke: #10b981 !important;
          stroke-width: 3px !important;
          filter: drop-shadow(0 0 8px rgba(16, 185, 129, 0.6));
        }
        .mermaid-container .selected-input-highlight text,
        .mermaid-container .selected-input-highlight .messageText {
          fill: #10b981 !important;
          font-weight: bold !important;
        }
        .mermaid-container .selected-input-highlight {
          animation: pulse-input 2s ease-in-out infinite;
        }
        @keyframes pulse-input {
          0%, 100% { filter: drop-shadow(0 0 6px rgba(16, 185, 129, 0.5)); }
          50% { filter: drop-shadow(0 0 12px rgba(16, 185, 129, 0.8)); }
        }
        
        /* ===== OUTPUT SELECTION (Amber/Yellow) ===== */
        .mermaid-container .selected-output-highlight rect,
        .mermaid-container .selected-output-highlight polygon,
        .mermaid-container .selected-output-highlight circle {
          stroke: #f59e0b !important;
          stroke-width: 3px !important;
          fill: #fef3c7 !important;
          filter: drop-shadow(0 0 8px rgba(245, 158, 11, 0.6));
        }
        .mermaid-container line.selected-output-highlight {
          stroke: #f59e0b !important;
          stroke-width: 3px !important;
          filter: drop-shadow(0 0 8px rgba(245, 158, 11, 0.6));
        }
        .mermaid-container .selected-output-highlight text,
        .mermaid-container .selected-output-highlight .messageText {
          fill: #f59e0b !important;
          font-weight: bold !important;
        }
        .mermaid-container .selected-output-highlight {
          animation: pulse-output 2s ease-in-out infinite;
        }
        @keyframes pulse-output {
          0%, 100% { filter: drop-shadow(0 0 6px rgba(245, 158, 11, 0.5)); }
          50% { filter: drop-shadow(0 0 12px rgba(245, 158, 11, 0.8)); }
        }
      `}</style>
    </div>
  );
}
