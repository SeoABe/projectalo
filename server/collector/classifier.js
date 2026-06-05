function classifyImpact(title, description, impactRules = []) {
  const text = (title + ' ' + description).toLowerCase();
  for (const rule of impactRules) {
    if (rule.keywords.some(kw => text.includes(kw.toLowerCase()))) {
      return { impact: rule.impact, impactColor: rule.color };
    }
  }
  return { impact: 'NEWS', impactColor: '#64748b' };
}

// 노이즈 기사 제거 (스포츠/증시 등) — Naver 부정검색(-야구)은 최신결과를 통째로 날리므로
// 쿼리에 쓰지 않고 수집 후 제목/본문 기준으로 거른다.
const NOISE_TERMS = [
  // 스포츠 (KT 소닉붐, SK 나이츠, 한화 이글스, KT 위즈 등 모기업 스포츠단 노이즈)
  '야구', 'KBL', '농구', '프로농구', '축구', '배구', '구단', '이글스', '위즈', '소닉붐', '나이츠',
  '드래프트', '미스코리아',
  // 증시·주식 정보
  '특징주', '관련주', '코스피', '코스닥', '상한가', '하한가', '급등주', '급락주', '마감시황', '주식마감', '깐부'
];
function filterNoise(items) {
  return items.filter(it => {
    const t = `${it.title || ''} ${it.description || ''}`;
    return !NOISE_TERMS.some(w => t.includes(w));
  });
}

function deduplicateItems(items) {
  const seenKeys = new Set();
  const seenUrls = new Set();
  return items.filter(item => {
    // 1. URL 기반 중복 제거 (가장 확실함)
    if (item.url) {
      if (seenUrls.has(item.url)) return false;
      seenUrls.add(item.url);
    }
    // 2. 제목 기반 간단 중복 제거 (유사 제목 처리)
    const key = item.title.replace(/[\s\-·,.'""]/g, '').toLowerCase().slice(0, 30);
    if (seenKeys.has(key)) return false;
    seenKeys.add(key);
    return true;
  });
}

function groupItemsToCards(items, categoryId, impactRules = []) {
  // impact 타입별로 그룹핑하여 카드 생성
  const groups = {};
  items.forEach(item => {
    const { impact, impactColor } = classifyImpact(item.title, item.description, impactRules);
    item.impact = impact;
    item.impactColor = impactColor;

    if (!groups[impact]) groups[impact] = [];
    groups[impact].push(item);
  });

  const iconMap = {
    'REGULATION': 'shield', 'DEAL': 'handshake', 'INVESTMENT': 'trending-up',
    'PERSONNEL': 'user-check', 'ORG CHANGE': 'git-branch', 'TECH TREND': 'cpu',
    'MARKET IMPACT': 'bar-chart-2', 'STRATEGY': 'target', 'CONTENT': 'film',
    'GROWTH': 'trending-up', 'NEWS': 'newspaper', 'NEW LAUNCH': 'rocket',
    'GOVERNANCE': 'shield-check'
  };

  const today = new Date();
  const dateRange = `${today.getFullYear()}.${String(today.getMonth()+1).padStart(2,'0')}.${String(today.getDate()).padStart(2,'0')}`;

  const dateKey = dateRange.replace(/\./g, '');
  return Object.entries(groups).map(([impact, groupItems]) => ({
    id: `${categoryId}-auto-${impact.toLowerCase().replace(/\s/g, '-')}-${dateKey}`,
    title: `${getImpactLabel(impact)} 동향`,
    icon: iconMap[impact] || 'file-text',
    badge_text: 'AUTO',
    badge_color: '#3b82f6',
    date_range: dateRange,
    category_id: categoryId,
    items: groupItems.slice(0, 20), // 그룹당 최대 20개 (임시 확대)
    tags: extractTags(groupItems)
  }));
}

function getImpactLabel(impact) {
  const labels = {
    'REGULATION': '규제·정책', 'DEAL': '계약·수주', 'INVESTMENT': '투자',
    'PERSONNEL': '인사', 'ORG CHANGE': '조직변화', 'TECH TREND': '기술트렌드',
    'MARKET IMPACT': '시장동향', 'STRATEGY': '전략', 'CONTENT': '콘텐츠',
    'GROWTH': '성장지표', 'NEWS': '주요뉴스', 'NEW LAUNCH': '신규서비스',
    'GOVERNANCE': '거버넌스'
  };
  return labels[impact] || impact;
}

function extractTags(items) {
  const freq = {};
  items.forEach(item => {
    const words = (item.title + ' ' + item.description).match(/[가-힣]{2,}/g) || [];
    words.forEach(w => { freq[w] = (freq[w] || 0) + 1; });
  });
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([w]) => w);
}

module.exports = { classifyImpact, deduplicateItems, groupItemsToCards, filterNoise };
