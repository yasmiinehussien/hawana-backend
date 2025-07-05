const express = require('express');
const router = express.Router();
const pool = require('../db_conn');
router.post('/checkout', async (req, res) => {
  const {
    cart_id,
    delivery_method,
    payment_method,
    customer_name,
    customer_mobile,
    shipping_amount = 0,
    tax_amount = 0,
    notes = '',
    promocode_id = null,
    address = null
  } = req.body;

  try {
    // 1️⃣ Fetch the active cart
    const cartResult = await pool.query(
      'SELECT * FROM cart WHERE id = $1 AND status = $2',
      [cart_id, 'active']
    );
    const cart = cartResult.rows[0];
    if (!cart) {
      return res.status(404).json({ error: 'Cart not found or already checked out' });
    }

    const guest_user_id = cart.guest_user_id; // ✅ use guest ID

    // 2️⃣ Get cart items
    const cartItemsResult = await pool.query(
  `SELECT ci.*, p.name AS product_name
   FROM cart_items ci
   JOIN products p ON ci.product_id = p.id
   WHERE ci.cart_id = $1`,
  [cart_id]
);
    const cartItems = cartItemsResult.rows;
    if (cartItems.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    // 3️⃣ If promo applied, validate it
    if (promocode_id) {
      const promoCheck = await pool.query(
        'SELECT discount_amount FROM promocode WHERE id = $1',
        [promocode_id]
      );

      if (promoCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Promo code not found' });
      }

      // Check if this guest already used this promo
const usageCheck = await pool.query(
  'SELECT status FROM user_promocode WHERE guest_user_id = $1 AND promocode_id = $2',
  [guest_user_id, promocode_id]
);

if (
  usageCheck.rows.length === 0 ||
  usageCheck.rows[0].status === 'used'
)

      {
        return res.status(400).json({ error: 'Promo code is not valid or already used' });
      }
    }

    // 4️⃣ Subtotal calculations
    const subtotal_before_promo = cartItems.reduce((sum, item) => sum + parseFloat(item.total_price), 0);
    const promoDiscount = promocode_id
      ? parseFloat(
          (
            await pool.query('SELECT discount_amount FROM promocode WHERE id = $1', [promocode_id])
          ).rows[0].discount_amount
        )
      : 0;
    const discountAmount = subtotal_before_promo * (promoDiscount / 100);
    const subtotal_after_promo = Math.max(subtotal_before_promo - discountAmount, 0);
    const total_price = subtotal_after_promo + parseFloat(shipping_amount) + parseFloat(tax_amount);

    // 5️⃣ Create order
    const orderResult = await pool.query(
      `INSERT INTO orders (
        user_id, total_price, status, payment_method, delivery_method,
        shipping_amount, tax_amount, notes, customer_name, customer_mobile,
        promocode_id, address, cart_id,
        subtotal_before_promo, subtotal_after_promo
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15
      )
      RETURNING *`,
      [
        cart.user_id,
        total_price,
        'pending',
        payment_method,
        delivery_method,
        shipping_amount,
        tax_amount,
        notes,
        customer_name,
        customer_mobile,
        promocode_id,
        address,
        cart_id,
        subtotal_before_promo,
        subtotal_after_promo
      ]
    );

    const order = orderResult.rows[0];

    // 6️⃣ Add order items
  for (const item of cartItems) {
  await pool.query(
    `INSERT INTO order_items 
      (order_id, product_id, size_label, quantity, price_per_unit, total_price, product_name) 
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      order.id,
      item.product_id,
      item.size_label,
      item.quantity,
      item.price_per_unit,
      item.total_price,
      item.product_name // <-- added here
    ]
  );
}


    // 7️⃣ Clean up cart
    await pool.query('DELETE FROM cart_items WHERE cart_id = $1', [cart_id]);
    await pool.query('UPDATE cart SET status = $1 WHERE id = $2', ['checked_out', cart_id]);

    // 8️⃣ Mark promo as used for guest
    if (promocode_id && guest_user_id) {
      await pool.query(
  `UPDATE user_promocode 
   SET status = 'used', used_at = NOW() 
   WHERE guest_user_id = $1 AND promocode_id = $2`,
  [guest_user_id, promocode_id]
);

    }

    res.json({ message: '✅ Checkout complete', order_id: order.id });
  } catch (err) {
    console.error('❌ Checkout Error:', err.message);
    res.status(500).json({ error: 'Checkout failed' });
  }
});

module.exports = router;
