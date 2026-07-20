# 문서 인덱스

프로젝트 분석·계획·전략 문서 진입점. 세션 시작 시 필요한 문서만 선택적으로 읽는다.

## 전략

- [content-strategy.md](./content-strategy.md) — 콘텐츠 방향, 승리 패턴, 안티 패턴, 측정 루프. 새 글 기획 전 반드시 확인.
- [research-backlog.md](./research-backlog.md) — 다음 조사 키워드 후보 + 진행 상태 추적. 측정 대기 기간에 병렬 조사 진행하기 위한 큐.
- [seo-recovery-plan.md](./seo-recovery-plan.md) — 구글 색인 회복 계획 (About 페이지 부재 등 구조 문제 진단 + Phase 1~3 복구 단계). 색인 이슈 관련 논의 시 먼저 확인.
- [posts-ledger.md](./posts-ledger.md) — **자동 생성** 전체 글 목록 (카테고리별). 새 키워드 기획 시 의미 중복 검사 용도. 직접 수정 금지.
- [monetization-pivot-backlog.md](./monetization-pivot-backlog.md) — **수익화 도구 피벗 실행 백로그 + 진행 상태**. 다음 세션 픽업 포인트. 계산기 빌드 큐·키워드 검증 결과·목표 프레이밍·다음 액션.
- [automation-unattended-plan.md](./automation-unattended-plan.md) — **매일 1편 무인 발행 계획 + 고민 포인트**. Gemini 무료 파일럿 결과(팩트 그라운딩 무료 불가), 작가 엔진 옵션(클라우드 Claude 루틴 vs Actions+Gemini), push 입력 설계, GitHub App 리스크. **현재 보류** — 수동 파이프 반응 검증 후 재개. 자동화 논의 재개 시 진입점.
- [keyword-radar-upgrade-spec.md](./keyword-radar-upgrade-spec.md) — keyword-radar 도구 업그레이드 전달 문서(별도 레포로 반출). SERP 도메인 3분류(노이즈/권위 인컴번트/소형툴) + 추가 신호로 "쉬움 라벨 착시"를 해소. **2026-07-16 완료 — `POST /api/judge` 로 판정이 API 노출되어 Claude가 직접 호출한다.** 층1의 트렌드 시드 판정은 2026-07-17 트렌드 발굴 가설 폐기로 불필요해짐(→ 에버그린 시드 + `/api/expand`). 설계 근거 기록용이며, **실사용법은 `../CLAUDE.md` "키워드 데이터"(호출 순서·게이트 포함) + `npm run scan -- <시드>` 참조.**

## 측정 & 실험

- `snapshots/naver-search/YYYY-MM-DD.md` — 네이버 서치 어드바이저 스냅샷 (키워드 + 페이지 TOP 30 + 직전 대비 변화 + 발견). 2026-05-18부터 마크다운, 그 이전은 PNG로 보존.
- `experiments/YYYY-MM-DD-{name}.md` — 발행 실험 가설·예측·측정·결론. 새 글 발행 시 가설 문서 추가, 측정 사이클마다 결과 기록 후 `content-strategy.md`의 승리 패턴/폐기된 가설 섹션에 반영.
  - [experiments/2026-07-17-property-tax-seasonal.md](./experiments/2026-07-17-property-tax-seasonal.md) — 재산세 시즌 키워드 테스트 + 도구/글 동시 진입. **관공서 도메인 카테고리 벽** 발견(정보성 축 전멸, 브랜드명 붙으면 열림) + 문서수 127건이 기회가 아니라 경고였던 사례. **7/31 측정 필수 — 관측 창 2주**.
  - [experiments/2026-07-18-volume-vs-sideeffect-bet.md](./experiments/2026-07-18-volume-vs-sideeffect-bet.md) — 요리 볼륨(초당옥수수 삶는법) vs 부작용 패턴(세포랩 부작용) **정면 대결 발행**. 사용자가 "다 발행해 결과로 검증" 선택. 볼륨과 패턴 정합 중 뭐가 클릭으로 환산되는지 A/B 실측. **8/1 측정 — 옥수수는 시즌 후반이라 창 짧음**.
  - [experiments/2026-07-19-summer-appliance-senior-seed.md](./experiments/2026-07-19-summer-appliance-senior-seed.md) — 여름 가전 2편(제습기 10리터 · 선풍기 냉감조끼) 발행. **`senior-shopping` 시드("오늘의 키워드")의 첫 산출** — 시드 경로 유효성 + 시즌 피크 타이밍 + "오해 해소형" 공통 앵글 검증. **8/2 측정 — 시즌형, 여름 내 유효**.

측정 루프 2주마다 추가. 기존 파일은 지우지 말고 누적해서 diff 가능하게 유지.

## 관련 파이프라인 파일

- `../agents/01-keyword-strategist.md` — 키워드 단계의 하드 필터는 content-strategy.md 에 따른다.
- `../CLAUDE.md` — 프로젝트 전반 규칙.
