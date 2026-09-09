const express = require('express');
const { pool } = require('../db');

const router = express.Router();

// GET /api/overview — counts for the "ภาพรวม" charts (status / category / department)
router.get('/', async (req, res) => {
  try {
    const [byStatus, byCategory, byDept, total] = await Promise.all([
      pool.query('SELECT status, COUNT(*)::int AS count FROM tickets GROUP BY status'),
      pool.query('SELECT category, COUNT(*)::int AS count FROM tickets GROUP BY category ORDER BY count DESC'),
      pool.query('SELECT department, COUNT(*)::int AS count FROM tickets GROUP BY department ORDER BY count DESC'),
      pool.query('SELECT COUNT(*)::int AS count FROM tickets'),
    ]);

    res.json({
      total: total.rows[0].count,
      by_status: byStatus.rows,
      by_category: byCategory.rows,
      by_department: byDept.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed to fetch overview' });
  }
});

module.exports = router;
