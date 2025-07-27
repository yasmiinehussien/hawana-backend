// FULLY UPDATED ORDER ROUTES WITH AUTO RECALCULATION

const express = require('express');
const router = express.Router();
const pool = require('../db_conn');

// ---------------------------
// Orders
// ---------------------------

// Get all orders
router.get('/orders', async (req, res) => {
  const result = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
  res.json(result.rows);
});

// Get All Orders for a User
router.get('/users/:user_id/orders', async (req, res) => {
  const { user_id } = req.params;
  try {
    const result = await pool.query(
      'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC',
      [user_id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch orders for user' });
  }
});

// Get Only Pending Orders for a User
router.get('/users/:user_id/orders/pending', async (req, res) => {
  const { user_id } = req.params;
  try {
    const result = await pool.query(
      'SELECT * FROM orders WHERE user_id = $1 AND status = $2 ORDER BY created_at DESC',
      [user_id, 'pending']
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch pending orders' });
  }
});

// Get Only Completed Orders for a User
router.get('/users/:user_id/orders/completed', async (req, res) => {
  const { user_id } = req.params;
  try {
    const result = await pool.query(
      'SELECT * FROM orders WHERE user_id = $1 AND status = $2 ORDER BY created_at DESC',
      [user_id, 'checked_out']
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch completed orders' });
  }
});

// Create a new order
router.post('/orders', async (req, res) => {
  const {
    user_id,
    total_price,
    status,
    payment_method,
    delivery_method,
    shipping_amount = 0,
    tax_amount = 0,
    notes,
    customer_name,
    customer_mobile
  } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO orders (
        user_id, total_price, status, payment_method,
        delivery_method, shipping_amount, tax_amount, customer_name, customer_mobile
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        user_id,
        total_price,
        status || 'pending',
        payment_method || 'cash',
        delivery_method,
        shipping_amount,
        tax_amount,
        customer_name,
        customer_mobile
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('❌ Error creating order:', err.message);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Update an order
router.put('/orders/:id', async (req, res) => {
  const { id } = req.params;
  const {
    total_price,
    status,
    payment_method,
    delivery_method,
    shipping_amount,
    tax_amount,
    customer_name,
    customer_mobile
  } = req.body;

  try {
    const result = await pool.query(
      `UPDATE orders SET
        total_price = $1,
        status = $2,
        payment_method = $3,
        delivery_method = $4,
        shipping_amount = $5,
        tax_amount = $6,
        customer_name = $7,
        customer_mobile = $8
      WHERE id = $9
      RETURNING *`,
      [
        total_price,
        status,
        payment_method,
        delivery_method,
        shipping_amount,
        tax_amount,
        customer_name,
        customer_mobile,
        id
      ]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('❌ Error updating order:', err.message);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

// ---------------------------
// Order Items
router.post('/order_items', async (req, res) => {
  const {
    order_id,
    product_id,
    size_label,
    quantity,
    price_per_unit,
    product_name,
    notes // ✅ Add this line
  } = req.body;

  const total_price = price_per_unit * quantity;

  try {
    const result = await pool.query(
      `INSERT INTO order_items 
        (order_id, product_id, size_label, quantity, price_per_unit, total_price, product_name, notes) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [order_id, product_id, size_label, quantity, price_per_unit, total_price, product_name, notes] // ✅ Add notes param
    );

    await pool.query(
      'UPDATE orders SET total_price = (SELECT COALESCE(SUM(total_price), 0) FROM order_items WHERE order_id = $1) WHERE id = $1',
      [order_id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add order item' });
  }
});

// Update item in order
router.put('/order_items/:id', async (req, res) => {
  const { id } = req.params;
  const { quantity, price_per_unit } = req.body;
  const total_price = price_per_unit * quantity;

  try {
    const result = await pool.query(
      'UPDATE order_items SET quantity = $1, price_per_unit = $2, total_price = $3 WHERE id = $4 RETURNING *',
      [quantity, price_per_unit, total_price, id]
    );

    const orderIdResult = await pool.query('SELECT order_id FROM order_items WHERE id = $1', [id]);
    const order_id = orderIdResult.rows[0].order_id;

    await pool.query(
      'UPDATE orders SET total_price = (SELECT COALESCE(SUM(total_price), 0) FROM order_items WHERE order_id = $1) WHERE id = $1',
      [order_id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update order item' });
  }
});

// Delete item from order
router.delete('/order_items/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const orderIdResult = await pool.query('SELECT order_id FROM order_items WHERE id = $1', [id]);
    const order_id = orderIdResult.rows[0].order_id;

    await pool.query('DELETE FROM order_items WHERE id = $1', [id]);

    await pool.query(
      'UPDATE orders SET total_price = (SELECT COALESCE(SUM(total_price), 0) FROM order_items WHERE order_id = $1) WHERE id = $1',
      [order_id]
    );

    res.json({ message: 'Order item deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete order item' });
  }
});

// Get items for an order
router.get('/orders/:id/items', async (req, res) => {
  const { id } = req.params;
  const result = await pool.query(
    'SELECT * FROM order_items WHERE order_id = $1',
    [id]
  );
  res.json(result.rows);
});

module.exports = router;
