const express = require('express');
const router = express.Router();
const pool = require('../db_conn'); // Adjust the path as needed

// ✅ Add size to a product (with discount logic)
router.post('/products/:id/sizes', async (req, res) => {
  const { id } = req.params;
  const {
    size_label,
    price,
    discount_enabled = false,
    discount_amount = 0,
  } = req.body;

  let price_after_discount = null;

  if (discount_enabled) {
    const discountPercent = parseFloat(discount_amount);
    price_after_discount = price - (price * discountPercent / 100);
  }

  try {
    const result = await pool.query(
      `INSERT INTO product_sizes (
        product_id, size_label, price, discount_enabled, discount_amount, price_after_discount
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [id, size_label, price, discount_enabled, discount_amount, price_after_discount]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('❌ Error adding size:', err.message);
    res.status(500).json({ error: 'Failed to add product size' });
  }
});

// ✅ Get all sizes for a product
router.get('/products/:id/sizes', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      'SELECT * FROM product_sizes WHERE product_id = $1',
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Error fetching sizes:', err.message);
    res.status(500).json({ error: 'Failed to fetch sizes' });
  }
});

// ✅ Update a size (including discount logic)
router.put('/product_sizes/:id', async (req, res) => {
  const { id } = req.params;
  const {
    price,
    size_label,
    discount_enabled = false,
    discount_amount = 0
  } = req.body;

  let price_after_discount = null;

  if (discount_enabled) {
    const discountPercent = parseFloat(discount_amount);
    price_after_discount = price - (price * discountPercent / 100);
  }

  try {
    const result = await pool.query(
      `UPDATE product_sizes SET
        price = $1,
        size_label = $2,
        discount_enabled = $3,
        discount_amount = $4,
        price_after_discount = $5
      WHERE id = $6
      RETURNING *`,
      [price, size_label, discount_enabled, discount_amount, price_after_discount, id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('❌ Error updating size:', err.message);
    res.status(500).json({ error: 'Failed to update product size' });
  }
});

// ✅ Delete a size
router.delete('/product_sizes/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query('DELETE FROM product_sizes WHERE id = $1', [id]);
    res.json({ message: 'Size deleted' });
  } catch (err) {
    console.error('❌ Error deleting size:', err.message);
    res.status(500).json({ error: 'Failed to delete size' });
  }
});

// ✅ Apply discount to an existing product size
router.put('/product_sizes/:id/apply-discount', async (req, res) => {
  const { id } = req.params;
  const { discount_amount = 0 } = req.body;

  const discountPercent = parseFloat(discount_amount);

  try {
    // Get current price
    const result = await pool.query('SELECT price FROM product_sizes WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product size not found' });
    }

    const price = parseFloat(result.rows[0].price);
    const price_after_discount = price - (price * discountPercent / 100);

    // Update discount
    const update = await pool.query(
      `UPDATE product_sizes
       SET discount_enabled = true,
           discount_amount = $1,
           price_after_discount = $2
       WHERE id = $3
       RETURNING *`,
      [discountPercent, price_after_discount, id]
    );

    res.json(update.rows[0]);
  } catch (err) {
    console.error('❌ Error applying discount:', err.message);
    res.status(500).json({ error: 'Failed to apply discount' });
  }
});


module.exports = router;
