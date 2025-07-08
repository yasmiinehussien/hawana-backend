const express = require('express');
const router = express.Router();
const pool = require('../db_conn');
const upload = require('../utils/cloudinary'); // multer + Cloudinary uploader

// GET all categories
router.get('/categories', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categories ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Error fetching categories:', err.message);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// POST create new category with image upload (Cloudinary)
router.post('/categories', upload.single('image'), async (req, res) => {
  const { name, description, image_url } = req.body;

  // Cloudinary multer puts uploaded file info in req.file
  // It has .path, .secure_url, or .url for the uploaded file URL
  let finalImageUrl = image_url || '';
  if (req.file) {
    finalImageUrl = req.file.secure_url || req.file.path || finalImageUrl;
  }

  if (!name || !finalImageUrl) {
    return res.status(400).json({ error: 'Name and image are required (file or image_url)' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO categories (name, description, image_url) VALUES ($1, $2, $3) RETURNING *',
      [name, description, finalImageUrl]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('❌ Error creating category:', err.message);
    res.status(500).json({ error: 'Server error while creating category' });
  }
});

// PUT update category with optional image upload
router.put('/categories/:id', upload.single('image'), async (req, res) => {
  const { id } = req.params;
  const { name, description, image_url } = req.body;

  let finalImageUrl = image_url || '';
  if (req.file) {
    finalImageUrl = req.file.secure_url || req.file.path || finalImageUrl;
  }

  try {
    const result = await pool.query(
      `UPDATE categories SET name = $1, description = $2, image_url = $3 WHERE id = $4 RETURNING *`,
      [name, description, finalImageUrl, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('❌ Error updating category:', err.message);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// DELETE category
router.delete('/categories/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM categories WHERE id = $1', [id]);
    res.json({ message: 'Category deleted' });
  } catch (err) {
    console.error('❌ Error deleting category:', err.message);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

module.exports = router;
