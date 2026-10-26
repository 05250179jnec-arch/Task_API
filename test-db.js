// test-db.js — run with: npm run test:db
require('dotenv').config();
const pool = require('./src/db');

async function test() {
  try {
    const [rows] = await pool.query('SELECT 1 AS ok, DATABASE() AS db, NOW() AS now');
    console.log('Connected to MySQL');
    console.log(rows[0]);
    process.exit(0);
  } catch (err) {
    console.error('Connection failed');
    console.error(err.code, err.message);
    process.exit(1);
  }
}

test();