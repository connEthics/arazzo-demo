/**
 * Store d'UI minimal (sélection, survol, recherche, focus) hors du tableau `nodes` de React Flow :
 * chaque nœud s'abonne à un sélecteur, seuls les nœuds concernés se re-rendent (R5 §4.12).
 */
import { createContext, useContext, useSyncExternalStore } from 'react';

export interface UiState {
  selectedId: string | null;
  hoverId: string | null;
  /** Résultats de recherche (null = pas de recherche active). */
  matches: Set<string> | null;
  currentMatch: string | null;
  /** Voisinage du mode focus (null = inactif). */
  focusSet: Set<string> | null;
}

export interface UiStore {
  get: () => UiState;
  set: (patch: Partial<UiState>) => void;
  subscribe: (fn: () => void) => () => void;
}

export function createUiStore(): UiStore {
  let state: UiState = { selectedId: null, hoverId: null, matches: null, currentMatch: null, focusSet: null };
  const subs = new Set<() => void>();
  return {
    get: () => state,
    set: (patch) => {
      state = { ...state, ...patch };
      subs.forEach((f) => f());
    },
    subscribe: (fn) => {
      subs.add(fn);
      return () => subs.delete(fn);
    },
  };
}

export const UiStoreContext = createContext<UiStore | null>(null);

export function useUi<T>(selector: (s: UiState) => T): T {
  const store = useContext(UiStoreContext);
  if (!store) throw new Error('UiStoreContext missing');
  return useSyncExternalStore(store.subscribe, () => selector(store.get()));
}

export function isDimmed(s: UiState, id: string): boolean {
  return (s.matches !== null && !s.matches.has(id)) || (s.focusSet !== null && !s.focusSet.has(id));
}
