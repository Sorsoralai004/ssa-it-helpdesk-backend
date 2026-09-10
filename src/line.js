const crypto = require('crypto');

const LINE_PUSH_URL = 'https://api.line.me/v2/bot/message/push';

function isConfigured() {
  return Boolean(process.env.LINE_CHANNEL_ACCESS_TOKEN && process.env.LINE_IT_USER_ID);
}

async function sendLineToIT(text) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const to = process.env.LINE_IT_USER_ID;

  if (!token || !to) {
    console.log('[line] skipped: LINE_CHANNEL_ACCESS_TOKEN or LINE_IT_USER_ID is not configured');
    return { skipped: true };
  }

  const response = await fetch(LINE_PUSH_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to,
      messages: [{ type: 'text', text }],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`LINE push failed (${response.status}): ${detail}`);
  }

  return { sent: true };
}

function verifyWebhookSignature(rawBody, signature) {
  const secret = process.env.LINE_CHANNEL_SECRET;
  if (!secret || !signature) return false;

  const digest = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('base64');

  const a = Buffer.from(digest);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

module.exports = { sendLineToIT, verifyWebhookSignature, isConfigured };
