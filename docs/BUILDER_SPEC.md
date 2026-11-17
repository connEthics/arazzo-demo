# Spécification de l'Écran Builder Arazzo

Ce document décrit les spécifications fonctionnelles et techniques de l'écran "Builder" de l'application Arazzo Demo. L'objectif est de fournir une référence claire pour itérer sur la conception et l'implémentation de cet outil d'édition visuelle de workflows.

## 1. Vue d'ensemble

L'écran Builder est l'interface principale permettant aux utilisateurs de créer, visualiser et modifier des workflows Arazzo de manière interactive. Il combine une approche "No-Code/Low-Code" via un éditeur visuel (drag & drop) avec la puissance de l'édition directe de la spécification (YAML).

### Objectifs Principaux
- Faciliter la création de workflows complexes basés sur des spécifications OpenAPI.
- Visualiser le flux d'exécution (succès, échec) et le flux de données.
- Offrir une synchronisation bidirectionnelle entre la vue visuelle et le code YAML.

## 2. Interface Utilisateur (UI)

L'interface est divisée en quatre zones principales :

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              HEADER                                     │
│  [≡] Arazzo Builder  [workflow-1 ▾] [+]  [Doc|Builder|Flow|Seq]  .      │
├─────────────┬───────────────────────────────────────────┬───────────────┤
│           [<]                                           [>]             │
│   PANNEAU   │              PANNEAU CENTRAL              │   PANNEAU     │
│   GAUCHE    │                                           │   DROIT       │
│             │           (Canevas/Visualisation)         │               │
│  - Sources  │                                           │  Inspector    │
│  - Ops/YAML │                                           │  (R/W modes)  │
│             │                                           │               │
│  [resize]   │                                           │  [resize]     │
└─────────────┴───────────────────────────────────────────┴───────────────┘
```

### 2.1. En-tête (Header)

**Composant** : Inline dans `BuilderPageContent`

| Élément | Description | Composant |
|---------|-------------|-----------|
| Navigation Mobile | Menu hamburger pour petits écrans | `MenuIcon` / Mobile Menu Panel |
| Titre | "Arazzo Builder" | `<h1>` |
| Sélecteur de Workflow | Dropdown + boutons create/rename | `WorkflowManager` |
| Modes de Vue | Toggle Documentation/Builder/Flowchart/Sequence | Boutons inline |
| Options d'Affichage | Checkboxes contextuelles | Labels avec checkboxes |
| Toggle Panneaux | Boutons pour masquer/afficher panneaux gauche/droit | Boutons icônes |

### 2.2. Panneau Gauche (Ressources)

Ce panneau est **redimensionnable** (200-600px) et **accessible dans tous les modes de vue**.

**Composants** :
- `SourceManagerV2` : Gestion des fichiers Arazzo et OpenAPI
- `OperationsToolbox` : Liste des opérations (drag & drop)
- `YamlEditor` : Éditeur Monaco (chargé dynamiquement)
- `ActiveSourcesSection` : Résumé des sources utilisées

**Structure** :
```
┌─────────────────────────┐
│  [Operations] [YAML] [⛶]│  ← Mode toggle + fullscreen
├─────────────────────────┤
│     SourceManagerV2     │  ← Upload Arazzo/OpenAPI
├─────────────────────────┤
│                         │
│   OperationsToolbox     │  ← Draggable operations
│   ou YamlEditor         │
│                         │
├─────────────────────────┤
│   Active Sources (3)    │  ← Collapsible section
│   └─ petstore (5 ops)   │
│   └─ users-api (12 ops) │
└─────────────────────────┘
```

### 2.3. Panneau Central (Canevas / Visualisation)

Zone de travail principale, contenu selon le mode de vue sélectionné.

| Mode | Composant | Description |
|------|-----------|-------------|
| **Builder** | `BuilderToolbar` + `BuilderCanvas` | Éditeur React Flow avec toggles ports/data/errors |
| **Documentation** | `UnifiedDocumentationView` | Vue documentée avec TOC |
| **Flowchart** | `MermaidDiagram` | Diagramme Mermaid flowchart |
| **Sequence** | `MermaidDiagram` | Diagramme Mermaid séquence |

### 2.4. Panneau Droit (Inspecteur & Détails)

Ce panneau est **redimensionnable** (320-600px via `ResizableInspectorPanel`) et **accessible dans tous les modes de vue**.

**Architecture des Composants** :

```
┌─────────────────────────────────────┐
│   ResizableInspectorPanel           │  ← Wrapper redimensionnable
│   ├── Inspector                     │  ← Toggle read/edit
│   │   ├── Mode: [Documentation|Edit]│
│   │   │                             │
│   │   ├── (read mode)               │
│   │   │   └── DetailDrawer          │  ← Vue lecture formatée
│   │   │                             │
│   │   └── (edit mode)               │
│   │       └── StepInspector         │  ← Formulaires édition
│   │           ├── General Tab       │
│   │           ├── Params Tab        │  ← ExpressionInput
│   │           ├── Criteria Tab      │  ← ExpressionInput
│   │           └── Actions Tab       │  ← ActionFormEditor
└───┴─────────────────────────────────┘
```

#### Composants du Panneau Droit

| Composant | Fichier | Description |
|-----------|---------|-------------|
| `ResizableInspectorPanel` | `components/ResizableInspectorPanel.tsx` | Wrapper avec drag handle, grip dots, contraintes min/max |
| `Inspector` | `components/Inspector.tsx` | Toggle entre mode lecture et édition |
| `DetailDrawer` | `components/DetailDrawer.tsx` | Vue lecture seule formatée |
| `StepInspector` | `components/StepInspector.tsx` | Formulaires d'édition avec 4 onglets |
| `ActionFormEditor` | `components/ActionFormEditor.tsx` | CRUD pour actions onSuccess/onFailure |
| `ExpressionInput` | `components/ExpressionInput.tsx` | Input avec autocomplete pour expressions Arazzo |

### 2.5. Sémantique Visuelle et Iconographie

Cohérence visuelle stricte maintenue à travers toutes les vues.

**Accents d'interface** (bouton ou onglet actif, sélection, anneau de focus, liens, boutons principaux) : primaire ConnEthics uniquement, `bg-ce-primary-solid` / `text-ce-primary` (`--ce-primary`, bleu `#2563eb`) ou l'échelle `blue-*` quand le composant gère lui-même le clair et le sombre. Le violet, le pourpre et l'indigo sont réservés aux usages sémantiques de ce tableau et des palettes catégorielles : sorties, sous-workflows et sources `arazzo`, flux de données et `dependsOn`, méthode PATCH, emplacement `path`, catégorie MCP, types d'expressions.

| Type | Couleur | Code Tailwind | Badge Variant | Signification |
|:-----|:--------|:--------------|:--------------|:--------------|
| **Input** | Vert Émeraude | `emerald-500` | `input` | Entrées du workflow |
| **Step** | Bleu ConnEthics | `blue-500` / `--ce-primary` | `step` | Étape d'exécution |
| **Output** | Violet | `violet-500` | `output` | Sorties finales |
| **Success** | Vert | `green-500` | `success` | Action onSuccess |
| **Failure** | Rouge | `red-500` | `failure` | Action onFailure |
| **Workflow** | Cyan | `cyan-500` | `workflow` | Référence workflow |
| **Method GET** | Vert | `green-500` | `method-get` | HTTP GET |
| **Method POST** | Bleu | `blue-500` | `method-post` | HTTP POST |
| **Method PUT** | Orange | `orange-500` | `method-put` | HTTP PUT |
| **Method DELETE** | Rouge | `red-500` | `method-delete` | HTTP DELETE |

## 3. Composants Implémentés

### 3.1. Composants Primitives (`components/primitives/`)

| Composant | Description | Props principales |
|-----------|-------------|-------------------|
| `Badge` | Badge coloré avec variants | `variant`, `size`, `isDark` |
| `Card` | Container avec bordure/shadow | `title`, `collapsible`, `isDark` |
| `CodeBlock` | Affichage code avec copie | `code`, `language`, `title` |
| `PropertyList` | Liste clé-valeur | `properties`, `compact` |
| `CollapsibleSection` | Section repliable | `title`, `defaultOpen`, `badge` |
| `SectionHeader` | En-tête de section | `title`, `icon`, `badge` |
| `MarkdownText` | Rendu CommonMark | `content`, `isDark` |
| `CopyButton` | Bouton copier presse-papier | `text`, `isDark` |
| `ContentCard` | Carte avec icône et contenu | `icon`, `title`, `children` |
| `Expandable` | Contenu expandable | `title`, `children` |

### 3.2. Composants Step Inspector

| Composant | Fichier | Description |
|-----------|---------|-------------|
| `StepInspector` | `components/StepInspector.tsx` | Éditeur complet d'une étape avec 4 onglets |
| `ExpressionInput` | `components/ExpressionInput.tsx` | Input avec autocomplete Arazzo |
| `ActionFormEditor` | `components/ActionFormEditor.tsx` | CRUD pour actions (goto/retry/end) |
| `ResizableInspectorPanel` | `components/ResizableInspectorPanel.tsx` | Panel redimensionnable |
| `Inspector` | `components/Inspector.tsx` | Wrapper avec toggle read/edit |

#### StepInspector - Onglets

| Onglet | Contenu | Composants utilisés |
|--------|---------|---------------------|
| **General** | stepId, description, operation, outputs | `ExpressionInput` (outputs) |
| **Parameters** | Liste des paramètres avec type (query/path/header) | `ExpressionInput` (valeurs) |
| **Criteria** | Conditions de succès | `ExpressionInput` + quick suggestions |
| **Actions** | onSuccess + onFailure | `ActionFormEditor` × 2 |

#### ExpressionInput - Types de suggestions

| Type | Préfixe | Exemple | Couleur |
|------|---------|---------|---------|
| `context` | `$statusCode`, `$url`, `$method` | `$statusCode == 200` | Bleu |
| `response` | `$response.` | `$response.body.id` | Violet |
| `input` | `$inputs.` | `$inputs.userId` | Vert |
| `output` | `$steps.` | `$steps.login.outputs.token` | Amber |
| `step` | Step ID référence | `find-pets` | Indigo |

#### ActionFormEditor - Types d'actions

| Type | Description | Champs |
|------|-------------|--------|
| `goto` | Aller à une étape | `stepId` ou `workflowId` |
| `retry` | Réessayer | `retryAfter` (secondes), `retryLimit` |
| `end` | Terminer le workflow | - |

### 3.3. Composants Builder (`features/builder/`)

| Composant | Fichier | Description |
|-----------|---------|-------------|
| `BuilderCanvas` | `components/BuilderCanvas.tsx` | Canvas React Flow |
| `BuilderToolbar` | `components/BuilderToolbar.tsx` | Toggles ports/data/errors |
| `OperationsToolbox` | `components/OperationsToolbox.tsx` | Liste opérations draggable |
| `YamlEditor` | `components/YamlEditor.tsx` | Monaco Editor (dynamic import) |
| `SourceManagerV2` | `components/SourceManagerV2.tsx` | Upload fichiers |
| `WorkflowManager` | `components/WorkflowManager.tsx` | Sélecteur/créateur workflow |

### 3.4. Nœuds React Flow (`components/nodes/`)

| Composant | Description |
|-----------|-------------|
| `InputNode` | Point d'entrée workflow (vert) |
| `OutputNode` | Sorties workflow (violet) |
| `StepNode` | Étape simple |
| `UnifiedStepNode` | Étape avec ports, badges, états |

## 4. Fonctionnalités Clés

### 4.1. Gestion Multi-Workflow
- **Création** : Bouton pour ajouter un nouveau workflow vide à la liste `workflows` de la spécification.
- **Renommage** : Possibilité de modifier le `workflowId` (avec mise à jour automatique des références si nécessaire).
- **Navigation** : Commutation fluide entre les différents workflows pour l'édition.

### 4.2. Visualisation des Flux
- **Flux de Contrôle (Control Flow)** :
  - Lignes vertes : Succès (`onSuccess`).
  - Lignes rouges : Échec (`onFailure`).
- **Flux de Données (Data Flow)** :
  - Lignes violettes pointillées : Indiquent qu'une étape utilise la sortie d'une autre étape comme paramètre.
- **Topologie** : Calcul automatique de la disposition des nœuds (Topological Sort) pour une lecture gauche-droite ou haut-bas logique.

### 4.3. Synchronisation
- Toute action dans le Builder (ajout nœud, lien) met à jour l'état global (`BuilderState`) et la spécification Arazzo sous-jacente.
- L'éditeur YAML reflète l'état actuel.

## 5. Modèle de Données (State Management)

### Structure de l'État (`BuilderState`)

```typescript
interface BuilderState {
  spec: ArazzoDefinition;                    // Spécification complète v1.0.1
  sources: Record<string, OpenAPIDefinition>; // Sources OpenAPI chargées
  selectedStepId: string | null;              // ID étape sélectionnée
  selectedNodeType: 'step' | 'input' | 'output' | null;
}
```

### Actions du Reducer

| Action | Payload | Description |
|--------|---------|-------------|
| `LOAD_SPEC` | `ArazzoSpec` | Charger une spécification |
| `LOAD_SAMPLE` | `{ spec, sources }` | Charger un exemple complet |
| `ADD_SOURCE` | `{ name, content }` | Ajouter une source OpenAPI |
| `ADD_WORKFLOW` | `{ workflow }` | Créer un nouveau workflow |
| `RENAME_WORKFLOW` | `{ oldId, newId }` | Renommer un workflow |
| `ADD_STEP` | `{ step }` | Ajouter une étape |
| `UPDATE_STEP` | `{ stepId, updates }` | Modifier une étape |
| `DELETE_STEP` | `{ stepId }` | Supprimer une étape |
| `ADD_CONNECTION` | `{ sourceId, targetId }` | Créer un lien goto |
| `DELETE_CONNECTION` | `{ sourceId, targetId }` | Supprimer un lien |
| `SELECT_STEP` | `stepId \| null` | Sélectionner une étape |

### Interface InspectorStep

```typescript
interface InspectorStep {
  stepId: string;
  operationId?: string;
  operationPath?: string;
  workflowId?: string;
  description?: string;
  parameters?: Array<{
    name: string;
    in?: 'query' | 'path' | 'header' | 'cookie';
    value: string | number | boolean;
  }>;
  requestBody?: {
    contentType?: string;
    payload?: unknown;
  };
  successCriteria?: Array<{
    condition: string;
    type?: string;
  }>;
  outputs?: Record<string, string>;
  onSuccess?: Action[];
  onFailure?: Action[];
}

interface Action {
  name?: string;
  type: 'goto' | 'retry' | 'end';
  stepId?: string;
  workflowId?: string;
  retryAfter?: number;
  retryLimit?: number;
}
```

## 6. Interactions et UX

### 6.1. Drag & Drop

| Source | Cible | Comportement |
|--------|-------|--------------|
| `OperationsToolbox` | Zone vide | Création nouvelle étape isolée |
| `OperationsToolbox` | Lien existant | Insertion entre deux étapes |
| | | Auto-population des paramètres requis |

### 6.2. Panel Toggle (Desktop)

- **Bouton gauche** : Masquer/afficher le panneau ressources
- **Bouton droit** : Masquer/afficher l'inspecteur
- **Drag handle** : Redimensionner les panneaux (grip dots visuels)

### 6.3. Mobile

- **Menu hamburger** : Navigation workflows + options
- **Panel switcher** : Boutons [⊞|◼|☰] pour basculer entre panneaux
- **Swipe** : Navigation intuitive (future)

### 6.4. Autocomplete Expressions

L'`ExpressionInput` fournit :
- Filtrage en temps réel lors de la saisie
- Suggestions groupées par type (context/response/input/output)
- Navigation clavier (↑↓ Enter Escape)
- Quick suggestions pour les critères courants

### 6.5. Nœuds (Nodes)

- **Types** :
  - `WorkflowInput` : Point d'entrée du workflow (vert émeraude).
  - `StepNode` (`UnifiedStepNode`) : Représente une étape d'opération (bleu ConnEthics).
  - `WorkflowOutput` : Sorties finales du workflow (violet).
- **États** : Sélectionné, Erreur (lien invalide), Étendu/Réduit (détails des ports).

### 6.6. Liens (Edges)

- **Types** :
  - `success` : Flux normal (vert).
  - `failure` : Flux d'erreur (rouge).
  - `data` : Dépendances de données (pointillé violet).

## 7. Showcase et Tests

Tous les composants sont démontrables dans `/showcase` :

| Section | Composant | URL |
|---------|-----------|-----|
| `step-inspector` | `StepInspectorShowcase` | `/showcase#step-inspector` |
| `resizable-panel` | `ResizableInspectorPanelShowcase` | `/showcase#resizable-panel` |
| `action-form-editor` | `ActionFormEditorShowcase` | `/showcase#action-form-editor` |
| `expression-input` | `ExpressionInputShowcase` | `/showcase#expression-input` |

## 8. Pistes d'Amélioration (Pour Itération)

### ✅ Complétés

1. **Panneau redimensionnable** : `ResizableInspectorPanel` avec contraintes min/max
2. **Mode édition** : `StepInspector` avec formulaires interactifs
3. **Actions CRUD** : `ActionFormEditor` pour onSuccess/onFailure
4. **Autocomplete expressions** : `ExpressionInput` avec suggestions contextuelles
5. **Panneaux accessibles partout** : Panneaux gauche/droit dans tous les modes

### 🔄 En cours

1. **WorkflowInputInspector** : Éditeur pour les inputs du workflow
2. **WorkflowOutputInspector** : Éditeur pour les outputs du workflow
3. **Validation temps réel** : Feedback visuel pour expressions invalides

### 📋 À faire

1. **Layout automatique avancé** : Dagre/Elkjs pour éviter chevauchements
2. **Undo/Redo** : Historique des modifications
3. **Export** : Téléchargement du fichier Arazzo modifié
4. **Tests E2E** : Playwright pour les interactions Builder
