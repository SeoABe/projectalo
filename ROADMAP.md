# GIT DASHBOARD 고도화 계획 (Roadmap)

Vercel + Supabase 배포 완료 후, 실서비스 운영 품질을 높이기 위한 개선 항목.
심각도/우선순위 순으로 정리. 각 항목은 독립적으로 배포 가능.

---

## 1. 데이터 수명주기 ⭐ (최우선) — 진행 중
**문제**: 카드 ID가 `카테고리-impact-날짜`라 매일 새 카드가 쌓이고, 삭제·보존 정책이 없어 시간이 지날수록 옛 카드가 누적된다. 화면이 지저분해지고 Supabase 무료 용량(500MB)도 압박. 대시보드의 기간 필터(오늘/주/월)는 UI만 있고 동작하지 않는다.

**작업**
- [ ] 수집 종료 시 **N일(기본 14일) 지난 카드 자동 삭제** (`card_items`/`card_tags`는 FK CASCADE)
- [ ] 보존 기간을 환경변수 `RETENTION_DAYS`로 조정 가능하게
- [ ] 대시보드 **기간 필터(오늘/이번주/이번달) 실제 동작** — `card_items.date` 기준 클라이언트 필터
- [ ] (선택) 같은 URL 기사 N일 내 재수집 시 스킵하는 교차일 중복 방지

**대상**: [server/collector/scheduler.js](server/collector/scheduler.js), [app.js](app.js)

---

## 2. 수집 신뢰성
**문제**: 크론이 4개 카테고리를 통짜로 수집해 60초 타임아웃 위험. `isRunning` 잠금이 서버리스에서 무력해 중복 실행 가능.

**작업**
- [ ] 크론을 카테고리 분할 호출로 변경(또는 카테고리 루프에 시간 예산 가드)
- [ ] DB 기반 잠금(예: `app_settings`에 `collecting_until` 타임스탬프)으로 중복 실행 방지
- [ ] 수집 결과를 카테고리별로 로그에 남겨 가시성 향상

**대상**: [server/collector/scheduler.js](server/collector/scheduler.js), [vercel.json](vercel.json)

---

## 3. 코드 정리 (유지보수성)
**작업**
- [ ] 죽은 파일 제거: `server/index.js`(깨진 import), `server/collector/keywords.js`(미사용), `시작.bat`, `runtime/`, `dashboard.db*`
- [ ] `data.js` 정적 더미를 최신 빈 상태로 정리하거나 제거
- [ ] "전체 개요" 제외 카테고리(`competitor`)를 **한 곳(설정)** 에서 관리 — 서버/클라 중복 하드코딩 제거

**대상**: 루트 정리, [server/routes/dashboard.js](server/routes/dashboard.js), [app.js](app.js)

---

## 4. 수집 품질 (빈 탭 줄이기)
**문제**: KT·한화가 엄격한 카테고리 필터 + 7일 윈도우로 0건이 잦음.

**작업**
- [ ] 카테고리 필터를 "있으면 가점, 없어도 통과" 식으로 완화하거나 윈도우(7일)를 설정값으로
- [ ] 소스별(네이버/RSS/보도자료) 수집 건수 노출로 어디서 0건인지 진단 가능하게

**대상**: [server/collector/naverNews.js](server/collector/naverNews.js), [server/collector/keywords.js→app_settings]

---

## 5. UX / 다듬기 (낮음)
- [ ] 관리자 페이지에도 새로고침 버튼/캐시 정책 일관 적용
- [ ] 대시보드 `meta.date`·주차(WK) 동적 계산(현재 UTC·하드코딩) → KST 기준
- [ ] 메인 로딩 스피너, 모바일에서 로그아웃 버튼 겹침 정리

---

## 6. 운영/관측 (낮음, 단일 사용자 기준 후순위)
- [ ] 입력 검증(POST 바디), 간단한 에러 알림
- [ ] Supabase 주기적 백업(무료 티어는 수동) 안내
- [ ] 기본 스모크 테스트

---

### 진행 현황
- **2026-06-04**: 1번 착수.
