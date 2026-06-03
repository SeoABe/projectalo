// Vercel 서버리스 진입점 — Express 앱을 export (app.listen 없음)
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { runCollection, getCollectionLogs, getLastStatus } = require('../server/collector/scheduler');
const { requireAuth, collectAuth } = require('../server/auth');

const app = express();
app.use(cors());
app.use(express.json());

// ── 공개 엔드포인트 (인증 미들웨어보다 먼저 선언) ───────────────────────────────
// 프론트에 Supabase 공개 설정 전달 (anon key는 공개용)
app.get('/api/config', (req, res) => {
  res.json({
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
  });
});

// 수집 트리거 (Vercel Cron=GET / 관리자 수동=POST). 자체 인증(collectAuth).
app.all('/api/collect/run', collectAuth, async (req, res) => {
  try {
    const result = await runCollection(req.query.category || null);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── 이하 모든 /api 라우트는 로그인 필요 ────────────────────────────────────────
app.use('/api', requireAuth);

app.use('/api/dashboard', require('../server/routes/dashboard'));
app.use('/api/cards', require('../server/routes/cards'));
app.use('/api/urgents', require('../server/routes/urgents'));
app.use('/api/profiles', require('../server/routes/profiles'));
app.use('/api/admin', require('../server/routes/admin'));

app.get('/api/collect/logs', async (req, res) => {
  res.json(await getCollectionLogs());
});
app.get('/api/collect/status', async (req, res) => {
  res.json(await getLastStatus());
});

module.exports = app;
