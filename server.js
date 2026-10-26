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

// Every URL starting with /tasks goes to the task router
app.use('/tasks', taskRoutes);

// Central error handler — receives everything passed to next(err)
app.use((err, req, res, next) => {
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