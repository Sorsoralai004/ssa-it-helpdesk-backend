const express = require('express');
const { pool } = require('../db');
const { notifyNewTicket, notifyStatusChange } = require('../notifications');

const router = express.Router();

const VALID_STATUS = ['new', 'progress', 'done', 'cancel'];
const VALID_URGENCY = ['low', 'mid', 'high'];

// GET /api/tickets?status=new  — list tickets, newest first
router.get('/', async (req, res) => {
  const { status } = req.query;
  try {
    const params = [];
    let sql = 'SELECT * FROM tickets';
    if (status) {
      if (!VALID_STATUS.includes(status)) {
        return res.status(400).json({ error: 'invalid status filter' });
      }
      params.push(status);
      sql += ' WHERE status = $1';
    }
    sql += ' ORDER BY created_at DESC';
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed to fetch tickets' });
  }
});

// GET /api/tickets/:id — single ticket + its status history
router.get('/:id', async (req, res) => {
  try {
    const ticketRes = await pool.query('SELECT * FROM tickets WHERE id = $1', [req.params.id]);
    if (ticketRes.rows.length === 0) return res.status(404).json({ error: 'ticket not found' });

    const historyRes = await pool.query(
      'SELECT * FROM ticket_status_history WHERE ticket_id = $1 ORDER BY changed_at ASC',
      [req.params.id]
    );
    res.json({ ...ticketRes.rows[0], history: historyRes.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed to fetch ticket' });
  }
});

// POST /api/tickets — submit a new ticket (no login required)
router.post('/', async (req, res) => {
  const { reporter_name, department, category, urgency, detail } = req.body;

  if (!reporter_name || !department || !category || !detail) {
    return res.status(400).json({ error: 'reporter_name, department, category, and detail are required' });
  }
  if (urgency && !VALID_URGENCY.includes(urgency)) {
    return res.status(400).json({ error: 'invalid urgency' });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO tickets (reporter_name, department, category, urgency, detail)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [reporter_name, department, category, urgency || 'mid', detail]
    );
    const ticket = rows[0];
    await notifyNewTicket(ticket);
    res.status(201).json(ticket);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed to create ticket' });
  }
});

// PATCH /api/tickets/:id/status — move a ticket through the workflow, or cancel/reopen it
router.patch('/:id/status', async (req, res) => {
  const { status } = req.body;
  if (!VALID_STATUS.includes(status)) {
    return res.status(400).json({ error: 'invalid status' });
  }

  try {
    const current = await pool.query('SELECT * FROM tickets WHERE id = $1', [req.params.id]);
    if (current.rows.length === 0) return res.status(404).json({ error: 'ticket not found' });
    const old = current.rows[0];

    // Cancelling remembers the prior status so it can be reopened later;
    // reopening from 'cancel' restores it instead of guessing.
    let nextStatus = status;
    let prevStatus = old.prev_status;
    if (status === 'cancel' && old.status !== 'cancel') {
      prevStatus = old.status;
    } else if (old.status === 'cancel' && status !== 'cancel') {
      nextStatus = old.prev_status || 'new';
      prevStatus = null;
    }

    const { rows } = await pool.query(
      `UPDATE tickets SET status = $1, prev_status = $2 WHERE id = $3 RETURNING *`,
      [nextStatus, prevStatus, req.params.id]
    );
    const ticket = rows[0];
    await notifyStatusChange(ticket, old.status);
    res.json(ticket);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed to update status' });
  }
});

module.exports = router;
