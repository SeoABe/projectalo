// GIT DASHBOARD - Static Data
// 백엔드 API 장애 시 또는 초기 로딩 시 폴백(fallback)으로 사용되는 구조

const DASHBOARD_DATA = {
  meta: {
    title: "GIT DASHBOARD",
    week: "WK17",
    date: new Date().toISOString().slice(0, 10).replace(/-/g, '.'),
    prevWeek: "WK16",
    updatedAt: "최근 수집 내역 없음"
  },

  urgent: [],

  categories: [
    { id: "all", label: "전체 개요", icon: "layout-dashboard" },
    { id: "kt", label: "KT이동통신 경쟁사", icon: "signal", badge: "NEW" },
    { id: "joongang", label: "중앙일보", icon: "newspaper" },
    { id: "hanhwa", label: "한화전략부문", icon: "target" }
  ],

  summary: {},

  cards: {
    kt: [],
    joongang: [],
    hanhwa: []
  },

  profiles: {
    kt: [],
    joongang: [],
    hanhwa: []
  },

  filterOptions: {
    impactTypes: [
      { value: "all", label: "전체" },
      { value: "MARKET IMPACT", label: "시장영향" },
      { value: "TECH TREND", label: "기술트렌드" },
      { value: "STRATEGY", label: "전략" },
      { value: "REGULATION", label: "규제" },
      { value: "DEAL", label: "딜" },
      { value: "INVESTMENT", label: "투자" },
      { value: "ORG CHANGE", label: "조직변화" },
      { value: "CONTENT", label: "콘텐츠" },
      { value: "GROWTH", label: "성장" },
      { value: "INNOVATION", label: "혁신" },
      { value: "PERSONNEL", label: "인사" }
    ],
    dateRange: [
      { value: "all", label: "전체 기간" },
      { value: "today", label: "오늘" },
      { value: "week", label: "이번 주" },
      { value: "month", label: "이번 달" }
    ]
  }
};
