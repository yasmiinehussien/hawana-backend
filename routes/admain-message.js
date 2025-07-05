const express = require('express');
const router = express.Router();
const pool = require('../db_conn'); // adjust path to your db config

// ✅ Get all contact messages
router.get('/contact_messages', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM contact_messages ORDER BY submitted_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Error fetching messages:', err.message);
    res.status(500).json({ error: 'Failed to fetch contact messages' });
  }
});

// ✅ Get single message by ID
router.get('/contact_messages/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'SELECT * FROM contact_messages WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('❌ Error fetching message:', err.message);
    res.status(500).json({ error: 'Failed to fetch message' });
  }
});

// ✅ Mark message as replied
router.put('/contact_messages/:id/reply', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'UPDATE contact_messages SET replied = TRUE WHERE id = $1 RETURNING *',
      [id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('❌ Error marking message as replied:', err.message);
    res.status(500).json({ error: 'Failed to update message status' });
  }
});

// ✅ Delete message
router.delete('/contact_messages/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'DELETE FROM contact_messages WHERE id = $1 RETURNING *',
      [id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }
    res.json({ message: 'Deleted successfully', deleted: result.rows[0] });
  } catch (err) {
    console.error('❌ Error deleting message:', err.message);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});



// ✅ Create a new contact message (user form submission)
router.post('/messages', async (req, res) => {
  const { name, email, phone, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email, and message are required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO contact_messages (name, email, phone, message)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, email, phone || null, message]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('❌ Error inserting message:', err.message);
    res.status(500).json({ error: 'Failed to submit message' });
  }
});


module.exports = router;
