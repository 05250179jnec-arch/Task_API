// src/db.js
// Creates one shared MySQL connection pool for the whole app.
// require('dotenv').config() must run before this file is loaded.

const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host:     process.env.DB_HOST,
  port:     Number(process.env.DB_PORT),
  user:     process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,

  // Aiven only accepts encrypted (SSL) connections.
  // rejectUnauthorized: false = encrypt, but skip checking Aiven's certificate
  // (fine for a class project; production would load Aiven's ca.pem file).
  ssl: process.env.DB_SSL === 'REQUIRED' ? { rejectUnauthorized: false } : undefined,

  waitForConnections: true,
  connectionLimit: 10,
});

module.exports = pool;