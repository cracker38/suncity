import { Router } from 'express';
import PDFDocument from 'pdfkit';
import { pool, withTransaction } from '../config/db.js';
import { ok, fail, asyncHandler } from '../utils/response.js';
import { authenticate, requireRoles, optionalAuth } from '../middleware/auth.js';
import { bookingCode, invoiceNumber, nightsBetween, writeAudit } from '../utils/helpers.js';
import { config } from '../config/index.js';
import { sendBookingConfirmationEmail } from '../services/mail.js';

const router = Router();

async function ensureBookingDiscountColumns() {
  try {
    await pool.execute(`ALTER TABLE bookings ADD COLUMN discount_amount DECIMAL(12,2) DEFAULT 0`);
  } catch {
    /* column exists */
  }
  try {
    await pool.execute(`ALTER TABLE bookings ADD COLUMN coupon_code VARCHAR(50) NULL`);
  } catch {
    /* column exists */
  }
}
ensureBookingDiscountColumns().catch(() => {});

async function findAvailableRoom(conn, roomTypeId, checkIn, checkOut) {
  const [rooms] = await conn.execute(
    `SELECT r.id FROM rooms r
     WHERE r.room_type_id = ? AND r.status IN ('available','cleaning')
       AND r.id NOT IN (
         SELECT b.room_id FROM bookings b
         WHERE b.room_id IS NOT NULL
           AND b.status IN ('pending','confirmed','checked_in')
           AND b.check_in < ? AND b.check_out > ?
       )
     LIMIT 1`,
    [roomTypeId, checkOut, checkIn]
  );
  return rooms[0] || null;
}

router.post(
  '/',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const {
      room_type_id,
      check_in,
      check_out,
      adults = 1,
      children = 0,
      special_requests,
      guest_name,
      guest_email,
      guest_phone,
      source = 'website',
      coupon_code,
    } = req.body;

    if (!room_type_id || !check_in || !check_out) {
      return fail(res, 'room_type_id, check_in, and check_out are required');
    }

    const booking = await withTransaction(async (conn) => {
      const [types] = await conn.execute(`SELECT * FROM room_types WHERE id = ? AND is_active = 1`, [
        room_type_id,
      ]);
      if (!types.length) throw Object.assign(new Error('Room type not found'), { status: 404 });

      const room = await findAvailableRoom(conn, room_type_id, check_in, check_out);
      if (!room) throw Object.assign(new Error('No rooms available for selected dates'), { status: 409 });

      const nights = nightsBetween(check_in, check_out);
      let subtotal = Number(types[0].base_price) * nights;
      let discount = 0;
      let appliedCoupon = null;

      if (coupon_code) {
        const [offers] = await conn.execute(
          `SELECT * FROM offers
           WHERE is_active = 1
             AND UPPER(coupon_code) = UPPER(?)
             AND (start_date IS NULL OR start_date <= date('now'))
             AND (end_date IS NULL OR end_date >= date('now'))
           LIMIT 1`,
          [String(coupon_code).trim()]
        );
        if (!offers.length) {
          throw Object.assign(new Error('Invalid or expired coupon code'), { status: 400 });
        }
        discount = Math.round(subtotal * (Number(offers[0].discount_percent) / 100));
        appliedCoupon = offers[0].coupon_code;
      }

      const total = Math.max(0, subtotal - discount);
      const code = bookingCode('SC');
      const userId = req.user?.id || null;
      const name =
        guest_name ||
        (req.user ? `${req.user.first_name} ${req.user.last_name}` : null) ||
        'Guest';
      const email = guest_email || req.user?.email || null;
      const phone = guest_phone || req.user?.phone || null;

      const [result] = await conn.execute(
        `INSERT INTO bookings
         (booking_code, user_id, room_id, room_type_id, check_in, check_out, adults, children,
          special_requests, status, payment_status, total_amount, nights, guest_name, guest_email, guest_phone, source,
          discount_amount, coupon_code)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', 'unpaid', ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          code,
          userId,
          room.id,
          room_type_id,
          check_in,
          check_out,
          adults,
          children,
          special_requests || null,
          total,
          nights,
          name,
          email,
          phone,
          source,
          discount,
          appliedCoupon,
        ]
      );

      await conn.execute(`UPDATE rooms SET status = 'reserved' WHERE id = ?`, [room.id]);

      const invNo = invoiceNumber();
      const tax = Math.round(total * 0.18);
      const [inv] = await conn.execute(
        `INSERT INTO invoices (invoice_number, booking_id, user_id, amount, tax_amount, total_amount, status, due_date)
         VALUES (?, ?, ?, ?, ?, ?, 'issued', ?)`,
        [invNo, result.insertId, userId, total, tax, total + tax, check_in]
      );

      if (userId) {
        await conn.execute(
          `INSERT INTO notifications (user_id, title, message, type, link)
           VALUES (?, 'Booking confirmed', ?, 'booking', ?)`,
          [userId, `Your booking ${code} is confirmed.`, `/dashboard/bookings`]
        );
      }

      return {
        id: result.insertId,
        booking_code: code,
        invoice_id: inv.insertId,
        invoice_number: invNo,
        total_amount: total,
        subtotal,
        discount_amount: discount,
        coupon_code: appliedCoupon,
        tax_amount: tax,
        nights,
        room_id: room.id,
        check_in,
        check_out,
        guest_name: name,
        guest_email: email,
      };
    });

    sendBookingConfirmationEmail(booking).catch(() => {});
    await writeAudit({
      userId: req.user?.id,
      action: 'booking.create',
      entity: 'bookings',
      entityId: booking.id,
      details: { code: booking.booking_code },
      ip: req.ip,
    });

    return ok(res, booking, 'Booking created successfully', 201);
  })
);

router.get(
  '/mine',
  authenticate,
  asyncHandler(async (req, res) => {
    const [rows] = await pool.execute(
      `SELECT b.*, rt.name AS room_type_name, rt.cover_image, r.room_number
       FROM bookings b
       JOIN room_types rt ON rt.id = b.room_type_id
       LEFT JOIN rooms r ON r.id = b.room_id
       WHERE b.user_id = ?
       ORDER BY b.created_at DESC`,
      [req.user.id]
    );
    return ok(res, rows);
  })
);

router.get(
  '/',
  authenticate,
  requireRoles('admin', 'receptionist', 'finance'),
  asyncHandler(async (req, res) => {
    const { status } = req.query;
    let sql = `SELECT b.*, rt.name AS room_type_name, r.room_number
               FROM bookings b
               JOIN room_types rt ON rt.id = b.room_type_id
               LEFT JOIN rooms r ON r.id = b.room_id`;
    const params = [];
    if (status) {
      sql += ` WHERE b.status = ?`;
      params.push(status);
    }
    sql += ` ORDER BY b.created_at DESC LIMIT 200`;
    const [rows] = await pool.execute(sql, params);
    return ok(res, rows);
  })
);

router.get(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const [rows] = await pool.execute(
      `SELECT b.*, rt.name AS room_type_name, rt.cover_image, r.room_number
       FROM bookings b
       JOIN room_types rt ON rt.id = b.room_type_id
       LEFT JOIN rooms r ON r.id = b.room_id
       WHERE b.id = ?`,
      [req.params.id]
    );
    if (!rows.length) return fail(res, 'Booking not found', 404);
    const booking = rows[0];
    if (
      req.user.role_name === 'customer' &&
      booking.user_id !== req.user.id
    ) {
      return fail(res, 'Forbidden', 403);
    }
    return ok(res, booking);
  })
);

router.patch(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const [rows] = await pool.execute(`SELECT * FROM bookings WHERE id = ?`, [req.params.id]);
    if (!rows.length) return fail(res, 'Booking not found', 404);
    const booking = rows[0];
    const isStaff = ['admin', 'receptionist'].includes(req.user.role_name);
    if (!isStaff && booking.user_id !== req.user.id) return fail(res, 'Forbidden', 403);

    const { check_in, check_out, special_requests, adults, children, status } = req.body;
    let total = booking.total_amount;
    let nights = booking.nights;

    if (check_in && check_out) {
      const [types] = await pool.execute(`SELECT base_price FROM room_types WHERE id = ?`, [
        booking.room_type_id,
      ]);
      nights = nightsBetween(check_in, check_out);
      total = Number(types[0].base_price) * nights;
    }

    await pool.execute(
      `UPDATE bookings SET
        check_in = COALESCE(?, check_in),
        check_out = COALESCE(?, check_out),
        special_requests = COALESCE(?, special_requests),
        adults = COALESCE(?, adults),
        children = COALESCE(?, children),
        status = COALESCE(?, status),
        total_amount = ?,
        nights = ?
       WHERE id = ?`,
      [
        check_in || null,
        check_out || null,
        special_requests || null,
        adults ?? null,
        children ?? null,
        isStaff ? status || null : null,
        total,
        nights,
        req.params.id,
      ]
    );
    return ok(res, null, 'Booking updated');
  })
);

router.post(
  '/:id/cancel',
  authenticate,
  asyncHandler(async (req, res) => {
    const [rows] = await pool.execute(`SELECT * FROM bookings WHERE id = ?`, [req.params.id]);
    if (!rows.length) return fail(res, 'Booking not found', 404);
    const booking = rows[0];
    const isStaff = ['admin', 'receptionist'].includes(req.user.role_name);
    if (!isStaff && booking.user_id !== req.user.id) return fail(res, 'Forbidden', 403);
    if (['cancelled', 'checked_out'].includes(booking.status)) {
      return fail(res, 'Booking cannot be cancelled');
    }

    await pool.execute(
      `UPDATE bookings SET status = 'cancelled', cancelled_at = datetime('now'), cancel_reason = ? WHERE id = ?`,
      [req.body.reason || null, booking.id]
    );
    if (booking.room_id) {
      await pool.execute(`UPDATE rooms SET status = 'available' WHERE id = ?`, [booking.room_id]);
    }
    return ok(res, null, 'Booking cancelled');
  })
);

router.post(
  '/:id/check-in',
  authenticate,
  requireRoles('admin', 'receptionist'),
  asyncHandler(async (req, res) => {
    const [rows] = await pool.execute(`SELECT * FROM bookings WHERE id = ?`, [req.params.id]);
    if (!rows.length) return fail(res, 'Booking not found', 404);
    await pool.execute(`UPDATE bookings SET status = 'checked_in' WHERE id = ?`, [req.params.id]);
    if (rows[0].room_id) {
      await pool.execute(`UPDATE rooms SET status = 'occupied' WHERE id = ?`, [rows[0].room_id]);
    }
    return ok(res, null, 'Guest checked in');
  })
);

router.post(
  '/:id/check-out',
  authenticate,
  requireRoles('admin', 'receptionist'),
  asyncHandler(async (req, res) => {
    const [rows] = await pool.execute(`SELECT * FROM bookings WHERE id = ?`, [req.params.id]);
    if (!rows.length) return fail(res, 'Booking not found', 404);
    await pool.execute(`UPDATE bookings SET status = 'checked_out' WHERE id = ?`, [req.params.id]);
    if (rows[0].room_id) {
      await pool.execute(`UPDATE rooms SET status = 'cleaning' WHERE id = ?`, [rows[0].room_id]);
      await pool.execute(
        `INSERT INTO housekeeping_tasks (room_id, task_type, status, scheduled_date)
         VALUES (?, 'cleaning', 'pending', date('now'))`,
        [rows[0].room_id]
      );
    }
    return ok(res, null, 'Guest checked out');
  })
);

router.get(
  '/:id/invoice.pdf',
  authenticate,
  asyncHandler(async (req, res) => {
    const [rows] = await pool.execute(
      `SELECT b.*, rt.name AS room_type_name, i.invoice_number, i.tax_amount, i.total_amount AS invoice_total
       FROM bookings b
       JOIN room_types rt ON rt.id = b.room_type_id
       LEFT JOIN invoices i ON i.booking_id = b.id
       WHERE b.id = ?`,
      [req.params.id]
    );
    if (!rows.length) return fail(res, 'Booking not found', 404);
    const b = rows[0];
    if (req.user.role_name === 'customer' && b.user_id !== req.user.id) {
      return fail(res, 'Forbidden', 403);
    }

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${b.booking_code}.pdf`);
    doc.pipe(res);

    doc.fillColor('#114B3A').fontSize(22).text(config.hotel.name, { align: 'left' });
    doc.fillColor('#333').fontSize(10).text(config.hotel.address);
    doc.text(`${config.hotel.phone} | ${config.hotel.email}`);
    doc.moveDown();
    doc.fillColor('#D4AF37').fontSize(16).text('INVOICE');
    doc.fillColor('#333').fontSize(11);
    doc.text(`Invoice: ${b.invoice_number || 'N/A'}`);
    doc.text(`Booking: ${b.booking_code}`);
    doc.text(`Guest: ${b.guest_name}`);
    doc.text(`Room: ${b.room_type_name}`);
    doc.text(`Stay: ${b.check_in} to ${b.check_out} (${b.nights} nights)`);
    doc.moveDown();
    doc.text(`Subtotal: RWF ${Number(b.total_amount).toLocaleString()}`);
    doc.text(`Tax (18%): RWF ${Number(b.tax_amount || 0).toLocaleString()}`);
    doc.fontSize(13).text(`Total: RWF ${Number(b.invoice_total || b.total_amount).toLocaleString()}`);
    doc.moveDown();
    doc.fontSize(10).fillColor('#666').text('Thank you for choosing SUN CITY NYAKARAMBI Ltd.');
    doc.end();
  })
);

export default router;
