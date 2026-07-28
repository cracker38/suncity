import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config/index.js';
import { errorHandler } from './middleware/error.js';

import authRoutes from './routes/auth.js';
import roomRoutes from './routes/rooms.js';
import bookingRoutes from './routes/bookings.js';
import paymentRoutes from './routes/payments.js';
import aiRoutes from './routes/ai.js';
import cmsRoutes from './routes/cms.js';
import restaurantRoutes from './routes/restaurant.js';
import eventRoutes from './routes/events.js';
import cateringRoutes from './routes/catering.js';
import housekeepingRoutes from './routes/housekeeping.js';
import reportRoutes from './routes/reports.js';
import adminRoutes from './routes/admin.js';
import customerRoutes from './routes/customer.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(
  cors({
    origin: config.clientUrl,
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'SUN CITY NYAKARAMBI API running',
    hotel: config.hotel.name,
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/cms', cmsRoutes);
app.use('/api/restaurant', restaurantRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/catering', cateringRoutes);
app.use('/api/housekeeping', housekeepingRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/customer', customerRoutes);

app.use(errorHandler);

const server = app.listen(config.port, () => {
  console.log(`SUN CITY API listening on http://localhost:${config.port}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(
      `Port ${config.port} is already in use. Stop the other process, then restart:\n` +
        `  netstat -ano | findstr :${config.port}\n` +
        `  taskkill /PID <pid> /F\n` +
        `  npm run dev -w server`
    );
    process.exit(1);
  }
  throw err;
});
