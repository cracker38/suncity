/**
 * db.js — unified database adapter
 *
 * DB_DRIVER=mysql  → mysql2/promise pool  (local XAMPP)
 * DB_DRIVER=sqlite → better-sqlite3       (Render / production)
 *
 * Exports:
 *   pool.execute(sql, params)  → Promise<[rows]>
 *   pool.query(sql, params)    → Promise<[rows]>
 *   pool.getConnection()       → Promise<conn>
 *   withTransaction(fn)        → Promise<result>
 */

import { config } from './index.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─────────────────────────────────────────────────────────────────────────────
// SQLite wrapper — wraps better-sqlite3 sync API in async promises
// ─────────────────────────────────────────────────────────────────────────────
function buildSqlitePool(db) {
  function normalise(params = []) {
    return params.map((p) => {
      if (p instanceof Date) return p.toISOString().slice(0, 19).replace('T', ' ');
      if (p === undefined) return null;
      return p;
    });
  }

  function execute(sql, params = []) {
    try {
      const args = normalise(params);
      const upper = sql.trim().toUpperCase();
      if (upper.startsWith('SELECT') || upper.startsWith('WITH') || upper.startsWith('PRAGMA')) {
        const rows = db.prepare(sql).all(...args);
        return Promise.resolve([rows]);
      }
      const info = db.prepare(sql).run(...args);
      return Promise.resolve([{ insertId: info.lastInsertRowid, affectedRows: info.changes }]);
    } catch (err) {
      return Promise.reject(err);
    }
  }

  function getConnection() {
    const conn = {
      execute,
      query: execute,
      beginTransaction: () => { db.prepare('BEGIN').run(); return Promise.resolve(); },
      commit:           () => { db.prepare('COMMIT').run(); return Promise.resolve(); },
      rollback:         () => { try { db.prepare('ROLLBACK').run(); } catch {} return Promise.resolve(); },
      release:          () => {},
    };
    return Promise.resolve(conn);
  }

  return { execute, query: execute, getConnection };
}

// ─────────────────────────────────────────────────────────────────────────────
// Initialise — called once at startup
// ─────────────────────────────────────────────────────────────────────────────
let _pool = null;

async function init() {
  if (config.db.driver === 'sqlite') {
    const { default: Database } = await import('better-sqlite3');
    const dbPath = path.isAbsolute(config.db.sqlitePath)
      ? config.db.sqlitePath
      : path.resolve(__dirname, '../../', config.db.sqlitePath);

    const db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    _pool = buildSqlitePool(db);
    console.log(`[db] SQLite connected → ${dbPath}`);
  } else {
    const mysql = await import('mysql2/promise');
    _pool = mysql.default.createPool({
      host:             config.db.host,
      port:             config.db.port,
      user:             config.db.user,
      password:         config.db.password,
      database:         config.db.database,
      waitForConnections: true,
      connectionLimit:  10,
      dateStrings:      true,
    });
    console.log(`[db] MySQL connected → ${config.db.host}:${config.db.port}/${config.db.database}`);
  }
  return _pool;
}

// Start initialisation immediately (non-blocking)
const _ready = init().catch((err) => {
  console.error('[db] Connection failed:', err.message);
  process.exit(1);
});

async function getPool() {
  await _ready;
  return _pool;
}

// ─────────────────────────────────────────────────────────────────────────────
// Lazy proxy — routes call pool.execute() without awaiting init themselves
// ─────────────────────────────────────────────────────────────────────────────
export const pool = new Proxy({}, {
  get(_, method) {
    return async (...args) => {
      const p = await getPool();
      return p[method](...args);
    };
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// withTransaction
// ─────────────────────────────────────────────────────────────────────────────
export async function withTransaction(fn) {
  const p = await getPool();
  const conn = await p.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
