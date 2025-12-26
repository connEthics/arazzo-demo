'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { BuilderProvider, useBuilder } from '@/features/builder/context/BuilderContext';
import BuilderHeader, { type ViewMode, type MobilePanel } from '@/features/builder/components/BuilderHeader';
import LeftPanel from '@/features/builder/components/LeftPanel';
import CenterPanel from '@/features/builder/components/CenterPanel';
import RightPanel from '@/features/builder/components/RightPanel';
import MobileMenu from '@/features/builder/components/MobileMenu';
import YamlFullscreen from '@/features/builder/components/YamlFullscreen';
import type { DetailData } from '@/components/DetailDrawer';
import yaml from 'js-yaml';
import type { ArazzoSpec } from '@/types/arazzo';

// ============================================================================
// Builder Page Content
// ============================================================================

function BuilderPageContent() {
  const { state, dispatch } = useBuilder();
  const hasLoadedDemo = useRef(false);
  
  // -------------------------------------------------------------------------
  // Load Demo Workflow on Mount
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (hasLoadedDemo.current) return;
    hasLoadedDemo.current = true;
    
    async function loadDemoWorkflow() {
      try {
        // Load the demo workflow
        const workflowResponse = await fetch('/workflows/pet-adoption.arazzo.yaml');
        if (!workflowResponse.ok) return;
        const workflowYaml = await workflowResponse.text();
        const spec = yaml.load(workflowYaml) as ArazzoSpec;
        
        // Load the OpenAPI source if available
        const sources: Record<string, unknown> = {};
        if (spec.sourceDescriptions) {
          for (const source of spec.sourceDescriptions) {
            try {
              // Try to load local OpenAPI files
              const sourceUrl = source.url.startsWith('http') 
                ? source.url 
                : `/openapi/${source.url.split('/').pop()}`;
              const sourceResponse = await fetch(sourceUrl);
              if (sourceResponse.ok) {
                const sourceYaml = await sourceResponse.text();
                sources[source.name] = yaml.load(sourceYaml);
              }
            } catch {
              // Ignore source loading errors
            }
          }
        }
        
        dispatch({ 
          type: 'LOAD_SAMPLE', 
          payload: { spec, sources } 
        });

        // Select Input node by default
        dispatch({ type: 'SELECT_NODE', payload: { nodeType: 'input' } });
      } catch (error) {
        console.error('Failed to load demo workflow:', error);
      }
    }
    
    loadDemoWorkflow();
  }, [dispatch]);
  
  // Use selectedWorkflowIndex from context
  const selectedWorkflowIndex = state.selectedWorkflowIndex;
  
  // -------------------------------------------------------------------------
  // View Mode State
  // -------------------------------------------------------------------------
  const [viewMode, setViewMode] = useState<ViewMode>('builder');
  
  // -------------------------------------------------------------------------
  // Panel State
  // -------------------------------------------------------------------------
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [leftPanelWidth, setLeftPanelWidth] = useState(320);
  const [yamlFullscreen, setYamlFullscreen] = useState(false);
  
  // -------------------------------------------------------------------------
  // Mobile State
  // -------------------------------------------------------------------------
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>('center');
  
  // -------------------------------------------------------------------------
  // Diagram Options (for Mermaid views)
  // -------------------------------------------------------------------------
  const [hideOutputs, setHideOutputs] = useState(false);
  const [showStepNames, setShowStepNames] = useState(true);
  const [showErrorFlow, setShowErrorFlow] = useState(true);
  
  // -------------------------------------------------------------------------
  // Detail Data (for diagram modes)
  // -------------------------------------------------------------------------
  const [detailData, setDetailData] = useState<DetailData | null>(null);

  // Auto-open right panel when a node is selected in Builder mode
  useEffect(() => {
    if (state.selectedNodeType) {
      setShowRightPanel(true);
      // Also switch mobile panel to right
      if (typeof window !== 'undefined' && window.innerWidth < 1024) {
        setMobilePanel('right');
      }
    }
  }, [state.selectedNodeType, state.selectedStepId, state.selectedComponentKey]);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------
  
  const handleWorkflowChange = useCallback((index: number) => {
    dispatch({ type: 'SET_WORKFLOW_INDEX', payload: index });
  }, [dispatch]);

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    setMobilePanel('center');
  }, []);

  // Handle view flowchart from documentation
  const handleViewFlowchart = useCallback((workflowId: string) => {
    // Find the workflow index by workflowId
    const index = state.spec.workflows.findIndex(w => w.workflowId === workflowId);
    if (index !== -1 && index !== selectedWorkflowIndex) {
      dispatch({ type: 'SET_WORKFLOW_INDEX', payload: index });
    }
    setViewMode('flowchart');
    setMobilePanel('center');
  }, [state.spec.workflows, selectedWorkflowIndex, dispatch]);

  // Handle view sequence from documentation
  const handleViewSequence = useCallback((workflowId: string) => {
    // Find the workflow index by workflowId
    const index = state.spec.workflows.findIndex(w => w.workflowId === workflowId);
    if (index !== -1 && index !== selectedWorkflowIndex) {
      dispatch({ type: 'SET_WORKFLOW_INDEX', payload: index });
    }
    setViewMode('sequence');
    setMobilePanel('center');
  }, [state.spec.workflows, selectedWorkflowIndex, dispatch]);

  const handleExportYaml = useCallback(() => {
    try {
      const yamlContent = yaml.dump(state.spec, { 
        indent: 2, 
        lineWidth: -1,
        noRefs: true,
      });
      const blob = new Blob([yamlContent], { type: 'text/yaml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${state.spec.info?.title || 'arazzo'}.arazzo.yaml`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export YAML:', error);
    }
  }, [state.spec]);

  const handleMobilePanelChange = useCallback((panel: MobilePanel) => {
    setMobilePanel(panel);
  }, []);

  // Handle detail selection - auto switch to right panel on mobile
  const handleDetailSelect = useCallback((data: DetailData | null) => {
    setDetailData(data);
    // Auto-switch to right panel on mobile when selecting a step in flowchart/sequence
    if (data && (viewMode === 'flowchart' || viewMode === 'sequence')) {
      // Check if we're on mobile (viewport width)
      if (typeof window !== 'undefined' && window.innerWidth < 1024) {
        setMobilePanel('right');
      }
    }
  }, [viewMode]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  
  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      {/* Header */}
      <BuilderHeader
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        selectedWorkflowIndex={selectedWorkflowIndex}
        onWorkflowChange={handleWorkflowChange}
        showLeftPanel={showLeftPanel}
        showRightPanel={showRightPanel}
        onToggleLeftPanel={() => setShowLeftPanel(!showLeftPanel)}
        onToggleRightPanel={() => setShowRightPanel(!showRightPanel)}
        isMobileMenuOpen={isMobileMenuOpen}
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        mobilePanel={mobilePanel}
        onMobilePanelChange={handleMobilePanelChange}
        hideOutputs={hideOutputs}
        showStepNames={showStepNames}
        showErrorFlow={showErrorFlow}
        onHideOutputsChange={setHideOutputs}
        onShowStepNamesChange={setShowStepNames}
        onShowErrorFlowChange={setShowErrorFlow}
        onExportYaml={handleExportYaml}
      />

      {/* Mobile Menu */}
      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        selectedWorkflowIndex={selectedWorkflowIndex}
        onWorkflowChange={handleWorkflowChange}
        hideOutputs={hideOutputs}
        showStepNames={showStepNames}
        showErrorFlow={showErrorFlow}
        onHideOutputsChange={setHideOutputs}
        onShowStepNamesChange={setShowStepNames}
        onShowErrorFlowChange={setShowErrorFlow}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* YAML Fullscreen Mode */}
        {yamlFullscreen ? (
          <YamlFullscreen onExit={() => setYamlFullscreen(false)} />
        ) : (
          <>
            {/* Left Panel - Desktop */}
            {showLeftPanel && (
              <div className="hidden lg:flex">
                <LeftPanel
                  width={leftPanelWidth}
                  onWidthChange={setLeftPanelWidth}
                  onYamlFullscreen={() => setYamlFullscreen(true)}
                />
              </div>
            )}

            {/* Left Panel - Mobile */}
            {mobilePanel === 'left' && (
              <div className="lg:hidden flex-1">
                <LeftPanel
                  width={leftPanelWidth}
                  onWidthChange={setLeftPanelWidth}
                  onYamlFullscreen={() => setYamlFullscreen(true)}
                  isMobile
                />
              </div>
            )}

            {/* Center Panel */}
            <div className={`
              ${mobilePanel !== 'center' ? 'hidden lg:flex lg:flex-1' : 'flex flex-1'}
              min-h-0 min-w-0 overflow-hidden
            `}>
              <CenterPanel
                viewMode={viewMode}
                selectedWorkflowIndex={selectedWorkflowIndex}
                hideOutputs={hideOutputs}
                showStepNames={showStepNames}
                showErrorFlow={showErrorFlow}
                detailData={detailData}
                onDetailSelect={handleDetailSelect}
                onViewFlowchart={handleViewFlowchart}
                onViewSequence={handleViewSequence}
              />
            </div>

            {/* Right Panel - Desktop */}
            {(viewMode === 'builder' || viewMode === 'flowchart' || viewMode === 'sequence') && (
              <div className="hidden lg:block flex-shrink-0">
                <RightPanel
                  viewMode={viewMode}
                  selectedWorkflowIndex={selectedWorkflowIndex}
                  isOpen={showRightPanel}
                  onToggle={() => setShowRightPanel(!showRightPanel)}
                  detailData={detailData}
                  onDetailClose={() => setDetailData(null)}
                />
              </div>
            )}

            {/* Right Panel - Mobile */}
            {mobilePanel === 'right' && (viewMode === 'builder' || viewMode === 'flowchart' || viewMode === 'sequence') && (
              <div className="lg:hidden flex-1">
                <RightPanel
                  viewMode={viewMode}
                  selectedWorkflowIndex={selectedWorkflowIndex}
                  isOpen={true}
                  onToggle={() => {}}
                  detailData={detailData}
                  onDetailClose={() => setDetailData(null)}
                  isMobile
                  onMobileClose={() => setMobilePanel('center')}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Builder Page (with Provider)
// ============================================================================

export default function BuilderPage() {
  return (
    <BuilderProvider>
      <BuilderPageContent />
    </BuilderProvider>
  );
}
