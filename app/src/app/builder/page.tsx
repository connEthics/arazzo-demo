'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { BuilderProvider, useBuilder } from '@/features/builder/context/BuilderContext';
import BuilderHeader, { type ViewMode, type MobilePanel } from '@/features/builder/components/BuilderHeader';
import LeftPanel, { type LeftMode } from '@/features/builder/components/LeftPanel';
import CenterPanel from '@/features/builder/components/CenterPanel';
import RightPanel from '@/features/builder/components/RightPanel';
import MobileMenu from '@/features/builder/components/MobileMenu';
import YamlFullscreen from '@/features/builder/components/YamlFullscreen';
import ExamplesGallery from '@/features/builder/components/ExamplesGallery';
import { DEFAULT_EXAMPLE_ID, findExample, loadArazzoWithSources, type ExampleEntry } from '@/features/builder/data/examples';
import { countBySeverity } from '@/lib/arazzo-parser';
import type { DetailData } from '@/components/DetailDrawer';
import yaml from 'js-yaml';

// ============================================================================
// Builder Page Content
// ============================================================================

function BuilderPageContent() {
  const { state, dispatch, diagnostics } = useBuilder();
  const hasLoadedDemo = useRef(false);

  // -------------------------------------------------------------------------
  // Examples (gallery + `/builder?example=<folder>`)
  // -------------------------------------------------------------------------
  const [examplesOpen, setExamplesOpen] = useState(false);
  const [loadingExample, setLoadingExample] = useState<string | null>(null);
  const [exampleError, setExampleError] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<DetailData | null>(null);

  const loadExample = useCallback(async (example: ExampleEntry) => {
    setLoadingExample(example.id);
    setExampleError(null);
    try {
      const { spec, sources } = await loadArazzoWithSources(example.path);
      dispatch({ type: 'LOAD_SAMPLE', payload: { spec, sources } });

      const firstWorkflow = spec.workflows[0];
      const defaultStep =
        firstWorkflow?.steps.find(s => s.stepId === example.defaultStepId) ?? firstWorkflow?.steps[0];
      if (defaultStep) {
        dispatch({ type: 'SELECT_NODE', payload: { nodeType: 'step', id: defaultStep.stepId } });
        setDetailData({ type: 'step', step: defaultStep });
      } else {
        dispatch({ type: 'SELECT_NODE', payload: { nodeType: 'input' } });
        setDetailData(null);
      }
      setExamplesOpen(false);
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.set('example', example.id);
        window.history.replaceState(null, '', url.toString());
      }
    } catch (error) {
      console.error('Failed to load example:', error);
      setExampleError(error instanceof Error ? error.message : String(error));
    } finally {
      setLoadingExample(null);
    }
  }, [dispatch]);

  // Load `?example=<id>` (default: pet-adoption) on mount
  useEffect(() => {
    if (hasLoadedDemo.current) return;
    hasLoadedDemo.current = true;
    const requested = new URLSearchParams(window.location.search).get('example');
    const example = findExample(requested) ?? findExample(DEFAULT_EXAMPLE_ID);
    if (example) void loadExample(example);
  }, [loadExample]);

  // Use selectedWorkflowIndex from context
  const selectedWorkflowIndex = state.selectedWorkflowIndex;
  
  // -------------------------------------------------------------------------
  // View Mode State
  // -------------------------------------------------------------------------
  const [viewMode, setViewMode] = useState<ViewMode>('flowchart');
  
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
  // Left panel mode (YAML / Operations / Problems)
  // -------------------------------------------------------------------------
  const [leftMode, setLeftMode] = useState<LeftMode>('yaml');
  const problemCounts = useMemo(() => countBySeverity(diagnostics), [diagnostics]);

  const handleShowProblems = useCallback(() => {
    setShowLeftPanel(true);
    setLeftMode('problems');
    setMobilePanel('left');
  }, []);

  // A diagnostic pointing at a step: select it in the diagram views too
  const handleRevealStep = useCallback((workflowIndex: number, stepId: string) => {
    const step = state.spec.workflows[workflowIndex]?.steps.find(s => s.stepId === stepId);
    if (step) setDetailData({ type: 'step', step });
  }, [state.spec.workflows]);

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
        onOpenExamples={() => setExamplesOpen(true)}
        problemCounts={problemCounts}
        onShowProblems={handleShowProblems}
      />

      <ExamplesGallery
        open={examplesOpen}
        onClose={() => setExamplesOpen(false)}
        onLoad={(ex) => void loadExample(ex)}
        loadingId={loadingExample}
        error={exampleError}
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
                  mode={leftMode}
                  onModeChange={setLeftMode}
                  onRevealStep={handleRevealStep}
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
                  mode={leftMode}
                  onModeChange={setLeftMode}
                  onRevealStep={handleRevealStep}
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
                  onDetailSelect={handleDetailSelect}
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
                  onDetailSelect={handleDetailSelect}
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
