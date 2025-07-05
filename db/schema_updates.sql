-- Update cart table to support guest users
ALTER TABLE cart 
ALTER COLUMN user_id DROP NOT NULL,
ALTER COLUMN user_id DROP CONSTRAINT cart_user_id_fkey;

-- Add a new column for guest user ID
ALTER TABLE cart 
ADD COLUMN guest_user_id VARCHAR(255) UNIQUE;

-- Update cart_items table to reference cart directly
ALTER TABLE cart_items 
ALTER COLUMN cart_id DROP NOT NULL,
ALTER COLUMN cart_id DROP CONSTRAINT cart_items_cart_id_fkey;

-- Add a new column for guest cart reference
ALTER TABLE cart_items 
ADD COLUMN guest_cart_id VARCHAR(255) REFERENCES cart(guest_user_id);


-- Add a new column for admain

ALTER TABLE admins
ADD COLUMN image TEXT;

-- add two coulmns in shopinfo
ALTER TABLE shopinfo
ADD COLUMN shipping NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN tax NUMERIC(10, 2) DEFAULT 0;







//--------------------------
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
  image_url TEXT
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

-- 5. Promocodes
CREATE TABLE promocode (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  discount_amount NUMERIC(10, 2) NOT NULL,
  status VARCHAR(20) DEFAULT 'not applied',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  end_date TIMESTAMP
);

-- 6. User-Promocode (depends on users, promocode)
CREATE TABLE user_promocode (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  promocode_id INTEGER REFERENCES promocode(id),
  used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMP,
  UNIQUE (user_id, promocode_id)
);

-- 7. Orders (depends on users, promocode)
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  total_price DECIMAL(10, 2) NOT NULL,
  subtotal_before_promo DECIMAL(10, 2) DEFAULT 0.00,
  subtotal_after_promo DECIMAL(10, 2) DEFAULT 0.00,
  status VARCHAR(50) DEFAULT 'pending',
  payment_method VARCHAR(50) DEFAULT 'cash',
  delivery_method VARCHAR(50),
  shipping_amount DECIMAL(10, 2) DEFAULT 0.00,
  tax_amount DECIMAL(10, 2) DEFAULT 0.00,
  notes TEXT,
  address TEXT,
  customer_name VARCHAR(100),
  customer_mobile VARCHAR(20),
  promocode_id INT REFERENCES promocode(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Order Items (depends on orders, products)
CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  order_id INT REFERENCES orders(id) ON DELETE CASCADE,
  product_id INT REFERENCES products(id),
  size_label VARCHAR(50),
  quantity INT DEFAULT 1,
  price_per_unit DECIMAL(10, 2),
  total_price DECIMAL(10, 2)
);

-- 9. Reviews (depends on users, orders)
CREATE TABLE reviews (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  rating INT CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. Cart (depends on users)
CREATE TABLE cart (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  guest_user_id VARCHAR(255),  -- ✅ Optional, not UNIQUE
  status VARCHAR(20) DEFAULT 'active',
  total_price DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. Cart Items (depends on cart, products)
CREATE TABLE cart_items (
  id SERIAL PRIMARY KEY,
  cart_id INT REFERENCES cart(id) ON DELETE CASCADE,
  product_id INT REFERENCES products(id),
  size_label VARCHAR(50),
  quantity INT NOT NULL CHECK (quantity > 0),
  price_per_unit DECIMAL(10, 2) NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12. Addresses (depends on users)
CREATE TABLE addresses (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  address TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 13. Contact Messages
CREATE TABLE contact_messages (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  message TEXT NOT NULL,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  replied BOOLEAN DEFAULT FALSE
);

-- 14. Shop Info
CREATE TABLE shop_info (
  id SERIAL PRIMARY KEY,
  phone TEXT,
  email TEXT,
  tiktok_url TEXT,
  snapchat_url TEXT,
  instagram_url TEXT,
  whatsapp_url TEXT,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-----------------------------
-- Make sure promo code status allows 'pending'
ALTER TABLE promocode 
  ADD CONSTRAINT promo_status_check CHECK (status IN ('not applied', 'pending', 'applied'));

