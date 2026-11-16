/**
 * Theme resolution. Colours always come from CSS variables (`--af-*`, style.css):
 *  - `connethics-light` / `connethics-dark`: ConnEthics brand tokens (`--ce-*`), shipped scoped in style.css;
 *  - `auto`: VS Code theme when the page is a VS Code webview (`body.vscode-*`), otherwise ConnEthics
 *    light/dark following `[data-theme]` on an ancestor, then `prefers-color-scheme`;
 *  - `vscode`: every colour, semantic ones included, follows the user's VS Code theme (`--vscode-*`).
 * High contrast: explicit prop, else `body.vscode-high-contrast` / `data-vscode-theme-kind`, else `forced-colors`.
 */
import { useEffect, useState } from 'react';

export type ThemeProp = 'auto' | 'connethics-light' | 'connethics-dark' | 'vscode';
export type VsCodeThemeKind = 'vscode-light' | 'vscode-dark' | 'vscode-high-contrast' | 'vscode-high-contrast-light';

export interface ResolvedTheme {
  /** Value of `data-af-theme` on the root (`auto` = ConnEthics light/dark resolved by CSS). */
  theme: 'connethics-light' | 'connethics-dark' | 'auto' | 'vscode';
  vscodeKind: VsCodeThemeKind | null;
  dark: boolean;
  highContrast: boolean;
}

/** Current VS Code theme kind of the webview (null outside VS Code). */
export function readVsCodeThemeKind(doc: Document | undefined = typeof document !== 'undefined' ? document : undefined): VsCodeThemeKind | null {
  const body = doc?.body;
  if (!body) return null;
  const attr = body.getAttribute('data-vscode-theme-kind');
  if (attr === 'vscode-light' || attr === 'vscode-dark' || attr === 'vscode-high-contrast' || attr === 'vscode-high-contrast-light') return attr;
  const c = body.classList;
  if (c.contains('vscode-high-contrast-light')) return 'vscode-high-contrast-light';
  if (c.contains('vscode-high-contrast')) return 'vscode-high-contrast';
  if (c.contains('vscode-dark')) return 'vscode-dark';
  if (c.contains('vscode-light')) return 'vscode-light';
  return null;
}

function media(q: string): boolean {
  try {
    return typeof window !== 'undefined' && !!window.matchMedia?.(q).matches;
  } catch {
    return false;
  }
}

function ancestorTheme(el: Element | null): 'light' | 'dark' | null {
  const host = el?.closest?.('[data-theme]');
  const t = host?.getAttribute('data-theme');
  return t === 'dark' || t === 'light' ? t : null;
}

export function resolveTheme(theme: ThemeProp, highContrast: boolean | undefined, el: Element | null): ResolvedTheme {
  const kind = readVsCodeThemeKind();
  const effective = theme === 'auto' && kind ? 'vscode' : theme;
  const hcKind = kind === 'vscode-high-contrast' || kind === 'vscode-high-contrast-light';
  let dark: boolean;
  if (effective === 'vscode') dark = kind ? kind === 'vscode-dark' || kind === 'vscode-high-contrast' : media('(prefers-color-scheme: dark)');
  else if (effective === 'connethics-dark') dark = true;
  else if (effective === 'connethics-light') dark = false;
  else dark = (ancestorTheme(el) ?? (media('(prefers-color-scheme: dark)') ? 'dark' : 'light')) === 'dark';
  return {
    theme: effective,
    vscodeKind: kind,
    dark,
    highContrast: highContrast ?? ((effective === 'vscode' && hcKind) || media('(forced-colors: active)')),
  };
}

/** Re-resolves when VS Code changes theme (body class / data-vscode-theme-kind) or the OS scheme changes. */
export function useResolvedTheme(theme: ThemeProp, highContrast: boolean | undefined, el: Element | null): ResolvedTheme {
  const [resolved, setResolved] = useState(() => resolveTheme(theme, highContrast, el));
  useEffect(() => {
    const update = () => setResolved((prev) => {
      const next = resolveTheme(theme, highContrast, el);
      return prev.theme === next.theme && prev.dark === next.dark && prev.highContrast === next.highContrast && prev.vscodeKind === next.vscodeKind ? prev : next;
    });
    update();
    const observers: MutationObserver[] = [];
    if (typeof MutationObserver !== 'undefined' && typeof document !== 'undefined') {
      const mo = new MutationObserver(update);
      mo.observe(document.body, { attributes: true, attributeFilter: ['class', 'data-vscode-theme-kind'] });
      mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
      observers.push(mo);
    }
    const queries = ['(prefers-color-scheme: dark)', '(forced-colors: active)']
      .map((q) => {
        try {
          return window.matchMedia?.(q);
        } catch {
          return undefined;
        }
      })
      .filter((x): x is MediaQueryList => !!x);
    queries.forEach((q) => q.addEventListener?.('change', update));
    return () => {
      observers.forEach((o) => o.disconnect());
      queries.forEach((q) => q.removeEventListener?.('change', update));
    };
  }, [theme, highContrast, el]);
  return resolved;
}
