// Builder Center Panel Component
'use client';

import { memo, useMemo } from 'react';
import { useBuilder } from '../context/BuilderContext';
import BuilderCanvas from './BuilderCanvas';
import MermaidDiagram from '@/components/MermaidDiagram';
import UnifiedDocumentationView from '@/components/UnifiedDocumentationView';
import { workflowToMermaidFlowchart, workflowToMermaidSequence } from '@/lib/mermaid-converter';
import { FlowchartIcon, SequenceIcon } from './icons';
import type { DetailData } from '@/components/DetailDrawer';

export type ViewMode = 'builder' | 'documentation' | 'flowchart' | 'sequence';

interface CenterPanelProps {
  viewMode: ViewMode;
  selectedWorkflowIndex: number;
  
  // Diagram options (for mermaid views)
  hideOutputs: boolean;
  showStepNames: boolean;
  showErrorFlow: boolean;
  
  // Detail selection for diagrams
  detailData: DetailData | null;
  onDetailSelect: (data: DetailData | null) => void;
}

function CenterPanel({
  viewMode,
  selectedWorkflowIndex,
  hideOutputs,
  showStepNames,
  showErrorFlow,
  detailData,
  onDetailSelect,
}: CenterPanelProps) {
  const { state } = useBuilder();
  
  const workflow = state.spec.workflows[selectedWorkflowIndex];
  const workflowId = workflow?.workflowId;
  const currentWorkflowSteps = workflow?.steps || [];
  const currentWorkflowInputs = workflow?.inputs;
  const currentWorkflowOutputs = workflow?.outputs || {};

  // Generate Mermaid diagrams
  const mermaidFlowchart = useMemo(() => {
    if (!workflowId || !workflow) return '';
    try {
      return workflowToMermaidFlowchart(state.spec, workflowId, { 
        direction: 'TB',
        hideErrorFlows: !showErrorFlow 
      });
    } catch { 
      return ''; 
    }
  }, [state.spec, workflowId, workflow, showErrorFlow]);
  
  const mermaidSequence = useMemo(() => {
    if (!workflowId || !workflow) return '';
    try {
      return workflowToMermaidSequence(state.spec, workflowId, { 
        hideOutputs,
        showStepNames,
        hideErrorFlows: !showErrorFlow 
      });
    } catch { 
      return ''; 
    }
  }, [state.spec, workflowId, workflow, hideOutputs, showStepNames, showErrorFlow]);

  // Empty state component
  const EmptyState = ({ icon: Icon, message }: { icon: React.ComponentType; message: string }) => (
    <div className="flex items-center justify-center h-full text-slate-400 text-sm">
      <div className="text-center flex flex-col items-center">
        <div className="w-12 h-12 mb-2 flex items-center justify-center text-slate-300 [&>svg]:w-10 [&>svg]:h-10">
          <Icon />
        </div>
        <p className="mt-2">{message}</p>
        <p className="text-xs mt-1">Add steps in Builder mode</p>
      </div>
    </div>
  );

  return (
    <div className="flex-1 relative bg-slate-100 dark:bg-slate-900 min-w-0 min-h-0 overflow-hidden flex flex-col h-full">
      {viewMode === 'builder' && (
        <div className="flex-1 min-h-0 relative">
          <BuilderCanvas />
        </div>
      )}
      
      {viewMode === 'documentation' && (
        <div className="h-full overflow-auto">
          <UnifiedDocumentationView 
            spec={state.spec} 
            isDark={false}
          />
        </div>
      )}
      
      {viewMode === 'flowchart' && (
        <div className="h-full overflow-auto">
          {workflow && workflow.steps.length > 0 ? (
            <MermaidDiagram 
              chart={mermaidFlowchart}
              isDark={false}
              steps={currentWorkflowSteps}
              sources={state.spec.sourceDescriptions || []}
              workflowInputs={currentWorkflowInputs}
              workflowOutputs={currentWorkflowOutputs}
              selectedStepId={detailData?.type === 'step' ? detailData.step?.stepId : null}
              selectedType={detailData?.type === 'source' ? null : detailData?.type || null}
              onDetailSelect={onDetailSelect}
            />
          ) : (
            <EmptyState icon={FlowchartIcon} message="No steps to visualize" />
          )}
        </div>
      )}
      
      {viewMode === 'sequence' && (
        <div className="h-full overflow-auto">
          {workflow && workflow.steps.length > 0 ? (
            <MermaidDiagram 
              chart={mermaidSequence}
              isDark={false}
              steps={currentWorkflowSteps}
              sources={state.spec.sourceDescriptions || []}
              workflowInputs={currentWorkflowInputs}
              workflowOutputs={currentWorkflowOutputs}
              selectedStepId={detailData?.type === 'step' ? detailData.step?.stepId : null}
              selectedType={detailData?.type === 'source' ? null : detailData?.type || null}
              onDetailSelect={onDetailSelect}
            />
          ) : (
            <EmptyState icon={SequenceIcon} message="No steps to visualize" />
          )}
        </div>
      )}
    </div>
  );
}

export default memo(CenterPanel);
