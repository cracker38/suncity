import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { pool } from '../config/db.js';
import { fail } from '../utils/response.js';

export function signAccessToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role_name, roleId: user.role_id },
    config.jwt.accessSecret,
    { expiresIn: config.jwt.accessExpires }
  );
}

export function signRefreshToken(user) {
  return jwt.sign({ id: user.id }, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpires,
  });
}

export async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return fail(res, 'Authentication required', 401);

    const payload = jwt.verify(token, config.jwt.accessSecret);
    const [rows] = await pool.execute(
      `SELECT u.*, r.name AS role_name, r.display_name AS role_display
       FROM users u JOIN roles r ON r.id = u.role_id
       WHERE u.id = ? AND u.is_active = 1`,
      [payload.id]
    );
    if (!rows.length) return fail(res, 'User not found or inactive', 401);
    req.user = rows[0];
    next();
  } catch {
    return fail(res, 'Invalid or expired token', 401);
  }
}

export function optionalAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next();
  jwt.verify(token, config.jwt.accessSecret, async (err, payload) => {
    if (err) return next();
    try {
      const [rows] = await pool.execute(
        `SELECT u.*, r.name AS role_name FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = ?`,
        [payload.id]
      );
      if (rows.length) req.user = rows[0];
    } catch {
      // ignore
    }
    next();
  });
}

export function requireRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) return fail(res, 'Authentication required', 401);
    if (req.user.role_name === 'admin') return next();
    if (!roles.includes(req.user.role_name)) {
      return fail(res, 'Insufficient permissions', 403);
    }
    next();
  };
}

export async function requirePermission(code) {
  return async (req, res, next) => {
    if (!req.user) return fail(res, 'Authentication required', 401);
    if (req.user.role_name === 'admin') return next();
    const [rows] = await pool.execute(
      `SELECT p.code FROM permissions p
       JOIN role_permissions rp ON rp.permission_id = p.id
       WHERE rp.role_id = ? AND p.code = ?`,
      [req.user.role_id, code]
    );
    if (!rows.length) return fail(res, 'Permission denied', 403);
    next();
  };
}
