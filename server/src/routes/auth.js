import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import { z } from 'zod';
import { pool } from '../config/db.js';
import { config } from '../config/index.js';
import { ok, fail, asyncHandler } from '../utils/response.js';
import { validate } from '../middleware/error.js';
import { authenticate, signAccessToken, signRefreshToken } from '../middleware/auth.js';
import { writeAudit, writeActivity } from '../utils/helpers.js';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  phone: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  totp: z.string().optional(),
});

async function getUserByEmail(email) {
  const [rows] = await pool.execute(
    `SELECT u.*, r.name AS role_name, r.display_name AS role_display
     FROM users u JOIN roles r ON r.id = u.role_id WHERE u.email = ?`,
    [email]
  );
  return rows[0] || null;
}

function publicUser(u) {
  return {
    id: u.id,
    email: u.email,
    first_name: u.first_name,
    last_name: u.last_name,
    phone: u.phone,
    role: u.role_name,
    role_display: u.role_display,
    avatar: u.avatar,
    address: u.address,
    city: u.city,
    country: u.country,
    two_fa_enabled: !!u.two_fa_enabled,
  };
}

router.post(
  '/register',
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const { email, password, first_name, last_name, phone } = req.body;
    const existing = await getUserByEmail(email);
    if (existing) return fail(res, 'Email already registered', 409);

    const hash = await bcrypt.hash(password, 10);
    await pool.execute(
      `INSERT INTO users (role_id, email, password_hash, first_name, last_name, phone, email_verified)
       VALUES (2, ?, ?, ?, ?, ?, 1)`,
      [email, hash, first_name, last_name, phone || null]
    );

    const user = await getUserByEmail(email);
    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await pool.execute(`INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)`, [
      user.id,
      refreshToken,
      expires,
    ]);
    await writeAudit({ userId: user.id, action: 'register', entity: 'users', entityId: user.id, ip: req.ip });
    return ok(res, { user: publicUser(user), accessToken, refreshToken }, 'Registered successfully', 201);
  })
);

router.get('/login', (req, res) => res.status(405).json({ success: false, message: 'Use POST /api/auth/login' }));

router.post(
  '/login',
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password, totp } = req.body;
    const user = await getUserByEmail(email);
    if (!user || !user.is_active) return fail(res, 'Invalid credentials', 401);

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return fail(res, 'Invalid credentials', 401);

    if (user.two_fa_enabled) {
      if (!totp) return fail(res, 'Two-factor code required', 401, { requires2FA: true });
      const valid = speakeasy.totp.verify({
        secret: user.two_fa_secret,
        encoding: 'base32',
        token: totp,
        window: 1,
      });
      if (!valid) return fail(res, 'Invalid 2FA code', 401);
    }

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await pool.execute(`INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)`, [
      user.id,
      refreshToken,
      expires,
    ]);
    await pool.execute(`UPDATE users SET last_login = datetime('now') WHERE id = ?`, [user.id]);
    await writeActivity({ userId: user.id, activity: 'login' });
    return ok(res, { user: publicUser(user), accessToken, refreshToken }, 'Login successful');
  })
);

router.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) return fail(res, 'Refresh token required', 400);
    let payload;
    try {
      payload = jwt.verify(refreshToken, config.jwt.refreshSecret);
    } catch {
      return fail(res, 'Invalid refresh token', 401);
    }
    const [rows] = await pool.execute(
      `SELECT * FROM refresh_tokens WHERE token = ? AND user_id = ? AND expires_at > datetime('now')`,
      [refreshToken, payload.id]
    );
    if (!rows.length) return fail(res, 'Refresh token expired', 401);
    const [users] = await pool.execute(
      `SELECT u.*, r.name AS role_name FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = ?`,
      [payload.id]
    );
    if (!users.length) return fail(res, 'User not found', 401);
    return ok(res, { accessToken: signAccessToken(users[0]) });
  })
);

router.post(
  '/forgot-password',
  asyncHandler(async (req, res) => {
    const { email } = req.body;
    if (!email) return fail(res, 'Email required');
    const user = await getUserByEmail(email);
    if (!user) return ok(res, null, 'If the email exists, a reset link was sent');
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000);
    await pool.execute(`UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?`, [
      token,
      expires,
      user.id,
    ]);
    const payload = config.env === 'development' ? { resetToken: token } : null;
    return ok(res, payload, 'If the email exists, a reset link was sent');
  })
);

router.post(
  '/reset-password',
  asyncHandler(async (req, res) => {
    const { token, password } = req.body;
    if (!token || !password) return fail(res, 'Token and password required');
    const [rows] = await pool.execute(
      `SELECT * FROM users WHERE reset_token = ? AND reset_token_expires > datetime('now')`,
      [token]
    );
    if (!rows.length) return fail(res, 'Invalid or expired token', 400);
    const hash = await bcrypt.hash(password, 10);
    await pool.execute(
      `UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?`,
      [hash, rows[0].id]
    );
    return ok(res, null, 'Password updated');
  })
);

router.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const [perms] = await pool.execute(
      `SELECT p.code FROM permissions p
       JOIN role_permissions rp ON rp.permission_id = p.id
       WHERE rp.role_id = ?`,
      [req.user.role_id]
    );
    return ok(res, { user: publicUser(req.user), permissions: perms.map((p) => p.code) });
  })
);

router.put(
  '/profile',
  authenticate,
  asyncHandler(async (req, res) => {
    const { first_name, last_name, phone, address, city, country } = req.body;
    await pool.execute(
      `UPDATE users SET first_name = COALESCE(?, first_name), last_name = COALESCE(?, last_name),
       phone = COALESCE(?, phone), address = COALESCE(?, address), city = COALESCE(?, city),
       country = COALESCE(?, country) WHERE id = ?`,
      [first_name || null, last_name || null, phone || null, address || null, city || null, country || null, req.user.id]
    );
    const user = await getUserByEmail(req.user.email);
    return ok(res, { user: publicUser(user) }, 'Profile updated');
  })
);

router.post(
  '/2fa/setup',
  authenticate,
  asyncHandler(async (req, res) => {
    const secret = speakeasy.generateSecret({ name: `SUN CITY (${req.user.email})` });
    await pool.execute(`UPDATE users SET two_fa_secret = ? WHERE id = ?`, [secret.base32, req.user.id]);
    const qr = await qrcode.toDataURL(secret.otpauth_url);
    return ok(res, { qr, secret: secret.base32 });
  })
);

router.post(
  '/2fa/enable',
  authenticate,
  asyncHandler(async (req, res) => {
    const { totp } = req.body;
    const valid = speakeasy.totp.verify({
      secret: req.user.two_fa_secret,
      encoding: 'base32',
      token: totp,
      window: 1,
    });
    if (!valid) return fail(res, 'Invalid code');
    await pool.execute(`UPDATE users SET two_fa_enabled = 1 WHERE id = ?`, [req.user.id]);
    return ok(res, null, '2FA enabled');
  })
);

router.post(
  '/logout',
  authenticate,
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await pool.execute(`DELETE FROM refresh_tokens WHERE token = ? AND user_id = ?`, [
        refreshToken,
        req.user.id,
      ]);
    }
    return ok(res, null, 'Logged out');
  })
);

export default router;
