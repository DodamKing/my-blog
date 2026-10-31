# GA4 Data API 연결 — 글별 트래픽을 캡처 없이 조회하기

2026-10-31 신설. 10-29~30 노출·페이지뷰 급등이 어느 글인지 서치 어드바이저 30일 합계로는 안 보여서 만들었다.

## 왜 필요한가

| 질문 | 어디서 보나 |
|---|---|
| **어느 글이 언제 올랐나** | GA4 (이 문서) — 매일, 스크립트로 |
| **무슨 검색어로 왔나** | 네이버 서치 어드바이저 — 가끔, 캡처로 (GA4 에는 검색어가 안 넘어온다) |

- 사이트에 붙은 GA4 태그(`G-ZZ4KPRB1WV`, `src/components/BaseHead.astro`)는 **보내는 쪽**이다. 읽으려면 아래의 읽기 전용 서비스 계정이 따로 필요하다
- GA4 숫자는 서치 어드바이저 클릭보다 **조금 적다** (광고 차단기, 스크립트 로드 전 이탈)

## 이름 정해둔 것 (그대로 쓴다)

| 항목 | 값 |
|---|---|
| 로그인 구글 계정 | GA4 관리자인 기존 계정 그대로 (새 구글 계정 아님) |
| Google Cloud **프로젝트 이름** | `laon-blog-analytics` |
| Google Cloud **프로젝트 ID** | `laon-blog-analytics` (이미 쓰이고 있으면 `laon-blog-analytics-dimad`) |
| 켤 API | `Google Analytics Data API` |
| **서비스 계정 이름** | `ga4-reader` |
| **서비스 계정 ID** | `ga4-reader` |
| 서비스 계정 설명 | `blog.dimad.kr GA4 읽기 전용 (트래픽 스크립트용)` |
| 서비스 계정 이메일 | `ga4-reader@<프로젝트 ID>.iam.gserviceaccount.com` (자동 생성) |
| 서비스 계정 Cloud 역할 | **없음** (비워둔다) |
| 키 종류 | JSON |
| **키 파일 저장 위치** | `D:\projects\my-blog-2\.secrets\ga4-key.json` (gitignore 처리됨) |
| GA4 에서 줄 역할 | **뷰어** |
| GA4 속성 ID | `.env` 의 `GA4_PROPERTY_ID` 에 기록 |

## 순서

### ① Google Cloud 프로젝트

1. https://console.cloud.google.com 접속
2. 상단 프로젝트 선택 드롭다운 → **새 프로젝트**
3. 프로젝트 이름 `laon-blog-analytics` / 조직 `조직 없음` → **만들기**
4. 만든 뒤 상단 드롭다운에서 **`laon-blog-analytics` 가 선택돼 있는지 확인** (다른 프로젝트에 만들면 꼬인다)

### ② API 켜기

1. 왼쪽 메뉴 **API 및 서비스 → 라이브러리**
2. `Google Analytics Data API` 검색 → 클릭 → **사용**
   - ⚠️ 비슷한 이름의 `Google Analytics Admin API`·`Analytics API` 가 아니다

### ③ 서비스 계정

1. 왼쪽 메뉴 **IAM 및 관리자 → 서비스 계정 → + 서비스 계정 만들기**
2. 이름 `ga4-reader` / ID `ga4-reader` / 설명 `blog.dimad.kr GA4 읽기 전용 (트래픽 스크립트용)` → **만들고 계속하기**
3. 역할 선택 단계 → **아무것도 고르지 않고 계속**
4. 사용자 액세스 권한 단계 → 비워두고 **완료**
5. 목록에서 `ga4-reader@...` 이메일을 **복사해 둔다**

### ④ 키 파일

1. 서비스 계정 목록에서 `ga4-reader` 클릭 → **키** 탭
2. **키 추가 → 새 키 만들기 → JSON → 만들기** → 파일이 다운로드된다
3. 파일 이름을 `ga4-key.json` 으로 바꿔 `D:\projects\my-blog-2\.secrets\` 폴더에 넣는다 (폴더가 없으면 만든다)
   - ⛔ **키 내용을 채팅에 붙여넣지 않는다.** 파일로만 둔다
   - ⚠️ 조직 정책 때문에 "키 생성이 사용 중지됨" 이 뜨면 거기서 멈추고 캡처

### ⑤ GA4 에 뷰어 추가

1. https://analytics.google.com → 왼쪽 아래 **관리**(톱니)
2. **속성** 열 → **속성 액세스 관리** → 오른쪽 위 **+** → **사용자 추가**
3. 이메일에 ③-5 의 `ga4-reader@...` 붙여넣기 / 역할 **뷰어** / "이메일로 신규 사용자에게 알림" **끔** → **추가**
   - 기존 관리자(본인 계정)는 그대로 둔다. 이건 사람이 아니라 스크립트용 열쇠다
   - 뷰어인 이유: 키가 새도 **읽기만** 가능하게

### ⑥ 속성 ID

1. 같은 **관리 → 속성 세부정보**
2. 오른쪽 위 **속성 ID**(숫자 9~10자리) 확인 → 채팅으로 알려준다 (`G-ZZ4KPRB1WV` 는 측정 ID 라 다른 값이다)

## 연결 완료 (2026-10-31)

- 속성 ID `518481785` → `.env` `GA4_PROPERTY_ID`
- 서비스 계정 `ga4-reader@laon-blog-analytics.iam.gserviceaccount.com` · 키 `.secrets/ga4-key.json`

## 사용법 — `npm run traffic` (`scripts/pipeline/ga4-traffic.mjs`)

| 명령 | 보는 것 |
|---|---|
| `npm run traffic` | 최근 2일 vs 직전 14일 일평균 페이지뷰, **증가폭 순** (어제까지) |
| `npm run traffic -- --naver` | 위와 같되 네이버 유입만 |
| `npm run traffic -- --sources` | 최근 기간 유입 출처/매체 |
| `npm run traffic -- --daily=<슬러그 일부>` | 그 글의 날짜별 페이지뷰 (오늘 포함) |
| `--days=N --base=N --top=N` | 기간·표시 개수 조절 |

- ⚠️ 네이버 모바일 검색 유입은 대부분 `naver / organic` 이 아니라 **`m.search.naver.com / referral`** 로 찍힌다 (10-31 실측 272 PV vs 48 PV). 네이버 합산은 `--naver` 로 본다
- ⚠️ Git Bash 에서 `--daily=/` 처럼 `/` 로 시작하는 값은 Windows 경로로 바뀐다. 슬러그 일부로 넘긴다

## 문제 생겼을 때

| 증상 | 원인 |
|---|---|
| `PERMISSION_DENIED` / 403 | ⑤ 뷰어 추가가 안 됐거나 다른 속성에 추가함 |
| `SERVICE_DISABLED` | ② API 를 다른 프로젝트에서 켰음 |
| 키를 잃어버림 / 유출 의심 | ④ 에서 기존 키 **삭제** 후 새 키 발급. 서비스 계정은 그대로 써도 된다 |
