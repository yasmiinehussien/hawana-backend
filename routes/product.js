const express = require('express');
const router = express.Router();
const pool = require('../db_conn');
const upload = require('../utils/cloudinary'); // ✅ Use Cloudinary uploader


// Define PORT manually (or import from config)
const BASE_URL = process.env.BASE_URL || `http://localhost:3000`;

// ---------------------------
// Product Routes
// ---------------------------

// GET all products
router.get('/products', async (req, res) => {
  const result = await pool.query('SELECT * FROM products WHERE archive = FALSE ORDER BY id');
  res.json(result.rows);
});

// POST new product
// POST new product
router.post('/products', upload.single('image'), async (req, res) => {
  const { name, category_id, calories, description, image_url, is_best_seller, is_new } = req.body;
  const parsedCategoryId = parseInt(category_id);

let finalImageUrl = req.body.image_url;

if (req.file?.path) {
  finalImageUrl = req.file.path; // ✅ Cloudinary returns the full URL
}

  if (!finalImageUrl) {
    return res.status(400).json({ error: 'Image is required (file or image_url)' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO products (name, category_id, calories, description, image_url, is_best_seller, is_new) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [name, parsedCategoryId, calories, description, finalImageUrl, is_best_seller || false, is_new || false]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('❌ Error saving product:', err.message);
    res.status(500).json({ error: 'Server error while adding product' });
  }
});

// PUT update product
router.put('/products/:id', upload.single('image'), async (req, res) => {
  const { name, category_id, calories, description, is_best_seller, is_new } = req.body;
  const { id } = req.params;

  // If new image uploaded use Cloudinary path, otherwise fallback to old image_url
  const image_url = req.file?.path || req.body.image_url;

  try {
    const result = await pool.query(
      'UPDATE products SET name=$1, category_id=$2, calories=$3, description=$4, image_url=$5, is_best_seller=$6, is_new=$7 WHERE id=$8 RETURNING *',
      [name, category_id, calories, description, image_url, is_best_seller || false, is_new || false, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('❌ Error updating product:', err.message);
    res.status(500).json({ error: 'Failed to update product' });
  }
});







// DELETE product
router.delete('/products/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // Check if product exists
    const checkProduct = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
    if (checkProduct.rowCount === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Step 1: Delete related cart_items (since they’re temporary)
    await pool.query('DELETE FROM cart_items WHERE product_id = $1', [id]);

    // Step 2: Delete the product (this will set product_id = NULL in order_items)
    await pool.query('DELETE FROM products WHERE id = $1', [id]);

    res.json({ message: '✅ Product deleted and removed from cart_items; order_items updated.' });
  } catch (err) {
    console.error('❌ Error deleting product:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// Get products by category
router.get('/categories/:id/products', async (req, res) => {
  const { id } = req.params;
  const result = await pool.query(
    'SELECT * FROM products WHERE category_id = $1 AND archive = FALSE ORDER BY id',
    [id]
  );
  res.json(result.rows);
});


// Get products with sizes
router.get('/categories/:id/products-with-sizes', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`
      SELECT 
        p.id as product_id,
        p.name as product_name,
        p.image_url,
        p.description,
        ps.id as size_id,
        ps.size_label,
        ps.price
      FROM products p
      LEFT JOIN product_sizes ps ON p.id = ps.product_id
      WHERE p.category_id = $1 AND p.archive = FALSE
      ORDER BY p.id, ps.id
    `, [id]);

    const grouped = {};
    result.rows.forEach(row => {
      if (!grouped[row.product_id]) {
        grouped[row.product_id] = {
          id: row.product_id,
          name: row.product_name,
          image_url: row.image_url,
          description: row.description,
          sizes: [],
        };
      }
      if (row.size_id) {
        grouped[row.product_id].sizes.push({
          id: row.size_id,
          label: row.size_label,
          price: row.price,
        });
      }
    });

    res.json(Object.values(grouped));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error while fetching products with sizes' });
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
        p.calories,                          

        MIN(ps.price) as price,
        MIN(CASE WHEN ps.discount_enabled THEN ps.price_after_discount ELSE ps.price END) as price_after_discount,
        EXISTS (
          SELECT 1 FROM product_sizes
          WHERE product_id = p.id AND discount_enabled = true
        ) as discount_enabled
      FROM products p
      LEFT JOIN product_sizes ps ON p.id = ps.product_id
      WHERE p.category_id = $1 AND p.archive = FALSE
      GROUP BY p.id
      ORDER BY p.id
    `, [id]);

  const products = result.rows.map(product => ({
  id: product.id,
  name: product.name,
  image: product.image,
  description: product.description,
    calories: product.calories, 

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


// Get best-seller min price
router.get('/products/best-sellers-min-price', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        p.id,
        p.name,
        p.image_url as image,
        p.description,
        MIN(ps.price) as price
      FROM products p
      LEFT JOIN product_sizes ps ON p.id = ps.product_id
      WHERE p.is_best_seller = true
      GROUP BY p.id
      ORDER BY p.id
    `);

    const products = result.rows.map(product => ({
      ...product,
      price: product.price ? `$${parseFloat(product.price).toFixed(2)}` : null
    }));

    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching best seller products with min price' });
  }
});











router.get('/products/:id/full', async (req, res) => {
  const { id } = req.params;

  try {
    // Get product info
   const productResult = await pool.query(
  'SELECT * FROM products WHERE id = $1 AND archive = FALSE',
  [id]
);


    if (productResult.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const product = productResult.rows[0];

    // Get sizes
    const sizesResult = await pool.query(
      'SELECT * FROM product_sizes WHERE product_id = $1',
      [id]
    );

    const sizes = sizesResult.rows.map(size => ({
      id: size.id,
      label: size.size_label,
      price: size.price,
      hasDiscount: size.discount_enabled,
      discount: size.discount_amount || ''
    }));

    res.json({ product, sizes });
  } catch (err) {
    console.error('Error fetching product full info:', err);
    res.status(500).json({ error: 'Failed to fetch full product info' });
  }
});


// Get best-sellers (full)
router.get('/products/best-sellers', async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM products WHERE is_best_seller = TRUE ORDER BY id DESC'
  );
  res.json(result.rows);
});

// Get new arrivals
router.get('/products/new-arrivals', async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM products WHERE is_new = TRUE ORDER BY id DESC'
  );
  res.json(result.rows);
});

module.exports = router;
