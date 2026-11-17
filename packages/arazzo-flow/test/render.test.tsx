// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRef } from 'react';
import { workflowToGraph } from '@connethics/arazzo-core';
import { ArazzoGraph, type ArazzoGraphApi } from '../src/ArazzoGraph';
import { ArazzoGraphFromDocument } from '../src/ArazzoGraphFromDocument';
import { resetElk } from '../src/layout/elk-client';
import { EDGE_KINDS } from '../src/model';
import { en } from '../src/messages';
import { CATALOGUE, PET, SESSION, load } from './fixtures';
import { mockElk } from './mock-elk';

const catalogue = workflowToGraph(CATALOGUE, 'main', { includeImplicitFailures: true });

function renderGraph(props: Partial<React.ComponentProps<typeof ArazzoGraph>> = {}) {
  const engine = mockElk();
  const ref = createRef<ArazzoGraphApi>();
  const onLayout = vi.fn();
  const utils = render(
    <div style={{ width: 1200, height: 800 }}>
      <ArazzoGraph ref={ref} graph={catalogue} elk={{ engine }} onLayout={onLayout} showImplicitFailures {...props} />
    </div>,
  );
  return { ...utils, engine, ref, onLayout };
}

async function laidOut(onLayout: ReturnType<typeof vi.fn>) {
  await waitFor(() => expect(onLayout).toHaveBeenCalled());
  await waitFor(() => expect(document.querySelector('.react-flow__node-step')).not.toBeNull());
}

const node = (id: string) => document.querySelector<HTMLElement>(`.react-flow__node[data-id="${id}"]`)!;

beforeEach(() => resetElk());
afterEach(() => {
  cleanup();
  document.body.className = '';
  document.body.removeAttribute('data-vscode-theme-kind');
});

describe('<ArazzoGraph> rendering (mocked ELK)', () => {
  it('renders every node type', async () => {
    const { onLayout, engine } = renderGraph();
    await laidOut(onLayout);
    expect(engine.calls).toBeGreaterThan(0);
    expect(onLayout.mock.calls[0]![0]).toMatchObject({ mode: 'main-thread', density: 'standard' });
    expect(node('input').querySelector('.af-card--io.af-accent--input')).not.toBeNull();
    expect(node('step:create').querySelector('.af-card--step[data-step-kind="http"] .af-badge--post')!.textContent).toBe('POST');
    expect(node('step:invoice').querySelector('.af-badge--op')!.textContent).toBe('OP');
    const recv = node('step:await');
    expect(recv.querySelector('[data-step-kind="async-receive"] .af-badge--receive')!.textContent).toBe('RECEIVE');
    expect(recv.querySelector('.af-timer')).not.toBeNull();
    expect(recv.textContent).toContain('6 s');
    expect(node('step:notify').querySelector('.af-badge--send')).not.toBeNull();
    expect(node('step:audit').querySelector('[data-step-kind="workflow"] .af-badge--workflow')).not.toBeNull();
    expect(node('join:notify').querySelector('.af-junction')).not.toBeNull();
    expect(node('end-failure').querySelector('.af-end--failure')).not.toBeNull();
    expect(node('output').querySelector('.af-key--selector')!.textContent).toContain('firstItem');
    expect(node('ref:support').querySelector('.af-ref')).not.toBeNull();
    // aria
    expect(node('step:await').getAttribute('aria-label')).toMatch(/^Étape 2 sur 6, await, attente de message/);
    expect(node('step:create').getAttribute('aria-roledescription')).toBe('étape');
  });

  it('renders every edge type with its own stroke class and labels', async () => {
    const { onLayout } = renderGraph();
    await laidOut(onLayout);
    for (const k of EDGE_KINDS) expect(document.querySelector(`.af-edge--${k}`), k).not.toBeNull();
    const labels = [...document.querySelectorAll('.af-edge-label')].map((l) => l.textContent);
    expect(labels).toEqual(expect.arrayContaining(['↻ ×3 · 2 s', '✗ timedOut', '✓ again ↺', '✗ ↗ support', '⇢ logAccess', 'échec non géré']));
    expect(document.querySelector('.af-edge--workflow-call .af-edge__outer')).not.toBeNull();
    expect(document.querySelector('.af-edge--retry .af-edge__marker--open')).not.toBeNull();
  });

  it('selection: click, controlled selectedStepId, pane click clears', async () => {
    const onSelectStep = vi.fn();
    const { onLayout, rerender, engine } = renderGraph({ onSelectStep });
    await laidOut(onLayout);
    fireEvent.click(node('step:create'));
    expect(onSelectStep).toHaveBeenLastCalledWith('create', expect.objectContaining({ id: 'step:create', kind: 'step-http' }), { nodeId: 'step:create', workflowId: 'main' });
    expect(node('step:create').querySelector('.af-card')!.hasAttribute('data-selected')).toBe(true);
    rerender(
      <div style={{ width: 1200, height: 800 }}>
        <ArazzoGraph graph={catalogue} elk={{ engine }} onLayout={onLayout} onSelectStep={onSelectStep} selectedStepId="await" showImplicitFailures />
      </div>,
    );
    await waitFor(() => expect(node('step:await').querySelector('.af-card')!.hasAttribute('data-selected')).toBe(true));
    expect(node('step:create').querySelector('.af-card')!.hasAttribute('data-selected')).toBe(false);
    fireEvent.click(document.querySelector('.react-flow__pane')!);
    expect(onSelectStep).toHaveBeenLastCalledWith(null, null, null);
  });

  it('keyboard: arrows follow edges, Alt+↓ follows failure, Enter reveals, Space selects, Escape clears', async () => {
    const onSelectStep = vi.fn();
    const onRevealStep = vi.fn();
    const { onLayout } = renderGraph({ onSelectStep, onRevealStep });
    await laidOut(onLayout);
    const root = document.querySelector<HTMLElement>('.af-root')!;
    act(() => node('input').focus());
    fireEvent.focus(node('input'));
    fireEvent.keyDown(node('input'), { key: 'ArrowDown' });
    expect(document.activeElement).toBe(node('step:create'));
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(node('step:await'));
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown', altKey: true });
    expect(document.activeElement).toBe(node('end-failure'));
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(node('step:await'));
    fireEvent.keyDown(document.activeElement!, { key: ' ' });
    expect(onSelectStep).toHaveBeenLastCalledWith('await', expect.anything(), expect.anything());
    fireEvent.keyDown(document.activeElement!, { key: 'Enter' });
    expect(onRevealStep).toHaveBeenCalledWith('await', expect.objectContaining({ id: 'step:await' }), { nodeId: 'step:await', workflowId: 'main' });
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    expect(onSelectStep).toHaveBeenLastCalledWith(null, null, null);
    // F: focus mode dims non-neighbours; Escape leaves it.
    fireEvent.keyDown(document.activeElement!, { key: 'f' });
    await waitFor(() => expect(node('step:audit').querySelector('[data-dimmed]')).not.toBeNull());
    expect(node('step:create').querySelector('[data-dimmed]')).toBeNull();
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    await waitFor(() => expect(document.querySelector('[data-dimmed]')).toBeNull());
    // '/' focuses the search box; shortcuts are ignored inside it.
    fireEvent.keyDown(document.activeElement!, { key: '/' });
    expect(document.activeElement).toBe(screen.getByRole('searchbox'));
    // E toggles failure edges.
    act(() => node('step:create').focus());
    fireEvent.keyDown(node('step:create'), { key: 'e' });
    await waitFor(() => expect(document.querySelector('.af-edge--failure')).toBeNull());
    expect(root.getAttribute('role')).toBe('application');
  });

  it('search highlights matches and announces the count', async () => {
    const { onLayout } = renderGraph();
    await laidOut(onLayout);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'orders' } });
    await waitFor(() => expect(node('step:create').querySelector('[data-match="current"]')).not.toBeNull());
    expect(node('step:await').querySelector('[data-dimmed]')).not.toBeNull();
    expect(screen.getByRole('status').textContent).toMatch(/Résultat 1 sur 1/);
  });

  it('toolbar: direction, lanes, list view, legend, Mermaid export through the ref', async () => {
    const onOptionsChange = vi.fn();
    const onExport = vi.fn();
    const { onLayout, ref } = renderGraph({ onOptionsChange, onExport, lang: 'en' });
    await laidOut(onLayout);
    fireEvent.click(screen.getByRole('button', { name: /Direction: top/ }));
    expect(onOptionsChange).toHaveBeenLastCalledWith({ layout: 'LR', lanes: 'off', density: 'auto' });
    fireEvent.click(screen.getByRole('button', { name: /Lanes by source/ }));
    expect(onOptionsChange).toHaveBeenLastCalledWith({ layout: 'LR', lanes: 'clusters', density: 'auto' });
    fireEvent.click(screen.getByRole('button', { name: 'List view (V)' }));
    const list = screen.getByRole('complementary', { name: en.ui.listTitle });
    expect(list.querySelectorAll('li').length).toBeGreaterThanOrEqual(6);
    // Legend toggle (the panel's own disclosure button, not the toolbar switch).
    const legendToggle = screen.getAllByRole('button', { name: 'Legend' }).find((b) => b.hasAttribute('aria-expanded'))!;
    fireEvent.click(legendToggle);
    expect(screen.getByRole('list', { name: 'Edge types' }).querySelectorAll('li')).toHaveLength(10);
    expect(ref.current!.toMermaid()).toMatch(/^flowchart LR/);
    fireEvent.click(screen.getByRole('button', { name: 'Export' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Mermaid (copy)' }));
    await waitFor(() => expect(onExport).toHaveBeenCalledWith(expect.objectContaining({ format: 'mermaid', filename: 'main.mmd', text: expect.stringContaining('flowchart LR') })));
  });

  it('legend lists the 10 edge kinds', async () => {
    const { onLayout } = renderGraph({ legendExpanded: true });
    await laidOut(onLayout);
    expect(screen.getByRole('list', { name: 'Types d’arêtes' }).querySelectorAll('li')).toHaveLength(10);
  });
});

describe('themes', () => {
  it('connethics themes set data-af-theme; vscode follows the VS Code body class and high contrast', async () => {
    const { onLayout, rerender, engine } = renderGraph({ theme: 'connethics-dark' });
    await laidOut(onLayout);
    const root = () => document.querySelector<HTMLElement>('.af-root')!;
    expect(root().dataset.afTheme).toBe('connethics-dark');
    expect(root().dataset.afDark).toBe('true');
    document.body.classList.add('vscode-high-contrast');
    rerender(
      <div>
        <ArazzoGraph graph={catalogue} elk={{ engine }} onLayout={onLayout} theme="vscode" />
      </div>,
    );
    await waitFor(() => expect(root().dataset.afTheme).toBe('vscode'));
    expect(root().dataset.contrast).toBe('high');
    // auto inside a VS Code webview → vscode; theme change observed.
    act(() => {
      document.body.classList.remove('vscode-high-contrast');
      document.body.classList.add('vscode-light');
    });
    rerender(
      <div>
        <ArazzoGraph graph={catalogue} elk={{ engine }} onLayout={onLayout} />
      </div>,
    );
    await waitFor(() => expect(root().dataset.contrast).toBeUndefined());
    expect(root().dataset.afTheme).toBe('vscode');
    expect(root().dataset.vscodeKind).toBe('vscode-light');
  });
});

describe('<ArazzoGraphFromDocument>', () => {
  it('builds the graph with workflowToGraph and expands local sub-workflows', async () => {
    const onLayout = vi.fn();
    render(
      <div style={{ width: 1000, height: 700 }}>
        <ArazzoGraphFromDocument doc={load(SESSION)} workflowId="listUnpaidInvoices" elk={{ engine: mockElk() }} onLayout={onLayout} />
      </div>,
    );
    await laidOut(onLayout);
    expect(node('group:renewSession/step:renew')).not.toBeNull();
    expect(document.querySelector('.af-frame--workflow .af-frame__title')!.textContent).toBe('renewSession');
    expect(screen.getByRole('application', { name: 'Graphe du workflow listUnpaidInvoices' })).toBeTruthy();
  });

  it('uses resolveOperation for the HTTP badge and renders a fallback for unknown workflows', async () => {
    const onLayout = vi.fn();
    const { unmount } = render(
      <div style={{ width: 1000, height: 700 }}>
        <ArazzoGraphFromDocument
          doc={load(PET)}
          workflowId="adopt-pet-with-error-handling"
          resolveOperation={(step) => (step.operationId?.endsWith('loginUser') ? { method: 'get', path: '/user/login' } : undefined)}
          elk={{ engine: mockElk() }}
          onLayout={onLayout}
        />
      </div>,
    );
    await laidOut(onLayout);
    expect(node('step:login').querySelector('.af-badge--get')!.textContent).toBe('GET');
    unmount();
    render(<ArazzoGraphFromDocument doc={load(PET)} workflowId="nope" fallback={<p>missing</p>} />);
    expect(screen.getByText('missing')).toBeTruthy();
  });
});
