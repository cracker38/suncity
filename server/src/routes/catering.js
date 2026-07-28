import { Router } from 'express';
import { pool } from '../config/db.js';
import { ok, fail, asyncHandler } from '../utils/response.js';
import { authenticate, requireRoles, optionalAuth } from '../middleware/auth.js';
import { bookingCode } from '../utils/helpers.js';

const router = Router();

router.get('/packages', asyncHandler(async (req, res) => {
  const [rows] = await pool.execute(`SELECT * FROM catering_packages WHERE is_active = 1`);
  return ok(res, rows);
}));

router.post('/requests', optionalAuth, asyncHandler(async (req, res) => {
  const b = req.body;
  if (!b.category || !b.event_date || !b.guests || !b.contact_name) {
    return fail(res, 'category, event_date, guests, and contact_name required');
  }
  const code = bookingCode('CAT');
  const [result] = await pool.execute(
    `INSERT INTO catering_requests
     (request_code, user_id, package_id, category, event_date, location, guests,
      contact_name, contact_email, contact_phone, details, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [
      code,
      req.user?.id || null,
      b.package_id || null,
      b.category,
      b.event_date,
      b.location || null,
      b.guests,
      b.contact_name,
      b.contact_email || null,
      b.contact_phone || null,
      b.details || null,
    ]
  );
  return ok(res, { id: result.insertId, request_code: code }, 'Quotation request submitted', 201);
}));

router.get('/requests', authenticate, requireRoles('admin', 'service_ops'), asyncHandler(async (req, res) => {
  const [rows] = await pool.execute(`SELECT * FROM catering_requests ORDER BY created_at DESC LIMIT 200`);
  return ok(res, rows);
}));

router.post('/quotations', authenticate, requireRoles('admin', 'service_ops'), asyncHandler(async (req, res) => {
  const { request_id, amount, valid_until, notes } = req.body;
  const [result] = await pool.execute(
    `INSERT INTO catering_quotations (request_id, amount, valid_until, notes, status)
     VALUES (?, ?, ?, ?, 'sent')`,
    [request_id, amount, valid_until || null, notes || null]
  );
  await pool.execute(`UPDATE catering_requests SET status = 'quoted' WHERE id = ?`, [request_id]);
  return ok(res, { id: result.insertId }, 'Quotation created', 201);
}));

router.patch('/requests/:id', authenticate, requireRoles('admin', 'service_ops'), asyncHandler(async (req, res) => {
  const { status, assigned_staff, vehicle_notes } = req.body;
  await pool.execute(
    `UPDATE catering_requests SET
      status = COALESCE(?, status),
      assigned_staff = COALESCE(?, assigned_staff),
      vehicle_notes = COALESCE(?, vehicle_notes)
     WHERE id = ?`,
    [status || null, assigned_staff || null, vehicle_notes || null, req.params.id]
  );
  return ok(res, null, 'Request updated');
}));

export default router;
