# Architecture Frontend & Composants - Arazzo Builder

En tant que Lead Dev Front, j'ai réalisé une analyse approfondie de la structure actuelle du Page Builder. Ce document détaille les choix technologiques, les patterns de conception et la hiérarchie des composants.

## 1. Philosophie et Principes de Conception

L'architecture repose sur trois piliers :
*   **Single Source of Truth (SSOT)** : L'ensemble de l'interface est une projection réactive de la spécification Arazzo (YAML/JSON). Toute modification de l'UI transite par une mise à jour du modèle Arazzo.
*   **Feature-Based Architecture** : Le code est organisé par fonctionnalités (builder, auth, etc.) pour limiter le couplage.
*   **Design System Atomic** : Utilisation de primitives réutilisables pour assurer une cohérence visuelle stricte.

---

## 2. Pile Technologique (Tech Stack)

| Couche | Technologie | Rôle |
| :--- | :--- | :--- |
| **Framework** | Next.js (App Router) | Structure, Routing, SSR/SSG. |
| **Langage** | TypeScript | Type safety sur tout le flux de données Arazzo. |
| **State Management** | React Context + useReducer | Gestion du flux (Pattern Reducer) pour les actions complexes. |
| **Canvas** | React Flow (@xyflow/react) | Visualisation interactive et édition nodale. |
| **Layouting** | ELK.js | Moteur de calcul pour le placement automatique des nœuds. |
| **Style** | Tailwind CSS | Styling utilitaire et responsive. |
| **Édition** | Monaco Editor | Édition YAML avec coloration syntaxique. |

---

## 3. Architecture du State Management

Le `BuilderContext` est le cœur du builder. Il utilise un pattern **Reducer** pour gérer les transformations complexes de la spécification.

### Flux de données (Action → Reducer → State → UI) :
1.  **Action** : L'utilisateur renomme un `stepId` dans l'inspecteur.
2.  **Reducer** : Le `builderReducer` intercepte l'action, parcourt l'arbre Arazzo, et met à jour non seulement le `stepId` mais aussi toutes les références croisées (`onSuccess`, `onFailure`, expressions `$steps.xxx`).
3.  **State** : Le nouvel état `spec` est propagé.
4.  **UI** : Les composants React Flow et l'éditeur YAML se rafraîchissent automatiquement.

---

## 4. Hiérarchie des Composants

### A. Composants de Structure (Layout)
*   **`BuilderPage`** : Orchestrateur principal.
*   **`BuilderHeader`** : Barre d'outils globale, gestion des versions et export.
*   **`CanvasToolbar`** : Contrôles du canvas (zoom, layout, ajout de nœuds).
*   **`Inspector`** : Panneau latéral droit pour l'édition de détail du nœud sélectionné. Utilise désormais un mode de documentation interactif unifié où l'édition se fait "inline" via `StepHeader` et `StepBody`.

### B. Composants de Domaine (Arazzo Specific)
Ces composants portent la logique métier de la spécification Arazzo. Ils sont divisés en deux catégories :

**Visualisation & Édition Interactive :**
*   **`ArazzoFlow`** : Wrapper React Flow gérant le moteur de rendu ELK pour le canvas.
*   **`StepHeader`** [UNIFIÉ] : En-tête unique pour les Steps, gérant les variants `node`, `card` et `inspector`. Centralise l'affichage des méthodes HTTP et des IDs.
*   **`StepBody`** [UNIFIÉ] : Corps de composant gérant l'affichage des paramètres, outputs et de la logique, avec un mode `compact` (pour le canvas) et `full` (pour l'édition/doc).
*   **Custom Nodes** (`StepNode`, `InputNode`, `OutputNode`) : Basés sur les composants unifiés.
*   **`ActionFormEditor`** : Gestionnaire complexe des actions `onSuccess`/`onFailure`.
*   **`ExpressionInput`** : Input intelligent avec autocomplétion pour la syntaxe `$steps...`.

**Documentation & Présentation Spécifique (`/components/arazzo`) :**
Ces composants transforment les objets techniques Arazzo en composants UI lisibles. Ils sont massivement utilisés dans les vues **Documentation**, **Overview** et **Intro**.
*   **`SchemaViewer`** : Visualisation récursive et interactive des JSON Schemas (utilisé pour les `inputs`, `outputs` et `requestBody`).
*   **`WorkflowList` / `SourceDescriptionsList`** : Composants de haut niveau pour lister et naviguer dans la spec.
*   **`ActionList` / `CriterionBadge`** : Affichage granulaire des conditions de succès et des flux logiques.
*   **`ArazzoSpecHeader`** : En-tête standardisé affichant les métadonnées de la spec.

### C. Primitives (UI Library / Design System)
*   **`Badge`** : Composant hautement configurable utilisé pour les méthodes HTTP, les statuts et les types (20+ variants).
*   **`Card` / `PropertyList`** : Conteneurs de base assurant la cohérence visuelle.
*   **`EditableField` / `EditableListItem`** : Briques de base pour l'édition "in-place" dans tout le builder.

---

## 5. Patterns Remarquables

### "Canvas as a Projection"
Le canvas n'est pas l'état source. Il est recalculé à la volée via un `parser` (`arazzo-parser.ts`) qui transforme le JSON Arazzo en `Nodes` et `Edges` compatibles React Flow.

### "Normalization on-the-fly"
Bien que la spec Arazzo soit imbriquée, le Reducer traite les entités de manière atomique pour garantir l'intégrité référentielle (ex: suppression en cascade lors de la suppression d'un workflow).

---

## 6. Analyse de Performance
*   **Optimisation du rendu** : Utilisation intensive de `useMemo` pour les calculs de diagrammes Mermaid et les transformations de nodes React Flow.
*   **Code Splitting** : Chargement dynamique (`next/dynamic`) pour les composants lourds (Monaco, Mermaid) pour un TTI (Time To Interactive) rapide.

---

## 7. Recommandations Future
1.  **Undo/Redo Stack** : Facile à implémenter grâce au pattern Reducer actuel.
2.  **Worker-based Layout** : Déporter les calculs ELK.js dans un Web Worker pour zéro freeze sur les gros graphes.
3.  **Local Storage Sync** : Persistance automatique du draft current workflow.
