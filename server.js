const express = require('express');
const fs = require('fs');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname));

const logFile = path.join(__dirname, 'stats.csv');

// Initialize CSV with header if it doesn't exist
if (!fs.existsSync(logFile)) {
    fs.writeFileSync(logFile, 'Timestamp,EventType,Detail\n');
}

function logEvent(type, detail = '') {
    const timestamp = new Date().toISOString();
    const line = `${timestamp},${type},${detail}\n`;
    fs.appendFileSync(logFile, line);
}

// API Endpoints
app.post('/api/visit', (req, res) => {
    logEvent('VISIT');
    res.json({ success: true });
});

app.post('/api/click', (req, res) => {
    const { photoName } = req.body;
    if (!photoName) return res.status(400).json({ error: 'Photo name is required' });
    
    logEvent('CLICK', photoName);
    res.json({ success: true });
});

app.get('/api/stats', (req, res) => {
    // Basic stats overview for convenience
    try {
        const data = fs.readFileSync(logFile, 'utf8');
        const lines = data.trim().split('\n').slice(1); // skip header
        const visits = lines.filter(l => l.includes(',VISIT,')).length;
        const clicks = {};
        lines.filter(l => l.includes(',CLICK,')).forEach(l => {
            const photo = l.split(',')[2];
            clicks[photo] = (clicks[photo] || 0) + 1;
        });
        const topClicks = Object.entries(clicks)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([photo_name, count]) => ({ photo_name, count }));

        res.json({ visits, topClicks });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
