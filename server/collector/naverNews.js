const axios = require('axios');

async function searchNaverNews(query, display = 10, excludeTerms = [], categories = []) {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;

  if (!clientId || clientId === 'your_client_id_here') {
    console.log('[Naver] API key not configured, skipping.');
    return [];
  }

  // 검색 쿼리에 제외 키워드 반영 (네이버 API: -키워드)
  let finalQuery = query;
  if (excludeTerms && excludeTerms.length > 0) {
    finalQuery += ' ' + excludeTerms.map(t => '-' + t).join(' ');
  }

  try {
    const res = await axios.get('https://openapi.naver.com/v1/search/news.json', {
      params: { query: finalQuery, display, sort: 'date' },
      headers: {
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret
      }
    });

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));

    let items = (res.data.items || []).map(item => ({
      title: item.title.replace(/<[^>]*>/g, ''),
      description: item.description.replace(/<[^>]*>/g, ''),
      source: extractSource(item.originallink || item.link),
      date: formatDate(item.pubDate),
      pubDate: new Date(item.pubDate), // 원본 날짜 저장 (필터용)
      url: item.link
    }));

    // 최신성 필터링 (최근 7일 이내 기사만 유지)
    items = items.filter(item => item.pubDate >= sevenDaysAgo);

    // 내부 저장용 포맷으로 변환 (pubDate 필드 제거)
    items = items.map(({ pubDate, ...rest }) => rest);

    // 카테고리 필터링 (명시된 카테고리 키워드가 기사 제목이나 내용에 포함된 경우만 통과)
    if (categories && categories.length > 0) {
      items = items.filter(item => {
        return categories.some(cat => {
          // "IT/과학", "생활/문화" 같은 카테고리는 '/' 기준으로 분리해서 하나라도 포함되면 통과
          const subCats = cat.split('/');
          return subCats.some(sub => 
            item.title.includes(sub) || item.description.includes(sub)
          );
        });
      });
    }

    return items;
  } catch (err) {
    console.error(`[Naver] Search error for "${query}":`, err.message);
    return [];
  }
}

function extractSource(url) {
  try {
    const host = new URL(url).hostname.replace('www.', '');
    const sourceMap = {
      'etnews.com': '전자신문', 'mk.co.kr': '매일경제',
      'hankyung.com': '한국경제', 'chosun.com': '조선일보',
      'joongang.co.kr': '중앙일보', 'donga.com': '동아일보',
      'sedaily.com': '서울경제', 'dt.co.kr': '디지털타임스',
      'ddaily.co.kr': '디지털데일리', 'zdnet.co.kr': 'ZDNet'
    };
    return sourceMap[host] || host;
  } catch { return '뉴스'; }
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
}

module.exports = { searchNaverNews };
