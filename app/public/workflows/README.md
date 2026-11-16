# Exemples Arazzo 1.1.0 — ConnEthics

Ce dossier rassemble des documents Arazzo **1.1.0** concrets, valides et exécutables. Ils accompagnent l'extension VS Code, le Studio web et le site ConnEthics.

Chaque exemple est un dossier autonome :
- le document `.arazzo.yaml` (`arazzo: 1.1.0`, `$self` sur `https://arazzo.connethics.com/workflows/…`) ;
- ses sources stub : `openapi.yaml` en OpenAPI 3.1, et `asyncapi.yaml` en AsyncAPI 3.0 si besoin ;
- `inputs.json` ;
- un `README.md` qui donne le scénario, le schéma Mermaid, les fonctionnalités 1.1, les commandes et le **résultat réellement observé**.

Toutes les `url` des `sourceDescriptions` sont relatives.

## Index

| Exemple | Scénario | Nouveautés 1.1 mises en avant | Exécution vérifiée le 16/11/2026 |
|---|---|---|---|
| [`mcp-travel-booking/`](mcp-travel-booking/README.md) | Agent de voyage : `quote_trip` (lecture seule), puis confirmation humaine, puis `book_trip` (réservation, paiement, confirmation, compensations) + `mcp-tools.json` | `$self`, critères `simple` entre expressions, failure action réutilisable ; pattern « 1 workflow = 1 outil MCP » | ✅ Prism + Respect : 2 workflows, 9 étapes, 46 contrôles ; cas négatif budget ✅ ; arazzo-cli ✅ |
| [`mcp-support-refund/`](mcp-support-refund/README.md) | Copilote support : éligibilité, puis remboursement HTTP, puis `refund.issued` (AsyncAPI `send`) + `mcp-tools.json` | source `asyncapi`, étape `channelPath` + `action: send`, garde-fous `successCriteria` + `onFailure: end` | ✅ Respect (partie HTTP) ; ✅ Specmatic + Kafka : 6/6 étapes dont `send`, sur copie adaptée |
| [`e2e-order-to-cash/`](e2e-order-to-cash/README.md) | Commande HTTP, puis attente de `order.confirmed`, puis paiement, puis facture ∥ expédition, puis clôture | `action: receive`, `correlationId`, `timeout: 6000`, `dependsOn` (éventail et jonction), Selector Object JSONPath `rfc9535` et JSON Pointer | ✅ arazzo-cli + Kafka (producteur scripté et Microcks) ; cas négatif timeout ✅ ; Respect : HTTP seulement |
| [`e2e-session-renewal/`](e2e-session-renewal/README.md) | 401, puis failure action `retry` qui appelle `renewSession` avec `parameters`, puis rejeu ; cas négatif explicite | `parameters` d'action, `retryLimit`/`retryAfter`, `in: querystring` | ✅ Prism + Respect : 3 workflows, 4 étapes, 20 contrôles ; scénario expiré (2 renouvellements, échec attendu) ✅ ; arazzo-cli ✅ |
| [`e2e-onboarding-entreprise-fr/`](e2e-onboarding-entreprise-fr/README.md) | Onboarding B2B : SIREN (stub de type INPI/SIRENE), puis KYC, puis compte, puis webhook `account.created` | `send` (webhook HTTP AsyncAPI), étape `workflowId` + `parameters`, interpolation `{…}`, descriptions FR | ✅ Prism + Respect (partie HTTP : 3 étapes, 16 contrôles) ; webhook : aucun runner |

Les deux documents historiques restent à la racine, car le builder charge `/workflows/pet-adoption.arazzo.yaml` :

| Fichier | Migration 1.0.1 → 1.1.0 |
|---|---|
| [`pet-adoption.arazzo.yaml`](pet-adoption.arazzo.yaml) | `arazzo: 1.1.0` et `$self` ; `url` corrigée (`../openapi/petstore.yaml`) ; `components.schemas`, non standard, déplacé en `x-schemas` ; `outputs` d'actions déplacés en `x-outputs` ; expressions en JSON Pointer (`$response.body#/token`) et interpolations `Bearer {$steps…}` ; sorties littérales retirées ; trois opérations absentes de `petstore.yaml` remplacées par des opérations existantes ; critère XPath sur du JSON retiré ; **`sendConfirmation` se termine par `onSuccess: end`** (il enchaînait sur `endWithError`). Le fichier reste sans Selector ni Expression Type Object, car le builder actuel ne sait pas les afficher (lot A1). |
| [`ecommerce-onboarding.arazzo.yaml`](ecommerce-onboarding.arazzo.yaml) | `arazzo: 1.1.0` et `$self` ; `operationId` qualifiés `$sourceDescriptions.<source>.<op>` (obligatoire avec 3 sources) ; `description` de source déplacée en `x-description` ; `x-schemas` ; filtres JSONPath « Goessner » réécrits en **Selector Objects RFC 9535** ; JSON Pointer et interpolations ; transitions manquantes ajoutées (`createMagentoCustomer` → Stripe, `createStripeCustomer` → Salesforce, `end` après vérification et après log d'erreur) ; `retryAfter: 1000` → `1` (secondes). |

## Validation (16/11/2026)

Pour les **7** documents `.arazzo.yaml` :

- **JSON Schema officiel 1.1** (`https://spec.openapis.org/arazzo/1.1/schema/2026-04-15`), avec Python `jsonschema` 4.26 (Draft 2020-12) : **0 erreur**.
- **Règles sémantiques §c de R1**, par un script de contrôle : **0 erreur**. Les règles couvertes :
  - unicité des `workflowId`, `stepId`, noms de sources et noms d'actions ;
  - cibles `goto`/`retry` (`stepId`, `workflowId`) existantes ;
  - `dependsOn` résolus et sans cycle, dépendances implicites `$steps…` incluses ;
  - `$steps`/`$inputs`/`$components`/`$workflows` résolus ;
  - `operationId` qualifiés avec plusieurs sources et résolus dans les stubs ;
  - format et type de source de `channelPath` ;
  - `action`/`correlationId` réservés à AsyncAPI ;
  - `querystring` exclusif de `query` ;
  - `parameters` d'action avec `workflowId`, sans `in`, conformes aux `inputs` cibles.
- **`npx @redocly/cli@2.79.0 lint`** : **0 erreur et 0 avertissement** sur les 7 documents Arazzo et les 5 OpenAPI. Les 4 AsyncAPI (dont la variante Microcks) ont 0 erreur et 1 avertissement `security-defined` chacun. Une `security: []` d'opération ferait taire cet avertissement, mais arazzo-cli la refuse.
- **`arazzo-cli validate`** (0.9.0, copies sans `$self`) : 3 exemples sur 5 sont valides. `mcp-support-refund` et `e2e-onboarding-entreprise-fr` sont refusés à cause de leur étape `send`, qu'arazzo-cli ne prend pas en charge : c'est une limite du runner, pas du document.
- **`mcp-tools.json`** (2 fichiers) : 0 erreur aux règles MCP001–MCP007 de R3. Le `digest` vaut le SHA-256 du document Arazzo, ce qui permet de détecter la dérive.

## Runners et versions épinglées (recette R4)

| Besoin | Outil | Version |
|---|---|---|
| Mock HTTP | Stoplight Prism | `@stoplight/prism-cli@5.16.0` |
| Runner HTTP, lint | Redocly CLI (Respect) | `@redocly/cli@2.79.0` |
| `receive` Kafka (open source, JUnit natif) | arazzo-cli (strefethen) | v0.9.0, construit depuis les sources |
| `send` Kafka | Specmatic Arazzo (commercial, essai embarqué) | `specmatic/enterprise:1.29.2` |
| Broker / mock d'événements | Kafka / Microcks uber + async-minion | `apache/kafka:3.9.1` / `1.16.0` |

À retenir (mesuré) :
- Seuls les critères **`simple` + JSON Pointer** sont portables.
- Les **Selector Objects ne sont pas évalués par Respect 2.79** : c'est un faux positif silencieux. Ils ne figurent donc qu'en sortie, dans `e2e-order-to-cash` et `ecommerce-onboarding`.
- **Aucun runner open source n'exécute `action: send`.**
- arazzo-cli résout les `url` relatives contre `$self` (§5.6.1) : il s'exécute sur une copie de travail sans `$self`.

## CI

[`ci/arazzo-e2e.yml.example`](ci/arazzo-e2e.yml.example) est un modèle GitHub Actions, à copier dans `.github/workflows/`. Il contient :
- le lint et le schéma 1.1 ;
- une matrice HTTP Prism + Respect, avec 4 cas nominaux et 2 cas négatifs qui doivent échouer ;
- un job `receive` Kafka + arazzo-cli ;
- un job `send` Specmatic optionnel (`continue-on-error`).

La matrice HTTP a été rejouée localement, commande par commande : 6 cas sur 6 conformes à l'attendu. Les jobs asynchrones reprennent les commandes exécutées à la main, mais n'ont pas tourné dans GitHub Actions. [`ci/respect-to-junit.mjs`](ci/respect-to-junit.mjs) convertit la sortie JSON de Respect en JUnit.
