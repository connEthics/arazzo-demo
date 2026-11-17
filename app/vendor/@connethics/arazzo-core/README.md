# @connethics/arazzo-core

Toolkit TypeScript pour les documents [Arazzo](https://spec.openapis.org/arazzo/v1.1.0.html) **1.1.x**, rétrocompatible **1.0.x** :

- **types** complets de la spécification 1.1 (AsyncAPI, `dependsOn`, Selector, Expression Type, `$self`, `querystring`…) ;
- **parsing** YAML/JSON avec positions sources (`parseArazzo`, `locate`) ;
- **validation en 2 couches** : schémas JSON **officiels** 1.0 et 1.1 (Ajv 2020-12, précompilés) + **règles sémantiques** (table § c de `01-spec-delta-1.1.md`), avec codes de règle, chemins JSON et sévérités, **sans doublon** ;
- **modèle de graphe** indépendant du moteur de rendu (`workflowToGraph`) et export **Mermaid** (`graphToMermaid`).

Aucune dépendance UI ni Node : le paquet tourne dans Node ≥ 18, un navigateur et un webview VS Code. Les validateurs Ajv sont **générés au build** (mode *standalone*) : pas de `new Function` à l'exécution, donc compatible avec une CSP stricte. Seule dépendance d'exécution : [`yaml`](https://eemeli.org/yaml/) v2.

Licence : MIT © 2026 ConnEthics. Les schémas de `schemas/` sont ceux de l'OpenAPI Initiative (Apache-2.0).

## Installation

Dans le workspace `arazzo-demo` : `"@connethics/arazzo-core": "*"` (npm workspaces).
Ailleurs (arazzo-vscode, website) : copie versionnée via `node scripts/sync-shared.mjs arazzo-core <repo>`, vérifiable en CI avec `--check` (voir plus bas).

## Démarrage rapide

```ts
import { validateText, workflowToGraph, graphToMermaid } from '@connethics/arazzo-core';

const { doc, isArazzo, version, errors, diagnostics } = validateText(yamlText);
// errors      : erreurs de syntaxe YAML ({ code: 'yaml-syntax', message, range })
// diagnostics : [{ code, message, severity, path, range, source }]

for (const d of diagnostics) {
  console.log(`${d.severity} ${d.code} ${d.path.join('.')} — ${d.message}`);
}

const graph = workflowToGraph(doc, 'orderToCash');
console.log(graphToMermaid(graph, { lanes: true }));
```

## API

### Parsing

```ts
parseArazzo(text: string): {
  doc: ArazzoDocument | undefined; // valeur JS
  yamlDoc: Document.Parsed;        // document `yaml` (positions)
  errors: ParseError[];            // syntaxe YAML, clés dupliquées
  version: string | null;          // champ `arazzo`
  isArazzo: boolean;               // racine = mapping avec une clé `arazzo`
}

locate(yamlDoc, ['workflows', 0, 'steps', 2, 'operationId'])
// → { start, end, exact, key?, value? } (offsets). Chemin absent → ancêtre le plus proche, exact: false.
diagnosticRange(yamlDoc, path, preferKey?) // plage compacte pour un diagnostic
createLineIndex(text)(offset)              // → { line, character } (0-based)
pointerToPath('/workflows/0') / pathToPointer(['workflows', 0])
```

Côté VS Code : `new vscode.Range(doc.positionAt(d.range.start), doc.positionAt(d.range.end))`.

### Validation

```ts
validate(doc: unknown, opts?: {
  yamlDoc?: Document;      // ajoute `range` aux diagnostics et les trie par position
  minSeverity?: 'error' | 'warning' | 'info' | 'hint';
  skipSchema?: boolean;
  skipSemantic?: boolean;
}): Diagnostic[]

validateText(text, opts?) // parseArazzo + validate

interface Diagnostic {
  code: RuleId;                       // ex. 'arazzo-step-target-exclusive'
  message: string;
  severity: 'error' | 'warning' | 'info' | 'hint';
  path: (string | number)[];          // peut viser un champ manquant
  range?: { start: number; end: number };
  source: 'schema' | 'semantic';
}
```

- **Choix du schéma** par la valeur de `arazzo` : `1.0.x` → schéma 1.0 (`2025-10-15`), `1.1.x` → schéma 1.1 (`2026-04-15`). Version inconnue (`2.0.0`, `1.2.0`) → `arazzo-version` (*warning*), seules les règles sémantiques s'appliquent. Version mal formée (`"1.1"`) → `arazzo-version-format`.
- **Erreurs Ajv traduites** : message lisible, code de règle, aucune cascade `oneOf` (unions discriminées, voir « Correctifs de schéma »).
- **Fonctionnalités 1.1 dans un document 1.0.x** : un seul `arazzo-version-feature-mismatch` par occurrence, qui remplace l'erreur brute du schéma 1.0.
- **Garantie** : jamais deux diagnostics avec le même `code` et le même `path`.

`RULES` décrit chaque règle (sévérité par défaut, couche, section de la spec, implémentée ou non). `LEGACY_CODE_MAP` donne la correspondance avec les anciens codes d'arazzo-vscode :

| ancien code | nouveau code |
|---|---|
| `arazzo-mutual-exclusive` | `arazzo-step-target-exclusive` |
| `arazzo-operation-required` | `arazzo-step-target-missing` |
| `arazzo-ref-dependsOn` | `arazzo-workflow-depends-on-resolved` |
| `arazzo-source-type` | `arazzo-source-type-enum` |
| `arazzo-duplicate-stepId` | `arazzo-step-id-unique` |
| `arazzo-version` | `arazzo-version` |

Les messages « Missing required field: X », « X must be an array » et « X must have at least one entry » sont conservés.

### Graphe

```ts
workflowToGraph(doc, workflowId, {
  resolveOperation?: (step, source) => ({ method?, path? }) | undefined,
  includeWorkflowActions?: boolean,   // défaut true (arêtes marquées action.origin = 'workflow')
  includeImplicitFailures?: boolean,  // défaut false
}): { workflowId, workflowIndex, summary?, nodes, edges, groups }
```

`workflowIndex` est la position du workflow dans `workflows` : elle permet de rattacher un diagnostic (`['workflows', workflowIndex, 'steps', step.index, …]`) au nœud correspondant.

- **Nœuds** : `input`, `step-http`, `step-async-send`, `step-async-receive`, `step-workflow`, `join` (`dependsOn` à ≥ 2 dépendances), `output` (terminal de succès quand le workflow a des `outputs`), `end-success`, `end-failure`, `workflow-ref` (cible d'un `goto workflowId`, d'une étape workflow ou d'un `dependsOn` inter-workflow).
- **Arêtes** : `sequence`, `success-goto`, `failure-goto`, `retry` (boucle avec `retryLimit`, défaut 1, et `retryAfter` ; plus une arête `via: true` vers l'étape ou le workflow exécuté avant de rejouer), `end` (`outcome` succès/échec), `depends-on`, `workflow-call`. Chaque arête porte `criteria`, `conditional` et l'action d'origine (nom, `origin: 'step' | 'workflow'`, `component` si elle vient de `$components`).
- **Séquence implicite** (arête `sequence` d'une étape vers la suivante du tableau, ou vers le terminal de succès après la dernière) :
  - une étape **sans** `dependsOn` la reçoit de l'étape précédente ;
  - une action de succès **inconditionnelle** (`goto` ou `end`) la supprime ; une action conditionnelle la laisse en place ;
  - dès qu'une étape déclare `dependsOn`, ses dépendances explicites (arêtes `depends-on`, avec jonction à partir de deux) **remplacent** la séquence entrante, que l'étape précédente soit l'une d'elles ou non. Côté sortant, une étape n'émet donc pas de séquence vers une étape suivante qui déclare `dependsOn` sans la référencer. Deux étapes qui dépendent de la même étape restent ainsi **en parallèle** (éventail facture / expédition de l'exemple order-to-cash) ;
  - exception : si aucune entrée de `dependsOn` n'est résolue (document invalide, signalé par la validation), la séquence est conservée pour ne pas isoler l'étape.
- **Groupes** : un couloir par `sourceDescription` utilisée (ordre du document), un couloir neutre `lane:workflow` (entrées, sorties, fins, jonctions) et `lane:unknown` si la source d'une étape est indéterminable.
- **Méthode HTTP** : lue dans `operationPath` (`…/paths/~1pets/get` → `GET /pets`) ou fournie par `resolveOperation`. Elle n'est **jamais devinée** depuis l'`operationId`.

```ts
graphToMermaid(graph, { direction: 'TB' | 'LR' | 'BT' | 'RL', lanes?: boolean, hideFailures?: boolean }): string
```

### Utilitaires

- Versions : `KNOWN_ARAZZO_VERSIONS`, `isArazzoDocument`, `getArazzoVersion`, `getSupportedMinor`, `isKnownArazzoVersion`.
- Expressions : `parseRuntimeExpression` (ABNF § 5.9), `findEmbeddedExpressions`, `checkJsonPath` (RFC 9535), `checkJsonPointer`, `checkSimpleCondition`, `checkRegex`, `checkXPath`, `isUriReference`.
- Modèle : `resolveStepSource`, `effectiveActions` (actions de l'étape + actions du workflow non surchargées), `resolveParameters`…
- Schémas officiels non modifiés : `ARAZZO_SCHEMA_1_0`, `ARAZZO_SCHEMA_1_1`, et les fichiers `@connethics/arazzo-core/schemas/arazzo-1.x.schema.json`.

## Règles

97 des 105 règles de la table § c sont implémentées (voir `RULES`, qui ajoute le code `arazzo-source-type-enum` et émet `arazzo-version-unknown` sous le code `arazzo-version`). Les 8 autres demandent de charger les documents sources (OpenAPI, AsyncAPI, Arazzo distants) et sont hors du périmètre d'un validateur local au document :

- `arazzo-step-operation-resolved` ;
- `arazzo-step-prefer-operation-id` ;
- `arazzo-async-action-mismatch` ;
- `arazzo-param-resolved` ;
- `arazzo-expression-components-scope` ;
- `arazzo-source-unresolvable` ;
- `arazzo-source-identity` ;
- `arazzo-source-type-mismatch`.

Décisions sur les questions ouvertes de R1 (§ d) :

| § d | Décision |
|---|---|
| 1. `in: channel` | Accepté sur une étape AsyncAPI, avec une *info* (`arazzo-param-in-channel`). C'est une *error* hors AsyncAPI. |
| 2. `PayloadReplacement.value` littéral | Erreur du schéma 1.1 neutralisée. *Info* `arazzo-replacement-literal-value`. |
| 3. `Parameter.value` objet | *Error* `arazzo-migration-param-object-value`, avec un message qui propose de sérialiser l'objet ou d'utiliser un Selector. |
| 5. Format de `channelPath` | *Warning* (`arazzo-channel-path-format`) tant que l'OAI n'a pas publié d'exemple normatif. |
| 7. `action` vs AsyncAPI | Règle non implémentée (elle exige le document source). |
| 8. Cycles `dependsOn` | Les dépendances implicites `$steps.X.outputs` sont incluses. |
| 9. `querystring` | Exclusivité avec `query` (*error*) et unicité (*warning*), contrôlées sur l'ensemble effectif workflow + étape. |
| 10. ETO `jsonpointer` dans un Criterion | *Warning*. |
| 11. Criterion ETO dans le schéma 1.0 | Erreur neutralisée. |
| 12. Grammaire | `$response.body.a.b` (forme courante hors ABNF) donne un *warning* qui suggère `$response.body#/a/b`. Les autres écarts à l'ABNF sont des *errors*. |
| 13. Version ciblée | 1.1.0. Les clarifications DEV qui relâchent une contrainte sont appliquées : #614, #615, #620 (unicité des actions par `name`). |

Autres choix :

- Version inconnue : *warning* `arazzo-version`, qui remplace `arazzo-version-unknown` de R1, pour rester aligné sur l'extension.
- `$message.*` mal placé : signalé par `arazzo-expression-message-context`, et non par `arazzo-async-http-expression` (pas de double emploi).

### Correctifs de schéma (au build, `scripts/gen-validators.mjs`)

Les schémas officiels sont compilés tels quels, à l'exception de ces réécritures :

1. **Unions discriminées** (sans effet sur la validité) : les `oneOf` à branches mutuellement exclusives sont réécrits en `if/then/else`. C'est le cas des trois variantes d'étape 1.1 (`channelPath`/`action` → AsyncAPI, `workflowId` → workflow, sinon OpenAPI), de Parameter/Action vs Reusable, de littéral vs Selector et de chaîne vs Expression Type Object. Les trois motifs de `dependsOn` sont fusionnés en une alternative.
2. **Neutralisation S11** : `PayloadReplacement.value` accepte tout littéral (R1 § d.2, DEV PR #614).
3. **Neutralisation S10** : l'Expression Type Object d'un Criterion est rattaché à `type` (R1 § d.11).

Le format `uri-reference` n'est pas contrôlé par Ajv (pas d'`ajv-formats`) : les règles `arazzo-self-uri-reference` et `arazzo-source-url-uri-reference` le vérifient.

## Développement

```bash
npm install                      # à la racine d'arazzo-demo
npm run build -w packages/arazzo-core   # gen-validators + tsup (ESM + CJS + .d.ts)
npm test -w packages/arazzo-core        # gen + tsc + vitest
```

`src/generated/` est produit par `npm run gen` à partir de `schemas/*.json` (copies des schémas officiels : SHA-256 `b8715bd8…` pour 1.0 et `37be9084…` pour 1.1).

Tests :

- `test/rules.test.ts` : au moins un cas par règle implémentée, et une vérification automatique de la couverture ;
- `test/vscode-fixtures.test.ts` : équivalence avec les tests de l'extension ;
- `test/corpus/*.arazzo.yaml` : documents valides et invalides (en-tête `# valid` ou `# expect: <codes>`) ;
- `test/e1-workflows.test.ts` : exemples de `app/public/workflows`, avec 0 erreur exigée ;
- `test/graph.test.ts` : modèle de graphe.

## Vendoring

```bash
npm run build -w packages/arazzo-core
node scripts/sync-shared.mjs arazzo-core ../arazzo-vscode           # → vendor/@connethics/arazzo-core/ + VENDOR.json
node scripts/sync-shared.mjs --check arazzo-core ../arazzo-vscode   # CI : vérifie les SHA-256
```
