/**
 * Exports: SVG / PNG of the whole graph (html-to-image on the React Flow viewport, CSS variables
 * resolved through computed styles), and Mermaid source (delegated to `graphToMermaid` of core).
 */
import { graphToMermaid, type WorkflowGraph } from '@connethics/arazzo-core';
import type { Direction } from './format';
import type { LanesMode } from './layout/layout';

export type ExportFormat = 'svg' | 'png' | 'mermaid';

export interface ExportEvent {
  format: ExportFormat;
  /** Suggested file name (`<workflowId>.svg`…). */
  filename: string;
  /** SVG / PNG. */
  blob?: Blob;
  /** Mermaid source. */
  text?: string;
}

export interface MermaidExportOptions {
  direction?: Direction;
  lanes?: LanesMode;
  hideFailures?: boolean;
}

export function toMermaid(graph: WorkflowGraph, o: MermaidExportOptions = {}): string {
  return graphToMermaid(graph, { direction: o.direction ?? 'TB', lanes: (o.lanes ?? 'off') !== 'off', hideFailures: !!o.hideFailures });
}

export interface ImageExportOptions {
  /** Bounds of the content in flow coordinates (layout width/height). */
  bounds: { x: number; y: number; width: number; height: number };
  padding?: number;
  /** PNG pixel ratio (default 2). */
  pixelRatio?: number;
  backgroundColor?: string;
}

/** `data:` URL → Blob, without `fetch` (works under a CSP without `connect-src data:`). */
export function dataUrlToBlob(url: string): Blob {
  const comma = url.indexOf(',');
  const meta = url.slice(5, comma);
  const data = url.slice(comma + 1);
  const type = meta.split(';')[0] || 'application/octet-stream';
  if (/;base64/i.test(meta)) {
    const bin = atob(data);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type });
  }
  return new Blob([decodeURIComponent(data)], { type });
}

const SVG_PROPS = ['fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'stroke-linecap', 'stroke-linejoin', 'opacity'];

/**
 * html-to-image does not carry class-based SVG paint (our edges are styled by CSS variables):
 * inline the computed values on every SVG shape for the duration of the export.
 */
function inlineSvgPaint(root: Element): () => void {
  const saved: [SVGElement, string | null][] = [];
  root.querySelectorAll<SVGElement>('path, polygon, polyline, circle, line, rect').forEach((el) => {
    if (!(el instanceof SVGElement)) return;
    const cs = getComputedStyle(el);
    saved.push([el, el.getAttribute('style')]);
    for (const p of SVG_PROPS) {
      const v = cs.getPropertyValue(p);
      if (v) el.style.setProperty(p, v);
    }
  });
  return () => {
    for (const [el, style] of saved) {
      if (style === null) el.removeAttribute('style');
      else el.setAttribute('style', style);
    }
  };
}

/**
 * Render the whole graph (not just the visible part) to SVG or PNG.
 * `root` is the `.af-root` element of `<ArazzoGraph>`.
 */
export async function exportImage(root: HTMLElement, format: 'svg' | 'png', o: ImageExportOptions): Promise<Blob> {
  const viewport = root.querySelector<HTMLElement>('.react-flow__viewport');
  if (!viewport) throw new Error('arazzo-flow: viewport not found');
  const { toPng, toSvg } = await import('html-to-image');
  const pad = o.padding ?? 24;
  const width = Math.ceil(o.bounds.width + pad * 2);
  const height = Math.ceil(o.bounds.height + pad * 2);
  const bg = o.backgroundColor ?? getComputedStyle(root).getPropertyValue('--af-canvas-bg').trim() ?? undefined;
  const prevLod = root.dataset.lod;
  root.dataset.lod = 'full';
  root.dataset.exporting = 'true';
  const restore = inlineSvgPaint(viewport);
  try {
    const opts = {
      width,
      height,
      backgroundColor: bg || undefined,
      skipFonts: true,
      pixelRatio: format === 'png' ? o.pixelRatio ?? 2 : 1,
      style: { width: `${width}px`, height: `${height}px`, transform: `translate(${pad - o.bounds.x}px, ${pad - o.bounds.y}px) scale(1)` },
      filter: (n: Node) => !(n instanceof HTMLElement && n.classList.contains('react-flow__handle')),
    };
    const url = format === 'png' ? await toPng(viewport, opts) : await toSvg(viewport, opts);
    return dataUrlToBlob(url);
  } finally {
    restore();
    if (prevLod) root.dataset.lod = prevLod;
    delete root.dataset.exporting;
  }
}

/** Browser download (web). In a VS Code webview, pass `onExport` to `<ArazzoGraph>` and post the data to the host instead. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
