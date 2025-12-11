const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ═══════════════════════════════════════════════════════════════════════════════
// MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════════════════

// CORS headers for YAML files
app.use((req, res, next) => {
    if (req.path.endsWith('.yaml') || req.path.endsWith('.yml')) {
        res.setHeader('Content-Type', 'text/yaml; charset=utf-8');
        res.setHeader('Access-Control-Allow-Origin', '*');
    }
    next();
});

// Cache control
app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'public, max-age=3600');
    next();
});

// ═══════════════════════════════════════════════════════════════════════════════
// STATIC FILES
// ═══════════════════════════════════════════════════════════════════════════════

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

// Root - redirect to visualizer
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Shortcut routes
app.get('/v1', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'arazzo-visualizer.html'));
});

app.get('/v2', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'arazzo-visualizer-v2.html'));
});

// API endpoint to list available workflows
app.get('/api/workflows', (req, res) => {
    const fs = require('fs');
    const workflowsDir = path.join(__dirname, 'public', 'workflows');
    
    try {
        const files = fs.readdirSync(workflowsDir)
            .filter(f => f.endsWith('.yaml') || f.endsWith('.yml'))
            .map(f => ({
                name: f.replace('.arazzo.yaml', '').replace('.yaml', ''),
                path: `/workflows/${f}`
            }));
        res.json({ workflows: files });
    } catch (err) {
        res.status(500).json({ error: 'Could not read workflows directory' });
    }
});

// Health check for Vercel
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ═══════════════════════════════════════════════════════════════════════════════
// START SERVER
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, () => {
    console.log(`🎭 Arazzo Visualizer running at http://localhost:${PORT}`);
    console.log(`   - Visualizer v2: http://localhost:${PORT}/v2`);
    console.log(`   - Visualizer v1: http://localhost:${PORT}/v1`);
    console.log(`   - API Workflows: http://localhost:${PORT}/api/workflows`);
});
