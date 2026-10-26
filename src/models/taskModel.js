// src/models/taskModel.js
// Database queries ONLY. No req, no res, no status codes.

const pool = require('../db');

const taskModel = {
  findAll: async () => {
    const [rows] = await pool.query('SELECT * FROM tasks ORDER BY created_at DESC');
    return rows;
  },

  findById: async (id) => {
    const [rows] = await pool.query('SELECT * FROM tasks WHERE id = ?', [id]);
    return rows[0] || null;          // null = not found
  },

  create: async ({ title, completed = false }) => {
    const [result] = await pool.query(
      'INSERT INTO tasks (title, completed) VALUES (?, ?)',
      [title, completed]
    );
    return taskModel.findById(result.insertId);
  },

  update: async (id, { title, completed }) => {
    const [result] = await pool.query(
      'UPDATE tasks SET title = ?, completed = ? WHERE id = ?',
      [title, completed, id]
    );
    if (result.affectedRows === 0) return null;
    return taskModel.findById(id);
  },

  partialUpdate: async (id, fields) => {
    const updates = [];
    const values = [];

    if (fields.title !== undefined) {
      updates.push('title = ?');
      values.push(fields.title);
    }
    if (fields.completed !== undefined) {
      updates.push('completed = ?');
      values.push(fields.completed);
    }
    if (updates.length === 0) return taskModel.findById(id);

    values.push(id);
    const [result] = await pool.query(
      `UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
    if (result.affectedRows === 0) return null;
    return taskModel.findById(id);
  },

  remove: async (id) => {
    const [result] = await pool.query('DELETE FROM tasks WHERE id = ?', [id]);
    return result.affectedRows > 0;  // true = deleted, false = not found
  },
};

module.exports = taskModel;