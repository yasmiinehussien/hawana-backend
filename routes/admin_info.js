const express = require('express');
const router = express.Router();
const pool = require('../db_conn');
const upload = require('../utils/cloudinary'); // your existing 


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

// ✅ Get all admins (including image)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, email, image, created_at FROM admins');
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
console.error('Login error:', err); // ✅ log the full error object
    res.status(500).json({ error: 'Server error during login' });
  }
});
router.put('/:id', upload.single('image'), async (req, res) => {
  const { id } = req.params;
  const { name, email, password } = req.body;

  try {
    // Use the correct image URL from Cloudinary upload middleware
    const imageUrl = req.file ? (req.file.path || req.file.secure_url) : req.body.image || null;

    const updates = [];
    const values = [];
    let idx = 1;

    if (name) {
      updates.push(`name = $${idx++}`);
      values.push(name);
    }
    if (email) {
      updates.push(`email = $${idx++}`);
      values.push(email);
    }
    if (password) {
      updates.push(`password = $${idx++}`);
      values.push(password);
    }
    if (imageUrl) {
      updates.push(`image = $${idx++}`);
      values.push(imageUrl);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No data to update' });
    }

    values.push(id);

    const result = await pool.query(
      `UPDATE admins SET ${updates.join(', ')} WHERE id = $${idx} RETURNING id, name, email, image`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('❌ Error updating admin:', err);
    res.status(500).json({ error: 'Failed to update admin' });
  }
});


module.exports = router;

