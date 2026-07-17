# Laon Blog

개인 블로그 (https://blog.dimad.kr). Astro + MDX로 글 작성.

## 기술 스택

Astro 5, MDX, React (Islands), TypeScript, sharp (이미지 최적화)

## 실행 방법

- `npm run dev` — 개발 서버
- `npm run build` — 빌드
- `npm run new` — 새 글 생성 스크립트 (완료 후 `docs/posts-ledger.md` 자동 갱신)
  - Interactive 모드 (사용자 직접): `npm run new`
  - Non-interactive 모드 (Claude 자동화): `npm run new -- --slug=my-post --title=제목 --category=tech --description=설명 [--lang=ko|en]` — 인자 없는 값은 기본값(`temp`/`ko`) 사용. Claude가 병렬로 여러 슬러그 생성할 때 이 모드 필수.
- `npm run delete` — 글 삭제 스크립트 (완료 후 `docs/posts-ledger.md` 자동 갱신)
- `npm run ledger` — `docs/posts-ledger.md` 수동 재생성 (전체 `src/content/blog/*/index.mdx` frontmatter 스캔)
- `npm run webp` — 이미지 webp 변환 (`npm run webp -- input.png output.webp`)
- `npm run scan -- <시드>` — 시드 키워드 스캔 (`scripts/pipeline/scan-seed.js`). keyword-radar API 호출 순서(analyze → expand → analyze → judge)를 자동 실행해 발행 후보를 추린다. **읽기 전용 조사 도구** — 파일을 쓰지 않는다. 상세는 아래 "키워드 데이터" 참조

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

- **다음 리뷰 예정일**: `2026-07-22`
- **세션 시작 시 체크 (필수)**: 오늘 날짜가 위 날짜 **이후**라면, 사용자의 첫 요청에 답하기 **전에** 먼저 다음 메시지를 띄운다:
  > "📊 네이버 서치 어드바이저 스냅샷 리뷰 예정일(`YYYY-MM-DD`)이 지났습니다. 키워드 TOP 30 + 페이지 TOP 30 캡처를 올려주시면, `docs/snapshots/naver-search/YYYY-MM-DD.md` 한 장에 데이터·직전 대비 변화·발견을 정리하고, `docs/content-strategy.md` 를 갱신한 뒤 리뷰 예정일을 +14일로 업데이트하겠습니다. (PNG 저장은 폐지, 마크다운만)"
- 리뷰 시 절대 클릭이 1차 지표, CTR은 2차. 단기 CTR 변동으로 패턴 강약 판정 금지 (`docs/content-strategy.md` 측정 원칙 참조).
- 리뷰 완료 후 이 날짜를 **+14일**로 업데이트. 업데이트 누락 방지를 위해 리뷰 워크플로 마지막 단계에 "CLAUDE.md 다음 리뷰 예정일 갱신" 포함.

## 글 작성 파이프라인

글 작성 요청 시 `agents/` 폴더의 프롬프트를 순서대로 따른다.

⚠️ **직렬 실행. 단계를 병렬 호출하지 말 것.** 특히 기획(01 Mode B)과 조사(02)를 병렬로 돌리면 **둘 다 독립적으로 같은 사실을 조사해 값이 갈린다** (2026-07-17 `다이소 크레아틴`: 익스트림 300g 일반 유통가가 기획 16,900원 / 조사 15,900원으로 충돌. 메인이 수동 통일했으나 자동화되면 조용히 본문에 들어간다).

- **사실의 단일 출처는 조사(02)다.** 가격·용량·수치는 조사 결과만 인용한다
- 키워드가 이미 확정된 경우 **조사(02) → 기획(01 Mode B)** 순서로 돌린다. 기획은 조사 결과를 입력으로 받아 쓰고 사실을 다시 조사하지 않는다
- 서로 다른 글(클러스터 내 별개 슬러그)의 **같은 단계**를 병렬로 돌리는 것은 여전히 허용

1. **01-keyword-strategist** — 키워드 전략 수립 (data/keywords/ JSON 활용 가능)
   - **Mode A(JSON 큐레이션)의 경우 필수**: 결과 확정 전 **독립 심사 에이전트를 병렬 호출해 비판적 교차 검증**. 메인의 큐레이션 결과는 비공개로 유지(독립 판단 보장). 같은 JSON + 블로그 상황(카테고리 편수·외부 도메인 패널티)만 공유하고 "비판적 현실주의 관점에서 실제 상위 진입 가능한 편수만 선별"을 지시한다.
   - 비교 결과 처리: **교집합 키워드만 확정**. 메인만 제안한 키워드는 낙관 편향 가능성 재고, 독립 에이전트만 제안한 키워드는 놓친 가능성 검토.
   - **SERP 실측 검증 (필수)**: 데이터 필터를 통과한 최종 후보는 keyword-radar `POST /api/judge` 로 진입 판정을 받는다 (⛔ 거절 / △ 앵글 살아있으면 진행 / ✅ 진행). 데이터상 "쉬움"·기회점수 만점이어도 1면이 점유 중이면 ⛔가 나온다 — 점수만 보고 발행 결정 금지. **judge는 호출 순서상 마지막이다** (analyze 게이트 → expand → analyze → judge, 후보 최대 3개). 검색량으로 judge 대상을 컷하지 말 것 — 위 "키워드 데이터 → 호출 순서" 참조. 자세한 룰은 `agents/01-keyword-strategist.md` 의 "SERP 실측 검증" 섹션 참조.
   - 이 단계를 건너뛰면 낙관 편향으로 발행 편수 과다 위험.
2. **02-researcher** — 자료조사 (**사실의 단일 출처**. 수치는 출처·기준 시점과 함께 반환)
3. **03-writer** — 초안 작성 (체류시간 최적화, 쿠팡 플레이스홀더 포함)
4. **04-reviewer** — 검토 + 피드백
5. **05-finalizer** — 최종본 저장 + 이미지 프롬프트 제공

각 단계는 서브에이전트(Agent tool)로 실행한다.
각 단계 에이전트는 **결과만 반환**하고 파일 저장을 시도하지 않는다. 파일 저장은 메인 에이전트가 한다.

### 키워드 판정 인계선 (keyword-radar 완성 시 이관 — **그때까지 현행 유지**)

키워드 발굴·판정을 keyword-radar 쪽으로 넘기고, 이 프로젝트는 "틈이 확인된 후보 + 판정 근거"를 받아 **글만 쓰는** 구조로 간다.

| 담당 | 범위 |
|---|---|
| **keyword-radar** (틈이 있는가) | 시드 목록 순회, 검색량·문서수·경쟁률, `/api/judge` 진입 판정 ✅/△/⛔. 시드 목록에 페르소나(40+ 건강: 크레아틴·오메가3·루테인·관절·혈압 등)가 인코딩되므로 페르소나 필터도 그쪽에서 걸린다 |
| **이 프로젝트** (우리가 써야 하는가) | `posts-ledger.md` 중복 **조회**(검증이 아님 — 5초 확인), 앵글·제목·H2 기획, 이후 조사·초안·검토·발행 |

- **판정은 한 번뿐이다.** keyword-radar가 ✅를 내면 이쪽에서 judge를 다시 부르거나 경쟁률을 재해석하지 않는다
- 자기잠식은 키워드 단계가 아니라 **검토(04)** 에서 잡힌다 — 초안이 나와야 문단 겹침이 보인다. 앞당기려 하지 말 것
- ⛔ **시드 순회 기능은 아직 keyword-radar에 없다.** 그때까지 Step 1의 발굴·판정 절차(`npm run scan`, 호출 순서, `/api/judge`)를 **그대로 사용한다**

Step 5 완료 후 메인 에이전트가 직접 처리할 것:
- 슬러그 결정 (기존 `src/content/blog/` 폴더 목록과 중복 검사 필수)
- **반드시 `npm run new` 로 폴더 스캐폴드를 먼저 만든다.** Write 도구로 `src/content/blog/<슬러그>/index.mdx` 를 직접 만들지 말 것 — `images/` 폴더가 누락된다. `npm run new` 가 폴더 + `images/` + frontmatter 채워진 빈 `index.mdx` 를 한 번에 생성한다. 그 다음 Write로 `index.mdx` 를 finalizer 결과로 덮어쓴다
  - Claude가 자동화할 때는 **CLI 인자 모드** 사용: `npm run new -- --slug=xxx --category=tech` (title/description은 어차피 Write로 덮어쓰므로 생략하면 `temp` 기본값). **여러 슬러그는 한 번에 병렬 Bash 호출** 가능
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
- **연관된 실험 문서가 있으면 Progress 섹션 즉시 갱신** — `docs/experiments/*.md` 에 해당 클러스터 실험 문서가 있는 경우, 발행 직후 "## 진행 상태 (Progress)" 표의 (상태 / 발행일 / 다음 액션) 컬럼을 갱신한다. 다음 세션에서 진행 상태를 모르겠다는 혼란이 재발하지 않도록.

### 실험 문서 관리 룰

- **신규 실험 문서는 상단에 "## 진행 상태 (Progress)" 섹션 필수**. 표 컬럼은 (Phase 또는 Day / 슬러그 / 상태 / 발행일 / 다음 액션) 고정.
- **상태 변경 시점**: 발행, 측정 마일스톤(+1·2·4주), 폐기, Phase 전환 — 모두 표 즉시 업데이트
- **표 바로 아래에 한 줄로 "현재 다음 액션" 명시** — 세션 시작 시 어디서 이어가야 할지 한눈에 보이게 유지
- 측정 결과/결론 누적은 별도 섹션에 추가하되, Progress 표는 상단에서 항상 최신 상태 유지

### 글 작성 규칙
- 본문에 구체적 연도(2025년, 2026년 등)를 넣지 않는다
- "현재 기준", "최근 기준" 등 상대적 표현 사용
- 시점 정보는 frontmatter의 pubDate/updatedDate로 관리

### 키워드 데이터

**keyword-radar API** (`https://keyword-radar-rho.vercel.app`) 를 Claude가 직접 호출한다. 사용자에게 도구 실행·export를 요청하지 말 것.

| 엔드포인트 | 용도 |
|---|---|
| `POST /api/judge` | **진입 판정 ⛔/△/✅ — 발행 결정의 최종 근거** |
| `POST /api/analyze` | 키워드 배열 → 검색량·경쟁률·기회지수 (추림용) |
| `POST /api/expand` | 시드 1개 → 연관 키워드 발굴 (`maxResults` 30 내외 필수) |
| `POST /api/domains` | 1면 도메인 목록 원자료 (판정은 judge가 함) |
| `POST /api/postdates` | 상위 10건 발행일 분포 |
| `POST /api/trend` | 키워드 12개월 추이 + 성/연령 분포 — **검증용(발굴 아님)**. 키워드를 입력으로 받는다 |

⚠️ **엔드포인트 6개 전부 "키워드를 이미 알 때" 쓰는 도구다. 시드는 도구 밖에서 와야 한다.** `/api/trend` 도 시드 발굴에 쓸 수 없다 (2026-07-17 실측 — 상세: `docs/content-strategy.md` 폐기된 가설).

#### 호출 순서 (2026-07-17 실측 확정 — 싼 것 먼저, 비싼 건 게이트 뒤로)

`npm run scan -- <시드>` 가 아래를 자동 실행한다. 수동 호출 시에도 이 순서를 지킬 것.

1. **`/api/analyze` 배치** (시드 + 템플릿 롱테일, **배치 상한 10개**. 4.6s / 캐시히트 0.8s) → **진단 롱테일 볼륨이 전부 월 10 이하면 즉시 킬**
2. **`/api/expand`** (12~15.7s, `maxResults` 30) — 게이트 통과 시드만. **우리가 예측 못 한 질문축을 찾는 유일한 도구** (레딜의 실제 승리 키워드 "목아픔"·"가래"는 템플릿으로 안 나온다). **반환 3건 이하 = 생태계 없음 → 킬**
3. **`/api/analyze`** — expand가 찾은 신규 키워드
4. **`/api/judge`** — 최종 후보 3개 (1.2~3.5s, 병렬 불필요)

- **"월검색 1,000 이상만 judge" 룰은 폐기.** 역효과였음 — 제로엔 킬 근거는 judge(△)가 아니라 ①단계 진단 롱테일 analyze에서 나왔다. 게이트는 볼륨 컷이 아니라 순서다
- **쿼터**: analyze 12개 배치에서 429가 2회 발생(서버 백오프가 흡수). 배치는 10개를 넘기지 말 것
- **동음이의어 판별은 `document_count > 500,000`** 으로 한다. `competition_ratio > 100` 은 오발함 — 경쟁률 = 문서수÷검색량이라 검색량 10~15인 저볼륨 롱테일은 문서 1,000건만 있어도 100을 넘는다 ("크레아틴 효과 없음" 검색 15 / 문서 2,342 → 156이 오분류)

- 인증: `Authorization: Bearer $AUTH_SECRET` 헤더. 값은 이 프로젝트 `.env` 에 있음 (**커밋 금지**)
- ⚠️ 한글은 **UTF-8 파일로 저장해 `--data-binary @file`** 로 넘길 것. `-d '{...}'` 인라인은 Git Bash에서 깨져 빈 결과가 온다
- ⚠️ 진입 판정을 외부에서 재현하지 말 것 — `/api/judge` 가 단일 출처다
- 네이버 API 무료 쿼터 공유: 루프에서 `expand`/`trend` 남발 금지. `analyze` 로 배치 추림 → 후보만 `judge`
- API 원문 문서: `../keyword-radar/docs/api.md`
- `data/keywords/` 에 JSON 파일이 있으면 그것도 활용 가능 (사용 후 수동 정리)

### 에이전트 개선
글 작성 파이프라인 실행 후, 비효율이나 품질 문제를 발견하면 해당 에이전트 프롬프트를 즉시 수정한다:
- 개별 에이전트의 프롬프트 개선 (규칙 추가/수정/삭제)
- 프로세스 전체 흐름 변경 (단계 추가/병합/순서 변경)
- 새로운 에이전트 추가 (필요한 역할이 발견될 때)
- 변경 시 이 CLAUDE.md도 함께 업데이트

## 도구 페이지

`src/pages/tools/`에 인터랙티브 도구 페이지를 만든다. Astro Islands + React로 구현.

- 레이아웃: `ToolPage.astro` — `slug` 하나만 넘기면 관련 계산기·브레드크럼·JSON-LD 카테고리가 자동 파생 (SEO, AdSense 포함)
- 도구 레지스트리: `src/data/tools.ts` (단일 소스) — 도구 목록 + 카테고리(finance/labor…) 정의. `/tools/` 인덱스 카드·관련 링크·카테고리 섹션이 모두 여기서 파생
- 계산기 컴포넌트: `src/components/calculators/` (공통 로직·입력필드는 `shared/`)
- **새 도구 추가 = `src/data/tools.ts`에 1줄 + `src/pages/tools/<slug>.astro`(ToolPage에 slug 전달) + React 컴포넌트(`client:load`).** 인덱스·관련 계산기·브레드크럼·카테고리는 자동 처리됨
- 설명·FAQ는 **도구 페이지 본문에 통합**(별도 짝 글 X — tool+info 한 URL로 체류·viewability↑). `relatedBlogPost`는 진짜 관련 글이 있을 때만 선택적으로
- **title = 실측 검색어 그대로 박을 것.** 설명적 카피 금지. `/api/analyze` 로 검색량을 확인한 문구만 쓰고, 여러 키워드가 겹쳐 걸리도록 조합한다
  - ✅ `대출이자 계산기 - 원리금균등·원금균등 월 상환액 비교` (4개 키워드 동시 커버)
  - ⛔ `대출 계산기 - 상환방식별 월 상환액·총이자 비교` — 아무도 검색 안 하는 문구. **이 title로 3개월 반 노출 0** (근거: `docs/monetization-pivot-backlog.md` "대출이자 title 진단")
  - 도구 title이 기존 **글 title과 같은 키워드를 물면 안 된다**(자기잠식). 짝 글을 안 쓰는 이유가 이것
- 모바일 우선 표준 준수(숫자 `inputMode`, 16px 입력, 반응형 그리드, 넓은 표 스크롤 래퍼) — 상세: `docs/monetization-pivot-backlog.md`

### 도구 색인 전략 (2026-07-16 전환)

**도구는 도구대로 직접 노출을 노린다.** 진입점 글을 따로 쓰지 않는다.

- `plugins/indexnow/index.js` 가 **글(`src/content/blog/**/index.mdx`) + 도구(`src/pages/tools/*.astro`)** 변경분을 배포 시 IndexNow(Bing·Naver)에 자동 제출한다
- 이전 설계(글만 색인 → 글 타고 도구 유입)는 **폐기**. 진입점 글 `loan-calculator-guide` 가 3개월 반 무노출이었고, 정보성 키워드는 문서 수십만짜리 벽이라 애초에 뜰 수 없다. 반면 tool-intent 키워드는 뚫려 있다(전세 도구 단독 노출 13,420 실증)
- ⚠️ **잘 나가는 도구 페이지의 파일을 수정하지 말 것 — 이제 수정 = 자동 재색인이다.** 수동 요청 시절엔 "요청 안 하면 그만"이었으나 지금은 파일만 건드려도 요청이 나간다. redill 붕괴(잘 나가는 글 편집 + 재색인)가 실수 한 번으로 재현될 수 있다. 현재 보호 대상: `jeonse-loan-calculator`(노출 13,420)
  - `src/data/tools.ts` 변경은 IndexNow를 트리거하지 않는다(diff 대상 아님). 단 렌더 결과는 바뀌므로 측정 교란은 남음
