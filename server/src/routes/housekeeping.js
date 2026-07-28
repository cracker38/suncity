import { Router } from 'express';
import { pool } from '../config/db.js';
import { ok, fail, asyncHandler } from '../utils/response.js';
import { authenticate, requireRoles } from '../middleware/auth.js';

const router = Router();

router.use(authenticate, requireRoles('admin', 'service_ops', 'receptionist'));

router.get('/tasks', asyncHandler(async (req, res) => {
  const [rows] = await pool.execute(
    `SELECT ht.*, r.room_number FROM housekeeping_tasks ht
     JOIN rooms r ON r.id = ht.room_id
     ORDER BY ht.scheduled_date DESC, ht.id DESC LIMIT 200`
  );
  return ok(res, rows);
}));

router.post('/tasks', asyncHandler(async (req, res) => {
  const b = req.body;
  if (!b.room_id || !b.scheduled_date) return fail(res, 'room_id and scheduled_date required');
  const [result] = await pool.execute(
    `INSERT INTO housekeeping_tasks (room_id, assigned_to, task_type, status, scheduled_date, notes)
     VALUES (?, ?, ?, 'pending', ?, ?)`,
    [b.room_id, b.assigned_to || null, b.task_type || 'cleaning', b.scheduled_date, b.notes || null]
  );
  return ok(res, { id: result.insertId }, 'Task created', 201);
}));

router.patch('/tasks/:id', asyncHandler(async (req, res) => {
  const { status, notes } = req.body;
  await pool.execute(
    `UPDATE housekeeping_tasks SET status = COALESCE(?, status), notes = COALESCE(?, notes),
     completed_at = CASE WHEN ? = 'completed' THEN datetime('now') ELSE completed_at END
     WHERE id = ?`,
    [status || null, notes || null, status || null, req.params.id]
  );
  if (status === 'completed') {
    const [tasks] = await pool.execute(`SELECT room_id FROM housekeeping_tasks WHERE id = ?`, [req.params.id]);
    if (tasks.length) {
      await pool.execute(`UPDATE rooms SET status = 'available' WHERE id = ?`, [tasks[0].room_id]);
    }
  }
  return ok(res, null, 'Task updated');
}));

router.get('/maintenance', asyncHandler(async (req, res) => {
  const [rows] = await pool.execute(`SELECT * FROM maintenance_requests ORDER BY created_at DESC LIMIT 200`);
  return ok(res, rows);
}));

router.post('/maintenance', asyncHandler(async (req, res) => {
  const b = req.body;
  const [result] = await pool.execute(
    `INSERT INTO maintenance_requests (room_id, reported_by, title, description, priority, status)
     VALUES (?, ?, ?, ?, ?, 'open')`,
    [b.room_id || null, req.user.id, b.title, b.description || null, b.priority || 'medium']
  );
  return ok(res, { id: result.insertId }, 'Maintenance request created', 201);
}));

router.patch('/maintenance/:id', asyncHandler(async (req, res) => {
  await pool.execute(`UPDATE maintenance_requests SET status = COALESCE(?, status), priority = COALESCE(?, priority) WHERE id = ?`, [
    req.body.status || null,
    req.body.priority || null,
    req.params.id,
  ]);
  return ok(res, null, 'Updated');
}));

router.get('/lost-found', asyncHandler(async (req, res) => {
  const [rows] = await pool.execute(`SELECT * FROM lost_found ORDER BY found_date DESC`);
  return ok(res, rows);
}));

router.post('/lost-found', asyncHandler(async (req, res) => {
  const b = req.body;
  const [result] = await pool.execute(
    `INSERT INTO lost_found (room_id, item_name, description, status, found_date)
     VALUES (?, ?, ?, 'found', ?)`,
    [b.room_id || null, b.item_name, b.description || null, b.found_date || new Date()]
  );
  return ok(res, { id: result.insertId }, 'Item logged', 201);
}));

router.patch('/lost-found/:id', asyncHandler(async (req, res) => {
  const { status, claimed_by } = req.body;
  const allowed = ['found', 'claimed', 'disposed'];
  if (status && !allowed.includes(status)) return fail(res, 'Invalid status');
  await pool.execute(
    `UPDATE lost_found SET
       status = COALESCE(?, status),
       claimed_by = COALESCE(?, claimed_by)
     WHERE id = ?`,
    [status || null, claimed_by || null, req.params.id]
  );
  return ok(res, null, 'Lost & found item updated');
}));

export default router;
