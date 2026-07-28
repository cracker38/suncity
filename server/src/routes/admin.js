import { Router } from 'express';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../config/db.js';
import { ok, fail, asyncHandler } from '../utils/response.js';
import { authenticate, requireRoles } from '../middleware/auth.js';

const router = Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

router.use(authenticate, requireRoles('admin'));

router.get('/users', asyncHandler(async (req, res) => {
  const [rows] = await pool.execute(
    `SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.is_active, u.last_login, r.name AS role
     FROM users u JOIN roles r ON r.id = u.role_id ORDER BY u.id`
  );
  return ok(res, rows);
}));

router.post('/users', asyncHandler(async (req, res) => {
  const b = req.body;
  const hash = await bcrypt.hash(b.password || 'ChangeMe@123', 10);
  const [result] = await pool.execute(
    `INSERT INTO users (role_id, email, password_hash, first_name, last_name, phone, is_active, email_verified)
     VALUES (?, ?, ?, ?, ?, ?, 1, 1)`,
    [b.role_id, b.email, hash, b.first_name, b.last_name, b.phone || null]
  );
  return ok(res, { id: result.insertId }, 'User created', 201);
}));

router.patch('/users/:id', asyncHandler(async (req, res) => {
  const b = req.body;
  await pool.execute(
    `UPDATE users SET
      role_id = COALESCE(?, role_id),
      first_name = COALESCE(?, first_name),
      last_name = COALESCE(?, last_name),
      phone = COALESCE(?, phone),
      is_active = COALESCE(?, is_active)
     WHERE id = ?`,
    [b.role_id || null, b.first_name || null, b.last_name || null, b.phone || null, b.is_active ?? null, req.params.id]
  );
  return ok(res, null, 'User updated');
}));

router.get('/roles', asyncHandler(async (req, res) => {
  const [roles] = await pool.execute(`SELECT * FROM roles`);
  const [permissions] = await pool.execute(`SELECT * FROM permissions`);
  return ok(res, { roles, permissions });
}));

router.get('/audit', asyncHandler(async (req, res) => {
  const [rows] = await pool.execute(`SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 200`);
  return ok(res, rows);
}));

router.get('/activity', asyncHandler(async (req, res) => {
  const [rows] = await pool.execute(`SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 200`);
  return ok(res, rows);
}));

router.get('/health', asyncHandler(async (req, res) => {
  const [db] = await pool.query('SELECT 1 AS ok');
  return ok(res, {
    status: 'healthy',
    database: db[0]?.ok === 1,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString(),
  });
}));

router.post('/backup', asyncHandler(async (req, res) => {
  const backupDir = path.resolve(__dirname, '../../backups');
  fs.mkdirSync(backupDir, { recursive: true });
  const file = path.join(backupDir, `backup-meta-${Date.now()}.json`);
  const tables = [
    'users',
    'bookings',
    'payments',
    'invoices',
    'rooms',
    'room_types',
    'event_bookings',
    'catering_requests',
  ];
  const dump = {};
  for (const t of tables) {
    const [rows] = await pool.query(`SELECT * FROM ${t}`);
    dump[t] = rows;
  }
  fs.writeFileSync(file, JSON.stringify({ created_at: new Date().toISOString(), dump }, null, 2));
  return ok(res, { file: path.basename(file) }, 'Backup created');
}));

router.get('/backups', asyncHandler(async (req, res) => {
  const backupDir = path.resolve(__dirname, '../../backups');
  fs.mkdirSync(backupDir, { recursive: true });
  const files = fs.readdirSync(backupDir).filter((f) => f.endsWith('.json'));
  return ok(res, files);
}));

export default router;
