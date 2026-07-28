import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlDir = path.resolve(__dirname, '../../sql');

async function run() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  });

  const schema = fs.readFileSync(path.join(sqlDir, 'schema.sql'), 'utf8');
  const seed = fs.readFileSync(path.join(sqlDir, 'seed.sql'), 'utf8');

  console.log('Importing schema...');
  await conn.query(schema);
  console.log('Importing seed...');
  await conn.query(seed);

  const passwords = {
    'admin@suncity.rw': 'Admin@123',
    'reception@suncity.rw': 'Staff@123',
    'restaurant@suncity.rw': 'Staff@123',
    'events@suncity.rw': 'Staff@123',
    'ops@suncity.rw': 'Staff@123',
    'finance@suncity.rw': 'Staff@123',
    'guest@suncity.rw': 'Guest@123',
  };

  for (const [email, pwd] of Object.entries(passwords)) {
    const hash = await bcrypt.hash(pwd, 10);
    await conn.execute('UPDATE users SET password_hash = ? WHERE email = ?', [hash, email]);
  }

  console.log('Database imported successfully.');
  console.log('Demo logins:');
  console.log('  admin@suncity.rw / Admin@123');
  console.log('  guest@suncity.rw / Guest@123');
  console.log('  reception@suncity.rw / Staff@123');
  await conn.end();
}

run().catch((err) => {
  console.error('DB import failed:', err.message);
  process.exit(1);
});
