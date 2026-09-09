// Web Push sending helper.
// Reads subscriptions from the push_subscriptions table (see schema.sql)
// and sends a notification to every one of them. Dead subscriptions
// (expired / uninstalled) are cleaned up automatically on send failure.

const webpush = require('web-push');
const { pool } = require('./db');

const hasVapidKeys = process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY;

if (hasVapidKeys) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:it@example.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
} else {
  console.warn('[push] VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY not set — web push is disabled.');
}

// payload: { title, body, url }
async function sendPushToAll(payload) {
  if (!hasVapidKeys) {
    console.log('[push] skipped (no VAPID keys configured):', payload.title);
    return;
  }

  let rows;
  try {
    ({ rows } = await pool.query('SELECT * FROM push_subscriptions'));
  } catch (err) {
    console.error('[push] failed to load subscriptions:', err.message);
    return;
  }

  const json = JSON.stringify(payload);

  await Promise.all(
    rows.map(async (sub) => {
      const subscription = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      };
      try {
        await webpush.sendNotification(subscription, json);
      } catch (err) {
        // 404/410 = the subscription no longer exists on the browser's end
        if (err.statusCode === 404 || err.statusCode === 410) {
          await pool.query('DELETE FROM push_subscriptions WHERE id = $1', [sub.id]);
        } else {
          console.error('[push] send failed for one subscriber:', err.message);
        }
      }
    })
  );
}

module.exports = { sendPushToAll };
