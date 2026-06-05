const express = require('express');
const router = express.Router();
const { q, one, all } = require('../db');

// GET /api/cards
router.get('/', async (req, res) => {
  try {
    const cat = req.query.category;
    const cards = cat ? await all('SELECT * FROM cards WHERE category_id=$1', [cat])
                      : await all('SELECT * FROM cards');
    let itemsByCard = {}, tagsByCard = {};
    if (cards.length) {
      const ids = cards.map(c => c.id);
      (await all('SELECT * FROM card_items WHERE card_id = ANY($1) ORDER BY id', [ids]))
        .forEach(i => { (itemsByCard[i.card_id] = itemsByCard[i.card_id] || []).push(i); });
      (await all('SELECT card_id, tag FROM card_tags WHERE card_id = ANY($1)', [ids]))
        .forEach(t => { (tagsByCard[t.card_id] = tagsByCard[t.card_id] || []).push(t.tag); });
    }
    const result = cards.map(c => ({ ...c, items: itemsByCard[c.id] || [], tags: tagsByCard[c.id] || [] }));
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/cards
router.post('/', async (req, res) => {
  try {
    const { id, title, icon, badge_text, badge_color, date_range, category_id, items, tags } = req.body;
    const cardId = id || `card-${Date.now()}`;
    await q('INSERT INTO cards (id,title,icon,badge_text,badge_color,date_range,category_id) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [cardId, title, icon || 'file-text', badge_text, badge_color, date_range, category_id]);
    if (items) for (const i of items) {
      await q('INSERT INTO card_items (card_id,title,impact,impact_color,description,source,date) VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [cardId, i.title, i.impact, i.impactColor, i.description, i.source, i.date]);
    }
    if (tags) for (const t of tags) await q('INSERT INTO card_tags (card_id,tag) VALUES ($1,$2)', [cardId, t]);
    res.json({ success: true, id: cardId });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/cards/:id
router.put('/:id', async (req, res) => {
  try {
    const { title, icon, badge_text, badge_color, date_range } = req.body;
    await q('UPDATE cards SET title=$1,icon=$2,badge_text=$3,badge_color=$4,date_range=$5 WHERE id=$6',
      [title, icon, badge_text, badge_color, date_range, req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/cards/:id
router.delete('/:id', async (req, res) => {
  try {
    await q('DELETE FROM card_tags WHERE card_id=$1', [req.params.id]);
    await q('DELETE FROM card_items WHERE card_id=$1', [req.params.id]);
    await q('DELETE FROM cards WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/cards/:id/items
router.post('/:id/items', async (req, res) => {
  try {
    const { title, impact, impactColor, description, source, date } = req.body;
    const r = await one(`INSERT INTO card_items (card_id,title,impact,impact_color,description,source,date)
      VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [req.params.id, title, impact, impactColor, description, source, date]);
    res.json({ success: true, id: r.id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
