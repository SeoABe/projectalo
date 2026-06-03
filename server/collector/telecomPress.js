const axios = require('axios');
const { searchNaverNews } = require('./naverNews');

/**
 * KT 공식 보도자료를 수집합니다.
 */
async function scrapeKtPress() {
  const results = [];
  try {
    const ktResults = await searchNaverNews('"KT" "보도자료"', 10, [], ['경제', 'IT/과학']);
    ktResults.forEach(item => {
      item.source = 'KT (News)';
      results.push(item);
    });
  } catch (err) {
    console.error('[TelecomPress] KT search error:', err.message);
  }
  return results;
}

/**
 * 경쟁사(SKT, LGU+)의 공식 보도자료를 수집합니다.
 */
async function scrapeCompetitorPress() {
  const allResults = [];

  // 1. SKT (WordPress API)
  try {
    const res = await axios.get('https://news.sktelecom.com/wp-json/wp/v2/posts?categories=17461&per_page=10', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 10000
    });
    if (Array.isArray(res.data)) {
      res.data.forEach(post => {
        allResults.push({
          title: post.title.rendered.replace(/&#[0-9]+;/g, '').replace(/&nbsp;/g, ' '),
          description: post.excerpt.rendered.replace(/<[^>]*>/g, '').trim().slice(0, 200),
          source: 'SKT',
          date: post.date.split('T')[0].replace(/-/g, '.'),
          url: post.link
        });
      });
    }
  } catch (err) {
    console.error('[TelecomPress] SKT API error:', err.message);
  }

  // 2. LG U+
  try {
    const lguResults = await searchNaverNews('"LG유플러스" "보도자료"', 10, [], ['경제', 'IT/과학']);
    lguResults.forEach(item => {
      item.source = 'LGU+ (News)';
      allResults.push(item);
    });
  } catch (err) {
    console.error('[TelecomPress] LGU+ search error:', err.message);
  }

  return allResults;
}

module.exports = { scrapeKtPress, scrapeCompetitorPress };
