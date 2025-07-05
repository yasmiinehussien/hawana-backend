const express = require('express');
const router = express.Router();
const pool = require('../db_conn');

// ---------------------------
// Contact Messages
// ---------------------------

router.post('/contact_messages', async (req, res) => {
  const { name, email, phone, message } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO contact_messages (name, email, phone, message) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, email, phone, message]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error inserting contact message:', err.message);
    res.status(500).json({ error: 'Failed to submit message' });
  }
});

router.delete('/contact_messages/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM contact_messages WHERE id = $1', [id]);
    res.json({ message: 'Message deleted' });
  } catch (err) {
    console.error('Error deleting message:', err.message);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

router.put('/contact_messages/:id/reply', async (req, res) => {
  const { id } = req.params;
  const { replied } = req.body;
  try {
    const result = await pool.query(
      'UPDATE contact_messages SET replied = $1 WHERE id = $2 RETURNING *',
      [replied, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating reply status:', err.message);
    res.status(500).json({ error: 'Failed to update replied status' });
  }
});

router.get('/contact_messages/unreplied', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM contact_messages WHERE replied = false ORDER BY submitted_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching unreplied messages:', err.message);
    res.status(500).json({ error: 'Failed to fetch unreplied messages' });
  }
});

router.get('/contact_messages', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM contact_messages ORDER BY submitted_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching contact messages:', err.message);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

module.exports = router;
