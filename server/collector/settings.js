// 키워드/임팩트 규칙을 DB(app_settings)에서 로드·저장
// (기존 keywords.js 파일쓰기 + eval 방식을 대체)
const { one, q } = require('../db');

async function getSettings() {
  const row = await one('SELECT keywords, impact_rules FROM app_settings WHERE id = 1');
  return {
    KEYWORDS: (row && row.keywords) || {},
    IMPACT_RULES: (row && row.impact_rules) || [],
  };
}

async function saveSettings(keywords, impactRules) {
  await q(
    `INSERT INTO app_settings (id, keywords, impact_rules)
     VALUES (1, $1::jsonb, $2::jsonb)
     ON CONFLICT (id) DO UPDATE SET keywords = EXCLUDED.keywords, impact_rules = EXCLUDED.impact_rules`,
    [JSON.stringify(keywords || {}), JSON.stringify(impactRules || [])]
  );
}

module.exports = { getSettings, saveSettings };
