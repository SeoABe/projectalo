const axios = require('axios');
const cheerio = require('cheerio');

async function fetchRssFeed(feedUrl) {
  try {
    const res = await axios.get(feedUrl, { timeout: 10000 });
    const $ = cheerio.load(res.data, { xmlMode: true });
    const items = [];

    $('item').each((i, el) => {
      if (i >= 20) return false; // 최대 20개
      const title = $(el).find('title').text().trim();
      const desc = $(el).find('description').text().trim().replace(/<[^>]*>/g, '').slice(0, 200);
      const link = $(el).find('link').text().trim();
      const pubDate = $(el).find('pubDate').text().trim();

      if (title) {
        items.push({
          title,
          description: desc,
          source: extractSourceFromUrl(link),
          date: formatRssDate(pubDate),
          url: link
        });
      }
    });

    return items;
  } catch (err) {
    console.error(`[RSS] Fetch error for ${feedUrl}:`, err.message);
    return [];
  }
}

function extractSourceFromUrl(url) {
  try {
    return new URL(url).hostname.replace('www.', '').replace('.co.kr', '').replace('.com', '');
  } catch { return '뉴스'; }
}

function formatRssDate(dateStr) {
  if (!dateStr) return new Date().toISOString().slice(0, 10).replace(/-/g, '.');
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
}

module.exports = { fetchRssFeed };
