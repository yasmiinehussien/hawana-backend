const express = require('express');
const router = express.Router();
const multer = require('multer');

const pool = require('../db_conn'); // adjust path as needed
PORT = 3000

// ✅ Setup for image upload
const storage = multer.diskStorage({
  destination: 'images/',
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  },
});
const upload = multer({ storage });

// ✅ GET all categories
router.get('/categories', async (req, res) => {
  const result = await pool.query('SELECT * FROM categories ORDER BY id');
  res.json(result.rows);
});

// ✅ POST new category (with image upload)
// router.post('/categories', upload.single('image'), async (req, res) => {
//   const { name, description } = req.body;

//   let image_url = req.body.image_url;
//   if (req.file) {
//     image_url = `http://localhost:${PORT}/images/${req.file.filename}`;
//   }

//   if (!image_url) {
//     return res.status(400).json({ error: 'Image is required (upload a file)' });
//   }

//   try {
//     const result = await pool.query(
//       'INSERT INTO categories (name, description, image_url) VALUES ($1, $2, $3) RETURNING *',
//       [name, description, image_url]
//     );
//     res.json(result.rows[0]);
//   } catch (err) {
//     console.error('❌ Error creating category:', err.message);
//     res.status(500).json({ error: 'Failed to create category' });
//   }
// });

// ✅ PUT update category
// router.put('/categories/:id', async (req, res) => {
//   const { name, description, image_url } = req.body;
//   const { id } = req.params;

//   try {
//     const result = await pool.query(
//       'UPDATE categories SET name = $1, description = $2, image_url = $3 WHERE id = $4 RETURNING *',
//       [name, description, image_url, id]
//     );
//     res.json(result.rows[0]);
//   } catch (err) {
//     res.status(400).json({ error: err.message });
//   }
// });

// ✅ DELETE category
router.delete('/categories/:id', async (req, res) => {
  const { id } = req.params;
  await pool.query('DELETE FROM categories WHERE id=$1', [id]);
  res.json({ message: 'Category deleted' });
});

module.exports = router;
