// 카테고리별 검색 키워드 및 분류 규칙
const KEYWORDS = {
  kt: {
    searchTerms: ["KT 5G","KT 통신","KT 요금제","KT 디지코","KT AICT"],
    excludeTerms: ["광고","스팸","야구"],
    categories: ["IT/과학","경제"],
    rssFeeds: []
  },
  competitor: {
    searchTerms: ["SKT 5G","LGU+ 서비스","통신 요금제","MVNO 알뜰폰","이동통신 경쟁"],
    excludeTerms: ["광고","스팸"],
    categories: ["IT/과학","경제"],
    rssFeeds: []
  },
  joongang: {
    searchTerms: ["중앙일보 디지털","중앙일보 AI","중앙일보 미디어","언론사 디지털전환"],
    excludeTerms: [],
    categories: ["IT/과학","사회"],
    rssFeeds: ["https://rss.joins.com/joins_news_list.xml"]
  },
  hanhwa: {
    searchTerms: ["한화 방산 수출","한화에어로스페이스","한화 에너지","한화 그린수소","K방산"],
    excludeTerms: ["주가","증시","보험","야구"],
    categories: ["정치","경제","세계"],
    rssFeeds: []
  }
};

// Impact 자동 분류 키워드 매핑
const IMPACT_RULES = [
  { keywords: ["규제","법안","개정","과기정통부","공정위","국회"], impact: 'REGULATION', color: '#e74c3c' },
  { keywords: ["수주","계약","체결","MOU","협약"], impact: 'DEAL', color: '#2ed573' },
  { keywords: ["투자","인수","M&A","펀드","출자"], impact: 'INVESTMENT', color: '#e67e22' },
  { keywords: ["인사","대표이사","임원","사장","부회장","교체"], impact: 'PERSONNEL', color: '#e74c3c' },
  { keywords: ["조직","개편","신설","통합","TF","본부"], impact: 'ORG CHANGE', color: '#e67e22' },
  { keywords: ["AI","기술","혁신","특허","R&D","개발"], impact: 'TECH TREND', color: '#3498db' },
  { keywords: ["시장","점유율","매출","실적","영업이익"], impact: 'MARKET IMPACT', color: '#e74c3c' },
  { keywords: ["전략","비전","로드맵","사업계획"], impact: 'STRATEGY', color: '#9b59b6' },
  { keywords: ["콘텐츠","미디어","영상","구독","유튜브"], impact: 'CONTENT', color: '#e67e22' },
  { keywords: ["성장","돌파","증가","확대","달성"], impact: 'GROWTH', color: '#2ed573' },
  { keywords: ["출시","론칭","오픈","서비스 개시"], impact: 'NEW LAUNCH', color: '#9b59b6' },
  { keywords: ["ESG","지배구조","이사회","주주"], impact: 'GOVERNANCE', color: '#3498db' },
];

module.exports = { KEYWORDS, IMPACT_RULES };
