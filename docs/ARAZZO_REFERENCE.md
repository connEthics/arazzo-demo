# Arazzo Skill File
## Vue d'ensemble

**Arazzo** est un standard OpenAPI pour l'orchestration de workflows d'API. Ce projet fournit un visualiseur et builder interactif pour les spécifications Arazzo.

### Qu'est-ce qu'Arazzo ?

Arazzo (version 1.0.1) permet de décrire des workflows complexes d'API en définissant :
- Des séquences d'appels API (steps)
- Des flux conditionnels (success/failure)
- Des dépendances de données entre étapes
- Des critères de succès et d'échec
- Des actions de retry et de navigation

### Capacités du Système

1. **Visualisation Multi-mode**
   - Interactive Flow View (React Flow + ELK.js)
   - Mermaid Flowchart
   - Sequence Diagrams
   - Swimlane View
   - Documentation View

2. **Édition Interactive**
   - Builder visuel drag & drop
   - Éditeur YAML Monaco
   - Inspecteur de steps avec formulaires
   - Gestion multi-workflow

3. **Export et Partage**
   - Copy to clipboard (Mermaid syntax)
   - Export YAML
   - Dark/Light mode

---

## Structure du Projet

```
arazzo-demo/
├── app/                        # Application Next.js 16
│   ├── src/
│   │   ├── app/               # App Router pages
│   │   │   ├── builder/       # Page principale du builder
│   │   │   └── showcase/      # Showcase des composants
│   │   ├── components/        # Composants React
│   │   │   ├── arazzo/        # Composants Arazzo MIT (ActionList, etc.)
│   │   │   ├── nodes/         # Custom React Flow nodes
│   │   │   ├── primitives/    # Design system (Badge, Card, etc.)
│   │   │   ├── ArazzoFlow.tsx
│   │   │   ├── MermaidDiagram.tsx
│   │   │   ├── DetailDrawer.tsx
│   │   │   ├── Inspector.tsx
│   │   │   ├── StepInspector.tsx
│   │   │   ├── ActionFormEditor.tsx
│   │   │   └── ExpressionInput.tsx
│   │   ├── features/          # Feature-based modules
│   │   │   └── builder/       # Builder feature
│   │   ├── lib/               # Core logic
│   │   │   ├── arazzo-parser.ts      # YAML → React Flow
│   │   │   ├── mermaid-converter.ts  # Arazzo → Mermaid
│   │   │   └── swimlane-converter.ts
│   │   ├── types/             # TypeScript definitions
│   │   │   └── arazzo.ts      # Arazzo spec types
│   │   └── hooks/             # Custom React hooks
│   └── public/
│       ├── workflows/         # Exemple Arazzo specs (.yaml)
│       └── openapi/           # Exemple OpenAPI specs
├── docs/                      # Documentation technique
│   ├── BUILDER_SPEC.md       # Spécifications du Builder
│   └── ARCHITECTURE_FRONT.md # Architecture Frontend
└── arazzo.skill.md           # Ce fichier
```

---

## Architecture et Patterns

### 1. State Management

**Pattern Reducer** avec `BuilderContext` :

```typescript
interface BuilderState {
  spec: ArazzoDefinition;                    // Spécification complète v1.0.1
  sources: Record<string, OpenAPIDefinition>; // Sources OpenAPI chargées
  selectedStepId: string | null;              // ID étape sélectionnée
  selectedNodeType: 'step' | 'input' | 'output' | null;
  currentWorkflowId: string;                  // Workflow actif
}
```

**Actions principales** :
- `LOAD_SPEC` : Charger une spécification Arazzo
- `LOAD_SAMPLE` : Charger un exemple avec sources
- `ADD_SOURCE` : Ajouter une source OpenAPI
- `ADD_WORKFLOW` : Créer un nouveau workflow
- `RENAME_WORKFLOW` : Renommer avec mise à jour des références
- `ADD_STEP` : Ajouter une étape
- `UPDATE_STEP` : Modifier une étape
- `DELETE_STEP` : Supprimer une étape
- `ADD_CONNECTION` : Créer un lien goto
- `DELETE_CONNECTION` : Supprimer un lien
- `SELECT_STEP` : Sélectionner une étape

### 2. Single Source of Truth (SSOT)

L'interface est une **projection réactive** de la spécification Arazzo. Toute modification transite par une mise à jour du modèle.

**Flux de données** :
```
Action → Reducer → State → UI
```

Exemple :
1. Utilisateur renomme un `stepId` dans l'inspecteur
2. Reducer intercepte, met à jour le `stepId` ET toutes les références (`onSuccess`, `onFailure`, `$steps.xxx`)
3. State propagé
4. UI rafraîchie automatiquement (React Flow + YAML Editor)

### 3. Canvas as a Projection

Le canvas React Flow n'est pas l'état source. Il est recalculé via `arazzo-parser.ts` :

```typescript
// arazzo-parser.ts transforme :
ArazzoWorkflow → { nodes: Node[], edges: Edge[] }
```

### 4. Feature-Based Architecture

Code organisé par fonctionnalités :
- `features/builder/` : Logique du builder
- `components/arazzo/` : Composants Arazzo réutilisables (MIT)
- `components/primitives/` : Design system
- `lib/` : Utilitaires et parsers

---

## Types Arazzo Essentiels

### ArazzoDefinition

```typescript
interface ArazzoDefinition {
  arazzo: string;                    // Version (ex: "1.0.1")
  info: {
    title: string;
    version: string;
    summary?: string;
    description?: string;
  };
  sourceDescriptions?: SourceDescription[];
  workflows: Workflow[];
}
```

### SourceDescription

```typescript
interface SourceDescription {
  name: string;                      // ID unique
  type: 'openapi' | 'arazzo';
  url: string;                       // URL ou chemin du fichier
}
```

### Workflow

```typescript
interface Workflow {
  workflowId: string;                // ID unique
  summary?: string;
  description?: string;
  inputs?: JSONSchema;               // Inputs du workflow
  steps: Step[];
  outputs?: Record<string, string>;  // Outputs finaux
  parameters?: Parameter[];
  dependsOn?: string[];              // Dépendances workflow
}
```

### Step

```typescript
interface Step {
  stepId: string;                    // ID unique dans le workflow
  description?: string;
  operationId?: string;              // Référence OpenAPI operation
  operationPath?: string;            // Chemin HTTP alternatif
  workflowId?: string;               // Référence workflow
  parameters?: Parameter[];
  requestBody?: RequestBody;
  successCriteria?: Criterion[];
  onSuccess?: Action[];
  onFailure?: Action[];
  outputs?: Record<string, string>;  // Expressions de sortie
}
```

### Parameter

```typescript
interface Parameter {
  name: string;
  in?: 'query' | 'path' | 'header' | 'cookie';
  value: string | number | boolean;  // Peut contenir des expressions
}
```

### Action

```typescript
interface Action {
  name?: string;
  type: 'goto' | 'retry' | 'end';
  stepId?: string;                   // Pour goto
  workflowId?: string;               // Pour goto workflow
  retryAfter?: number;               // Secondes pour retry
  retryLimit?: number;               // Nombre max de retry
}
```

### Criterion

```typescript
interface Criterion {
  condition: string;                 // Expression (ex: "$statusCode == 200")
  type?: 'simple' | 'regex' | 'jsonpath';
}
```

---

## Expressions Arazzo

Arazzo utilise un système d'expressions pour référencer des données :

### Variables de Contexte

| Expression | Description | Exemple |
|------------|-------------|---------|
| `$statusCode` | Code HTTP de la réponse | `$statusCode == 200` |
| `$url` | URL appelée | `$url` |
| `$method` | Méthode HTTP | `$method == "GET"` |
| `$request` | Requête complète | `$request.headers` |
| `$response` | Réponse complète | `$response.body.id` |

### Références de Données

| Expression | Description | Exemple |
|------------|-------------|---------|
| `$inputs.xxx` | Input du workflow | `$inputs.userId` |
| `$steps.xxx.outputs.yyy` | Output d'une étape | `$steps.login.outputs.token` |
| `$steps.xxx.request` | Requête d'une étape | `$steps.create.request.body` |
| `$steps.xxx.response` | Réponse d'une étape | `$steps.find.response.body[0].id` |
| `$workflows.xxx.outputs.yyy` | Output d'un workflow | `$workflows.auth.outputs.session` |

### Exemples d'Expressions

```yaml
# Critère de succès
successCriteria:
  - condition: $statusCode == 200
  - condition: $response.body.status == "approved"

# Paramètre avec expression
parameters:
  - name: petId
    in: path
    value: $steps.find-pets.response.body[0].id

# Output avec expression
outputs:
  adoptionId: $response.body.id
  confirmationUrl: $response.headers.Location
```

---

## Composants Clés

### 1. Composants Primitives (`components/primitives/`)

| Composant | Description | Props principales |
|-----------|-------------|-------------------|
| `Badge` | Badge coloré avec 20+ variants | `variant`, `size`, `isDark` |
| `Card` | Container avec bordure/shadow | `title`, `collapsible`, `isDark` |
| `CodeBlock` | Affichage code avec copie | `code`, `language`, `title` |
| `PropertyList` | Liste clé-valeur | `properties`, `compact` |
| `CollapsibleSection` | Section repliable | `title`, `defaultOpen`, `badge` |
| `EditableField` | Champ éditable inline | `value`, `onSave`, `placeholder` |

### 2. Composants Arazzo (`components/arazzo/`)

Composants MIT réutilisables :

| Composant | Description |
|-----------|-------------|
| `ActionList` | Affiche actions onSuccess/onFailure |
| `ArazzoSpecHeader` | En-tête de spécification |
| `CriterionBadge` | Badge critère success/failure |
| `DependsOnList` | Visualisation dépendances |
| `PayloadReplacements` | Affichage body replacements |
| `ReusableRef` | Affichage références composants |
| `SchemaViewer` | Visualiseur JSON Schema récursif |
| `SourceDescriptionsList` | Liste des sources API |
| `WorkflowList` | Liste des workflows |

### 3. Composants Builder

| Composant | Description |
|-----------|-------------|
| `BuilderCanvas` | Canvas React Flow avec ELK.js |
| `BuilderToolbar` | Toggles ports/data/errors |
| `OperationsToolbox` | Liste opérations draggable |
| `YamlEditor` | Monaco Editor (dynamic import) |
| `SourceManagerV2` | Upload fichiers Arazzo/OpenAPI |
| `WorkflowManager` | Sélecteur/créateur workflow |
| `StepInspector` | Éditeur complet d'une étape |
| `ActionFormEditor` | CRUD pour actions |
| `ExpressionInput` | Input avec autocomplete |

### 4. Custom Nodes React Flow

| Node | Description | Couleur |
|------|-------------|---------|
| `InputNode` | Point d'entrée workflow | Vert émeraude |
| `StepNode` | Étape d'opération | Bleu indigo |
| `UnifiedStepNode` | Étape avec ports/badges | Bleu indigo |
| `OutputNode` | Sorties workflow | Violet |

---

## Sémantique Visuelle

### Couleurs et Variants

| Type | Couleur | Tailwind | Signification |
|------|---------|----------|---------------|
| **Input** | Vert Émeraude | `emerald-500` | Entrées workflow |
| **Step** | Bleu Indigo | `indigo-500` | Étape exécution |
| **Output** | Violet | `violet-500` | Sorties finales |
| **Success** | Vert | `green-500` | Action onSuccess |
| **Failure** | Rouge | `red-500` | Action onFailure |
| **Workflow** | Cyan | `cyan-500` | Référence workflow |
| **GET** | Vert | `green-500` | HTTP GET |
| **POST** | Bleu | `blue-500` | HTTP POST |
| **PUT** | Orange | `orange-500` | HTTP PUT |
| **DELETE** | Rouge | `red-500` | HTTP DELETE |

### Types de Flux (Edges)

| Type | Style | Couleur | Signification |
|------|-------|---------|---------------|
| `success` | Solide | Vert | Flux normal |
| `failure` | Solide | Rouge | Flux d'erreur |
| `data` | Pointillé | Violet | Dépendance données |

---

## Opérations Courantes

### 1. Charger une Spécification Arazzo

```typescript
import { parseArazzoSpec } from '@/lib/arazzo-parser';

const yamlContent = await fetch('/workflows/pet-adoption.yaml').then(r => r.text());
const spec = parseArazzoSpec(yamlContent);

// Dispatch dans le reducer
dispatch({ type: 'LOAD_SPEC', payload: spec });
```

### 2. Ajouter un Step

```typescript
const newStep: Step = {
  stepId: 'new-step-1',
  description: 'My new step',
  operationId: 'petstore.findPets',
  parameters: [
    { name: 'status', in: 'query', value: 'available' }
  ],
  successCriteria: [
    { condition: '$statusCode == 200' }
  ],
  outputs: {
    pets: '$response.body'
  }
};

dispatch({
  type: 'ADD_STEP',
  payload: {
    workflowId: 'current-workflow',
    step: newStep
  }
});
```

### 3. Créer une Action goto

```typescript
const gotoAction: Action = {
  type: 'goto',
  stepId: 'target-step-id'
};

dispatch({
  type: 'UPDATE_STEP',
  payload: {
    stepId: 'source-step-id',
    updates: {
      onSuccess: [gotoAction]
    }
  }
});
```

### 4. Générer un Diagramme Mermaid

```typescript
import { convertToMermaidFlowchart } from '@/lib/mermaid-converter';

const workflow = spec.workflows[0];
const mermaidCode = convertToMermaidFlowchart(workflow);
// Retourne: "graph TD\n  A[Step 1] --> B[Step 2]\n  ..."
```

### 5. Parser YAML vers React Flow

```typescript
import { workflowToReactFlow } from '@/lib/arazzo-parser';

const { nodes, edges } = workflowToReactFlow(workflow);
// nodes: Node[] pour React Flow
// edges: Edge[] pour React Flow
```

---

## Parsers et Converters

### arazzo-parser.ts

**Fonctions principales** :

```typescript
// Parse YAML → ArazzoDefinition
function parseArazzoSpec(yamlContent: string): ArazzoDefinition;

// Workflow → React Flow nodes/edges
function workflowToReactFlow(workflow: Workflow): {
  nodes: Node[];
  edges: Edge[];
};

// Détecte les dépendances de données entre steps
function detectDataDependencies(steps: Step[]): Map<string, string[]>;
```

### mermaid-converter.ts

**Fonctions principales** :

```typescript
// Workflow → Flowchart Mermaid
function convertToMermaidFlowchart(workflow: Workflow): string;

// Workflow → Sequence Diagram Mermaid
function convertToMermaidSequence(
  workflow: Workflow,
  sources: Record<string, OpenAPIDefinition>
): string;
```

### swimlane-converter.ts

```typescript
// Workflow → Swimlane Diagram Mermaid
function convertToSwimlane(
  workflow: Workflow,
  sources: Record<string, OpenAPIDefinition>
): string;
```

---

## Exemples de Workflow

### Exemple Minimal

```yaml
arazzo: 1.0.1
info:
  title: Simple Workflow
  version: 1.0.0

sourceDescriptions:
  - name: petstore
    type: openapi
    url: /openapi/petstore.yaml

workflows:
  - workflowId: find-pets
    summary: Find available pets
    steps:
      - stepId: get-pets
        operationId: petstore.findPets
        parameters:
          - name: status
            in: query
            value: available
        successCriteria:
          - condition: $statusCode == 200
        outputs:
          pets: $response.body
```

### Exemple avec Actions Conditionnelles

```yaml
workflows:
  - workflowId: pet-adoption
    inputs:
      type: object
      properties:
        userId:
          type: string
    steps:
      - stepId: find-pets
        operationId: petstore.findPets
        parameters:
          - name: status
            in: query
            value: available
        successCriteria:
          - condition: $statusCode == 200
        onSuccess:
          - type: goto
            stepId: select-pet
        onFailure:
          - type: retry
            retryAfter: 5
            retryLimit: 3

      - stepId: select-pet
        operationId: petstore.getPet
        parameters:
          - name: petId
            in: path
            value: $steps.find-pets.response.body[0].id
        successCriteria:
          - condition: $statusCode == 200
        outputs:
          selectedPet: $response.body
        onSuccess:
          - type: goto
            stepId: create-adoption

      - stepId: create-adoption
        operationId: petstore.createAdoption
        parameters:
          - name: petId
            in: path
            value: $steps.select-pet.outputs.selectedPet.id
          - name: userId
            in: query
            value: $inputs.userId
        successCriteria:
          - condition: $statusCode == 201
        outputs:
          adoptionId: $response.body.id
```

---

## Testing

### Tests Unitaires (Jest)

```bash
cd app
npm test
```

Fichiers de test dans `app/src/__tests__/`

### Showcase des Composants

URL : `/showcase`

Sections :
- `#step-inspector` : StepInspector
- `#resizable-panel` : ResizableInspectorPanel
- `#action-form-editor` : ActionFormEditor
- `#expression-input` : ExpressionInput

---

## Développement

### Installation

```bash
git clone https://github.com/connEthics/arazzo-demo.git
cd arazzo-demo/app
npm install
```

### Lancement Dev

```bash
npm run dev
# Ouvre http://localhost:3000
```

### Build Production

```bash
npm run build
npm start
```

### Linting

```bash
npm run lint
```

---

## Conventions de Code

### Naming

- **Composants** : PascalCase (`StepInspector`, `ArazzoFlow`)
- **Fichiers** : kebab-case pour utils (`arazzo-parser.ts`), PascalCase pour composants (`StepInspector.tsx`)
- **Types** : PascalCase (`ArazzoDefinition`, `Step`)
- **Fonctions** : camelCase (`parseArazzoSpec`, `workflowToReactFlow`)

### Structure Fichiers

```typescript
// 1. Imports externes
import React from 'react';
import { Node, Edge } from '@xyflow/react';

// 2. Imports internes
import { Badge } from '@/components/primitives/Badge';
import { ArazzoDefinition } from '@/types/arazzo';

// 3. Types locaux
interface Props {
  // ...
}

// 4. Composant
export function MyComponent({ ... }: Props) {
  // ...
}
```

### Performance

- **useMemo** pour calculs lourds (Mermaid, React Flow)
- **useCallback** pour handlers passés en props
- **Dynamic imports** pour composants lourds (Monaco, Mermaid)

```typescript
const MermaidDiagram = dynamic(() => import('@/components/MermaidDiagram'), {
  ssr: false,
  loading: () => <div>Loading...</div>
});
```

---

## Références

### Documentation Externe

- [Arazzo Specification 1.0.1](https://spec.openapis.org/arazzo/latest.html)
- [OpenAPI Initiative](https://www.openapis.org/)
- [React Flow Docs](https://reactflow.dev/)
- [ELK.js Docs](https://eclipse.dev/elk/)
- [Mermaid Docs](https://mermaid.js.org/)

### Documentation Interne

- `docs/BUILDER_SPEC.md` : Spécifications détaillées du Builder
- `docs/ARCHITECTURE_FRONT.md` : Architecture Frontend
- `README.md` : Guide utilisateur

---

## Licence

### Main Project - Proprietary

Le code principal est **open source mais pas libre d'utilisation**. Droits réservés par connEthics.

### Composants Arazzo - MIT

Les composants dans `app/src/components/arazzo/` sont sous **licence MIT** :
- ActionList.tsx
- ArazzoSpecHeader.tsx
- CriterionBadge.tsx
- DependsOnList.tsx
- PayloadReplacements.tsx
- ReusableRef.tsx
- SchemaViewer.tsx
- SourceDescriptionsList.tsx
- WorkflowList.tsx

**Conditions** : Lien vers le projet original + notice MIT

---

## Contact

- Website : [connethics.com](https://connethics.com)
- Demo : [arazzo.connethics.com](https://arazzo.connethics.com)
- GitHub : [connEthics/arazzo-demo](https://github.com/connEthics/arazzo-demo)

---

*Dernière mise à jour : 2026-01-24*
