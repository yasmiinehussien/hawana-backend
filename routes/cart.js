const express = require('express');
const router = express.Router();
const pool = require('../db_conn');

// ✅ Add or Update Cart Item — Create cart only if needed
router.post('/cart_items', async (req, res) => {
  const { guest_user_id, cart_id, product_id, size_label, quantity, price_per_unit, notes } = req.body;

  if (!guest_user_id || !product_id || !size_label || quantity === undefined || !price_per_unit) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
let activeCartId = null;

if (cart_id) {
  // Check if the passed cart_id is still active
  const checkCart = await pool.query(
    'SELECT status FROM cart WHERE id = $1',
    [cart_id]
  );

  if (checkCart.rows.length > 0 && checkCart.rows[0].status === 'active') {
    activeCartId = cart_id; // ✅ Only use it if it's active
  }
}

if (!activeCartId) {
  // Create or find an active cart
  const existingCart = await pool.query(
    'SELECT * FROM cart WHERE guest_user_id = $1 AND status = $2 ORDER BY id DESC LIMIT 1',
    [guest_user_id, 'active']
  );

  if (existingCart.rows.length > 0) {
    activeCartId = existingCart.rows[0].id;
  } else {
    const createdCart = await pool.query(
      'INSERT INTO cart (guest_user_id, total_price, status) VALUES ($1, 0, $2) RETURNING id',
      [guest_user_id, 'active']
    );
    activeCartId = createdCart.rows[0].id;
  }
}




    const total_price = price_per_unit * quantity;

    const existingItem = await pool.query(
      'SELECT * FROM cart_items WHERE cart_id = $1 AND product_id = $2 AND size_label = $3',
      [activeCartId, product_id, size_label]
    );

    if (existingItem.rows.length > 0) {
      const updated = await pool.query(`
        UPDATE cart_items 
        SET quantity = quantity + $1::INT, total_price = total_price + $2::NUMERIC 
        WHERE cart_id = $3 AND product_id = $4 AND size_label = $5
        RETURNING *`,
        [quantity, total_price, activeCartId, product_id, size_label]
      );

      await pool.query(
        'UPDATE cart SET total_price = (SELECT COALESCE(SUM(total_price), 0) FROM cart_items WHERE cart_id = $1) WHERE id = $1',
        [activeCartId]
      );

      res.json({ message: 'Item updated', cart_id: activeCartId, item: updated.rows[0] });
    } else {
      const inserted = await pool.query(`
        INSERT INTO cart_items 
        (cart_id, product_id, size_label, quantity, price_per_unit, total_price, notes) 
        VALUES ($1, $2, $3, $4::INT, $5::NUMERIC, $6::NUMERIC, $7)
        RETURNING *`,
        [activeCartId, product_id, size_label, quantity, price_per_unit, total_price, notes || '']
      );

      await pool.query(
        'UPDATE cart SET total_price = (SELECT COALESCE(SUM(total_price), 0) FROM cart_items WHERE cart_id = $1) WHERE id = $1',
        [activeCartId]
      );

      res.json({ message: 'Item added', cart_id: activeCartId, item: inserted.rows[0] });
    }
  } catch (err) {
    console.error('❌ Add item error:', err.message);
    res.status(500).json({ error: 'Failed to add item to cart' });
  }
});

// ✅ Get Active Cart
router.get('/cart/user/:guest_user_id', async (req, res) => {
  const { guest_user_id } = req.params;

  try {
    const result = await pool.query(
      'SELECT * FROM cart WHERE guest_user_id = $1 AND status = $2',
      [guest_user_id, 'active']
    );

    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ message: 'No active cart' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Error retrieving cart' });
  }
});

// ✅ Delete Cart Item (and cancel cart if now empty)
router.delete('/cart_items/delete', async (req, res) => {
  const { cart_id, product_id, size_label } = req.body;

  try {
    const preCheck = await pool.query(
      'SELECT COUNT(*)::int AS count FROM cart_items WHERE cart_id = $1',
      [cart_id]
    );
    const hadItemsBefore = preCheck.rows[0].count > 0;

    await pool.query(
      'DELETE FROM cart_items WHERE cart_id = $1 AND product_id = $2 AND size_label = $3',
      [cart_id, product_id, size_label]
    );

    await pool.query(
      'UPDATE cart SET total_price = (SELECT COALESCE(SUM(total_price), 0) FROM cart_items WHERE cart_id = $1) WHERE id = $1',
      [cart_id]
    );

    const afterCheck = await pool.query(
      'SELECT COUNT(*)::int AS count FROM cart_items WHERE cart_id = $1',
      [cart_id]
    );
    const isNowEmpty = afterCheck.rows[0].count === 0;
if (hadItemsBefore && isNowEmpty) {
 await pool.query('DELETE FROM cart WHERE id = $1', [cart_id]);
return res.json({ message: 'Item deleted and cart removed', promoShouldClear: true });

}

res.json({ message: 'Item deleted' });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Update Quantity
router.put('/cart_items/update', async (req, res) => {
  const { cart_id, product_id, size_label, quantity } = req.body;

  if (!cart_id || !product_id || !size_label || quantity === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const qty = parseInt(quantity, 10);
  if (isNaN(qty) || qty <= 0) {
    return res.status(400).json({ error: 'Quantity must be > 0' });
  }

  try {
    const updated = await pool.query(`
      UPDATE cart_items 
      SET quantity = $1::INT, total_price = price_per_unit * $1::NUMERIC 
      WHERE cart_id = $2 AND product_id = $3 AND size_label = $4
      RETURNING *`,
      [qty, cart_id, product_id, size_label]
    );

    await pool.query(
      'UPDATE cart SET total_price = (SELECT COALESCE(SUM(total_price), 0) FROM cart_items WHERE cart_id = $1) WHERE id = $1',
      [cart_id]
    );

    res.json({ message: 'Quantity updated', item: updated.rows[0] });
  } catch (err) {
    console.error('❌ Quantity update error:', err.message);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// ✅ Get Cart Items
router.get('/cart/:cart_id/items', async (req, res) => {
  const { cart_id } = req.params;

  try {
    const result = await pool.query(`
      SELECT 
        ci.*, 
        p.name AS product_name,
        p.image_url AS product_image,
        c.name AS category_name
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      JOIN categories c ON p.category_id = c.id
      WHERE ci.cart_id = $1
    `, [cart_id]);

    res.json(result.rows);
  } catch (err) {
    console.error('❌ Error fetching cart items:', err.message);
    res.status(500).json({ error: 'Failed to get cart items' });
  }
});

// ✅ Apply Promo Code
router.post('/cart/:cart_id/apply-promocode', async (req, res) => {
  const { cart_id } = req.params;
  const { promo_code } = req.body;

  try {
    const promoRes = await pool.query(
      'SELECT * FROM promocode WHERE code = $1 AND status = $2',
      [promo_code, 'not applied']
    );

    if (promoRes.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or already used promo code' });
    }

    const promo = promoRes.rows[0];

    // Get current total price of the cart
    const cartRes = await pool.query(
      'SELECT total_price FROM cart WHERE id = $1',
      [cart_id]
    );

    if (cartRes.rows.length === 0) {
      return res.status(404).json({ error: 'Cart not found' });
    }

    const oldTotal = parseFloat(cartRes.rows[0].total_price);
const discountPercent = parseFloat(promo.discount_amount); // e.g. 10
const discountAmount = oldTotal * (discountPercent / 100); // 10% of oldTotal
const newTotal = Math.max(0, oldTotal - discountAmount);


    // Update cart total price
    await pool.query(
      'UPDATE cart SET total_price = $1 WHERE id = $2',
      [newTotal, cart_id]
    );

    // Mark promo code as applied
    await pool.query(
      "UPDATE promocode SET status = 'applied' WHERE id = $1",
      [promo.id]
    );

  res.json({
  message: 'Promo code applied successfully',
  discount_amount: discountAmount, // real value, e.g. 3 SAR
  new_total: newTotal,
  promocode_id: promo.id,
});
  } catch (err) {
    console.error('❌ Error applying promo code:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
