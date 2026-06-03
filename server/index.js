require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDb } = require('./db');
const { startScheduler, runCollection, getCollectionLogs, getLastStatus } = require('./collector/scheduler');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// 프론트엔드 정적 파일 서빙 (server/ 상위 디렉토리)
app.use(express.static(path.join(__dirname, '..')));

// API Routes
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/cards', require('./routes/cards'));
app.use('/api/urgents', require('./routes/urgents'));
app.use('/api/profiles', require('./routes/profiles'));
app.use('/api/admin', require('./routes/admin'));

// 수집 API
app.post('/api/collect/run', async (req, res) => {
  try {
    const result = await runCollection();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/collect/logs', (req, res) => {
  res.json(getCollectionLogs());
});

app.get('/api/collect/status', (req, res) => {
  res.json(getLastStatus());
});

// SPA fallback
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// Initialize & Start
initDb();
startScheduler();

app.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`  GIT DASHBOARD Server`);
  console.log(`  http://localhost:${PORT}`);
  console.log(`========================================\n`);
});
