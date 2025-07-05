const express = require('express');
const router = express.Router();
const pool = require('../db_conn');

// ---------------------------
// shopinfo Routes
// ---------------------------

// Create new shop info
// Create new shop info
router.post('/', async (req, res) => {
  const {
    phone,
    email,
    tiktok_url,
    snapchat_url,
    instagram_url,
    whatsapp_url,
    tax = 0.00,
    shipping = 0.00
  } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO shopinfo 
        (phone, email, tiktok_url, snapchat_url, instagram_url, whatsapp_url, tax, shipping) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING *`,
      [phone, email, tiktok_url, snapchat_url, instagram_url, whatsapp_url, tax, shipping]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('❌ Error inserting shop info:', err.message);
    res.status(500).json({ error: 'Failed to insert shop info' });
  }
});


// Delete shop info by ID
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query('DELETE FROM shopinfo WHERE id = $1 RETURNING *', [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Shop info not found' });
    }

    res.json({ message: 'Shop info deleted', deleted: result.rows[0] });
  } catch (err) {
    console.error('❌ Error deleting shop info:', err.message);
    res.status(500).json({ error: 'Failed to delete shop info' });
  }
});

//get fees
router.get('/fees', async (req, res) => {
  try {
    const result = await pool.query('SELECT tax, shipping FROM shopinfo LIMIT 1');
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Shop info not found' });
    }

    const { tax, shipping } = result.rows[0];
    res.json({ tax, shipping });
  } catch (err) {
    console.error('❌ Failed to fetch fees:', err.message);
    res.status(500).json({ error: 'Failed to fetch tax and shipping' });
  }
});
// Get latest shop info
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM shopinfo');
    res.json(result.rows[0]); // ✅ send once
  } catch (err) {
    console.error('❌ Failed to fetch shop info:', err.message);
    res.status(500).json({ error: 'Failed to fetch shop info' });
  }
});

// Update shop info
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { phone, email, tiktok_url, snapchat_url, instagram_url, whatsapp_url, tax, shipping } = req.body;

  try {
    const result = await pool.query(
      `UPDATE shopinfo
       SET phone = $1, email = $2, tiktok_url = $3, snapchat_url = $4, instagram_url = $5, whatsapp_url = $6,
           tax = $7, shipping = $8
       WHERE id = $9 RETURNING *`,
      [phone, email, tiktok_url, snapchat_url, instagram_url, whatsapp_url, tax, shipping, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('❌ Error updating shop info:', err.message);
    res.status(500).json({ error: 'Failed to update shop info' });
  }
});


module.exports = router;
