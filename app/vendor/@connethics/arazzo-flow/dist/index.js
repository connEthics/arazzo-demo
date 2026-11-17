import { createContext, memo, forwardRef, useState, useMemo, useContext, useSyncExternalStore, useRef, useEffect, useCallback, useImperativeHandle } from 'react';
import { Position, getSmoothStepPath, EdgeLabelRenderer, ReactFlowProvider, Handle, useReactFlow, useStore, ReactFlow, Background, BackgroundVariant, MiniMap, Panel } from '@xyflow/react';
import ELKApi from 'elkjs/lib/elk-api.js';
import { jsxs, jsx, Fragment } from 'react/jsx-runtime';
import { workflowToGraph, graphToMermaid } from '@connethics/arazzo-core';

// src/ArazzoGraph.tsx

// src/messages.ts
var nfFr = (n) => String(n).replace(".", ",");
var fr = {
  lang: "fr",
  inputs: "Entr\xE9es",
  outputs: "Sorties",
  endSuccess: "Fin",
  endFailure: "\xC9chec",
  junction: "Jonction",
  step: "\xC9tape",
  steps: (n) => `${n} \xE9tape${n > 1 ? "s" : ""}`,
  criteria: (n) => `${n} crit\xE8re${n > 1 ? "s" : ""}`,
  outputsCount: (n) => `${n} output${n > 1 ? "s" : ""}`,
  params: (n) => `${n} param\xE8tre${n > 1 ? "s" : ""}`,
  props: (n, req) => `${n} propri\xE9t\xE9${n > 1 ? "s" : ""} \xB7 ${req} requise${req > 1 ? "s" : ""}`,
  required: "requis",
  external: "externe",
  unresolved: "M\xE9thode inconnue : op\xE9ration non r\xE9solue dans la source",
  methodFromPath: "M\xE9thode exacte, lue dans operationPath",
  methodFromOpenApi: "M\xE9thode issue de l\u2019OpenAPI r\xE9solu",
  workflowDefaults: "R\xE8gles par d\xE9faut du workflow",
  workflowDefaultsHint: "s\u2019appliquent \xE0 toutes les \xE9tapes marqu\xE9es \u24E6 (surcharg\xE9es par nom au niveau de l\u2019\xE9tape)",
  then: "Puis",
  unhandledFailure: "\xE9chec non g\xE9r\xE9",
  end: "fin",
  if: "si",
  and: "ET",
  reusable: (r) => `(r\xE9utilisable ${r})`,
  defaultValues: "(valeurs par d\xE9faut)",
  graphLabel: (wf) => `Graphe du workflow ${wf}`,
  graphDescription: (s, g, f) => `${s} \xE9tape${s > 1 ? "s" : ""}, ${g} sous-workflow${g > 1 ? "s" : ""}, ${f} chemin${f > 1 ? "s" : ""} d\u2019\xE9chec. Fl\xE8ches : naviguer ; Entr\xE9e : r\xE9v\xE9ler dans l\u2019\xE9diteur ; ? : aide.`,
  ariaStep: ({ order, total, id, kindText: kindText2, source, exits, diagnostics }) => [
    order ? `\xC9tape ${order} sur ${total}` : "\xC9tape",
    id,
    kindText2,
    source ? `source ${source}` : "",
    exits.length ? `${exits.length} issue${exits.length > 1 ? "s" : ""} : ${exits.join(", ")}` : "aucune issue",
    diagnostics ? `${diagnostics} diagnostic${diagnostics > 1 ? "s" : ""}` : ""
  ].filter(Boolean).join(", "),
  ariaInputs: (n, req, names) => `Entr\xE9es du workflow : ${n} propri\xE9t\xE9${n > 1 ? "s" : ""}, dont ${req} requise${req > 1 ? "s" : ""}${names.length ? ` : ${names.join(", ")}` : ""}`,
  ariaOutputs: (names) => `Sorties du workflow : ${names.join(", ") || "aucune"}`,
  ariaEnd: (failure, from) => `Fin du workflow ${failure ? "en \xE9chec" : "en succ\xE8s"}, atteinte depuis ${from} \xE9tape${from > 1 ? "s" : ""}`,
  ariaJunction: (t, deps) => `Jonction : l\u2019\xE9tape ${t} attend ${deps.join(" et ")}`,
  ariaRef: (wf, src) => `R\xE9f\xE9rence au workflow ${wf}${src ? ` de la source ${src}` : ""}`,
  ariaLane: (n) => `Couloir ${n}`,
  ariaSubworkflow: (n) => `Sous-workflow ${n}`,
  exitSuccess: (t) => `succ\xE8s vers ${t}`,
  exitFailure: (t) => `\xE9chec vers ${t}`,
  exitRetry: (l, a, via) => `r\xE9essai ${l} fois${a ? ` apr\xE8s ${nfFr(a)} s` : ""}${via ? ` via ${via}` : ""}`,
  exitNext: (t) => `puis ${t}`,
  exitCall: (t) => `appelle ${t}`,
  exitDepends: (t) => `d\xE9bloque ${t}`,
  kindHttp: (m, p) => `${m === "OP" ? "m\xE9thode non r\xE9solue" : m}${p ? ` ${p}` : ""}`,
  kindSend: (c) => `envoi de message sur le canal ${c}`,
  kindReceive: (c, t, corr) => `attente de message sur ${c}${t ? `, d\xE9lai ${t}` : ""}${corr ? `, corr\xE9lation par ${corr}` : ""}`,
  kindWorkflow: (wf, col, n) => `appelle le workflow ${wf}${col ? `, repli\xE9${n ? `, ${n} \xE9tapes` : ""}` : ""}`,
  roleStep: "\xE9tape",
  announceSelected: (l, d, e) => `${l} s\xE9lectionn\xE9. ${d}. ${e} issue${e > 1 ? "s" : ""}.`,
  announceLayout: (ms, n) => `Graphe mis en page : ${n} n\u0153uds en ${ms} ms.`,
  announceLayoutPending: "Mise en page du graphe\u2026",
  announceLargeStart: "Vue cadr\xE9e sur le d\xE9but ; touche 1 pour tout voir.",
  announceSearch: (i, n, q) => `R\xE9sultat ${i} sur ${n} pour \xAB ${q} \xBB.`,
  announceNoResult: (q) => `Aucun r\xE9sultat pour \xAB ${q} \xBB.`,
  announceFocusMode: (l) => `Mode focus autour de ${l}. \xC9chap pour sortir.`,
  announceReveal: (l) => `R\xE9v\xE9ler ${l} dans l\u2019\xE9diteur.`,
  announceExported: (f) => `Export ${f} pr\xEAt.`,
  layoutError: "La mise en page du graphe a \xE9chou\xE9.",
  largeGraph: (n) => `Graphe volumineux (${n} n\u0153uds) : libell\xE9s masqu\xE9s sous 60 % de zoom ; la vue liste reste compl\xE8te.`,
  ui: {
    search: "Rechercher une \xE9tape",
    searchPlaceholder: "Rechercher une \xE9tape  /",
    searchHint: "Entr\xE9e : r\xE9sultat suivant ; Maj+Entr\xE9e : pr\xE9c\xE9dent ; \xC9chap : fermer.",
    clearSearch: "Effacer la recherche",
    toolbar: "Barre d\u2019outils du graphe",
    zoomIn: "Zoom avant (+)",
    zoomOut: "Zoom arri\xE8re (-)",
    zoom100: "Zoom 100 % (0)",
    fit: "Ajuster \xE0 la vue (1)",
    direction: (d) => `Direction : ${d === "TB" ? "haut \u2192 bas" : "gauche \u2192 droite"} (D)`,
    lanes: (m) => `Couloirs par source : ${m === "off" ? "d\xE9sactiv\xE9s" : m === "clusters" ? "groupes" : "couloirs"} (L)`,
    lanesShort: (m) => m === "off" ? "Off" : m === "clusters" ? "Groupes" : "Couloirs",
    density: (p, e) => `Densit\xE9 : ${p === "auto" ? `auto (${e})` : p}`,
    densityShort: (p) => ({ auto: "Auto", compact: "Compact", standard: "Standard", detailed: "D\xE9taill\xE9" })[p] ?? p,
    failureEdges: "Ar\xEAtes d\u2019\xE9chec (E)",
    implicitFailures: "\xC9checs implicites (non g\xE9r\xE9s)",
    minimap: "Mini-carte (M)",
    legend: "L\xE9gende",
    listView: "Vue liste (V)",
    exportMenu: "Exporter",
    exportSvg: "Image SVG",
    exportPng: "Image PNG",
    exportMermaid: "Mermaid (copier)",
    copied: "Mermaid copi\xE9 dans le presse-papiers.",
    help: "Raccourcis clavier (?)",
    helpTitle: "Raccourcis clavier du graphe",
    helpNote: "Actifs uniquement quand le graphe a le focus. Aucun raccourci Ctrl/Cmd, sauf la recherche sur le web.",
    close: "Fermer",
    collapse: (n) => `Replier le sous-workflow ${n}`,
    expand: (n) => `D\xE9plier le sous-workflow ${n}`,
    unknownSource: "Source inconnue",
    shortcuts: [
      ["Tab / Maj+Tab", "N\u0153ud suivant / pr\xE9c\xE9dent (ordre du document)"],
      ["\u2193 / \u2191", "Successeur / pr\xE9d\xE9cesseur principal"],
      ["\u2190 / \u2192", "Voisin dans la m\xEAme couche"],
      ["Alt+\u2193", "Suivre l\u2019ar\xEAte d\u2019\xE9chec"],
      ["Entr\xE9e", "R\xE9v\xE9ler dans l\u2019\xE9diteur"],
      ["Espace", "S\xE9lectionner / d\xE9s\xE9lectionner"],
      ["\xC9chap", "Sortir de la recherche, du focus, puis d\xE9s\xE9lectionner"],
      ["+ / -", "Zoom"],
      ["0", "Zoom 100 %"],
      ["1 ou Maj+F", "Ajuster \xE0 la vue"],
      ["F", "Mode focus (voisinage 1 saut, 2 si r\xE9p\xE9t\xE9)"],
      ["/ (Ctrl+F sur le web)", "Rechercher une \xE9tape"],
      ["[ / ]", "Replier / d\xE9plier le sous-workflow courant (Maj : tous)"],
      ["E", "Afficher / masquer les ar\xEAtes d\u2019\xE9chec"],
      ["L", "Couloirs : off \u2192 groupes \u2192 couloirs"],
      ["D", "Direction TB / LR"],
      ["M", "Mini-carte"],
      ["V", "Vue liste"],
      ["?", "Cette aide"]
    ],
    legendEdges: "Types d\u2019ar\xEAtes",
    legendNodes: "Types de n\u0153uds",
    legendEdgeLabels: {
      sequence: "S\xE9quence (implicite)",
      success: "Succ\xE8s (goto)",
      failure: "\xC9chec (goto)",
      retry: "Retry (boucle)",
      "end-success": "Fin (succ\xE8s)",
      "end-failure": "Fin (\xE9chec)",
      "implicit-failure": "\xC9chec non g\xE9r\xE9 (option)",
      "depends-on": "dependsOn",
      "workflow-call": "Appel de workflow",
      transfer: "Transfert (goto workflow)"
    },
    legendNodeLabels: {
      http: "\xC9tape HTTP (m\xE9thode r\xE9solue)",
      send: "AsyncAPI send",
      receive: "AsyncAPI receive (\u23F1 timeout, corr\xE9lation)",
      workflow: "\xC9tape sous-workflow",
      junction: "Jonction dependsOn",
      end: "Fin / \xC9chec",
      ref: "R\xE9f\xE9rence de workflow"
    },
    minimapLabel: "Mini-carte du graphe",
    nodeA11y: "Fl\xE8ches pour naviguer entre les \xE9tapes, Entr\xE9e pour r\xE9v\xE9ler dans l\u2019\xE9diteur, Espace pour s\xE9lectionner.",
    edgeA11y: "Transition entre deux \xE9tapes.",
    listTitle: "\xC9tapes du workflow (vue liste)"
  }
};
var en = {
  ...fr,
  lang: "en",
  inputs: "Inputs",
  outputs: "Outputs",
  endSuccess: "End",
  endFailure: "Failure",
  junction: "Join",
  step: "Step",
  steps: (n) => `${n} step${n > 1 ? "s" : ""}`,
  criteria: (n) => `${n} criteri${n > 1 ? "a" : "on"}`,
  outputsCount: (n) => `${n} output${n > 1 ? "s" : ""}`,
  params: (n) => `${n} parameter${n > 1 ? "s" : ""}`,
  props: (n, req) => `${n} propert${n > 1 ? "ies" : "y"} \xB7 ${req} required`,
  required: "required",
  external: "external",
  unresolved: "Unknown method: operation not resolved in source",
  methodFromPath: "Exact method, read from operationPath",
  methodFromOpenApi: "Method from the resolved OpenAPI",
  workflowDefaults: "Workflow default rules",
  workflowDefaultsHint: "apply to every step marked \u24E6 (overridden by name at step level)",
  then: "Then",
  unhandledFailure: "unhandled failure",
  end: "end",
  if: "if",
  and: "AND",
  reusable: (r) => `(reusable ${r})`,
  defaultValues: "(default values)",
  graphLabel: (wf) => `Workflow graph ${wf}`,
  graphDescription: (s, g, f) => `${s} step${s > 1 ? "s" : ""}, ${g} sub-workflow${g > 1 ? "s" : ""}, ${f} failure path${f > 1 ? "s" : ""}. Arrows: navigate; Enter: reveal in editor; ?: help.`,
  ariaStep: ({ order, total, id, kindText: kindText2, source, exits, diagnostics }) => [
    order ? `Step ${order} of ${total}` : "Step",
    id,
    kindText2,
    source ? `source ${source}` : "",
    exits.length ? `${exits.length} exit${exits.length > 1 ? "s" : ""}: ${exits.join(", ")}` : "no exit",
    diagnostics ? `${diagnostics} diagnostic${diagnostics > 1 ? "s" : ""}` : ""
  ].filter(Boolean).join(", "),
  ariaInputs: (n, req, names) => `Workflow inputs: ${n} propert${n > 1 ? "ies" : "y"}, ${req} required${names.length ? `: ${names.join(", ")}` : ""}`,
  ariaOutputs: (names) => `Workflow outputs: ${names.join(", ") || "none"}`,
  ariaEnd: (failure, from) => `Workflow ${failure ? "failure" : "success"} end, reached from ${from} step${from > 1 ? "s" : ""}`,
  ariaJunction: (t, deps) => `Join: step ${t} waits for ${deps.join(" and ")}`,
  ariaRef: (wf, src) => `Reference to workflow ${wf}${src ? ` from source ${src}` : ""}`,
  ariaLane: (n) => `Lane ${n}`,
  ariaSubworkflow: (n) => `Sub-workflow ${n}`,
  exitSuccess: (t) => `success to ${t}`,
  exitFailure: (t) => `failure to ${t}`,
  exitRetry: (l, a, via) => `retry ${l} time${l > 1 ? "s" : ""}${a ? ` after ${a} s` : ""}${via ? ` via ${via}` : ""}`,
  exitNext: (t) => `then ${t}`,
  exitCall: (t) => `calls ${t}`,
  exitDepends: (t) => `unblocks ${t}`,
  kindHttp: (m, p) => `${m === "OP" ? "unresolved method" : m}${p ? ` ${p}` : ""}`,
  kindSend: (c) => `sends a message on channel ${c}`,
  kindReceive: (c, t, corr) => `waits for a message on ${c}${t ? `, timeout ${t}` : ""}${corr ? `, correlated by ${corr}` : ""}`,
  kindWorkflow: (wf, col, n) => `calls workflow ${wf}${col ? `, collapsed${n ? `, ${n} steps` : ""}` : ""}`,
  roleStep: "step",
  announceSelected: (l, d, e) => `${l} selected. ${d}. ${e} exit${e > 1 ? "s" : ""}.`,
  announceLayout: (ms, n) => `Graph laid out: ${n} nodes in ${ms} ms.`,
  announceLayoutPending: "Laying out graph\u2026",
  announceLargeStart: "View framed on the start; press 1 to see everything.",
  announceSearch: (i, n, q) => `Result ${i} of ${n} for \u201C${q}\u201D.`,
  announceNoResult: (q) => `No result for \u201C${q}\u201D.`,
  announceFocusMode: (l) => `Focus mode around ${l}. Escape to exit.`,
  announceReveal: (l) => `Reveal ${l} in editor.`,
  announceExported: (f) => `${f} export ready.`,
  layoutError: "Graph layout failed.",
  largeGraph: (n) => `Large graph (${n} nodes): labels hidden below 60% zoom; the list view stays complete.`,
  ui: {
    ...fr.ui,
    search: "Search a step",
    searchPlaceholder: "Search a step  /",
    searchHint: "Enter: next result; Shift+Enter: previous; Escape: close.",
    clearSearch: "Clear search",
    toolbar: "Graph toolbar",
    zoomIn: "Zoom in (+)",
    zoomOut: "Zoom out (-)",
    zoom100: "Zoom 100% (0)",
    fit: "Fit view (1)",
    direction: (d) => `Direction: ${d === "TB" ? "top \u2192 bottom" : "left \u2192 right"} (D)`,
    lanes: (m) => `Lanes by source: ${m === "off" ? "off" : m === "clusters" ? "groups" : "lanes"} (L)`,
    lanesShort: (m) => m === "off" ? "Off" : m === "clusters" ? "Groups" : "Lanes",
    density: (p, e) => `Density: ${p === "auto" ? `auto (${e})` : p}`,
    densityShort: (p) => ({ auto: "Auto", compact: "Compact", standard: "Standard", detailed: "Detailed" })[p] ?? p,
    failureEdges: "Failure edges (E)",
    implicitFailures: "Implicit (unhandled) failures",
    minimap: "Minimap (M)",
    legend: "Legend",
    listView: "List view (V)",
    exportMenu: "Export",
    exportSvg: "SVG image",
    exportPng: "PNG image",
    exportMermaid: "Mermaid (copy)",
    copied: "Mermaid copied to clipboard.",
    help: "Keyboard shortcuts (?)",
    helpTitle: "Graph keyboard shortcuts",
    helpNote: "Only active when the graph has focus. No Ctrl/Cmd shortcut, except search on the web.",
    close: "Close",
    collapse: (n) => `Collapse sub-workflow ${n}`,
    expand: (n) => `Expand sub-workflow ${n}`,
    unknownSource: "Unknown source",
    shortcuts: [
      ["Tab / Shift+Tab", "Next / previous node (document order)"],
      ["\u2193 / \u2191", "Main successor / predecessor"],
      ["\u2190 / \u2192", "Neighbour in the same layer"],
      ["Alt+\u2193", "Follow the failure edge"],
      ["Enter", "Reveal in editor"],
      ["Space", "Select / deselect"],
      ["Escape", "Leave search, focus mode, then deselect"],
      ["+ / -", "Zoom"],
      ["0", "Zoom 100%"],
      ["1 or Shift+F", "Fit view"],
      ["F", "Focus mode (1-hop neighbourhood, 2 if repeated)"],
      ["/ (Ctrl+F on the web)", "Search a step"],
      ["[ / ]", "Collapse / expand current sub-workflow (Shift: all)"],
      ["E", "Show / hide failure edges"],
      ["L", "Lanes: off \u2192 groups \u2192 lanes"],
      ["D", "Direction TB / LR"],
      ["M", "Minimap"],
      ["V", "List view"],
      ["?", "This help"]
    ],
    legendEdges: "Edge types",
    legendNodes: "Node types",
    legendEdgeLabels: {
      sequence: "Sequence (implicit)",
      success: "Success (goto)",
      failure: "Failure (goto)",
      retry: "Retry (loop)",
      "end-success": "End (success)",
      "end-failure": "End (failure)",
      "implicit-failure": "Unhandled failure (option)",
      "depends-on": "dependsOn",
      "workflow-call": "Workflow call",
      transfer: "Transfer (goto workflow)"
    },
    legendNodeLabels: {
      http: "HTTP step (resolved method)",
      send: "AsyncAPI send",
      receive: "AsyncAPI receive (\u23F1 timeout, correlation)",
      workflow: "Sub-workflow step",
      junction: "dependsOn join",
      end: "End / Failure",
      ref: "Workflow reference"
    },
    minimapLabel: "Graph minimap",
    nodeA11y: "Arrows to move between steps, Enter to reveal in editor, Space to select.",
    edgeA11y: "Transition between two steps.",
    listTitle: "Workflow steps (list view)"
  }
};

// src/format.ts
function formatTimeout(ms, lang = "fr") {
  if (ms < 1e3) return `${ms} ms`;
  const s = Math.round(ms / 1e3 * 10) / 10;
  return `${lang === "fr" ? String(s).replace(".", ",") : s} s`;
}
function formatSeconds(s, lang = "fr") {
  return `${lang === "fr" ? String(s).replace(".", ",") : s} s`;
}
function truncate(s, n) {
  return s.length > n ? `${s.slice(0, n - 1)}\u2026` : s;
}
function shortWorkflow(id) {
  const m = /^\$sourceDescriptions\.([^.]+)\.(.+)$/.exec(id);
  return m ? m[2] : id;
}
function shortOperationId(id) {
  return id.replace(/^\$sourceDescriptions\.[^.]+\./, "");
}
function operationLabel(n) {
  if (n.method && n.path && n.methodSource !== "unresolved") return `${n.method} ${n.path}`;
  if (n.operationId) return shortOperationId(n.operationId) || void 0;
  return void 0;
}
function edgeLabelText(e, density, lang = "fr") {
  const crit = e.criteria?.[0]?.condition;
  const withCrit = (base) => density === "detailed" && crit ? `${base} \xB7 ${truncate(crit, 24)}` : base;
  const end = lang === "fr" ? "fin" : "end";
  switch (e.kind) {
    case "sequence":
    case "depends-on":
      return "";
    case "success":
      return withCrit(`\u2713 ${e.name ?? truncate(crit ?? "", 24)}${e.backward ? " \u21BA" : ""}`);
    case "failure":
      return withCrit(`\u2717 ${e.name ?? truncate(crit ?? "", 24)}${e.backward ? " \u21BA" : ""}`);
    case "retry":
      if (e.via) return `\u21BB via ${shortWorkflow(e.via)}`;
      return withCrit(`\u21BB \xD7${e.retryLimit ?? 1}${e.retryAfter ? ` \xB7 ${formatSeconds(e.retryAfter, lang)}` : ""}`);
    case "end-success":
      return e.criteria?.length ? withCrit(`\u2713 ${e.name ?? end}`) : "";
    case "end-failure":
      return withCrit(`\u2717 ${e.name ?? end}`);
    case "implicit-failure":
      return lang === "fr" ? "\xE9chec non g\xE9r\xE9" : "unhandled failure";
    case "workflow-call":
      return `\u21E2 ${shortWorkflow(e.via ?? "")}`;
    case "transfer":
      return `${e.origin === "onFailure" ? "\u2717" : "\u2713"} \u2197 ${shortWorkflow(e.via ?? "")}`;
  }
}
var NODE_WIDTH = { TB: 240, LR: 220 };
var HEIGHTS = { compact: 44, standard: 96, line: 18, maxLines: 5 };
function detailLines(n) {
  if (n.kind === "step") return Math.min(n.criteria?.length ?? 0, HEIGHTS.maxLines);
  if (n.kind === "input") return Math.min(n.inputs?.length ?? 0, HEIGHTS.maxLines);
  if (n.kind === "output") return Math.min(n.workflowOutputs?.length ?? 0, HEIGHTS.maxLines);
  return 0;
}
function nodeSize(n, density, dir) {
  switch (n.kind) {
    case "end":
      return { width: 72, height: 50 };
    case "junction":
      return { width: 28, height: 28 };
    case "workflow-ref":
      return { width: 200, height: 36 };
    default: {
      const width = NODE_WIDTH[dir];
      if (density === "compact") return { width, height: HEIGHTS.compact };
      if (density === "standard") return { width, height: HEIGHTS.standard };
      const lines = detailLines(n);
      return { width, height: HEIGHTS.standard + (lines ? 8 + lines * HEIGHTS.line : 0) };
    }
  }
}
var ctx;
var LABEL_FONT = "500 11px Inter, ui-sans-serif, system-ui, sans-serif";
function measureLabel(text) {
  if (!text) return { width: 0, height: 0 };
  try {
    if (ctx === void 0) {
      ctx = typeof document !== "undefined" && typeof navigator !== "undefined" && !/jsdom/i.test(navigator.userAgent) ? document.createElement("canvas").getContext("2d") : null;
    }
    if (ctx) {
      ctx.font = LABEL_FONT;
      return { width: Math.ceil(ctx.measureText(text).width) + 16, height: 20 };
    }
  } catch {
    ctx = null;
  }
  return { width: Math.ceil(text.length * 6.4) + 16, height: 20 };
}
function methodText(n) {
  if (n.stepKind === "async-send") return "SEND";
  if (n.stepKind === "async-receive") return "RECEIVE";
  if (n.stepKind === "workflow") return "WORKFLOW";
  if (n.methodSource === "unresolved" || !n.method) return "OP";
  return n.method;
}
function badgeClass(n) {
  const k = n.stepKind;
  if (k === "async-send") return "send";
  if (k === "async-receive") return "receive";
  if (k === "workflow") return "workflow";
  const t = methodText(n);
  return t === "OP" ? "op" : t.toLowerCase();
}
function kindText(n, m) {
  switch (n.stepKind) {
    case "async-send":
      return m.kindSend(n.channel ?? "?");
    case "async-receive":
      return m.kindReceive(n.channel ?? "?", n.timeoutMs != null ? formatTimeout(n.timeoutMs, m.lang) : void 0, n.correlationId);
    case "workflow":
      return m.kindWorkflow(shortWorkflow(n.targetWorkflowId ?? "?"), n.collapsed, n.innerStepCount);
    default:
      return m.kindHttp(methodText(n), n.path);
  }
}
function nodeName(n, m, fallback = "?") {
  if (!n) return fallback;
  if (n.kind === "end") return n.endType === "failure" ? m.endFailure : m.endSuccess;
  if (n.kind === "output") return m.outputs;
  if (n.kind === "input") return m.inputs;
  if (n.kind === "junction") return m.junction;
  if (n.kind === "workflow-ref") return shortWorkflow(n.targetWorkflowId ?? n.label);
  return n.label;
}
function exitText(e, target, m) {
  const endName = m.lang === "fr" ? target?.endType === "failure" ? "la fin en \xE9chec" : "la fin" : target?.endType === "failure" ? "the failure end" : "the end";
  const t = target ? target.kind === "end" ? endName : target.kind === "output" || target.kind === "junction" ? nodeName(target, m).toLowerCase() : nodeName(target, m) : e.target;
  switch (e.kind) {
    case "success":
    case "end-success":
      return m.exitSuccess(t);
    case "failure":
    case "end-failure":
    case "implicit-failure":
      return m.exitFailure(t);
    case "transfer":
      return e.origin === "onFailure" ? m.exitFailure(t) : m.exitSuccess(t);
    case "retry":
      return m.exitRetry(e.retryLimit ?? 1, e.retryAfter ?? 0, e.via ? shortWorkflow(e.via) : void 0);
    case "workflow-call":
      return m.exitCall(t);
    case "depends-on":
      return m.exitDepends(t);
    default:
      return m.exitNext(t);
  }
}
function edgeTitle(e, target, m, label) {
  const parts = [label || (e.kind === "sequence" ? m.then : e.kind), exitText(e, target, m)];
  if (e.criteria?.length) parts.push(`${m.if} ${e.criteria.map((c) => c.condition).join(` ${m.and} `)}`);
  if (e.reference) parts.push(m.reusable(e.reference));
  if (e.retryDefaults) parts.push(m.defaultValues);
  return parts.join(" \u2014 ");
}
function ariaLabelFor(n, g, m, byId) {
  const ids = byId ?? new Map(g.nodes.map((x) => [x.id, x]));
  const out = g.edges.filter((e) => e.source === n.id);
  switch (n.kind) {
    case "step": {
      const total = g.nodes.filter((x) => x.kind === "step" && x.workflowId === n.workflowId).length;
      return m.ariaStep({
        order: n.order,
        total,
        id: n.label,
        kindText: kindText(n, m),
        source: n.source,
        exits: out.map((e) => exitText(e, ids.get(e.target), m)),
        diagnostics: n.diagnostics?.length ?? 0
      });
    }
    case "input": {
      const ins = n.inputs ?? [];
      return m.ariaInputs(ins.length, ins.filter((i) => i.required).length, ins.map((i) => i.name));
    }
    case "output":
      return m.ariaOutputs((n.workflowOutputs ?? []).map((o) => o.name));
    case "end":
      return m.ariaEnd(n.endType === "failure", new Set(g.edges.filter((e) => e.target === n.id).map((e) => e.source)).size);
    case "junction": {
      const target = out[0] ? nodeName(ids.get(out[0].target), m) : "?";
      const deps = g.edges.filter((e) => e.target === n.id).map((e) => nodeName(ids.get(e.source), m, e.source));
      return m.ariaJunction(target, deps);
    }
    case "workflow-ref":
      return m.ariaRef(shortWorkflow(n.targetWorkflowId ?? n.label), n.source);
  }
}

// src/model.ts
var EDGE_KINDS = [
  "sequence",
  "success",
  "failure",
  "retry",
  "end-success",
  "end-failure",
  "implicit-failure",
  "depends-on",
  "workflow-call",
  "transfer"
];
var STEP_PORTS = ["in", "in-deps", "out-next", "out-success", "out-retry", "out-failure", "out-call"];

// src/layout/elk-options.ts
var ELK_ROOT_OPTIONS = {
  "org.eclipse.elk.algorithm": "layered",
  "org.eclipse.elk.direction": "DOWN",
  // 'RIGHT' en mode LR
  "org.eclipse.elk.edgeRouting": "ORTHOGONAL",
  "org.eclipse.elk.hierarchyHandling": "INCLUDE_CHILDREN",
  "org.eclipse.elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES",
  "org.eclipse.elk.layered.cycleBreaking.strategy": "MODEL_ORDER",
  "org.eclipse.elk.layered.feedbackEdges": "true",
  "org.eclipse.elk.layered.layering.strategy": "NETWORK_SIMPLEX",
  "org.eclipse.elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
  "org.eclipse.elk.layered.nodePlacement.strategy": "BRANDES_KOEPF",
  "org.eclipse.elk.layered.nodePlacement.bk.fixedAlignment": "BALANCED",
  "org.eclipse.elk.layered.mergeEdges": "false",
  "org.eclipse.elk.layered.thoroughness": "7",
  // remplacé par thoroughnessFor(n) : 7 jusqu'à 30 nœuds, 4 au-delà
  "org.eclipse.elk.spacing.nodeNode": "32",
  "org.eclipse.elk.layered.spacing.nodeNodeBetweenLayers": "56",
  "org.eclipse.elk.layered.spacing.edgeNodeBetweenLayers": "24",
  "org.eclipse.elk.layered.spacing.edgeEdgeBetweenLayers": "12",
  "org.eclipse.elk.spacing.edgeNode": "20",
  "org.eclipse.elk.spacing.edgeEdge": "12",
  "org.eclipse.elk.spacing.edgeLabel": "6",
  "org.eclipse.elk.spacing.componentComponent": "48",
  "org.eclipse.elk.separateConnectedComponents": "true",
  "org.eclipse.elk.padding": "[top=24,left=24,bottom=24,right=24]",
  "org.eclipse.elk.edgeLabels.placement": "CENTER",
  "org.eclipse.elk.edgeLabels.inline": "true",
  "org.eclipse.elk.layered.edgeRouting.selfLoopDistribution": "EQUALLY",
  "org.eclipse.elk.layered.edgeRouting.selfLoopOrdering": "STACKED",
  // Coordonnées absolues : le rendu React Flow est « à plat » (pas de parentId).
  "org.eclipse.elk.json.shapeCoords": "ROOT",
  "org.eclipse.elk.json.edgeCoords": "ROOT"
};
var ELK_NODE_OPTIONS = {
  "org.eclipse.elk.portConstraints": "FIXED_SIDE"
};
var ELK_GROUP_OPTIONS = {
  "org.eclipse.elk.padding": "[top=44,left=16,bottom=16,right=16]",
  "org.eclipse.elk.nodeSize.constraints": "MINIMUM_SIZE",
  "org.eclipse.elk.portConstraints": "FREE"
};
var ELK_GROUP_ENTRY_OPTIONS = {
  "org.eclipse.elk.portConstraints": "FIXED_SIDE",
  "org.eclipse.elk.portAlignment.default": "CENTER"
};
function thoroughnessFor(nodeCount) {
  return nodeCount <= 30 ? "7" : "4";
}
var ElkApiCtor = ELKApi.default ?? ELKApi;
var instance = null;
function terminate(i) {
  if (i?.mode !== "worker") return;
  try {
    i.elk.terminateWorker?.();
  } catch {
  }
}
function configKey(c) {
  return [c.mode ?? "auto", c.workerUrl ? String(c.workerUrl) : "", c.createWorker ? "factory" : "", c.engine ? "engine" : ""].join("|");
}
async function mainThreadElk() {
  const mod = await import('elkjs/lib/elk-worker.min.js');
  const pick = (m) => m && typeof m === "object" ? m.Worker ?? pick(m.default) : m;
  const FakeWorker = pick(mod);
  return new ElkApiCtor({ workerFactory: () => new FakeWorker() });
}
function defaultWorkerUrl() {
  try {
    return new URL("./elk-worker.js", import.meta.url);
  } catch {
    return null;
  }
}
async function blobWorkerFrom(url) {
  const res = await fetch(String(url));
  if (!res.ok) throw new Error(`elk-worker-fetch-${res.status}`);
  const text = await res.text();
  const blob = URL.createObjectURL(new Blob([text], { type: "text/javascript" }));
  return new Worker(blob, { name: "arazzo-elk" });
}
async function workerElk(c) {
  let rejectFailed = () => {
  };
  const failed = new Promise((_, reject) => {
    rejectFailed = reject;
  });
  failed.catch(() => {
  });
  const watch = (w) => {
    w.addEventListener("error", (ev) => {
      ev.preventDefault?.();
      rejectFailed(new Error("elk-worker-error"));
    });
    return w;
  };
  let worker;
  if (c.createWorker) worker = c.createWorker();
  else {
    const url = c.workerUrl ?? defaultWorkerUrl();
    if (!url) throw new Error("elk-worker-no-url");
    try {
      worker = new Worker(url, { name: "arazzo-elk" });
    } catch (err) {
      if (err instanceof Error && /SecurityError|cross|origin/i.test(`${err.name} ${err.message}`)) worker = await blobWorkerFrom(url);
      else throw err;
    }
  }
  watch(worker);
  const elk = new ElkApiCtor({ workerFactory: () => worker });
  return { key: configKey(c), elk, mode: "worker", failed };
}
function withTimeout(p, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("elk-timeout")), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
}
async function getInstance(c) {
  const key = configKey(c);
  if (instance && instance.key === key) return instance;
  terminate(instance);
  if (c.engine) instance = { key, elk: c.engine, mode: "main-thread" };
  else if (c.mode === "main-thread" || !c.createWorker && typeof Worker === "undefined") instance = { key, elk: await mainThreadElk(), mode: "main-thread" };
  else {
    try {
      instance = await workerElk(c);
    } catch {
      instance = { key, elk: await mainThreadElk(), mode: "main-thread" };
    }
  }
  return instance;
}
async function prewarmElk(c = {}) {
  const i = await getInstance(c);
  if (i.mode === "worker") {
    try {
      await runElk({ id: "warmup", children: [], edges: [] }, c);
    } catch {
    }
  }
  return (instance ?? i).mode;
}
function elkMode() {
  return instance?.mode ?? null;
}
function resetElk() {
  terminate(instance);
  instance = null;
}
async function runElk(graph, c = {}) {
  const i = await getInstance(c);
  try {
    const run = i.failed ? Promise.race([i.elk.layout(graph), i.failed]) : i.elk.layout(graph);
    const result = await withTimeout(run, i.mode === "worker" ? c.timeoutMs ?? 8e3 : 12e4);
    return { result, mode: i.mode };
  } catch (err) {
    if (i.mode === "worker" && err instanceof Error && /^elk-(timeout|worker-error)$/.test(err.message)) {
      terminate(i);
      instance = { key: i.key, elk: await mainThreadElk(), mode: "main-thread" };
      return { result: await instance.elk.layout(graph), mode: "main-thread" };
    }
    throw err;
  }
}

// src/layout/layout.ts
var PORT_SIDES = {
  TB: { in: "NORTH", "in-deps": "NORTH", "out-next": "SOUTH", "out-success": "SOUTH", "out-failure": "EAST", "out-retry": "EAST", "out-call": "WEST" },
  LR: { in: "WEST", "in-deps": "WEST", "out-next": "EAST", "out-success": "EAST", "out-failure": "SOUTH", "out-retry": "SOUTH", "out-call": "NORTH" }
};
var WORKFLOW_LANE = "__workflow";
var GROUP_HEADER = 44;
function structureKey(g, o) {
  return JSON.stringify([
    g.workflowId,
    o.direction,
    o.lanes,
    o.density,
    g.nodes.map((n) => [n.id, n.kind, n.stepKind, n.groupId, n.source, n.criteria?.length, n.inputs?.length, n.workflowOutputs?.length]),
    g.edges.map((e) => [e.id, e.kind, e.source, e.target, e.sourcePort, e.targetPort, e.name, e.retryLimit, e.retryAfter, e.via, e.criteria?.[0]?.condition]),
    g.groups.map((x) => [x.id, x.collapsed])
  ]);
}
function laneOf(n, g) {
  if (n.kind === "step") return n.source ?? "unknown";
  if (n.kind === "workflow-ref" && n.source && g.sources.some((s) => s.name === n.source)) return n.source;
  if (n.kind === "junction") {
    const out = g.edges.find((e) => e.source === n.id);
    const t = out && g.nodes.find((x) => x.id === out.target);
    if (t?.kind === "step" && t.source) return t.source;
  }
  return WORKFLOW_LANE;
}
function buildElkGraph(g, o) {
  const sides = PORT_SIDES[o.direction];
  const used = /* @__PURE__ */ new Map();
  const use = (id, p) => {
    if (!used.has(id)) used.set(id, /* @__PURE__ */ new Set());
    used.get(id).add(p);
  };
  for (const n of g.nodes) if (n.kind === "step" || n.kind === "output" || n.kind === "end") use(n.id, "in");
  for (const e of g.edges) {
    use(e.source, e.sourcePort);
    use(e.target, e.targetPort);
  }
  const sizes = new Map(g.nodes.map((n) => [n.id, nodeSize(n, o.density, o.direction)]));
  const elkNode = (n) => {
    const s = sizes.get(n.id);
    const ports = STEP_PORTS.filter((p) => used.get(n.id)?.has(p)).map((p) => ({
      id: `${n.id}::${p}`,
      width: 1,
      height: 1,
      layoutOptions: { "org.eclipse.elk.port.side": sides[p] }
    }));
    return { id: n.id, width: s.width, height: s.height, ports, layoutOptions: { ...ELK_NODE_OPTIONS } };
  };
  const expanded = new Set(g.groups.filter((x) => x.kind === "workflow" && !x.collapsed).map((x) => x.id));
  const groupOf = new Map(g.nodes.map((n) => [n.id, n.groupId && expanded.has(n.groupId) ? n.groupId : void 0]));
  const entries = {};
  for (const e of g.edges) {
    const tg = groupOf.get(e.target);
    if (tg && groupOf.get(e.source) !== tg) entries[e.id] = tg;
  }
  const entered = new Set(Object.values(entries));
  const root = { id: "__root", children: [], edges: [] };
  const containers = /* @__PURE__ */ new Map();
  const container = (id, label) => {
    let c = containers.get(id);
    if (!c) {
      c = { id, children: [], layoutOptions: { ...ELK_GROUP_OPTIONS }, labels: [{ text: label }] };
      if (entered.has(id)) {
        c.layoutOptions = { ...c.layoutOptions, ...ELK_GROUP_ENTRY_OPTIONS };
        c.ports = [{ id: `${id}::in`, width: 1, height: 1, layoutOptions: { "org.eclipse.elk.port.side": sides.in } }];
      }
      containers.set(id, c);
      root.children.push(c);
    }
    return c;
  };
  for (const n of g.nodes) {
    const group = n.groupId ? g.groups.find((x) => x.id === n.groupId && !x.collapsed) : void 0;
    if (group) container(group.id, group.label).children.push(elkNode(n));
    else if (o.lanes === "clusters" && n.kind === "step" && n.source) container(`src:${n.source}`, n.source).children.push(elkNode(n));
    else root.children.push(elkNode(n));
  }
  const labelTexts = {};
  root.edges = g.edges.map((e) => {
    const text = edgeLabelText(e, o.density, o.lang);
    labelTexts[e.id] = text;
    const m = measureLabel(text);
    return {
      id: e.id,
      sources: [`${e.source}::${e.sourcePort}`],
      targets: [entries[e.id] ? `${entries[e.id]}::in` : `${e.target}::${e.targetPort}`],
      labels: text ? [{ id: `${e.id}::label`, text, width: m.width, height: m.height }] : []
    };
  });
  root.layoutOptions = {
    ...ELK_ROOT_OPTIONS,
    "org.eclipse.elk.direction": o.direction === "TB" ? "DOWN" : "RIGHT",
    "org.eclipse.elk.layered.thoroughness": thoroughnessFor(g.nodes.length)
  };
  return { root, containers: new Set(containers.keys()), labelTexts, entries };
}
async function computeLayout(g, o, elk = {}) {
  const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
  const sides = PORT_SIDES[o.direction];
  const { root, containers, labelTexts, entries } = buildElkGraph(g, o);
  const { result, mode } = await runElk(root, elk);
  const nodes = {};
  const frames = [];
  const sourceOrder = g.sources.map((s) => s.name);
  const visit = (n) => {
    for (const c of n.children ?? []) {
      if (containers.has(c.id)) {
        const gr = g.groups.find((x) => x.id === c.id);
        const srcName = c.id.startsWith("src:") ? c.id.slice(4) : void 0;
        frames.push({
          id: c.id,
          kind: gr ? "workflow" : "source",
          label: gr?.label ?? srcName ?? c.id,
          sourceType: srcName ? g.sources.find((s) => s.name === srcName)?.type : "arazzo",
          tint: srcName ? sourceOrder.indexOf(srcName) % 6 + 2 : 1,
          x: c.x ?? 0,
          y: c.y ?? 0,
          width: c.width ?? 0,
          height: c.height ?? 0,
          count: c.children?.length ?? 0
        });
        visit(c);
      } else {
        const x = c.x ?? 0;
        const y = c.y ?? 0;
        nodes[c.id] = {
          x,
          y,
          width: c.width ?? 0,
          height: c.height ?? 0,
          ports: (c.ports ?? []).map((p) => ({
            id: p.id.slice(p.id.lastIndexOf("::") + 2),
            side: sides[p.id.slice(p.id.lastIndexOf("::") + 2)],
            x: (p.x ?? 0) - x + (p.width ?? 0) / 2,
            y: (p.y ?? 0) - y + (p.height ?? 0) / 2
          }))
        };
      }
    }
  };
  visit(result);
  const edges = {};
  for (const e of result.edges ?? []) {
    const pts = (e.sections ?? []).flatMap((s, i) => [
      ...i === 0 ? [s.startPoint] : [],
      ...s.bendPoints ?? [],
      s.endPoint
    ]);
    const l = e.labels?.[0];
    edges[e.id] = {
      points: pts.length ? pts : void 0,
      labelText: labelTexts[e.id] ?? "",
      label: l && l.text ? { text: l.text, x: l.x ?? 0, y: l.y ?? 0, width: l.width ?? 0, height: l.height ?? 0 } : void 0
    };
  }
  let width = result.width ?? 0;
  let height = result.height ?? 0;
  if (o.lanes === "lanes") {
    const r = applyLanes(g, nodes, o.direction, o.unknownLabel ?? "Unknown source");
    frames.splice(0, frames.length, ...r.frames);
    for (const gr of g.groups.filter((x) => x.kind === "workflow" && !x.collapsed)) {
      const members = g.nodes.filter((n) => n.groupId === gr.id).map((n) => nodes[n.id]).filter(Boolean);
      if (!members.length) continue;
      const x0 = Math.min(...members.map((m) => m.x)) - 16;
      const y0 = Math.min(...members.map((m) => m.y)) - 44;
      const x1 = Math.max(...members.map((m) => m.x + m.width)) + 16;
      const y1 = Math.max(...members.map((m) => m.y + m.height)) + 16;
      frames.push({ id: gr.id, kind: "workflow", label: gr.label, tint: 1, x: x0, y: y0, width: x1 - x0, height: y1 - y0, count: members.length });
    }
    for (const id of Object.keys(edges)) edges[id] = { labelText: edges[id].labelText };
    width = r.width;
    height = r.height;
  }
  for (const [id, groupId] of Object.entries(entries)) {
    const f = frames.find((x) => x.id === groupId);
    const pe = edges[id];
    if (!f || !pe) continue;
    const last = pe.points?.[pe.points.length - 1];
    const fallback = o.direction === "TB" ? { x: f.x + f.width / 2, y: f.y } : { x: f.x, y: f.y + GROUP_HEADER + (f.height - GROUP_HEADER) / 2 };
    pe.entry = { groupId, side: sides.in, ...last ?? fallback };
  }
  return {
    key: structureKey(g, o),
    nodes,
    edges,
    frames,
    width,
    height,
    ms: Math.round((typeof performance !== "undefined" ? performance.now() : Date.now()) - t0),
    mode,
    options: o
  };
}
function applyLanes(g, nodes, dir, unknownLabel) {
  const TB = dir === "TB";
  const flow = (p) => TB ? p.y : p.x;
  const flowLen = (p) => TB ? p.height : p.width;
  const cross = (p) => TB ? p.x : p.y;
  const crossLen = (p) => TB ? p.width : p.height;
  const PAD = 24;
  const GAP = 28;
  const HEADER = 40;
  const laneIds = [WORKFLOW_LANE, ...g.sources.map((s) => s.name), "unknown"];
  const byLane = /* @__PURE__ */ new Map();
  for (const n of g.nodes) {
    if (!nodes[n.id]) continue;
    const l = laneOf(n, g);
    if (!byLane.has(l)) byLane.set(l, []);
    byLane.get(l).push(n.id);
  }
  const minFlow = Math.min(...Object.values(nodes).map(flow));
  const maxFlow = Math.max(...Object.values(nodes).map((p) => flow(p) + flowLen(p)));
  const frames = [];
  let cursor = 0;
  laneIds.forEach((laneId) => {
    const ids = byLane.get(laneId);
    if (!ids?.length) return;
    const ordered = [...ids].sort((a, b) => flow(nodes[a]) - flow(nodes[b]) || cross(nodes[a]) - cross(nodes[b]));
    const slotSize = Math.max(...ids.map((id) => crossLen(nodes[id])));
    const slots = [];
    const slotOf = /* @__PURE__ */ new Map();
    for (const id of ordered) {
      const p = nodes[id];
      const from = flow(p) - GAP / 2;
      const to = flow(p) + flowLen(p) + GAP / 2;
      let s = 0;
      while (slots[s]?.some((r) => r.from < to && from < r.to)) s++;
      (slots[s] ?? (slots[s] = [])).push({ from, to });
      slotOf.set(id, s);
    }
    const laneSize = PAD * 2 + slots.length * slotSize + (slots.length - 1) * GAP;
    for (const id of ids) {
      const p = nodes[id];
      const c = cursor + PAD + slotOf.get(id) * (slotSize + GAP) + (slotSize - crossLen(p)) / 2;
      if (TB) p.x = c;
      else p.y = c;
    }
    const src = g.sources.find((s) => s.name === laneId);
    const start = minFlow - HEADER - PAD;
    const len2 = maxFlow - minFlow + HEADER + PAD * 2;
    frames.push({
      id: `lane:${laneId}`,
      kind: "lane",
      label: laneId === WORKFLOW_LANE ? "Workflow" : laneId === "unknown" ? unknownLabel : laneId,
      sourceType: src?.type ?? (laneId === WORKFLOW_LANE ? "arazzo" : "unknown"),
      tint: laneId === WORKFLOW_LANE ? 0 : g.sources.findIndex((s) => s.name === laneId) % 6 + 1,
      x: TB ? cursor : start,
      y: TB ? start : cursor,
      width: TB ? laneSize : len2,
      height: TB ? len2 : laneSize,
      count: ids.filter((id) => g.nodes.find((n) => n.id === id)?.kind === "step").length
    });
    cursor += laneSize;
  });
  const shift = -(minFlow - HEADER - PAD);
  for (const p of Object.values(nodes)) {
    if (TB) p.y += shift;
    else p.x += shift;
  }
  for (const f of frames) {
    if (TB) f.y += shift;
    else f.x += shift;
  }
  const len = maxFlow - minFlow + HEADER + PAD * 2;
  return { frames, width: TB ? cursor : len, height: TB ? len : cursor };
}

// src/adapt.ts
function exprType(t) {
  if (typeof t === "string") return { type: t };
  if (t && typeof t === "object") {
    const o = t;
    const r = {};
    if (typeof o.type === "string") r.type = o.type;
    if (typeof o.version === "string") r.version = o.version;
    return r;
  }
  return {};
}
function toCriteria(list) {
  if (!Array.isArray(list)) return [];
  return list.filter((c) => !!c && typeof c === "object").map((c) => {
    const out = { condition: typeof c.condition === "string" ? c.condition : String(c.condition ?? "") };
    if (typeof c.context === "string") out.context = c.context;
    Object.assign(out, exprType(c.type));
    return out;
  });
}
function toOutputs(rec) {
  return Object.entries(rec ?? {}).map(([name, v]) => {
    if (typeof v === "string") return { name, expression: v };
    if (v && typeof v === "object" && typeof v.selector === "string") {
      const s = v;
      const t = exprType(s.type);
      const sel = { context: typeof s.context === "string" ? s.context : "", selector: s.selector, type: t.type ?? "?" };
      if (t.version) sel.version = t.version;
      return { name, selector: sel };
    }
    return { name, expression: JSON.stringify(v) };
  });
}
function shortRef(id) {
  const m = /^\$sourceDescriptions\.([^.]+)\.(.+)$/.exec(id);
  return m ? m[2] : id;
}
function convertNode(n, workflowId, bannerMode) {
  const base = { id: n.id, workflowId, label: n.label, core: n };
  switch (n.kind) {
    case "input":
      return {
        ...base,
        kind: "input",
        inputs: (n.properties ?? []).map((p) => ({ name: p.name, required: p.required, type: p.type, default: p.default, description: p.description }))
      };
    case "output":
      return { ...base, kind: "output", workflowOutputs: toOutputs(n.outputs) };
    case "end-success":
      return { ...base, kind: "end", endType: "success" };
    case "end-failure":
      return { ...base, kind: "end", endType: "failure" };
    case "join":
      return { ...base, kind: "junction" };
    case "workflow-ref": {
      const r = n.ref;
      const v = {
        ...base,
        kind: "workflow-ref",
        targetWorkflowId: r ? r.sourceName ? `$sourceDescriptions.${r.sourceName}.${r.workflowId}` : r.workflowId : n.label,
        external: r?.external
      };
      if (r?.sourceName) v.source = r.sourceName;
      if (r?.stepCount !== void 0) v.innerStepCount = r.stepCount;
      if (r?.summary) v.summary = r.summary;
      return v;
    }
    default: {
      const s = n.step;
      const stepKind = n.kind === "step-async-send" ? "async-send" : n.kind === "step-async-receive" ? "async-receive" : n.kind === "step-workflow" ? "workflow" : "http";
      const v = {
        ...base,
        kind: "step",
        stepId: s.stepId,
        stepKind,
        order: s.index + 1,
        criteria: toCriteria(s.successCriteria),
        stepOutputs: s.outputs,
        parameters: s.parameters,
        hasRequestBody: s.hasRequestBody,
        usesWorkflowDefaults: bannerMode && s.usesWorkflowActions
      };
      if (s.description) v.summary = s.description.split("\n")[0].trim();
      if (s.operationId) v.operationId = s.operationId;
      if (s.operationPath) v.operationPath = s.operationPath;
      if (s.source?.name) v.source = s.source.name;
      if (s.channelPath) v.channel = s.channelPath;
      if (s.action) v.action = s.action;
      if (s.timeout !== void 0) v.timeoutMs = s.timeout;
      if (s.correlationId !== void 0) v.correlationId = typeof s.correlationId === "string" ? s.correlationId : JSON.stringify(s.correlationId);
      if (s.dependsOn) v.dependsOn = s.dependsOn;
      if (s.workflowId) {
        v.targetWorkflowId = s.workflowId;
        v.external = !!s.external;
      }
      if (stepKind === "http") {
        if (s.method) {
          v.method = s.method;
          v.methodSource = s.methodSource === "operationPath" ? "operationPath" : "openapi";
        } else v.methodSource = "unresolved";
        if (s.path) v.path = s.path;
      }
      return v;
    }
  }
}
function convertEdge(e, nodes) {
  let kind;
  let ports;
  const failure = e.outcome === "failure";
  switch (e.kind) {
    case "sequence":
      kind = "sequence";
      ports = ["out-next", "in"];
      break;
    case "success-goto":
      kind = e.transfer ? "transfer" : "success";
      ports = ["out-success", "in"];
      break;
    case "failure-goto":
      kind = e.transfer ? "transfer" : "failure";
      ports = ["out-failure", "in"];
      break;
    case "retry":
      kind = "retry";
      ports = e.via ? ["out-failure", "in"] : ["out-retry", "in"];
      break;
    case "end":
      kind = failure ? e.implicit ? "implicit-failure" : "end-failure" : "end-success";
      ports = failure ? ["out-failure", "in"] : ["out-success", "in"];
      break;
    case "depends-on": {
      kind = "depends-on";
      const t2 = nodes.get(e.target);
      ports = ["out-next", t2?.kind === "join" ? "in" : "in-deps"];
      break;
    }
    case "workflow-call":
      kind = "workflow-call";
      ports = ["out-call", "in"];
      break;
    default:
      kind = "sequence";
      ports = ["out-next", "in"];
  }
  const v = { id: e.id, kind, source: e.source, target: e.target, sourcePort: ports[0], targetPort: ports[1], core: e };
  if (e.action?.name) v.name = e.action.name;
  if (e.criteria?.length) v.criteria = toCriteria(e.criteria);
  if (e.retryLimit !== void 0) v.retryLimit = e.retryLimit;
  if (e.retryAfter !== void 0) v.retryAfter = e.retryAfter;
  if (e.retryLimitIsDefault) v.retryDefaults = true;
  if (e.action?.component) v.reference = e.action.component;
  const target = nodes.get(e.target);
  if (e.via || e.transfer || e.kind === "workflow-call") {
    v.via = target?.ref ? target.ref.sourceName ? `$sourceDescriptions.${target.ref.sourceName}.${target.ref.workflowId}` : target.ref.workflowId : target?.step?.stepId ?? target?.label ?? e.target;
  }
  v.origin = e.action?.origin === "workflow" ? "workflowDefault" : e.implicit ? "implicit" : e.kind === "depends-on" ? "dependsOn" : failure ? "onFailure" : "onSuccess";
  const s = nodes.get(e.source)?.step;
  const t = target?.step;
  if (s && t && e.source !== e.target && t.index <= s.index) v.backward = true;
  return v;
}
function diagnosticsByNode(graph, diagnostics) {
  const out = /* @__PURE__ */ new Map();
  if (!diagnostics?.length) return out;
  const stepByIndex = /* @__PURE__ */ new Map();
  for (const n of graph.nodes) if (n.step) stepByIndex.set(n.step.index, n.id);
  const add = (id, d) => {
    if (!id) return;
    const list = out.get(id) ?? [];
    list.push({ severity: d.severity, code: d.code, message: d.message });
    out.set(id, list);
  };
  for (const d of diagnostics) {
    const p = d.path;
    if (p[0] !== "workflows" || p[1] !== graph.workflowIndex) continue;
    if (p[2] === "steps" && typeof p[3] === "number") add(stepByIndex.get(p[3]), d);
    else if (p[2] === "inputs") add("input", d);
    else if (p[2] === "outputs") add(graph.nodes.some((n) => n.id === "output") ? "output" : void 0, d);
  }
  return out;
}
function summarize(e, nodes) {
  const t = nodes.get(e.target);
  const a = { name: e.action?.name ?? "", type: e.action?.type ?? e.kind, outcome: e.outcome === "failure" ? "failure" : "success" };
  if (e.criteria?.length) a.criteria = toCriteria(e.criteria);
  if (e.retryLimit !== void 0) a.retryLimit = e.retryLimit;
  if (e.retryAfter !== void 0) a.retryAfter = e.retryAfter;
  if (t && e.source !== e.target) a.target = t.step?.stepId ?? (t.ref ? shortRef(t.ref.workflowId) : t.label);
  return a;
}
function toViewGraph(graph, opts = {}) {
  const bannerMode = (opts.workflowActions ?? "banner") === "banner";
  const coreNodes = new Map(graph.nodes.map((n) => [n.id, n]));
  const diags = diagnosticsByNode(graph, opts.diagnostics);
  const defaults = { successActions: [], failureActions: [] };
  const seen = /* @__PURE__ */ new Set();
  const coreEdges = graph.edges.filter((e) => {
    if (!bannerMode || e.action?.origin !== "workflow") return true;
    const key = `${e.outcome}|${e.action.name}|${e.via ? "via" : ""}`;
    if (!seen.has(key)) {
      seen.add(key);
      const s = summarize(e, coreNodes);
      if (!e.via) (s.outcome === "failure" ? defaults.failureActions : defaults.successActions).push(s);
      else {
        const list = s.outcome === "failure" ? defaults.failureActions : defaults.successActions;
        const r = list.find((x) => x.name === s.name);
        if (r) r.target = s.target;
        else list.push(s);
      }
    }
    return false;
  });
  const joinsByTarget = /* @__PURE__ */ new Map();
  for (const e of coreEdges) {
    const s = coreNodes.get(e.source);
    if (e.kind === "depends-on" && s?.kind === "join") {
      const list = joinsByTarget.get(e.target) ?? [];
      if (!list.includes(s)) list.push(s);
      joinsByTarget.set(e.target, list);
    }
  }
  const ordered = [];
  const pushed = /* @__PURE__ */ new Set();
  const push = (n) => {
    if (n && !pushed.has(n.id)) {
      pushed.add(n.id);
      ordered.push(n);
    }
  };
  push(coreNodes.get("input"));
  for (const n of graph.nodes) {
    if (!n.step) continue;
    for (const j of joinsByTarget.get(n.id) ?? []) push(j);
    push(n);
  }
  for (const n of graph.nodes) if (n.kind === "join" || n.kind === "workflow-ref") push(n);
  for (const id of ["output", "end-success", "end-failure"]) push(coreNodes.get(id));
  for (const n of graph.nodes) push(n);
  const touched = new Set(coreEdges.flatMap((e) => [e.source, e.target]));
  let nodes = ordered.filter((n) => n.kind === "input" || n.step || n.kind === "output" || touched.has(n.id)).map((n) => {
    const v = convertNode(n, graph.workflowId, bannerMode);
    const d = diags.get(n.id);
    if (d) v.diagnostics = d;
    return v;
  });
  const nodeIds = new Set(nodes.map((n) => n.id));
  let edges = coreEdges.filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target)).map((e) => convertEdge(e, coreNodes));
  const groups = [];
  for (const ref of graph.nodes) {
    if (ref.kind !== "workflow-ref" || !ref.ref || ref.ref.external || ref.ref.stepId || !nodeIds.has(ref.id)) continue;
    const wf = ref.ref.workflowId;
    const sub = opts.subgraphs?.[wf];
    if (!sub || wf === graph.workflowId || edges.some((e) => e.source === ref.id)) continue;
    const subView = toViewGraph(sub, { workflowActions: opts.workflowActions });
    const groupId = `group:${wf}`;
    const prefix = `${groupId}/`;
    const members = subView.nodes.filter((n) => n.kind === "step" || n.kind === "junction" || n.kind === "workflow-ref");
    const firstStep = members.find((n) => n.kind === "step");
    if (!firstStep) continue;
    const memberIds = new Set(members.map((n) => n.id));
    const inner = subView.nodes.filter((n) => memberIds.has(n.id)).map((n) => ({ ...n, id: prefix + n.id, groupId, workflowId: wf }));
    const innerEdges = subView.edges.filter((e) => memberIds.has(e.source) && memberIds.has(e.target)).map((e) => ({ ...e, id: prefix + e.id, source: prefix + e.source, target: prefix + e.target }));
    const at = nodes.findIndex((n) => n.id === ref.id);
    nodes = [...nodes.slice(0, at), ...inner, ...nodes.slice(at + 1)];
    edges = [
      ...edges.map((e) => e.target === ref.id ? { ...e, target: prefix + firstStep.id, targetPort: "in" } : e),
      ...innerEdges
    ];
    groups.push({ id: groupId, kind: "workflow", label: wf, workflowId: wf });
  }
  const sources = graph.groups.filter((g) => g.kind === "source" && g.sourceName).map((g) => g.sourceType ? { name: g.sourceName, type: g.sourceType } : { name: g.sourceName });
  const view = {
    workflowId: graph.workflowId,
    title: graph.summary ?? graph.workflowId,
    sources,
    nodes,
    edges,
    groups
  };
  if (graph.summary) view.summary = graph.summary;
  if (defaults.successActions.length || defaults.failureActions.length) view.defaults = defaults;
  return view;
}

// src/visible.ts
var FAILURE_KINDS = /* @__PURE__ */ new Set(["failure", "end-failure", "implicit-failure", "retry"]);
function visibleGraph(g, o) {
  let nodes = g.nodes;
  let edges = g.edges.filter((e) => {
    if (e.kind === "implicit-failure" && !o.showImplicitFailures) return false;
    if (!o.showFailureEdges && (FAILURE_KINDS.has(e.kind) || e.origin === "onFailure")) return false;
    return true;
  });
  const groups = g.groups.map((gr) => ({ ...gr, collapsed: o.collapsed[gr.id] ?? gr.collapsed ?? false }));
  for (const gr of groups) {
    if (!gr.collapsed) continue;
    const members = new Set(nodes.filter((n) => n.groupId === gr.id).map((n) => n.id));
    if (!members.size) continue;
    const proxyId = `${gr.id}:collapsed`;
    const at = nodes.findIndex((n) => members.has(n.id));
    const first = nodes[at];
    const proxy = {
      id: proxyId,
      kind: "workflow-ref",
      workflowId: g.workflowId,
      label: gr.workflowId,
      targetWorkflowId: gr.workflowId,
      collapsed: true,
      innerStepCount: nodes.filter((n) => members.has(n.id) && n.kind === "step").length
    };
    if (first?.source) proxy.source = first.source;
    nodes = [...nodes.slice(0, at).filter((n) => !members.has(n.id)), proxy, ...nodes.slice(at).filter((n) => !members.has(n.id))];
    const seen = /* @__PURE__ */ new Set();
    edges = edges.map((e) => ({
      ...e,
      source: members.has(e.source) ? proxyId : e.source,
      target: members.has(e.target) ? proxyId : e.target,
      sourcePort: members.has(e.source) ? "out-next" : e.sourcePort,
      targetPort: members.has(e.target) ? "in" : e.targetPort
    })).filter((e) => !(e.source === proxyId && e.target === proxyId)).filter((e) => {
      const k = `${e.kind}|${e.source}|${e.target}|${e.via ?? ""}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }
  const touched = new Set(edges.flatMap((e) => [e.source, e.target]));
  nodes = nodes.filter((n) => n.kind === "step" || n.kind === "input" || n.kind === "output" || touched.has(n.id));
  const ids = new Set(nodes.map((n) => n.id));
  edges = edges.filter((e) => ids.has(e.source) && ids.has(e.target));
  return { ...g, nodes, edges, groups };
}
function createUiStore() {
  let state = { selectedId: null, hoverId: null, matches: null, currentMatch: null, focusSet: null };
  const subs = /* @__PURE__ */ new Set();
  return {
    get: () => state,
    set: (patch) => {
      state = { ...state, ...patch };
      subs.forEach((f) => f());
    },
    subscribe: (fn) => {
      subs.add(fn);
      return () => subs.delete(fn);
    }
  };
}
var UiStoreContext = createContext(null);
function useUi(selector) {
  const store = useContext(UiStoreContext);
  if (!store) throw new Error("UiStoreContext missing");
  return useSyncExternalStore(store.subscribe, () => selector(store.get()));
}
function isDimmed(s, id) {
  return s.matches !== null && !s.matches.has(id) || s.focusSet !== null && !s.focusSet.has(id);
}
function Svg({ size = 14, children, ...rest }) {
  return /* @__PURE__ */ jsx(
    "svg",
    {
      width: size,
      height: size,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: 1.9,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      "aria-hidden": "true",
      focusable: "false",
      ...rest,
      children
    }
  );
}
var IconInput = (p) => /* @__PURE__ */ jsxs(Svg, { ...p, children: [
  /* @__PURE__ */ jsx("path", { d: "M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" }),
  /* @__PURE__ */ jsx("path", { d: "M3 12h11" }),
  /* @__PURE__ */ jsx("path", { d: "m10 8 4 4-4 4" })
] });
var IconOutput = (p) => /* @__PURE__ */ jsxs(Svg, { ...p, children: [
  /* @__PURE__ */ jsx("path", { d: "M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" }),
  /* @__PURE__ */ jsx("path", { d: "M10 12h11" }),
  /* @__PURE__ */ jsx("path", { d: "m17 8 4 4-4 4" })
] });
var IconGlobe = (p) => /* @__PURE__ */ jsxs(Svg, { ...p, children: [
  /* @__PURE__ */ jsx("circle", { cx: "12", cy: "12", r: "9" }),
  /* @__PURE__ */ jsx("path", { d: "M3 12h18" }),
  /* @__PURE__ */ jsx("path", { d: "M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18z" })
] });
var IconSend = (p) => /* @__PURE__ */ jsxs(Svg, { ...p, children: [
  /* @__PURE__ */ jsx("rect", { x: "3", y: "5", width: "18", height: "14", rx: "2", fill: "currentColor" }),
  /* @__PURE__ */ jsx("path", { d: "m3.5 6.5 8.5 6.5 8.5-6.5", stroke: "var(--af-node-bg, #fff)" })
] });
var IconReceive = (p) => /* @__PURE__ */ jsxs(Svg, { ...p, children: [
  /* @__PURE__ */ jsx("rect", { x: "3", y: "5", width: "18", height: "14", rx: "2" }),
  /* @__PURE__ */ jsx("path", { d: "m3.5 6.5 8.5 6.5 8.5-6.5" })
] });
var IconWorkflow = (p) => /* @__PURE__ */ jsxs(Svg, { ...p, children: [
  /* @__PURE__ */ jsx("rect", { x: "3", y: "3", width: "7", height: "7", rx: "1.5" }),
  /* @__PURE__ */ jsx("rect", { x: "14", y: "14", width: "7", height: "7", rx: "1.5" }),
  /* @__PURE__ */ jsx("path", { d: "M6.5 10v3a2 2 0 0 0 2 2H14" })
] });
var IconExternal = (p) => /* @__PURE__ */ jsxs(Svg, { ...p, children: [
  /* @__PURE__ */ jsx("path", { d: "M14 4h6v6" }),
  /* @__PURE__ */ jsx("path", { d: "M20 4 11 13" }),
  /* @__PURE__ */ jsx("path", { d: "M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" })
] });
var IconClock = (p) => /* @__PURE__ */ jsxs(Svg, { ...p, children: [
  /* @__PURE__ */ jsx("circle", { cx: "12", cy: "12", r: "9" }),
  /* @__PURE__ */ jsx("path", { d: "M12 7v5l3 2" })
] });
var IconLink = (p) => /* @__PURE__ */ jsxs(Svg, { ...p, children: [
  /* @__PURE__ */ jsx("path", { d: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" }),
  /* @__PURE__ */ jsx("path", { d: "M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" })
] });
var IconCheck = (p) => /* @__PURE__ */ jsx(Svg, { ...p, children: /* @__PURE__ */ jsx("path", { d: "m5 12.5 4.5 4.5L19 7.5" }) });
var IconX = (p) => /* @__PURE__ */ jsx(Svg, { ...p, children: /* @__PURE__ */ jsx("path", { d: "M6 6l12 12M18 6 6 18" }) });
var IconRetry = (p) => /* @__PURE__ */ jsxs(Svg, { ...p, children: [
  /* @__PURE__ */ jsx("path", { d: "M20 11a8 8 0 1 0-2.3 5.7" }),
  /* @__PURE__ */ jsx("path", { d: "M20 4v7h-7" })
] });
var IconOutputs = (p) => /* @__PURE__ */ jsx(Svg, { ...p, children: /* @__PURE__ */ jsx("path", { d: "M7 7h10M7 12h10M7 17h6" }) });
var IconBraces = (p) => /* @__PURE__ */ jsxs(Svg, { ...p, children: [
  /* @__PURE__ */ jsx("path", { d: "M8 4c-2 0-3 1-3 3v2c0 1.5-1 3-2 3 1 0 2 1.5 2 3v2c0 2 1 3 3 3" }),
  /* @__PURE__ */ jsx("path", { d: "M16 4c2 0 3 1 3 3v2c0 1.5 1 3 2 3-1 0-2 1.5-2 3v2c0 2-1 3-3 3" })
] });
var IconWarning = (p) => /* @__PURE__ */ jsxs(Svg, { ...p, children: [
  /* @__PURE__ */ jsx("path", { d: "M12 3 2.5 20h19z" }),
  /* @__PURE__ */ jsx("path", { d: "M12 10v4M12 17.5v.01" })
] });
var IconError = (p) => /* @__PURE__ */ jsxs(Svg, { ...p, children: [
  /* @__PURE__ */ jsx("path", { d: "M8 3h8l5 5v8l-5 5H8l-5-5V8z" }),
  /* @__PURE__ */ jsx("path", { d: "M12 8v5M12 16.5v.01" })
] });
var IconInfo = (p) => /* @__PURE__ */ jsxs(Svg, { ...p, children: [
  /* @__PURE__ */ jsx("circle", { cx: "12", cy: "12", r: "9" }),
  /* @__PURE__ */ jsx("path", { d: "M12 11v5M12 8v.01" })
] });
var IconSearch = (p) => /* @__PURE__ */ jsxs(Svg, { ...p, children: [
  /* @__PURE__ */ jsx("circle", { cx: "11", cy: "11", r: "7" }),
  /* @__PURE__ */ jsx("path", { d: "m20 20-4-4" })
] });
var IconPlus = (p) => /* @__PURE__ */ jsx(Svg, { ...p, children: /* @__PURE__ */ jsx("path", { d: "M12 5v14M5 12h14" }) });
var IconMinus = (p) => /* @__PURE__ */ jsx(Svg, { ...p, children: /* @__PURE__ */ jsx("path", { d: "M5 12h14" }) });
var IconFit = (p) => /* @__PURE__ */ jsx(Svg, { ...p, children: /* @__PURE__ */ jsx("path", { d: "M4 9V5a1 1 0 0 1 1-1h4M15 4h4a1 1 0 0 1 1 1v4M20 15v4a1 1 0 0 1-1 1h-4M9 20H5a1 1 0 0 1-1-1v-4" }) });
var IconOneToOne = (p) => /* @__PURE__ */ jsxs(Svg, { ...p, children: [
  /* @__PURE__ */ jsx("path", { d: "M6 9l2-1.5V16M16 9l2-1.5V16" }),
  /* @__PURE__ */ jsx("path", { d: "M12 10.5v.01M12 14.5v.01" })
] });
var IconArrowDown = (p) => /* @__PURE__ */ jsxs(Svg, { ...p, children: [
  /* @__PURE__ */ jsx("rect", { x: "8", y: "2.5", width: "8", height: "5", rx: "1" }),
  /* @__PURE__ */ jsx("rect", { x: "8", y: "16.5", width: "8", height: "5", rx: "1" }),
  /* @__PURE__ */ jsx("path", { d: "M12 7.5v8M9.5 13l2.5 2.5 2.5-2.5" })
] });
var IconArrowRight = (p) => /* @__PURE__ */ jsxs(Svg, { ...p, children: [
  /* @__PURE__ */ jsx("rect", { x: "2.5", y: "8", width: "5", height: "8", rx: "1" }),
  /* @__PURE__ */ jsx("rect", { x: "16.5", y: "8", width: "5", height: "8", rx: "1" }),
  /* @__PURE__ */ jsx("path", { d: "M7.5 12h8M13 9.5l2.5 2.5-2.5 2.5" })
] });
var IconLanes = (p) => /* @__PURE__ */ jsxs(Svg, { ...p, children: [
  /* @__PURE__ */ jsx("rect", { x: "3", y: "3", width: "18", height: "18", rx: "2" }),
  /* @__PURE__ */ jsx("path", { d: "M9 3v18M15 3v18" })
] });
var IconMap = (p) => /* @__PURE__ */ jsxs(Svg, { ...p, children: [
  /* @__PURE__ */ jsx("rect", { x: "3", y: "5", width: "18", height: "14", rx: "2" }),
  /* @__PURE__ */ jsx("rect", { x: "12", y: "11", width: "6", height: "5", rx: "1" })
] });
var IconFailureEdges = (p) => /* @__PURE__ */ jsxs(Svg, { ...p, children: [
  /* @__PURE__ */ jsx("path", { d: "M4 20 20 4", strokeDasharray: "3 3" }),
  /* @__PURE__ */ jsx("path", { d: "M14 4h6v6" })
] });
var IconKeyboard = (p) => /* @__PURE__ */ jsxs(Svg, { ...p, children: [
  /* @__PURE__ */ jsx("rect", { x: "2.5", y: "6", width: "19", height: "12", rx: "2" }),
  /* @__PURE__ */ jsx("path", { d: "M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10" })
] });
var IconDensity = (p) => /* @__PURE__ */ jsxs(Svg, { ...p, children: [
  /* @__PURE__ */ jsx("rect", { x: "4", y: "4", width: "16", height: "5", rx: "1" }),
  /* @__PURE__ */ jsx("rect", { x: "4", y: "12", width: "16", height: "8", rx: "1" })
] });
var IconLegend = (p) => /* @__PURE__ */ jsxs(Svg, { ...p, children: [
  /* @__PURE__ */ jsx("path", { d: "M4 7h3M4 12h3M4 17h3" }),
  /* @__PURE__ */ jsx("path", { d: "M10 7h10M10 12h10M10 17h10" })
] });
var IconChevron = ({ open, ...p }) => /* @__PURE__ */ jsx(Svg, { ...p, children: /* @__PURE__ */ jsx("path", { d: open ? "m6 9 6 6 6-6" : "m9 6 6 6-6 6" }) });
function SourceTypeIcon({ type, size }) {
  if (type === "asyncapi") return /* @__PURE__ */ jsx(IconReceive, { size });
  if (type === "arazzo") return /* @__PURE__ */ jsx(IconWorkflow, { size });
  return /* @__PURE__ */ jsx(IconGlobe, { size });
}
var IconDownload = (p) => /* @__PURE__ */ jsxs(Svg, { ...p, children: [
  /* @__PURE__ */ jsx("path", { d: "M12 4v11" }),
  /* @__PURE__ */ jsx("path", { d: "m7 10 5 5 5-5" }),
  /* @__PURE__ */ jsx("path", { d: "M5 20h14" })
] });
var IconList = (p) => /* @__PURE__ */ jsxs(Svg, { ...p, children: [
  /* @__PURE__ */ jsx("path", { d: "M9 6h11M9 12h11M9 18h11" }),
  /* @__PURE__ */ jsx("circle", { cx: "4.5", cy: "6", r: "1" }),
  /* @__PURE__ */ jsx("circle", { cx: "4.5", cy: "12", r: "1" }),
  /* @__PURE__ */ jsx("circle", { cx: "4.5", cy: "18", r: "1" })
] });
var SIDE_POS = {
  NORTH: Position.Top,
  SOUTH: Position.Bottom,
  EAST: Position.Right,
  WEST: Position.Left
};
function Ports({ placed }) {
  return /* @__PURE__ */ jsx(Fragment, { children: placed.ports.map((p) => /* @__PURE__ */ jsx(
    Handle,
    {
      id: p.id,
      type: p.id.startsWith("out") ? "source" : "target",
      position: SIDE_POS[p.side],
      isConnectable: false,
      className: "af-handle",
      style: { left: p.x, top: p.y, right: "auto", bottom: "auto", transform: "translate(-50%, -50%)" }
    },
    p.id
  )) });
}
function useNodeState(id) {
  const selected = useUi((s) => s.selectedId === id);
  const dimmed = useUi((s) => isDimmed(s, id));
  const match = useUi((s) => s.currentMatch === id ? "current" : s.matches?.has(id) ? "match" : void 0);
  const hovered = useUi((s) => s.hoverId === id);
  return {
    "data-selected": selected || void 0,
    "data-dimmed": dimmed || void 0,
    "data-match": match,
    "data-hovered": hovered || void 0
  };
}
function DiagBadge({ node }) {
  const d = node.diagnostics;
  if (!d?.length) return null;
  const sev = d.some((x) => x.severity === "error") ? "error" : d.some((x) => x.severity === "warning") ? "warning" : "info";
  const Icon = sev === "error" ? IconError : sev === "warning" ? IconWarning : IconInfo;
  return /* @__PURE__ */ jsxs("span", { className: `af-diag af-diag--${sev}`, title: d.map((x) => `${x.code} : ${x.message}`).join("\n"), children: [
    /* @__PURE__ */ jsx(Icon, { size: 11 }),
    d.length
  ] });
}
function Chip({ icon, children, tone, title, mono }) {
  return /* @__PURE__ */ jsxs("span", { className: `af-chip${tone ? ` af-chip--${tone}` : ""}${mono ? " af-mono" : ""}`, title, children: [
    icon,
    /* @__PURE__ */ jsx("span", { className: "af-chip__text", children })
  ] });
}
function MethodBadge({ node, m }) {
  const text = methodText(node);
  const k = node.stepKind;
  const icon = k === "async-send" ? /* @__PURE__ */ jsx(IconSend, { size: 11 }) : k === "async-receive" ? /* @__PURE__ */ jsx(IconReceive, { size: 11 }) : k === "workflow" ? /* @__PURE__ */ jsx(IconWorkflow, { size: 11 }) : null;
  const title = node.methodSource === "unresolved" ? m.unresolved : node.methodSource === "operationPath" ? m.methodFromPath : node.methodSource === "openapi" ? m.methodFromOpenApi : void 0;
  return /* @__PURE__ */ jsxs("span", { className: `af-badge af-badge--${badgeClass(node)}`, title, children: [
    icon,
    text
  ] });
}
function stepChips(n, out, m) {
  const chips = [];
  if (n.stepKind === "async-receive") {
    if (n.timeoutMs != null)
      chips.push(
        /* @__PURE__ */ jsx(Chip, { icon: /* @__PURE__ */ jsx(IconClock, { size: 11 }), tone: "async-receive", title: `timeout: ${n.timeoutMs} ms`, children: formatTimeout(n.timeoutMs, m.lang) }, "t")
      );
    if (n.correlationId)
      chips.push(
        /* @__PURE__ */ jsx(Chip, { icon: /* @__PURE__ */ jsx(IconLink, { size: 11 }), tone: "async-receive", title: `correlationId: ${n.correlationId}`, mono: true, children: truncate(n.correlationId, 20) }, "c")
      );
  }
  if (n.stepKind === "async-send" && n.hasRequestBody)
    chips.push(
      /* @__PURE__ */ jsx(Chip, { icon: /* @__PURE__ */ jsx(IconBraces, { size: 11 }), tone: "async-send", title: "requestBody (payload)", children: "payload" }, "p")
    );
  if (n.stepKind === "workflow") {
    if (n.external) chips.push(/* @__PURE__ */ jsx(Chip, { icon: /* @__PURE__ */ jsx(IconExternal, { size: 11 }), tone: "workflow", children: m.external }, "x"));
    if (n.parameters?.length) chips.push(/* @__PURE__ */ jsx(Chip, { children: m.params(n.parameters.length) }, "pa"));
    if (n.collapsed && n.innerStepCount)
      chips.push(
        /* @__PURE__ */ jsx(Chip, { icon: /* @__PURE__ */ jsx(IconChevron, { size: 11 }), tone: "workflow", children: m.steps(n.innerStepCount) }, "col")
      );
  }
  if (n.criteria?.length)
    chips.push(
      /* @__PURE__ */ jsx(Chip, { icon: /* @__PURE__ */ jsx(IconCheck, { size: 11 }), tone: "success", title: n.criteria.map((c) => c.condition).join("\n"), children: m.criteria(n.criteria.length) }, "cr")
    );
  const retry = out.find((e) => e.kind === "retry" && !e.via);
  if (retry)
    chips.push(
      /* @__PURE__ */ jsxs(Chip, { icon: /* @__PURE__ */ jsx(IconRetry, { size: 11 }), tone: "retry", title: `retry \xD7${retry.retryLimit ?? 1}${retry.retryAfter ? `, ${retry.retryAfter} s` : ""}`, children: [
        "\xD7",
        retry.retryLimit ?? 1
      ] }, "r")
    );
  if (n.stepOutputs?.length)
    chips.push(
      /* @__PURE__ */ jsx(Chip, { icon: /* @__PURE__ */ jsx(IconOutputs, { size: 11 }), title: n.stepOutputs.join(", "), children: m.outputsCount(n.stepOutputs.length) }, "o")
    );
  if (n.usesWorkflowDefaults)
    chips.push(
      /* @__PURE__ */ jsx(Chip, { tone: "workflow-defaults", title: m.workflowDefaults, children: "\u24E6" }, "w")
    );
  return chips;
}
function secondLine(n) {
  switch (n.stepKind) {
    case "async-send":
    case "async-receive": {
      const text = n.channel ?? (n.summary && n.operationId ? shortOperationId(n.operationId) : void 0);
      return text ? /* @__PURE__ */ jsx("span", { className: "af-mono", title: n.channel ?? n.operationId, children: text }) : null;
    }
    case "workflow":
      return /* @__PURE__ */ jsxs("span", { className: "af-mono", children: [
        "\u2192 ",
        shortWorkflow(n.targetWorkflowId ?? ""),
        n.external && n.targetWorkflowId?.startsWith("$sourceDescriptions.") ? /* @__PURE__ */ jsxs("span", { className: "af-muted", children: [
          " \xB7 ",
          n.targetWorkflowId.split(".")[1]
        ] }) : null
      ] });
    default: {
      const op = n.summary ? operationLabel(n) : void 0;
      return op ? /* @__PURE__ */ jsx("span", { className: "af-mono", title: op, children: op }) : null;
    }
  }
}
function mainLine(n) {
  if (n.summary) return n.summary;
  if (n.stepKind === "workflow") return null;
  const op = operationLabel(n);
  return op ? /* @__PURE__ */ jsx("span", { className: "af-mono", title: op, children: op }) : null;
}
var accentOf = (n) => n.stepKind === "async-send" ? "async-send" : n.stepKind === "async-receive" ? "async-receive" : n.stepKind === "workflow" ? "workflow" : "http";
var StepNode = memo(function StepNode2({ id, data }) {
  const { node: n, density, messages: m, outEdges, placed } = data;
  const st = useNodeState(id);
  const accent = accentOf(n);
  return /* @__PURE__ */ jsxs("div", { className: `af-card af-card--step af-accent--${accent} af-density--${density}`, "data-step-kind": n.stepKind, ...st, children: [
    /* @__PURE__ */ jsx(Ports, { placed }),
    /* @__PURE__ */ jsxs("div", { className: "af-card__head", children: [
      /* @__PURE__ */ jsx(MethodBadge, { node: n, m }),
      /* @__PURE__ */ jsx("span", { className: "af-card__title", children: n.label }),
      n.order ? /* @__PURE__ */ jsxs("span", { className: "af-card__order", children: [
        "#",
        n.order
      ] }) : null,
      /* @__PURE__ */ jsx(DiagBadge, { node: n })
    ] }),
    density !== "compact" && /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx("div", { className: "af-card__line", children: mainLine(n) ?? "\xA0" }),
      /* @__PURE__ */ jsx("div", { className: "af-card__line af-card__line--sub", children: secondLine(n) }),
      /* @__PURE__ */ jsx("div", { className: "af-card__chips", children: stepChips(n, outEdges, m) })
    ] }),
    density === "detailed" && n.criteria?.length ? /* @__PURE__ */ jsx("ul", { className: "af-card__list", "aria-hidden": "true", children: n.criteria.slice(0, 5).map((c, i) => /* @__PURE__ */ jsxs("li", { className: "af-mono", title: c.condition, children: [
      /* @__PURE__ */ jsx(IconCheck, { size: 10, className: "af-list-icon af-list-icon--success" }),
      c.condition,
      c.type && c.type !== "simple" ? /* @__PURE__ */ jsxs("span", { className: "af-tag", children: [
        c.type,
        c.version ? ` ${c.version}` : ""
      ] }) : null
    ] }, i)) }) : null,
    n.stepKind === "async-receive" && n.timeoutMs != null ? /* @__PURE__ */ jsx("span", { className: "af-timer", title: `timeout ${formatTimeout(n.timeoutMs, m.lang)}`, children: /* @__PURE__ */ jsx(IconClock, { size: 12 }) }) : null
  ] });
});
var InputNode = memo(function InputNode2({ id, data }) {
  const { node: n, density, messages: m, placed } = data;
  const st = useNodeState(id);
  const ins = n.inputs ?? [];
  const req = ins.filter((i) => i.required).length;
  return /* @__PURE__ */ jsxs("div", { className: `af-card af-card--io af-accent--input af-density--${density}`, ...st, children: [
    /* @__PURE__ */ jsx(Ports, { placed }),
    /* @__PURE__ */ jsxs("div", { className: "af-card__head", children: [
      /* @__PURE__ */ jsx("span", { className: "af-io-icon af-io-icon--input", children: /* @__PURE__ */ jsx(IconInput, { size: 13 }) }),
      /* @__PURE__ */ jsx("span", { className: "af-card__title", children: m.inputs }),
      /* @__PURE__ */ jsx("span", { className: "af-card__order", children: ins.length })
    ] }),
    density !== "compact" && /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx("div", { className: "af-card__line af-card__line--sub", children: m.props(ins.length, req) }),
      /* @__PURE__ */ jsxs("div", { className: "af-card__chips af-card__chips--wrap", children: [
        ins.slice(0, 4).map((i) => /* @__PURE__ */ jsxs("span", { className: "af-key af-mono", title: `${i.name}${i.type ? `: ${i.type}` : ""}${i.required ? ` (${m.required})` : ""}${i.description ? ` \u2014 ${i.description}` : ""}`, children: [
          i.name,
          i.required ? /* @__PURE__ */ jsx("span", { className: "af-req", children: "*" }) : null
        ] }, i.name)),
        ins.length > 4 ? /* @__PURE__ */ jsxs("span", { className: "af-key af-key--more", children: [
          "+",
          ins.length - 4
        ] }) : null
      ] })
    ] }),
    density === "detailed" && /* @__PURE__ */ jsx("ul", { className: "af-card__list", "aria-hidden": "true", children: ins.slice(0, 5).map((i) => /* @__PURE__ */ jsxs("li", { className: "af-mono", children: [
      i.name,
      /* @__PURE__ */ jsxs("span", { className: "af-muted", children: [
        " ",
        ": ",
        i.type ?? "any",
        i.default !== void 0 ? ` = ${JSON.stringify(i.default)}` : ""
      ] })
    ] }, i.name)) })
  ] });
});
var OutputNode = memo(function OutputNode2({ id, data }) {
  const { node: n, density, messages: m, placed } = data;
  const st = useNodeState(id);
  const outs = n.workflowOutputs ?? [];
  const sel = outs.filter((o) => o.selector).length;
  return /* @__PURE__ */ jsxs("div", { className: `af-card af-card--io af-accent--output af-density--${density}`, ...st, children: [
    /* @__PURE__ */ jsx(Ports, { placed }),
    /* @__PURE__ */ jsxs("div", { className: "af-card__head", children: [
      /* @__PURE__ */ jsx("span", { className: "af-io-icon af-io-icon--output", children: /* @__PURE__ */ jsx(IconOutput, { size: 13 }) }),
      /* @__PURE__ */ jsx("span", { className: "af-card__title", children: m.outputs }),
      /* @__PURE__ */ jsx("span", { className: "af-card__order", children: outs.length })
    ] }),
    density !== "compact" && /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsxs("div", { className: "af-card__line af-card__line--sub", children: [
        m.outputsCount(outs.length),
        sel ? ` \xB7 ${sel} Selector${sel > 1 ? "s" : ""}` : ""
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "af-card__chips af-card__chips--wrap", children: [
        outs.slice(0, 4).map((o) => /* @__PURE__ */ jsxs(
          "span",
          {
            className: `af-key af-mono${o.selector ? " af-key--selector" : ""}`,
            title: o.selector ? `Selector ${o.selector.type}${o.selector.version ? ` ${o.selector.version}` : ""}: ${o.selector.selector} @ ${o.selector.context}` : o.expression,
            children: [
              o.selector ? /* @__PURE__ */ jsx(IconBraces, { size: 10 }) : null,
              o.name
            ]
          },
          o.name
        )),
        outs.length > 4 ? /* @__PURE__ */ jsxs("span", { className: "af-key af-key--more", children: [
          "+",
          outs.length - 4
        ] }) : null
      ] })
    ] }),
    density === "detailed" && /* @__PURE__ */ jsx("ul", { className: "af-card__list", "aria-hidden": "true", children: outs.slice(0, 5).map((o) => /* @__PURE__ */ jsxs("li", { className: "af-mono", children: [
      o.name,
      /* @__PURE__ */ jsxs("span", { className: "af-muted", children: [
        " \u2190 ",
        o.selector ? `${o.selector.selector}` : o.expression
      ] }),
      o.selector ? /* @__PURE__ */ jsx("span", { className: "af-tag", children: o.selector.type }) : null
    ] }, o.name)) })
  ] });
});
var EndNode = memo(function EndNode2({ id, data }) {
  const { node: n, messages: m, placed } = data;
  const st = useNodeState(id);
  const failure = n.endType === "failure";
  return /* @__PURE__ */ jsxs("div", { className: `af-end af-end--${failure ? "failure" : "success"}`, ...st, children: [
    /* @__PURE__ */ jsx(Ports, { placed }),
    /* @__PURE__ */ jsx("span", { className: "af-end__circle", children: failure ? /* @__PURE__ */ jsx(IconX, { size: 14 }) : /* @__PURE__ */ jsx(IconCheck, { size: 14 }) }),
    /* @__PURE__ */ jsx("span", { className: "af-end__label", children: failure ? m.endFailure : m.endSuccess })
  ] });
});
var JunctionNode = memo(function JunctionNode2({ id, data }) {
  const { placed } = data;
  const st = useNodeState(id);
  return /* @__PURE__ */ jsxs("div", { className: "af-junction", ...st, children: [
    /* @__PURE__ */ jsx(Ports, { placed }),
    /* @__PURE__ */ jsx("span", { className: "af-junction__diamond", children: /* @__PURE__ */ jsx("svg", { width: "12", height: "12", viewBox: "0 0 12 12", "aria-hidden": "true", children: /* @__PURE__ */ jsx("path", { d: "M6 1.5v9M1.5 6h9", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round" }) }) })
  ] });
});
var RefNode = memo(function RefNode2({ id, data }) {
  const { node: n, messages: m, placed } = data;
  const st = useNodeState(id);
  return /* @__PURE__ */ jsxs("div", { className: `af-ref${n.collapsed ? " af-ref--collapsed" : ""}`, title: n.summary, ...st, children: [
    /* @__PURE__ */ jsx(Ports, { placed }),
    n.collapsed ? /* @__PURE__ */ jsx(IconWorkflow, { size: 13 }) : /* @__PURE__ */ jsx(IconExternal, { size: 13 }),
    /* @__PURE__ */ jsx("span", { className: "af-ref__label af-mono", children: shortWorkflow(n.targetWorkflowId ?? n.label) }),
    n.collapsed && data.onToggleGroup ? /* @__PURE__ */ jsxs(
      "button",
      {
        type: "button",
        className: "af-frame__toggle nodrag nopan",
        "aria-expanded": "false",
        "aria-label": m.ui.expand(n.label),
        title: m.ui.expand(n.label),
        onClick: (ev) => {
          ev.stopPropagation();
          data.onToggleGroup?.(id.replace(/:collapsed$/, ""));
        },
        children: [
          "\u25B8 ",
          m.steps(n.innerStepCount ?? 0)
        ]
      }
    ) : n.collapsed && n.innerStepCount ? /* @__PURE__ */ jsxs("span", { className: "af-ref__meta", children: [
      "\u25B8 ",
      m.steps(n.innerStepCount)
    ] }) : n.source ? /* @__PURE__ */ jsx("span", { className: "af-ref__meta", children: n.source }) : null
  ] });
});
var FrameNodeView = memo(function FrameNodeView2({ data }) {
  const { frame: f, messages: m, onToggle } = data;
  if (f.kind === "workflow") {
    return /* @__PURE__ */ jsx("div", { className: "af-frame af-frame--workflow", children: /* @__PURE__ */ jsxs("div", { className: "af-frame__head", children: [
      /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          className: "af-frame__toggle nodrag nopan",
          "aria-expanded": "true",
          "aria-label": m.ui.collapse(f.label),
          onClick: () => onToggle?.(f.id),
          children: /* @__PURE__ */ jsx(IconChevron, { open: true, size: 13 })
        }
      ),
      /* @__PURE__ */ jsx(IconWorkflow, { size: 13 }),
      /* @__PURE__ */ jsx("span", { className: "af-frame__title af-mono", children: f.label }),
      /* @__PURE__ */ jsx("span", { className: "af-frame__meta", children: m.steps(f.count) })
    ] }) });
  }
  return /* @__PURE__ */ jsx("div", { className: `af-frame af-frame--${f.kind} af-lane-tint--${f.tint}`, children: /* @__PURE__ */ jsxs("div", { className: "af-frame__head", children: [
    /* @__PURE__ */ jsx(SourceTypeIcon, { type: f.sourceType, size: 13 }),
    /* @__PURE__ */ jsx("span", { className: "af-frame__title", children: f.label }),
    f.sourceType ? /* @__PURE__ */ jsx("span", { className: "af-frame__type", children: f.sourceType }) : null,
    f.count ? /* @__PURE__ */ jsx("span", { className: "af-frame__meta", children: m.steps(f.count) }) : null
  ] }) });
});
var nodeTypes = {
  step: StepNode,
  input: InputNode,
  output: OutputNode,
  end: EndNode,
  junction: JunctionNode,
  "workflow-ref": RefNode,
  frame: FrameNodeView
};
function roundedPath(points, r = 6) {
  if (points.length < 2) return "";
  let d = `M${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const p0 = points[i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const l1 = Math.hypot(p1.x - p0.x, p1.y - p0.y);
    const l2 = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const rr = Math.min(r, l1 / 2, l2 / 2);
    const a = { x: p1.x - (p1.x - p0.x) / (l1 || 1) * rr, y: p1.y - (p1.y - p0.y) / (l1 || 1) * rr };
    const b = { x: p1.x + (p2.x - p1.x) / (l2 || 1) * rr, y: p1.y + (p2.y - p1.y) / (l2 || 1) * rr };
    d += ` L${a.x},${a.y} Q${p1.x},${p1.y} ${b.x},${b.y}`;
  }
  const last = points[points.length - 1];
  return `${d} L${last.x},${last.y}`;
}
var DIR = {
  [Position.Top]: { x: 0, y: 1 },
  [Position.Bottom]: { x: 0, y: -1 },
  [Position.Left]: { x: 1, y: 0 },
  [Position.Right]: { x: -1, y: 0 }
};
var SIDE_POSITION = { NORTH: Position.Top, SOUTH: Position.Bottom, EAST: Position.Right, WEST: Position.Left };
function arrowHead(tip, dir, open, size = 8) {
  const len = Math.hypot(dir.x, dir.y) || 1;
  const ux = dir.x / len;
  const uy = dir.y / len;
  const bx = tip.x - ux * size;
  const by = tip.y - uy * size;
  const w = size * 0.5;
  const p1 = `${bx - uy * w},${by + ux * w}`;
  const p2 = `${bx + uy * w},${by - ux * w}`;
  return open ? /* @__PURE__ */ jsx("polyline", { className: "af-edge__marker af-edge__marker--open", points: `${p1} ${tip.x},${tip.y} ${p2}` }) : /* @__PURE__ */ jsx("polygon", { className: "af-edge__marker", points: `${p1} ${tip.x},${tip.y} ${p2}` });
}
function diamondAt(p, dir, size = 7) {
  const len = Math.hypot(dir.x, dir.y) || 1;
  const ux = dir.x / len;
  const uy = dir.y / len;
  const c = { x: p.x + ux * size, y: p.y + uy * size };
  const w = size * 0.6;
  const pts = [
    `${p.x},${p.y}`,
    `${c.x - uy * w},${c.y + ux * w}`,
    `${p.x + ux * size * 2},${p.y + uy * size * 2}`,
    `${c.x + uy * w},${c.y - ux * w}`
  ].join(" ");
  return /* @__PURE__ */ jsx("polygon", { className: "af-edge__marker af-edge__marker--diamond", points: pts });
}
var AfEdge = memo(function AfEdge2(props) {
  const { id, source, target, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data } = props;
  const highlighted = useUi((s) => s.hoverId === source || s.hoverId === target || s.selectedId === source || s.selectedId === target);
  const dimmed = useUi((s) => isDimmed(s, source) || isDimmed(s, target));
  if (!data) return null;
  const { edge, placed, title } = data;
  const kind = edge.kind;
  let d;
  let label = null;
  let tip;
  let tipDir;
  let start;
  let startDir;
  if (placed.points && placed.points.length >= 2) {
    const pts = placed.points;
    d = roundedPath(pts);
    tip = pts[pts.length - 1];
    const prev = pts[pts.length - 2];
    tipDir = { x: tip.x - prev.x, y: tip.y - prev.y };
    start = pts[0];
    startDir = { x: pts[1].x - pts[0].x, y: pts[1].y - pts[0].y };
    if (placed.label) label = { x: placed.label.x + placed.label.width / 2, y: placed.label.y + placed.label.height / 2 };
  } else if (source === target) {
    const off = 26;
    const horizontal = sourcePosition === Position.Right || sourcePosition === Position.Left;
    const pts = horizontal ? [
      { x: sourceX, y: sourceY },
      { x: sourceX + off, y: sourceY },
      { x: sourceX + off, y: targetY - off },
      { x: targetX, y: targetY - off },
      { x: targetX, y: targetY }
    ] : [
      { x: sourceX, y: sourceY },
      { x: sourceX, y: sourceY + off },
      { x: targetX - off, y: sourceY + off },
      { x: targetX - off, y: targetY },
      { x: targetX, y: targetY }
    ];
    d = roundedPath(pts);
    tip = pts[4];
    tipDir = { x: pts[4].x - pts[3].x, y: pts[4].y - pts[3].y };
    start = pts[0];
    startDir = { x: pts[1].x - pts[0].x, y: pts[1].y - pts[0].y };
    label = horizontal ? { x: sourceX + off + 4, y: (sourceY + targetY - off) / 2 } : { x: (sourceX + targetX - off) / 2, y: sourceY + off + 4 };
  } else {
    const tx = placed.entry ? placed.entry.x : targetX;
    const ty = placed.entry ? placed.entry.y : targetY;
    const tpos = placed.entry ? SIDE_POSITION[placed.entry.side] : targetPosition;
    const [p, lx, ly] = getSmoothStepPath({ sourceX, sourceY, targetX: tx, targetY: ty, sourcePosition, targetPosition: tpos, borderRadius: 6, offset: 18 });
    d = p;
    label = { x: lx, y: ly };
    tip = { x: tx, y: ty };
    tipDir = DIR[tpos];
    start = { x: sourceX, y: sourceY };
    startDir = { x: -DIR[sourcePosition].x, y: -DIR[sourcePosition].y };
  }
  let marker = null;
  if (kind === "depends-on") marker = /* @__PURE__ */ jsx("circle", { className: "af-edge__marker", cx: tip.x, cy: tip.y, r: 3.5 });
  else if (kind !== "implicit-failure") marker = arrowHead(tip, tipDir, kind === "retry");
  return /* @__PURE__ */ jsxs(
    "g",
    {
      className: `af-edge af-edge--${kind}${edge.backward ? " af-edge--backward" : ""}${edge.origin === "onFailure" ? " af-edge--from-failure" : ""}`,
      "data-highlighted": highlighted || void 0,
      "data-dimmed": dimmed || void 0,
      children: [
        /* @__PURE__ */ jsx("path", { d, className: "af-edge__hit", children: /* @__PURE__ */ jsx("title", { children: title }) }),
        kind === "workflow-call" ? /* @__PURE__ */ jsx("path", { d, className: "af-edge__outer" }) : null,
        /* @__PURE__ */ jsx("path", { id, d, className: "af-edge__line" }),
        kind === "workflow-call" ? diamondAt(start, startDir) : null,
        marker,
        placed.labelText && label ? /* @__PURE__ */ jsx(EdgeLabelRenderer, { children: /* @__PURE__ */ jsx(
          "div",
          {
            className: `af-edge-label af-edge-label--${kind}${edge.origin === "onFailure" ? " af-edge-label--from-failure" : ""}${edge.retryDefaults ? " af-edge-label--defaults" : ""}`,
            "data-highlighted": highlighted || void 0,
            "data-dimmed": dimmed || void 0,
            style: { transform: `translate(-50%, -50%) translate(${label.x}px, ${label.y}px)` },
            title,
            children: placed.labelText
          }
        ) }) : null
      ]
    }
  );
});
var edgeTypes = { af: AfEdge };
function EdgeSample({ kind }) {
  const d = kind === "retry" ? "M4,12 H40 V5 H52" : "M4,9 H52";
  const tip = kind === "retry" ? { x: 58, y: 5 } : { x: 58, y: 9 };
  return /* @__PURE__ */ jsx("svg", { width: "62", height: "18", viewBox: "0 0 62 18", "aria-hidden": "true", className: "af-legend__svg", children: /* @__PURE__ */ jsxs("g", { className: `af-edge af-edge--${kind}`, children: [
    kind === "workflow-call" ? /* @__PURE__ */ jsx("path", { d, className: "af-edge__outer" }) : null,
    /* @__PURE__ */ jsx("path", { d: `${d} L${tip.x - 1},${tip.y}`, className: "af-edge__line" }),
    kind === "depends-on" ? /* @__PURE__ */ jsx("circle", { cx: tip.x - 2, cy: tip.y, r: 3.5, className: "af-edge__marker" }) : kind === "implicit-failure" ? null : kind === "retry" ? /* @__PURE__ */ jsx("polyline", { className: "af-edge__marker af-edge__marker--open", points: `${tip.x - 8},${tip.y - 4} ${tip.x},${tip.y} ${tip.x - 8},${tip.y + 4}` }) : /* @__PURE__ */ jsx("polygon", { className: "af-edge__marker", points: `${tip.x - 8},${tip.y - 4} ${tip.x},${tip.y} ${tip.x - 8},${tip.y + 4}` }),
    kind === "workflow-call" ? /* @__PURE__ */ jsx("polygon", { className: "af-edge__marker af-edge__marker--diamond", points: "4,9 8,6 12,9 8,12" }) : null
  ] }) });
}
function Legend({ defaultOpen = false, messages: m, kinds }) {
  const [open, setOpen] = useState(defaultOpen);
  const L = m.ui.legendNodeLabels;
  return /* @__PURE__ */ jsxs("section", { className: "af-legend", "aria-labelledby": "af-legend-title", children: [
    /* @__PURE__ */ jsxs("button", { type: "button", className: "af-legend__toggle", "aria-expanded": open, onClick: () => setOpen((o) => !o), children: [
      /* @__PURE__ */ jsx(IconChevron, { open, size: 12 }),
      /* @__PURE__ */ jsx("span", { id: "af-legend-title", children: m.ui.legend })
    ] }),
    open ? /* @__PURE__ */ jsxs("div", { className: "af-legend__body", children: [
      /* @__PURE__ */ jsx("ul", { className: "af-legend__list", "aria-label": m.ui.legendEdges, children: EDGE_KINDS.map((k) => /* @__PURE__ */ jsxs("li", { "data-present": kinds?.has(k) || void 0, children: [
        /* @__PURE__ */ jsx(EdgeSample, { kind: k }),
        /* @__PURE__ */ jsx("span", { children: m.ui.legendEdgeLabels[k] })
      ] }, k)) }),
      /* @__PURE__ */ jsxs("ul", { className: "af-legend__list af-legend__list--nodes", "aria-label": m.ui.legendNodes, children: [
        /* @__PURE__ */ jsxs("li", { children: [
          /* @__PURE__ */ jsx("span", { className: "af-legend__node af-accent--http", children: /* @__PURE__ */ jsx("span", { className: "af-badge af-badge--post", children: "POST" }) }),
          /* @__PURE__ */ jsx("span", { children: L.http })
        ] }),
        /* @__PURE__ */ jsxs("li", { children: [
          /* @__PURE__ */ jsx("span", { className: "af-legend__node af-accent--async-send", children: /* @__PURE__ */ jsxs("span", { className: "af-badge af-badge--send", children: [
            /* @__PURE__ */ jsx(IconSend, { size: 10 }),
            "SEND"
          ] }) }),
          /* @__PURE__ */ jsx("span", { children: L.send })
        ] }),
        /* @__PURE__ */ jsxs("li", { children: [
          /* @__PURE__ */ jsx("span", { className: "af-legend__node af-accent--async-receive", children: /* @__PURE__ */ jsxs("span", { className: "af-badge af-badge--receive", children: [
            /* @__PURE__ */ jsx(IconReceive, { size: 10 }),
            "RECEIVE"
          ] }) }),
          /* @__PURE__ */ jsx("span", { children: L.receive })
        ] }),
        /* @__PURE__ */ jsxs("li", { children: [
          /* @__PURE__ */ jsx("span", { className: "af-legend__node af-legend__node--double af-accent--workflow", children: /* @__PURE__ */ jsxs("span", { className: "af-badge af-badge--workflow", children: [
            /* @__PURE__ */ jsx(IconWorkflow, { size: 10 }),
            "WF"
          ] }) }),
          /* @__PURE__ */ jsx("span", { children: L.workflow })
        ] }),
        /* @__PURE__ */ jsxs("li", { children: [
          /* @__PURE__ */ jsx("span", { className: "af-legend__glyph af-legend__glyph--junction" }),
          /* @__PURE__ */ jsx("span", { children: L.junction })
        ] }),
        /* @__PURE__ */ jsxs("li", { children: [
          /* @__PURE__ */ jsx("span", { className: "af-legend__glyph af-legend__glyph--end-success", children: /* @__PURE__ */ jsx(IconCheck, { size: 9 }) }),
          /* @__PURE__ */ jsx("span", { className: "af-legend__glyph af-legend__glyph--end-failure", children: /* @__PURE__ */ jsx(IconX, { size: 9 }) }),
          /* @__PURE__ */ jsx("span", { children: L.end })
        ] }),
        /* @__PURE__ */ jsxs("li", { children: [
          /* @__PURE__ */ jsx("span", { className: "af-legend__glyph af-legend__glyph--ref", children: /* @__PURE__ */ jsx(IconExternal, { size: 9 }) }),
          /* @__PURE__ */ jsx("span", { children: L.ref })
        ] })
      ] })
    ] }) : null
  ] });
}
function Item({ n, g, m, byId, onSelect, onReveal }) {
  const selected = useUi((s) => s.selectedId === n.id);
  const exits = g.edges.filter((e) => e.source === n.id).map((e) => exitText(e, byId.get(e.target), m));
  return /* @__PURE__ */ jsxs("li", { className: "af-list__item", "data-selected": selected || void 0, children: [
    /* @__PURE__ */ jsxs(
      "button",
      {
        type: "button",
        className: "af-list__btn",
        "aria-current": selected || void 0,
        onClick: () => onSelect(n.id),
        onDoubleClick: () => onReveal(n.id),
        onKeyDown: (e) => {
          if (e.key === "Enter" && e.shiftKey) {
            e.preventDefault();
            onReveal(n.id);
          }
        },
        children: [
          n.kind === "step" ? /* @__PURE__ */ jsx(MethodBadge, { node: n, m }) : null,
          /* @__PURE__ */ jsx("span", { className: "af-list__name af-mono", children: nodeName(n, m) }),
          n.order ? /* @__PURE__ */ jsxs("span", { className: "af-card__order", children: [
            "#",
            n.order
          ] }) : null
        ]
      }
    ),
    /* @__PURE__ */ jsxs("div", { className: "af-list__meta", children: [
      n.kind === "step" ? /* @__PURE__ */ jsx("span", { children: kindText(n, m) }) : null,
      n.diagnostics?.length ? /* @__PURE__ */ jsx("span", { className: "af-list__diag", children: n.diagnostics.map((d) => d.code).join(", ") }) : null,
      exits.length ? /* @__PURE__ */ jsx("span", { className: "af-list__exits", children: exits.join(" \xB7 ") }) : null
    ] })
  ] });
}
var ListView = memo(function ListView2({ graph, messages: m, onSelect, onReveal }) {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const items = graph.nodes.filter((n) => n.kind !== "junction");
  return /* @__PURE__ */ jsxs("aside", { className: "af-list", "aria-label": m.ui.listTitle, children: [
    /* @__PURE__ */ jsx("h2", { className: "af-list__title", children: m.ui.listTitle }),
    /* @__PURE__ */ jsx("ol", { className: "af-list__ol", children: items.map((n) => /* @__PURE__ */ jsx(Item, { n, g: graph, m, byId, onSelect, onReveal }, n.id)) })
  ] });
});
function readVsCodeThemeKind(doc = typeof document !== "undefined" ? document : void 0) {
  const body = doc?.body;
  if (!body) return null;
  const attr = body.getAttribute("data-vscode-theme-kind");
  if (attr === "vscode-light" || attr === "vscode-dark" || attr === "vscode-high-contrast" || attr === "vscode-high-contrast-light") return attr;
  const c = body.classList;
  if (c.contains("vscode-high-contrast-light")) return "vscode-high-contrast-light";
  if (c.contains("vscode-high-contrast")) return "vscode-high-contrast";
  if (c.contains("vscode-dark")) return "vscode-dark";
  if (c.contains("vscode-light")) return "vscode-light";
  return null;
}
function media(q) {
  try {
    return typeof window !== "undefined" && !!window.matchMedia?.(q).matches;
  } catch {
    return false;
  }
}
function ancestorTheme(el) {
  const host = el?.closest?.("[data-theme]");
  const t = host?.getAttribute("data-theme");
  return t === "dark" || t === "light" ? t : null;
}
function resolveTheme(theme, highContrast, el) {
  const kind = readVsCodeThemeKind();
  const effective = theme === "auto" && kind ? "vscode" : theme;
  const hcKind = kind === "vscode-high-contrast" || kind === "vscode-high-contrast-light";
  let dark;
  if (effective === "vscode") dark = kind ? kind === "vscode-dark" || kind === "vscode-high-contrast" : media("(prefers-color-scheme: dark)");
  else if (effective === "connethics-dark") dark = true;
  else if (effective === "connethics-light") dark = false;
  else dark = (ancestorTheme(el) ?? (media("(prefers-color-scheme: dark)") ? "dark" : "light")) === "dark";
  return {
    theme: effective,
    vscodeKind: kind,
    dark,
    highContrast: highContrast ?? (effective === "vscode" && hcKind || media("(forced-colors: active)"))
  };
}
function useResolvedTheme(theme, highContrast, el) {
  const [resolved, setResolved] = useState(() => resolveTheme(theme, highContrast, el));
  useEffect(() => {
    const update = () => setResolved((prev) => {
      const next = resolveTheme(theme, highContrast, el);
      return prev.theme === next.theme && prev.dark === next.dark && prev.highContrast === next.highContrast && prev.vscodeKind === next.vscodeKind ? prev : next;
    });
    update();
    const observers = [];
    if (typeof MutationObserver !== "undefined" && typeof document !== "undefined") {
      const mo = new MutationObserver(update);
      mo.observe(document.body, { attributes: true, attributeFilter: ["class", "data-vscode-theme-kind"] });
      mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class"] });
      observers.push(mo);
    }
    const queries = ["(prefers-color-scheme: dark)", "(forced-colors: active)"].map((q) => {
      try {
        return window.matchMedia?.(q);
      } catch {
        return void 0;
      }
    }).filter((x) => !!x);
    queries.forEach((q) => q.addEventListener?.("change", update));
    return () => {
      observers.forEach((o) => o.disconnect());
      queries.forEach((q) => q.removeEventListener?.("change", update));
    };
  }, [theme, highContrast, el]);
  return resolved;
}
function toMermaid(graph, o = {}) {
  return graphToMermaid(graph, { direction: o.direction ?? "TB", lanes: (o.lanes ?? "off") !== "off", hideFailures: !!o.hideFailures });
}
function dataUrlToBlob(url) {
  const comma = url.indexOf(",");
  const meta = url.slice(5, comma);
  const data = url.slice(comma + 1);
  const type = meta.split(";")[0] || "application/octet-stream";
  if (/;base64/i.test(meta)) {
    const bin = atob(data);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type });
  }
  return new Blob([decodeURIComponent(data)], { type });
}
var SVG_PROPS = ["fill", "stroke", "stroke-width", "stroke-dasharray", "stroke-linecap", "stroke-linejoin", "opacity"];
function inlineSvgPaint(root) {
  const saved = [];
  root.querySelectorAll("path, polygon, polyline, circle, line, rect").forEach((el) => {
    if (!(el instanceof SVGElement)) return;
    const cs = getComputedStyle(el);
    saved.push([el, el.getAttribute("style")]);
    for (const p of SVG_PROPS) {
      const v = cs.getPropertyValue(p);
      if (v) el.style.setProperty(p, v);
    }
  });
  return () => {
    for (const [el, style] of saved) {
      if (style === null) el.removeAttribute("style");
      else el.setAttribute("style", style);
    }
  };
}
async function exportImage(root, format, o) {
  const viewport = root.querySelector(".react-flow__viewport");
  if (!viewport) throw new Error("arazzo-flow: viewport not found");
  const { toPng, toSvg } = await import('html-to-image');
  const pad = o.padding ?? 24;
  const width = Math.ceil(o.bounds.width + pad * 2);
  const height = Math.ceil(o.bounds.height + pad * 2);
  const bg = o.backgroundColor ?? getComputedStyle(root).getPropertyValue("--af-canvas-bg").trim() ?? void 0;
  const prevLod = root.dataset.lod;
  root.dataset.lod = "full";
  root.dataset.exporting = "true";
  const restore = inlineSvgPaint(viewport);
  try {
    const opts = {
      width,
      height,
      backgroundColor: bg || void 0,
      skipFonts: true,
      pixelRatio: format === "png" ? o.pixelRatio ?? 2 : 1,
      style: { width: `${width}px`, height: `${height}px`, transform: `translate(${pad - o.bounds.x}px, ${pad - o.bounds.y}px) scale(1)` },
      filter: (n) => !(n instanceof HTMLElement && n.classList.contains("react-flow__handle"))
    };
    const url = format === "png" ? await toPng(viewport, opts) : await toSvg(viewport, opts);
    return dataUrlToBlob(url);
  } finally {
    restore();
    if (prevLod) root.dataset.lod = prevLod;
    delete root.dataset.exporting;
  }
}
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1e3);
}
var MIN_READABLE_FIT_ZOOM = 0.3;
var START_ZOOM_LARGE = 0.75;
var LARGE_NODES = 150;
var HUGE_NODES = 300;
var PRIMARY_NEXT = ["sequence", "success", "end-success", "depends-on", "workflow-call", "retry", "transfer", "failure", "end-failure", "implicit-failure"];
var FAILURE_NEXT = ["failure", "end-failure", "retry", "transfer", "implicit-failure"];
function prefersReducedMotion() {
  try {
    return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || document.body.classList.contains("vscode-reduce-motion");
  } catch {
    return false;
  }
}
function escapeId(id) {
  return typeof CSS !== "undefined" && CSS.escape ? CSS.escape(id) : id.replace(/["\\]/g, "\\$&");
}
function GraphInner(props) {
  const { graph, store, onSelectStep, onRevealStep, onLayout, onOptionsChange, onOpenWorkflow, onExport, apiRef } = props;
  const m = props.messages ?? (props.lang === "en" ? en : fr);
  const rf = useReactFlow();
  const [rootEl, setRootEl] = useState(null);
  const wrapperRef = useRef(null);
  const searchRef = useRef(null);
  const helpRef = useRef(null);
  const theme = useResolvedTheme(props.theme ?? "auto", props.highContrast, rootEl);
  const [direction, setDirection] = useState(props.layout ?? "TB");
  const [lanes, setLanes] = useState(props.lanes ?? "off");
  const [densityPref, setDensityPref] = useState(props.density ?? "auto");
  const [showFailure, setShowFailure] = useState(props.showFailureEdges ?? true);
  const [showImplicit, setShowImplicit] = useState(props.showImplicitFailures ?? false);
  const [showMinimap, setShowMinimap] = useState(props.showMinimap ?? true);
  const [showLegend, setShowLegend] = useState(props.showLegend ?? true);
  const [showList, setShowList] = useState(props.showList ?? false);
  const [exportOpen, setExportOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(props.collapsed ?? {});
  const [layout, setLayout] = useState(null);
  const [pending, setPending] = useState(false);
  const [layoutError, setLayoutError] = useState(null);
  const [announce, setAnnounce] = useState("");
  const [query, setQuery] = useState("");
  const [fitDone, setFitDone] = useState(0);
  const focusedId = useRef(null);
  const focusDepth = useRef(0);
  const generation = useRef(0);
  const lastFitKey = useRef("");
  const ids = useMemo(() => {
    const base = `af-${graph.workflowId.replace(/[^A-Za-z0-9_-]/g, "_")}-${Math.random().toString(36).slice(2, 8)}`;
    return { desc: `${base}-desc`, hint: `${base}-hint`, help: `${base}-help` };
  }, [graph.workflowId]);
  useEffect(() => setDirection(props.layout ?? "TB"), [props.layout]);
  useEffect(() => setLanes(props.lanes ?? "off"), [props.lanes]);
  useEffect(() => setDensityPref(props.density ?? "auto"), [props.density]);
  useEffect(() => setShowFailure(props.showFailureEdges ?? true), [props.showFailureEdges]);
  useEffect(() => setShowImplicit(props.showImplicitFailures ?? false), [props.showImplicitFailures]);
  useEffect(() => setShowMinimap(props.showMinimap ?? true), [props.showMinimap]);
  useEffect(() => setCollapsed(props.collapsed ?? {}), [props.collapsed, graph]);
  useEffect(() => {
    void prewarmElk(props.elk ?? {});
  }, [props.elk?.workerUrl, props.elk?.createWorker, props.elk?.mode, props.elk?.engine]);
  const optionsRef = useRef(onOptionsChange);
  optionsRef.current = onOptionsChange;
  const firstOptions = useRef(true);
  useEffect(() => {
    if (firstOptions.current) {
      firstOptions.current = false;
      return;
    }
    optionsRef.current?.({ layout: direction, lanes, density: densityPref });
  }, [direction, lanes, densityPref]);
  const view = useMemo(
    () => toViewGraph(graph, { workflowActions: props.workflowActions, diagnostics: props.diagnostics, subgraphs: props.subgraphs }),
    [graph, props.workflowActions, props.diagnostics, props.subgraphs]
  );
  const vg = useMemo(
    () => visibleGraph(view, { showFailureEdges: showFailure, showImplicitFailures: showImplicit, collapsed }),
    [view, showFailure, showImplicit, collapsed]
  );
  const stepCount = vg.nodes.filter((n) => n.kind === "step").length;
  const density = densityPref === "auto" ? vg.nodes.length > 50 ? "compact" : "standard" : densityPref;
  const byId = useMemo(() => new Map(vg.nodes.map((n) => [n.id, n])), [vg]);
  const large = vg.nodes.length > LARGE_NODES;
  const resolveId = useCallback(
    (id) => {
      if (!id) return null;
      if (byId.has(id)) return id;
      if (byId.has(`step:${id}`)) return `step:${id}`;
      const [wf, step] = id.includes("/") ? id.split("/", 2) : [null, null];
      if (wf && step) {
        if (wf === graph.workflowId && byId.has(`step:${step}`)) return `step:${step}`;
        if (byId.has(`group:${wf}/step:${step}`)) return `group:${wf}/step:${step}`;
      }
      return null;
    },
    [byId, graph.workflowId]
  );
  useEffect(() => {
    store.set({ selectedId: null, matches: null, currentMatch: null, focusSet: null, hoverId: null });
    setQuery("");
  }, [graph.workflowId, store]);
  useEffect(() => {
    if (props.selectedStepId !== void 0) store.set({ selectedId: resolveId(props.selectedStepId) });
  }, [props.selectedStepId, store, resolveId]);
  const fitPadding = useMemo(
    () => ({ top: view.defaults ? "104px" : "64px", bottom: "36px", left: "28px", right: showList ? "330px" : "28px" }),
    [view.defaults, showList]
  );
  const readyRef = useRef(props.onViewportReady);
  readyRef.current = props.onViewportReady;
  useEffect(() => {
    if (fitDone) readyRef.current?.();
  }, [fitDone]);
  const layoutRef = useRef(onLayout);
  layoutRef.current = onLayout;
  useEffect(() => {
    const opts = { direction, lanes, density, lang: m.lang, unknownLabel: m.ui.unknownSource };
    const key = structureKey(vg, opts);
    if (layout?.key === key) return;
    const gen = ++generation.current;
    setPending(true);
    setAnnounce(m.announceLayoutPending);
    const timer = setTimeout(() => {
      computeLayout(vg, opts, props.elk ?? {}).then((res) => {
        if (gen !== generation.current) return;
        setLayout(res);
        setPending(false);
        setLayoutError(null);
        setAnnounce(m.announceLayout(res.ms, vg.nodes.length));
        layoutRef.current?.({ ms: res.ms, mode: res.mode, nodes: vg.nodes.length, edges: vg.edges.length, density });
      }).catch((err) => {
        if (gen !== generation.current) return;
        setPending(false);
        setLayoutError(err instanceof Error ? err.message : String(err));
        setAnnounce(m.layoutError);
      });
    }, 0);
    return () => clearTimeout(timer);
  }, [vg, direction, lanes, density, m.lang]);
  const toggleGroup = useCallback((groupId) => {
    setCollapsed((c) => ({ ...c, [groupId]: !c[groupId] }));
  }, []);
  const { rfNodes, rfEdges } = useMemo(() => {
    if (!layout) return { rfNodes: [], rfEdges: [] };
    const frames = layout.frames.map((f) => ({
      id: `frame:${f.id}`,
      type: "frame",
      position: { x: f.x, y: f.y },
      width: f.width,
      height: f.height,
      style: { width: f.width, height: f.height },
      data: { frame: f, messages: m, onToggle: f.kind === "workflow" ? toggleGroup : void 0 },
      draggable: false,
      selectable: false,
      focusable: false,
      zIndex: f.kind === "workflow" ? -1 : -2,
      className: "af-rf-frame",
      ariaRole: "group",
      ariaLabel: f.kind === "workflow" ? m.ariaSubworkflow(f.label) : m.ariaLane(f.label)
    }));
    const nodes = vg.nodes.filter((n) => layout.nodes[n.id]).map((n) => {
      const p = layout.nodes[n.id];
      return {
        id: n.id,
        type: n.kind,
        position: { x: p.x, y: p.y },
        width: p.width,
        height: p.height,
        style: { width: p.width, height: p.height },
        data: { node: n, placed: p, density, messages: m, outEdges: vg.edges.filter((e) => e.source === n.id), onToggleGroup: n.collapsed ? toggleGroup : void 0 },
        draggable: false,
        connectable: false,
        selectable: false,
        focusable: true,
        ariaRole: "group",
        ariaLabel: ariaLabelFor(n, vg, m, byId),
        domAttributes: { "aria-roledescription": n.kind === "step" ? m.roleStep : n.kind }
      };
    });
    const edges = vg.edges.filter((e) => layout.edges[e.id] && layout.nodes[e.source] && layout.nodes[e.target]).map((e) => {
      const placed = layout.edges[e.id];
      const label = placed.labelText || edgeLabelText(e, density, m.lang);
      return {
        id: e.id,
        type: "af",
        source: e.source,
        target: e.target,
        sourceHandle: e.sourcePort,
        targetHandle: e.targetPort,
        focusable: false,
        selectable: false,
        data: { edge: e, placed, title: edgeTitle(e, byId.get(e.target), m, label) }
      };
    });
    return { rfNodes: [...frames, ...nodes], rfEdges: edges };
  }, [layout, vg, density, m, toggleGroup, byId]);
  useEffect(() => {
    if (!layout) return;
    const fitKey = `${graph.workflowId}|${layout.options.direction}|${layout.options.lanes}|${layout.options.density}|${vg.nodes.length}`;
    if (fitKey === lastFitKey.current) return;
    lastFitKey.current = fitKey;
    const raf = typeof requestAnimationFrame !== "undefined" ? requestAnimationFrame : (f) => setTimeout(f, 0);
    raf(
      () => raf(async () => {
        await rf.fitView({ padding: fitPadding, maxZoom: 1, duration: 0 });
        if (rf.getZoom() < MIN_READABLE_FIT_ZOOM) {
          const first = vg.nodes.find((n) => n.kind === "input") ?? vg.nodes[0];
          const p = first && layout.nodes[first.id];
          const rect = wrapperRef.current?.getBoundingClientRect();
          if (p && rect) {
            const z = START_ZOOM_LARGE;
            void rf.setViewport({ x: rect.width / 2 - (p.x + p.width / 2) * z, y: 70 - p.y * z, zoom: z });
            setAnnounce(`${m.announceLayout(layout.ms, vg.nodes.length)} ${m.announceLargeStart}`);
          }
        }
        setFitDone((n) => n + 1);
      })
    );
  }, [layout, rf, graph.workflowId, vg.nodes.length, fitPadding]);
  const infoOf = (n) => ({ nodeId: n.id, workflowId: n.workflowId });
  const select = useCallback(
    (id, opts = {}) => {
      store.set({ selectedId: id });
      const n = id ? byId.get(id) ?? null : null;
      onSelectStep?.(n ? n.stepId ?? n.id : null, n?.core ?? null, n ? infoOf(n) : null);
      if (n && opts.announce !== false) {
        const exits = vg.edges.filter((e) => e.source === n.id).length;
        setAnnounce(m.announceSelected(nodeName(n, m), n.kind === "step" ? kindText(n, m) : n.kind, exits));
      }
    },
    [store, byId, onSelectStep, vg, m]
  );
  const focusNode = useCallback(
    (id) => {
      const el = wrapperRef.current?.querySelector(`.react-flow__node[data-id="${escapeId(id)}"]`);
      if (el) {
        el.focus({ preventScroll: true });
        focusedId.current = id;
      }
      const p = layout?.nodes[id];
      if (p) {
        const vp = rf.getViewport();
        const rect = wrapperRef.current?.getBoundingClientRect();
        if (rect && rect.width > 0) {
          const sx = p.x * vp.zoom + vp.x;
          const sy = p.y * vp.zoom + vp.y;
          const out = sx < 0 || sy < 40 || sx + p.width * vp.zoom > rect.width || sy + p.height * vp.zoom > rect.height - 20;
          if (out) void rf.setCenter(p.x + p.width / 2, p.y + p.height / 2, { zoom: Math.max(vp.zoom, 0.6), duration: prefersReducedMotion() ? 0 : 150 });
        }
      }
    },
    [layout, rf]
  );
  const neighbor = useCallback(
    (id, dir) => {
      const outs = vg.edges.filter((e) => e.source === id && e.target !== id);
      const ins = vg.edges.filter((e) => e.target === id && e.source !== id);
      const rank = (list, k) => list.indexOf(k) + 1 || 99;
      if (dir === "down") return [...outs].sort((a, b) => rank(PRIMARY_NEXT, a.kind) - rank(PRIMARY_NEXT, b.kind))[0]?.target ?? null;
      if (dir === "failure")
        return [...outs].filter((e) => FAILURE_NEXT.includes(e.kind) || e.origin === "onFailure").sort((a, b) => rank(FAILURE_NEXT, a.kind) - rank(FAILURE_NEXT, b.kind))[0]?.target ?? null;
      if (dir === "up") {
        const prim = ins.filter((e) => !e.backward);
        return [...prim.length ? prim : ins].sort((a, b) => rank(PRIMARY_NEXT, a.kind) - rank(PRIMARY_NEXT, b.kind))[0]?.source ?? null;
      }
      if (!layout) return null;
      const me = layout.nodes[id];
      if (!me) return null;
      const TB = layout.options.direction === "TB";
      const c = (p) => TB ? p.y + p.height / 2 : p.x + p.width / 2;
      const t = (p) => TB ? p.x + p.width / 2 : p.y + p.height / 2;
      const same = Object.entries(layout.nodes).filter(([oid, p]) => oid !== id && Math.abs(c(p) - c(me)) < (TB ? Math.max(p.height, me.height) : Math.max(p.width, me.width)) / 2 + 8).sort((a, b) => t(a[1]) - t(b[1]));
      const mine = t(me);
      if (dir === "right") return same.find(([, p]) => t(p) > mine)?.[0] ?? null;
      return [...same].reverse().find(([, p]) => t(p) < mine)?.[0] ?? null;
    },
    [vg, layout]
  );
  const runSearch = useCallback(
    (q, step = 0) => {
      setQuery(q);
      const s = q.trim().toLowerCase();
      if (!s) {
        store.set({ matches: null, currentMatch: null });
        return;
      }
      const hits = vg.nodes.filter((n) => [n.label, n.operationId, n.operationPath, n.channel, n.summary, n.path, n.targetWorkflowId].some((v) => v?.toLowerCase().includes(s))).map((n) => n.id);
      const cur = store.get().currentMatch;
      let idx = cur ? hits.indexOf(cur) : -1;
      idx = step === 0 ? idx >= 0 ? idx : 0 : (idx + step + hits.length) % Math.max(hits.length, 1);
      const current = hits[idx] ?? null;
      store.set({ matches: new Set(hits), currentMatch: current });
      if (current) {
        const p = layout?.nodes[current];
        if (p) void rf.setCenter(p.x + p.width / 2, p.y + p.height / 2, { zoom: Math.max(rf.getZoom(), 0.75), duration: prefersReducedMotion() ? 0 : 150 });
        setAnnounce(m.announceSearch(idx + 1, hits.length, q));
      } else setAnnounce(m.announceNoResult(q));
    },
    [vg, store, layout, rf, m]
  );
  const setFocusMode = useCallback(
    (id) => {
      focusDepth.current = store.get().focusSet && focusedId.current === id ? Math.min(focusDepth.current + 1, 2) : 1;
      let set = /* @__PURE__ */ new Set([id]);
      for (let d = 0; d < focusDepth.current; d++) {
        const next = new Set(set);
        for (const e of vg.edges) {
          if (set.has(e.source)) next.add(e.target);
          if (set.has(e.target)) next.add(e.source);
        }
        set = next;
      }
      store.set({ focusSet: set });
      setAnnounce(m.announceFocusMode(nodeName(byId.get(id), m, id)));
    },
    [store, vg, byId, m]
  );
  const reveal = useCallback(
    (id) => {
      const n = byId.get(id);
      if (!n) return;
      select(id, { announce: false });
      if (n.kind === "workflow-ref" && !n.collapsed && onOpenWorkflow) onOpenWorkflow(n.targetWorkflowId ?? n.label);
      else if (n.core) onRevealStep?.(n.stepId ?? n.id, n.core, infoOf(n));
      setAnnounce(m.announceReveal(nodeName(n, m)));
    },
    [byId, select, onRevealStep, onOpenWorkflow, m]
  );
  const fit = useCallback(() => void rf.fitView({ padding: fitPadding, maxZoom: 1, duration: prefersReducedMotion() ? 0 : 200 }), [rf, fitPadding]);
  const cycleLanes = useCallback(() => setLanes((l) => l === "off" ? "clusters" : l === "clusters" ? "lanes" : "off"), []);
  const cycleDensity = useCallback(
    () => setDensityPref((d) => d === "auto" ? "compact" : d === "compact" ? "standard" : d === "standard" ? "detailed" : "auto"),
    []
  );
  const mermaid = useCallback(() => toMermaid(graph, { direction, lanes, hideFailures: !showFailure }), [graph, direction, lanes, showFailure]);
  const image = useCallback(
    async (format) => {
      const root = wrapperRef.current;
      if (!root || !layout) throw new Error("arazzo-flow: graph not laid out yet");
      const xs = [...Object.values(layout.nodes), ...layout.frames];
      for (const e of Object.values(layout.edges)) {
        for (const p of e.points ?? []) xs.push({ x: p.x, y: p.y, width: 0, height: 0 });
        if (e.label) xs.push({ x: e.label.x - 8, y: e.label.y, width: e.label.width + 16, height: e.label.height });
      }
      const vp = rf.getViewport();
      const rootBox = root.getBoundingClientRect();
      root.querySelectorAll(".af-edge-label").forEach((el) => {
        const b = el.getBoundingClientRect();
        if (!b.width) return;
        xs.push({ x: (b.left - rootBox.left - vp.x) / vp.zoom, y: (b.top - rootBox.top - vp.y) / vp.zoom, width: b.width / vp.zoom, height: b.height / vp.zoom });
      });
      const x0 = Math.min(...xs.map((p) => p.x));
      const y0 = Math.min(...xs.map((p) => p.y));
      const x1 = Math.max(...xs.map((p) => p.x + p.width));
      const y1 = Math.max(...xs.map((p) => p.y + p.height));
      return exportImage(root, format, { bounds: { x: x0, y: y0 - 12, width: x1 - x0, height: y1 - y0 + 24 } });
    },
    [layout, rf]
  );
  const doExport = useCallback(
    async (format) => {
      setExportOpen(false);
      const filename = `${graph.workflowId}.${format === "mermaid" ? "mmd" : format}`;
      try {
        if (format === "mermaid") {
          const text = mermaid();
          if (onExport) onExport({ format, filename, text });
          else {
            try {
              await navigator.clipboard.writeText(text);
              setAnnounce(m.ui.copied);
            } catch {
              downloadBlob(new Blob([text], { type: "text/plain" }), filename);
            }
          }
        } else {
          const blob = await image(format);
          if (onExport) onExport({ format, filename, blob });
          else downloadBlob(blob, filename);
        }
        setAnnounce(m.announceExported(format.toUpperCase()));
      } catch (err) {
        setAnnounce(String(err));
      }
    },
    [graph.workflowId, mermaid, image, onExport, m]
  );
  useImperativeHandle(
    apiRef,
    () => ({
      fitView: fit,
      focusStep: (id) => {
        const r = resolveId(id);
        if (r) focusNode(r);
      },
      search: (q) => runSearch(q),
      select: (id) => select(resolveId(id)),
      centerOn: (id, zoom) => {
        const r = resolveId(id);
        const p = r ? layout?.nodes[r] : void 0;
        if (p) void rf.setCenter(p.x + p.width / 2, p.y + p.height / 2, { zoom: zoom ?? rf.getZoom(), duration: 0 });
      },
      exportImage: image,
      toMermaid: mermaid
    }),
    [fit, focusNode, runSearch, select, layout, rf, resolveId, image, mermaid]
  );
  const openHelp = () => {
    const d = helpRef.current;
    if (d && typeof d.showModal === "function") d.showModal();
    else d?.setAttribute("open", "");
  };
  const onKeyDown = (ev) => {
    const target = ev.target;
    const inField = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable;
    if (inField) return;
    if (target.closest("dialog, .af-list, .af-export")) return;
    if (target.tagName === "BUTTON" && (ev.key === "Enter" || ev.key === " ")) return;
    const cur = focusedId.current && byId.has(focusedId.current) ? focusedId.current : null;
    const k = ev.key;
    const go = (id) => {
      if (id) {
        ev.preventDefault();
        focusNode(id);
      }
    };
    if (k === "/" && !ev.ctrlKey || (ev.ctrlKey || ev.metaKey) && k.toLowerCase() === "f") {
      if (props.showSearch === false) return;
      ev.preventDefault();
      searchRef.current?.focus();
      searchRef.current?.select();
      return;
    }
    if (ev.ctrlKey || ev.metaKey) return;
    switch (k) {
      case "ArrowDown":
        if (!cur) return go(vg.nodes[0]?.id ?? null);
        return go(neighbor(cur, ev.altKey ? "failure" : "down"));
      case "ArrowUp":
        return cur ? go(neighbor(cur, "up")) : void 0;
      case "ArrowLeft":
        return cur ? go(neighbor(cur, layout?.options.direction === "LR" ? "up" : "left")) : void 0;
      case "ArrowRight":
        return cur ? go(neighbor(cur, layout?.options.direction === "LR" ? "down" : "right")) : void 0;
      case "Enter":
        if (cur) {
          ev.preventDefault();
          reveal(cur);
        }
        return;
      case " ":
        if (cur) {
          ev.preventDefault();
          select(store.get().selectedId === cur ? null : cur);
        }
        return;
      case "Escape": {
        const s = store.get();
        if (s.matches) runSearch("");
        else if (s.focusSet) store.set({ focusSet: null });
        else select(null);
        return;
      }
      case "+":
      case "=":
        ev.preventDefault();
        void rf.zoomIn({ duration: 100 });
        return;
      case "-":
        ev.preventDefault();
        void rf.zoomOut({ duration: 100 });
        return;
      case "0":
        void rf.zoomTo(1, { duration: 100 });
        return;
      case "1":
      case "F":
        if (k === "F" && !ev.shiftKey) break;
        fit();
        return;
    }
    switch (k.toLowerCase()) {
      case "f":
        if (cur) setFocusMode(cur);
        return;
      case "e":
        setShowFailure((v) => !v);
        return;
      case "l":
        cycleLanes();
        return;
      case "d":
        setDirection((d) => d === "TB" ? "LR" : "TB");
        return;
      case "m":
        setShowMinimap((v) => !v);
        return;
      case "v":
        setShowList((v) => !v);
        return;
      case "?":
        openHelp();
        return;
    }
    if (k === "[" || k === "]" || k === "{" || k === "}") {
      const n = cur ? byId.get(cur) : null;
      const gid = n?.groupId ?? (n?.id.endsWith(":collapsed") ? n.id.replace(/:collapsed$/, "") : null);
      const collapse = k === "[" || k === "{";
      if (ev.shiftKey || k === "{" || k === "}") {
        const all = {};
        view.groups.forEach((g) => all[g.id] = collapse);
        setCollapsed(all);
      } else if (gid) setCollapsed((c) => ({ ...c, [gid]: collapse }));
    }
  };
  const lod = useStore((s) => s.transform[2] < 0.25 ? "min" : s.transform[2] < 0.45 ? "pill" : "full");
  const zoomLow = useStore((s) => s.transform[2] < 0.6);
  const zoomPct = useStore((s) => Math.round(s.transform[2] * 100));
  const failuresCount = view.edges.filter((e) => e.origin === "onFailure").length;
  const subflows = view.groups.length;
  const matches = useUi((s) => s.matches);
  const currentMatch = useUi((s) => s.currentMatch);
  const matchesInfo = (() => {
    if (!matches) return "";
    const arr = [...matches];
    return arr.length ? `${arr.indexOf(currentMatch ?? "") + 1}/${arr.length}` : "0";
  })();
  const presentKinds = useMemo(() => new Set(vg.edges.map((e) => e.kind)), [vg]);
  const defaults = view.defaults;
  const showToolbar = props.showToolbar ?? true;
  return /* @__PURE__ */ jsxs(
    "div",
    {
      ref: (el) => {
        wrapperRef.current = el;
        if (el !== rootEl) setRootEl(el);
      },
      className: `af-root af-canvas${props.className ? ` ${props.className}` : ""}`,
      style: props.style,
      role: "application",
      "aria-label": m.graphLabel(graph.workflowId),
      "aria-describedby": ids.desc,
      "aria-busy": pending || void 0,
      "data-af-theme": theme.theme,
      "data-af-dark": theme.dark || void 0,
      "data-vscode-kind": theme.vscodeKind ?? void 0,
      "data-lod": lod,
      "data-large": large || void 0,
      "data-zoom-low": zoomLow || void 0,
      "data-contrast": theme.highContrast ? "high" : void 0,
      onKeyDown,
      onFocus: (e) => {
        const el = e.target.closest(".react-flow__node");
        const id = el?.getAttribute("data-id");
        if (id && byId.has(id)) focusedId.current = id;
      },
      children: [
        /* @__PURE__ */ jsx("p", { id: ids.desc, className: "af-sr-only", children: m.graphDescription(stepCount, subflows, failuresCount) }),
        /* @__PURE__ */ jsxs(
          ReactFlow,
          {
            nodes: rfNodes,
            edges: rfEdges,
            nodeTypes,
            edgeTypes,
            nodesDraggable: false,
            nodesConnectable: false,
            elementsSelectable: false,
            nodesFocusable: true,
            edgesFocusable: false,
            disableKeyboardA11y: true,
            autoPanOnNodeFocus: false,
            zoomOnDoubleClick: false,
            onlyRenderVisibleElements: large,
            minZoom: 0.08,
            maxZoom: 2,
            colorMode: theme.dark ? "dark" : "light",
            ariaLabelConfig: {
              "node.a11yDescription.default": m.ui.nodeA11y,
              "node.a11yDescription.keyboardDisabled": m.ui.nodeA11y,
              "edge.a11yDescription.default": m.ui.edgeA11y,
              "minimap.ariaLabel": m.ui.minimapLabel
            },
            onNodeClick: (_, n) => {
              if (n.type === "frame") return;
              focusedId.current = n.id;
              select(store.get().selectedId === n.id ? null : n.id);
            },
            onNodeDoubleClick: (_, n) => n.type !== "frame" && reveal(n.id),
            onNodeMouseEnter: (_, n) => n.type !== "frame" && store.set({ hoverId: n.id }),
            onNodeMouseLeave: () => store.set({ hoverId: null }),
            onPaneClick: () => {
              setExportOpen(false);
              select(null);
            },
            proOptions: { hideAttribution: false },
            attributionPosition: "bottom-center",
            children: [
              /* @__PURE__ */ jsx(Background, { variant: BackgroundVariant.Dots, gap: 18, size: 1.2, className: "af-bg" }),
              showMinimap && /* @__PURE__ */ jsx(
                MiniMap,
                {
                  pannable: true,
                  zoomable: true,
                  position: "bottom-right",
                  ariaLabel: m.ui.minimapLabel,
                  nodeClassName: (n) => {
                    if (n.type === "frame") return "af-mm af-mm--frame";
                    const gn = n.data.node;
                    return `af-mm af-mm--${gn?.kind === "step" ? gn.stepKind : gn?.kind}`;
                  },
                  nodeBorderRadius: 4,
                  className: "af-minimap"
                }
              ),
              props.showSearch !== false ? /* @__PURE__ */ jsxs(Panel, { position: "top-left", className: "af-panel af-search", role: "search", children: [
                /* @__PURE__ */ jsxs("label", { className: "af-search__box", children: [
                  /* @__PURE__ */ jsx(IconSearch, { size: 14 }),
                  /* @__PURE__ */ jsx("span", { className: "af-sr-only", children: m.ui.search }),
                  /* @__PURE__ */ jsx(
                    "input",
                    {
                      ref: searchRef,
                      type: "search",
                      value: query,
                      placeholder: m.ui.searchPlaceholder,
                      "aria-describedby": ids.hint,
                      onChange: (e) => runSearch(e.target.value),
                      onKeyDown: (e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          runSearch(query, e.shiftKey ? -1 : 1);
                        } else if (e.key === "Escape") {
                          e.preventDefault();
                          const cur = store.get().currentMatch;
                          runSearch("");
                          if (cur) focusNode(cur);
                          else wrapperRef.current?.querySelector(".react-flow__node[tabindex]")?.focus();
                        }
                      }
                    }
                  ),
                  query ? /* @__PURE__ */ jsx("span", { className: "af-search__count", children: matchesInfo }) : null,
                  query ? /* @__PURE__ */ jsx("button", { type: "button", className: "af-iconbtn af-iconbtn--sm", "aria-label": m.ui.clearSearch, onClick: () => runSearch(""), children: /* @__PURE__ */ jsx(IconX, { size: 12 }) }) : null
                ] }),
                /* @__PURE__ */ jsx("span", { id: ids.hint, className: "af-sr-only", children: m.ui.searchHint })
              ] }) : null,
              showToolbar ? /* @__PURE__ */ jsx(Panel, { position: "top-right", className: "af-panel af-toolbar", children: /* @__PURE__ */ jsxs("div", { role: "toolbar", "aria-label": m.ui.toolbar, className: "af-toolbar__row", children: [
                /* @__PURE__ */ jsx(ToolBtn, { label: m.ui.zoomOut, onClick: () => void rf.zoomOut({ duration: 100 }), children: /* @__PURE__ */ jsx(IconMinus, {}) }),
                /* @__PURE__ */ jsxs("span", { className: "af-toolbar__zoom", "aria-hidden": "true", children: [
                  zoomPct,
                  " %"
                ] }),
                /* @__PURE__ */ jsx(ToolBtn, { label: m.ui.zoomIn, onClick: () => void rf.zoomIn({ duration: 100 }), children: /* @__PURE__ */ jsx(IconPlus, {}) }),
                /* @__PURE__ */ jsx(ToolBtn, { label: m.ui.zoom100, onClick: () => void rf.zoomTo(1, { duration: 100 }), children: /* @__PURE__ */ jsx(IconOneToOne, {}) }),
                /* @__PURE__ */ jsx(ToolBtn, { label: m.ui.fit, onClick: fit, children: /* @__PURE__ */ jsx(IconFit, {}) }),
                /* @__PURE__ */ jsx("span", { className: "af-toolbar__sep" }),
                /* @__PURE__ */ jsx(ToolBtn, { label: m.ui.direction(direction), pressed: direction === "LR", onClick: () => setDirection((d) => d === "TB" ? "LR" : "TB"), text: direction, children: direction === "TB" ? /* @__PURE__ */ jsx(IconArrowDown, {}) : /* @__PURE__ */ jsx(IconArrowRight, {}) }),
                /* @__PURE__ */ jsx(ToolBtn, { label: m.ui.lanes(lanes), pressed: lanes !== "off", onClick: cycleLanes, text: m.ui.lanesShort(lanes), children: /* @__PURE__ */ jsx(IconLanes, {}) }),
                /* @__PURE__ */ jsx(ToolBtn, { label: m.ui.density(densityPref, density), onClick: cycleDensity, text: m.ui.densityShort(densityPref), children: /* @__PURE__ */ jsx(IconDensity, {}) }),
                /* @__PURE__ */ jsx("span", { className: "af-toolbar__sep" }),
                /* @__PURE__ */ jsx(ToolBtn, { label: m.ui.failureEdges, pressed: showFailure, onClick: () => setShowFailure((v) => !v), children: /* @__PURE__ */ jsx(IconFailureEdges, {}) }),
                /* @__PURE__ */ jsx(ToolBtn, { label: m.ui.implicitFailures, pressed: showImplicit, onClick: () => setShowImplicit((v) => !v), text: "\u2205", children: null }),
                /* @__PURE__ */ jsx(ToolBtn, { label: m.ui.minimap, pressed: showMinimap, onClick: () => setShowMinimap((v) => !v), children: /* @__PURE__ */ jsx(IconMap, {}) }),
                /* @__PURE__ */ jsx(ToolBtn, { label: m.ui.legend, pressed: showLegend, onClick: () => setShowLegend((v) => !v), children: /* @__PURE__ */ jsx(IconLegend, {}) }),
                /* @__PURE__ */ jsx(ToolBtn, { label: m.ui.listView, pressed: showList, onClick: () => setShowList((v) => !v), children: /* @__PURE__ */ jsx(IconList, {}) }),
                /* @__PURE__ */ jsxs("span", { className: "af-export", children: [
                  /* @__PURE__ */ jsx(ToolBtn, { label: m.ui.exportMenu, expanded: exportOpen, onClick: () => setExportOpen((v) => !v), children: /* @__PURE__ */ jsx(IconDownload, {}) }),
                  exportOpen ? /* @__PURE__ */ jsx("span", { className: "af-export__menu", role: "menu", "aria-label": m.ui.exportMenu, children: ["svg", "png", "mermaid"].map((f) => /* @__PURE__ */ jsx("button", { type: "button", role: "menuitem", className: "af-export__item", onClick: () => void doExport(f), children: f === "svg" ? m.ui.exportSvg : f === "png" ? m.ui.exportPng : m.ui.exportMermaid }, f)) }) : null
                ] }),
                /* @__PURE__ */ jsx(ToolBtn, { label: m.ui.help, onClick: openHelp, children: /* @__PURE__ */ jsx(IconKeyboard, {}) })
              ] }) }) : null,
              defaults ? /* @__PURE__ */ jsxs(Panel, { position: "top-left", className: "af-panel af-defaults", title: m.workflowDefaultsHint, children: [
                /* @__PURE__ */ jsx("span", { className: "af-defaults__mark", "aria-hidden": "true", children: "\u24E6" }),
                /* @__PURE__ */ jsx("strong", { children: m.workflowDefaults }),
                [...defaults.successActions, ...defaults.failureActions].map((a) => /* @__PURE__ */ jsxs(
                  "span",
                  {
                    className: `af-defaults__rule af-edge-label af-edge-label--${a.type === "retry" ? "retry" : a.outcome === "failure" ? "failure" : "success"}`,
                    children: [
                      a.type === "retry" ? `\u21BB \xD7${a.retryLimit ?? 1}${a.retryAfter ? ` \xB7 ${a.retryAfter} s` : ""}${a.target ? ` via ${a.target}` : ""}` : `${a.outcome === "failure" ? "\u2717" : "\u2713"} ${a.name}${a.type === "end" ? ` \u2192 ${m.end}` : a.target ? ` \u2192 ${a.target}` : ""}`,
                      a.criteria?.length ? /* @__PURE__ */ jsxs("span", { className: "af-mono", children: [
                        " ",
                        m.if,
                        " ",
                        a.criteria.map((c) => c.condition).join(` ${m.and} `)
                      ] }) : null
                    ]
                  },
                  `${a.outcome}|${a.name}`
                )),
                /* @__PURE__ */ jsx("span", { className: "af-sr-only", children: m.workflowDefaultsHint })
              ] }) : null,
              showLegend ? /* @__PURE__ */ jsx(Panel, { position: "bottom-left", className: "af-panel af-legend-panel", children: /* @__PURE__ */ jsx(Legend, { defaultOpen: props.legendExpanded ?? false, messages: m, kinds: presentKinds }) }) : null,
              vg.nodes.length > HUGE_NODES ? /* @__PURE__ */ jsx(Panel, { position: "bottom-center", className: "af-panel af-notice", role: "note", children: m.largeGraph(vg.nodes.length) }) : null
            ]
          }
        ),
        showList ? /* @__PURE__ */ jsx(ListView, { graph: vg, messages: m, onSelect: (id) => select(store.get().selectedId === id ? null : id), onReveal: reveal }) : null,
        pending && layout ? /* @__PURE__ */ jsx("div", { className: "af-pending", "aria-hidden": "true", children: m.announceLayoutPending }) : null,
        !layout && !layoutError ? /* @__PURE__ */ jsx("div", { className: "af-loading", children: m.announceLayoutPending }) : null,
        layoutError ? /* @__PURE__ */ jsxs("div", { className: "af-loading af-loading--error", role: "alert", children: [
          m.layoutError,
          " ",
          /* @__PURE__ */ jsx("code", { children: layoutError })
        ] }) : null,
        /* @__PURE__ */ jsx("div", { className: "af-sr-only", "aria-live": "polite", role: "status", children: announce }),
        /* @__PURE__ */ jsx(HelpDialog, { dialogRef: helpRef, m, id: ids.help })
      ]
    }
  );
}
function ToolBtn({ label, onClick, pressed, expanded, children, text }) {
  return /* @__PURE__ */ jsxs(
    "button",
    {
      type: "button",
      className: `af-iconbtn${text ? " af-iconbtn--text" : ""}`,
      "aria-label": label,
      title: label,
      "aria-pressed": pressed === void 0 ? void 0 : pressed,
      "aria-expanded": expanded === void 0 ? void 0 : expanded,
      "aria-haspopup": expanded === void 0 ? void 0 : "menu",
      onClick,
      children: [
        children,
        text ? /* @__PURE__ */ jsx("span", { className: "af-iconbtn__text", children: text }) : null
      ]
    }
  );
}
function HelpDialog({ dialogRef, m, id }) {
  const close = () => {
    const d = dialogRef.current;
    if (d && typeof d.close === "function") d.close();
    else d?.removeAttribute("open");
  };
  return /* @__PURE__ */ jsxs("dialog", { ref: dialogRef, className: "af-dialog", "aria-labelledby": id, children: [
    /* @__PURE__ */ jsxs("div", { className: "af-dialog__head", children: [
      /* @__PURE__ */ jsx("h2", { id, children: m.ui.helpTitle }),
      /* @__PURE__ */ jsx("button", { type: "button", className: "af-iconbtn", "aria-label": m.ui.close, onClick: close, children: /* @__PURE__ */ jsx(IconX, {}) })
    ] }),
    /* @__PURE__ */ jsx("p", { className: "af-dialog__note", children: m.ui.helpNote }),
    /* @__PURE__ */ jsx("table", { className: "af-shortcuts", children: /* @__PURE__ */ jsx("tbody", { children: m.ui.shortcuts.map(([k, v]) => /* @__PURE__ */ jsxs("tr", { children: [
      /* @__PURE__ */ jsx("th", { scope: "row", children: /* @__PURE__ */ jsx("kbd", { children: k }) }),
      /* @__PURE__ */ jsx("td", { children: v })
    ] }, k)) }) })
  ] });
}
var ArazzoGraph = forwardRef(function ArazzoGraph2(props, ref) {
  const [store] = useState(createUiStore);
  return /* @__PURE__ */ jsx(UiStoreContext.Provider, { value: store, children: /* @__PURE__ */ jsx(ReactFlowProvider, { children: /* @__PURE__ */ jsx(GraphInner, { ...props, store, apiRef: ref }) }) });
});
function localRefs(g) {
  return g.nodes.filter((n) => n.kind === "workflow-ref" && n.ref && !n.ref.external && n.ref.resolved && !n.ref.stepId).map((n) => n.ref.workflowId);
}
var ArazzoGraphFromDocument = forwardRef(function ArazzoGraphFromDocument2({ doc, workflowId, resolveOperation, includeImplicitFailures = true, expandSubworkflows = true, fallback = null, ...rest }, ref) {
  const built = useMemo(() => {
    const opts = { includeImplicitFailures };
    if (resolveOperation) opts.resolveOperation = resolveOperation;
    try {
      const graph = workflowToGraph(doc, workflowId, opts);
      const subgraphs = {};
      if (expandSubworkflows) {
        for (const wf of localRefs(graph)) {
          if (wf !== workflowId && !subgraphs[wf]) {
            try {
              subgraphs[wf] = workflowToGraph(doc, wf, opts);
            } catch {
            }
          }
        }
      }
      return { graph, subgraphs };
    } catch {
      return null;
    }
  }, [doc, workflowId, resolveOperation, includeImplicitFailures, expandSubworkflows]);
  if (!built) return /* @__PURE__ */ jsx(Fragment, { children: fallback });
  return /* @__PURE__ */ jsx(ArazzoGraph, { ref, ...rest, graph: built.graph, subgraphs: built.subgraphs });
});

// src/openapi.ts
var METHODS = ["get", "put", "post", "delete", "options", "head", "patch", "trace", "query"];
function index(doc) {
  const out = /* @__PURE__ */ new Map();
  for (const [section, entries] of [["paths", doc.paths], ["webhooks", doc.webhooks]]) {
    if (!entries || typeof entries !== "object") continue;
    for (const [p, item] of Object.entries(entries)) {
      if (!item || typeof item !== "object") continue;
      for (const m of METHODS) {
        const op = item[m];
        if (op && typeof op.operationId === "string" && !out.has(op.operationId)) {
          out.set(op.operationId, section === "paths" ? { method: m.toUpperCase(), path: p } : { method: m.toUpperCase(), path: `webhook ${p}` });
        }
      }
    }
  }
  return out;
}
function createOpenApiResolver(sources) {
  const indexes = new Map(Object.entries(sources).map(([name, d]) => [name, index(d ?? {})]));
  return (step, source) => {
    const raw = typeof step.operationId === "string" ? step.operationId : void 0;
    if (!raw) return void 0;
    const m = /^\$sourceDescriptions\.([^.]+)\.(.+)$/.exec(raw);
    const name = m ? m[1] : source?.name;
    const id = m ? m[2] : raw;
    if (name && indexes.has(name)) return indexes.get(name).get(id);
    for (const idx of indexes.values()) {
      const hit = idx.get(id);
      if (hit) return hit;
    }
    return void 0;
  };
}

export { ArazzoGraph, ArazzoGraphFromDocument, EDGE_KINDS, ELK_GROUP_OPTIONS, ELK_NODE_OPTIONS, ELK_ROOT_OPTIONS, HEIGHTS, NODE_WIDTH, PORT_SIDES, ariaLabelFor, buildElkGraph, computeLayout, createOpenApiResolver, dataUrlToBlob, diagnosticsByNode, downloadBlob, edgeLabelText, elkMode, en, exportImage, formatTimeout, fr, nodeSize, operationLabel, prewarmElk, readVsCodeThemeKind, resetElk, resolveTheme, runElk, shortOperationId, structureKey, thoroughnessFor, toMermaid, toViewGraph, visibleGraph };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map