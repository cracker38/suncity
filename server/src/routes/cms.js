import { Router } from 'express';
import { pool } from '../config/db.js';
import { ok, fail, asyncHandler } from '../utils/response.js';
import { authenticate, requireRoles, optionalAuth } from '../middleware/auth.js';

const router = Router();

router.get('/gallery', asyncHandler(async (req, res) => {
  const { category } = req.query;
  let sql = `SELECT * FROM gallery_items WHERE is_active = 1`;
  const params = [];
  if (category) {
    sql += ` AND category = ?`;
    params.push(category);
  }
  sql += ` ORDER BY sort_order, id DESC`;
  const [rows] = await pool.execute(sql, params);
  return ok(res, rows);
}));

router.get('/blog', asyncHandler(async (req, res) => {
  const { category, q } = req.query;
  let sql = `SELECT id, title, slug, excerpt, cover_image, category, views, published_at FROM blog_posts WHERE status = 'published'`;
  const params = [];
  if (category) {
    sql += ` AND category = ?`;
    params.push(category);
  }
  if (q) {
    sql += ` AND (title LIKE ? OR excerpt LIKE ?)`;
    params.push(`%${q}%`, `%${q}%`);
  }
  sql += ` ORDER BY published_at DESC`;
  const [rows] = await pool.execute(sql, params);
  return ok(res, rows);
}));

router.get('/blog/:slug', asyncHandler(async (req, res) => {
  const [rows] = await pool.execute(`SELECT * FROM blog_posts WHERE slug = ? AND status = 'published'`, [
    req.params.slug,
  ]);
  if (!rows.length) return fail(res, 'Post not found', 404);
  await pool.execute(`UPDATE blog_posts SET views = views + 1 WHERE id = ?`, [rows[0].id]);
  const [comments] = await pool.execute(
    `SELECT * FROM blog_comments WHERE post_id = ? AND is_approved = 1 ORDER BY created_at DESC`,
    [rows[0].id]
  );
  return ok(res, { ...rows[0], comments });
}));

router.post('/blog/:slug/comments', optionalAuth, asyncHandler(async (req, res) => {
  const [posts] = await pool.execute(`SELECT id FROM blog_posts WHERE slug = ?`, [req.params.slug]);
  if (!posts.length) return fail(res, 'Post not found', 404);
  const { content, author_name } = req.body;
  if (!content) return fail(res, 'Content required');
  await pool.execute(
    `INSERT INTO blog_comments (post_id, user_id, author_name, content, is_approved)
     VALUES (?, ?, ?, ?, ?)`,
    [
      posts[0].id,
      req.user?.id || null,
      author_name || (req.user ? `${req.user.first_name} ${req.user.last_name}` : 'Guest'),
      content,
      req.user ? 1 : 0,
    ]
  );
  return ok(res, null, 'Comment submitted', 201);
}));

router.get('/offers', asyncHandler(async (req, res) => {
  const [rows] = await pool.execute(
    `SELECT * FROM offers WHERE is_active = 1 AND (end_date IS NULL OR end_date >= CURDATE()) ORDER BY created_at DESC`
  );
  return ok(res, rows);
}));

router.get('/offers/validate', asyncHandler(async (req, res) => {
  const code = (req.query.code || '').trim();
  if (!code) return fail(res, 'Coupon code required');
  const [rows] = await pool.execute(
    `SELECT id, title, discount_percent, coupon_code, offer_type, end_date
     FROM offers
     WHERE is_active = 1
       AND UPPER(coupon_code) = UPPER(?)
       AND (start_date IS NULL OR start_date <= CURDATE())
       AND (end_date IS NULL OR end_date >= CURDATE())
     LIMIT 1`,
    [code]
  );
  if (!rows.length) return fail(res, 'Invalid or expired coupon code', 404);
  return ok(res, rows[0]);
}));

router.get('/testimonials', asyncHandler(async (req, res) => {
  const [rows] = await pool.execute(
    `SELECT * FROM testimonials WHERE is_approved = 1 ORDER BY is_featured DESC, created_at DESC`
  );
  return ok(res, rows);
}));

router.get('/faqs', asyncHandler(async (req, res) => {
  const [rows] = await pool.execute(`SELECT * FROM faqs WHERE is_active = 1 ORDER BY sort_order`);
  return ok(res, rows);
}));

router.get('/pages/:slug', asyncHandler(async (req, res) => {
  const [rows] = await pool.execute(`SELECT * FROM cms_pages WHERE slug = ? AND is_published = 1`, [
    req.params.slug,
  ]);
  if (!rows.length) return fail(res, 'Page not found', 404);
  return ok(res, rows[0]);
}));

router.get('/settings', asyncHandler(async (req, res) => {
  const [rows] = await pool.execute(`SELECT setting_key, setting_value, category FROM settings`);
  const map = Object.fromEntries(rows.map((r) => [r.setting_key, r.setting_value]));
  return ok(res, map);
}));

router.post('/newsletter', asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) return fail(res, 'Email required');
  try {
    await pool.execute(`INSERT INTO newsletter_subscribers (email) VALUES (?)`, [email]);
  } catch {
    return ok(res, null, 'Already subscribed');
  }
  return ok(res, null, 'Subscribed successfully', 201);
}));

router.post('/contact', asyncHandler(async (req, res) => {
  const { name, email, phone, subject, message } = req.body;
  if (!name || !email || !message) return fail(res, 'Name, email, and message required');
  await pool.execute(
    `INSERT INTO notifications (user_id, title, message, type)
     SELECT id, ?, ?, 'contact' FROM users WHERE role_id = 8 LIMIT 1`,
    [`Contact: ${subject || 'Website inquiry'}`, `${name} (${email}, ${phone || 'n/a'}): ${message}`]
  );
  return ok(res, null, 'Message sent');
}));

router.post(
  '/admin/settings',
  authenticate,
  requireRoles('admin'),
  asyncHandler(async (req, res) => {
    const entries = Object.entries(req.body || {});
    for (const [key, value] of entries) {
      await pool.execute(
        `INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
        [key, String(value)]
      );
    }
    return ok(res, null, 'Settings updated');
  })
);

router.post(
  '/admin/blog',
  authenticate,
  requireRoles('admin'),
  asyncHandler(async (req, res) => {
    const b = req.body;
    const [result] = await pool.execute(
      `INSERT INTO blog_posts (author_id, title, slug, excerpt, content, cover_image, category, status, published_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'published', NOW())`,
      [req.user.id, b.title, b.slug, b.excerpt || null, b.content, b.cover_image || null, b.category || 'news']
    );
    return ok(res, { id: result.insertId }, 'Post created', 201);
  })
);

router.post(
  '/admin/offers',
  authenticate,
  requireRoles('admin'),
  asyncHandler(async (req, res) => {
    const b = req.body;
    const [result] = await pool.execute(
      `INSERT INTO offers (title, slug, description, discount_percent, coupon_code, offer_type, start_date, end_date, cover_image)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        b.title,
        b.slug,
        b.description || null,
        b.discount_percent || 0,
        b.coupon_code || null,
        b.offer_type || 'promotion',
        b.start_date || null,
        b.end_date || null,
        b.cover_image || null,
      ]
    );
    return ok(res, { id: result.insertId }, 'Offer created', 201);
  })
);

router.post(
  '/admin/gallery',
  authenticate,
  requireRoles('admin'),
  asyncHandler(async (req, res) => {
    const b = req.body;
    const [result] = await pool.execute(
      `INSERT INTO gallery_items (category, title, media_url, media_type, thumbnail_url)
       VALUES (?, ?, ?, ?, ?)`,
      [b.category, b.title, b.media_url, b.media_type || 'image', b.thumbnail_url || null]
    );
    return ok(res, { id: result.insertId }, 'Gallery item added', 201);
  })
);

export default router;
