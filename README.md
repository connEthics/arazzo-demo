# 🎭 Arazzo Visualizer

Interactive visualizer for [Arazzo](https://spec.openapis.org/arazzo/latest.html) specifications - the OpenAPI standard for API workflow orchestration.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue?logo=typescript)
![React Flow](https://img.shields.io/badge/React_Flow-12-purple)
![Mermaid](https://img.shields.io/badge/Mermaid-11-pink)
![License](https://img.shields.io/badge/License-MIT-green)

## 🚀 Demo

👉 **[arazzo.connethics.com](https://arazzo.connethics.com)**

## ✨ Features

### Visualization Modes
- 🔄 **Interactive Flow View** - Drag, zoom, and explore workflow nodes with React Flow + ELK.js auto-layout
- 📊 **Mermaid Flowchart** - Flowchart diagrams with conditional paths
- 🔀 **Sequence Diagrams** - Visualize API interactions between actors with request/response flows
- 🏊 **Swimlane View** - Actor-based lanes showing event exchanges between API sources
- 📖 **Documentation View** - Comprehensive workflow documentation with step details

### Editor & Export
- 📄 **Live YAML Editor** - Monaco-powered editor with syntax highlighting
- 📋 **Copy to Clipboard** - One-click Mermaid syntax export for all diagram types
- 🌙 **Dark/Light Mode** - Theme toggle for comfortable viewing

### Interactivity
- 🎯 **Step Details** - Click any step to see parameters, inputs, outputs, and success criteria
- 🔗 **Clickable Nodes** - Input/Output nodes open workflow details panel
- ↔️ **Layout Toggle** - Switch between horizontal and vertical flow layouts
- 📁 **Example Workflows** - Pet Store adoption demo included

## 🏃 Quick Start

### Prerequisites

- Node.js 22.x or higher
- npm or yarn

### Development

```bash
# Clone the repository
git clone https://github.com/connEthics/arazzo-demo.git
cd arazzo-demo/app

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
cd app
npm run build
npm start
```

## 📁 Project Structure

```
arazzo-demo/
├── app/                        # Next.js application
│   ├── src/
│   │   ├── app/               # App router pages
│   │   │   ├── builder/       # Main visualizer page
│   │   │   └── showcase/      # Demo showcase
│   │   ├── components/        # React components
│   │   │   ├── ArazzoFlow.tsx        # React Flow + ELK.js visualization
│   │   │   ├── MermaidDiagram.tsx    # Mermaid rendering with click handling
│   │   │   ├── DetailDrawer.tsx      # Step details side panel
│   │   │   ├── DocumentationView.tsx # Full documentation renderer
│   │   │   └── nodes/                # Custom React Flow nodes
│   │   ├── lib/               # Core logic
│   │   │   ├── arazzo-parser.ts      # YAML parsing & flow conversion
│   │   │   ├── mermaid-converter.ts  # Flowchart & sequence generation
│   │   │   └── swimlane-converter.ts # Swimlane diagram generation
│   │   └── types/             # TypeScript definitions
│   └── public/
│       ├── workflows/         # Example Arazzo specs (.yaml)
│       └── openapi/           # Example OpenAPI specs
├── workflows/                 # Additional workflow examples
├── openapi/                   # Additional OpenAPI specs
└── README.md
```

## 🚀 Deploy to Vercel

### One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/connEthics/arazzo-demo)

### Manual Deploy

1. Fork this repository
2. Import to [Vercel](https://vercel.com/new)
3. Set root directory to `app`
4. Deploy!

The `vercel.json` in the root configures:
- YAML files in `/workflows` are served with correct Content-Type headers

**Note:** When importing to Vercel, set the root directory to `app` in the project settings.

## 📝 Adding Your Own Workflows

1. Add your Arazzo YAML file to `app/public/workflows/`
2. Optionally add OpenAPI specs to `app/public/openapi/`
3. Your workflow will appear in the examples dropdown

### Arazzo Spec Structure

```yaml
arazzo: 1.0.1
info:
  title: My Workflow
  version: 1.0.0

sourceDescriptions:
  - name: myApi
    type: openapi
    url: /openapi/my-api.yaml

workflows:
  - workflowId: my-workflow
    summary: Description of workflow
    inputs:
      type: object
      properties:
        inputParam:
          type: string
    steps:
      - stepId: step-1
        operationId: myApi.operation
        parameters:
          - name: param
            in: query
            value: $inputs.inputParam
        successCriteria:
          - condition: $statusCode == 200
        outputs:
          result: $response.body.data
```

## 📦 Open Source Components

This project is built with the following open source libraries:

| Component | Version | License | Description |
|-----------|---------|---------|-------------|
| [Next.js](https://nextjs.org/) | 16.0.9 | MIT | React framework for production |
| [React](https://react.dev/) | 19.2.1 | MIT | UI component library |
| [@xyflow/react](https://reactflow.dev/) | 12.10.0 | MIT | Interactive node-based diagrams |
| [ELK.js](https://github.com/kieler/elkjs) | 0.11.0 | EPL-2.0 | Eclipse Layout Kernel for automatic graph layout |
| [Mermaid](https://mermaid.js.org/) | 11.12.2 | MIT | Diagram and flowchart generation |
| [Monaco Editor](https://microsoft.github.io/monaco-editor/) | 4.7.0 | MIT | VS Code's code editor |
| [js-yaml](https://github.com/nodeca/js-yaml) | 4.1.1 | MIT | YAML parser and serializer |
| [react-markdown](https://github.com/remarkjs/react-markdown) | 10.1.0 | MIT | Markdown renderer for React |
| [Tailwind CSS](https://tailwindcss.com/) | 4.x | MIT | Utility-first CSS framework |
| [TypeScript](https://www.typescriptlang.org/) | 5.x | Apache-2.0 | Typed JavaScript |

## 📚 Resources

- [Arazzo Specification](https://spec.openapis.org/arazzo/latest.html)
- [OpenAPI Initiative](https://www.openapis.org/)
- [React Flow Documentation](https://reactflow.dev/)
- [Mermaid Documentation](https://mermaid.js.org/)
- [ELK.js Documentation](https://eclipse.dev/elk/)

## 📄 License

This project has a **dual license** structure:

### 📋 Main Project - Proprietary License

The main codebase is **open source but not free to use**. All rights are reserved by connEthics.

- ✅ You may **view and study** the source code for educational purposes
- ❌ You may **NOT** use, copy, modify, or distribute without explicit authorization
- 📧 For licensing inquiries: [connethics.com](https://connethics.com)

👉 See the full license terms in [LICENSE.md](LICENSE.md)

### 🆓 Arazzo Components - MIT License

The components in [`app/src/components/arazzo/`](app/src/components/arazzo/) are released under the **MIT License** and are free to use:

- `ActionList.tsx` - Displays onSuccess/onFailure actions
- `ArazzoSpecHeader.tsx` - Spec info header display
- `CriterionBadge.tsx` - Success/failure criteria badges
- `DependsOnList.tsx` - Step dependencies visualization
- `PayloadReplacements.tsx` - Request body replacement display
- `ReusableRef.tsx` - Component reference display
- `SchemaViewer.tsx` - JSON Schema viewer
- `SourceDescriptionsList.tsx` - API source descriptions
- `WorkflowList.tsx` - Workflow listing component
- `index.ts` - Component exports

**Conditions:**
- Include a link to the original project: https://github.com/connEthics/arazzo-demo
- Include the MIT License notice

👉 See the MIT license in [app/src/components/arazzo/LICENSE](app/src/components/arazzo/LICENSE)

### Third-Party Dependencies

This project uses open source dependencies with the following licenses:
- **MIT License**: Next.js, React, React Flow, Mermaid, Monaco Editor, js-yaml, react-markdown, Tailwind CSS
- **EPL-2.0**: ELK.js
- **Apache-2.0**: TypeScript

---

<p align="center">
  Made with ❤️ by <a href="https://connethics.com">connethics.com</a>
  <br><br>
  <a href="https://github.com/connEthics/arazzo-demo">
    <img src="https://img.shields.io/badge/GitHub-View_Source-black?logo=github" alt="GitHub">
  </a>
</p>
