// Email notification helper. Works with any SMTP provider — Gmail (with an
// App Password), or free-tier transactional senders like Brevo or Resend's
// SMTP relay. If SMTP_HOST isn't set, this quietly no-ops (so the app still
// runs fine without email configured).

const nodemailer = require('nodemailer');

const transporter = process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true', // true for port 465, false for 587/25
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    })
  : null;

async function sendEmail(subject, text) {
  if (!transporter) {
    console.log('[email] SMTP not configured, skipping:', subject);
    return;
  }
  const to = process.env.MAIL_TO;
  if (!to) {
    console.log('[email] MAIL_TO not set, skipping:', subject);
    return;
  }

  try {
    await transporter.sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      to,
      subject,
      text,
    });
  } catch (err) {
    console.error('[email] failed to send:', err.message);
  }
}

module.exports = { sendEmail };
