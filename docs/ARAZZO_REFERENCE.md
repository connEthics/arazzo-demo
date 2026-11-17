# Référence Arazzo — Arazzo Studio by ConnEthics

## Vue d'ensemble

**Arazzo** est le standard de l'OpenAPI Initiative pour décrire des **workflows d'API** : des séquences d'appels,
les flux de données entre étapes, des critères de succès, des branchements, des retries et la gestion des échecs.

Ce dépôt contient trois éléments :
- **Arazzo Studio by ConnEthics**, l'application web (visualiseur et builder) publiée sur https://arazzo.connethics.com ;
- les paquets partagés `@connethics/arazzo-core` et `@connethics/arazzo-flow` ;
- des **exemples Arazzo 1.1.0** concrets, dont des outils MCP et des tests E2E exécutables.

Pour les assistants de code IA, le guide de référence est [`arazzo.skill.md`](../arazzo.skill.md), en anglais. Il est
téléchargeable depuis le Studio (`/arazzo.skill.md`).

### Versions de la spécification

| | |
|---|---|
| Version courante | **Arazzo 1.1.0**, publiée le 17/05/2026 : https://spec.openapis.org/arazzo/v1.1.0.html |
| Schéma JSON 1.1 | `https://spec.openapis.org/arazzo/1.1/schema/2026-04-15`, qui n'accepte que `arazzo: 1.1.x` |
| Schéma JSON 1.0 | `https://spec.openapis.org/arazzo/1.0/schema/2025-10-15`, qui n'accepte que `arazzo: 1.0.x` |
| Rétrocompatibilité | Un document 1.0.x reste un document 1.0.x valide. Le schéma se choisit selon la valeur de `arazzo` |
| Hors 1.1 (roadmap OAI) | Types d'étape MCP, A2A, gRPC et GraphQL, boucles, fonctions, humain dans la boucle |

Analyse détaillée champ par champ : `arazzo-vscode/specs/002-arazzo-1-1-refonte/research/01-spec-delta-1.1.md`.

### Nouveautés 1.1 en bref

| Nouveauté | Syntaxe | Remarque |
|---|---|---|
| Sources AsyncAPI | `sourceDescriptions[].type: asyncapi` | AsyncAPI 3.0 |
| Étape asynchrone | `channelPath: '{$sourceDescriptions.events.url}#/channels/x'` ou `operationId`, avec `action: send` ou `receive` | `action` est obligatoire sur une étape AsyncAPI et interdit ailleurs |
| Corrélation | `correlationId: $steps.createOrder.outputs.orderId` | Uniquement avec `receive` |
| Délai | `timeout: 6000` | Entier, en **millisecondes**, sur n'importe quelle étape |
| Jonction | `dependsOn: [stepA, stepB]` au niveau de l'étape | Formes admises : `stepId`, `$workflows.<w>.steps.<s>` et `$sourceDescriptions.<src>.<w>.steps.<s>`. Ne déclenche pas l'étape visée |
| Réutilisation de workflow | `retry` ou `goto` avec `workflowId` et `parameters` (sans `in`) | Pour `retry`, le workflow est exécuté, puis l'étape est rejouée |
| Selector Object | `{context, selector, type}` (`jsonpath`, `xpath`, `jsonpointer`) | Dans `outputs`, `Parameter.value`, `payload` et `replacements[].value` |
| Expression Type Object | `{type: jsonpath, version: rfc9535}`, `xpath-31`, `jsonpointer` / `rfc6901` | Remplace le *Criterion Expression Type Object* de la 1.0 |
| Query string complète | `in: querystring` | Exclusif des paramètres `query` de la même opération |
| Identité du document | `$self` à la racine, et l'expression `$self` | URI-reference sans fragment, qui sert d'URI de base |
| Messages | `$message.header.x`, `$message.payload#/ptr` | Réservés aux étapes AsyncAPI |
| Sémantique | Valeurs truthy/falsy par type de critère, grammaire ABNF des expressions réécrite | `null` vaut faux, et toute erreur d'évaluation fait échouer le critère |

---

## Structure du projet

```
arazzo-demo/
├── app/                         # Arazzo Studio (Next.js 16, React 19, Tailwind 4), installé à part
│   ├── src/
│   │   ├── app/                 # App Router : / (landing), /builder, /showcase
│   │   ├── components/          # Composants React
│   │   │   ├── arazzo/          # Composants Arazzo (MIT) : ActionList, StepBody, WorkflowList…
│   │   │   ├── nodes/           # Nœuds React Flow (InputNode, StepNode, UnifiedStepNode, OutputNode)
│   │   │   ├── primitives/      # Design system (Badge, Card, CodeBlock…)
│   │   │   ├── ArazzoFlow.tsx   # Vue interactive (React Flow + ELK.js)
│   │   │   └── …                # MermaidDiagram, Inspector, StepInspector, ComplianceMatrix…
│   │   ├── features/builder/    # Builder : context (reducer), components, actions, utils
│   │   ├── lib/                 # arazzo-parser, mermaid-converter, swimlane-converter, arazzo-utils
│   │   ├── types/arazzo.ts      # Types de l'app (encore 1.0.1, voir « Migration en cours »)
│   │   └── __tests__/           # Tests Jest (rendering, spec-compliance 1.0.1)
│   └── public/
│       ├── arazzo.skill.md      # Copie identique du skill file racine (téléchargement)
│       ├── openapi/             # Sources OpenAPI des exemples historiques
│       └── workflows/           # Exemples Arazzo 1.1.0 (voir « Exemples »)
├── packages/                    # npm workspaces, licence MIT
│   ├── arazzo-core/             # @connethics/arazzo-core : types, parsing, validation, graphe
│   └── arazzo-flow/             # @connethics/arazzo-flow : composant <ArazzoGraph> (en cours)
├── scripts/sync-shared.mjs      # Copie vérifiée (SHA-256) des dist/ vers arazzo-vscode et website
├── docs/                        # Ce fichier, BUILDER_SPEC.md, ARCHITECTURE_FRONT.md
└── arazzo.skill.md              # Guide Arazzo 1.1 pour assistants IA (anglais)
```

---

## Paquets partagés

### `@connethics/arazzo-core` (`packages/arazzo-core`)

Ce paquet TypeScript n'a aucune dépendance UI ni Node. Il tourne dans Node ≥ 18, dans un navigateur et dans un webview
VS Code. Sa seule dépendance d'exécution est `yaml` v2.

- **Types 1.1 complets** : AsyncAPI, `dependsOn`, Selector, Expression Type, `$self`, `querystring`, extensions `x-`.
  Ce sont eux qui font foi pour la 1.1.
- **Parsing** YAML/JSON avec les positions dans la source (`parseArazzo`, `locate`, `diagnosticRange`).
- **Validation en deux couches** :
  1. les schémas JSON **officiels** 1.0 et 1.1, compilés avec Ajv 2020-12 en mode *standalone*, donc compatibles avec
     une CSP stricte ;
  2. des **règles sémantiques**, issues de la table §c de R1. Chacune a un code (`arazzo-step-target-exclusive`,
     `arazzo-step-depends-on-cycle`…), un chemin JSON et une sévérité, sans doublon.
- **Modèle de graphe** indépendant du moteur de rendu (`workflowToGraph`). Les nœuds sont typés : HTTP, `send`,
  `receive`, sous-workflow, jonction, entrée, sortie et fins. Les arêtes aussi : séquence, goto, retry, `dependsOn`,
  appel de workflow. Il y a un couloir par source. L'export **Mermaid** se fait avec `graphToMermaid`.

```ts
import { validateText, workflowToGraph, graphToMermaid } from '@connethics/arazzo-core';

const { doc, errors, diagnostics } = validateText(yamlText);
for (const d of diagnostics) console.log(`${d.severity} ${d.code} ${d.path.join('.')} — ${d.message}`);

const graph = workflowToGraph(doc, 'orderToCash');
console.log(graphToMermaid(graph, { lanes: true }));
```

```bash
npm install                              # à la racine d'arazzo-demo
npm run build -w packages/arazzo-core    # génération des validateurs + tsup (ESM, CJS, .d.ts)
npm test -w packages/arazzo-core         # Vitest : règles, corpus, fixtures vscode, exemples E1
node scripts/sync-shared.mjs arazzo-core ../arazzo-vscode   # vendoring (vérifiable avec --check)
```

La documentation complète (API, liste des règles, décisions sur les questions ouvertes) est dans
[`packages/arazzo-core/README.md`](../packages/arazzo-core/README.md). La publication sur npm sous le scope
`@connethics` est prévue.

### `@connethics/arazzo-flow` (`packages/arazzo-flow`, en cours)

Ce paquet fournira le composant de graphe partagé `<ArazzoGraph>` : React 18/19, `@xyflow/react` 12, et ELK.js dans un
Web Worker. Il sera en lecture seule, avec sélection et callbacks.

```tsx
<ArazzoGraph graph theme onSelectStep selectedStepId layout="TB|LR" lanes />
```

- Le style reposera sur des **variables CSS**, sans Tailwind. Il sera thémable par les tokens ConnEthics sur le web et
  par les variables `--vscode-*` dans l'extension.
- Il remplacera `ArazzoFlow.tsx` dans le Studio (lot A1) et le diagramme Mermaid de l'extension VS Code (lot V2).
- Mermaid ne servira plus qu'à l'export.

---

## Architecture et patterns du Studio

### 1. State management

Le builder suit un **pattern reducer**, avec `BuilderContext` (`features/builder/context/BuilderContext.tsx`) :

```typescript
interface BuilderState {
  spec: ArazzoSpec;                         // Spécification complète
  selectedStepId: string | null;
  selectedComponentKey: string | null;      // Composant réutilisable sélectionné
  selectedNodeType: SelectedNodeType;       // step | input | output | …
  selectedWorkflowIndex: number;            // Workflow actif
  sources: Record<string, any>;             // Sources OpenAPI parsées
  needsAutoLayout: boolean;                 // Auto-layout à déclencher après chargement
  lastModifiedPath?: (string | number)[];   // Surlignage YAML de la dernière modification
}
```

Les actions du reducer (`features/builder/types/builder.ts`) se répartissent ainsi :
- **chargement** : `LOAD_SPEC`, `LOAD_SAMPLE`, `ADD_SOURCE` ;
- **workflows** : `ADD_WORKFLOW`, `RENAME_WORKFLOW` (avec mise à jour des références), `DELETE_WORKFLOW`,
  `UPDATE_WORKFLOW`, `SET_WORKFLOW_INDEX` ;
- **étapes** : `ADD_STEP`, `UPDATE_STEP`, `DELETE_STEP`, `INSERT_STEP_ON_EDGE`, `REORDER_STEP` ;
- **liens** : `ADD_CONNECTION` et `DELETE_CONNECTION` (goto) ;
- **composants** : `UPDATE_COMPONENTS`, `DELETE_COMPONENT` ;
- **entrées et sorties** : `REORDER_INPUT`, `REORDER_OUTPUT` ;
- **sélection** : `SELECT_STEP`, `SELECT_NODE`, `CLEAR_AUTO_LAYOUT`.

### 2. Single Source of Truth

L'interface est une **projection réactive** de la spécification. Toute modification passe par le modèle :
`Action → Reducer → State → UI`.

Par exemple, quand l'utilisateur renomme un `stepId` dans l'inspecteur, le reducer met à jour l'identifiant **et**
toutes ses références (`onSuccess`, `onFailure`, `$steps.xxx`). Le canvas React Flow et l'éditeur YAML se rafraîchissent
ensuite.

### 3. Canvas as a projection

Le canvas n'est pas l'état source. Il est recalculé par `lib/arazzo-parser.ts` :

```typescript
workflowToFlow(spec: ArazzoSpec, workflowId: string, options?: { hideErrorFlows?: boolean }): { nodes: Node[]; edges: Edge[] }
```

Cible : `workflowToGraph` (core) suivi de `<ArazzoGraph>` (flow), avec un auto-layout ELK dans `BuilderCanvas.tsx`.

### 4. Architecture par fonctionnalités

- `features/builder/` : la logique du builder ;
- `components/arazzo/` : les composants Arazzo réutilisables (MIT) ;
- `components/primitives/` : le design system ;
- `lib/` : les parsers et convertisseurs.

### Migration en cours (lot A1)

Le Studio utilise encore ses propres types (`app/src/types/arazzo.ts`, basés sur la 1.0.1) et son parser
(`lib/arazzo-parser.ts`). La migration prévoit plusieurs étapes :
- remplacer les types et le parser par `@connethics/arazzo-core`, avec les diagnostics affichés dans le builder ;
- remplacer `ArazzoFlow` par `<ArazzoGraph>` ;
- ajouter les champs 1.1 dans l'inspecteur : `channelPath`, `action`, `correlationId`, `timeout`, `dependsOn` et Selector ;
- ajouter une galerie des exemples 1.1 ;
- ajouter une matrice de conformité 1.1 (`ComplianceMatrix.tsx` et `__tests__/spec-compliance/1.1.0-*`).

En attendant, **le builder n'affiche pas encore les constructions 1.1** : Selector, étapes AsyncAPI, `dependsOn`
d'étape. Pour valider un document 1.1, il faut utiliser `@connethics/arazzo-core` ou `npx @redocly/cli@2.79.0 lint`.

---

## Types Arazzo 1.1 essentiels

Ces types sont extraits de `packages/arazzo-core/src/types.ts` (simplifiés : les extensions `x-` sont omises).

```typescript
interface ArazzoDocument {
  arazzo: string;                          // '1.1.0'
  $self?: string;                          // 1.1 : URI canonique, sans fragment
  info: { title: string; version: string; summary?: string; description?: string };
  sourceDescriptions: SourceDescription[]; // au moins 1
  workflows: Workflow[];                   // au moins 1
  components?: Components;
}

interface SourceDescription {
  name: string;                            // unique, [A-Za-z0-9_-]+
  url: string;
  type?: 'openapi' | 'asyncapi' | 'arazzo';  // asyncapi : 1.1
}

interface Workflow {
  workflowId: string;
  summary?: string;
  description?: string;
  inputs?: JsonSchema;
  dependsOn?: string[];                    // workflowIds, ou $sourceDescriptions.<src>.<wf>
  steps: Step[];                           // au moins 1
  successActions?: (SuccessAction | ReusableObject)[];
  failureActions?: (FailureAction | ReusableObject)[];
  outputs?: Record<string, string | Selector>;   // Selector : 1.1
  parameters?: (Parameter | ReusableObject)[];
}

interface Step {
  stepId: string;
  description?: string;
  // exactement une cible :
  operationId?: string;                    // OpenAPI ou AsyncAPI
  operationPath?: string;                  // OpenAPI uniquement
  channelPath?: string;                    // 1.1, AsyncAPI
  workflowId?: string;
  action?: 'send' | 'receive';             // 1.1, obligatoire pour AsyncAPI
  correlationId?: string;                  // 1.1, receive uniquement
  timeout?: number;                        // 1.1, millisecondes
  dependsOn?: string[];                    // 1.1
  parameters?: (Parameter | ReusableObject)[];
  requestBody?: RequestBody;
  successCriteria?: Criterion[];
  onSuccess?: (SuccessAction | ReusableObject)[];
  onFailure?: (FailureAction | ReusableObject)[];
  outputs?: Record<string, string | Selector>;
}

interface Parameter {
  name: string;
  in?: 'path' | 'query' | 'querystring' | 'header' | 'cookie' | 'channel';  // absent si la cible est un workflow
  value: unknown;                          // littéral, expression, chaîne {…} ou Selector
}

interface FailureAction {                  // SuccessAction : mêmes champs, sans retryAfter ni retryLimit
  name: string;                            // obligatoire
  type: 'end' | 'goto' | 'retry';
  stepId?: string;                         // exclusif de workflowId
  workflowId?: string;
  parameters?: Omit<Parameter, 'in'>[];    // 1.1, uniquement avec workflowId
  retryAfter?: number;                     // secondes
  retryLimit?: number;
  criteria?: Criterion[];
}

interface Criterion {
  condition: string;
  context?: string;                        // obligatoire si type est présent
  type?: 'simple' | 'regex' | 'jsonpath' | 'xpath' | ExpressionType;
}

interface Selector {                       // 1.1
  context: string;                         // expression vers des données structurées
  selector: string;
  type: 'jsonpath' | 'xpath' | 'jsonpointer' | ExpressionType;
}

type ExpressionType =                      // 1.1
  | { type: 'jsonpath'; version: 'rfc9535' | 'draft-goessner-dispatch-jsonpath-00' }
  | { type: 'xpath'; version: 'xpath-31' | 'xpath-30' | 'xpath-20' | 'xpath-10' }
  | { type: 'jsonpointer'; version: 'rfc6901' };
```

---

## Expressions Arazzo

### Variables de contexte

| Expression | Description | Exemple |
|------------|-------------|---------|
| `$statusCode` | Code HTTP de la réponse | `$statusCode == 200` |
| `$url`, `$method` | URL et méthode de l'appel | `$method == 'GET'` |
| `$request.header.<nom>`, `.query.<nom>`, `.path.<nom>`, `.body#/<ptr>` | Requête envoyée | `$request.header.X-Request-Id` |
| `$response.header.<nom>`, `$response.body`, `$response.body#/<ptr>` | Réponse reçue | `$response.body#/id` |
| `$message.header.<nom>`, `$message.payload#/<ptr>` | **1.1**, message AsyncAPI | `$message.payload#/status` |
| `$self` | **1.1**, URI canonique du document | `$self` |

### Références de données

| Expression | Description | Exemple |
|------------|-------------|---------|
| `$inputs.<nom>` | Entrée du workflow courant | `$inputs.userId` |
| `$outputs.<nom>` | Sortie du workflow courant (dans une étape `workflowId` : du workflow appelé) | `$outputs.accountId` |
| `$steps.<stepId>.outputs.<nom>` | Sortie **déclarée** d'une étape du même workflow | `$steps.login.outputs.token` |
| `$workflows.<id>.inputs.<nom>` / `.outputs.<nom>` | Autre workflow du document | `$workflows.auth.outputs.session` |
| `$sourceDescriptions.<nom>.<ref>` | ID d'opération ou de workflow, ou champ de la source (`url`) | `$sourceDescriptions.petstore.url` |
| `$components.parameters\|successActions\|failureActions.<clé>` | Objets réutilisables | `$components.failureActions.retry503` |

Pièges fréquents :
- `$steps.x.response…` et `$steps.x.request…` **n'existent pas**. Il faut déclarer une sortie dans l'étape `x`.
- `$response.body.a.b` sort de la grammaire 1.1. On écrit `$response.body#/a/b`, et core émet un avertissement.
- `$components.inputs` n'existe pas. Les entrées réutilisables passent par `$ref: '#/components/inputs/<clé>'`.
- L'interpolation dans une chaîne s'écrit `Bearer {$steps.login.outputs.token}`.

### Exemples d'expressions

```yaml
successCriteria:
  - condition: $statusCode == 200
  - condition: $response.body#/status == 'approved'
  - context: $response.header.Location
    condition: '^https://'
    type: regex

parameters:
  - name: petId
    in: path
    value: $steps.findPets.outputs.firstPetId
  - name: Authorization
    in: header
    value: Bearer {$steps.login.outputs.token}

outputs:
  adoptionId: $response.body#/id
  confirmationUrl: $response.header.Location
```

**Portabilité des critères.** Seule la forme `simple` + JSON Pointer donne le même résultat sur tous les runners. Les
critères JSONPath divergent : Respect enveloppe la racine, alors que les runners stricts RFC 9535 ne le font pas.

---

## Composants clés du Studio

### 1. Primitives (`components/primitives/`)

| Composant | Description | Props principales |
|-----------|-------------|-------------------|
| `Badge` | Badge coloré avec plus de 20 variants | `variant`, `size`, `isDark` |
| `Card` | Conteneur avec bordure et ombre | `title`, `collapsible`, `isDark` |
| `CodeBlock` | Affichage de code avec copie | `code`, `language`, `title` |
| `PropertyList` | Liste clé-valeur | `properties`, `compact` |
| `CollapsibleSection` | Section repliable | `title`, `defaultOpen`, `badge` |
| `EditableField` | Champ éditable en ligne | `value`, `onSave`, `placeholder` |

### 2. Composants Arazzo (`components/arazzo/`, MIT)

`ActionList`, `ArazzoSpecHeader`, `CriterionBadge`, `DependsOnList`, `PayloadReplacements`, `ReusableRef`,
`SchemaViewer`, `SourceDescriptionsList`, `StepBody`, `StepHeader`, `WorkflowBody`, `WorkflowHeader`, `WorkflowList`.

### 3. Composants du builder (`features/builder/components/`)

| Composant | Description |
|-----------|-------------|
| `BuilderCanvas` | Canvas React Flow (auto-layout ELK prévu au lot A1) |
| `OperationsToolbox` | Liste des opérations, déplaçables par glisser-déposer |
| `YamlEditor` / `YamlFullscreen` | Éditeur Monaco (import dynamique) |
| `SourceManagerV2` | Chargement des fichiers Arazzo et OpenAPI |
| `WorkflowManager` | Sélection et création de workflows |
| `StepInspector`, `WorkflowInputInspector`, `WorkflowOutputInspector` | Édition d'une étape, des entrées et des sorties |
| `ExpressionAutocomplete` | Autocomplétion des expressions |

### 4. Nœuds React Flow (`components/nodes/`)

| Nœud | Description | Couleur actuelle |
|------|-------------|------------------|
| `InputNode` | Point d'entrée du workflow | Vert émeraude |
| `StepNode` / `UnifiedStepNode` | Étape, avec ports et badges | Bleu indigo |
| `OutputNode` | Sorties du workflow | Violet |

Le nouveau graphe (`arazzo-flow`) reprendra cette sémantique avec les tokens de marque ConnEthics : bleu `#2563eb`,
orange `#f97316` et neutres slate, plus une palette sémantique pour succès, échec, retry, async, entrée et sortie.
Dans VS Code, les couleurs suivront le thème de l'éditeur.

---

## Sémantique visuelle actuelle

| Type | Couleur | Tailwind | Signification |
|------|---------|----------|---------------|
| **Input** | Vert émeraude | `emerald-500` | Entrées du workflow |
| **Step** | Bleu indigo | `indigo-500` | Étape exécutée |
| **Output** | Violet | `violet-500` | Sorties finales |
| **Success** | Vert | `green-500` | Action `onSuccess` |
| **Failure** | Rouge | `red-500` | Action `onFailure` |
| **Workflow** | Cyan | `cyan-500` | Référence de workflow |

| Arête | Style | Couleur | Signification |
|------|-------|---------|---------------|
| `success` | Solide | Vert | Flux normal |
| `failure` | Solide | Rouge | Flux d'erreur |
| `data` | Pointillé | Violet | Dépendance de données |

Le badge de méthode HTTP est aujourd'hui **deviné** depuis l'`operationId` (`extractHttpMethod`). Le modèle de graphe
de core lit la méthode dans l'`operationPath` ou dans l'OpenAPI résolu, et ne la devine jamais.

---

## Opérations courantes

### 1. Charger une spécification

```typescript
import { parseArazzoSpec } from '@/lib/arazzo-parser';

const yamlContent = await fetch('/workflows/pet-adoption.arazzo.yaml').then(r => r.text());
const spec = parseArazzoSpec(yamlContent);
dispatch({ type: 'LOAD_SPEC', payload: spec });
```

### 2. Valider un document (1.0.x ou 1.1.x)

```typescript
import { validateText } from '@connethics/arazzo-core';

const { diagnostics } = validateText(yamlContent);
const errors = diagnostics.filter(d => d.severity === 'error');
```

### 3. Ajouter une étape

```typescript
const newStep: Step = {
  stepId: 'findPets',
  operationId: '$sourceDescriptions.petstore.findPetsByStatus',
  parameters: [{ name: 'status', in: 'query', value: 'available' }],
  successCriteria: [{ condition: '$statusCode == 200' }],
  outputs: { pets: '$response.body' },
};

dispatch({ type: 'ADD_STEP', payload: { step: newStep, position: { x: 0, y: 0 } } });
```

### 4. Créer un lien goto

```typescript
dispatch({ type: 'ADD_CONNECTION', payload: { sourceStepId: 'findPets', targetStepId: 'selectPet' } });
// équivaut à onSuccess: [{ name: …, type: 'goto', stepId: 'selectPet' }]
```

### 5. Générer un diagramme Mermaid

```typescript
import { workflowToMermaidFlowchart, workflowToMermaidSequence } from '@/lib/mermaid-converter';
import { workflowToSwimlaneDiagram } from '@/lib/swimlane-converter';

const flowchart = workflowToMermaidFlowchart(spec, 'adopt-pet', { direction: 'TB' });
const sequence = workflowToMermaidSequence(spec, 'adopt-pet');
const swimlane = workflowToSwimlaneDiagram(spec, 'adopt-pet');

// Équivalent core, qui gère les constructions 1.1 :
import { workflowToGraph, graphToMermaid } from '@connethics/arazzo-core';
const mermaid = graphToMermaid(workflowToGraph(spec, 'adopt-pet'), { lanes: true });
```

---

## Exemples de workflow

### Exemple minimal (1.1.0)

```yaml
arazzo: 1.1.0
$self: https://arazzo.connethics.com/workflows/find-pets.arazzo.yaml
info:
  title: Simple Workflow
  version: 1.0.0
sourceDescriptions:
  - name: petstore
    type: openapi
    url: ../openapi/petstore.yaml
workflows:
  - workflowId: findPets
    summary: Find available pets
    steps:
      - stepId: getPets
        operationId: $sourceDescriptions.petstore.findPetsByStatus
        parameters:
          - name: status
            in: query
            value: available
        successCriteria:
          - condition: $statusCode == 200
        outputs:
          pets: $response.body
          firstPetId: $response.body#/0/id
    outputs:
      firstPetId: $steps.getPets.outputs.firstPetId
```

### Exemple 1.1 : HTTP, puis événement AsyncAPI, puis jonction

```yaml
arazzo: 1.1.0
$self: https://arazzo.connethics.com/workflows/order-demo.arazzo.yaml
info:
  title: Commande avec confirmation asynchrone
  version: 1.0.0
sourceDescriptions:
  - name: commerce
    url: ./openapi.yaml
    type: openapi
  - name: orderEvents
    url: ./asyncapi.yaml
    type: asyncapi
workflows:
  - workflowId: orderToInvoice
    inputs:
      type: object
      required: [customerId, sku]
      properties:
        customerId: { type: string }
        sku: { type: string }
    steps:
      - stepId: createOrder
        operationId: $sourceDescriptions.commerce.createOrder
        requestBody:
          contentType: application/json
          payload:
            customerId: $inputs.customerId
            sku: $inputs.sku
        successCriteria:
          - condition: $statusCode == 201
          - condition: $response.body#/status == 'pending'
        onFailure:
          - name: retryWhenBusy
            type: retry
            retryAfter: 2
            retryLimit: 3
            criteria:
              - condition: $statusCode == 503
          - name: abandon
            type: end
        outputs:
          orderId: $response.body#/id
      - stepId: awaitConfirmation
        operationId: $sourceDescriptions.orderEvents.receiveOrderConfirmed
        action: receive
        correlationId: $steps.createOrder.outputs.orderId
        timeout: 6000
        successCriteria:
          - condition: $message.payload#/status == 'confirmed'
      - stepId: createInvoice
        operationId: $sourceDescriptions.commerce.createInvoice
        dependsOn: [awaitConfirmation]
        requestBody:
          contentType: application/json
          payload:
            orderId: $steps.createOrder.outputs.orderId
        successCriteria:
          - condition: $statusCode == 201
        outputs:
          invoiceNumber:
            context: $response.body
            selector: /number
            type: jsonpointer
    outputs:
      orderId: $steps.createOrder.outputs.orderId
      invoiceNumber: $steps.createInvoice.outputs.invoiceNumber
```

### Exemples complets du dépôt (`app/public/workflows/`)

Les cinq exemples ci-dessous sont valides contre le schéma 1.1, sans erreur dans core. Ils ont été **exécutés** le
16/11/2026 (détails et commandes dans [`app/public/workflows/README.md`](../app/public/workflows/README.md)).

| Dossier | Scénario | Nouveautés 1.1 |
|---|---|---|
| `mcp-travel-booking/` | `quote_trip` (lecture seule), puis confirmation, puis `book_trip`, avec `mcp-tools.json` | Pattern « 1 workflow = 1 outil MCP », compensations |
| `mcp-support-refund/` | Éligibilité, puis remboursement, puis `refund.issued`, avec `mcp-tools.json` | `type: asyncapi`, `channelPath` + `action: send`, garde-fous |
| `e2e-order-to-cash/` | Commande, puis `order.confirmed`, puis paiement, puis facture ∥ expédition | `receive`, `correlationId`, `timeout`, `dependsOn`, Selectors |
| `e2e-session-renewal/` | 401, puis `retry` qui réutilise `renewSession`, puis rejeu ; cas négatif | `parameters` d'action, `in: querystring` |
| `e2e-onboarding-entreprise-fr/` | SIREN (stub de type INPI/SIRENE), puis KYC, puis compte, puis webhook | Étape `workflowId`, `send`, descriptions en français |

Les fichiers historiques `pet-adoption.arazzo.yaml` et `ecommerce-onboarding.arazzo.yaml` ont été migrés en 1.1.0. Ils
sont chargés par le builder.

**Recette E2E (versions épinglées).**
- HTTP : `npx -y @stoplight/prism-cli@5.16.0 mock …`, puis `npx -y @redocly/cli@2.79.0 lint` et `respect`.
- `receive` Kafka : arazzo-cli 0.9.0 avec Kafka et Microcks.
- `send` : Specmatic (`specmatic/enterprise`, commercial). Aucun runner open source n'exécute `send`.
- Respect n'évalue pas les Selector Objects.
- Modèle CI : `app/public/workflows/ci/arazzo-e2e.yml.example`.

---

## Tests

```bash
cd app && npm test                         # Jest : rendering, spec-compliance (1.0.1)
npm test -w packages/arazzo-core           # Vitest, depuis la racine : règles 1.1, corpus, exemples
```

Showcase des composants : `/showcase`, avec les sections `#step-inspector`, `#resizable-panel`,
`#action-form-editor` et `#expression-input`.

---

## Développement

```bash
git clone https://github.com/connEthics/arazzo-demo.git
cd arazzo-demo
npm install                 # workspaces packages/* (core, flow)
cd app && npm install       # l'app Next.js s'installe à part
npm run dev                 # http://localhost:3000
npm run build && npm start  # build de production
npm run lint
```

---

## Conventions de code

- **Composants** en PascalCase (`StepInspector`, `ArazzoFlow`).
- **Fichiers** : kebab-case pour les utilitaires (`arazzo-parser.ts`), PascalCase pour les composants.
- **Types** en PascalCase (`ArazzoSpec`, `Step`), **fonctions** en camelCase (`parseArazzoSpec`, `workflowToFlow`).
- Ordre des imports : externes, puis internes (`@/…`), puis types locaux, puis composant.
- **Performance** : `useMemo` pour les calculs lourds (Mermaid, React Flow), `useCallback` pour les handlers, imports
  dynamiques pour Monaco et Mermaid :

```typescript
const MermaidDiagram = dynamic(() => import('@/components/MermaidDiagram'), {
  ssr: false,
  loading: () => <div>Loading...</div>,
});
```

---

## Références

### Documentation externe

- [Arazzo Specification 1.1.0](https://spec.openapis.org/arazzo/v1.1.0.html) (et [1.0.1](https://spec.openapis.org/arazzo/v1.0.1.html))
- [OpenAPI Initiative](https://www.openapis.org/), [AsyncAPI 3](https://www.asyncapi.com/docs/reference/specification/latest)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [React Flow](https://reactflow.dev/), [ELK.js](https://eclipse.dev/elk/), [Mermaid](https://mermaid.js.org/)

### Documentation interne

- [`arazzo.skill.md`](../arazzo.skill.md) : guide Arazzo 1.1 pour assistants IA, avec MCP, tests E2E et règles de validation ;
- [`packages/arazzo-core/README.md`](../packages/arazzo-core/README.md) : API et règles du validateur ;
- [`app/public/workflows/README.md`](../app/public/workflows/README.md) : index des exemples et résultats d'exécution ;
- `docs/BUILDER_SPEC.md` et `docs/ARCHITECTURE_FRONT.md` ;
- dans le dépôt arazzo-vscode, `specs/002-arazzo-1-1-refonte/` : plan de la refonte et recherches (delta 1.1, MCP, runners E2E).

---

## Licence

- **Paquets `packages/arazzo-core` et `packages/arazzo-flow`** : licence **MIT**.
- **Composants `app/src/components/arazzo/`** : licence **MIT**. Il faut conserver un lien vers le projet d'origine et la notice MIT.
- **Application Arazzo Studio** : *source-available* sous **Functional Source License 1.1, MIT Future License**
  (FSL-1.1-MIT, [`LICENSE.md`](../LICENSE.md)). Tout usage est permis sauf un usage concurrent commercial ; chaque
  version passe automatiquement sous MIT deux ans après sa publication.
- **Schémas JSON officiels** embarqués dans core : © OpenAPI Initiative, Apache-2.0.

---

## Contact

- Site : [connethics.com](https://connethics.com)
- Arazzo Studio : [arazzo.connethics.com](https://arazzo.connethics.com)
- Extension : [Arazzo for VS Code — by ConnEthics](https://marketplace.visualstudio.com/items?itemName=connethics.arazzo-vscode)
- GitHub : [connEthics/arazzo-demo](https://github.com/connEthics/arazzo-demo)

---

*Dernière mise à jour : 2026-11-16 (Arazzo 1.1.0)*
