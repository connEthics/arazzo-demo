/** i18n dictionaries (FR default, EN): UI labels, aria-labels and aria-live announcements. */

export interface Messages {
  lang: 'fr' | 'en';
  inputs: string;
  outputs: string;
  endSuccess: string;
  endFailure: string;
  junction: string;
  step: string;
  steps: (n: number) => string;
  criteria: (n: number) => string;
  outputsCount: (n: number) => string;
  params: (n: number) => string;
  props: (n: number, req: number) => string;
  required: string;
  external: string;
  unresolved: string;
  methodFromPath: string;
  methodFromOpenApi: string;
  workflowDefaults: string;
  workflowDefaultsHint: string;
  then: string;
  unhandledFailure: string;
  end: string;
  if: string;
  and: string;
  reusable: (ref: string) => string;
  defaultValues: string;
  // aria
  graphLabel: (wf: string) => string;
  graphDescription: (steps: number, groups: number, failures: number) => string;
  ariaStep: (a: { order?: number; total: number; id: string; kindText: string; source?: string; exits: string[]; diagnostics: number }) => string;
  ariaInputs: (n: number, req: number, names: string[]) => string;
  ariaOutputs: (names: string[]) => string;
  ariaEnd: (failure: boolean, from: number) => string;
  ariaJunction: (target: string, deps: string[]) => string;
  ariaRef: (wf: string, source?: string) => string;
  ariaLane: (name: string) => string;
  ariaSubworkflow: (name: string) => string;
  exitSuccess: (t: string) => string;
  exitFailure: (t: string) => string;
  exitRetry: (limit: number, after: number, via?: string) => string;
  exitNext: (t: string) => string;
  exitCall: (t: string) => string;
  exitDepends: (t: string) => string;
  kindHttp: (method: string, path?: string) => string;
  kindSend: (channel: string) => string;
  kindReceive: (channel: string, timeout?: string, corr?: string) => string;
  kindWorkflow: (wf: string, collapsed?: boolean, n?: number) => string;
  roleStep: string;
  announceSelected: (label: string, detail: string, exits: number) => string;
  announceLayout: (ms: number, nodes: number) => string;
  announceLayoutPending: string;
  announceLargeStart: string;
  announceSearch: (i: number, n: number, q: string) => string;
  announceNoResult: (q: string) => string;
  announceFocusMode: (label: string) => string;
  announceReveal: (label: string) => string;
  announceExported: (format: string) => string;
  layoutError: string;
  largeGraph: (n: number) => string;
  // UI chrome
  ui: {
    search: string;
    searchPlaceholder: string;
    searchHint: string;
    clearSearch: string;
    toolbar: string;
    zoomIn: string;
    zoomOut: string;
    zoom100: string;
    fit: string;
    direction: (d: 'TB' | 'LR') => string;
    lanes: (mode: 'off' | 'clusters' | 'lanes') => string;
    lanesShort: (mode: 'off' | 'clusters' | 'lanes') => string;
    density: (pref: string, effective: string) => string;
    densityShort: (pref: string) => string;
    failureEdges: string;
    implicitFailures: string;
    minimap: string;
    legend: string;
    listView: string;
    exportMenu: string;
    exportSvg: string;
    exportPng: string;
    exportMermaid: string;
    copied: string;
    help: string;
    helpTitle: string;
    helpNote: string;
    close: string;
    collapse: (name: string) => string;
    expand: (name: string) => string;
    unknownSource: string;
    shortcuts: [string, string][];
    legendEdges: string;
    legendNodes: string;
    legendEdgeLabels: Record<string, string>;
    legendNodeLabels: Record<'http' | 'send' | 'receive' | 'workflow' | 'junction' | 'end' | 'ref', string>;
    minimapLabel: string;
    nodeA11y: string;
    edgeA11y: string;
    listTitle: string;
  };
}

const nfFr = (n: number) => String(n).replace('.', ',');

export const fr: Messages = {
  lang: 'fr',
  inputs: 'Entrées',
  outputs: 'Sorties',
  endSuccess: 'Fin',
  endFailure: 'Échec',
  junction: 'Jonction',
  step: 'Étape',
  steps: (n) => `${n} étape${n > 1 ? 's' : ''}`,
  criteria: (n) => `${n} critère${n > 1 ? 's' : ''}`,
  outputsCount: (n) => `${n} output${n > 1 ? 's' : ''}`,
  params: (n) => `${n} paramètre${n > 1 ? 's' : ''}`,
  props: (n, req) => `${n} propriété${n > 1 ? 's' : ''} · ${req} requise${req > 1 ? 's' : ''}`,
  required: 'requis',
  external: 'externe',
  unresolved: 'Méthode inconnue : opération non résolue dans la source',
  methodFromPath: 'Méthode exacte, lue dans operationPath',
  methodFromOpenApi: 'Méthode issue de l’OpenAPI résolu',
  workflowDefaults: 'Règles par défaut du workflow',
  workflowDefaultsHint: 's’appliquent à toutes les étapes marquées ⓦ (surchargées par nom au niveau de l’étape)',
  then: 'Puis',
  unhandledFailure: 'échec non géré',
  end: 'fin',
  if: 'si',
  and: 'ET',
  reusable: (r) => `(réutilisable ${r})`,
  defaultValues: '(valeurs par défaut)',
  graphLabel: (wf) => `Graphe du workflow ${wf}`,
  graphDescription: (s, g, f) =>
    `${s} étape${s > 1 ? 's' : ''}, ${g} sous-workflow${g > 1 ? 's' : ''}, ${f} chemin${f > 1 ? 's' : ''} d’échec. Flèches : naviguer ; Entrée : révéler dans l’éditeur ; ? : aide.`,
  ariaStep: ({ order, total, id, kindText, source, exits, diagnostics }) =>
    [
      order ? `Étape ${order} sur ${total}` : 'Étape',
      id,
      kindText,
      source ? `source ${source}` : '',
      exits.length ? `${exits.length} issue${exits.length > 1 ? 's' : ''} : ${exits.join(', ')}` : 'aucune issue',
      diagnostics ? `${diagnostics} diagnostic${diagnostics > 1 ? 's' : ''}` : '',
    ]
      .filter(Boolean)
      .join(', '),
  ariaInputs: (n, req, names) =>
    `Entrées du workflow : ${n} propriété${n > 1 ? 's' : ''}, dont ${req} requise${req > 1 ? 's' : ''}${names.length ? ` : ${names.join(', ')}` : ''}`,
  ariaOutputs: (names) => `Sorties du workflow : ${names.join(', ') || 'aucune'}`,
  ariaEnd: (failure, from) => `Fin du workflow ${failure ? 'en échec' : 'en succès'}, atteinte depuis ${from} étape${from > 1 ? 's' : ''}`,
  ariaJunction: (t, deps) => `Jonction : l’étape ${t} attend ${deps.join(' et ')}`,
  ariaRef: (wf, src) => `Référence au workflow ${wf}${src ? ` de la source ${src}` : ''}`,
  ariaLane: (n) => `Couloir ${n}`,
  ariaSubworkflow: (n) => `Sous-workflow ${n}`,
  exitSuccess: (t) => `succès vers ${t}`,
  exitFailure: (t) => `échec vers ${t}`,
  exitRetry: (l, a, via) => `réessai ${l} fois${a ? ` après ${nfFr(a)} s` : ''}${via ? ` via ${via}` : ''}`,
  exitNext: (t) => `puis ${t}`,
  exitCall: (t) => `appelle ${t}`,
  exitDepends: (t) => `débloque ${t}`,
  kindHttp: (m, p) => `${m === 'OP' ? 'méthode non résolue' : m}${p ? ` ${p}` : ''}`,
  kindSend: (c) => `envoi de message sur le canal ${c}`,
  kindReceive: (c, t, corr) => `attente de message sur ${c}${t ? `, délai ${t}` : ''}${corr ? `, corrélation par ${corr}` : ''}`,
  kindWorkflow: (wf, col, n) => `appelle le workflow ${wf}${col ? `, replié${n ? `, ${n} étapes` : ''}` : ''}`,
  roleStep: 'étape',
  announceSelected: (l, d, e) => `${l} sélectionné. ${d}. ${e} issue${e > 1 ? 's' : ''}.`,
  announceLayout: (ms, n) => `Graphe mis en page : ${n} nœuds en ${ms} ms.`,
  announceLayoutPending: 'Mise en page du graphe…',
  announceLargeStart: 'Vue cadrée sur le début ; touche 1 pour tout voir.',
  announceSearch: (i, n, q) => `Résultat ${i} sur ${n} pour « ${q} ».`,
  announceNoResult: (q) => `Aucun résultat pour « ${q} ».`,
  announceFocusMode: (l) => `Mode focus autour de ${l}. Échap pour sortir.`,
  announceReveal: (l) => `Révéler ${l} dans l’éditeur.`,
  announceExported: (f) => `Export ${f} prêt.`,
  layoutError: 'La mise en page du graphe a échoué.',
  largeGraph: (n) => `Graphe volumineux (${n} nœuds) : libellés masqués sous 60 % de zoom ; la vue liste reste complète.`,
  ui: {
    search: 'Rechercher une étape',
    searchPlaceholder: 'Rechercher une étape  /',
    searchHint: 'Entrée : résultat suivant ; Maj+Entrée : précédent ; Échap : fermer.',
    clearSearch: 'Effacer la recherche',
    toolbar: 'Barre d’outils du graphe',
    zoomIn: 'Zoom avant (+)',
    zoomOut: 'Zoom arrière (-)',
    zoom100: 'Zoom 100 % (0)',
    fit: 'Ajuster à la vue (1)',
    direction: (d) => `Direction : ${d === 'TB' ? 'haut → bas' : 'gauche → droite'} (D)`,
    lanes: (m) => `Couloirs par source : ${m === 'off' ? 'désactivés' : m === 'clusters' ? 'groupes' : 'couloirs'} (L)`,
    lanesShort: (m) => (m === 'off' ? 'Off' : m === 'clusters' ? 'Groupes' : 'Couloirs'),
    density: (p, e) => `Densité : ${p === 'auto' ? `auto (${e})` : p}`,
    densityShort: (p) => ({ auto: 'Auto', compact: 'Compact', standard: 'Standard', detailed: 'Détaillé' })[p] ?? p,
    failureEdges: 'Arêtes d’échec (E)',
    implicitFailures: 'Échecs implicites (non gérés)',
    minimap: 'Mini-carte (M)',
    legend: 'Légende',
    listView: 'Vue liste (V)',
    exportMenu: 'Exporter',
    exportSvg: 'Image SVG',
    exportPng: 'Image PNG',
    exportMermaid: 'Mermaid (copier)',
    copied: 'Mermaid copié dans le presse-papiers.',
    help: 'Raccourcis clavier (?)',
    helpTitle: 'Raccourcis clavier du graphe',
    helpNote: 'Actifs uniquement quand le graphe a le focus. Aucun raccourci Ctrl/Cmd, sauf la recherche sur le web.',
    close: 'Fermer',
    collapse: (n) => `Replier le sous-workflow ${n}`,
    expand: (n) => `Déplier le sous-workflow ${n}`,
    unknownSource: 'Source inconnue',
    shortcuts: [
      ['Tab / Maj+Tab', 'Nœud suivant / précédent (ordre du document)'],
      ['↓ / ↑', 'Successeur / prédécesseur principal'],
      ['← / →', 'Voisin dans la même couche'],
      ['Alt+↓', 'Suivre l’arête d’échec'],
      ['Entrée', 'Révéler dans l’éditeur'],
      ['Espace', 'Sélectionner / désélectionner'],
      ['Échap', 'Sortir de la recherche, du focus, puis désélectionner'],
      ['+ / -', 'Zoom'],
      ['0', 'Zoom 100 %'],
      ['1 ou Maj+F', 'Ajuster à la vue'],
      ['F', 'Mode focus (voisinage 1 saut, 2 si répété)'],
      ['/ (Ctrl+F sur le web)', 'Rechercher une étape'],
      ['[ / ]', 'Replier / déplier le sous-workflow courant (Maj : tous)'],
      ['E', 'Afficher / masquer les arêtes d’échec'],
      ['L', 'Couloirs : off → groupes → couloirs'],
      ['D', 'Direction TB / LR'],
      ['M', 'Mini-carte'],
      ['V', 'Vue liste'],
      ['?', 'Cette aide'],
    ],
    legendEdges: 'Types d’arêtes',
    legendNodes: 'Types de nœuds',
    legendEdgeLabels: {
      sequence: 'Séquence (implicite)',
      success: 'Succès (goto)',
      failure: 'Échec (goto)',
      retry: 'Retry (boucle)',
      'end-success': 'Fin (succès)',
      'end-failure': 'Fin (échec)',
      'implicit-failure': 'Échec non géré (option)',
      'depends-on': 'dependsOn',
      'workflow-call': 'Appel de workflow',
      transfer: 'Transfert (goto workflow)',
    },
    legendNodeLabels: {
      http: 'Étape HTTP (méthode résolue)',
      send: 'AsyncAPI send',
      receive: 'AsyncAPI receive (⏱ timeout, corrélation)',
      workflow: 'Étape sous-workflow',
      junction: 'Jonction dependsOn',
      end: 'Fin / Échec',
      ref: 'Référence de workflow',
    },
    minimapLabel: 'Mini-carte du graphe',
    nodeA11y: 'Flèches pour naviguer entre les étapes, Entrée pour révéler dans l’éditeur, Espace pour sélectionner.',
    edgeA11y: 'Transition entre deux étapes.',
    listTitle: 'Étapes du workflow (vue liste)',
  },
};

export const en: Messages = {
  ...fr,
  lang: 'en',
  inputs: 'Inputs',
  outputs: 'Outputs',
  endSuccess: 'End',
  endFailure: 'Failure',
  junction: 'Join',
  step: 'Step',
  steps: (n) => `${n} step${n > 1 ? 's' : ''}`,
  criteria: (n) => `${n} criteri${n > 1 ? 'a' : 'on'}`,
  outputsCount: (n) => `${n} output${n > 1 ? 's' : ''}`,
  params: (n) => `${n} parameter${n > 1 ? 's' : ''}`,
  props: (n, req) => `${n} propert${n > 1 ? 'ies' : 'y'} · ${req} required`,
  required: 'required',
  external: 'external',
  unresolved: 'Unknown method: operation not resolved in source',
  methodFromPath: 'Exact method, read from operationPath',
  methodFromOpenApi: 'Method from the resolved OpenAPI',
  workflowDefaults: 'Workflow default rules',
  workflowDefaultsHint: 'apply to every step marked ⓦ (overridden by name at step level)',
  then: 'Then',
  unhandledFailure: 'unhandled failure',
  end: 'end',
  if: 'if',
  and: 'AND',
  reusable: (r) => `(reusable ${r})`,
  defaultValues: '(default values)',
  graphLabel: (wf) => `Workflow graph ${wf}`,
  graphDescription: (s, g, f) =>
    `${s} step${s > 1 ? 's' : ''}, ${g} sub-workflow${g > 1 ? 's' : ''}, ${f} failure path${f > 1 ? 's' : ''}. Arrows: navigate; Enter: reveal in editor; ?: help.`,
  ariaStep: ({ order, total, id, kindText, source, exits, diagnostics }) =>
    [
      order ? `Step ${order} of ${total}` : 'Step',
      id,
      kindText,
      source ? `source ${source}` : '',
      exits.length ? `${exits.length} exit${exits.length > 1 ? 's' : ''}: ${exits.join(', ')}` : 'no exit',
      diagnostics ? `${diagnostics} diagnostic${diagnostics > 1 ? 's' : ''}` : '',
    ]
      .filter(Boolean)
      .join(', '),
  ariaInputs: (n, req, names) => `Workflow inputs: ${n} propert${n > 1 ? 'ies' : 'y'}, ${req} required${names.length ? `: ${names.join(', ')}` : ''}`,
  ariaOutputs: (names) => `Workflow outputs: ${names.join(', ') || 'none'}`,
  ariaEnd: (failure, from) => `Workflow ${failure ? 'failure' : 'success'} end, reached from ${from} step${from > 1 ? 's' : ''}`,
  ariaJunction: (t, deps) => `Join: step ${t} waits for ${deps.join(' and ')}`,
  ariaRef: (wf, src) => `Reference to workflow ${wf}${src ? ` from source ${src}` : ''}`,
  ariaLane: (n) => `Lane ${n}`,
  ariaSubworkflow: (n) => `Sub-workflow ${n}`,
  exitSuccess: (t) => `success to ${t}`,
  exitFailure: (t) => `failure to ${t}`,
  exitRetry: (l, a, via) => `retry ${l} time${l > 1 ? 's' : ''}${a ? ` after ${a} s` : ''}${via ? ` via ${via}` : ''}`,
  exitNext: (t) => `then ${t}`,
  exitCall: (t) => `calls ${t}`,
  exitDepends: (t) => `unblocks ${t}`,
  kindHttp: (m, p) => `${m === 'OP' ? 'unresolved method' : m}${p ? ` ${p}` : ''}`,
  kindSend: (c) => `sends a message on channel ${c}`,
  kindReceive: (c, t, corr) => `waits for a message on ${c}${t ? `, timeout ${t}` : ''}${corr ? `, correlated by ${corr}` : ''}`,
  kindWorkflow: (wf, col, n) => `calls workflow ${wf}${col ? `, collapsed${n ? `, ${n} steps` : ''}` : ''}`,
  roleStep: 'step',
  announceSelected: (l, d, e) => `${l} selected. ${d}. ${e} exit${e > 1 ? 's' : ''}.`,
  announceLayout: (ms, n) => `Graph laid out: ${n} nodes in ${ms} ms.`,
  announceLayoutPending: 'Laying out graph…',
  announceLargeStart: 'View framed on the start; press 1 to see everything.',
  announceSearch: (i, n, q) => `Result ${i} of ${n} for “${q}”.`,
  announceNoResult: (q) => `No result for “${q}”.`,
  announceFocusMode: (l) => `Focus mode around ${l}. Escape to exit.`,
  announceReveal: (l) => `Reveal ${l} in editor.`,
  announceExported: (f) => `${f} export ready.`,
  layoutError: 'Graph layout failed.',
  largeGraph: (n) => `Large graph (${n} nodes): labels hidden below 60% zoom; the list view stays complete.`,
  ui: {
    ...fr.ui,
    search: 'Search a step',
    searchPlaceholder: 'Search a step  /',
    searchHint: 'Enter: next result; Shift+Enter: previous; Escape: close.',
    clearSearch: 'Clear search',
    toolbar: 'Graph toolbar',
    zoomIn: 'Zoom in (+)',
    zoomOut: 'Zoom out (-)',
    zoom100: 'Zoom 100% (0)',
    fit: 'Fit view (1)',
    direction: (d) => `Direction: ${d === 'TB' ? 'top → bottom' : 'left → right'} (D)`,
    lanes: (m) => `Lanes by source: ${m === 'off' ? 'off' : m === 'clusters' ? 'groups' : 'lanes'} (L)`,
    lanesShort: (m) => (m === 'off' ? 'Off' : m === 'clusters' ? 'Groups' : 'Lanes'),
    density: (p, e) => `Density: ${p === 'auto' ? `auto (${e})` : p}`,
    densityShort: (p) => ({ auto: 'Auto', compact: 'Compact', standard: 'Standard', detailed: 'Detailed' })[p] ?? p,
    failureEdges: 'Failure edges (E)',
    implicitFailures: 'Implicit (unhandled) failures',
    minimap: 'Minimap (M)',
    legend: 'Legend',
    listView: 'List view (V)',
    exportMenu: 'Export',
    exportSvg: 'SVG image',
    exportPng: 'PNG image',
    exportMermaid: 'Mermaid (copy)',
    copied: 'Mermaid copied to clipboard.',
    help: 'Keyboard shortcuts (?)',
    helpTitle: 'Graph keyboard shortcuts',
    helpNote: 'Only active when the graph has focus. No Ctrl/Cmd shortcut, except search on the web.',
    close: 'Close',
    collapse: (n) => `Collapse sub-workflow ${n}`,
    expand: (n) => `Expand sub-workflow ${n}`,
    unknownSource: 'Unknown source',
    shortcuts: [
      ['Tab / Shift+Tab', 'Next / previous node (document order)'],
      ['↓ / ↑', 'Main successor / predecessor'],
      ['← / →', 'Neighbour in the same layer'],
      ['Alt+↓', 'Follow the failure edge'],
      ['Enter', 'Reveal in editor'],
      ['Space', 'Select / deselect'],
      ['Escape', 'Leave search, focus mode, then deselect'],
      ['+ / -', 'Zoom'],
      ['0', 'Zoom 100%'],
      ['1 or Shift+F', 'Fit view'],
      ['F', 'Focus mode (1-hop neighbourhood, 2 if repeated)'],
      ['/ (Ctrl+F on the web)', 'Search a step'],
      ['[ / ]', 'Collapse / expand current sub-workflow (Shift: all)'],
      ['E', 'Show / hide failure edges'],
      ['L', 'Lanes: off → groups → lanes'],
      ['D', 'Direction TB / LR'],
      ['M', 'Minimap'],
      ['V', 'List view'],
      ['?', 'This help'],
    ],
    legendEdges: 'Edge types',
    legendNodes: 'Node types',
    legendEdgeLabels: {
      sequence: 'Sequence (implicit)',
      success: 'Success (goto)',
      failure: 'Failure (goto)',
      retry: 'Retry (loop)',
      'end-success': 'End (success)',
      'end-failure': 'End (failure)',
      'implicit-failure': 'Unhandled failure (option)',
      'depends-on': 'dependsOn',
      'workflow-call': 'Workflow call',
      transfer: 'Transfer (goto workflow)',
    },
    legendNodeLabels: {
      http: 'HTTP step (resolved method)',
      send: 'AsyncAPI send',
      receive: 'AsyncAPI receive (⏱ timeout, correlation)',
      workflow: 'Sub-workflow step',
      junction: 'dependsOn join',
      end: 'End / Failure',
      ref: 'Workflow reference',
    },
    minimapLabel: 'Graph minimap',
    nodeA11y: 'Arrows to move between steps, Enter to reveal in editor, Space to select.',
    edgeA11y: 'Transition between two steps.',
    listTitle: 'Workflow steps (list view)',
  },
};
