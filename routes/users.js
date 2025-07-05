const express = require('express');
const router = express.Router();
const pool = require('../db_conn');

// GET all users
router.get('/', async (req, res) => {
  const result = await pool.query('SELECT * FROM users ORDER BY created_at DESC');
  res.json(result.rows);
});

// POST new user
router.post('/', async (req, res) => {
  const { name, email, password, is_admin } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO users (name, email, password, is_admin) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, email, password, is_admin || false]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT update user
router.put('/:id', async (req, res) => {
  const { name, email, password, is_admin } = req.body;
  const { id } = req.params;
  try {
    const result = await pool.query(
      'UPDATE users SET name=$1, email=$2, password=$3, is_admin=$4 WHERE id=$5 RETURNING *',
      [name, email, password, is_admin, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE user
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  await pool.query('DELETE FROM users WHERE id=$1', [id]);
  res.json({ message: 'User deleted' });
});

module.exports = router;
