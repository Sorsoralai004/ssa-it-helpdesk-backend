require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');

const ticketsRouter = require('./routes/tickets');
const overviewRouter = require('./routes/overview');
const pushRouter = require('./routes/push');
const authRouter = require('./routes/auth');
const lineRouter = require('./routes/line');

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') || '*' }));
// LINE webhook must be mounted before express.json() so its raw body can be
// used for x-line-signature verification.
app.use('/api/line', lineRouter);
app.use(express.json());

// Serves it-helpdesk.html, sw.js (service worker) and push-client.js.
// sw.js must be served from the site root so its push scope covers the
// whole origin — that's why it lives in /public, not under /api.
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRouter);
app.use('/api/tickets', ticketsRouter);
app.use('/api/overview', overviewRouter);
app.use('/api/push', pushRouter);

app.use((req, res) => res.status(404).json({ error: 'not found' }));

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`IT Helpdesk API listening on port ${port}`));
