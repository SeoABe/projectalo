// Supabase Auth 기반 인증 미들웨어
// 프론트가 보낸 Authorization: Bearer <access_token> 를 검증한다.
const { createClient } = require('@supabase/supabase-js');

let supa;
function client() {
  if (!supa) {
    supa = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return supa;
}

function bearer(req) {
  const h = req.headers.authorization || '';
  return h.startsWith('Bearer ') ? h.slice(7) : null;
}

async function verify(token) {
  if (!token) return null;
  try {
    const { data, error } = await client().auth.getUser(token);
    if (error || !data || !data.user) return null;
    return data.user;
  } catch {
    return null;
  }
}

// 일반 API 보호 미들웨어
async function requireAuth(req, res, next) {
  const user = await verify(bearer(req));
  if (!user) return res.status(401).json({ error: 'unauthorized' });
  req.user = user;
  next();
}

// 수집 트리거 보호: Vercel Cron(CRON_SECRET) 또는 로그인 사용자 모두 허용
async function collectAuth(req, res, next) {
  const secret = process.env.CRON_SECRET;
  const token = bearer(req);
  if (secret && (token === secret || req.headers['x-cron-secret'] === secret)) return next();
  const user = await verify(token);
  if (user) { req.user = user; return next(); }
  return res.status(401).json({ error: 'unauthorized' });
}

module.exports = { requireAuth, collectAuth };
