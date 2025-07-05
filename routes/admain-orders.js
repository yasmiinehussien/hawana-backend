// routes/order.js
const express = require('express');
const router = express.Router();
const pool = require('../db_conn');

// ✅ GET all orders for admin
router.get('/orders-admain', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Error fetching orders:', err.message);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// ✅ GET full order with its items
router.get('/orders/:id/details', async (req, res) => {

  const { id } = req.params;

  try {
    const orderResult = await pool.query('SELECT * FROM orders WHERE id = $1', [id]);
    if (orderResult.rows.length === 0) return res.status(404).json({ error: 'Order not found' });

    const itemsResult = await pool.query(
      `SELECT oi.*, p.name AS product_name, p.image_url
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = $1`,
      [id]
    );

    res.json({
      order: orderResult.rows[0],
      items: itemsResult.rows
    });
  } catch (err) {
    console.error('❌ Error fetching order details:', err.message);
    res.status(500).json({ error: 'Failed to fetch order details' });
  }
});
// router.get('/orders-admain/:id/details', async (req, res) => {
//   const { id } = req.params;

//   try {
//     // Get main order
//     // const orderResult = await pool.query('SELECT * FROM orders WHERE id = $1', [id]);

// const orderResult = await pool.query(`
//   SELECT 
//     o.*,
//     u.name AS user_name,
//     p.code AS promocode_code,
//     p.discount_amount AS promocode_discount,
//     p.status AS promocode_status
//   FROM orders o
//   LEFT JOIN users u ON o.user_id = u.id
//   LEFT JOIN promocode p ON o.promocode_id = p.id
//   WHERE o.id = $1
// `, [id]);


//     if (orderResult.rows.length === 0) {
//       return res.status(404).json({ error: 'Order not found' });
//     }

//     const order = orderResult.rows[0];

//     // ✅ Get items with product name (no product_sizes join)
//     const itemsResult = await pool.query(`
//       SELECT 
//         oi.id,
//         oi.quantity,
//         oi.size_label,
//         oi.price_per_unit,
//         oi.total_price,
//         p.name AS product_name
//       FROM order_items oi
//       JOIN products p ON oi.product_id = p.id
//       WHERE oi.order_id = $1
//     `, [id]);

//     const fullOrder = {
//       ...order,
//       items: itemsResult.rows
//     };

//     res.json(fullOrder);
//   } catch (err) {
//     console.error('❌ Error fetching order details:', err.message);
//     res.status(500).json({ error: 'Failed to fetch order details' });
//   }
// });

router.get('/orders-admain/:id/details', async (req, res) => {
  const { id } = req.params;

  try {
    // Get main order with promo info
    const orderResult = await pool.query(`
      SELECT 
        o.*,
        u.name AS user_name,
        p.code AS promocode_code,
        p.discount_amount AS promocode_discount,
        p.status AS promocode_status
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      LEFT JOIN promocode p ON o.promocode_id = p.id
      WHERE o.id = $1
    `, [id]);

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];

    // ✅ No join — just get snapshot product name
    const itemsResult = await pool.query(`
      SELECT 
        id,
        quantity,
        size_label,
        price_per_unit,
        total_price,
        product_name
      FROM order_items
      WHERE order_id = $1
    `, [id]);

    const fullOrder = {
      ...order,
      items: itemsResult.rows
    };

    res.json(fullOrder);
  } catch (err) {
    console.error('❌ Error fetching order details:', err.message);
    res.status(500).json({ error: 'Failed to fetch order details' });
  }
});

// ✅ Update order status
router.put('/orders-admain/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const allowedStatuses = [
    'pending',
    'confirmed',
    'preparing',
    'shipped',
    'ready',
    'delivered',
    'cancelled',
    'failed'
  ];

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status value' });
  }

  try {
    const result = await pool.query(
      'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('❌ Error updating order status:', err.message);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});


module.exports = router;
