const express = require('express');
const router = express.Router();
const { q, one, all } = require('../db');

router.get('/', async (req, res) => {
  try {
    const cat = req.query.category;
    const rows = cat ? await all('SELECT * FROM profiles WHERE category_id=$1', [cat])
                     : await all('SELECT * FROM profiles');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { name, position, org, badge_text, badge_color, description, category_id } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'name은 필수입니다.' });
    }
    const r = await one(`INSERT INTO profiles (name,position,org,badge_text,badge_color,description,category_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [name, position, org, badge_text, badge_color, description, category_id]);
    res.json({ success: true, id: r.id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await q('DELETE FROM profiles WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
