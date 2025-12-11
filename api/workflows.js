const fs = require('fs');
const path = require('path');

module.exports = (req, res) => {
    const workflowsDir = path.join(process.cwd(), 'public', 'workflows');
    
    try {
        const files = fs.readdirSync(workflowsDir)
            .filter(f => f.endsWith('.yaml') || f.endsWith('.yml'))
            .map(f => ({
                name: f.replace('.arazzo.yaml', '').replace('.yaml', ''),
                path: `/workflows/${f}`
            }));
        
        res.status(200).json({ workflows: files });
    } catch (err) {
        res.status(500).json({ error: 'Could not read workflows directory' });
    }
};
