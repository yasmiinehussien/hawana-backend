require('dotenv').config(); // 🔹 Load environment variables

const express = require('express');
const cors = require('cors'); // ✅ Only declare once
const multer = require('multer');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Middleware
app.use(cors({
  origin: ['https://hawanashop.com', 'https://www.hawanashop.com'],
  credentials: true
}));

app.use(express.json());




// =======================
// Serve static files
// =======================
// app.use('/images', express.static('images')); // 🔗 http://localhost:PORT/images/xxx.jpg

// // =======================
// // Image Upload Setup
// // =======================
// const storage = multer.diskStorage({
//   destination: 'images/',
//   filename: (req, file, cb) => {
//     const uniqueName = Date.now() + '-' + file.originalname;
//     cb(null, uniqueName);
//   },
// });
// const upload = multer({ storage });

// // Upload route
// app.post('/upload-image', upload.single('image'), (req, res) => {
//   if (!req.file) return res.status(400).json({ error: 'No image uploaded' });

//   const imageUrl = `${req.protocol}://${req.get('host')}/images/${req.file.filename}`; // ✅ dynamic URL
//   res.json({ image_url: imageUrl });
// });
const userRoutes = require('./routes/users');
app.use('/api', userRoutes);

const shopRoutes = require('./routes/shop_info');
app.use('/api/shop-info', shopRoutes);

const reviewRoutes = require('./routes/reviews');
app.use('/api', reviewRoutes);

const contactRoutes = require('./routes/contact');
app.use('/api', contactRoutes);

app.use('/promocode', require('./routes/promocode'));
// ✅ CORRECT:
app.use('/', require('./routes/promocode'));



const checkoutRoutes = require('./routes/checkout');
app.use('/api', checkoutRoutes);

const cartRoutes = require('./routes/cart');
app.use('/api', cartRoutes);

const ordersRoutes = require('./routes/order');
app.use('/api', ordersRoutes);

const productSizeRoutes = require('./routes/product_size');
app.use('/api', productSizeRoutes);

// const categoryRoutes = require('./routes/category');
// app.use(categoryRoutes); // Routes like: /categories

const categoryRoutes = require('./routes/category');
app.use('/api', categoryRoutes);


const productRoutes = require('./routes/product');
// app.use(productRoutes); // Routes like: /products
app.use('/api', productRoutes);


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
