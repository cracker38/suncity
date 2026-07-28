PRAGMA foreign_keys = OFF;

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

PRAGMA foreign_keys = ON;

CREATE TABLE roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  module TEXT
);

CREATE TABLE role_permissions (
  role_id INTEGER NOT NULL,
  permission_id INTEGER NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role_id INTEGER NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  avatar TEXT,
  address TEXT,
  city TEXT,
  country TEXT DEFAULT 'Rwanda',
  is_active INTEGER DEFAULT 1,
  email_verified INTEGER DEFAULT 0,
  two_fa_enabled INTEGER DEFAULT 0,
  two_fa_secret TEXT,
  reset_token TEXT,
  reset_token_expires TEXT,
  last_login TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (role_id) REFERENCES roles(id)
);

CREATE TABLE refresh_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE room_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  short_description TEXT,
  base_price REAL NOT NULL,
  max_guests INTEGER DEFAULT 2,
  bed_type TEXT,
  size_sqm REAL,
  featured INTEGER DEFAULT 0,
  rating_avg REAL DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  cover_image TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE rooms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_type_id INTEGER NOT NULL,
  room_number TEXT NOT NULL UNIQUE,
  floor INTEGER DEFAULT 1,
  status TEXT DEFAULT 'available',
  notes TEXT,
  FOREIGN KEY (room_type_id) REFERENCES room_types(id)
);

CREATE TABLE amenities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  icon TEXT
);

CREATE TABLE room_amenities (
  room_type_id INTEGER NOT NULL,
  amenity_id INTEGER NOT NULL,
  PRIMARY KEY (room_type_id, amenity_id),
  FOREIGN KEY (room_type_id) REFERENCES room_types(id) ON DELETE CASCADE,
  FOREIGN KEY (amenity_id) REFERENCES amenities(id) ON DELETE CASCADE
);

CREATE TABLE room_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_type_id INTEGER NOT NULL,
  image_url TEXT NOT NULL,
  alt_text TEXT,
  sort_order INTEGER DEFAULT 0,
  FOREIGN KEY (room_type_id) REFERENCES room_types(id) ON DELETE CASCADE
);

CREATE TABLE bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_code TEXT NOT NULL UNIQUE,
  user_id INTEGER,
  room_id INTEGER,
  room_type_id INTEGER NOT NULL,
  check_in TEXT NOT NULL,
  check_out TEXT NOT NULL,
  adults INTEGER DEFAULT 1,
  children INTEGER DEFAULT 0,
  special_requests TEXT,
  status TEXT DEFAULT 'pending',
  payment_status TEXT DEFAULT 'unpaid',
  total_amount REAL NOT NULL DEFAULT 0,
  discount_amount REAL DEFAULT 0,
  coupon_code TEXT,
  nights INTEGER NOT NULL DEFAULT 1,
  guest_name TEXT,
  guest_email TEXT,
  guest_phone TEXT,
  source TEXT DEFAULT 'website',
  cancelled_at TEXT,
  cancel_reason TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL,
  FOREIGN KEY (room_type_id) REFERENCES room_types(id)
);

CREATE TABLE booking_guests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL,
  full_name TEXT NOT NULL,
  id_type TEXT,
  id_number TEXT,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

CREATE TABLE invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_number TEXT NOT NULL UNIQUE,
  booking_id INTEGER,
  user_id INTEGER,
  amount REAL NOT NULL,
  tax_amount REAL DEFAULT 0,
  total_amount REAL NOT NULL,
  currency TEXT DEFAULT 'RWF',
  status TEXT DEFAULT 'issued',
  due_date TEXT,
  issued_at TEXT DEFAULT (datetime('now')),
  notes TEXT,
  meta_json TEXT,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  payment_ref TEXT NOT NULL UNIQUE,
  invoice_id INTEGER,
  booking_id INTEGER,
  user_id INTEGER,
  amount REAL NOT NULL,
  method TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  provider_ref TEXT,
  meta_json TEXT,
  paid_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE refunds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  payment_id INTEGER NOT NULL,
  amount REAL NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'pending',
  processed_by INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (payment_id) REFERENCES payments(id),
  FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE menu_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  sort_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1
);

CREATE TABLE menu_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price REAL NOT NULL,
  image_url TEXT,
  is_chef_recommendation INTEGER DEFAULT 0,
  is_available INTEGER DEFAULT 1,
  FOREIGN KEY (category_id) REFERENCES menu_categories(id)
);

CREATE TABLE table_reservations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  guest_name TEXT NOT NULL,
  guest_email TEXT,
  guest_phone TEXT,
  reservation_date TEXT NOT NULL,
  reservation_time TEXT NOT NULL,
  guests INTEGER DEFAULT 2,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE restaurant_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_code TEXT NOT NULL UNIQUE,
  table_reservation_id INTEGER,
  items_json TEXT NOT NULL,
  total_amount REAL NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (table_reservation_id) REFERENCES table_reservations(id) ON DELETE SET NULL
);

CREATE TABLE event_halls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  capacity INTEGER NOT NULL,
  description TEXT,
  base_price REAL NOT NULL,
  cover_image TEXT,
  amenities_json TEXT,
  is_active INTEGER DEFAULT 1
);

CREATE TABLE event_packages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hall_id INTEGER,
  name TEXT NOT NULL,
  description TEXT,
  price REAL NOT NULL,
  includes_json TEXT,
  is_active INTEGER DEFAULT 1,
  FOREIGN KEY (hall_id) REFERENCES event_halls(id) ON DELETE SET NULL
);

CREATE TABLE event_equipment (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  daily_rate REAL DEFAULT 0,
  status TEXT DEFAULT 'available'
);

CREATE TABLE event_bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_code TEXT NOT NULL UNIQUE,
  user_id INTEGER,
  hall_id INTEGER NOT NULL,
  package_id INTEGER,
  event_type TEXT,
  event_date TEXT NOT NULL,
  start_time TEXT,
  end_time TEXT,
  guests INTEGER DEFAULT 50,
  contact_name TEXT NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  total_amount REAL NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (hall_id) REFERENCES event_halls(id),
  FOREIGN KEY (package_id) REFERENCES event_packages(id) ON DELETE SET NULL
);

CREATE TABLE catering_packages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  price_per_person REAL NOT NULL,
  min_guests INTEGER DEFAULT 20,
  includes_json TEXT,
  is_active INTEGER DEFAULT 1
);

CREATE TABLE catering_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_code TEXT NOT NULL UNIQUE,
  user_id INTEGER,
  package_id INTEGER,
  category TEXT NOT NULL,
  event_date TEXT NOT NULL,
  location TEXT,
  guests INTEGER NOT NULL,
  contact_name TEXT NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  details TEXT,
  status TEXT DEFAULT 'pending',
  assigned_staff INTEGER,
  vehicle_notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (package_id) REFERENCES catering_packages(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_staff) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE catering_quotations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id INTEGER NOT NULL,
  amount REAL NOT NULL,
  valid_until TEXT,
  notes TEXT,
  status TEXT DEFAULT 'draft',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (request_id) REFERENCES catering_requests(id) ON DELETE CASCADE
);

CREATE TABLE housekeeping_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id INTEGER NOT NULL,
  assigned_to INTEGER,
  task_type TEXT DEFAULT 'cleaning',
  status TEXT DEFAULT 'pending',
  scheduled_date TEXT NOT NULL,
  notes TEXT,
  completed_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (room_id) REFERENCES rooms(id),
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE maintenance_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id INTEGER,
  reported_by INTEGER,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'open',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL,
  FOREIGN KEY (reported_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE lost_found (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id INTEGER,
  item_name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'found',
  found_date TEXT NOT NULL,
  claimed_by TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL
);

CREATE TABLE gallery_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  media_url TEXT NOT NULL,
  media_type TEXT DEFAULT 'image',
  thumbnail_url TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE blog_posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  author_id INTEGER,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT NOT NULL,
  cover_image TEXT,
  category TEXT DEFAULT 'news',
  status TEXT DEFAULT 'published',
  views INTEGER DEFAULT 0,
  published_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE blog_comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL,
  user_id INTEGER,
  author_name TEXT,
  content TEXT NOT NULL,
  is_approved INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (post_id) REFERENCES blog_posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE offers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  discount_percent REAL DEFAULT 0,
  coupon_code TEXT,
  offer_type TEXT DEFAULT 'promotion',
  start_date TEXT,
  end_date TEXT,
  cover_image TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE testimonials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guest_name TEXT NOT NULL,
  guest_title TEXT,
  content TEXT NOT NULL,
  rating INTEGER DEFAULT 5,
  avatar_url TEXT,
  is_featured INTEGER DEFAULT 0,
  is_approved INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE faqs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  sort_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1
);

CREATE TABLE reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  room_type_id INTEGER,
  booking_id INTEGER,
  rating INTEGER NOT NULL,
  title TEXT,
  content TEXT,
  is_approved INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (room_type_id) REFERENCES room_types(id) ON DELETE CASCADE,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL
);

CREATE TABLE favorites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  room_type_id INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE (user_id, room_type_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (room_type_id) REFERENCES room_types(id) ON DELETE CASCADE
);

CREATE TABLE notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  is_read INTEGER DEFAULT 0,
  link TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE newsletter_subscribers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE cms_pages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  content TEXT,
  meta_title TEXT,
  meta_description TEXT,
  is_published INTEGER DEFAULT 1,
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT,
  category TEXT DEFAULT 'general'
);

CREATE TABLE ai_conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  session_id TEXT,
  role TEXT NOT NULL,
  message TEXT NOT NULL,
  intent TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE agent_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_code TEXT NOT NULL UNIQUE,
  user_id INTEGER,
  session_id TEXT,
  guest_name TEXT,
  guest_email TEXT,
  guest_phone TEXT,
  topic TEXT,
  message TEXT NOT NULL,
  conversation_json TEXT,
  status TEXT DEFAULT 'open',
  priority TEXT DEFAULT 'medium',
  assigned_to INTEGER,
  staff_notes TEXT,
  resolved_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  action TEXT NOT NULL,
  entity TEXT,
  entity_id INTEGER,
  details TEXT,
  ip_address TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE activity_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  activity TEXT NOT NULL,
  meta_json TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_bookings_dates ON bookings(check_in, check_out);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_rooms_status ON rooms(status);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_agent_status ON agent_requests(status);
CREATE INDEX idx_agent_created ON agent_requests(created_at);
