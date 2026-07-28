import { Router } from 'express';
import { pool } from '../config/db.js';
import { ok, fail, asyncHandler } from '../utils/response.js';
import { authenticate, requireRoles, optionalAuth } from '../middleware/auth.js';
import { bookingCode } from '../utils/helpers.js';

const router = Router();

async function ensureMenuStockColumn() {
  try {
    await pool.execute(
      `ALTER TABLE menu_items ADD COLUMN stock_qty INT NOT NULL DEFAULT 50`
    );
  } catch {
    // column already exists
  }
}

router.get('/menu', asyncHandler(async (req, res) => {
  const [categories] = await pool.execute(
    `SELECT * FROM menu_categories WHERE is_active = 1 ORDER BY sort_order`
  );
  const [items] = await pool.execute(
    `SELECT * FROM menu_items WHERE is_available = 1 ORDER BY is_chef_recommendation DESC, name`
  );
  return ok(res, { categories, items });
}));

router.get(
  '/menu/manage',
  authenticate,
  requireRoles('admin', 'restaurant_manager'),
  asyncHandler(async (req, res) => {
    await ensureMenuStockColumn();
    const [categories] = await pool.execute(
      `SELECT * FROM menu_categories WHERE is_active = 1 ORDER BY sort_order`
    );
    const [items] = await pool.execute(
      `SELECT mi.*, mc.name AS category_name
       FROM menu_items mi
       LEFT JOIN menu_categories mc ON mc.id = mi.category_id
       ORDER BY mi.is_available DESC, mi.name`
    );
    return ok(res, { categories, items });
  })
);

router.patch(
  '/menu/items/:id',
  authenticate,
  requireRoles('admin', 'restaurant_manager'),
  asyncHandler(async (req, res) => {
    await ensureMenuStockColumn();
    const b = req.body;
    await pool.execute(
      `UPDATE menu_items SET
         name = COALESCE(?, name),
         description = COALESCE(?, description),
         price = COALESCE(?, price),
         category_id = COALESCE(?, category_id),
         is_available = COALESCE(?, is_available),
         is_chef_recommendation = COALESCE(?, is_chef_recommendation),
         stock_qty = COALESCE(?, stock_qty)
       WHERE id = ?`,
      [
        b.name ?? null,
        b.description ?? null,
        b.price != null ? Number(b.price) : null,
        b.category_id != null ? Number(b.category_id) : null,
        b.is_available != null ? (b.is_available ? 1 : 0) : null,
        b.is_chef_recommendation != null ? (b.is_chef_recommendation ? 1 : 0) : null,
        b.stock_qty != null ? Number(b.stock_qty) : null,
        req.params.id,
      ]
    );
    return ok(res, null, 'Menu item updated');
  })
);

router.get(
  '/inventory',
  authenticate,
  requireRoles('admin', 'restaurant_manager'),
  asyncHandler(async (req, res) => {
    await ensureMenuStockColumn();
    const [items] = await pool.execute(
      `SELECT mi.id, mi.name, mi.price, mi.is_available, mi.stock_qty, mc.name AS category_name
       FROM menu_items mi
       LEFT JOIN menu_categories mc ON mc.id = mi.category_id
       ORDER BY mi.stock_qty ASC, mi.name`
    );
    const low = items.filter((i) => Number(i.stock_qty) <= 10).length;
    const out = items.filter((i) => Number(i.stock_qty) <= 0 || !i.is_available).length;
    return ok(res, {
      items,
      summary: {
        total_items: items.length,
        in_stock: items.filter((i) => Number(i.stock_qty) > 10 && i.is_available).length,
        low_stock: low,
        unavailable: out,
      },
    });
  })
);

router.post('/reservations', optionalAuth, asyncHandler(async (req, res) => {
  const b = req.body;
  if (!b.guest_name || !b.reservation_date || !b.reservation_time) {
    return fail(res, 'guest_name, reservation_date, and reservation_time required');
  }
  const [result] = await pool.execute(
    `INSERT INTO table_reservations
     (user_id, guest_name, guest_email, guest_phone, reservation_date, reservation_time, guests, notes, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'confirmed')`,
    [
      req.user?.id || null,
      b.guest_name,
      b.guest_email || null,
      b.guest_phone || null,
      b.reservation_date,
      b.reservation_time,
      b.guests || 2,
      b.notes || null,
    ]
  );
  return ok(res, { id: result.insertId }, 'Table reserved', 201);
}));

router.get('/reservations', authenticate, requireRoles('admin', 'restaurant_manager'), asyncHandler(async (req, res) => {
  const [rows] = await pool.execute(`SELECT * FROM table_reservations ORDER BY reservation_date DESC, reservation_time DESC LIMIT 200`);
  return ok(res, rows);
}));

router.patch('/reservations/:id', authenticate, requireRoles('admin', 'restaurant_manager'), asyncHandler(async (req, res) => {
  const { status } = req.body;
  const allowed = ['pending', 'confirmed', 'seated', 'completed', 'cancelled'];
  if (!allowed.includes(status)) return fail(res, 'Invalid status');
  await pool.execute(`UPDATE table_reservations SET status = ? WHERE id = ?`, [status, req.params.id]);
  return ok(res, null, 'Reservation updated');
}));

router.post('/orders', authenticate, requireRoles('admin', 'restaurant_manager'), asyncHandler(async (req, res) => {
  await ensureMenuStockColumn();
  const { items, total_amount, table_reservation_id } = req.body;
  const list = Array.isArray(items) ? items : [];

  for (const line of list) {
    if (!line.id) continue;
    const qty = Math.max(1, Number(line.qty) || 1);
    const [rows] = await pool.execute(
      `SELECT id, name, stock_qty, is_available FROM menu_items WHERE id = ?`,
      [line.id]
    );
    if (!rows.length) return fail(res, `Menu item not found: ${line.name || line.id}`, 404);
    if (!rows[0].is_available) return fail(res, `${rows[0].name} is not available`, 409);
    if (Number(rows[0].stock_qty) < qty) {
      return fail(res, `Insufficient stock for ${rows[0].name} (have ${rows[0].stock_qty})`, 409);
    }
  }

  const code = bookingCode('ORD');
  let computed = 0;
  for (const line of list) {
    const qty = Math.max(1, Number(line.qty) || 1);
    const price = Number(line.price) || 0;
    computed += price * qty;
  }
  const total = Number(total_amount) || computed;

  const [result] = await pool.execute(
    `INSERT INTO restaurant_orders (order_code, table_reservation_id, items_json, total_amount, status)
     VALUES (?, ?, ?, ?, 'pending')`,
    [code, table_reservation_id || null, JSON.stringify(list), total]
  );

  for (const line of list) {
    if (!line.id) continue;
    const qty = Math.max(1, Number(line.qty) || 1);
    await pool.execute(
      `UPDATE menu_items SET
         stock_qty = MAX(0, stock_qty - ?),
         is_available = CASE WHEN (stock_qty - ?) <= 0 THEN 0 ELSE is_available END
       WHERE id = ?`,
      [qty, qty, line.id]
    );
  }

  return ok(res, { id: result.insertId, order_code: code, total_amount: total }, 'Order created', 201);
}));

router.get('/orders', authenticate, requireRoles('admin', 'restaurant_manager'), asyncHandler(async (req, res) => {
  const [rows] = await pool.execute(`SELECT * FROM restaurant_orders ORDER BY created_at DESC LIMIT 200`);
  return ok(res, rows);
}));

router.patch('/orders/:id', authenticate, requireRoles('admin', 'restaurant_manager'), asyncHandler(async (req, res) => {
  await pool.execute(`UPDATE restaurant_orders SET status = ? WHERE id = ?`, [req.body.status, req.params.id]);
  return ok(res, null, 'Order updated');
}));

router.post('/menu/items', authenticate, requireRoles('admin', 'restaurant_manager'), asyncHandler(async (req, res) => {
  await ensureMenuStockColumn();
  const b = req.body;
  const [result] = await pool.execute(
    `INSERT INTO menu_items (category_id, name, description, price, image_url, is_chef_recommendation, stock_qty)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      b.category_id,
      b.name,
      b.description || null,
      b.price,
      b.image_url || null,
      b.is_chef_recommendation ? 1 : 0,
      b.stock_qty != null ? Number(b.stock_qty) : 50,
    ]
  );
  return ok(res, { id: result.insertId }, 'Menu item added', 201);
}));

export default router;
