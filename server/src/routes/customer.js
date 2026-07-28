import { Router } from 'express';
import { pool } from '../config/db.js';
import { ok, fail, asyncHandler } from '../utils/response.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/favorites', asyncHandler(async (req, res) => {
  const [rows] = await pool.execute(
    `SELECT f.id AS favorite_id, f.room_type_id, f.created_at,
            rt.slug, rt.name, rt.cover_image, rt.base_price, rt.short_description
     FROM favorites f
     JOIN room_types rt ON rt.id = f.room_type_id
     WHERE f.user_id = ?`,
    [req.user.id]
  );
  return ok(res, rows);
}));

router.post('/favorites/:roomTypeId', asyncHandler(async (req, res) => {
  try {
    await pool.execute(`INSERT INTO favorites (user_id, room_type_id) VALUES (?, ?)`, [
      req.user.id,
      req.params.roomTypeId,
    ]);
  } catch {
    return ok(res, null, 'Already in favorites');
  }
  return ok(res, null, 'Added to favorites', 201);
}));

router.delete('/favorites/:roomTypeId', asyncHandler(async (req, res) => {
  await pool.execute(`DELETE FROM favorites WHERE user_id = ? AND room_type_id = ?`, [
    req.user.id,
    req.params.roomTypeId,
  ]);
  return ok(res, null, 'Removed');
}));

router.get('/notifications', asyncHandler(async (req, res) => {
  const [rows] = await pool.execute(
    `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`,
    [req.user.id]
  );
  return ok(res, rows);
}));

router.post('/notifications/:id/read', asyncHandler(async (req, res) => {
  await pool.execute(`UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?`, [
    req.params.id,
    req.user.id,
  ]);
  return ok(res, null, 'Marked read');
}));

router.get('/invoices', asyncHandler(async (req, res) => {
  const isStaff = ['admin', 'finance', 'receptionist'].includes(req.user.role_name);
  const [rows] = await pool.execute(
    isStaff
      ? `SELECT i.*, b.booking_code, b.guest_name
         FROM invoices i
         LEFT JOIN bookings b ON b.id = i.booking_id
         ORDER BY i.issued_at DESC LIMIT 200`
      : `SELECT i.*, b.booking_code, b.guest_name
         FROM invoices i
         LEFT JOIN bookings b ON b.id = i.booking_id
         WHERE i.user_id = ?
         ORDER BY i.issued_at DESC`,
    isStaff ? [] : [req.user.id]
  );
  return ok(res, rows);
}));

router.post('/reviews', asyncHandler(async (req, res) => {
  const { room_type_id, booking_id, rating, title, content } = req.body;
  if (!room_type_id || !rating) return fail(res, 'room_type_id and rating required');
  const [result] = await pool.execute(
    `INSERT INTO reviews (user_id, room_type_id, booking_id, rating, title, content, is_approved)
     VALUES (?, ?, ?, ?, ?, ?, 0)`,
    [req.user.id, room_type_id, booking_id || null, rating, title || null, content || null]
  );
  return ok(res, { id: result.insertId }, 'Review submitted for approval', 201);
}));

router.get('/reviews/mine', asyncHandler(async (req, res) => {
  const [rows] = await pool.execute(`SELECT * FROM reviews WHERE user_id = ? ORDER BY created_at DESC`, [
    req.user.id,
  ]);
  return ok(res, rows);
}));

export default router;
