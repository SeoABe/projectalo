# GIT DASHBOARD — Vercel + Supabase 무료 배포 가이드

기존 로컬 윈도우 앱(better-sqlite3 + node-cron)을 **무료 서버리스(Vercel) + Supabase(Postgres·Auth)** 로 옮긴 구성입니다. HTTPS로 어디서나 접속, 로그인 후 사용, 매일 자동 수집(Vercel Cron)됩니다.

```
[브라우저] --HTTPS--> [Vercel] 정적 프론트 + /api(서버리스) + Cron
                                   └──> [Supabase] Postgres(데이터) + Auth(로그인)
```

---

## 0. 사전 준비
- GitHub 계정(코드 푸시용), Vercel 계정, Supabase 계정 — 모두 무료.
- 네이버 개발자센터 검색 API 키. **기존 키는 저장소에 노출됐으니 재발급**: https://developers.naver.com/apps/

## 1. Supabase 프로젝트 생성 + 스키마
1. https://supabase.com → New project 생성(Region은 가까운 곳, 예: Northeast Asia).
2. 좌측 **SQL Editor** → New query → 이 저장소의 [`schema.sql`](schema.sql) 전체 내용을 붙여넣고 **Run**.
   - 테이블 7개 + `app_settings`(키워드/규칙) 생성, 카테고리·키워드 시드까지 들어갑니다.
3. **연결 문자열 확보**: Project Settings → Database → Connection string → **Transaction pooler**(포트 `6543`) 복사 → `DATABASE_URL`.
4. **API 키 확보**: Project Settings → API → `Project URL`(=`SUPABASE_URL`), `anon public`(=`SUPABASE_ANON_KEY`).

## 2. 로그인 계정 만들기
- Supabase → **Authentication → Users → Add user** 로 본인 이메일/비밀번호 생성.
- (선택) Authentication → Providers → Email 에서 "Confirm email"을 꺼두면 즉시 로그인 가능.

## 3. (선택) 로컬에서 먼저 확인
```bash
npm install
cp .env.example .env   # 값 채우기 (DATABASE_URL, SUPABASE_*, NAVER_*, CRON_SECRET)
npm i -g vercel
vercel dev             # http://localhost:3000
```
- 로그인 화면 → 2번에서 만든 계정으로 로그인 → 대시보드 표시.
- 첫 데이터가 없으면 `/admin.html` → "지금 수집 실행" 클릭.

## 4. Vercel 배포
1. 코드를 GitHub 저장소에 푸시(민감정보는 `.gitignore`로 제외됨).
2. Vercel → **Add New → Project** → 해당 저장소 Import. (프레임워크 프리셋: Other)
3. **Settings → Environment Variables** 에 다음을 추가(Production):
   | 키 | 값 |
   |---|---|
   | `DATABASE_URL` | Supabase Transaction pooler 문자열(6543) |
   | `SUPABASE_URL` | Supabase Project URL |
   | `SUPABASE_ANON_KEY` | Supabase anon public 키 |
   | `NAVER_CLIENT_ID` | 재발급한 네이버 Client ID |
   | `NAVER_CLIENT_SECRET` | 네이버 Client Secret |
   | `CRON_SECRET` | 임의의 긴 무작위 문자열 |
4. **Deploy**. 완료되면 `https://<프로젝트>.vercel.app` 발급.

> `vercel.json`의 `crons`가 매일 **UTC 23:00(=KST 08:00)** 에 `/api/collect/run` 을 자동 호출합니다.
> Vercel Cron은 `CRON_SECRET`을 `Authorization: Bearer`로 자동 첨부하므로 별도 설정 불필요.

## 5. 검증 체크리스트
1. 다른 기기 브라우저에서 `https://<프로젝트>.vercel.app` 접속 → **로그인 폼** 표시.
2. 틀린 비밀번호 → 거부 / 정상 로그인 → 대시보드 로드, 우상단 "로그아웃" 표시.
3. 비로그인 상태로 `…/api/dashboard` 직접 호출 시 **401**.
4. `/admin.html` → "지금 수집 실행" → `수집 완료 — N개` 표시, Supabase `cards`/`card_items` 행 증가.
5. 다음 날 Vercel 대시보드 → 프로젝트 → **Cron Jobs** 로그에서 정시 실행 확인.

---

## 무료 티어 / 트러블슈팅
- **함수 타임아웃(최대 60s)**: 전체 수집이 길면 카테고리별로 나눠 호출 가능 — `POST /api/collect/run?category=kt` (값: `kt`,`competitor`,`joongang`,`hanhwa`). 필요 시 GitHub Actions로 카테고리별 순차 호출(헤더 `x-cron-secret: <CRON_SECRET>`)로 우회.
- **DB 연결 오류**: 반드시 **Transaction pooler(6543)** 문자열 사용(서버리스 권장). 직접 연결(5432)은 커넥션 고갈 위험.
- **로그인 후에도 401**: `SUPABASE_URL`/`SUPABASE_ANON_KEY`가 프론트(`/api/config`)와 서버 검증에 동일하게 들어갔는지 확인.
- **Supabase Free 일시정지**: 매일 Cron이 접근하므로 활성 유지됨.

## 변경 요약(로컬 버전 대비)
- `server/db.js`: better-sqlite3(동기) → `pg` 풀(비동기).
- 모든 라우트/수집기: async + Postgres 문법(`$1`, `ON CONFLICT`, `RETURNING`).
- 키워드/임팩트 규칙: `keywords.js` 파일쓰기+eval → `app_settings` 테이블([server/collector/settings.js](server/collector/settings.js)).
- 스케줄러: node-cron 제거 → Vercel Cron.
- 진입점: `api/index.js`(Express export), `vercel.json`(rewrites/crons/maxDuration).
- 인증: Supabase Auth 로그인([auth.js](auth.js)) + 서버 미들웨어([server/auth.js](server/auth.js)).
- 더 이상 사용 안 함: `server/index.js`, `server/collector/keywords.js`, `시작.bat`, `runtime/`, `dashboard.db*`.
