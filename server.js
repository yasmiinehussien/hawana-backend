require('dotenv').config(); // 🔹 Load environment variables

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000; // ✅ Use env port, fallback to 3000

// =======================
// Middleware
// =======================
app.use(cors());
app.use(express.json());

// =======================
// Serve static files
// =======================
app.use('/images', express.static('images')); // 🔗 http://localhost:PORT/images/xxx.jpg

// =======================
// Image Upload Setup
// =======================
const storage = multer.diskStorage({
  destination: 'images/',
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  },
});
const upload = multer({ storage });

// Upload route
app.post('/upload-image', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image uploaded' });

  const imageUrl = `${req.protocol}://${req.get('host')}/images/${req.file.filename}`; // ✅ dynamic URL
  res.json({ image_url: imageUrl });
});
const userRoutes = require('./routes/users');
app.use(userRoutes); // Routes like: /users, /users/:id

const shopRoutes = require('./routes/shop_info');
app.use('/shop-info', shopRoutes); // ✅ Set the route prefix

const reviewRoutes = require('./routes/reviews');
app.use(reviewRoutes); // Routes like: /reviews

const contactRoutes = require('./routes/contact');
app.use(contactRoutes); // Routes like: /contact_messages

app.use('/promocode', require('./routes/promocode'));
// ✅ CORRECT:
app.use('/', require('./routes/promocode'));



const checkoutRoutes = require('./routes/checkout');
app.use(checkoutRoutes); // Routes like: /checkout

const cartRoutes = require('./routes/cart');
app.use(cartRoutes); // Routes like: /cart, /cart_items

const ordersRoutes = require('./routes/order');
app.use(ordersRoutes); // Routes like: /orders

const productSizeRoutes = require('./routes/product_size');
app.use(productSizeRoutes); // Routes like: /products/:id/sizes

const categoryRoutes = require('./routes/category');
app.use(categoryRoutes); // Routes like: /categories

const productRoutes = require('./routes/product');
app.use(productRoutes); // Routes like: /products


// admain apies 

const admainproducts = require('./routes/admain_products'); // 👈 import the archive route
app.use('/api', admainproducts); // 👈 route prefix

const admaicategory = require('./routes/admain-category'); // 👈 import the archive route
app.use('/api', admaicategory); // 👈 route prefix



const admaiOrder = require('./routes/admain-orders'); // 👈 import the archive route
app.use('/api', admaiOrder); // 👈 route prefix


const orderItemRoutes = require('./routes/order_items');
app.use('/api', orderItemRoutes); // 👈 This makes /api/order_items available

const promoCodeRoutes = require('./routes/admain-promoCode');
app.use('/api', promoCodeRoutes);

const adminMessages = require('./routes/admain-message');
app.use('/api', adminMessages);



const adminRoutes = require('./routes/admin_info');
app.use('/api/admins', adminRoutes);


// payment api
const urwayRoutes = require('./routes/urway'); // adjust path
app.use('/urway', urwayRoutes); // 🔗 http://localhost:3000/urway/pay






// Set destination and filename for uploaded images


// Test Route
app.get('/', (req, res) => {
  res.send('Hawana Backend is Running ✅');
});


// ---------------------------
// Add image Server
// ---------------------------



// =======================
// Start Server
// =======================
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
