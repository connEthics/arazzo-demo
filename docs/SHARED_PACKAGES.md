# Paquets partagés dans Arazzo Studio (`app/`)

Arazzo Studio consomme les deux paquets ConnEthics du workspace :

- `@connethics/arazzo-core` : types 1.1, parsing YAML, validation (schémas officiels 1.0 / 1.1 et règles sémantiques), modèle de graphe, export Mermaid ;
- `@connethics/arazzo-flow` : composant React `<ArazzoGraph>` / `<ArazzoGraphFromDocument>`, avec le layout ELK dans un Web Worker et son CSS.

## Choix : copie versionnée (vendoring) dans `app/vendor/`

Le déploiement Vercel construit l'application avec **Root Directory = `app`**. Le workspace npm racine (`packages/*`) exclut volontairement `app/`. Vercel installe donc uniquement `app/package.json`, et le `node_modules` racine n'existe pas au build. Une dépendance `"*"` vers le workspace, ou un `file:../packages/...`, ne fonctionnerait pas :

- avec `file:`, npm tente aussi d'installer les dépendances du paquet lié, y compris `@connethics/arazzo-core`, qui n'est pas publié ;
- un chemin hors de `app/` dépend de la façon dont Vercel clone le dépôt.

On applique donc le même mécanisme que pour arazzo-vscode et le site :

```bash
npm run build -w packages/arazzo-core && npm run build -w packages/arazzo-flow
node scripts/sync-shared.mjs arazzo-core app        # → app/vendor/@connethics/arazzo-core/
node scripts/sync-shared.mjs arazzo-flow app        # → app/vendor/@connethics/arazzo-flow/
node scripts/sync-shared.mjs --check arazzo-core app   # CI : SHA-256 de VENDOR.json
node scripts/sync-shared.mjs --check arazzo-flow app
```

Les fichiers `dist/` copiés sont **commités** : `vendor/` n'est pas ignoré par git. Ne les modifiez jamais à la main. Relancez plutôt le script, puis vérifiez avec `--check`.

## Résolution des noms de paquets

Les imports restent `@connethics/arazzo-core`, `@connethics/arazzo-flow` et `@connethics/arazzo-flow/style.css`. Ils sont résolus vers `app/vendor/` à plusieurs endroits :

| Outil | Fichier | Mécanisme |
|---|---|---|
| TypeScript | `app/tsconfig.json` | `paths` vers les dossiers vendored, lus via `types` / `exports` des `package.json`. `vendor/` est exclu de la compilation. |
| Turbopack (`next dev`, `next build`) | `app/next.config.ts` | `turbopack.resolveAlias`, appliqué aussi à l'import de core par le bundle de flow. `turbopack.root` vaut `app/`, pour ne jamais résoudre depuis la racine du dépôt. |
| webpack (`--webpack`) | `app/next.config.ts` | `resolve.alias` (mêmes cibles). |
| Jest | `app/jest.config.js` | `moduleNameMapper` vers `dist/index.cjs` de core. |
| ESLint | `app/eslint.config.mjs` | `vendor/**` ignoré. |

Les dépendances d'exécution de flow sont déclarées dans `app/package.json` : `@xyflow/react` ^12.12, `elkjs` ^0.11 et `html-to-image` pour l'export PNG/SVG. Celles de core se limitent à `yaml` v2.

Le CSS de flow (`@connethics/arazzo-flow/style.css`) est importé par `src/components/StudioGraph.tsx`, l'enveloppe Studio du graphe, qui applique le thème ConnEthics clair ou sombre. Le worker ELK est référencé par `new URL('./elk-worker.js', import.meta.url)` dans le bundle de flow : Turbopack l'émet comme asset statique. En cas d'échec, le layout repasse sur le thread principal.

## Vérification d'un build « propre »

Le build a été vérifié sans `node_modules` à la racine du dépôt, en le déplaçant temporairement : `cd app && npm ci && npm run build`. Rien ne dépend du workspace racine.
