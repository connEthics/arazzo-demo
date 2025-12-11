# 🎯 Arazzo Demo - Backlog

## 📋 Légende
- ✅ Done
- 🔲 To Do
- 🚧 In Progress

---

## 🏁 Phase 1 - Core DX

### Enrichissement des Specs
| Status | Feature | Description |
|--------|---------|-------------|
| ✅ | Définitions requêtes/réponses | Schémas JSON avec `components.schemas` |
| ✅ | Exemples payloads | Exemples concrets avec `x-examples` et `example` |
| ✅ | Cas 200/400/409 | Succès + erreurs documentés |
| ✅ | Branches conditionnelles | `onSuccess`, `onFailure` avec criteria |
| ✅ | Skip de step | Cas "client existe déjà" avec `x-skip` |

#### ✨ Fonctionnalités avancées implémentées :
- **Pet Store Advanced** : 
  - Authentication avec gestion 401
  - Retry sur 404 (pet not found)
  - Branching coupon/no-coupon
  - Gestion 409 (pet already sold)
  
- **E-Commerce Advanced** :
  - Détection "customer exists" avant création
  - 409 Conflict avec retry automatique
  - Sync multi-système (Magento→Stripe→Salesforce)
  - Rate limit handling (429) avec retry
  - Idempotency keys pour Stripe

### Refactoring Code v2
| Status | Feature | Description |
|--------|---------|-------------|
| ✅ | Exemples externalisés | Fichiers YAML séparés dans `workflows/` |
| ✅ | Chargement async | `fetch()` pour charger les exemples |
| ✅ | Vue Interactive supprimée | Simplification (Mermaid + Data Flow uniquement) |
| ✅ | CSS Custom Properties | Design tokens pour thème cohérent |
| ✅ | Architecture modulaire | Séparation claire des responsabilités |
| ✅ | Échappement HTML | Sécurité contre XSS |

### Visualisations Essentielles
| Status | Feature | Description |
|--------|---------|-------------|
| 🔲 | 📊 Sequence Diagram | Vue Mermaid (Magento → Stripe → Salesforce) |
| 🔲 | 🎨 Schema Viewer | Afficher les schémas JSON au clic |
| 🔲 | 🔗 Validateur de références | Détecter les $steps.xxx invalides |

---

## 🏁 Phase 2 - Simulation & Debug

| Status | Feature | Description |
|--------|---------|-------------|
| 🔲 | ▶️ Mode Step-by-step | Simuler l'exécution avec mock data |
| 🔲 | 🚦 Success Criteria Checker | Visualiser conditions passent/échouent |
| 🔲 | 🔍 Expression Evaluator | Tester les expressions $steps.xxx en live |
| 🔲 | 📝 Mock Response Editor | Modifier les réponses simulées |

---

## 🏁 Phase 3 - Export & Partage

| Status | Feature | Description |
|--------|---------|-------------|
| 🔲 | 📄 Export Markdown | Documentation auto-générée |
| 🔲 | 🔗 Share URL | Encoder la spec dans l'URL |
| 🔲 | 📸 Export PNG/SVG | Exporter les diagrammes |
| 🔲 | 💻 Code Gen | Générer du code (cURL, Python, JS) |

---

## 🏁 Phase 4 - UX & Polish

### Validation
| Status | Feature | Description |
|--------|---------|-------------|
| 🔲 | ✅ Validateur temps réel | Erreurs syntaxe Arazzo surlignées |
| 🔲 | ⚠️ Warnings | Outputs non utilisés, steps orphelins |

### Visualisations Avancées
| Status | Feature | Description |
|--------|---------|-------------|
| 🔲 | 🌲 Branches conditionnelles | Chemins success/failure en arbre |
| 🔲 | ⏱️ Timeline View | Vue chronologique avec temps estimé |

### UX Améliorée
| Status | Feature | Description |
|--------|---------|-------------|
| 🔲 | 📁 Drag & Drop | Importer fichiers .yaml/.json |
| 🔲 | 🔎 Search | Rechercher steps/expressions |
| 🔲 | 📌 Bookmarks | Marquer steps importants |
| 🔲 | 🌙 Dark/Light mode | Toggle de thème |