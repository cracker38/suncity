import { Router } from 'express';
import ExcelJS from 'exceljs';
import { pool } from '../config/db.js';
import { ok, asyncHandler } from '../utils/response.js';
import { authenticate, requireRoles } from '../middleware/auth.js';
import { config } from '../config/index.js';

const router = Router();

// Cross-driver date helpers
const isSqlite = config.db.driver === 'sqlite';
const fmtMonth = isSqlite ? "strftime('%Y-%m', {col})" : "DATE_FORMAT({col}, '%Y-%m')";
const today = isSqlite ? "date('now')" : 'CURDATE()';

function monthFmt(col) { return fmtMonth.replace(/{col}/g, col); }

router.get(
  '/overview',
  authenticate,
  requireRoles('admin', 'finance', 'receptionist', 'restaurant_manager', 'events_manager', 'service_ops'),
  asyncHandler(async (req, res) => {
    const [[bookingsToday]] = await pool.query(
      `SELECT COUNT(*) AS c FROM bookings WHERE ${isSqlite ? "date(created_at)" : "DATE(created_at)"} = ${today}`
    );
    const [[availableRooms]] = await pool.query(`SELECT COUNT(*) AS c FROM rooms WHERE status = 'available'`);
    const [[occupiedRooms]] = await pool.query(`SELECT COUNT(*) AS c FROM rooms WHERE status = 'occupied'`);
    const [[revenue]] = await pool.query(`SELECT COALESCE(SUM(amount),0) AS total FROM payments WHERE status = 'completed'`);
    const [[restaurantSales]] = await pool.query(`SELECT COALESCE(SUM(total_amount),0) AS total FROM restaurant_orders WHERE status != 'cancelled'`);
    const [[eventBookings]] = await pool.query(`SELECT COUNT(*) AS c FROM event_bookings WHERE status IN ('pending','confirmed')`);
    const [[cateringRequests]] = await pool.query(`SELECT COUNT(*) AS c FROM catering_requests WHERE status IN ('pending','quoted','confirmed')`);
    const [[cleaningPending]] = await pool.query(`SELECT COUNT(*) AS c FROM housekeeping_tasks WHERE status IN ('pending','in_progress')`);
    const [[satisfaction]] = await pool.query(`SELECT ROUND(AVG(rating),2) AS avg_rating FROM reviews WHERE is_approved = 1`);

    const [monthlyRevenue] = await pool.query(
      `SELECT ${monthFmt('paid_at')} AS month, SUM(amount) AS total
       FROM payments WHERE status = 'completed' AND paid_at IS NOT NULL
       GROUP BY ${monthFmt('paid_at')}
       ORDER BY month DESC LIMIT 12`
    );
    const [bookingTrends] = await pool.query(
      `SELECT ${monthFmt('created_at')} AS month, COUNT(*) AS total
       FROM bookings GROUP BY ${monthFmt('created_at')}
       ORDER BY month DESC LIMIT 12`
    );
    const [popularRooms] = await pool.query(
      `SELECT rt.name, COUNT(b.id) AS bookings
       FROM bookings b JOIN room_types rt ON rt.id = b.room_type_id
       GROUP BY rt.id, rt.name ORDER BY bookings DESC LIMIT 5`
    );
    const [[aiUsage]] = await pool.query(`SELECT COUNT(*) AS c FROM ai_conversations WHERE role = 'user'`);

    return ok(res, {
      todays_bookings: bookingsToday.c,
      available_rooms: availableRooms.c,
      occupied_rooms: occupiedRooms.c,
      revenue: Number(revenue.total),
      restaurant_sales: Number(restaurantSales.total),
      event_bookings: eventBookings.c,
      catering_requests: cateringRequests.c,
      cleaning_pending: cleaningPending.c,
      customer_satisfaction: Number(satisfaction.avg_rating || 0),
      monthly_revenue: monthlyRevenue.reverse(),
      booking_trends: bookingTrends.reverse(),
      popular_rooms: popularRooms,
      ai_usage: aiUsage.c,
    });
  })
);

router.get(
  '/invoices',
  authenticate,
  requireRoles('admin', 'finance', 'receptionist'),
  asyncHandler(async (req, res) => {
    const [rows] = await pool.execute(
      `SELECT i.*, b.booking_code, b.guest_name
       FROM invoices i
       LEFT JOIN bookings b ON b.id = i.booking_id
       ORDER BY i.issued_at DESC LIMIT 200`
    );
    return ok(res, rows);
  })
);

router.get(
  '/finance',
  authenticate,
  requireRoles('admin', 'finance'),
  asyncHandler(async (req, res) => {
    const [payments] = await pool.execute(`SELECT * FROM payments ORDER BY created_at DESC LIMIT 100`);
    const [invoices] = await pool.execute(`SELECT * FROM invoices ORDER BY issued_at DESC LIMIT 100`);
    const [refunds] = await pool.execute(`SELECT * FROM refunds ORDER BY created_at DESC LIMIT 100`);
    const [[accommodation]] = await pool.query(
      `SELECT COALESCE(SUM(p.amount),0) AS total FROM payments p
       JOIN bookings b ON b.id = p.booking_id WHERE p.status = 'completed'`
    );
    const [[events]] = await pool.query(
      `SELECT COALESCE(SUM(total_amount),0) AS total FROM event_bookings WHERE status IN ('confirmed','completed')`
    );
    const [[restaurant]] = await pool.query(
      `SELECT COALESCE(SUM(total_amount),0) AS total FROM restaurant_orders WHERE status != 'cancelled'`
    );
    const [[catering]] = await pool.query(
      `SELECT COALESCE(SUM(amount),0) AS total FROM catering_quotations WHERE status = 'accepted'`
    );
    return ok(res, {
      payments,
      invoices,
      refunds,
      revenue_breakdown: {
        accommodation: Number(accommodation.total),
        events: Number(events.total),
        restaurant: Number(restaurant.total),
        catering: Number(catering.total),
      },
    });
  })
);

router.get(
  '/export/:type',
  authenticate,
  requireRoles('admin', 'finance', 'receptionist'),
  asyncHandler(async (req, res) => {
    const { type } = req.params;
    const format = req.query.format || 'csv';
    let rows = [];
    let filename = type;

    if (type === 'bookings') {
      [rows] = await pool.execute(
        `SELECT booking_code, guest_name, check_in, check_out, status, payment_status, total_amount FROM bookings`
      );
    } else if (type === 'payments') {
      [rows] = await pool.execute(`SELECT payment_ref, amount, method, status, paid_at FROM payments`);
    } else if (type === 'occupancy') {
      [rows] = await pool.execute(`SELECT room_number, status, floor FROM rooms`);
    } else {
      [rows] = await pool.execute(
        `SELECT invoice_number, amount, tax_amount, total_amount, status, issued_at FROM invoices`
      );
      filename = 'invoices';
    }

    if (format === 'xlsx') {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet(filename);
      if (rows.length) {
        ws.columns = Object.keys(rows[0]).map((k) => ({ header: k, key: k, width: 18 }));
        rows.forEach((r) => ws.addRow(r));
      }
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}.xlsx`);
      await wb.xlsx.write(res);
      return res.end();
    }

    const headers = rows.length ? Object.keys(rows[0]) : [];
    const csv = [
      headers.join(','),
      ...rows.map((r) => headers.map((h) => JSON.stringify(r[h] ?? '')).join(',')),
    ].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}.csv`);
    return res.send(csv);
  })
);

export default router;
