import { pool } from '../config/db.js';

export async function writeAudit({ userId, action, entity, entityId, details, ip }) {
  try {
    await pool.execute(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, details, ip_address)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId || null, action, entity || null, entityId || null, details ? JSON.stringify(details) : null, ip || null]
    );
  } catch {
    // non-blocking
  }
}

export async function writeActivity({ userId, activity, meta }) {
  try {
    await pool.execute(
      `INSERT INTO activity_logs (user_id, activity, meta_json) VALUES (?, ?, ?)`,
      [userId || null, activity, meta ? JSON.stringify(meta) : null]
    );
  } catch {
    // non-blocking
  }
}

export function bookingCode(prefix = 'SC') {
  const n = Date.now().toString(36).toUpperCase();
  const r = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${n}${r}`;
}

export function invoiceNumber() {
  return `INV-${Date.now()}`;
}

export function paymentRef() {
  return `PAY-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

export function nightsBetween(checkIn, checkOut) {
  const a = new Date(checkIn);
  const b = new Date(checkOut);
  const diff = Math.ceil((b - a) / (1000 * 60 * 60 * 24));
  return Math.max(diff, 1);
}
