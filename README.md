# 🎭 Arazzo Visualizer

Interactive visualizer for [Arazzo](https://spec.openapis.org/arazzo/latest.html) specifications - the OpenAPI standard for API workflow orchestration.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue?logo=typescript)
![React Flow](https://img.shields.io/badge/React_Flow-12-purple)
![Mermaid](https://img.shields.io/badge/Mermaid-11-pink)

## 🚀 Demo

👉 **[arazzo-demo.vercel.app](https://arazzo-demo.vercel.app)**

## ✨ Features

- 🔄 **Interactive Flow View** - Drag, zoom, and explore workflow nodes with React Flow
- 📊 **Mermaid Flowchart** - Export-ready flowchart diagrams
- 🔀 **Sequence Diagrams** - Visualize API interactions between actors
- 📋 **Copy to Clipboard** - One-click Mermaid syntax export
- 🌙 **Dark/Light Mode** - Easy on the eyes
- 📱 **Responsive** - Works on desktop and mobile
- 🎯 **Step Details** - Click any step to see parameters, inputs, outputs
- 📄 **Live YAML Editor** - Edit and visualize in real-time
- 📁 **Example Workflows** - Pet Store & E-Commerce onboarding demos

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
│   │   ├── components/        # React components
│   │   │   ├── ArazzoFlow.tsx        # React Flow visualization
│   │   │   ├── MermaidDiagram.tsx    # Mermaid rendering
│   │   │   ├── DetailDrawer.tsx      # Step details panel
│   │   │   └── OpenApiDetails.tsx    # OpenAPI operation view
│   │   ├── lib/               # Core logic
│   │   │   ├── arazzo-parser.ts      # YAML parsing & flow conversion
│   │   │   └── mermaid-converter.ts  # Mermaid syntax generation
│   │   └── types/             # TypeScript definitions
│   └── public/
│       ├── workflows/         # Example Arazzo specs (.yaml)
│       └── openapi/           # Example OpenAPI specs
├── vercel.json                # Vercel deployment config
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
- `rootDirectory`: Points to the Next.js app in `/app`
- YAML files in `/workflows` are served with correct Content-Type headers

## 📝 Adding Your Own Workflows

1. Add your Arazzo YAML file to `app/public/workflows/`
2. Optionally add OpenAPI specs to `app/public/openapi/`
3. Your workflow will appear in the examples dropdown

### Arazzo Spec Structure

```yaml
arazzo: 1.0.0
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

## 📚 Resources

- [Arazzo Specification](https://spec.openapis.org/arazzo/latest.html)
- [OpenAPI Initiative](https://www.openapis.org/)
- [React Flow Documentation](https://reactflow.dev/)
- [Mermaid Documentation](https://mermaid.js.org/)

## 📄 License

MIT © [connEthics](https://github.com/connEthics)
