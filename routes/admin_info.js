const express = require('express');
const router = express.Router();
const pool = require('../db_conn');

const { storage } = require('../utils/cloudinary'); // ✅ You will create this file next



// const bcrypt = require('bcrypt');




//✅ Add a new admin
router.post('/', async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO admins (name, email, password) VALUES ($1, $2, $3) RETURNING *',
      [name, email, password]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('❌ Error adding admin:', err.message);
    res.status(500).json({ error: 'Failed to create admin' });
  }
});

// ✅ Get all admins
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, email, created_at FROM admins');
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Error fetching admins:', err.message);
    res.status(500).json({ error: 'Failed to fetch admin list' });
  }
});
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT id, name, email, image FROM admins WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Admin not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('❌ Error fetching admin:', err.message);
    res.status(500).json({ error: 'Failed to get admin info' });
  }
});


// ✅ Admin Login (Authentication)


// Secure Admin Login
// ✅ Admin Login WITHOUT JWT

// router.post('/', async (req, res) => {
//   const { name, email, password } = req.body;
//   try {
//     const hashedPassword = await bcrypt.hash(password, 10); // hash password
    
//     const result = await pool.query(
//       'INSERT INTO admins (name, email, password) VALUES ($1, $2, $3) RETURNING *',
//       [name, email, hashedPassword]
//     );
//     res.status(201).json(result.rows[0]);
//   } catch (err) {
//     console.error('Error adding admin:', err.message);
//     res.status(500).json({ error: 'Failed to create admin' });
//   }
// });


// Admin Login (no password hashing)

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query('SELECT * FROM admins WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const admin = result.rows[0];

    // Compare plain password directly
    if (admin.password !== password) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Login successful
    res.json({
      message: 'Login successful',
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        image: admin.image,
      },
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Server error during login' });
  }
});
router.post('/', upload.single('image'), async (req, res) => {
  const { name, email, password } = req.body;

  const image = req.file?.path || null; // ✅ Use Cloudinary image URL


  try {
    const result = await pool.query(
      'INSERT INTO admins (name, email, password, image) VALUES ($1, $2, $3, $4) RETURNING id, name, email, image',
      [name, email, password, image]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('❌ Error adding admin:', err.message);
    res.status(500).json({ error: 'Failed to create admin' });
  }
});

// ✅ Update admin (with image)
// ✅ Update admin (with optional image and password)
router.put('/:id', upload.single('image'), async (req, res) => {
  const { id } = req.params;
  const { name, email, password } = req.body;

const image = req.file?.path || req.body.image || null;


  try {
    // Build dynamic query
    const updates = [];
    const values = [];
    let index = 1;

    if (name) {
      updates.push(`name = $${index++}`);
      values.push(name);
    }
    if (email) {
      updates.push(`email = $${index++}`);
      values.push(email);
    }
    if (password) {
      updates.push(`password = $${index++}`);
      values.push(password);
    }
    if (image) {
      updates.push(`image = $${index++}`);
      values.push(image);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No data to update' });
    }

    values.push(id); // Add ID for WHERE clause

    const result = await pool.query(
      `UPDATE admins SET ${updates.join(', ')} WHERE id = $${index} RETURNING id, name, email, image`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('❌ Error updating admin:', err.message);
    res.status(500).json({ error: 'Failed to update admin' });
  }
});

module.exports = router;