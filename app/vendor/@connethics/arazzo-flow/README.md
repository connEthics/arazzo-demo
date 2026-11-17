# @connethics/arazzo-flow

Graphe React **en lecture seule** d'un workflow [Arazzo](https://spec.openapis.org/arazzo/v1.1.0.html) 1.0.x / 1.1.x, partagé par l'extension *Arazzo for VS Code — by ConnEthics*, *Arazzo Studio by ConnEthics* et le site ConnEthics.

- Entrée : le modèle `{ nodes, edges, groups }` de [`@connethics/arazzo-core`](../arazzo-core) (`workflowToGraph`). Le composant ne lit jamais le YAML.
- Rendu `@xyflow/react` 12 : nœuds sémantiques (HTTP, AsyncAPI `send` / `receive`, sous-workflow, jonction `dependsOn`, entrées, sorties, fins, référence), 10 types d'arêtes à double codage (couleur, motif, glyphe, libellé).
- Layout **ELK layered dans un Web Worker** compatible avec une CSP stricte, avec repli sur le thread principal.
- Minimap, zoom et ajustement, recherche, navigation clavier complète, vue liste synchronisée, légende, export SVG / PNG / Mermaid, dégradé pour les grands graphes.
- **CSS pur**, sans Tailwind : classes `af-*`, variables `--af-*` alimentées par les tokens ConnEthics (`--ce-*`) ou par le thème VS Code de l'utilisateur (`--vscode-*`).

Licence : MIT © 2026 ConnEthics. `dist/elk-worker.js` est une copie de `elkjs/lib/elk-worker.min.js` (EPL-2.0, licence jointe).

Spécification : `arazzo-vscode/specs/002-arazzo-1-1-refonte/design/UI-SPEC.md` (lot D1) ; ce paquet est le lot G1.

## Installation

```jsonc
// package.json (workspace arazzo-demo)
"dependencies": { "@connethics/arazzo-flow": "*" }
```

Peers : `react` et `react-dom` `>=18 <20`, `@xyflow/react` `^12`. Dépendances : `@connethics/arazzo-core`, `elkjs` `^0.11`, `html-to-image` (chargé à la demande, export d'image seulement).

## Démarrage rapide

```tsx
import { parseArazzo, validate } from '@connethics/arazzo-core';
import { ArazzoGraphFromDocument, createOpenApiResolver } from '@connethics/arazzo-flow';
import '@connethics/arazzo-flow/style.css';
import workerUrl from '@connethics/arazzo-flow/elk-worker.js?url'; // Vite ; voir « Worker ELK »

const { doc } = parseArazzo(yamlText);

<div style={{ height: 600 }}>
  <ArazzoGraphFromDocument
    doc={doc}
    workflowId="orderToCash"
    resolveOperation={createOpenApiResolver({ shop: openApiDoc })} // badge GET/POST issu de l'OpenAPI
    diagnostics={validate(doc)}
    theme="auto"
    elk={{ workerUrl }}
    onSelectStep={(stepId, node, info) => …}
    onRevealStep={(stepId, node, info) => vscode.postMessage({ type: 'step-selected', stepId, workflowId: info.workflowId })}
  />
</div>
```

Le conteneur doit avoir une hauteur. Avec un graphe déjà calculé : `<ArazzoGraph graph={workflowToGraph(doc, id)} />`.

## API

### `<ArazzoGraph>`

| Prop | Type | Défaut | Rôle |
|---|---|---|---|
| `graph` | `WorkflowGraph` (core) | — | Sortie de `workflowToGraph(doc, workflowId, opts)`. |
| `theme` | `'auto' \| 'connethics-light' \| 'connethics-dark' \| 'vscode'` | `auto` | Source des couleurs (voir « Thèmes »). |
| `highContrast` | `boolean` | auto | Forcé ; sinon thème VS Code HC ou `forced-colors`. |
| `layout` | `'TB' \| 'LR'` | `TB` | Direction. |
| `lanes` | `'off' \| 'clusters' \| 'lanes'` | `off` | Couloirs par `sourceDescription`. |
| `density` | `'auto' \| 'compact' \| 'standard' \| 'detailed'` | `auto` | `auto` = `compact` au-delà de 50 nœuds. |
| `selectedStepId` | `string \| null` | — | Sélection contrôlée (curseur de l'éditeur → graphe) : `stepId`, id de nœud ou `workflowId/stepId`. |
| `onSelectStep` | `(id, node, info) => void` | — | Clic / Espace. `id` = `stepId` (id de nœud pour les autres nœuds), `node` = nœud de core, `info = { nodeId, workflowId }`. `null` à la désélection. |
| `onRevealStep` | `(id, node, info) => void` | — | Double-clic / Entrée : révéler dans l'éditeur (message VS Code `step-selected`). |
| `onOpenWorkflow` | `(workflowId) => void` | — | Double-clic / Entrée sur une référence de workflow. |
| `onLayout` | `({ ms, mode, nodes, edges, density }) => void` | — | Après chaque layout (`mode` : `worker` ou `main-thread`). |
| `onViewportReady` | `() => void` | — | Après le cadrage initial. |
| `onOptionsChange` | `({ layout, lanes, density }) => void` | — | Changement par la barre d'outils ou le clavier (à persister avec `vscode.setState`). |
| `onExport` | `({ format, filename, blob?, text? }) => void` | — | Reçoit les exports au lieu du téléchargement navigateur (indispensable en webview). |
| `showFailureEdges` / `showImplicitFailures` | `boolean` | `true` / `false` | Arêtes d'échec ; échecs non gérés (si le graphe les contient). |
| `showMinimap` / `showLegend` / `legendExpanded` | `boolean` | `true` / `true` / `false` | |
| `showToolbar` / `showSearch` / `showList` | `boolean` | `true` / `true` / `false` | `showList` : vue liste ouverte au montage. |
| `collapsed` | `Record<groupId, boolean>` | `{}` | Sous-workflows dépliés repliés (`group:<workflowId>`). |
| `diagnostics` | `Diagnostic[]` (core) | — | Pastilles par nœud, rattachées par chemin JSON (`graph.workflowIndex`). |
| `workflowActions` | `'banner' \| 'edges'` | `banner` | Actions de niveau workflow : bandeau + `ⓦ` (D-DEFAULTS) ou arêtes sur chaque étape. |
| `subgraphs` | `Record<workflowId, WorkflowGraph>` | — | Workflows locaux à déplier en groupes repliables. |
| `messages` / `lang` | `Messages` / `'fr' \| 'en'` | `fr` | Libellés, `aria-label`, annonces `aria-live`. |
| `elk` | `ElkConfig` | `{}` | `workerUrl`, `createWorker`, `mode: 'main-thread'`, `timeoutMs`, `engine`. |
| `className`, `style` | | | Sur la racine `.af-root`. |

`ref` (`forwardRef`, React 18 et 19) → `ArazzoGraphApi` : `fitView()`, `focusStep(id)`, `centerOn(id, zoom?)`, `search(query)`, `select(id | null)`, `exportImage('svg' | 'png'): Promise<Blob>`, `toMermaid(): string`.

### `<ArazzoGraphFromDocument>`

Mêmes props que `<ArazzoGraph>` sauf `graph` / `subgraphs`, plus : `doc` (document parsé), `workflowId`, `resolveOperation?` (passé à `workflowToGraph`), `includeImplicitFailures` (défaut `true` : construites, masquées par le bouton `∅`), `expandSubworkflows` (défaut `true` : `retry`/`goto`/étape vers un workflow **local** → groupe dépliable), `fallback` (workflow introuvable).

### Utilitaires exportés

`createOpenApiResolver(sources)` (méthode et chemin depuis les OpenAPI chargés, `operationId` qualifiés ou non) · `toViewGraph`, `diagnosticsByNode`, `visibleGraph` (modèle de rendu) · `computeLayout`, `buildElkGraph`, `structureKey`, `ELK_*_OPTIONS` · `runElk`, `prewarmElk`, `resetElk` · `exportImage`, `toMermaid` (= `graphToMermaid` de core), `downloadBlob`, `dataUrlToBlob` · `resolveTheme`, `readVsCodeThemeKind` · `fr`, `en`.

## Thèmes

Toutes les couleurs sont des variables CSS. Chaîne : `--af-*` (composant) → `--ce-*` (tokens ConnEthics, copiés et résolus dans `style.css`, aucun besoin du `tokens.css` global) **ou** `--af-*` → `--vscode-*` (thème `vscode`). La racine porte `data-af-theme`, `data-af-dark`, `data-contrast="high"`.

| `theme` | Comportement |
|---|---|
| `connethics-light` / `connethics-dark` | Palette ConnEthics (web : démo, site). |
| `auto` | Dans un webview VS Code (`body.vscode-*`) → `vscode`. Sinon ConnEthics clair/sombre selon `[data-theme]` d'un ancêtre, puis `prefers-color-scheme`. |
| `vscode` | **Tout** suit le thème VS Code de l'utilisateur, couleurs sémantiques comprises (décision du 16/11). Changement de thème suivi en direct (`MutationObserver` sur `class` et `data-vscode-theme-kind` du `body`). |

Personnalisation : surcharger les `--af-*` sur `.af-root` (ex. `.af-root { --af-success: #0a0; }`).

### Table du mapping VS Code (`theme="vscode"`)

Repli de chaque variable : le token ConnEthics équivalent (palette sombre si le webview est sombre). Teintes dérivées : `-text` = 78 % teinte + 22 % `--vscode-editor-foreground` ; `-bg` = 14 % teinte sur le fond des widgets. En haut contraste, les `-text` prennent la teinte pure.

| Rôle (`--af-*`) | Variable VS Code (puis repli) |
|---|---|
| canevas `--af-canvas-bg` | `--vscode-editor-background` |
| points du canevas | `--vscode-editorIndentGuide-background1` |
| fond des cartes / panneaux | `--vscode-editorWidget-background` (HC : fond de l'éditeur) |
| bordures | `--vscode-editorWidget-border` → `--vscode-widget-border` → `--vscode-panel-border` ; **HC : `--vscode-contrastBorder`** |
| texte / texte secondaire | `--vscode-editorWidget-foreground` → `--vscode-editor-foreground` / `--vscode-descriptionForeground` |
| focus clavier, recherche | `--vscode-focusBorder` ; **HC : `--vscode-contrastActiveBorder`** |
| sélection | bordure `--vscode-focusBorder` (HC : `--vscode-contrastActiveBorder`), fond 16 % focus (HC : aucun) |
| survol / boutons enfoncés | `--vscode-toolbar-hoverBackground` / `--vscode-inputOption-active{Background,Foreground,Border}` |
| polices | `--vscode-font-family`, `--vscode-editor-font-family` |
| ombres | `--vscode-widget-shadow` (HC : aucune) |
| séquence | `--vscode-descriptionForeground` (HC : avant-plan) |
| **succès** | `--vscode-testing-iconPassed` → `--vscode-charts-green` |
| **échec** | `--vscode-testing-iconFailed` → `--vscode-errorForeground` |
| **retry** | `--vscode-charts-orange` |
| **AsyncAPI send** | `--vscode-charts-purple` |
| **AsyncAPI receive** | `--vscode-terminal-ansiCyan` → `--vscode-charts-purple` |
| étape HTTP | `--vscode-textLink-foreground` → `--vscode-charts-blue` |
| **entrées** / **sorties** | `--vscode-charts-blue` / `--vscode-charts-yellow` |
| sous-workflow, transfert | `--vscode-terminal-ansiMagenta` → `--vscode-charts-purple` |
| `dependsOn`, jonction | `--vscode-terminal-ansiBlue` → `--vscode-charts-blue` |
| fins | `--vscode-foreground` |
| méthodes GET / POST / PUT / PATCH / DELETE | `charts-blue` / `charts-green` / `charts-orange` / `terminal-ansiCyan` / `charts-red` (fond 18 %) |
| diagnostics | `--vscode-editorError/Warning/Info-foreground` |

### Motifs de trait (un par type d'arête)

| Arête | Trait | Variable |
|---|---|---|
| séquence | plein 1,5 px, neutre | — |
| succès (`goto`) | plein 2 px, vert, `✓` | — |
| fin en succès | plein 1,5 px, vert | — |
| échec (`goto`) | `6 4`, 2 px | `--af-dash-failure` |
| fin en échec | `6 4 1 4` (tiret-point) | `--af-dash-end-failure` |
| échec non géré | `1 3`, 1 px, 55 % | `--af-dash-implicit-failure` |
| retry | `2 3 6 3`, flèche ouverte | `--af-dash-retry` |
| `dependsOn` | `0.5 4.5` points ronds, marqueur cercle | `--af-dash-depends-on` |
| transfert (`goto workflowId`) | `10 4` | `--af-dash-transfer` |
| appel de workflow | double trait, losange à la source | — |

Le conflit `dependsOn` / échec (`6 4` tous deux) est corrigé ici et dans les tokens de marque (`brand/tokens.css`, `tokens.json`, `--ce-graph-dash-*`, voir `BRAND.md` §2.2). `src/styles/theme-connethics.css` est **généré** : `node scripts/gen-theme.mjs <arazzo-vscode>/specs/002-arazzo-1-1-refonte/brand/tokens.css`.

## Worker ELK et CSP

ELK (1,5 Mo) n'est jamais dans le bundle principal : il tourne dans `dist/elk-worker.js` (script *classic*). Ordre de résolution :

1. `elk.createWorker: () => Worker` : fabrique fournie par l'hôte ;
2. `elk.workerUrl` : URL du fichier servi par l'hôte. Si le navigateur refuse un worker d'une autre origine (cas des ressources d'un webview VS Code), le script est récupéré par `fetch` puis lancé depuis une URL `blob:` ;
3. défaut : `new URL('./elk-worker.js', import.meta.url)` (fichier voisin dans `dist/`) ;
4. **repli** : erreur du worker, délai dépassé (8 s), pas de `Worker`, ou `elk.mode: 'main-thread'` → même code ELK sur le thread principal, via `import('elkjs/lib/elk-worker.min.js')` (chunk à la demande). Aucun `eval` ni `new Function`.

`prewarmElk(elk)` démarre le worker à l'ouverture du panneau (le composant l'appelle au montage).

**Webview VS Code** (CSP avec nonce) :

```ts
// extension host
const workerUri = webview.asWebviewUri(vscode.Uri.joinPath(ctx.extensionUri, 'webview-ui/build/elk-worker.js'));
// <meta http-equiv="Content-Security-Policy" content="
//   default-src 'none';
//   script-src 'nonce-${nonce}';
//   style-src ${webview.cspSource} 'unsafe-inline';
//   img-src ${webview.cspSource} data: blob:;
//   font-src ${webview.cspSource};
//   connect-src ${webview.cspSource};
//   worker-src blob: ${webview.cspSource};">
```

```tsx
// webview : workerUri transmis par l'hôte
<ArazzoGraph graph={g} theme="vscode" elk={{ workerUrl: workerUri }} onExport={(e) => vscode.postMessage({ type: 'export', ...e })} />
```

- `worker-src blob:` : nécessaire pour le chemin `fetch` → `blob:` (le webview et ses ressources ne partagent pas la même origine) et pour un `createWorker` à base de Blob. `connect-src ${webview.cspSource}` autorise ce `fetch`.
- `style-src 'unsafe-inline'` : React Flow positionne nœuds et arêtes par attributs `style` (inévitable avec xyflow).
- `img-src data:` : uniquement pour l'export PNG (`html-to-image` dessine un SVG `data:` sur un canvas).
- Sans aucune de ces directives, le graphe fonctionne quand même (repli sur le thread principal), seulement plus lentement au premier layout.

Web (Vite) : `import workerUrl from '@connethics/arazzo-flow/elk-worker.js?url'`, ou `optimizeDeps.exclude: ['@connethics/arazzo-flow']` pour laisser jouer le défaut `import.meta.url`. Webpack 5 : le défaut fonctionne tel quel.

## Clavier et accessibilité

Canevas `role="application"`, nœuds focusables dans l'ordre du document, `aria-label` composé par nœud (FR/EN), annonces `aria-live`. `Tab` / `Maj+Tab`, `↓ ↑ ← →`, `Alt+↓` (suivre l'échec), `Entrée` (révéler), `Espace` (sélectionner), `Échap`, `+ - 0 1`, `F` (mode focus), `/` (recherche ; `Ctrl/Cmd+F` sur le web), `[ ]` (replier / déplier), `E`, `L`, `D`, `M`, `V` (vue liste), `?` (aide). Raccourcis actifs uniquement quand le graphe a le focus. La **vue liste** est l'alternative textuelle complète, synchronisée avec la sélection.

## Grands graphes

> 50 nœuds : densité compacte (mode `auto`). Si l'ajustement donne un zoom < 30 %, la vue initiale cadre le début à 75 % (`1` = tout voir). > 150 nœuds : `onlyRenderVisibleElements`, libellés d'arêtes masqués sous 60 % de zoom. > 300 nœuds : bandeau « graphe volumineux ». Niveaux de détail au zoom : pastille sous 45 %, rectangle sous 25 %. `thoroughness` ELK 7 jusqu'à 30 nœuds, 4 au-delà.

Mesuré (Chromium headless, `demo/screenshots.mjs`) : 100 étapes synthétiques (102 nœuds, 123 arêtes), layout worker 268 ms à froid ; **pan à 60 fps** (frame p95 16,7 ms). Exemples E1 : 130 – 320 ms à froid, worker compris.

## Taille du bundle

Mesurée par `npm run size` (esbuild, minifié, gzip ; React exclu) :

| Contenu | min | gzip |
|---|---|---|
| `dist/index.js` seul (dépendances externes) | 81 Ko | 27 Ko |
| + `@xyflow/react` + `elk-api` + parties utilisées de core | 280 Ko | **93 Ko** (budget UI-SPEC ≤ 120 Ko) |
| `html-to-image` (chunk à la demande, export) | 13 Ko | 5 Ko |
| `dist/style.css` (xyflow base + 2 palettes + mapping VS Code) | 64 Ko | 10 Ko |
| `dist/elk-worker.js` (worker, hors bundle) | 1,56 Mo | 455 Ko |

## Développement

```bash
npm install                                   # racine arazzo-demo (workspaces)
npm run build -w packages/arazzo-core
npm run build -w packages/arazzo-flow         # tsup (ESM + .d.ts) + style.css + elk-worker.js
npm test -w packages/arazzo-flow              # tsc + Vitest (Node + jsdom)
cd packages/arazzo-flow
npm run demo                                  # démo Vite sur app/public/workflows
npm run demo:build && npm run shots           # captures Playwright → demo/screenshots/
npm run size
```

Tests (`test/`) : `adapt` (core → modèle de rendu, tous les types de nœuds et d'arêtes, ports, actions de workflow, sous-workflows, diagnostics), `layout` (ELK réel en Node sur pet-adoption : placement sans chevauchement, routage, déterminisme, LR, couloirs ; layout de tous les exemples E1), `render` (jsdom, ELK mocké : rendu de chaque type, sélection, clavier, recherche, barre d'outils, thèmes, `ArazzoGraphFromDocument`), `elk-client` (worker par URL, fabrique, défaut, replis erreur / délai / sans Worker), `css-export` (pas de Tailwind, classes `af-`, motifs distincts, mapping VS Code, Mermaid, résolveur OpenAPI).

Démo : `?example=e2e-order-to-cash&theme=light|dark|vscode-light|vscode-dark|vscode-hc&lang=en&lanes=lanes&dir=LR&density=detailed&select=<stepId>&legend=1&list=1`, plus `example=large-100`. Les thèmes `vscode-*` posent les classes `body.vscode-*` et des variables `--vscode-*` simulées (valeurs Light+, Dark+, High Contrast).

## Écarts connus par rapport à UI-SPEC

- **Modèle** : core est la référence (§2). Identifiants `step:<stepId>`, `input`, `output`, `end-failure`, `join:<stepId>`, `ref:<workflowId>`, `group:<wf>/step:<id>` au lieu de `<workflowId>/<stepId>` ; `selectedStepId` accepte les trois formes. Séquence implicite selon core : supprimée seulement si l'étape suivante dépend (`dependsOn`) de la précédente, ce qui est plus restrictif que M3 (ex. order-to-cash : `createInvoice → createShipment` garde une séquence). M2 (séquence absorbée par un succès conditionnel) non appliqué. Pas de `methodSource: 'inferred'` (heuristique supprimée, D-INFER).
- **Thème VS Code** : le composant référence directement `--vscode-*` (UI-SPEC §9 passait par le pont de `tokens.css`) car les couleurs sémantiques doivent suivre le thème (décision du 16/11), alors que le pont B1 les garde à la marque.
- Couloirs : post-traitement + routage de repli (D-LANES), sans second passage ELK ni en-têtes collants.
- Non livré : tooltip riche partagé (titres natifs), animation de repli, fil d'Ariane, vue multi-workflows, superposition d'états d'exécution (`status`).
