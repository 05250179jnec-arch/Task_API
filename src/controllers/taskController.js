// src/controllers/taskController.js
// Validates input, calls the model, sends the HTTP response. No SQL here.

const taskModel = require('../models/taskModel');

// ---------- validation helpers ----------
const MAX_TITLE = 255; // matches VARCHAR(255) in schema.sql

// Returns an error message, or null if the title is OK
function checkTitle(title) {
  if (typeof title !== 'string' || title.trim() === '') return 'Title is required';
  if (title.trim().length > MAX_TITLE) return `Title must be ${MAX_TITLE} characters or less`;
  return null;
}

// Turns req.params.id into a number, or sends 400 and returns null
function parseId(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    res.status(400).json({ error: 'id must be a positive whole number' });
    return null;
  }
  return id;
}

const taskController = {
  getAllTasks: async (req, res, next) => {
    try {
      res.json(await taskModel.findAll());
    } catch (err) {
      next(err);
    }
  },

  getTaskById: async (req, res, next) => {
    try {
      const id = parseId(req, res);
      if (id === null) return;

      const task = await taskModel.findById(id);
      if (!task) return res.status(404).json({ error: 'Task not found' });
      res.json(task);
    } catch (err) {
      next(err);
    }
  },

  createTask: async (req, res, next) => {
    try {
      const { title, completed } = req.body || {};

      const titleError = checkTitle(title);
      if (titleError) return res.status(400).json({ error: titleError });

      if (completed !== undefined && typeof completed !== 'boolean') {
        return res.status(400).json({ error: 'completed must be true or false' });
      }

      const task = await taskModel.create({ title: title.trim(), completed: completed ?? false });
      res.status(201).json(task);
    } catch (err) {
      next(err);
    }
  },

  updateTask: async (req, res, next) => {
    try {
      const id = parseId(req, res);
      if (id === null) return;

      const { title, completed } = req.body || {};

      const titleError = checkTitle(title);
      if (titleError) return res.status(400).json({ error: titleError });

      if (typeof completed !== 'boolean') {
        return res.status(400).json({ error: 'completed must be true or false' });
      }

      const task = await taskModel.update(id, { title: title.trim(), completed });
      if (!task) return res.status(404).json({ error: 'Task not found' });
      res.json(task);
    } catch (err) {
      next(err);
    }
  },

  patchTask: async (req, res, next) => {
    try {
      const id = parseId(req, res);
      if (id === null) return;

      const { title, completed } = req.body || {};

      if (title === undefined && completed === undefined) {
        return res.status(400).json({ error: 'Provide title or completed to update' });
      }
      if (title !== undefined) {
        const titleError = checkTitle(title);
        if (titleError) return res.status(400).json({ error: titleError });
      }
      if (completed !== undefined && typeof completed !== 'boolean') {
        return res.status(400).json({ error: 'completed must be true or false' });
      }

      const fields = {};
      if (title !== undefined) fields.title = title.trim();
      if (completed !== undefined) fields.completed = completed;

      const task = await taskModel.partialUpdate(id, fields);
      if (!task) return res.status(404).json({ error: 'Task not found' });
      res.json(task);
    } catch (err) {
      next(err);
    }
  },

  deleteTask: async (req, res, next) => {
    try {
      const id = parseId(req, res);
      if (id === null) return;

      const deleted = await taskModel.remove(id);
      if (!deleted) return res.status(404).json({ error: 'Task not found' });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
};

module.exports = taskController;