const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());

// Helper: hash password (simple, not for production)
const crypto = require('crypto');

function hashPassword(pw) {
    return crypto.createHash('sha256').update(pw).digest('hex');
}

// Initialize SQLite database
const db = new sqlite3.Database('comments.db', (err) => {
    if (err) {
        console.error('Could not connect to database', err);
    } else {
        // Comments for photos
        db.run(`CREATE TABLE IF NOT EXISTS comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            photo TEXT NOT NULL,
            comment TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
        // Users for chat login
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            created DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
        // Chat messages
        db.run(`CREATE TABLE IF NOT EXISTS chat (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            message TEXT NOT NULL,
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


// --- LOGIN ENDPOINT ---
// POST /api/login { username, password }
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }
    const pwHash = hashPassword(password);
    // Try to find user
    db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
        if (err) return res.status(500).json({ error: 'DB error' });
        if (!user) {
            // Register new user
            db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, pwHash], function(err) {
                if (err) return res.status(500).json({ error: 'Registration failed' });
                return res.json({ success: true, registered: true });
            });
        } else {
            // Check password
            if (user.password === pwHash) {
                return res.json({ success: true });
            } else {
                return res.status(403).json({ error: 'Incorrect password' });
            }
        }
    });
});

// --- CHAT ENDPOINTS ---
// GET /api/chat (returns all messages)
app.get('/api/chat', (req, res) => {
    db.all('SELECT username, message, timestamp FROM chat ORDER BY timestamp ASC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'DB error' });
        res.json(rows);
    });
});

// POST /api/chat { username, message }
app.post('/api/chat', (req, res) => {
    const { username, message } = req.body;
    if (!username || !message) {
        return res.status(400).json({ error: 'Username and message required' });
    }
    db.run('INSERT INTO chat (username, message) VALUES (?, ?)', [username, message], function(err) {
        if (err) return res.status(500).json({ error: 'DB error' });
        res.json({ success: true });
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});