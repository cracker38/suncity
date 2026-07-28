USE suncity_hotel;

INSERT INTO roles (id, name, display_name, description) VALUES
(1, 'visitor', 'Visitor', 'Browse only'),
(2, 'customer', 'Registered Customer', 'Customer portal access'),
(3, 'receptionist', 'Receptionist', 'Front desk operations'),
(4, 'restaurant_manager', 'Restaurant Manager', 'Restaurant operations'),
(5, 'events_manager', 'Events Manager', 'Conference wedding events'),
(6, 'service_ops', 'Service Operations Manager', 'Housekeeping and catering ops'),
(7, 'finance', 'Finance Officer', 'Payments and financial reports'),
(8, 'admin', 'System Administrator', 'Full system access');

INSERT INTO permissions (code, description, module) VALUES
('users.manage', 'Manage users', 'admin'),
('roles.manage', 'Manage roles', 'admin'),
('rooms.manage', 'Manage rooms', 'rooms'),
('bookings.manage', 'Manage bookings', 'bookings'),
('bookings.own', 'Manage own bookings', 'bookings'),
('restaurant.manage', 'Manage restaurant', 'restaurant'),
('events.manage', 'Manage events', 'events'),
('catering.manage', 'Manage catering', 'catering'),
('housekeeping.manage', 'Manage housekeeping', 'ops'),
('finance.manage', 'Manage finance', 'finance'),
('cms.manage', 'Manage CMS', 'cms'),
('reports.view', 'View reports', 'reports'),
('ai.config', 'Configure AI', 'admin'),
('system.manage', 'System settings', 'admin');

INSERT INTO role_permissions (role_id, permission_id)
SELECT 8, id FROM permissions;

INSERT INTO role_permissions (role_id, permission_id)
SELECT 2, id FROM permissions WHERE code IN ('bookings.own');

INSERT INTO role_permissions (role_id, permission_id)
SELECT 3, id FROM permissions WHERE code IN ('bookings.manage', 'rooms.manage', 'reports.view');

INSERT INTO role_permissions (role_id, permission_id)
SELECT 4, id FROM permissions WHERE code IN ('restaurant.manage', 'reports.view');

INSERT INTO role_permissions (role_id, permission_id)
SELECT 5, id FROM permissions WHERE code IN ('events.manage', 'reports.view');

INSERT INTO role_permissions (role_id, permission_id)
SELECT 6, id FROM permissions WHERE code IN ('housekeeping.manage', 'catering.manage', 'reports.view');

INSERT INTO role_permissions (role_id, permission_id)
SELECT 7, id FROM permissions WHERE code IN ('finance.manage', 'reports.view');

-- Passwords replaced by import script with bcrypt hashes
INSERT INTO users (id, role_id, email, password_hash, first_name, last_name, phone, is_active, email_verified) VALUES
(1, 8, 'admin@suncity.rw', 'PLACEHOLDER', 'System', 'Admin', '+250780219057', 1, 1),
(2, 3, 'reception@suncity.rw', 'PLACEHOLDER', 'Grace', 'Uwase', '+250788525507', 1, 1),
(3, 4, 'restaurant@suncity.rw', 'PLACEHOLDER', 'Jean', 'Habimana', '+250780219057', 1, 1),
(4, 5, 'events@suncity.rw', 'PLACEHOLDER', 'Alice', 'Mukamana', '+250788525507', 1, 1),
(5, 6, 'ops@suncity.rw', 'PLACEHOLDER', 'Eric', 'Niyonsenga', '+250780219057', 1, 1),
(6, 7, 'finance@suncity.rw', 'PLACEHOLDER', 'Diane', 'Ingabire', '+250788525507', 1, 1),
(7, 2, 'guest@suncity.rw', 'PLACEHOLDER', 'Patrick', 'Mugisha', '+250789000111', 1, 1);

INSERT INTO amenities (name, icon) VALUES
('Free Wi-Fi', 'wifi'),
('Air Conditioning', 'snowflake'),
('Flat-screen TV', 'tv'),
('Private Bathroom', 'bath'),
('Mini Bar', 'wine'),
('Room Service', 'bell'),
('Work Desk', 'desk'),
('Safe', 'lock'),
('Balcony', 'sun'),
('Coffee Maker', 'coffee');

INSERT INTO room_types (id, name, slug, description, short_description, base_price, max_guests, bed_type, size_sqm, featured, rating_avg, review_count, cover_image) VALUES
(1, 'Standard Room', 'standard-room', 'Comfortable standard accommodation with essential amenities for a restful stay in Nyakarambi. Ideal for business travelers and short stays.', 'Comfortable essentials for a restful stay', 45000, 2, 'Queen Bed', 22, 1, 4.5, 12, 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=1200'),
(2, 'Deluxe Room', 'deluxe-room', 'Spacious deluxe room featuring refined interiors, premium bedding, and scenic views of Eastern Province.', 'Refined comfort with premium bedding', 65000, 2, 'King Bed', 30, 1, 4.7, 18, 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=1200'),
(3, 'Twin Room', 'twin-room', 'Practical twin room with two single beds, perfect for colleagues or friends traveling together.', 'Two beds for comfortable shared stays', 55000, 2, 'Twin Beds', 26, 1, 4.4, 9, 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=1200'),
(4, 'Family Room', 'family-room', 'Generous family room designed for groups and families, with flexible sleeping arrangements and space to relax.', 'Spacious comfort for the whole family', 85000, 4, 'King + Twin', 40, 1, 4.8, 15, 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=1200'),
(5, 'Executive Suite', 'executive-suite', 'Our flagship suite with separate living area, executive workspace, and elevated hospitality amenities.', 'Luxury suite with living area', 120000, 3, 'King Bed', 55, 1, 4.9, 22, 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=1200');

INSERT INTO rooms (room_type_id, room_number, floor, status) VALUES
(1, '101', 1, 'available'), (1, '102', 1, 'available'), (1, '103', 1, 'available'),
(2, '201', 2, 'available'), (2, '202', 2, 'available'), (2, '203', 2, 'occupied'),
(3, '301', 3, 'available'), (3, '302', 3, 'available'),
(4, '401', 4, 'available'), (4, '402', 4, 'cleaning'),
(5, '501', 5, 'available'), (5, '502', 5, 'available');

INSERT INTO room_amenities (room_type_id, amenity_id)
SELECT rt.id, a.id FROM room_types rt CROSS JOIN amenities a WHERE rt.id <= 3 AND a.id <= 6;

INSERT INTO room_amenities (room_type_id, amenity_id)
SELECT rt.id, a.id FROM room_types rt CROSS JOIN amenities a WHERE rt.id >= 4;

INSERT INTO room_images (room_type_id, image_url, alt_text, sort_order) VALUES
(1, 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=1200', 'Standard Room', 1),
(1, 'https://images.unsplash.com/photo-1595576508898-0ad5c879a061?w=1200', 'Standard bathroom', 2),
(2, 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=1200', 'Deluxe Room', 1),
(2, 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1200', 'Deluxe view', 2),
(3, 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=1200', 'Twin Room', 1),
(4, 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=1200', 'Family Room', 1),
(5, 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=1200', 'Executive Suite', 1),
(5, 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=1200', 'Suite living area', 2);

INSERT INTO menu_categories (name, slug, sort_order) VALUES
('Breakfast', 'breakfast', 1),
('Lunch', 'lunch', 2),
('Dinner', 'dinner', 3),
('Drinks', 'drinks', 4),
('Coffee', 'coffee', 5),
('Desserts', 'desserts', 6);

INSERT INTO menu_items (category_id, name, description, price, is_chef_recommendation, image_url) VALUES
(1, 'Rwandan Breakfast Platter', 'Eggs, toast, fresh fruit, and local tea', 8000, 1, 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=800'),
(1, 'Continental Breakfast', 'Pastries, juice, yogurt, and coffee', 7000, 0, 'https://images.unsplash.com/photo-1495214783159-312fb24831b3?w=800'),
(2, 'Grilled Tilapia', 'Fresh lake fish with plantains and salad', 15000, 1, 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=800'),
(2, 'Chicken Brochette', 'Skewered chicken with spicy peanut sauce', 12000, 0, 'https://images.unsplash.com/photo-1527477396006-66c1d7a4c9a1?w=800'),
(3, 'Beef Stew with Ugali', 'Slow-cooked beef in rich tomato gravy', 14000, 1, 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800'),
(3, 'Vegetable Curry', 'Seasonal vegetables in coconut curry', 10000, 0, 'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=800'),
(4, 'Fresh Passion Juice', 'Local passion fruit juice', 3000, 0, 'https://images.unsplash.com/photo-1622597467836-f3285f2131b8?w=800'),
(4, 'House Cocktail', 'Signature tropical mix', 6000, 1, 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=800'),
(5, 'Rwanda Single Origin Coffee', 'Freshly brewed specialty coffee', 3500, 1, 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800'),
(5, 'Cappuccino', 'Espresso with steamed milk foam', 4000, 0, 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=800'),
(6, 'Banana Cake', 'Homemade banana cake with cream', 4500, 0, 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800'),
(6, 'Chocolate Mousse', 'Rich dark chocolate mousse', 5000, 1, 'https://images.unsplash.com/photo-1541783245831-57d6fb0926d3?w=800');

INSERT INTO event_halls (name, slug, type, capacity, description, base_price, cover_image, amenities_json) VALUES
('Conference Hall', 'conference-hall', 'conference', 120, 'Modern conference hall with AV equipment and high-speed Wi-Fi.', 250000, 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=1200', '["Projector","Sound system","Wi-Fi","Stage"]'),
('Wedding Hall', 'wedding-hall', 'wedding', 250, 'Elegant wedding venue for ceremonies and receptions.', 500000, 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=1200', '["Decor lighting","Dance floor","Catering kitchen","Bridal suite"]'),
('Corporate Meeting Room', 'corporate-meeting', 'corporate', 40, 'Intimate boardroom for corporate meetings and workshops.', 100000, 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200', '["Screen","Whiteboard","Coffee station"]'),
('Celebration Hall', 'celebration-hall', 'birthday', 150, 'Versatile hall for birthdays, graduations, and private events.', 200000, 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=1200', '["Sound system","Lighting","Tables & chairs"]');

INSERT INTO event_packages (hall_id, name, description, price, includes_json) VALUES
(1, 'Half-Day Conference', 'Up to 4 hours with basic AV', 180000, '["Hall rental","Projector","Water","Wi-Fi"]'),
(1, 'Full-Day Conference', 'Full day package with lunch option', 320000, '["Hall rental","AV","Lunch buffet","Tea breaks"]'),
(2, 'Classic Wedding', 'Ceremony and reception package', 800000, '["Hall","Basic decor","Sound","Tables"]'),
(2, 'Premium Wedding', 'Full luxury wedding experience', 1500000, '["Hall","Premium decor","Catering coordination","Lighting"]'),
(3, 'Boardroom Half Day', 'Half-day meeting package', 75000, '["Room","Screen","Coffee"]');

INSERT INTO event_equipment (name, quantity, daily_rate, status) VALUES
('Projector', 5, 15000, 'available'),
('Wireless Microphone', 8, 8000, 'available'),
('LED Stage Lights', 4, 25000, 'available'),
('Conference Speaker', 6, 10000, 'available'),
('Folding Tables', 40, 2000, 'available');

INSERT INTO catering_packages (name, category, description, price_per_person, min_guests, includes_json) VALUES
('Corporate Lunch Box', 'corporate', 'Professional boxed lunch for meetings and workshops', 8000, 20, '["Main","Side","Drink","Fruit"]'),
('Wedding Buffet Deluxe', 'wedding', 'Multi-course wedding buffet with live stations', 25000, 50, '["Starters","Mains","Desserts","Drinks"]'),
('School Event Package', 'school', 'Affordable nutritious meals for school events', 5000, 30, '["Main","Drink"]'),
('NGO Field Catering', 'ngo', 'Reliable catering for NGO workshops and field activities', 7000, 25, '["Main","Side","Bottled water"]'),
('Private Celebration Menu', 'private', 'Customizable menu for birthdays and private gatherings', 15000, 15, '["Canapes","Main","Dessert","Soft drinks"]');

INSERT INTO gallery_items (category, title, media_url, media_type, sort_order) VALUES
('rooms', 'Deluxe Room Interior', 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=1200', 'image', 1),
('rooms', 'Executive Suite', 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=1200', 'image', 2),
('restaurant', 'Restaurant Dining', 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200', 'image', 1),
('restaurant', 'Chef Special', 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200', 'image', 2),
('conference', 'Conference Setup', 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=1200', 'image', 1),
('wedding', 'Wedding Reception', 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=1200', 'image', 1),
('wedding', 'Wedding Hall Decor', 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=1200', 'image', 2),
('wedding', 'Bridal Celebration Setup', 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1200', 'image', 3),
('events', 'Celebration Night', 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=1200', 'image', 1),
('outside_catering', 'Outdoor Catering', 'https://images.unsplash.com/photo-1555244162-803834f70033?w=1200', 'image', 1),
('videos', 'Hotel Experience Video', 'https://www.youtube.com/embed/TMBnz2O2l58', 'embed', 1),
('virtual_tour', '360 Virtual Tour Placeholder', 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200', 'image', 1);

INSERT INTO blog_posts (author_id, title, slug, excerpt, content, cover_image, category, status, views, published_at) VALUES
(1, 'Welcome to SUN CITY NYAKARAMBI', 'welcome-to-sun-city', 'Discover premium hospitality in Kirehe District.', '<p>SUN CITY NYAKARAMBI Ltd welcomes guests to experience comfort, luxury, and exceptional hospitality in Nyakarambi.</p><p>From premium rooms to conference facilities and catering, we deliver professional service trusted by NGOs and institutions.</p>', 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200', 'news', 'published', 120, NOW()),
(1, 'Explore Eastern Province Tourism', 'eastern-province-tourism', 'Top attractions near Nyakarambi and Kirehe.', '<p>Eastern Province offers lakes, cultural sites, and scenic landscapes perfect for weekend getaways.</p>', 'https://images.unsplash.com/photo-1523805009345-7448845a9e53?w=1200', 'tourism', 'published', 85, NOW()),
(1, 'Hosting Successful Corporate Events', 'corporate-events-tips', 'How our conference hall supports professional meetings.', '<p>Plan productive workshops and board meetings with our AV-ready conference facilities and catering packages.</p>', 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=1200', 'events', 'published', 64, NOW());

INSERT INTO offers (title, slug, description, discount_percent, coupon_code, offer_type, start_date, end_date, cover_image, is_active) VALUES
('Weekend Escape', 'weekend-escape', 'Save on Deluxe Rooms for Friday–Sunday stays.', 15, 'WEEKEND15', 'seasonal', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 90 DAY), 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1200', 1),
('Conference Early Bird', 'conference-early-bird', 'Book conference packages 30 days ahead and save.', 10, 'CONF10', 'promotion', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 120 DAY), 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=1200', 1),
('Wedding Season Package', 'wedding-season', 'Exclusive wedding hall and catering bundle.', 12, 'WED12', 'package', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 180 DAY), 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=1200', 1);

INSERT INTO testimonials (guest_name, guest_title, content, rating, is_featured, is_approved) VALUES
('Sarah Johnson', 'NGO Program Lead', 'Professional service and excellent conference facilities. Our workshop ran flawlessly.', 5, 1, 1),
('Emmanuel Nkurunziza', 'Business Traveler', 'Clean rooms, warm hospitality, and great restaurant. Highly recommended in Kirehe.', 5, 1, 1),
('Claire Mukeshimana', 'Wedding Guest', 'A beautiful venue for celebrations. The team handled every detail with care.', 5, 1, 1);

INSERT INTO faqs (question, answer, category, sort_order) VALUES
('What time is check-in and check-out?', 'Check-in is from 14:00 and check-out is until 11:00. Early check-in may be arranged based on availability.', 'booking', 1),
('Do you offer airport or intercity transfers?', 'Yes, transfers can be arranged on request. Contact reception for pricing.', 'services', 2),
('Is outside catering available?', 'Yes. We provide corporate, wedding, school, NGO, and private event catering with quotation support.', 'catering', 3),
('Which payment methods do you accept?', 'We accept MTN MoMo, Airtel Money, Visa, Mastercard, and cash at reception.', 'payments', 4),
('How can I book a conference hall?', 'Use the Events page booking form or contact us by phone/WhatsApp for availability.', 'events', 5);

INSERT INTO cms_pages (slug, title, content, meta_title, meta_description) VALUES
('about', 'About SUN CITY NYAKARAMBI', 'SUN CITY NYAKARAMBI Ltd is a professional hospitality company in Nyakarambi, Kirehe District.', 'About Us | SUN CITY NYAKARAMBI', 'Learn about our mission, vision, and hospitality experience in Rwanda.'),
('home-welcome', 'Welcome', 'Experience comfort, luxury, and exceptional hospitality at SUN CITY NYAKARAMBI Hotel.', 'SUN CITY NYAKARAMBI Hotel', 'Premium hotel, restaurant, conference, and catering in Nyakarambi.');

INSERT INTO settings (setting_key, setting_value, category) VALUES
('hotel_name', 'SUN CITY NYAKARAMBI Ltd', 'general'),
('hotel_phone', '+250780219057', 'general'),
('hotel_phone_alt', '+250788525507', 'general'),
('hotel_email', 'suncitynyakarambi@gmail.com', 'general'),
('hotel_address', 'Nyakarambi, Kirehe District, Eastern Province, Rwanda', 'general'),
('hotel_whatsapp', '250780219057', 'general'),
('business_hours', 'Open 24/7 for reception | Restaurant 06:30–22:00', 'general'),
('ai_welcome', 'Hello! I am the SUN CITY assistant. Ask me about rooms, dining, events, or bookings.', 'ai'),
('seo_title', 'SUN CITY NYAKARAMBI Hotel | Luxury Stay in Kirehe', 'seo'),
('seo_description', 'Book premium rooms, restaurant, conference halls, weddings, and catering at SUN CITY NYAKARAMBI Ltd.', 'seo');

INSERT INTO reviews (user_id, room_type_id, rating, title, content, is_approved) VALUES
(7, 2, 5, 'Wonderful deluxe stay', 'Quiet, clean, and comfortable. Staff were exceptional.', 1),
(7, 5, 5, 'Suite perfection', 'Spacious suite perfect for longer stays and work trips.', 1);

INSERT INTO notifications (user_id, title, message, type, link) VALUES
(7, 'Welcome to SUN CITY', 'Your account is ready. Start exploring rooms and offers.', 'info', '/rooms'),
(1, 'System ready', 'Hotel management system initialized successfully.', 'system', '/admin');
