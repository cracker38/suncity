import { Router } from 'express';
import { pool } from '../config/db.js';
import { ok, fail, asyncHandler } from '../utils/response.js';
import { authenticate, requireRoles, optionalAuth } from '../middleware/auth.js';
import { paymentRef, writeAudit } from '../utils/helpers.js';
import { processPayment, paymentMethodsPublic, normalizeRwPhone } from '../services/payments.js';
import { config } from '../config/index.js';

const router = Router();

router.get('/methods', (_req, res) => {
  return ok(res, {
    mode: config.paymentMode === 'mock' ? 'sandbox' : config.paymentMode,
    methods: paymentMethodsPublic(),
    currency: 'RWF',
  });
});

router.post(
  '/charge',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const {
      booking_id,
      booking_code,
      guest_email,
      method,
      phone,
      card_number,
      card_last4,
      card_exp,
      card_cvv,
    } = req.body;

    if (!method) return fail(res, 'Payment method required');
    if (!booking_id && !booking_code) return fail(res, 'booking_id or booking_code required');

    const [bookings] = await pool.execute(
      booking_id
        ? `SELECT * FROM bookings WHERE id = ?`
        : `SELECT * FROM bookings WHERE booking_code = ?`,
      [booking_id || booking_code]
    );
    if (!bookings.length) return fail(res, 'Booking not found', 404);
    const booking = bookings[0];

    const role = req.user?.role_name;
    const isStaff = role && ['admin', 'finance', 'receptionist'].includes(role);
    const isOwner = req.user && booking.user_id && booking.user_id === req.user.id;

    if (!isStaff && !isOwner) {
      const email = String(guest_email || '').trim().toLowerCase();
      const bookingEmail = String(booking.guest_email || '').trim().toLowerCase();
      if (!email || !bookingEmail || email !== bookingEmail) {
        return fail(res, 'Login or confirm the booking email to pay', 403);
      }
    }

    if (booking.payment_status === 'paid') {
      return fail(res, 'This booking is already paid', 409);
    }
    if (['cancelled', 'checked_out'].includes(booking.status)) {
      return fail(res, 'Cannot pay for this booking status', 400);
    }

    if (method === 'cash' && !isStaff) {
      // Guests may select cash — record as unpaid pending front-desk collection
      await pool.execute(
        `UPDATE bookings SET payment_status = 'pending' WHERE id = ? AND payment_status = 'unpaid'`,
        [booking.id]
      );
      return ok(res, {
        booking_id: booking.id,
        booking_code: booking.booking_code,
        status: 'pending_at_reception',
        method: 'cash',
        message: 'Pay cash at SUN CITY reception on arrival or now at the front desk.',
      }, 'Cash payment reserved at reception');
    }

    const [invoices] = await pool.execute(`SELECT * FROM invoices WHERE booking_id = ? LIMIT 1`, [
      booking.id,
    ]);
    const invoice = invoices[0];
    const amount = Number(invoice?.total_amount || booking.total_amount);

    let result;
    try {
      result = await processPayment({
        method,
        amount,
        phone,
        cardNumber: card_number,
        cardLast4: card_last4,
        cardExp: card_exp,
        cardCvv: card_cvv,
      });
    } catch (e) {
      return fail(res, e.message, e.status || 400);
    }

    const ref = paymentRef();
    const payerId = req.user?.id || booking.user_id || null;

    const [pay] = await pool.execute(
      `INSERT INTO payments (payment_ref, invoice_id, booking_id, user_id, amount, method, status, provider_ref, meta_json, paid_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        ref,
        invoice?.id || null,
        booking.id,
        payerId,
        amount,
        method,
        result.status,
        result.provider_ref,
        JSON.stringify({
          ...result.meta,
          collected_by: isStaff ? req.user.id : null,
          guest_phone: phone ? normalizeRwPhone(phone) : booking.guest_phone,
        }),
        result.status === 'completed' ? new Date() : null,
      ]
    );

    if (result.status === 'completed') {
      await pool.execute(`UPDATE bookings SET payment_status = 'paid' WHERE id = ?`, [booking.id]);
      if (invoice) {
        await pool.execute(`UPDATE invoices SET status = 'paid' WHERE id = ?`, [invoice.id]);
      }
      if (payerId) {
        await pool.execute(
          `INSERT INTO notifications (user_id, title, message, type, link)
           VALUES (?, 'Payment received', ?, 'payment', '/dashboard/invoices')`,
          [payerId, `Payment ${ref} of RWF ${amount.toLocaleString()} completed.`]
        );
      }
    } else if (result.status === 'pending') {
      await pool.execute(`UPDATE bookings SET payment_status = 'pending' WHERE id = ?`, [booking.id]);
    }

    await writeAudit({
      userId: req.user?.id || null,
      action: 'payment.charge',
      entity: 'payments',
      entityId: pay.insertId,
      details: { ref, method, amount, status: result.status, booking_id: booking.id },
      ip: req.ip,
    });

    return ok(
      res,
      {
        id: pay.insertId,
        payment_ref: ref,
        booking_id: booking.id,
        booking_code: booking.booking_code,
        amount,
        ...result,
      },
      result.status === 'completed' ? 'Payment completed' : 'Payment initiated'
    );
  })
);

router.get(
  '/history',
  authenticate,
  asyncHandler(async (req, res) => {
    const isStaff = ['admin', 'finance', 'receptionist'].includes(req.user.role_name);
    const [rows] = await pool.execute(
      isStaff
        ? `SELECT p.*, b.booking_code, b.guest_name
           FROM payments p
           LEFT JOIN bookings b ON b.id = p.booking_id
           ORDER BY p.created_at DESC LIMIT 200`
        : `SELECT * FROM payments WHERE user_id = ? ORDER BY created_at DESC`,
      isStaff ? [] : [req.user.id]
    );
    return ok(res, rows);
  })
);

async function ensureExpensesTable() {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INT AUTO_INCREMENT PRIMARY KEY,
      description VARCHAR(500) NOT NULL,
      amount DECIMAL(12,2) NOT NULL,
      category VARCHAR(100) DEFAULT 'operations',
      expense_date DATE NOT NULL,
      notes TEXT,
      created_by INT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  try {
    await pool.execute(`CREATE INDEX IF NOT EXISTS idx_expense_date ON expenses(expense_date)`);
  } catch {}
}
ensureExpensesTable().catch((e) => console.error('expenses table:', e.message));

router.get(
  '/expenses',
  authenticate,
  requireRoles('admin', 'finance'),
  asyncHandler(async (_req, res) => {
    const [rows] = await pool.execute(
      `SELECT e.*, CONCAT(u.first_name, ' ', u.last_name) AS created_by_name
       FROM expenses e
       LEFT JOIN users u ON u.id = e.created_by
       ORDER BY e.expense_date DESC, e.id DESC
       LIMIT 300`
    );
    return ok(res, rows);
  })
);

router.post(
  '/expenses',
  authenticate,
  requireRoles('admin', 'finance'),
  asyncHandler(async (req, res) => {
    const { description, amount, category = 'operations', expense_date, notes } = req.body;
    if (!description || !amount) return fail(res, 'description and amount required');
    const date = expense_date || new Date().toISOString().slice(0, 10);
    const [result] = await pool.execute(
      `INSERT INTO expenses (description, amount, category, expense_date, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [description, Number(amount), category, date, notes || null, req.user.id]
    );
    return ok(res, { id: result.insertId }, 'Expense recorded', 201);
  })
);

router.delete(
  '/expenses/:id',
  authenticate,
  requireRoles('admin', 'finance'),
  asyncHandler(async (req, res) => {
    await pool.execute(`DELETE FROM expenses WHERE id = ?`, [req.params.id]);
    return ok(res, null, 'Expense deleted');
  })
);

router.post(
  '/refunds',
  authenticate,
  requireRoles('admin', 'finance'),
  asyncHandler(async (req, res) => {
    const { payment_id, amount, reason } = req.body;
    const [pays] = await pool.execute(`SELECT * FROM payments WHERE id = ?`, [payment_id]);
    if (!pays.length) return fail(res, 'Payment not found', 404);
    if (pays[0].status === 'refunded') return fail(res, 'Already refunded', 409);
    const [result] = await pool.execute(
      `INSERT INTO refunds (payment_id, amount, reason, status, processed_by)
       VALUES (?, ?, ?, 'approved', ?)`,
      [payment_id, amount || pays[0].amount, reason || null, req.user.id]
    );
    await pool.execute(`UPDATE payments SET status = 'refunded' WHERE id = ?`, [payment_id]);
    if (pays[0].booking_id) {
      await pool.execute(`UPDATE bookings SET payment_status = 'refunded' WHERE id = ?`, [
        pays[0].booking_id,
      ]);
      const [inv] = await pool.execute(`SELECT id FROM invoices WHERE booking_id = ? LIMIT 1`, [
        pays[0].booking_id,
      ]);
      if (inv.length) {
        await pool.execute(`UPDATE invoices SET status = 'refunded' WHERE id = ?`, [inv[0].id]);
      }
    }
    return ok(res, { id: result.insertId }, 'Refund recorded', 201);
  })
);

export default router;
