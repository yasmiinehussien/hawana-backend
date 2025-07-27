-- 1. Users
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Categories
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  image_url TEXT,
  description TEXT,
  name VARCHAR(100) NOT NULL UNIQUE
);

-- 3. Products (depends on categories)
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category_id INT REFERENCES categories(id),
  calories INT,
  description TEXT,
  is_best_seller BOOLEAN DEFAULT FALSE,
  is_new BOOLEAN DEFAULT FALSE,
  image_url TEXT,
  archive BOOLEAN DEFAULT FALSE
);


-- 4. Product Sizes (depends on products)
CREATE TABLE product_sizes (
  id SERIAL PRIMARY KEY,
  product_id INT REFERENCES products(id) ON DELETE CASCADE,
  size_label VARCHAR(50),
  price DECIMAL(10, 2) NOT NULL,
  discount_enabled BOOLEAN DEFAULT FALSE,
  discount_amount DECIMAL(10, 2) DEFAULT 0.00,
  price_after_discount DECIMAL(10, 2)
);

CREATE TABLE promocode (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  discount_amount NUMERIC(10, 2) NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  end_date TIMESTAMP
);

CREATE TABLE user_promocode (
  id SERIAL PRIMARY KEY,
  guest_user_id VARCHAR(100) NOT NULL,
  promocode_id INTEGER NOT NULL REFERENCES promocode(id) ON DELETE CASCADE,
  status VARCHAR(20) CHECK (status IN ('pending', 'used')) DEFAULT 'pending',
  used_at TIMESTAMP,
  UNIQUE (guest_user_id, promocode_id)
);


-- 6. Orders (depends on users, promocode)
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  cart_id INT REFERENCES cart(id),  -- ✅ added this line
  total_price DECIMAL(10, 2) NOT NULL,
  subtotal_before_promo DECIMAL(10, 2) DEFAULT 0.00,
  subtotal_after_promo DECIMAL(10, 2) DEFAULT 0.00,
  status VARCHAR(50) DEFAULT 'pending',
  payment_method VARCHAR(50) DEFAULT 'cash',
  delivery_method VARCHAR(50),
  shipping_amount DECIMAL(10, 2) DEFAULT 0.00,
  tax_amount DECIMAL(10, 2) DEFAULT 0.00,
  address TEXT,
  customer_name VARCHAR(100),
  customer_mobile VARCHAR(20),
  promocode_id INT REFERENCES promocode(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- 7. Order Items (depends on orders, products)
CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  order_id INT REFERENCES orders(id) ON DELETE CASCADE,
  product_id INT REFERENCES products(id) ON DELETE SET NULL,
  size_label VARCHAR(50),
  quantity INT DEFAULT 1,
  price_per_unit DECIMAL(10, 2),
  total_price DECIMAL(10, 2),
  product_name VARCHAR(255),  -- new column
  notes TEXT                  -- new column for per-item notes
);



-- 9. Reviews (guest only)
CREATE TABLE reviews (
  id SERIAL PRIMARY KEY,
  guest_user_id VARCHAR(100) NOT NULL,
  order_id INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  rating INT CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- 9. Cart (depends on users)
CREATE TABLE cart (
  id SERIAL PRIMARY KEY,
  guest_user_id VARCHAR(100) NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  total_price DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. Cart Items (depends on cart, products)
CREATE TABLE cart_items (
  id SERIAL PRIMARY KEY,
  cart_id INT REFERENCES cart(id) ON DELETE CASCADE,
  product_id INT REFERENCES products(id),
  product_name VARCHAR(255),
  size_label VARCHAR(50),
  quantity INT NOT NULL CHECK (quantity > 0),
  price_per_unit DECIMAL(10, 2) NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- 11. Addresses (depends on users)
CREATE TABLE addresses (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  address TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12. Contact Messages
CREATE TABLE contact_messages (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  message TEXT NOT NULL,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  replied BOOLEAN DEFAULT FALSE
);

CREATE TABLE ShopInfo (
  id SERIAL PRIMARY KEY,
  phone TEXT,
  email TEXT,
  tiktok_url TEXT,
  snapchat_url TEXT,
  instagram_url TEXT,
  whatsapp_url TEXT,
  tax NUMERIC(10, 2) DEFAULT 0.00,
  shipping NUMERIC(10, 2) DEFAULT 0.00
);


CREATE TABLE admins (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password TEXT NOT NULL,
  image TEXT,  -- ✅ optional column for profile image
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO admins (name, email, password)
VALUES ('Super Admin', 'admin@hawana.com', 'admin123');