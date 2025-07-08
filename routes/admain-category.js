const express = require('express');
const router = express.Router();

const pool = require('../db_conn'); // adjust path as needed

const upload = require('../utils/cloudinary'); // Cloudinary uploader

// GET all categories
router.get('/categories', async (req, res) => {
  const result = await pool.query('SELECT * FROM categories ORDER BY id');
  res.json(result.rows);
});

// router.post('/categories', upload.single('image'), async (req, res) => {
//   console.log('req.file:', req.file); // debug log

//   const { name, description, image_url: imageUrlFromBody } = req.body;

//   // Use secure_url from Cloudinary upload result
//   let finalImageUrl = imageUrlFromBody;
//   if (req.file && req.file.secure_url) {
//     finalImageUrl = req.file.secure_url;
//   }

//   if (!name || !finalImageUrl) {
//     return res.status(400).json({ error: 'Name and image are required (file or image_url)' });
//   }

//   try {
//     const result = await pool.query(
//       'INSERT INTO categories (name, description, image_url) VALUES ($1, $2, $3) RETURNING *',
//       [name, description, finalImageUrl]
//     );
//     res.status(201).json(result.rows[0]);
//   } catch (err) {
//     console.error('❌ Error creating category:', err.message);
//     res.status(500).json({ error: 'Server error while creating category' });
//   }
// });


// PUT update category with optional image upload
router.put('/categories/:id', upload.single('image'), async (req, res) => {
  const { id } = req.params;
  const { name, description, image_url: imageUrlFromBody } = req.body;

  // Prefer uploaded image URL if file uploaded via Cloudinary
  let finalImageUrl = imageUrlFromBody;
  if (req.file?.path) {
    finalImageUrl = req.file.path; // or req.file.secure_url
  }

  try {
    // Update query dynamically if you want to only update provided fields
    const updates = [];
    const values = [];
    let idx = 1;

    if (name) {
      updates.push(`name = $${idx++}`);
      values.push(name);
    }
    if (description) {
      updates.push(`description = $${idx++}`);
      values.push(description);
    }
    if (finalImageUrl) {
      updates.push(`image_url = $${idx++}`);
      values.push(finalImageUrl);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No data to update' });
    }

    values.push(id);

    const result = await pool.query(
      `UPDATE categories SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
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
  await pool.query('DELETE FROM categories WHERE id=$1', [id]);
  res.json({ message: 'Category deleted' });
});

module.exports = router;
