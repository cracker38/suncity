import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const driver = process.env.DB_DRIVER || 'mysql';
if (driver !== 'sqlite') process.exit(0);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.isAbsolute(process.env.SQLITE_PATH || '')
  ? process.env.SQLITE_PATH
  : path.resolve(__dirname, '../../', process.env.SQLITE_PATH || 'suncity.db');

const { default: Database } = await import('better-sqlite3');
const db = new Database(dbPath);

const tableExists = db
  .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='users'`)
  .get();

db.close();

if (tableExists) {
  console.log('[seed] SQLite tables exist, skipping import.');
  process.exit(0);
}

console.log('[seed] Tables missing — running importDb...');
const { execSync } = await import('child_process');
execSync('node src/scripts/importDb.js', {
  cwd: path.resolve(__dirname, '../../'),
  stdio: 'inherit',
  env: process.env,
});
