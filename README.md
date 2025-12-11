# 🎭 Arazzo Visualizer

Visualiseur interactif pour les spécifications [Arazzo](https://spec.openapis.org/arazzo/latest.html) - le standard OpenAPI pour l'orchestration de workflows API.

## 🚀 Démo

👉 **[arazzo-demo.vercel.app](https://arazzo-demo.vercel.app)**

## ✨ Fonctionnalités

- 📊 **Diagramme Mermaid** - Vue flowchart des workflows
- 📁 **Exemples inclus** - Pet Store & E-Commerce avancés

## 🏃 Lancer en local

```bash
npm install
npm start
# → http://localhost:3000
```

## 📁 Structure

```
public/
├── workflows/          # Specs Arazzo (.yaml)
├── openapi/            # Specs OpenAPI
└── *.html              # Visualiseur
api/                    # Serverless functions
```

## 📚 Ressources

- [Arazzo Specification](https://spec.openapis.org/arazzo/latest.html)
- [OpenAPI Initiative](https://www.openapis.org/)