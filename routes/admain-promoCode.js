const express = require('express');
const router = express.Router();
const pool = require('../db_conn');

// ✅ Admin adds promo code
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

// ✅ User applies a promo code
router.post('/cart/:cart_id/apply-promocode', async (req, res) => {
  const { cart_id } = req.params;
  const { promo_code, guest_user_id } = req.body;

  try {
    const cleanCode = promo_code.trim();

    // Validate promo code is active
    const promoRes = await pool.query(
      'SELECT * FROM promocode WHERE code = $1 AND status = $2',
      [cleanCode, 'active']
    );

    if (promoRes.rows.length === 0) {
      return res.status(404).json({ error: 'Promo code not found or inactive' });
    }

    const promo = promoRes.rows[0];

    // Check if promo is inactive or expired
    if (promo.status === 'inactive') {
      return res.status(400).json({ error: 'Promo code is inactive' });
    }
    if (promo.status === 'expired') {
      return res.status(400).json({ error: 'Promo code is expired' });
    }
    if (promo.status !== 'active') {
      return res.status(400).json({ error: 'Promo code cannot be used' });
    }

    // Check if guest has already used this promo
    const usedRes = await pool.query(
      `SELECT * FROM user_promocode 
       WHERE guest_user_id = $1 AND promocode_id = $2 AND status = 'used'`,
      [guest_user_id, promo.id]
    );

    if (usedRes.rows.length > 0) {
      return res.status(400).json({ error: 'You have already used this promo code' });
    }

    // Remove any previous pending promo for this guest
    await pool.query(
      `DELETE FROM user_promocode 
       WHERE guest_user_id = $1 AND status = 'pending'`,
      [guest_user_id]
    );

    // Save this promo as "pending"
    const insertResult = await pool.query(
      `INSERT INTO user_promocode (guest_user_id, promocode_id, status)
       VALUES ($1, $2, 'pending')
       ON CONFLICT (guest_user_id, promocode_id)
       DO UPDATE SET status = 'pending', used_at = NULL
       RETURNING *`,
      [guest_user_id, promo.id]
    );

    // Get current cart total
    const cartRes = await pool.query(
      'SELECT total_price FROM cart WHERE id = $1',
      [cart_id]
    );

    if (cartRes.rows.length === 0) {
      return res.status(404).json({ error: 'Cart not found' });
    }

    const subtotal = parseFloat(cartRes.rows[0].total_price);
    const discountAmount = subtotal * (parseFloat(promo.discount_amount) / 100);
    const newTotal = subtotal - discountAmount;

    res.json({
      message: 'Promo code applied (pending)',
      discount_amount: discountAmount.toFixed(2),
      discount_percentage: parseFloat(promo.discount_amount),
      promocode_id: promo.id,
      new_total: newTotal.toFixed(2)
    });
  } catch (err) {
    console.error('❌ Apply promo error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ✅ User removes a pending promo code
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

// ✅ Admin updates promo code status
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


// ✅ GET all promo codes
router.get('/promocodes', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM promocode ORDER BY id DESC');
    const promos = result.rows;

    const now = new Date();

    for (const promo of promos) {
      const endDate = promo.end_date ? new Date(promo.end_date) : null;

      if (
        endDate &&
        now > endDate &&
        promo.status === 'active' // ✅ only auto-expire if still active
      ) {
        await pool.query(
          `UPDATE promocode SET status = 'expired' WHERE id = $1`,
          [promo.id]
        );
        promo.status = 'expired';
      }
    }

    res.json(promos);
  } catch (err) {
    console.error('❌ Error fetching promo codes:', err.message);
    res.status(500).json({ error: 'Failed to fetch promo codes' });
  }
});



// ✅ Update promo code by ID
router.put('/promocode/:id', async (req, res) => {
  const { id } = req.params;
  const { end_date, status, discount_amount } = req.body;

  try {
    // Get current promo status
    const current = await pool.query('SELECT * FROM promocode WHERE id = $1', [id]);
    if (current.rows.length === 0) {
      return res.status(404).json({ error: 'Promo code not found' });
    }

    const now = new Date();
    const endDateObj = end_date ? new Date(end_date) : null;
    let newStatus = status;

    // ✅ If end_date is in future and current is 'expired', make it active
    if (endDateObj && endDateObj > now && current.rows[0].status === 'expired') {
      newStatus = 'active';
    }

    const result = await pool.query(
      `UPDATE promocode
       SET end_date = $1,
           status = $2,
           discount_amount = $3
       WHERE id = $4
       RETURNING *`,
      [end_date || null, newStatus, discount_amount, id]
    );

    res.json({ message: 'Promo updated successfully', promo: result.rows[0] });
  } catch (err) {
    console.error('❌ Error updating promo code:', err.message);
    res.status(500).json({ error: 'Failed to update promo code' });
  }
});


// ✅ DELETE promo code by ID
router.delete('/promocode/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query('DELETE FROM promocode WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Promo code not found' });
    }

    res.json({ message: 'Promo code deleted successfully', promo: result.rows[0] });
  } catch (err) {
    console.error('❌ Error deleting promo code:', err.message);
    res.status(500).json({ error: 'Failed to delete promo code' });
  }
});


module.exports = router;
