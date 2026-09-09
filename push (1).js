const express = require('express');
const { pool } = require('../db');

const router = express.Router();

// GET /api/push/vapid-public-key — the browser needs this to subscribe
router.get('/vapid-public-key', (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || '' });
});

// POST /api/push/subscribe — save (or refresh) a browser's push subscription
router.post('/subscribe', async (req, res) => {
  const sub = req.body;
  if (!sub || !sub.endpoint || !sub.keys || !sub.keys.p256dh || !sub.keys.auth) {
    return res.status(400).json({ error: 'invalid subscription payload' });
  }

  try {
    await pool.query(
      `INSERT INTO push_subscriptions (endpoint, p256dh, auth)
       VALUES ($1, $2, $3)
       ON CONFLICT (endpoint) DO UPDATE SET p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth`,
      [sub.endpoint, sub.keys.p256dh, sub.keys.auth]
    );
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed to save subscription' });
  }
});

// POST /api/push/unsubscribe — remove a subscription (e.g. user turns notifications off)
router.post('/unsubscribe', async (req, res) => {
  const { endpoint } = req.body;
  if (!endpoint) return res.status(400).json({ error: 'endpoint required' });

  try {
    await pool.query('DELETE FROM push_subscriptions WHERE endpoint = $1', [endpoint]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed to remove subscription' });
  }
});

module.exports = router;
