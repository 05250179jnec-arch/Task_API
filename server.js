// server.js — entry point of the app

const express = require('express');

const app = express();
const PORT = 3000;

// Middleware: turns a JSON request body into req.body
app.use(express.json());

// Route: when someone sends GET to "/", send back a message
app.get('/', (req, res) => {
  res.json({ message: 'Task API is ready!' });
});

// Start listening for requests
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});