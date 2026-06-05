# GIT DASHBOARD 고도화 계획 (Roadmap)

Vercel + Supabase 배포 완료 후, 실서비스 운영 품질을 높이기 위한 개선 항목.
심각도/우선순위 순으로 정리. 각 항목은 독립적으로 배포 가능.

---

## 1. 데이터 수명주기 ⭐ (최우선) — ✅ 완료
**문제**: 카드 ID가 `카테고리-impact-날짜`라 매일 새 카드가 쌓이고, 삭제·보존 정책이 없어 시간이 지날수록 옛 카드가 누적된다. 화면이 지저분해지고 Supabase 무료 용량(500MB)도 압박. 대시보드의 기간 필터(오늘/주/월)는 UI만 있고 동작하지 않는다.

**작업**
- [x] 수집 종료 시 **N일(기본 14일) 지난 카드 자동 삭제** (`card_items`/`card_tags`는 FK CASCADE)
- [x] 보존 기간을 환경변수 `RETENTION_DAYS`로 조정 가능하게
- [x] 대시보드 **기간 필터(오늘/이번주/이번달) 실제 동작**
- [ ] (선택) 같은 URL 기사 N일 내 재수집 시 스킵하는 교차일 중복 방지

**대상**: [server/collector/scheduler.js](server/collector/scheduler.js), [app.js](app.js)

---

## 2. 수집 신뢰성 — ✅ 완료
**문제**: 크론이 4개 카테고리를 통짜로 수집해 60초 타임아웃 위험. `isRunning` 잠금이 서버리스에서 무력해 중복 실행 가능. 외부 요청에 타임아웃이 없어 한 요청이 멈추면 함수가 통째로 죽음.

**작업**
- [x] 외부 요청 타임아웃 추가(네이버 8s, 중앙 8s) — hang 방지
- [x] 카테고리 루프에 **시간 예산 가드**(`COLLECT_BUDGET_MS`, 기본 50s)로 60초 타임아웃 예방
- [x] **DB 기반 잠금**(collection_logs의 'running' 행, 10분 자동 만료)으로 교차 인스턴스 중복 실행 방지
- [x] 카테고리별 수집 결과 로그 출력(기존 유지)

**대상**: [server/collector/scheduler.js](server/collector/scheduler.js), [naverNews.js](server/collector/naverNews.js), [joongangPress.js](server/collector/joongangPress.js)

---

## 3. 코드 정리 (유지보수성) — ✅ 완료
**작업**
- [x] 죽은 파일 제거: `server/index.js`, `server/collector/keywords.js`, `시작.bat` (runtime/·dashboard.db*는 애초에 미커밋)
- [x] "전체 개요" 제외 카테고리를 클라이언트 `overviewExclude` 한 곳에서 관리
- [ ] (보류) `data.js` 정적 더미 — API 실패 시 fallback이라 안전망으로 유지

**대상**: 루트 정리, [server/routes/dashboard.js](server/routes/dashboard.js), [app.js](app.js)

---

## 4. 수집 품질 (빈 탭 줄이기) — ✅ 완료
**문제**: KT·한화가 엄격한 카테고리 필터 + 7일 윈도우로 0건이 잦음.

**작업**
- [x] 카테고리 필터를 **소프트화**: 전부 걸러지면 원본 유지(검색어로 이미 관련성 확보) → 빈 탭 방지
- [x] 최신성 윈도우를 환경변수 `RECENCY_DAYS`(기본 7)로 조정 가능하게
- [ ] (보류) 소스별 수집 건수 상세 노출

**대상**: [server/collector/naverNews.js](server/collector/naverNews.js)

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
