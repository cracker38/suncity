import { Router } from 'express';
import { pool } from '../config/db.js';
import { ok, fail, asyncHandler } from '../utils/response.js';
import { authenticate, requireRoles, optionalAuth } from '../middleware/auth.js';

const router = Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const [types] = await pool.execute(
      `SELECT * FROM room_types WHERE is_active = 1 ORDER BY base_price ASC`
    );
    return ok(res, types);
  })
);

router.get(
  '/featured',
  asyncHandler(async (req, res) => {
    const [types] = await pool.execute(
      `SELECT * FROM room_types WHERE is_active = 1 AND featured = 1 ORDER BY base_price ASC LIMIT 6`
    );
    return ok(res, types);
  })
);

router.get(
  '/availability',
  asyncHandler(async (req, res) => {
    const { check_in, check_out, guests = 1 } = req.query;
    if (!check_in || !check_out) return fail(res, 'check_in and check_out are required');

    const [types] = await pool.execute(
      `SELECT rt.*,
        (SELECT COUNT(*) FROM rooms r WHERE r.room_type_id = rt.id AND r.status IN ('available','cleaning','reserved')) AS total_rooms,
        (
          SELECT COUNT(*) FROM bookings b
          JOIN rooms r2 ON r2.id = b.room_id
          WHERE r2.room_type_id = rt.id
            AND b.status IN ('pending','confirmed','checked_in')
            AND b.check_in < ? AND b.check_out > ?
        ) AS booked_rooms
       FROM room_types rt
       WHERE rt.is_active = 1 AND rt.max_guests >= ?
       ORDER BY rt.base_price ASC`,
      [check_out, check_in, Number(guests)]
    );

    const available = types.map((t) => ({
      ...t,
      available_count: Math.max((t.total_rooms || 0) - (t.booked_rooms || 0), 0),
      is_available: (t.total_rooms || 0) - (t.booked_rooms || 0) > 0,
    }));

    return ok(res, available);
  })
);

router.get(
  '/:idOrSlug/calendar',
  asyncHandler(async (req, res) => {
    const key = req.params.idOrSlug;
    const month = req.query.month || new Date().toISOString().slice(0, 7); // YYYY-MM
    const [types] = await pool.execute(
      `SELECT id, name, slug FROM room_types WHERE id = ? OR slug = ? LIMIT 1`,
      [key, key]
    );
    if (!types.length) return fail(res, 'Room type not found', 404);
    const roomTypeId = types[0].id;
    const start = `${month}-01`;
    const [endRow] = await pool.execute(`SELECT LAST_DAY(?) AS last_day`, [start]);
    const end = endRow[0].last_day.toISOString?.().slice(0, 10) || String(endRow[0].last_day).slice(0, 10);

    const [bookings] = await pool.execute(
      `SELECT b.check_in, b.check_out, b.status
       FROM bookings b
       WHERE b.room_type_id = ?
         AND b.status IN ('pending','confirmed','checked_in')
         AND b.check_in <= ? AND b.check_out > ?`,
      [roomTypeId, end, start]
    );

    const occupied = new Set();
    for (const b of bookings) {
      const from = new Date(b.check_in);
      const to = new Date(b.check_out);
      for (let d = new Date(from); d < to; d.setDate(d.getDate() + 1)) {
        const iso = d.toISOString().slice(0, 10);
        if (iso >= start && iso <= end) occupied.add(iso);
      }
    }

    return ok(res, {
      room_type: types[0],
      month,
      occupied_dates: [...occupied].sort(),
    });
  })
);

router.get(
  '/inventory/all',
  authenticate,
  requireRoles('admin', 'receptionist', 'service_ops'),
  asyncHandler(async (req, res) => {
    const [rooms] = await pool.execute(
      `SELECT r.*, rt.name AS room_type_name FROM rooms r
       JOIN room_types rt ON rt.id = r.room_type_id
       ORDER BY r.room_number`
    );
    return ok(res, rooms);
  })
);

router.patch(
  '/inventory/:id/status',
  authenticate,
  requireRoles('admin', 'receptionist', 'service_ops'),
  asyncHandler(async (req, res) => {
    const { status } = req.body;
    await pool.execute(`UPDATE rooms SET status = ? WHERE id = ?`, [status, req.params.id]);
    return ok(res, null, 'Room status updated');
  })
);

router.post(
  '/',
  authenticate,
  requireRoles('admin'),
  asyncHandler(async (req, res) => {
    const b = req.body;
    const [result] = await pool.execute(
      `INSERT INTO room_types (name, slug, description, short_description, base_price, max_guests, bed_type, size_sqm, featured, cover_image)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        b.name,
        b.slug,
        b.description || null,
        b.short_description || null,
        b.base_price,
        b.max_guests || 2,
        b.bed_type || null,
        b.size_sqm || null,
        b.featured ? 1 : 0,
        b.cover_image || null,
      ]
    );
    return ok(res, { id: result.insertId }, 'Room type created', 201);
  })
);

router.get(
  '/:slug',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const [types] = await pool.execute(`SELECT * FROM room_types WHERE slug = ?`, [req.params.slug]);
    if (!types.length) return fail(res, 'Room not found', 404);
    const room = types[0];
    const [images] = await pool.execute(
      `SELECT * FROM room_images WHERE room_type_id = ? ORDER BY sort_order`,
      [room.id]
    );
    const [amenities] = await pool.execute(
      `SELECT a.* FROM amenities a
       JOIN room_amenities ra ON ra.amenity_id = a.id
       WHERE ra.room_type_id = ?`,
      [room.id]
    );
    const [reviews] = await pool.execute(
      `SELECT r.*, u.first_name, u.last_name FROM reviews r
       LEFT JOIN users u ON u.id = r.user_id
       WHERE r.room_type_id = ? AND r.is_approved = 1
       ORDER BY r.created_at DESC LIMIT 20`,
      [room.id]
    );
    return ok(res, { ...room, images, amenities, reviews });
  })
);

export default router;
