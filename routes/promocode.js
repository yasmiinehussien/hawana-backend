const express = require('express');
const router = express.Router();
const pool = require('../db_conn');

// Admin adds promo
router.post('/', async (req, res) => {
  const { code, discount_amount, end_date } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO promocode (code, discount_amount, end_date)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [code, discount_amount, end_date || null]
    );

    res.json({ message: 'Promo code created', promo: result.rows[0] });
  } catch (err) {
    console.error('❌ Error creating promo code:', err.message);
    res.status(500).json({ error: 'Failed to create promo code' });
  }
});

// User applies a promo code
router.post('/cart/:cart_id/apply-promocode', async (req, res) => {
  const { cart_id } = req.params;
  const { promo_code, guest_user_id } = req.body;

  try {
    const cleanCode = promo_code.trim();

    // 1️⃣ Validate promo is active
    const promoRes = await pool.query(
      'SELECT * FROM promocode WHERE code = $1 AND status = $2',
      [cleanCode, 'active']
    );

    if (promoRes.rows.length === 0) {
      return res.status(404).json({ error: 'Promo code not found or inactive' });
    }

    const promo = promoRes.rows[0];

    // ✅ Check if inactive or expired
if (promo.status === 'inactive') {
  return res.status(400).json({ error: 'Promo code is inactive' });
}
if (promo.status === 'expired') {
  return res.status(400).json({ error: 'Promo code is expired' });
}
if (promo.status !== 'active') {
  return res.status(400).json({ error: 'Promo code cannot be used' });
}

    // 2️⃣ Has guest already used this promo?
    const usedRes = await pool.query(
      `SELECT * FROM user_promocode 
       WHERE guest_user_id = $1 AND promocode_id = $2 AND status = 'used'`,
      [guest_user_id, promo.id]
    );

    if (usedRes.rows.length > 0) {
      return res.status(400).json({ error: 'You have already used this promo code' });
    }

    // 3️⃣ Remove any previous pending promo for guest (only allow 1 pending at a time)
    await pool.query(
      `DELETE FROM user_promocode 
       WHERE guest_user_id = $1 AND status = 'pending'`,
      [guest_user_id]
    );

    // 4️⃣ Save current promo as "pending"
    const insertResult = await pool.query(
      `INSERT INTO user_promocode (guest_user_id, promocode_id, status)
       VALUES ($1, $2, 'pending')
       ON CONFLICT (guest_user_id, promocode_id)
       DO UPDATE SET status = 'pending', used_at = NULL
       RETURNING *`,
      [guest_user_id, promo.id]
    );

    // 5️⃣ Get current cart subtotal
    const cartRes = await pool.query('SELECT total_price FROM cart WHERE id = $1', [cart_id]);
    if (cartRes.rows.length === 0) {
      return res.status(404).json({ error: 'Cart not found' });
    }

    const subtotal = parseFloat(cartRes.rows[0].total_price);
    const discountAmount = subtotal * (parseFloat(promo.discount_amount) / 100);
    const newTotal = subtotal - discountAmount;

    // ✅ Return
    res.json({
      message: 'Promo code applied (pending)',
      discount_amount: discountAmount.toFixed(2),
      discount_percentage: parseFloat(promo.discount_amount), // 🆕

      promocode_id: promo.id,
      new_total: newTotal.toFixed(2)
    });

  } catch (err) {
    console.error('❌ Apply promo error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// User removes current promo (clicks ❌)
router.post('/cart/:cart_id/remove-promocode', async (req, res) => {
  const { guest_user_id } = req.body;

  try {
    await pool.query(
      `DELETE FROM user_promocode 
       WHERE guest_user_id = $1 AND status = 'pending'`,
      [guest_user_id]
    );

    res.json({ message: 'Promo code removed' });
  } catch (err) {
    console.error('❌ Remove promo error:', err.message);
    res.status(500).json({ error: 'Failed to remove promo code' });
  }
});



// Admin changes status of a promo code
router.put('/promocode/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const allowedStatuses = ['active', 'inactive', 'expired'];

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status value' });
  }

  try {
    const result = await pool.query(
      `UPDATE promocode
       SET status = $1
       WHERE id = $2
       RETURNING *`,
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Promo code not found' });
    }

    res.json({
      message: `Promo code status updated to '${status}'`,
      promo: result.rows[0]
    });
  } catch (err) {
    console.error('❌ Error updating promo status:', err.message);
    res.status(500).json({ error: 'Failed to update promo status' });
  }
});



module.exports = router;
