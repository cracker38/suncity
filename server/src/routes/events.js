import { Router } from 'express';
import { pool } from '../config/db.js';
import { ok, fail, asyncHandler } from '../utils/response.js';
import { authenticate, requireRoles, optionalAuth } from '../middleware/auth.js';
import { bookingCode } from '../utils/helpers.js';

const router = Router();

router.get('/halls', asyncHandler(async (req, res) => {
  const [rows] = await pool.execute(`SELECT * FROM event_halls WHERE is_active = 1`);
  return ok(res, rows);
}));

router.get('/packages', asyncHandler(async (req, res) => {
  const [rows] = await pool.execute(`SELECT * FROM event_packages WHERE is_active = 1`);
  return ok(res, rows);
}));

router.get('/equipment', asyncHandler(async (req, res) => {
  const [rows] = await pool.execute(`SELECT * FROM event_equipment`);
  return ok(res, rows);
}));

router.get('/availability', asyncHandler(async (req, res) => {
  const { date, hall_id } = req.query;
  if (!date) return fail(res, 'date required');
  let sql = `SELECT * FROM event_bookings WHERE event_date = ? AND status IN ('pending','confirmed')`;
  const params = [date];
  if (hall_id) {
    sql += ` AND hall_id = ?`;
    params.push(hall_id);
  }
  const [rows] = await pool.execute(sql, params);
  return ok(res, { booked: rows, available: rows.length === 0 || !hall_id ? rows.length === 0 : true });
}));

router.get('/calendar', asyncHandler(async (req, res) => {
  const month = req.query.month || new Date().toISOString().slice(0, 7);
  const hallId = req.query.hall_id;
  const start = `${month}-01`;
  const [endRow] = await pool.execute(`SELECT LAST_DAY(?) AS last_day`, [start]);
  const end = endRow[0].last_day.toISOString?.().slice(0, 10) || String(endRow[0].last_day).slice(0, 10);

  let sql = `SELECT eb.event_date, eb.hall_id, eb.status, eh.name AS hall_name, eb.event_type
             FROM event_bookings eb
             JOIN event_halls eh ON eh.id = eb.hall_id
             WHERE eb.event_date BETWEEN ? AND ?
               AND eb.status IN ('pending','confirmed')`;
  const params = [start, end];
  if (hallId) {
    sql += ` AND eb.hall_id = ?`;
    params.push(hallId);
  }
  const [rows] = await pool.execute(sql, params);
  return ok(res, { month, events: rows });
}));

router.post('/bookings', optionalAuth, asyncHandler(async (req, res) => {
  const b = req.body;
  if (!b.hall_id || !b.event_date || !b.contact_name) {
    return fail(res, 'hall_id, event_date, and contact_name required');
  }
  const [halls] = await pool.execute(`SELECT * FROM event_halls WHERE id = ?`, [b.hall_id]);
  if (!halls.length) return fail(res, 'Hall not found', 404);

  let amount = Number(halls[0].base_price);
  if (b.package_id) {
    const [pkgs] = await pool.execute(`SELECT * FROM event_packages WHERE id = ?`, [b.package_id]);
    if (pkgs.length) amount = Number(pkgs[0].price);
  }

  const code = bookingCode('EV');
  const [result] = await pool.execute(
    `INSERT INTO event_bookings
     (booking_code, user_id, hall_id, package_id, event_type, event_date, start_time, end_time, guests,
      contact_name, contact_email, contact_phone, total_amount, status, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
    [
      code,
      req.user?.id || null,
      b.hall_id,
      b.package_id || null,
      b.event_type || halls[0].type,
      b.event_date,
      b.start_time || null,
      b.end_time || null,
      b.guests || 50,
      b.contact_name,
      b.contact_email || null,
      b.contact_phone || null,
      amount,
      b.notes || null,
    ]
  );
  return ok(res, { id: result.insertId, booking_code: code, total_amount: amount }, 'Event booking submitted', 201);
}));

router.get('/bookings', authenticate, requireRoles('admin', 'events_manager'), asyncHandler(async (req, res) => {
  const [rows] = await pool.execute(
    `SELECT eb.*, eh.name AS hall_name FROM event_bookings eb
     JOIN event_halls eh ON eh.id = eb.hall_id
     ORDER BY eb.event_date DESC LIMIT 200`
  );
  return ok(res, rows);
}));

router.patch('/bookings/:id', authenticate, requireRoles('admin', 'events_manager'), asyncHandler(async (req, res) => {
  await pool.execute(`UPDATE event_bookings SET status = COALESCE(?, status), notes = COALESCE(?, notes) WHERE id = ?`, [
    req.body.status || null,
    req.body.notes || null,
    req.params.id,
  ]);
  return ok(res, null, 'Event booking updated');
}));

export default router;
