/**
 * importDb.js — seeds the database (MySQL or SQLite)
 * Run: node src/scripts/importDb.js
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const driver  = process.env.DB_DRIVER || 'sqlite';
const sqlDir  = path.resolve(__dirname, '../../sql');

// ── Seed data (driver-agnostic) ───────────────────────────────────────────────
const PASSWORDS = {
  'admin@suncity.rw':      'Admin@123',
  'reception@suncity.rw':  'Staff@123',
  'restaurant@suncity.rw': 'Staff@123',
  'events@suncity.rw':     'Staff@123',
  'ops@suncity.rw':        'Staff@123',
  'finance@suncity.rw':    'Staff@123',
  'guest@suncity.rw':      'Guest@123',
};

// ── SQLite ────────────────────────────────────────────────────────────────────
async function runSqlite() {
  const { default: Database } = await import('better-sqlite3');
  const dbPath = path.isAbsolute(process.env.SQLITE_PATH || '')
    ? process.env.SQLITE_PATH
    : path.resolve(__dirname, '../../', process.env.SQLITE_PATH || 'suncity.db');

  console.log(`[sqlite] Database path: ${dbPath}`);
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  // Skip if already seeded (Render restart — ephemeral FS resets between deploys but not restarts)
  const tableExists = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='users'`).get();
  if (tableExists) {
    console.log('[sqlite] Tables exist, skipping import.');
    db.close();
    return;
  }

  db.pragma('foreign_keys = OFF');

  const schema = fs.readFileSync(path.join(sqlDir, 'schema.sqlite.sql'), 'utf8');
  const seed   = fs.readFileSync(path.join(sqlDir, 'seed.sqlite.sql'),   'utf8');

  console.log('[sqlite] Running schema...');
  // Execute each statement separately (better-sqlite3 doesn't support multi-statement)
  for (const stmt of schema.split(';').map(s => s.trim()).filter(Boolean)) {
    try { db.prepare(stmt).run(); } catch (e) {
      if (!e.message.includes('already exists')) console.warn('  ⚠', e.message.slice(0, 80));
    }
  }

  console.log('[sqlite] Running seed...');
  for (const stmt of seed.split(';').map(s => s.trim()).filter(Boolean)) {
    try { db.prepare(stmt).run(); } catch (e) {
      if (!e.message.includes('UNIQUE constraint')) console.warn('  ⚠', e.message.slice(0, 80));
    }
  }

  console.log('[sqlite] Hashing passwords...');
  for (const [email, pwd] of Object.entries(PASSWORDS)) {
    const hash = await bcrypt.hash(pwd, 10);
    db.prepare('UPDATE users SET password_hash = ? WHERE email = ?').run(hash, email);
  }

  db.pragma('foreign_keys = ON');
  db.close();
  console.log('[sqlite] ✓ Database ready');
}

// ── MySQL ─────────────────────────────────────────────────────────────────────
async function runMysql() {
  const mysql = await import('mysql2/promise');
  const conn  = await mysql.default.createConnection({
    host:               process.env.DB_HOST     || 'localhost',
    port:               Number(process.env.DB_PORT) || 3306,
    user:               process.env.DB_USER     || 'root',
    password:           process.env.DB_PASSWORD || process.env.DB_PASS || '',
    multipleStatements: true,
  });

  const schema = fs.readFileSync(path.join(sqlDir, 'schema.sql'), 'utf8');
  const seed   = fs.readFileSync(path.join(sqlDir, 'seed.sql'),   'utf8');

  console.log('[mysql] Running schema...');
  await conn.query(schema);
  console.log('[mysql] Running seed...');
  await conn.query(seed);

  console.log('[mysql] Hashing passwords...');
  for (const [email, pwd] of Object.entries(PASSWORDS)) {
    const hash = await bcrypt.hash(pwd, 10);
    await conn.execute('UPDATE users SET password_hash = ? WHERE email = ?', [hash, email]);
  }

  await conn.end();
  console.log('[mysql] ✓ Database ready');
}

// ── Run ───────────────────────────────────────────────────────────────────────
console.log(`\n🏨  SUN CITY NYAKARAMBI — DB import (driver: ${driver})\n`);

(driver === 'sqlite' ? runSqlite() : runMysql())
  .then(() => {
    console.log('\nDemo logins:');
    console.log('  admin@suncity.rw      / Admin@123');
    console.log('  guest@suncity.rw      / Guest@123');
    console.log('  reception@suncity.rw  / Staff@123\n');
  })
  .catch((err) => {
    console.error('\n✗ Import failed:', err.message);
    process.exit(1);
  });
