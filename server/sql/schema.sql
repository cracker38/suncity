CREATE DATABASE IF NOT EXISTS suncity_hotel CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE suncity_hotel;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS ai_conversations;
DROP TABLE IF EXISTS agent_requests;
DROP TABLE IF EXISTS activity_logs;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS favorites;
DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS newsletter_subscribers;
DROP TABLE IF EXISTS faqs;
DROP TABLE IF EXISTS testimonials;
DROP TABLE IF EXISTS offers;
DROP TABLE IF EXISTS blog_comments;
DROP TABLE IF EXISTS blog_posts;
DROP TABLE IF EXISTS gallery_items;
DROP TABLE IF EXISTS cms_pages;
DROP TABLE IF EXISTS settings;
DROP TABLE IF EXISTS lost_found;
DROP TABLE IF EXISTS maintenance_requests;
DROP TABLE IF EXISTS housekeeping_tasks;
DROP TABLE IF EXISTS catering_quotations;
DROP TABLE IF EXISTS catering_requests;
DROP TABLE IF EXISTS catering_packages;
DROP TABLE IF EXISTS event_bookings;
DROP TABLE IF EXISTS event_equipment;
DROP TABLE IF EXISTS event_packages;
DROP TABLE IF EXISTS event_halls;
DROP TABLE IF EXISTS restaurant_orders;
DROP TABLE IF EXISTS table_reservations;
DROP TABLE IF EXISTS menu_items;
DROP TABLE IF EXISTS menu_categories;
DROP TABLE IF EXISTS refunds;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS invoices;
DROP TABLE IF EXISTS booking_guests;
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS room_images;
DROP TABLE IF EXISTS room_amenities;
DROP TABLE IF EXISTS amenities;
DROP TABLE IF EXISTS rooms;
DROP TABLE IF EXISTS room_types;
DROP TABLE IF EXISTS refresh_tokens;
DROP TABLE IF EXISTS role_permissions;
DROP TABLE IF EXISTS permissions;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS roles;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(100) NOT NULL UNIQUE,
  description VARCHAR(255),
  module VARCHAR(50)
);

CREATE TABLE role_permissions (
  role_id INT NOT NULL,
  permission_id INT NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  role_id INT NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(30),
  avatar VARCHAR(255),
  address TEXT,
  city VARCHAR(100),
  country VARCHAR(100) DEFAULT 'Rwanda',
  is_active TINYINT(1) DEFAULT 1,
  email_verified TINYINT(1) DEFAULT 0,
  two_fa_enabled TINYINT(1) DEFAULT 0,
  two_fa_secret VARCHAR(255),
  reset_token VARCHAR(255),
  reset_token_expires DATETIME,
  last_login DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES roles(id)
);

CREATE TABLE refresh_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token VARCHAR(500) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE room_types (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  short_description VARCHAR(500),
  base_price DECIMAL(12,2) NOT NULL,
  max_guests INT DEFAULT 2,
  bed_type VARCHAR(100),
  size_sqm DECIMAL(8,2),
  featured TINYINT(1) DEFAULT 0,
  rating_avg DECIMAL(3,2) DEFAULT 0,
  review_count INT DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  cover_image VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE rooms (
  id INT AUTO_INCREMENT PRIMARY KEY,
  room_type_id INT NOT NULL,
  room_number VARCHAR(20) NOT NULL UNIQUE,
  floor INT DEFAULT 1,
  status ENUM('available','occupied','cleaning','maintenance','reserved') DEFAULT 'available',
  notes TEXT,
  FOREIGN KEY (room_type_id) REFERENCES room_types(id)
);

CREATE TABLE amenities (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(50)
);

CREATE TABLE room_amenities (
  room_type_id INT NOT NULL,
  amenity_id INT NOT NULL,
  PRIMARY KEY (room_type_id, amenity_id),
  FOREIGN KEY (room_type_id) REFERENCES room_types(id) ON DELETE CASCADE,
  FOREIGN KEY (amenity_id) REFERENCES amenities(id) ON DELETE CASCADE
);

CREATE TABLE room_images (
  id INT AUTO_INCREMENT PRIMARY KEY,
  room_type_id INT NOT NULL,
  image_url VARCHAR(500) NOT NULL,
  alt_text VARCHAR(255),
  sort_order INT DEFAULT 0,
  FOREIGN KEY (room_type_id) REFERENCES room_types(id) ON DELETE CASCADE
);

CREATE TABLE bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_code VARCHAR(30) NOT NULL UNIQUE,
  user_id INT,
  room_id INT,
  room_type_id INT NOT NULL,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  adults INT DEFAULT 1,
  children INT DEFAULT 0,
  special_requests TEXT,
  status ENUM('pending','confirmed','checked_in','checked_out','cancelled','no_show') DEFAULT 'pending',
  payment_status ENUM('unpaid','partial','paid','refunded') DEFAULT 'unpaid',
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  nights INT NOT NULL DEFAULT 1,
  guest_name VARCHAR(200),
  guest_email VARCHAR(150),
  guest_phone VARCHAR(30),
  source ENUM('website','walk_in','phone','admin') DEFAULT 'website',
  cancelled_at DATETIME,
  cancel_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL,
  FOREIGN KEY (room_type_id) REFERENCES room_types(id)
);

CREATE TABLE booking_guests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL,
  full_name VARCHAR(200) NOT NULL,
  id_type VARCHAR(50),
  id_number VARCHAR(100),
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

CREATE TABLE invoices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_number VARCHAR(40) NOT NULL UNIQUE,
  booking_id INT,
  user_id INT,
  amount DECIMAL(12,2) NOT NULL,
  tax_amount DECIMAL(12,2) DEFAULT 0,
  total_amount DECIMAL(12,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'RWF',
  status ENUM('draft','issued','paid','void','refunded') DEFAULT 'issued',
  due_date DATE,
  issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  meta_json JSON,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  payment_ref VARCHAR(50) NOT NULL UNIQUE,
  invoice_id INT,
  booking_id INT,
  user_id INT,
  amount DECIMAL(12,2) NOT NULL,
  method ENUM('mtn_momo','airtel_money','visa','mastercard','stripe','cash','bank') NOT NULL,
  status ENUM('pending','completed','failed','refunded') DEFAULT 'pending',
  provider_ref VARCHAR(150),
  meta_json JSON,
  paid_at DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE refunds (
  id INT AUTO_INCREMENT PRIMARY KEY,
  payment_id INT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  reason TEXT,
  status ENUM('pending','approved','rejected','completed') DEFAULT 'pending',
  processed_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (payment_id) REFERENCES payments(id),
  FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE menu_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  sort_order INT DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1
);

CREATE TABLE menu_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category_id INT NOT NULL,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  price DECIMAL(12,2) NOT NULL,
  image_url VARCHAR(500),
  is_chef_recommendation TINYINT(1) DEFAULT 0,
  is_available TINYINT(1) DEFAULT 1,
  FOREIGN KEY (category_id) REFERENCES menu_categories(id)
);

CREATE TABLE table_reservations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  guest_name VARCHAR(200) NOT NULL,
  guest_email VARCHAR(150),
  guest_phone VARCHAR(30),
  reservation_date DATE NOT NULL,
  reservation_time TIME NOT NULL,
  guests INT DEFAULT 2,
  status ENUM('pending','confirmed','seated','completed','cancelled') DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE restaurant_orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_code VARCHAR(30) NOT NULL UNIQUE,
  table_reservation_id INT,
  items_json JSON NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL,
  status ENUM('pending','preparing','ready','served','cancelled') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (table_reservation_id) REFERENCES table_reservations(id) ON DELETE SET NULL
);

CREATE TABLE event_halls (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  slug VARCHAR(150) NOT NULL UNIQUE,
  type ENUM('conference','wedding','corporate','graduation','birthday','private') NOT NULL,
  capacity INT NOT NULL,
  description TEXT,
  base_price DECIMAL(12,2) NOT NULL,
  cover_image VARCHAR(500),
  amenities_json JSON,
  is_active TINYINT(1) DEFAULT 1
);

CREATE TABLE event_packages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  hall_id INT,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  price DECIMAL(12,2) NOT NULL,
  includes_json JSON,
  is_active TINYINT(1) DEFAULT 1,
  FOREIGN KEY (hall_id) REFERENCES event_halls(id) ON DELETE SET NULL
);

CREATE TABLE event_equipment (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  quantity INT DEFAULT 1,
  daily_rate DECIMAL(12,2) DEFAULT 0,
  status ENUM('available','in_use','maintenance') DEFAULT 'available'
);

CREATE TABLE event_bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_code VARCHAR(30) NOT NULL UNIQUE,
  user_id INT,
  hall_id INT NOT NULL,
  package_id INT,
  event_type VARCHAR(100),
  event_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  guests INT DEFAULT 50,
  contact_name VARCHAR(200) NOT NULL,
  contact_email VARCHAR(150),
  contact_phone VARCHAR(30),
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  status ENUM('pending','confirmed','completed','cancelled') DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (hall_id) REFERENCES event_halls(id),
  FOREIGN KEY (package_id) REFERENCES event_packages(id) ON DELETE SET NULL
);

CREATE TABLE catering_packages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  category ENUM('corporate','wedding','school','ngo','private') NOT NULL,
  description TEXT,
  price_per_person DECIMAL(12,2) NOT NULL,
  min_guests INT DEFAULT 20,
  includes_json JSON,
  is_active TINYINT(1) DEFAULT 1
);

CREATE TABLE catering_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  request_code VARCHAR(30) NOT NULL UNIQUE,
  user_id INT,
  package_id INT,
  category ENUM('corporate','wedding','school','ngo','private') NOT NULL,
  event_date DATE NOT NULL,
  location VARCHAR(255),
  guests INT NOT NULL,
  contact_name VARCHAR(200) NOT NULL,
  contact_email VARCHAR(150),
  contact_phone VARCHAR(30),
  details TEXT,
  status ENUM('pending','quoted','confirmed','completed','cancelled') DEFAULT 'pending',
  assigned_staff INT,
  vehicle_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (package_id) REFERENCES catering_packages(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_staff) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE catering_quotations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  request_id INT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  valid_until DATE,
  notes TEXT,
  status ENUM('draft','sent','accepted','rejected') DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (request_id) REFERENCES catering_requests(id) ON DELETE CASCADE
);

CREATE TABLE housekeeping_tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  room_id INT NOT NULL,
  assigned_to INT,
  task_type ENUM('cleaning','inspection','laundry','turn_down') DEFAULT 'cleaning',
  status ENUM('pending','in_progress','completed','failed') DEFAULT 'pending',
  scheduled_date DATE NOT NULL,
  notes TEXT,
  completed_at DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (room_id) REFERENCES rooms(id),
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE maintenance_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  room_id INT,
  reported_by INT,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  priority ENUM('low','medium','high','urgent') DEFAULT 'medium',
  status ENUM('open','in_progress','resolved','closed') DEFAULT 'open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL,
  FOREIGN KEY (reported_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE lost_found (
  id INT AUTO_INCREMENT PRIMARY KEY,
  room_id INT,
  item_name VARCHAR(200) NOT NULL,
  description TEXT,
  status ENUM('found','claimed','disposed') DEFAULT 'found',
  found_date DATE NOT NULL,
  claimed_by VARCHAR(200),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL
);

CREATE TABLE gallery_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category ENUM('rooms','restaurant','conference','wedding','events','outside_catering','videos','virtual_tour') NOT NULL,
  title VARCHAR(200) NOT NULL,
  media_url VARCHAR(500) NOT NULL,
  media_type ENUM('image','video','embed') DEFAULT 'image',
  thumbnail_url VARCHAR(500),
  sort_order INT DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE blog_posts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  author_id INT,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  excerpt TEXT,
  content LONGTEXT NOT NULL,
  cover_image VARCHAR(500),
  category ENUM('news','travel','tourism','events','hospitality') DEFAULT 'news',
  status ENUM('draft','published') DEFAULT 'published',
  views INT DEFAULT 0,
  published_at DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE blog_comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  post_id INT NOT NULL,
  user_id INT,
  author_name VARCHAR(150),
  content TEXT NOT NULL,
  is_approved TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES blog_posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE offers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  slug VARCHAR(200) NOT NULL UNIQUE,
  description TEXT,
  discount_percent DECIMAL(5,2) DEFAULT 0,
  coupon_code VARCHAR(50),
  offer_type ENUM('seasonal','promotion','package','coupon','event') DEFAULT 'promotion',
  start_date DATE,
  end_date DATE,
  cover_image VARCHAR(500),
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE testimonials (
  id INT AUTO_INCREMENT PRIMARY KEY,
  guest_name VARCHAR(150) NOT NULL,
  guest_title VARCHAR(150),
  content TEXT NOT NULL,
  rating INT DEFAULT 5,
  avatar_url VARCHAR(500),
  is_featured TINYINT(1) DEFAULT 0,
  is_approved TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE faqs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  question VARCHAR(500) NOT NULL,
  answer TEXT NOT NULL,
  category VARCHAR(100) DEFAULT 'general',
  sort_order INT DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1
);

CREATE TABLE reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  room_type_id INT,
  booking_id INT,
  rating INT NOT NULL,
  title VARCHAR(200),
  content TEXT,
  is_approved TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (room_type_id) REFERENCES room_types(id) ON DELETE CASCADE,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL
);

CREATE TABLE favorites (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  room_type_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_fav (user_id, room_type_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (room_type_id) REFERENCES room_types(id) ON DELETE CASCADE
);

CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'info',
  is_read TINYINT(1) DEFAULT 0,
  link VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE newsletter_subscribers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(150) NOT NULL UNIQUE,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cms_pages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(100) NOT NULL UNIQUE,
  title VARCHAR(200) NOT NULL,
  content LONGTEXT,
  meta_title VARCHAR(200),
  meta_description VARCHAR(500),
  is_published TINYINT(1) DEFAULT 1,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value TEXT,
  category VARCHAR(50) DEFAULT 'general'
);

CREATE TABLE ai_conversations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  session_id VARCHAR(100),
  role ENUM('user','assistant') NOT NULL,
  message TEXT NOT NULL,
  intent VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE agent_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  request_code VARCHAR(40) NOT NULL UNIQUE,
  user_id INT NULL,
  session_id VARCHAR(100),
  guest_name VARCHAR(200),
  guest_email VARCHAR(150),
  guest_phone VARCHAR(30),
  topic VARCHAR(200),
  message TEXT NOT NULL,
  conversation_json JSON,
  status ENUM('open','assigned','in_progress','resolved','closed') DEFAULT 'open',
  priority ENUM('low','medium','high','urgent') DEFAULT 'medium',
  assigned_to INT NULL,
  staff_notes TEXT,
  resolved_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_agent_status (status),
  INDEX idx_agent_created (created_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  action VARCHAR(100) NOT NULL,
  entity VARCHAR(100),
  entity_id INT,
  details JSON,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE activity_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  activity VARCHAR(255) NOT NULL,
  meta_json JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_bookings_dates ON bookings(check_in, check_out);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_rooms_status ON rooms(status);
CREATE INDEX idx_payments_status ON payments(status);
