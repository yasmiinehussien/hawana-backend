const express = require('express');
const router = express.Router();
const pool = require('../db_conn');

const baseUrl = process.env.BASE_URL || `http://localhost:3000`;

const upload = require('../utils/cloudinary'); // ✅ Cloudinary uploader



// ✅ Archive product (soft delete)
router.put('/products/:id/archive', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'UPDATE products SET archive = TRUE WHERE id = $1 RETURNING *',
      [id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('❌ Error archiving product:', err.message);
    res.status(500).json({ error: 'Failed to archive product' });
  }
});

// ✅ Unarchive product
router.put('/products/:id/unarchive', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'UPDATE products SET archive = FALSE WHERE id = $1 RETURNING *',
      [id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('❌ Error unarchiving product:', err.message);
    res.status(500).json({ error: 'Failed to unarchive product' });
  }
});

// GET all products (including archived)
router.get('/products-all', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Error fetching all products:', err.message);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Get category products with min price and discount info
router.get('/categories/:id/products-min-price', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`
      SELECT 
        p.id as id,
        p.name,
        p.image_url as image,
        p.description,
        MIN(ps.price) as price,
        MIN(CASE WHEN ps.discount_enabled THEN ps.price_after_discount ELSE ps.price END) as price_after_discount,
        EXISTS (
          SELECT 1 FROM product_sizes
          WHERE product_id = p.id AND discount_enabled = true
        ) as discount_enabled
      FROM products p
      LEFT JOIN product_sizes ps ON p.id = ps.product_id
      WHERE p.category_id = $1
      GROUP BY p.id
      ORDER BY p.id
    `, [id]);

  const products = result.rows.map(product => ({
  id: product.id,
  name: product.name,
  image: product.image,
  description: product.description,
  price: product.price ? parseFloat(product.price) : null,
  price_after_discount: product.price_after_discount ? parseFloat(product.price_after_discount) : null,
  discount_enabled: product.discount_enabled
}));


    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching products with min price' });
  }
});

// api 

// ✅ Route: /api/products-with-min-price
// GET /api/products-with-min-price
router.get('/products-with-min-price', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        p.id,
        p.name,
        p.description,
        p.calories,
        p.archive,
        p.is_best_seller,
        p.is_new,
        p.image_url AS image,  -- use AS image for consistency
        MIN(ps.price) AS price,
        MIN(
          CASE 
            WHEN ps.discount_enabled THEN ps.price_after_discount 
            ELSE ps.price 
          END
        ) AS price_after_discount,
        EXISTS (
          SELECT 1 FROM product_sizes 
          WHERE product_id = p.id AND discount_enabled = true
        ) AS discount_enabled
      FROM products p
      LEFT JOIN product_sizes ps ON p.id = ps.product_id
      GROUP BY p.id
      ORDER BY p.id
    `);

    const products = result.rows.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      calories: p.calories,
      archive: p.archive,
      is_best_seller: p.is_best_seller,
      is_new: p.is_new,
      image: p.image, // this should be a full URL like http://localhost:3000/images/xxx.jpg
      price: p.price ? parseFloat(p.price) : null,
      price_after_discount: p.price_after_discount ? parseFloat(p.price_after_discount) : null,
      discount_enabled: p.discount_enabled
    }));

    res.json(products);
  } catch (err) {
    console.error('❌ Error fetching products with min price:', err.message);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});


router.put('/products/:id', upload.single('image'), async (req, res) => {
  const { id } = req.params;

  const {
    name,
    calories,
    description,
    category_id,
    is_best_seller,
    is_new,
    image_url // fallback if no new image
  } = req.body;

  let finalImageUrl = image_url;

  // ✅ If a new image is uploaded
  
  if (req.file) {
finalImageUrl = req.file.path; // ✅ Cloudinary gives full HTTPS URL here
  }

  try {
    const result = await pool.query(
      `UPDATE products
       SET name = $1,
           calories = $2,
           description = $3,
           category_id = $4,
           is_best_seller = $5,
           is_new = $6,
           image_url = $7
       WHERE id = $8
       RETURNING *`,
      [
        name,
        calories,
        description,
        category_id,
        is_best_seller === 'true',
        is_new === 'true',
        finalImageUrl,
        id
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('❌ Error updating product:', err.message);
    res.status(500).json({ error: 'Failed to update product' });
  }
});





module.exports = router;
