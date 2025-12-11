# Arazzo Visualization Tool

A modern web-based visualization tool for exploring and understanding [Arazzo API workflow specifications](https://www.openapis.org/arazzo-specification). This tool provides an interactive interface to visualize API workflows, understand step dependencies, and explore the workflow structure.

## Features

- 📊 **Visual Workflow Diagrams**: Interactive flow charts showing the sequence and dependencies of API calls
- 📝 **Detailed Step Information**: View comprehensive details about each workflow step including parameters, outputs, and operations
- 📤 **File Upload Support**: Load Arazzo specifications from YAML or JSON files via drag-and-drop or file browser
- ✅ **Validation**: Automatic validation of Arazzo documents against the specification
- 🎨 **Modern UI**: Clean, responsive interface built with Next.js and Tailwind CSS
- 📦 **Example Workflows**: Pre-loaded examples to get started quickly

## What is Arazzo?

Arazzo is an open specification from the OpenAPI Initiative that describes API workflows - ordered sequences of API calls with explicit dependencies and outcomes. While OpenAPI describes individual API endpoints, Arazzo describes how to orchestrate multiple API calls together to accomplish real-world tasks.

## Getting Started

### Prerequisites

- Node.js 18.x or later
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/connEthics/arazzo-demo.git
cd arazzo-demo
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Building for Production

```bash
npm run build
npm start
```

## Usage

### Loading an Example

Click on one of the example buttons on the home page to load a pre-configured Arazzo workflow:
- **User Authentication Workflow**: Demonstrates login and profile retrieval
- **E-commerce Order Workflow**: Shows a complete order placement process

### Uploading Your Own Arazzo File

1. Drag and drop a `.yaml`, `.yml`, or `.json` file onto the upload area, or
2. Click "Browse Files" to select a file from your system

The tool will:
- Parse the Arazzo document
- Validate it against the specification
- Display any validation errors
- Render the workflow visualization and details

### Understanding the Visualization

- **Green Start Node**: Beginning of the workflow
- **Blue Step Nodes**: Individual API operations or sub-workflows
- **Purple End Node**: Completion of the workflow
- **Arrows**: Show the flow and dependencies between steps

## Example Arazzo Files

The `examples/` directory contains sample Arazzo workflows:

- `user-auth.yaml`: User authentication and profile retrieval workflow
- `ecommerce-order.json`: Complete e-commerce order placement workflow

## Technology Stack

- **Next.js 16**: React framework for production
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first CSS framework
- **ReactFlow**: Interactive workflow visualization
- **js-yaml**: YAML parsing support

## Project Structure

```
arazzo-demo/
├── app/                    # Next.js app directory
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Main page component
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── FileUpload.tsx    # File upload component
│   ├── WorkflowVisualizer.tsx  # Flow diagram component
│   └── WorkflowDetails.tsx     # Detailed step information
├── lib/                   # Utility libraries
│   ├── types.ts          # TypeScript type definitions
│   └── parser.ts         # Arazzo parsing and validation
├── examples/             # Sample Arazzo files
│   ├── user-auth.yaml
│   └── ecommerce-order.json
└── public/               # Static assets
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## Resources

- [Arazzo Specification](https://www.openapis.org/arazzo-specification)
- [OpenAPI Initiative](https://www.openapis.org/)
- [Arazzo Specification Documentation](https://spec.openapis.org/arazzo/latest.html)

## Acknowledgments

Built with the Arazzo Specification by the OpenAPI Initiative.