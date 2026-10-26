// src/controllers/taskController.js
// Validates input, calls the model, sends the HTTP response. No SQL here.

const taskModel = require('../models/taskModel');

const taskController = {
  getAllTasks: async (req, res, next) => {
    try {
      const tasks = await taskModel.findAll();
      res.json(tasks);
    } catch (err) {
      next(err);
    }
  },

  getTaskById: async (req, res, next) => {
    try {
      const task = await taskModel.findById(req.params.id);
      if (!task) return res.status(404).json({ error: 'Task not found' });
      res.json(task);
    } catch (err) {
      next(err);
    }
  },

  createTask: async (req, res, next) => {
    try {
      const { title } = req.body;
      if (!title || title.trim() === '') {
        return res.status(400).json({ error: 'Title is required' });
      }
      const task = await taskModel.create({ title: title.trim() });
      res.status(201).json(task);
    } catch (err) {
      next(err);
    }
  },

  updateTask: async (req, res, next) => {
    try {
      const { title, completed } = req.body;
      if (!title || title.trim() === '') {
        return res.status(400).json({ error: 'Title is required' });
      }
      if (typeof completed !== 'boolean') {
        return res.status(400).json({ error: 'completed must be true or false' });
      }
      const task = await taskModel.update(req.params.id, { title: title.trim(), completed });
      if (!task) return res.status(404).json({ error: 'Task not found' });
      res.json(task);
    } catch (err) {
      next(err);
    }
  },

  patchTask: async (req, res, next) => {
    try {
      const { title, completed } = req.body;
      if (title === undefined && completed === undefined) {
        return res.status(400).json({ error: 'Provide title or completed to update' });
      }
      if (title !== undefined && title.trim() === '') {
        return res.status(400).json({ error: 'Title cannot be empty' });
      }
      if (completed !== undefined && typeof completed !== 'boolean') {
        return res.status(400).json({ error: 'completed must be true or false' });
      }
      const fields = {};
      if (title !== undefined) fields.title = title.trim();
      if (completed !== undefined) fields.completed = completed;

      const task = await taskModel.partialUpdate(req.params.id, fields);
      if (!task) return res.status(404).json({ error: 'Task not found' });
      res.json(task);
    } catch (err) {
      next(err);
    }
  },

  deleteTask: async (req, res, next) => {
    try {
      const deleted = await taskModel.remove(req.params.id);
      if (!deleted) return res.status(404).json({ error: 'Task not found' });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
};

module.exports = taskController;