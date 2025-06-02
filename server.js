const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());

// Initialize SQLite database
const db = new sqlite3.Database('comments.db', (err) => {
    if (err) {
        console.error('Could not connect to database', err);
    } else {
        db.run(`CREATE TABLE IF NOT EXISTS comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            photo TEXT NOT NULL,
            comment TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
    }
});

// Get comments for a photo
app.get('/api/comments/:photo', (req, res) => {
    const photo = req.params.photo;
    db.all('SELECT id, comment, timestamp FROM comments WHERE photo = ? ORDER BY timestamp DESC', [photo], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});

// Add a comment to a photo
app.post('/api/comments/:photo', (req, res) => {
    const photo = req.params.photo;
    const { comment } = req.body;
    if (!comment) {
        return res.status(400).json({ error: 'Comment is required' });
    }
    db.run('INSERT INTO comments (photo, comment) VALUES (?, ?)', [photo, comment], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json({ id: this.lastID, comment, timestamp: new Date().toISOString() });
        }
    });
});


// Add a route to delete a comment with PIN verification
app.delete('/api/comments/:id', (req, res) => {
    const id = req.params.id;
    const { pin } = req.body;
    if (pin !== '1234') {
        return res.status(403).json({ error: 'Invalid PIN' });
    }
    db.run('DELETE FROM comments WHERE id = ?', [id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
        } else if (this.changes === 0) {
            res.status(404).json({ error: 'Comment not found' });
        } else {
            res.json({ success: true });
        }
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
