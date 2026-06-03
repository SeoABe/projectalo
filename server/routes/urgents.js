const express = require('express');
const router = express.Router();
const { q, one, all } = require('../db');

router.get('/', async (req, res) => {
  try {
    res.json(await all('SELECT * FROM urgents WHERE is_active=1 ORDER BY id DESC'));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { message, category_id, level } = req.body;
    const r = await one('INSERT INTO urgents (message,category_id,level) VALUES ($1,$2,$3) RETURNING id',
      [message, category_id, level || 'medium']);
    res.json({ success: true, id: r.id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await q('UPDATE urgents SET is_active=0 WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
