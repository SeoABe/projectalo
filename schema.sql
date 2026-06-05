-- GIT DASHBOARD — Supabase(Postgres) 스키마 + 시드
-- Supabase 대시보드 > SQL Editor 에 붙여넣고 실행하세요.
-- 타임스탬프는 기존 SQLite(datetime('now','localtime'))와 동일하게
-- 'YYYY-MM-DD HH24:MI:SS' 형식의 한국시간 문자열로 저장합니다.

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  label TEXT,
  icon TEXT,
  badge TEXT,
  sort_order INTEGER
);

CREATE TABLE IF NOT EXISTS urgents (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  message TEXT,
  category_id TEXT,
  level TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT to_char(timezone('Asia/Seoul', now()), 'YYYY-MM-DD HH24:MI:SS')
);

CREATE TABLE IF NOT EXISTS summaries (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  category_id TEXT,
  source TEXT,
  color TEXT,
  content TEXT,
  highlight TEXT,
  week TEXT,
  updated_at TEXT DEFAULT to_char(timezone('Asia/Seoul', now()), 'YYYY-MM-DD HH24:MI:SS')
);

CREATE TABLE IF NOT EXISTS cards (
  id TEXT PRIMARY KEY,
  title TEXT,
  icon TEXT,
  badge_text TEXT,
  badge_color TEXT,
  date_range TEXT,
  category_id TEXT,
  created_at TEXT DEFAULT to_char(timezone('Asia/Seoul', now()), 'YYYY-MM-DD HH24:MI:SS')
);

CREATE TABLE IF NOT EXISTS card_items (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  card_id TEXT REFERENCES cards(id) ON DELETE CASCADE,
  title TEXT,
  impact TEXT,
  impact_color TEXT,
  description TEXT,
  source TEXT,
  date TEXT,
  source_url TEXT
);

CREATE TABLE IF NOT EXISTS card_tags (
  card_id TEXT REFERENCES cards(id) ON DELETE CASCADE,
  tag TEXT
);

CREATE TABLE IF NOT EXISTS profiles (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT,
  position TEXT,
  org TEXT,
  badge_text TEXT,
  badge_color TEXT,
  description TEXT,
  category_id TEXT
);

CREATE TABLE IF NOT EXISTS collection_logs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  run_at TEXT DEFAULT to_char(timezone('Asia/Seoul', now()), 'YYYY-MM-DD HH24:MI:SS'),
  status TEXT,
  items_collected INTEGER,
  errors TEXT
);

-- 키워드/임팩트 규칙 저장(기존 keywords.js 파일쓰기+eval 대체)
CREATE TABLE IF NOT EXISTS app_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  keywords JSONB,
  impact_rules JSONB,
  CONSTRAINT app_settings_singleton CHECK (id = 1)
);

-- ─── 시드 데이터 ───────────────────────────────────────────────

INSERT INTO categories (id, label, icon, badge, sort_order) VALUES
  ('all',        '전체 개요',        'layout-dashboard', NULL,  0),
  ('kt',         'KT',               'signal',           NULL,  1),
  ('competitor', '이동통신 경쟁사',  'users',            'NEW', 2),
  ('joongang',   '중앙일보',         'newspaper',        NULL,  3),
  ('hanhwa',     '한화전략부문',     'target',           NULL,  4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO app_settings (id, keywords, impact_rules) VALUES (
  1,
  '{
    "kt": {"searchTerms":["KT 5G","KT 통신","KT 요금제","KT 디지코","KT AICT"],"excludeTerms":["광고","스팸","야구"],"categories":["IT/과학","경제"],"rssFeeds":[]},
    "competitor": {"searchTerms":["SKT 5G","LGU+ 서비스","통신 요금제","MVNO 알뜰폰","이동통신 경쟁"],"excludeTerms":["광고","스팸"],"categories":["IT/과학","경제"],"rssFeeds":[]},
    "joongang": {"searchTerms":[],"excludeTerms":[],"categories":[],"rssFeeds":[]},
    "hanhwa": {"searchTerms":["한화 방산 수출","한화에어로스페이스","한화 에너지","한화 그린수소","K방산"],"excludeTerms":[],"categories":["정치","경제","세계"],"rssFeeds":[]}
  }'::jsonb,
  '[
    {"keywords":["규제","법안","개정","과기정통부","공정위","국회"],"impact":"REGULATION","color":"#e74c3c"},
    {"keywords":["수주","계약","체결","MOU","협약"],"impact":"DEAL","color":"#2ed573"},
    {"keywords":["투자","인수","M&A","펀드","출자"],"impact":"INVESTMENT","color":"#e67e22"},
    {"keywords":["인사","대표이사","임원","사장","부회장","교체"],"impact":"PERSONNEL","color":"#e74c3c"},
    {"keywords":["조직","개편","신설","통합","TF","본부"],"impact":"ORG CHANGE","color":"#e67e22"},
    {"keywords":["AI","기술","혁신","특허","R&D","개발"],"impact":"TECH TREND","color":"#3498db"},
    {"keywords":["시장","점유율","매출","실적","영업이익"],"impact":"MARKET IMPACT","color":"#e74c3c"},
    {"keywords":["전략","비전","로드맵","사업계획"],"impact":"STRATEGY","color":"#9b59b6"},
    {"keywords":["콘텐츠","미디어","영상","구독","유튜브"],"impact":"CONTENT","color":"#e67e22"},
    {"keywords":["성장","돌파","증가","확대","달성"],"impact":"GROWTH","color":"#2ed573"},
    {"keywords":["출시","론칭","오픈","서비스 개시"],"impact":"NEW LAUNCH","color":"#9b59b6"},
    {"keywords":["ESG","지배구조","이사회","주주"],"impact":"GOVERNANCE","color":"#3498db"}
  ]'::jsonb
) ON CONFLICT (id) DO NOTHING;
