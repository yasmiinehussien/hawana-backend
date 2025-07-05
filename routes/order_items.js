const express = require('express');
const router = express.Router();
const pool = require('../db_conn');

// ✅ POST: Add item to an order
router.post('/order_items', async (req, res) => {
  const { order_id, product_id, size_label, quantity, price_per_unit } = req.body;
  const total_price = price_per_unit * quantity;

  try {
    const result = await pool.query(
      'INSERT INTO order_items (order_id, product_id, size_label, quantity, price_per_unit, total_price) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [order_id, product_id, size_label, quantity, price_per_unit, total_price]
    );

    await pool.query(
      'UPDATE orders SET total_price = (SELECT COALESCE(SUM(total_price), 0) FROM order_items WHERE order_id = $1) WHERE id = $1',
      [order_id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err });
  }
});

module.exports = router;
