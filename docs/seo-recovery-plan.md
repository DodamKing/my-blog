# 구글 색인 회복 계획

**작성일**: 2026-04-11
**배경**: 2026-01 운영 시작, 110편 작성, 구글 색인 0편. 4월 3일 GSC "Crawled – currently not indexed" 유효성 검사 시작 상태. 네이버는 색인 정상.

## 진단 (2026-04-11 코드 점검 기반)

### 확정된 구조적 문제
1. **About 페이지 부재**
   - `src/pages/_about.astro` 로 저장되어 있어 underscore 접두사 때문에 **라우팅에서 제외됨** (404)
   - 내용도 Astro 템플릿 기본 `Lorem ipsum` 그대로, 수정한 적 없음
   - → 구글 E-E-A-T 판정에서 "저자 불명 사이트" 로 분류됨. `Crawled - not indexed` 의 가장 흔한 원인 중 하나

2. **내부 네비게이션 부재**
   - `Header.astro` 에는 로고만 있음. About / 카테고리 / 태그 링크 0개
   - `Footer.astro` 에는 copyright + 이메일 한 줄만
   - → 110편의 글이 **홈 → 블로그 목록 → 개별 글** 외에는 서로 연결되지 않음. 토픽 클러스터가 내부 링크로 드러나지 않음

3. **블로그 글에 Article schema (JSON-LD) 없음**
   - `layouts/BlogPost.astro` 에 `application/ld+json` 미삽입 (ToolPage.astro 에만 있음)
   - → 구글에게 "이건 기사입니다 / 저자는 X 입니다 / 발행일은 Y 입니다" 라고 구조적으로 말해주는 신호 없음

4. **Footer 이메일 불일치 (버그)**
   - 표시 텍스트: `laonlog@gmail.com`
   - 실제 `mailto:` 링크: `dimad.contact@gmail.com`
   - SEO 영향은 미미하지만 E-E-A-T 신뢰 신호 감점 요인

### 의심되는 복합 신호
- **3개월 110편 = 월 36편 속도** + AdSense + 새 도메인 조합은 구글 스팸 필터에서 **AI 대량 생성 사이트** 패턴으로 분류될 수 있음
- 네이버는 색인해주고 구글만 거부하는 이유는 구글이 훨씬 더 공격적인 품질/권위 필터를 가지고 있기 때문
- 백링크 0 + 저자 정보 0 + 내부 링크 희박 = 구글 입장에서 "색인할 최소 근거 없음"

### 정상인 것
- `robots.txt` (Allow: /, sitemap 명시됨)
- `astro.config.mjs` 의 `site: 'https://blog.dimad.kr'`
- `google-site-verification`, `naver-site-verification` 둘 다 설정됨
- OG 태그, canonical, sitemap-index.xml 모두 정상
- GA4 / AdSense 스크립트 정상

## 회복 계획 (우선순위 순)

### Phase 1: 즉시 수정 (영향 大 / 난이도 小) — 1일 내 완료
목적: 구글에게 "이 사이트는 실재하는 운영자가 있음" 을 구조적으로 증명

1. **About 페이지 부활**
   - `_about.astro` → `about.astro` 로 이름 변경 (라우팅 활성화)
   - Lorem ipsum 내용 전부 교체. 최소 포함:
     - 운영자 이름 또는 일관된 필명
     - 블로그 목적/주제 (health/tech/finance)
     - 연락처 이메일 (Footer와 일치)
     - 프로필 사진 또는 아이콘
     - 운영 시작일
   - 분량은 500~1000자. Lorem ipsum 수준만 벗어나면 됨

2. **Header 네비게이션 추가**
   - `Home / About / Health / Tech / Finance / Tools` 링크 추가
   - 카테고리 링크는 `/blog/category/health` 등 기존 라우팅 활용 (없으면 신설)
   - → 모든 페이지에 About 링크가 생기면서 PageRank 흐름 정상화

3. **Footer 이메일 불일치 수정**
   - 표시 텍스트와 mailto 링크를 일치시킴 (`dimad.contact@gmail.com` 로 통일 권장 — 도메인과 일치)
   - About / RSS / Sitemap 링크 추가

4. **BlogPost.astro 에 Article JSON-LD 추가**
   ```json
   {
     "@context": "https://schema.org",
     "@type": "BlogPosting",
     "headline": "...",
     "datePublished": "...",
     "dateModified": "...",
     "author": { "@type": "Person", "name": "..." },
     "publisher": { "@type": "Organization", "name": "Laon", "url": "https://blog.dimad.kr" },
     "image": "...",
     "mainEntityOfPage": "..."
   }
   ```
   - `BreadcrumbList` schema 도 같이 추가하면 검색 결과 리치 스니펫 가능성 상승

### Phase 2: 2주 내 (영향 大 / 난이도 中)

5. **백링크 1~2개 확보** (구글 색인 전환의 결정적 신호)
   - 네이버 블로그 또는 티스토리 계정에 "외부 블로그 이전" 공지 포스팅 + blog.dimad.kr 링크
   - GitHub 프로필 README 에 블로그 링크
   - 브런치/벨로그에 관련 주제 글 1편 작성하며 본문에 자연스럽게 링크
   - **이것만으로 "Crawled → Indexed" 전환되는 케이스가 가장 많음**

6. **발행 속도 감속**
   - 월 36편 → **월 10~15편 이하** 로 줄임
   - 4월 3일 유효성 검사 결과 나올 때까지는 **수동 색인 요청 중단**
   - 그 시간에 기존 얇은 글 품질 업그레이드

7. **얇은 글 정리** (큰 결정이라 승인 필요)
   - `docs/posts-ledger.md` 리뷰 → 설명이 서로 유사하거나 앵글 겹치는 글 식별
   - 후보: 품질 낮은 글 10~20편 삭제 또는 2~3편을 허브 글로 통합
   - "110편 중 90편" 이 "110편 중 110편" 보다 평균 품질 신호 높음

### Phase 3: 1~2개월 내 (영향 中 / 누적형)

8. **토픽 클러스터 명시적 내부 링크**
   - 같은 카테고리 안에서 주제군을 묶어 허브 글 (overview) + 스포크 글 (detail) 구조로 재편
   - 예: health 71편 → "전동칫솔 전반 가이드" 허브 + 브랜드별 리뷰 스포크 5편 연결
   - 스포크 글끼리도 본문 내 자연스러운 인라인 링크 (CLAUDE.md 규칙 그대로)

9. **카테고리/태그 페이지 강화**
   - 현재 상태 확인 필요. 없으면 신설
   - 각 페이지에 카테고리 설명 (200~300자) + 해당 카테고리 글 목록

10. **Core Web Vitals 점검**
    - GSC > 페이지 경험 탭 확인
    - LCP, CLS, INP 경고 있으면 해결

## 측정 지표

**Phase 1 완료 후 2주 시점** 확인:
- GSC "크롤링됨 - 색인 안됨" 수치 감소 여부
- 4월 3일 유효성 검사 결과 (통과 / 실패)
- 일부 URL 이라도 "유효" 상태로 전환되면 전략 맞음

**Phase 2 완료 후 1개월 시점** 확인:
- 색인 완료 URL 비율 (목표: 30% 이상)
- 노출수 증가 여부
- 네이버 서치 어드바이저 상위 키워드와 구글 색인 글 겹침 여부

## 주의사항

- **4월 3일 유효성 검사 결과 나올 때까지 새 URL 수동 색인 요청 금지**
  - 결과 나오기 전 중복 요청은 큐 혼란만 초래
- Phase 1 작업은 **기존 110편의 URL 을 건드리지 않음** — 렌더링 레이아웃/네비게이션만 변경
- About 페이지 생성 후 구글에 "사이트맵 다시 제출" 한 번 실행
- Phase 1 전체 작업은 0.5~1일 범위. 난이도 낮음. 즉시 착수 가능
