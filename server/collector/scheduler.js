// 수집 오케스트레이터 (Vercel Cron이 /api/collect/run 을 호출)
// node-cron(상시 프로세스)은 서버리스에서 동작하지 않으므로 제거됨.
const { searchNaverNews } = require('./naverNews');
const { scrapeJoongangPress } = require('./joongangPress');
const { scrapeKtPress, scrapeCompetitorPress } = require('./telecomPress');
const { fetchRssFeed } = require('./rssFeed');
const { deduplicateItems, groupItemsToCards } = require('./classifier');
const { getSettings } = require('./settings');
const { q, one, all } = require('../db');

let isRunning = false;

// onlyCategory 가 주어지면 해당 카테고리만 수집(서버리스 타임아웃 회피용)
async function runCollection(onlyCategory = null) {
  if (isRunning) {
    console.log('[Scheduler] Collection already running, skipping.');
    return { status: 'skipped', reason: 'already running' };
  }

  isRunning = true;
  let totalItems = 0;
  const errors = [];

  console.log('[Collector] Starting data collection...', onlyCategory ? `(category=${onlyCategory})` : '');

  try {
    const { KEYWORDS, IMPACT_RULES } = await getSettings();
    const entries = Object.entries(KEYWORDS).filter(([catId]) => !onlyCategory || catId === onlyCategory);

    for (const [categoryId, config] of entries) {
      try {
        let allItems = [];

        // 1. 메인 데이터 소스 수집
        if (categoryId === 'joongang') {
          const pressResults = await scrapeJoongangPress();
          if (config.searchTerms && config.searchTerms.length > 0) {
            allItems = allItems.concat(pressResults.filter(item =>
              config.searchTerms.some(term => item.title.includes(term) || item.description.includes(term))
            ));
          } else {
            allItems = allItems.concat(pressResults);
          }
        } else if (categoryId === 'kt') {
          allItems = allItems.concat(await scrapeKtPress());
          for (const term of config.searchTerms) {
            allItems = allItems.concat(await searchNaverNews(term, 5, config.excludeTerms, config.categories));
            await sleep(300);
          }
        } else if (categoryId === 'competitor') {
          allItems = allItems.concat(await scrapeCompetitorPress());
          for (const term of config.searchTerms) {
            allItems = allItems.concat(await searchNaverNews(term, 5, config.excludeTerms, config.categories));
            await sleep(300);
          }
        } else {
          for (const term of config.searchTerms) {
            allItems = allItems.concat(await searchNaverNews(term, 5, config.excludeTerms, config.categories));
            await sleep(300);
          }
        }

        // 2. RSS 피드 수집
        for (const feedUrl of (config.rssFeeds || [])) {
          allItems = allItems.concat(await fetchRssFeed(feedUrl));
        }

        // 3. 중복 제거
        allItems = deduplicateItems(allItems);
        if (allItems.length === 0) {
          console.log(`[Collector] No items for ${categoryId}`);
          continue;
        }

        // 4. 카드로 그룹핑
        const cards = groupItemsToCards(allItems, categoryId, IMPACT_RULES);

        // 5. DB에 저장
        for (const card of cards) {
          await q(
            `INSERT INTO cards (id,title,icon,badge_text,badge_color,date_range,category_id)
             VALUES ($1,$2,$3,$4,$5,$6,$7)
             ON CONFLICT (id) DO UPDATE SET
               title=EXCLUDED.title, icon=EXCLUDED.icon, badge_text=EXCLUDED.badge_text,
               badge_color=EXCLUDED.badge_color, date_range=EXCLUDED.date_range, category_id=EXCLUDED.category_id`,
            [card.id, card.title, card.icon, card.badge_text, card.badge_color, card.date_range, card.category_id]
          );
          // 기존 아이템/태그 삭제 후 재삽입
          await q('DELETE FROM card_items WHERE card_id=$1', [card.id]);
          await q('DELETE FROM card_tags WHERE card_id=$1', [card.id]);

          for (const item of card.items) {
            await q(
              `INSERT INTO card_items (card_id,title,impact,impact_color,description,source,date,source_url)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
              [card.id, item.title, item.impact, item.impactColor, item.description, item.source, item.date, item.url || null]
            );
            totalItems++;
          }
          for (const t of (card.tags || [])) {
            await q('INSERT INTO card_tags (card_id,tag) VALUES ($1,$2)', [card.id, t]);
          }
        }

        console.log(`[Collector] ${categoryId}: ${allItems.length} items → ${cards.length} cards`);
      } catch (err) {
        console.error(`[Collector] Error for ${categoryId}:`, err.message);
        errors.push(`${categoryId}: ${err.message}`);
      }
    }

    // 수집 로그 기록
    await q('INSERT INTO collection_logs (status, items_collected, errors) VALUES ($1,$2,$3)',
      [errors.length > 0 ? 'partial' : 'success', totalItems, errors.join('; ') || null]);
  } finally {
    isRunning = false;
  }

  console.log(`[Collector] Done. Total items: ${totalItems}, Errors: ${errors.length}`);
  return { status: 'done', totalItems, errors };
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getCollectionLogs(limit = 20) {
  return all('SELECT * FROM collection_logs ORDER BY id DESC LIMIT $1', [limit]);
}

async function getLastStatus() {
  return (await one('SELECT * FROM collection_logs ORDER BY id DESC LIMIT 1')) || { status: 'never' };
}

module.exports = { runCollection, getCollectionLogs, getLastStatus };
