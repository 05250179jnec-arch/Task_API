// server.js — entry point of the app

const express = require('express');

const app = express();
const PORT = 3000;

// Middleware: turns a JSON request body into req.body
app.use(express.json());
// Temporary storage: an array in memory (replaced by MySQL in Step 8)
let tasks = [];
let nextId = 1;

// Route: when someone sends GET to "/", send back a message
app.get('/', (req, res) => {
  res.json({ message: 'Task API is ready!' });
});
// GET /tasks — return all tasks
app.get('/tasks', (req, res) => {
  res.json(tasks);
});

// POST /tasks — create a new task
app.post('/tasks', (req, res) => {
  const { title } = req.body;

  if (!title || title.trim() === '') {
    return res.status(400).json({ error: 'Title is required' });
  }

  const newTask = {
    id: nextId++,
    title: title.trim(),
    completed: false,
    createdAt: new Date().toISOString(),
  };

  tasks.push(newTask);
  res.status(201).json(newTask);
});
// Start listening for requests
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});