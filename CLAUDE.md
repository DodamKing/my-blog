# Laon Blog

개인 블로그 (https://blog.dimad.kr). Astro + MDX로 글 작성.

## 기술 스택

Astro 5, MDX, React (Islands), TypeScript, sharp (이미지 최적화)

## 실행 방법

- `npm run dev` — 개발 서버
- `npm run build` — 빌드
- `npm run new` — 새 글 생성 스크립트 (완료 후 `docs/posts-ledger.md` 자동 갱신)
- `npm run delete` — 글 삭제 스크립트 (완료 후 `docs/posts-ledger.md` 자동 갱신)
- `npm run ledger` — `docs/posts-ledger.md` 수동 재생성 (전체 `src/content/blog/*/index.mdx` frontmatter 스캔)
- `npm run webp` — 이미지 webp 변환 (`npm run webp -- input.png output.webp`)

## 프로젝트 구조

```
src/
├── content/blog/           # 글 (폴더별: index.mdx + images/)
├── components/             # UI 컴포넌트
│   └── calculators/        # React 계산기 (Islands)
├── layouts/                # 레이아웃 (BlogPost, ToolPage)
├── pages/                  # 라우팅
│   └── tools/              # 도구 페이지 (계산기 등)
├── styles/                 # 스타일
├── consts.ts               # 사이트 상수, 카테고리 정의
└── content.config.ts       # 콘텐츠 스키마
```

## 글 작성 규칙

### Frontmatter

```yaml
title: "제목"
description: "설명"
pubDate: YYYY-MM-DD
heroImage: "./images/hero.webp"
category: "health" | "tech" | "finance" | "other"
lang: "ko" | "en"  # 기본값 ko
```

- `updatedDate`는 선택 필드

### 폴더 구조

```
src/content/blog/슬러그명/
├── index.mdx
└── images/
    └── hero.webp (+ 기타 이미지)
```

- 슬러그는 영문 kebab-case
- 이미지는 각 글의 images/ 폴더에 배치

## 콘텐츠 전략

- 진입점: `docs/INDEX.md`
- 핵심 방향: `docs/content-strategy.md` (승리 패턴 3가지 + 안티 패턴 + 측정 루프)
- 중복 방지: `docs/posts-ledger.md` (자동 생성, 카테고리별 전체 글 목록). 새 키워드 기획 시 Step 1 에이전트가 먼저 읽어 의미 중복을 차단한다.
- 새 글 기획 시 Step 1 키워드 에이전트가 하드 필터를 적용한다. 안티 패턴 키워드는 거절하거나 재정의를 유도할 것.

### 스냅샷 리뷰 일정 ⏰

- **다음 리뷰 예정일**: `2026-04-25`
- **세션 시작 시 체크 (필수)**: 오늘 날짜가 위 날짜 **이후**라면, 사용자의 첫 요청에 답하기 **전에** 먼저 다음 메시지를 띄운다:
  > "📊 네이버 서치 어드바이저 스냅샷 리뷰 예정일(`YYYY-MM-DD`)이 지났습니다. `docs/snapshots/naver-search/` 에 오늘 날짜로 `YYYY-MM-DD-pages.png`, `YYYY-MM-DD-keywords.png` 두 장을 추가해 주시겠어요? 추가해주시면 `docs/content-strategy.md` 데이터 섹션을 갱신하고, 새 승리 패턴·폐기된 가설을 기록한 뒤, 이 리뷰 예정일을 +14일로 업데이트하겠습니다."
- 리뷰 완료 후 이 날짜를 **+14일**로 업데이트. 업데이트 누락 방지를 위해 리뷰 워크플로 마지막 단계에 "CLAUDE.md 다음 리뷰 예정일 갱신" 포함.

## 글 작성 파이프라인

글 작성 요청 시 `agents/` 폴더의 프롬프트를 순서대로 따른다:

1. **01-keyword-strategist** — 키워드 전략 수립 (data/keywords/ JSON 활용 가능)
2. **02-researcher** — 자료조사
3. **03-writer** — 초안 작성 (체류시간 최적화, 쿠팡 플레이스홀더 포함)
4. **04-reviewer** — 검토 + 피드백
5. **05-finalizer** — 최종본 저장 + 이미지 프롬프트 제공

각 단계는 서브에이전트(Agent tool)로 실행한다.
각 단계 에이전트는 **결과만 반환**하고 파일 저장을 시도하지 않는다. 파일 저장은 메인 에이전트가 한다.

Step 5 완료 후 메인 에이전트가 직접 처리할 것:
- 슬러그 결정 (기존 `src/content/blog/` 폴더 목록과 중복 검사 필수)
- **반드시 `npm run new` 로 폴더 스캐폴드를 먼저 만든다.** Write 도구로 `src/content/blog/<슬러그>/index.mdx` 를 직접 만들지 말 것 — `images/` 폴더가 누락된다. `npm run new` 가 폴더 + `images/` + frontmatter 채워진 빈 `index.mdx` 를 한 번에 생성한다. 그 다음 Write로 `index.mdx` 를 finalizer 결과로 덮어쓴다
- `npm run coupang -- 슬러그명 --apply` 실행 → 쿠팡 딥링크 자동 교체 (결과 표를 사용자에게 보여줄 것)
  - **단, 한정 PB / 인디 콜라보 / 공식 직판 전용 글은 처음부터 CoupangLink가 없는 경우가 정상이므로 이 단계 건너뛴다** (writer 단계에서 placeholder 자체가 안 나와야 함 — 03-writer.md 참조)
  - 매칭 결과가 명백히 카테고리가 어긋나면 (예: "히퍼 피규어" → "골전도 이어폰") --apply된 결과를 되돌리고 해당 CoupangLink 섹션을 통째로 제거할 것
- 아래 형식으로 이미지 프롬프트 + 변환 안내를 함께 제공:

```
## 히어로 이미지

| 글 | 슬러그 | 이미지 프롬프트 |
|---|---|---|
| 제목 | 슬러그명 | 프롬프트 (가로형 16:9, 1200x675px 포함) |

이미지를 각 글의 `images/` 폴더에 넣은 후 `/webp` 를 실행하세요.
```

- 이미지 프롬프트에는 **가로형 비율(16:9, 1200x675px)** 을 반드시 명시한다 (세로 이미지 방지)
- **여러 글을 동시 작성한 경우**: 같은 주제 클러스터 글끼리 내부 링크를 사후 삽입한다 (병렬 실행 시 서로 참조 불가능하므로 메인 에이전트가 후처리)
  - 내부 링크는 **본문 중간에 맥락이 자연스러운 곳에 인라인으로** 삽입한다 (예: "새로 설치했다면 [디펜더 설정](/blog/xxx/)도 확인하세요")
  - "관련 글 모아보기" 같은 별도 섹션은 만들지 않는다 (하단 '다른글 보기' 컴포넌트와 중복)
  - 자연스럽게 연결할 맥락이 없으면 억지로 넣지 않는다

### 글 작성 규칙
- 본문에 구체적 연도(2025년, 2026년 등)를 넣지 않는다
- "현재 기준", "최근 기준" 등 상대적 표현 사용
- 시점 정보는 frontmatter의 pubDate/updatedDate로 관리

### 키워드 데이터
- `data/keywords/`에 JSON 파일을 넣으면 Step 1에서 활용
- JSON은 키워드 분석 도구에서 export한 파일
- 사용 후 수동 정리

### 에이전트 개선
글 작성 파이프라인 실행 후, 비효율이나 품질 문제를 발견하면 해당 에이전트 프롬프트를 즉시 수정한다:
- 개별 에이전트의 프롬프트 개선 (규칙 추가/수정/삭제)
- 프로세스 전체 흐름 변경 (단계 추가/병합/순서 변경)
- 새로운 에이전트 추가 (필요한 역할이 발견될 때)
- 변경 시 이 CLAUDE.md도 함께 업데이트

## 도구 페이지

`src/pages/tools/`에 인터랙티브 도구 페이지를 만든다. Astro Islands + React로 구현.

- 레이아웃: `ToolPage.astro` (SEO, JSON-LD, AdSense 포함)
- 계산기 컴포넌트: `src/components/calculators/` (공통 로직은 `shared/`)
- 새 도구 추가 시: Astro 페이지 + React 컴포넌트 + `client:load` 디렉티브
- 관련 블로그 글과 양방향 내부 링크 필수
