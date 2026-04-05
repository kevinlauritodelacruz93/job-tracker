const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const session = require('express-session');

const app = express();
const db = new sqlite3.Database('./db.sqlite');

// Parse JSON bodies BEFORE routes
app.use(express.json());

// Enable sessions BEFORE routes
app.use(session({
  secret: 'secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false,
    sameSite: 'lax'
  }
}));

// -------------------- LOGIN ROUTE --------------------
app.post('/login', (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  db.get("SELECT id FROM users WHERE email = ?", [email], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });

    if (row) {
      req.session.user_id = row.id;
      console.log("Login success, existing user:", row.id);
      res.json({ success: true });
    } else {
      db.run("INSERT INTO users (email) VALUES (?)", [email], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        req.session.user_id = this.lastID;
        console.log("Login success, new user:", this.lastID);
        res.json({ success: true });
      });
    }
  });
});

// -------------------- JOB ROUTES --------------------
app.get('/jobs', (req, res) => {
  console.log("GET /jobs for user_id:", req.session.user_id);
  if (!req.session.user_id) {
    return res.json({ error: "Not logged in" });
  }
  db.all("SELECT * FROM jobs WHERE user_id = ?", [req.session.user_id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/jobs', (req, res) => {
  const { company, role, status } = req.body;
  console.log("POST /jobs for user_id:", req.session.user_id);

  if (!req.session.user_id) {
    return res.status(401).json({ error: "Not logged in" });
  }

  db.run(
    "INSERT INTO jobs (company, role, status, user_id) VALUES (?, ?, ?, ?)",
    [company, role, status, req.session.user_id],
    function(err) {
      if (err) {
        console.error("Error inserting job:", err.message);
        return res.status(500).json({ error: err.message });
      }
      console.log("Inserted job with id:", this.lastID);
      res.json({ id: this.lastID });
    }
  );
});

// -------------------- UPDATE JOB STATUS --------------------
app.put('/jobs/:id', (req, res) => {
  const { status } = req.body;
  const { id } = req.params;
  console.log("PUT /jobs/:id", id, "user_id:", req.session.user_id);

  if (!req.session.user_id) {
    return res.status(401).json({ error: "Not logged in" });
  }
  db.run(
    "UPDATE jobs SET status = ? WHERE id = ? AND user_id = ?",
    [status, id, req.session.user_id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      console.log("Rows updated:", this.changes);
      res.json({ updated: this.changes });
    }
  );
});

// -------------------- DELETE JOB --------------------
app.delete('/jobs/:id', (req, res) => {
  const { id } = req.params;
  console.log("DELETE /jobs/:id", id, "user_id:", req.session.user_id);

  if (!req.session.user_id) {
    return res.status(401).json({ error: "Not logged in" });
  }
  db.run(
    "DELETE FROM jobs WHERE id = ? AND user_id = ?",
    [id, req.session.user_id],
    function(err) {
      if (err) {
        console.error("Error deleting job:", err.message);
        return res.status(500).json({ error: err.message });
      }
      console.log("Rows deleted:", this.changes);
      res.json({ deleted: this.changes });
    }
  );
});

// -------------------- STATIC FILES --------------------
// IMPORTANT: put this AFTER your API routes
app.use(express.static('public'));

// -------------------- SERVER START --------------------
app.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});
