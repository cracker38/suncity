import nodemailer from 'nodemailer';
import { config } from '../config/index.js';

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    return null;
  }
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS || '',
    },
  });
  return transporter;
}

/**
 * Best-effort email. Logs to console when SMTP is not configured (dev-friendly).
 */
export async function sendMail({ to, subject, html, text }) {
  if (!to) return { sent: false, reason: 'no_recipient' };
  const tx = getTransporter();
  const from = process.env.SMTP_FROM || config.hotel.email;
  if (!tx) {
    console.log(`[email:dev] To: ${to} | ${subject}`);
    return { sent: false, reason: 'smtp_not_configured', preview: { to, subject } };
  }
  try {
    await tx.sendMail({ from, to, subject, html, text: text || subject });
    return { sent: true };
  } catch (err) {
    console.error('Email send failed:', err.message);
    return { sent: false, reason: err.message };
  }
}

export async function sendBookingConfirmationEmail(booking) {
  const subject = `Booking confirmed — ${booking.booking_code} | ${config.hotel.name}`;
  const html = `
    <div style="font-family:Arial,sans-serif;color:#333">
      <h2 style="color:#114B3A">Reservation confirmed</h2>
      <p>Dear ${booking.guest_name || 'Guest'},</p>
      <p>Thank you for choosing <strong>${config.hotel.name}</strong>.</p>
      <ul>
        <li><strong>Booking code:</strong> ${booking.booking_code}</li>
        <li><strong>Check-in:</strong> ${booking.check_in}</li>
        <li><strong>Check-out:</strong> ${booking.check_out}</li>
        <li><strong>Nights:</strong> ${booking.nights}</li>
        <li><strong>Total:</strong> RWF ${Number(booking.total_amount).toLocaleString()}${booking.discount_amount ? ` (discount RWF ${Number(booking.discount_amount).toLocaleString()})` : ''}</li>
      </ul>
      <p>We look forward to welcoming you in Nyakarambi.</p>
      <p>${config.hotel.phone} · ${config.hotel.email}</p>
    </div>
  `;
  return sendMail({ to: booking.guest_email, subject, html });
}

export async function sendAgentRequestEmail({ staffEmail, code, guestName, message }) {
  return sendMail({
    to: staffEmail,
    subject: `AI agent request ${code}`,
    html: `<p><strong>${guestName}</strong> requested reception assistance.</p><p>${message}</p><p>Reference: ${code}</p>`,
  });
}
