# 문서 인덱스

프로젝트 분석·계획·전략 문서 진입점. 세션 시작 시 필요한 문서만 선택적으로 읽는다.

## 전략

- [content-strategy.md](./content-strategy.md) — 콘텐츠 방향, 승리 패턴, 안티 패턴, 측정 루프. 새 글 기획 전 반드시 확인.
- [research-backlog.md](./research-backlog.md) — 다음 조사 키워드 후보 + 진행 상태 추적. 측정 대기 기간에 병렬 조사 진행하기 위한 큐.
- [seo-recovery-plan.md](./seo-recovery-plan.md) — 구글 색인 회복 계획 (About 페이지 부재 등 구조 문제 진단 + Phase 1~3 복구 단계). 색인 이슈 관련 논의 시 먼저 확인.
- [posts-ledger.md](./posts-ledger.md) — **자동 생성** 전체 글 목록 (카테고리별). 새 키워드 기획 시 의미 중복 검사 용도. 직접 수정 금지.

## 측정 & 실험

- `snapshots/naver-search/YYYY-MM-DD-pages.png` — 네이버 서치 어드바이저 글별 TOP 30
- `snapshots/naver-search/YYYY-MM-DD-keywords.png` — 네이버 서치 어드바이저 키워드별 TOP 30
- `experiments/YYYY-MM-DD-{name}.md` — 발행 실험 가설·예측·측정·결론. 새 글 발행 시 가설 문서 추가, 측정 사이클마다 결과 기록 후 `content-strategy.md`의 승리 패턴/폐기된 가설 섹션에 반영.

측정 루프 2주마다 추가. 기존 파일은 지우지 말고 누적해서 diff 가능하게 유지.

## 관련 파이프라인 파일

- `../agents/01-keyword-strategist.md` — 키워드 단계의 하드 필터는 content-strategy.md 에 따른다.
- `../CLAUDE.md` — 프로젝트 전반 규칙.
