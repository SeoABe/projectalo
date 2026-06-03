const express = require('express');
const router = express.Router();
const { one, all } = require('../db');

// GET /api/dashboard - 프론트엔드 호환 형태로 전체 데이터 반환
router.get('/', async (req, res) => {
  try {
    const categoryFilter = req.query.category;

    // Meta
    const lastLog = await one('SELECT run_at FROM collection_logs ORDER BY id DESC LIMIT 1');
    const meta = {
      title: "GIT DASHBOARD",
      week: "WK17",
      date: new Date().toISOString().slice(0, 10).replace(/-/g, '.'),
      prevWeek: "WK16",
      updatedAt: lastLog ? lastLog.run_at : new Date().toLocaleString('ko-KR')
    };

    // Categories
    const categories = (await all('SELECT * FROM categories ORDER BY sort_order'))
      .map(c => ({ id: c.id, label: c.label, icon: c.icon, badge: c.badge }));

    // Urgents
    let urgentRows;
    if (categoryFilter && categoryFilter !== 'all') {
      urgentRows = await all('SELECT * FROM urgents WHERE is_active=1 AND category_id=$1', [categoryFilter]);
    } else {
      urgentRows = await all('SELECT * FROM urgents WHERE is_active=1');
    }
    const urgents = urgentRows.map(u => ({
      id: 'urg-' + u.id, message: u.message,
      category: u.category_id, level: u.level
    }));

    // Summaries
    const summaryRows = await all('SELECT * FROM summaries ORDER BY id');
    const summary = {};
    summaryRows.forEach(s => {
      summary[s.category_id] = {
        source: s.source, color: s.color,
        content: s.content, highlight: s.highlight
      };
    });

    // Cards
    const catIds = categoryFilter && categoryFilter !== 'all'
      ? [categoryFilter]
      : ['kt', 'joongang', 'hanhwa'];

    const cards = {};
    for (const catId of catIds) {
      const cardRows = await all('SELECT * FROM cards WHERE category_id=$1 ORDER BY created_at DESC', [catId]);
      cards[catId] = [];
      for (const card of cardRows) {
        const items = await all('SELECT * FROM card_items WHERE card_id=$1 ORDER BY id', [card.id]);
        const tags = (await all('SELECT tag FROM card_tags WHERE card_id=$1', [card.id])).map(t => t.tag);
        cards[catId].push({
          id: card.id, title: card.title, icon: card.icon,
          badge: card.badge_text ? { text: card.badge_text, color: card.badge_color } : null,
          dateRange: card.date_range, category: card.category_id, tags,
          items: items.map(i => ({
            title: i.title, impact: i.impact, impactColor: i.impact_color,
            description: i.description, source: i.source, date: i.date, url: i.source_url
          }))
        });
      }
    }

    // Profiles
    const profiles = {};
    for (const catId of catIds) {
      profiles[catId] = (await all('SELECT * FROM profiles WHERE category_id=$1', [catId]))
        .map(p => ({
          name: p.name, position: p.position, org: p.org,
          badge: { text: p.badge_text, color: p.badge_color },
          desc: p.description, icon: 'user'
        }));
    }

    // Filter options
    const filterOptions = {
      impactTypes: [
        { value: 'all', label: '전체' },
        ...(await getDistinctImpacts())
      ],
      dateRange: [
        { value: 'all', label: '전체 기간' },
        { value: 'today', label: '오늘' },
        { value: 'week', label: '이번 주' },
        { value: 'month', label: '이번 달' }
      ]
    };

    res.json({ meta, categories, urgent: urgents, summary, cards, profiles, filterOptions });
  } catch (err) {
    console.error('[API] Dashboard error:', err);
    res.status(500).json({ error: err.message });
  }
});

async function getDistinctImpacts() {
  const impacts = await all('SELECT DISTINCT impact FROM card_items WHERE impact IS NOT NULL ORDER BY impact');
  const labelMap = {
    'MARKET IMPACT': '시장영향', 'TECH TREND': '기술트렌드', 'STRATEGY': '전략',
    'REGULATION': '규제', 'DEAL': '딜', 'INVESTMENT': '투자',
    'ORG CHANGE': '조직변화', 'CONTENT': '콘텐츠', 'GROWTH': '성장',
    'INNOVATION': '혁신', 'PERSONNEL': '인사', 'SERVICE': '서비스',
    'NEW LAUNCH': '신규론칭', 'EXPANSION': '확장', 'OPPORTUNITY': '기회',
    'GOVERNANCE': '거버넌스'
  };
  return impacts.map(i => ({ value: i.impact, label: labelMap[i.impact] || i.impact }));
}

module.exports = router;
