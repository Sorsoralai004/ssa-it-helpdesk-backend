const express = require('express');
const { verifyWebhookSignature } = require('../line');
const { requireAuth } = require('../auth');

const router = express.Router();

// This router is mounted before express.json() so the webhook can verify
// LINE's signature against the exact raw request body.
router.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.get('x-line-signature');
  if (!verifyWebhookSignature(req.body, signature)) {
    return res.status(401).send('invalid signature');
  }

  try {
    const payload = JSON.parse(req.body.toString('utf8'));
    for (const event of payload.events || []) {
      const source = event.source || {};
      if (source.type === 'user' && source.userId) {
        console.log(`[line] user ID discovered: ${source.userId}`);
      }
    }
  } catch (err) {
    console.error('[line] webhook parse error:', err);
  }

  res.status(200).send('OK');
});

// IT-only diagnostic endpoint. It returns configuration status but never
// exposes the Channel Access Token or Channel Secret.
router.get('/status', requireAuth, (req, res) => {
  res.json({
    accessTokenConfigured: Boolean(process.env.LINE_CHANNEL_ACCESS_TOKEN),
    channelSecretConfigured: Boolean(process.env.LINE_CHANNEL_SECRET),
    itUserIdConfigured: Boolean(process.env.LINE_IT_USER_ID),
  });
});

module.exports = router;
