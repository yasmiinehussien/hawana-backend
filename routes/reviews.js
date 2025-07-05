const express = require('express');
const router = express.Router();
const pool = require('../db_conn'); // adjust if needed

// ---------------------------
// Reviews Routes
// ---------------------------

router.post('/reviews', async (req, res) => {
  const { guest_user_id, order_id, rating, comment } = req.body;

  if (!guest_user_id || !order_id || !rating) {
    return res.status(400).json({ error: 'Missing guest_user_id, order_id, or rating' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO reviews (guest_user_id, order_id, rating, comment)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [guest_user_id, order_id, rating, comment]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('❌ Error adding review:', err.message);
    res.status(500).json({ error: 'Failed to add review' });
  }
});


// Get all reviews
router.get('/reviews', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM reviews ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Error fetching reviews:', err.message);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});


// ---------------------------
// Search Products by Name
// ---------------------------

router.get('/search', async (req, res) => {
  const { query } = req.query;

  if (!query || query.trim() === '') {
    return res.status(400).json({ error: 'Search query is required' });
  }

  try {
    const result = await pool.query(
      `SELECT * FROM products WHERE name ILIKE $1 ORDER BY name ASC`,
      [`%${query}%`] // Case-insensitive partial match
    );
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Search error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// ---------------------------
// About Products (Categories Preview)
// ---------------------------

router.get('/about-products', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT ON (c.name) c.name AS category, p.image_url
      FROM categories c
      JOIN products p ON p.category_id = c.id
      WHERE p.image_url IS NOT NULL
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Error fetching about-products:', err.message);
    res.status(500).json({ error: 'Failed to fetch about products' });
  }
});

module.exports = router;
