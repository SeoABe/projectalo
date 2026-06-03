const axios = require('axios');

async function scrapeJoongangPress() {
  const allContent = [];
  try {
    for (let p = 1; p <= 3; p++) {
      const res = await axios.post('https://joonganggroup.com/api/press/list', {
        page: p,
        size: 50
      }, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Content-Type': 'application/json'
        }
      });

      if (res.data && res.data.body && res.data.body.content) {
        allContent.push(...res.data.body.content);
      }
    }

    if (allContent.length > 0) {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));

      return allContent
        .filter(item => new Date(item.vwDate) >= sevenDaysAgo)
        .map(item => ({
          title: item.title,
          description: item.title,
          source: item.comNm || '중앙그룹',
          date: item.vwDate.replace(/-/g, '.'),
          url: `https://joonganggroup.com/newsroom/press/${item.pno}`
        }));
    }
    return [];
  } catch (err) {
    console.error(`[JoongangPress] Fetch error:`, err.message);
    return [];
  }
}

module.exports = { scrapeJoongangPress };
