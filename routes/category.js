const express = require('express');
const router = express.Router();
const pool = require('../db_conn'); // or '../db'
const multer = require('multer');
const { storage } = require('../utils/cloudinary'); // ✅ You will create this file next
const upload = multer({ storage });


// ✅ Define backend server port (used in image URL)
const BASE_URL = process.env.BASE_URL || `http://localhost:3000`;

// ✅ GET all categories
router.get('/categories', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categories ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Error fetching categories:', err.message);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});


router.post('/categories', upload.single('image'), async (req, res) => {
  const { name, description } = req.body;

  if (!req.file || !req.file.path) {
    return res.status(400).json({ error: 'Image is required (upload a file)' });
  }

  const image_url = req.file.path; // ✅ Cloudinary auto returns full URL

  try {
    const result = await pool.query(
      'INSERT INTO categories (name, description, image_url) VALUES ($1, $2, $3) RETURNING *',
      [name, description, image_url]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('❌ Error creating category:', err.message);
    res.status(500).json({ error: 'Failed to create category' });
  }
});


// // ✅ POST new category (with image upload)
// router.post('/categories', categoryUpload.single('image'), async (req, res) => {
//   const { name, description } = req.body;

//   let image_url = req.body.image_url;

//   // ✅ Correct deployment-safe URL
//   if (req.file) {
//     image_url = `${req.protocol}://${req.get('host')}/images/${req.file.filename}`;
//   }

//   if (!image_url) {
//     return res.status(400).json({ error: 'Image is required (upload a file)' });
//   }

//   try {
//     const result = await pool.query(
//       'INSERT INTO categories (name, description, image_url) VALUES ($1, $2, $3) RETURNING *',
//       [name, description, image_url]
//     );
//     res.status(201).json(result.rows[0]);
//   } catch (err) {
//     console.error('❌ Error creating category:', err.message);
//     res.status(500).json({ error: 'Failed to create category' });
//   }
// });



router.put('/categories/:id', upload.single('image'), async (req, res) => {
  const { name, description } = req.body;
  const { id } = req.params;

  const image_url = req.file?.path || req.body.image_url; // ✅ Use new Cloudinary path

  try {
    const result = await pool.query(
      `UPDATE categories
       SET name = $1, description = $2, image_url = $3
       WHERE id = $4
       RETURNING *`,
      [name, description, image_url, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('❌ Category update failed:', err.message);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// // ✅ PUT update category with optional image
// router.put('/categories/:id', categoryUpload.single('image'), async (req, res) => {
//   const { name, description } = req.body;
//   const { id } = req.params;

//   try {
//    const image_url = req.file
//   ? `${req.protocol}://${req.get('host')}/images/${req.file.filename}`
//   : req.body.image_url;

//     const result = await pool.query(
//       `UPDATE categories
//        SET name = $1, description = $2, image_url = $3
//        WHERE id = $4
//        RETURNING *`,
//       [name, description, image_url, id]
//     );

//     res.json(result.rows[0]);
//   } catch (err) {
//     console.error('❌ Category update failed:', err.message);
//     res.status(500).json({ error: 'Failed to update category' });
//   }
// });


// ✅ DELETE category
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
