const express = require('express');
const router = express.Router();
const { q, one, all } = require('../db');
const { getSettings, saveSettings } = require('../collector/settings');

// ─── GET /api/admin/keywords ──────────────────────────────────────────────────
router.get('/keywords', async (req, res) => {
  try {
    const { KEYWORDS, IMPACT_RULES } = await getSettings();
    res.json({ keywords: KEYWORDS, impactRules: IMPACT_RULES });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PUT /api/admin/keywords ──────────────────────────────────────────────────
router.put('/keywords', async (req, res) => {
  try {
    const { keywords, impactRules } = req.body;
    await saveSettings(keywords, impactRules);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/admin/stats ─────────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const cards     = (await one('SELECT COUNT(*) as c FROM cards')).c;
    const items     = (await one('SELECT COUNT(*) as c FROM card_items')).c;
    const profiles  = (await one('SELECT COUNT(*) as c FROM profiles')).c;
    const urgents   = (await one('SELECT COUNT(*) as c FROM urgents WHERE is_active=1')).c;
    const lastLog   = await one('SELECT * FROM collection_logs ORDER BY id DESC LIMIT 1');
    const totalLogs = (await one('SELECT COUNT(*) as c FROM collection_logs')).c;
    res.json({ cards, items, profiles, urgents, lastLog, totalLogs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/admin/logs ──────────────────────────────────────────────────────
router.get('/logs', async (req, res) => {
  try {
    res.json(await all('SELECT * FROM collection_logs ORDER BY id DESC LIMIT 50'));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/admin/cards ─────────────────────────────────────────────────────
router.get('/cards', async (req, res) => {
  try {
    const cat = req.query.category;
    const rows = cat
      ? await all('SELECT * FROM cards WHERE category_id=$1 ORDER BY created_at DESC', [cat])
      : await all('SELECT * FROM cards ORDER BY category_id, created_at DESC');

    // N+1 제거: items/tags 각각 1회 조회 후 그룹핑
    let itemsByCard = {}, tagsByCard = {};
    if (rows.length) {
      const ids = rows.map(c => c.id);
      (await all('SELECT * FROM card_items WHERE card_id = ANY($1) ORDER BY id', [ids]))
        .forEach(i => { (itemsByCard[i.card_id] = itemsByCard[i.card_id] || []).push(i); });
      (await all('SELECT card_id, tag FROM card_tags WHERE card_id = ANY($1)', [ids]))
        .forEach(t => { (tagsByCard[t.card_id] = tagsByCard[t.card_id] || []).push(t.tag); });
    }
    const result = rows.map(c => ({ ...c, items: itemsByCard[c.id] || [], tags: tagsByCard[c.id] || [] }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE /api/admin/cards/:id ─────────────────────────────────────────────
router.delete('/cards/:id', async (req, res) => {
  try {
    await q('DELETE FROM card_tags WHERE card_id=$1', [req.params.id]);
    await q('DELETE FROM card_items WHERE card_id=$1', [req.params.id]);
    await q('DELETE FROM cards WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/admin/urgents ───────────────────────────────────────────────────
router.get('/urgents', async (req, res) => {
  try {
    res.json(await all('SELECT * FROM urgents ORDER BY id DESC'));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/admin/urgents ──────────────────────────────────────────────────
router.post('/urgents', async (req, res) => {
  try {
    const { message, category_id, level } = req.body;
    const r = await one('INSERT INTO urgents (message, category_id, level) VALUES ($1,$2,$3) RETURNING id',
      [message, category_id, level || 'medium']);
    res.json({ success: true, id: r.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PUT /api/admin/urgents/:id ───────────────────────────────────────────────
router.put('/urgents/:id', async (req, res) => {
  try {
    const { message, category_id, level, is_active } = req.body;
    await q('UPDATE urgents SET message=$1, category_id=$2, level=$3, is_active=$4 WHERE id=$5',
      [message, category_id, level, is_active, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE /api/admin/urgents/:id ───────────────────────────────────────────
router.delete('/urgents/:id', async (req, res) => {
  try {
    await q('DELETE FROM urgents WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/admin/profiles ──────────────────────────────────────────────────
router.get('/profiles', async (req, res) => {
  try {
    res.json(await all('SELECT * FROM profiles ORDER BY category_id, id'));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE /api/admin/profiles/:id ──────────────────────────────────────────
router.delete('/profiles/:id', async (req, res) => {
  try {
    await q('DELETE FROM profiles WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
