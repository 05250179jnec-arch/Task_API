// server.js — entry point
// Flow: request → routes → controller → model → MySQL

require('dotenv').config();

const express = require('express');
const taskRoutes = require('./src/routes/taskRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Task API is ready!', version: 'MySQL + MVC' });
});

app.use('/tasks', taskRoutes);

// Unknown route → JSON 404 (must come AFTER all routes)
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.originalUrl} not found` });
});

// Central error handler (4 parameters, always last)
app.use((err, req, res, next) => {
  // Broken JSON in the request body → client's mistake
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON in request body' });
  }
  console.error('Error:', err.message);
  res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(PORT, (err) => {
  if (err) {
    console.error(`Could not start server: ${err.message}`);
    process.exit(1);
  }
  console.log(`Server running at http://localhost:${PORT}`);
});