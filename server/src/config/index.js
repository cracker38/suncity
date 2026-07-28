import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

export const config = {
  port: Number(process.env.PORT) || 5000,
  env: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'suncity_hotel',
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'dev_access',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev_refresh',
    accessExpires: process.env.JWT_ACCESS_EXPIRES || '15m',
    refreshExpires: process.env.JWT_REFRESH_EXPIRES || '7d',
  },
  paymentMode: process.env.PAYMENT_MODE || 'sandbox',
  mtnMomo: {
    apiKey: process.env.MTN_MOMO_API_KEY || '',
    userId: process.env.MTN_MOMO_USER_ID || '',
    primaryKey: process.env.MTN_MOMO_PRIMARY_KEY || '',
  },
  airtelMoney: {
    apiKey: process.env.AIRTEL_MONEY_API_KEY || '',
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
  },
  openaiKey: process.env.OPENAI_API_KEY || '',
  groqKey: process.env.GROQ_API_KEY || '',
  geminiKey: process.env.GEMINI_API_KEY || '',
  hotel: {
    name: process.env.HOTEL_NAME || 'SUN CITY NYAKARAMBI Ltd',
    phone: process.env.HOTEL_PHONE || '+250780219057',
    phoneAlt: process.env.HOTEL_PHONE_ALT || '+250788525507',
    email: process.env.HOTEL_EMAIL || 'suncitynyakarambi@gmail.com',
    whatsapp: process.env.HOTEL_WHATSAPP || '250780219057',
    website: process.env.HOTEL_WEBSITE || 'https://www.suncity.rw',
    address: process.env.HOTEL_ADDRESS || 'Nyakarambi, Kirehe District, Eastern Province, Rwanda',
  },
};
