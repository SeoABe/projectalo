// Supabase(Postgres) 연결 레이어 — better-sqlite3(동기) → pg(비동기) 교체
// 서버리스(Vercel)에서 warm 인스턴스 간 커넥션 풀을 재사용한다.
const { Pool } = require('pg');

let pool;

function getPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL 환경변수가 설정되지 않았습니다. (Supabase Transaction Pooler 연결 문자열)');
    }
    pool = new Pool({
      connectionString,
      // Supabase는 TLS 필요. 풀러(6543) 사용 권장.
      ssl: { rejectUnauthorized: false },
      max: 1, // 서버리스: 인스턴스당 1 커넥션
      idleTimeoutMillis: 10000,
    });
  }
  return pool;
}

// 공통 쿼리 헬퍼: result.rows / result.rowCount 반환
async function q(sql, params = []) {
  return getPool().query(sql, params);
}

// 편의 헬퍼 (better-sqlite3 .get()/.all() 대응)
async function one(sql, params = []) {
  const r = await q(sql, params);
  return r.rows[0] || undefined;
}
async function all(sql, params = []) {
  const r = await q(sql, params);
  return r.rows;
}

module.exports = { getPool, q, one, all };
