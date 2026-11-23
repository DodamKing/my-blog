# 구글의 사이트 단위 순위 시스템 — 네이버 사이트 전체 급등·급락을 이해하기 위한 비교 모델

> **전체 요약 (한국어)**
> - **구글은 "순위는 기본적으로 페이지 단위지만 사이트 단위 신호·분류기도 쓴다"고 공식 문서에 적고 있다.** 사이트 전체가 한꺼번에 오르내리는 현상은 구글에서는 공식적으로 설명되는 현상이다.
> - 사이트 전체에 걸리는 가장 대표적인 사례는 **Helpful Content 시스템(2022-08 ~ 2024-03)** 이다. 이 시스템은 "사이트 전체 신호(site-wide signal)"였고, 계속 돌아가는 분류기였으며, **도움이 안 되는 콘텐츠가 많을수록 효과가 커졌다.** 제거되는 데에는 **"몇 달에 걸쳐"** 걸린다고 구글이 직접 밝혔다. 노린 대상은 "검색 엔진 우선 콘텐츠"와 "남의 말을 요약할 뿐 가치를 더하지 않는 콘텐츠"였다. 2024-03에 이 시스템은 코어 순위 시스템 안으로 흡수됐다.
> - **우리 사이트와 같은 유형(광고 수익용, 템플릿형 제품·정보 페이지)이 실제로 맞았다.** 2023-09 HCU로 독립 리뷰·정보 사이트가 대거 추락했다(HouseFresh -95% 등). 회복은 드물고 느렸다. HouseFresh는 약 2년 뒤(2025-10 보고)에야 이전 고점을 넘었고, 그 사이 YouTube 등 브랜드 검색을 따로 키웠다. 회복하지 못하고 문을 닫은 곳도 있다(GGRecon).
> - **스팸 정책 "scaled content abuse"(2024-03)** 는 "검색 순위 조작이 주목적"인 대량 페이지 생성을 가리킨다. 자동 생성이든 사람이 만들었든 상관없다. **템플릿 유사성 자체가 아니라 목적(사용자 가치 없이 순위용인가)이 기준이다.** 네이버의 "동일·유사 템플릿 대량 발행" 스팸 규정과 개념이 겹친다.
> - **"하룻밤 계단형" 변화**는 구글에서는 코어 업데이트(연 3~4회, 출시 2~3주)와 스팸 업데이트(며칠~4주) 출시로 설명된다. 구글은 회복 역시 "다음 코어 업데이트까지 기다려야 할 수 있다"고 말한다.
> - **2024 API 유출**에는 siteAuthority, hostAge(신규 스팸 샌드박스), NavBoost(13개월 클릭 로그), chromeInTotal(사이트 단위 Chrome 조회), siteFocusScore/siteRadius(주제 집중도), smallPersonalSite 같은 **사이트 단위 피처 이름이 실재한다.** 다만 가중치와 사용 방식은 알 수 없다. 구글은 문서가 진짜라고 인정하면서도 "맥락 없고 낡았거나 불완전한 정보"라고 경고했다.
> - **⚠️ 유추의 한계**: 네이버가 같은 구조라는 근거는 없다. 아래 내용은 "이런 종류의 시스템이 존재할 수 있다"는 참고 모델일 뿐이다.

## 1. Helpful Content 시스템 (2022–2024, 2024-03 코어로 흡수) — 사이트 전체 분류기의 작동·대상·회복 기간

### Takeaway
HCU는 구글이 공식적으로 "사이트 전체 신호"라고 부른 분류기였다. 계속 돌아갔고, 비중이 가중됐으며(도움 안 되는 콘텐츠가 많을수록 강하게 걸림), 회복에는 "몇 달"이 걸렸다. 2024-03 코어로 흡수된 뒤에는 "페이지 단위가 기본, 사이트 단위 신호도 사용"이라는 서술로 바뀌었다. 구글 쪽 인정도 있다. 2024-09 시점까지 HCU 피해 사이트는 "대체로 완전히 돌아오지 못했다".

### Cited Findings
- **(공식, 2022-08)** "This update introduces a new **site-wide signal** that we consider among many other signals for ranking web pages." — [Google Search Central Blog, 2022-08 helpful content update](https://developers.google.com/search/blog/2022/08/helpful-content-update)
- **(공식, 2022-08)** "Our classifier for this update **runs continuously**, allowing it to monitor newly-launched sites and existing ones." — 같은 출처
- **(공식, 2022-08)** "Sites identified by this update may find the signal applied to them **over a period of months**." — 같은 출처
- **(공식, 2022-08)** "The signal is also **weighted**; sites with lots of unhelpful content may notice a stronger effect." — 같은 출처
- **(공식, 2022-08) 대상**: "content created primarily for search engine traffic is strongly correlated with content that searchers find unsatisfying". 자가 점검 질문 중 하나는 "Are you mainly summarizing what others have to say without adding much value?" — 같은 출처
- **(공식, 2024-03)** 코어 업데이트와 함께 "we have enhanced our core ranking systems to show more helpful results… There's **no longer one signal or system** used to do this." — [Google Search Central Blog, 2024-03 core update & spam policies](https://developers.google.com/search/blog/2024/03/core-update-spam-policies)
- **(공식, 현행 문서)** Helpful content 시스템은 "Announced in 2022… In March 2024, it evolved and became part of our core ranking systems." 현행 서술은 "Our ranking systems are designed to work on the **page level**" + "**Site-wide signals and classifiers are also used** and contribute to our understanding of pages" + "Having some good site-wide signals does not mean that all content from a site will always rank highly." — [Google ranking systems guide](https://developers.google.com/search/docs/appearance/ranking-systems-guide); [Helpful content FAQ](https://developers.google.com/search/help/helpful-content-faq)
- **(공식, 2024-03~04)** 구글은 2024-03 코어 업데이트와 스팸 정책으로 저품질·비독창적 결과를 40% 줄이겠다고 예고했다. 2024-04-19 출시를 마친 뒤 실제 수치는 **45% 감소**였다고 밝혔다. — [Google blog (Elizabeth Tucker), 2024-03-05 + 업데이트](https://blog.google/products/search/google-search-update-march-2024/); 출시 기간 45일(03-05~04-19) — [Search Engine Land](https://searchengineland.com/google-march-2024-core-update-rollout-is-now-complete-438713)
- **(구글 담당자 발언, 2024-02)** Danny Sullivan: 분류기는 항상 돌지만 "that does not mean, that if you fix your content today, your site will recover tomorrow". 이후 "몇 주 안에 변화를 볼 수도 있다(보장은 아님)"고 보완했다. — [Search Engine Roundtable](https://www.seroundtable.com/google-recovery-timing-helpful-content-update-36875.html); [후속 기사](https://www.seroundtable.com/google-recovery-timing-helpful-content-update-36917.html)
- **(구글 담당자 발언, 2024-06)** 코어 업데이트 피해 사이트는 시스템이 개선을 판단하면 다음 코어 업데이트에서 변화를 볼 수 있다. — [SER: recover with next core update](https://www.seroundtable.com/google-hcu-recovery-next-core-update-37548.html)
- **(구글 담당자 발언, 2024-09 인터뷰)** 2024-08 코어 업데이트에 대해 Sullivan은 "the changes have helped some of those sites but generally have **not brought those sites all the way back up**", "you can't predict that every site will recover to exactly where they were in September"라고 말했다. 동시에 "The ranking systems are not site specific… We're not going through and boosting a particular site or lowering particular site"라고도 했다. — [SER interview, 2024-09-06](https://www.seroundtable.com/interview-google-august-core-update-38024.html)
- **(업계 해석)** Marie Haynes(2024-03-26): 2024-03 이후 "helpfulness is determined primarily on the page level by Google's core systems". 구글 원문 인용이 아니라 해석이다. — [Marie Haynes](https://www.mariehaynes.com/the-helpful-content-system-has-changed/)

### Inferences
- 우리 사례(외부 변경 없이 하룻밤에 사이트 전체 ×3, 한 달 뒤 -85%)는 "사이트 단위 분류기 값이 바뀌어 모든 페이지에 곱해지는" 모델과 모양이 같다. HCU식 가중 신호라면 "도움 안 되는 콘텐츠 비율"이 클수록 효과가 강해진다. 템플릿형 글이 다수인 사이트는 이런 신호에 취약할 가능성이 있다(추론).
- 구글 공식 서술에서 회복은 "몇 달" 단위이고 보통 다음 대형 업데이트 시점에 계단식으로 반영된다. 따라서 급락 직후 며칠~몇 주 안에 글을 수정해 회복을 기대하는 것은 구글 모델 기준으로 근거가 약하다.

### Gaps
- HCU 분류기의 구체적 입력값(비율 임계 등)은 공개되지 않았다.
- 2024-03 이후 "사이트 단위 helpfulness 신호"가 남아 있는지 구글은 명확히 말하지 않았다. 현행 문서는 "site-wide signals and classifiers are also used"라는 일반 서술뿐이다.

## 2. 스팸 정책: Site reputation abuse · Scaled content abuse · Expired domain abuse (2024-03) — 템플릿형 대량 페이지가 해당하나

### Takeaway
2024-03-05에 세 정책이 신설됐다. scaled content abuse는 "순위 조작이 주목적인 대량 페이지 생성"이며 제작 방식(AI·사람·혼합)과 무관하다. 템플릿 자체가 위반은 아니고 기준은 목적과 사용자 가치다. 정책 위반은 자동 시스템(SpamBrain 등)과 수동 조치 양쪽으로 처리되고, 사이트 일부 또는 전체가 내려갈 수 있다.

### Cited Findings
- **(공식, 2024-03-05) Scaled content abuse**: "many pages are generated for the primary purpose of manipulating Search rankings and not helping users". 자동화든 사람이든 둘 다든 적용된다. — [Google Search Central Blog 2024-03](https://developers.google.com/search/blog/2024/03/core-update-spam-policies)
- **(공식, 현행 스팸 정책)** scaled content abuse 예시: 생성형 AI 등으로 "generate many pages without adding value for users", 피드·검색결과 스크래핑으로 대량 페이지 생성, 여러 출처를 이어 붙이되 가치를 더하지 않는 것(stitching), 대량성을 감추려고 여러 사이트를 만드는 것. — [Google spam policies](https://developers.google.com/search/docs/essentials/spam-policies)
- **(공식) Site reputation abuse**: 제3자 콘텐츠가 호스트 사이트의 기존 순위 신호를 이용하려고 게시되는 경우. "Having third-party content alone isn't inconsistent with the site reputation policy". 2024-05-05 시행. EEA 밖에서는 수동 조치 대상. — [spam policies](https://developers.google.com/search/docs/essentials/spam-policies); [2024-03 blog](https://developers.google.com/search/blog/2024/03/core-update-spam-policies)
- **(업계 보도, 2024-11)** 구글은 site reputation abuse 정책을 넓혀, 제1자 관여 여부와 관계없이 호스트 순위를 이용하려는 모든 제3자 콘텐츠로 적용 범위를 확대했다. 집행은 주로 수동 조치였다. 알고리즘 집행은 "향후 계획"으로 보도됐고, 출시 확인은 찾지 못했다. — [SEJ](https://www.searchenginejournal.com/google-confirms-no-algorithmic-actions-for-site-reputation-abuse-yet/517337); [Marie Haynes](https://www.mariehaynes.com/site-reputation-abuse-policy)
- **(공식) Expired domain abuse**: "an expired domain name is purchased and repurposed primarily to manipulate Search rankings". 예시로 옛 정부기관 도메인에 제휴 콘텐츠를 올리는 경우, 옛 학교 도메인에 카지노 콘텐츠를 올리는 경우가 있다. — [spam policies](https://developers.google.com/search/docs/essentials/spam-policies)
- **(공식) 사이트 단위 조치 가능성**: "Sites that violate our policies may rank lower in results or not appear in results at all". 정책 우회 시 "taking broader action… removing more sections of a site". 탐지는 "automated systems and, as needed, human review that can result in a manual action". — [spam policies](https://developers.google.com/search/docs/essentials/spam-policies)

### Inferences
- 우리 사이트처럼 비슷한 템플릿의 제품·브랜드 정보 페이지를 대량 발행하는 경우, 구글 정의상 쟁점은 "템플릿 사용"이 아니다. 쟁점은 "각 페이지가 사용자에게 더하는 가치가 있는가, 아니면 키워드 자리를 채우려는 것인가"다. 경계 판정은 자동 분류기가 하므로 의도와 무관하게 걸릴 수 있다(추론).
- 네이버 스팸 정책의 "동일·유사 템플릿 대량 발행" 조항(프로젝트 09-20 조사 기록)과 개념상 가장 가까운 구글 정책이 scaled content abuse다.

### Gaps
- scaled content abuse가 알고리즘으로 걸렸을 때 "사이트 전체"에 적용되는지 "해당 페이지들"에만 적용되는지 구글은 명시하지 않았다.
- 템플릿 유사도에 대한 정량 기준은 공개되지 않았다.

## 3. 코어 업데이트: 사이트 단위 vs 페이지 단위, 하룻밤 계단형 변화, 주기

### Takeaway
코어 업데이트는 특정 사이트를 겨냥하지 않는 "광범위한 변경"이라고 구글은 설명한다. 그러면서도 큰 하락 시에는 "사이트 전체를 보라"고 권한다. 대형 코어 업데이트는 연 3~4회 공지되고 출시에 약 2~3주가 걸린다. 공지 없는 작은 코어 업데이트도 계속 있다. 회복은 "몇 달" 걸리거나 다음 코어 업데이트를 기다려야 할 수 있다.

### Cited Findings
- **(공식)** "These changes are broad in nature, and don't target specific sites or individual web pages." 큰 하락 시 "Take a close look at your site as a whole". 회복은 "Some changes can take effect in a few days" ~ "it could take several months for our systems to learn and confirm". "If it's been a few months… that could mean waiting until the next core update." "We're continually making updates… including smaller core updates." — [Google: core updates and your website](https://developers.google.com/search/updates/core-updates)
- **(공식, 현행 문서)** 같은 사이트는 상위 결과에 보통 2개를 넘겨 노출되지 않는다(site diversity). 유효한 법적 삭제 요청이 대량으로 들어온 사이트는 다른 콘텐츠도 강등된다. 사이트 단위 강등 메커니즘이 공식적으로 존재한다는 예다. — [ranking systems guide](https://developers.google.com/search/docs/appearance/ranking-systems-guide)
- **(업계 집계) 2025~2026 확인된 업데이트**: 2025-03-13~03-27 코어 / 2025-06-30~07-17 코어 / 2025-08-26~09-21 스팸 / 2025-12-11~12-29 코어 / 2026-02-05 Discover 코어(미국 영어 시작) / 2026-03-24~25 스팸 / 2026-03-27~04-08 코어 / 2026-05-21~06-02 코어 / 2026-06-24~26 스팸 / 2026-08-18~21 스팸 / 2026-09-24 스팸 / 2026-11-10 코어(출시 중, "최대 2주"). 이 페이지에는 내부 불일치(갱신일 표기와 항목 불일치, 2025-08 항목의 제목·본문 불일치)가 있으므로 Google Search Status Dashboard로 확인이 필요하다. — [SEJ Google algorithm history](https://www.searchenginejournal.com/google-algorithm-history/)
- **(구글 담당자 발언, 2025)** John Mueller: 코어 업데이트는 장기 데이터에 기반한다(SEJ 헤드라인 수준 인용). — [SEJ algorithm history](https://www.searchenginejournal.com/google-algorithm-history/)

### Inferences
- 구글의 "하룻밤 계단형" 변화는 (a) 업데이트 출시 중 사이트 단위 신호가 다시 계산되거나 (b) 재학습된 분류기가 배포되는 시점에 생긴다. 출시가 2~3주에 걸쳐도 개별 사이트는 특정 하루에 계단을 겪는 일이 흔하다(업계 관찰, 정량 출처는 미확보).
- 우리 사례의 "3배 → 한 달 뒤 -85%"는 구글에서 흔히 보고되는 "코어 업데이트에서 오름 → 다음 업데이트나 재조정에서 되돌림" 패턴과 모양이 비슷하다. 다만 네이버의 업데이트 일정은 공개되지 않아 대조할 수 없다.

### Gaps
- "계단형 하루 변화"의 메커니즘(신호 일괄 갱신 vs 점진 배포)에 대한 구글의 공식 설명은 찾지 못했다.

## 4. 2024 API 유출(Content Warehouse)이 말하는 사이트 단위 피처

### Takeaway
2024-05 유출 문서에는 siteAuthority, hostAge, NavBoost 클릭 필드, chromeInTotal, siteFocusScore/siteRadius/siteEmbedding, smallPersonalSite 같은 사이트 단위 속성 이름이 존재한다. 구글은 문서가 진짜임을 인정했다. 다만 점수 함수와 가중치가 없어서 "존재 = 순위 요소"라고 볼 수는 없다.

### Cited Findings
- **(유출 해석, iPullRank 2024-05-27)** 코드는 2024-03-27에 올라갔다가 05-07에 삭제됐다고 보도됐다. 저자 스스로 "I do not have a complete picture", "We do not know how features are weighted"라고 단서를 달았다. — [iPullRank, Mike King](https://ipullrank.com/google-algo-leak)
- **siteAuthority**: 문서별 Compressed Quality Signals에 저장된다. Q* 시스템에서 쓰인다고 해석됐다. 구글은 그동안 "website authority score"를 쓰지 않는다고 말해 왔다. — [iPullRank](https://ipullrank.com/google-algo-leak); 영향은 알 수 없다는 평가 — [Ahrefs](https://ahrefs.com/blog/google-documents-leaked-seos-are-making-some-wild-assumptions)
- **hostAge**: PerDocData에 있고 "to sandbox fresh spam in serving time"라고 기술돼 있다. 구글의 샌드박스 부인과 대비된다. 좁게 읽으면 "신규 스팸" 한정이다. — [iPullRank](https://ipullrank.com/google-algo-leak); [Search Engine Land](https://searchengineland.com/unpacking-googles-massive-search-documentation-leak-442716)
- **NavBoost**: 클릭 로그 기반 재순위. goodClicks/badClicks/lastLongestClicks 필드가 있다. 법정 증언에 따르면 최근 13개월 데이터를 쓰며 이전에는 18개월이었다. — [iPullRank](https://ipullrank.com/google-algo-leak); Pandu Nayak 증언 요약: NavBoost는 지난 13개월 쿼리 클릭을 기억하고, 클릭이 없는 문서에는 도움이 안 되는 "하나의 신호"이며, Glue는 NavBoost의 짝(유니버설 검색 기능용)이다 — [Search Engine Land via gwern archive](https://gwern.net/doc/www/searchengineland.com/5d9484dd037e4fc7a992fcb217afc42406b42c86.html); [DOJ exhibit](https://www.justice.gov/d9/2023-11/418021.pdf)
- **chromeInTotal**: "Site-level Chrome views". — [iPullRank](https://ipullrank.com/google-algo-leak)
- **siteFocusScore / siteRadius / siteEmbedding**: 사이트가 한 주제에 얼마나 집중하는지, 개별 페이지 임베딩이 사이트 임베딩에서 얼마나 벗어나는지를 잰다. — [iPullRank](https://ipullrank.com/google-algo-leak)
- **smallPersonalSite**: "small personal site" 관련 점수 필드다. 정의가 없고 가산인지 감산인지 불명이다. — [iPullRank](https://ipullrank.com/google-algo-leak); [Search Engine Land](https://searchengineland.com/unpacking-googles-massive-search-documentation-leak-442716)
- **Panda**: 독립 링크와 참조 쿼리 비율에 기반한 수정자가 도메인·하위도메인·하위디렉터리 단위로 적용된다는 특허와 연결해 해석됐다. 유출 문서상 롤링 윈도 갱신일 가능성도 제기됐다. — [iPullRank](https://ipullrank.com/google-algo-leak)
- **(공식 대응, 2024-05)** 구글 대변인(Davis Thompson): 문서는 진짜라고 인정하면서 "We would caution against making inaccurate assumptions about Search based on out-of-context, outdated, or incomplete information." — [MediaPost](https://www.mediapost.com/publications/article/396445/google-says-leaked-search-docs-are-real-but-cauti.html); [Search Engine Land](https://searchengineland.com/google-responds-to-leak-documentation-lacks-context-442705)
- **(업계 경고)** Mark Williams-Cook: "Just because something is referenced in the API leak doesn't mean it's a ranking factor." — [Search Engine Land 요약 경유](https://searchengineland.com/google-search-documentation-leak-ranking-442617)

### Inferences
- NavBoost(클릭) + chromeInTotal(사이트 방문) 구조는 프로젝트 09-20 조사에서 확인한 네이버 공식 진술("이용자들이 잘 방문하지 않는 사이트보다 선호하는 웹사이트의 문서를 더 빨리 발견해 수집")과 같은 계열의 "트래픽 피드백 루프"다. 사이트 단위 사용자 신호가 순위를 증폭하는 모델이 구글 쪽에는 근거가 있다(추론. 네이버 내부 구조 확인은 불가).
- siteFocusScore/siteRadius가 실제로 쓰인다면, 건강·가전·화장품·게임 등 소재가 넓게 흩어진 사이트는 주제 집중도가 낮게 측정될 수 있다(추론).

### Gaps
- 각 피처의 가중치, 실제 사용 여부, 갱신 주기는 유출 문서에 없다.
- "siteFocusScore"의 구체 정의는 2차 해석(iPullRank)만 확인했고 원문 정의는 확보하지 못했다.

## 5. 링크(PageRank)와 사이트 권위 — 구글 공식 입장

### Takeaway
구글은 PageRank가 진화했지만 여전히 코어 시스템의 일부라고 공식 문서에 적고 있다. 동시에 Gary Illyes는 2023-10에 "링크는 상위 3대 신호가 아니다"라고 말했다. 유출 문서에는 링크 출처 품질 등급(sourceType)과 홈페이지 신뢰도 같은 링크 기반 사이트 신호가 보인다.

### Cited Findings
- **(공식)** "How PageRank works has evolved a lot since then, and it continues to be part of our core ranking systems." — [ranking systems guide](https://developers.google.com/search/docs/appearance/ranking-systems-guide)
- **(구글 담당자, 2023-10 PubCon)** Gary Illyes는 링크를 "top three ranking signals"에 넣지 않겠다고 했고, 보편적 top 3는 없다고 했다. 링크 없이 사이트맵만으로 발견된 페이지가 1위를 한 사례도 들었다. — [Search Engine Land](https://searchengineland.com/links-google-search-ranking-factor-gary-illyes-432422); [SER](https://www.seroundtable.com/google-links-no-longer-a-top-three-ranking-factor-36094.html)
- **(구글 담당자, 2024)** Illyes가 "Google needs very few links"라고 말했다가 "I shouldn't have said that"이라고 정정했다. — [SEJ](https://www.searchenginejournal.com/google-needs-very-few-links/514494/)
- **(유출 해석)** sourceType(링크 출처 페이지 품질 등급 high/medium/low), homepagePagerankNs(신규 페이지의 대리 PageRank로 홈페이지 PageRank 사용), homePageInfo(NOT_TRUSTED~FULLY_TRUSTED), 링크 스팸 속도 필드가 있다. — [iPullRank](https://ipullrank.com/google-algo-leak)

### Inferences
- 구글 모델에서 "사이트 권위"는 단일 점수로 공식 인정된 적이 없다. 그러나 링크 그래프(홈페이지 PageRank 상속)와 사용자 신호가 사이트 단위로 작동한다는 정황은 강하다. 외부 링크가 적은 개인 블로그는 이 축이 약할 가능성이 크다(추론).

### Gaps
- 구글이 "site authority"라는 용어를 공식적으로 정의한 문서는 찾지 못했다.

## 6. 소규모 퍼블리셔의 회복 사례와 기간

### Takeaway
2023-09 HCU 피해 독립 사이트 중 확인된 회복은 드물고 길었다. HouseFresh는 -95%에서 약 2년 뒤(2025-10 보고) 이전 고점을 넘었다. 그 사이 디자인·UX·콘텐츠를 계속 개선했고 YouTube로 브랜드 검색을 키웠다. 회복하지 못하고 폐업한 사례(GGRecon)와 장기 미회복 사례(Test Coches, 호주 라이프스타일 매체)도 있다. Retro Dodo 관련 1차 자료는 찾지 못했다.

### Cited Findings
- **HouseFresh**: 2023-09 HCU로 구글 트래픽 -95%(일 4,000 → 약 200). 약 2년간 디자인·UX·콘텐츠를 개선했고 YouTube 채널을 키웠다(Linus Tech Tips 협업 → 브랜드 검색 증가). 2025-10-11 Gisele Navarro가 HCU 이전 고점을 넘었다는 가시성 데이터를 공개했다. 특정 업데이트를 회복 원인으로 확정하지 않았고, 운영자는 "algorithm updates"와 site reputation abuse 정책을 언급했다. — [PPC Land, 2025-10](https://ppc.land/housefresh-achieves-notable-traffic-recovery-after-google-algorithm-impacts-2/) (2차 보도, 1차 원문은 미확인)
- **Test Coches(스페인)**: 2023-09 이후 월 300만 독자를 잃었고 회복 보고가 없다. **GGRecon(영국 게임)**: 회복하지 못하고 폐업. **호주 라이프스타일 매체**: 월 800만 → 30만 UV, 회복에 20만 달러를 썼지만 의미 있는 개선이 없었다. — 같은 출처
- **(업계 보도, 2024 중반)** HCU 피해 사이트 중 회복 사례가 거의 없었다는 보도. — [SER helpful content recoveries](https://www.seroundtable.com/google-helpful-content-update-recoveries-37920.html)
- **(구글, 2024-09)** 2024-08 코어 업데이트가 일부 HCU 피해 사이트를 도왔지만 대체로 완전 회복은 아니었다(1번 항목 참조). — [SER interview](https://www.seroundtable.com/interview-google-august-core-update-38024.html)
- **(업계 보도)** 2025-06 코어 업데이트에서 "예상치 못한 회복" 사례들이 보고됐다. — [SER June 2025 recoveries](https://www.seroundtable.com/google-june-2025-core-update-recoveries-39735.html); [PPC Land](https://ppc.land/google-june-2025-core-update-brings-unexpected-recoveries-after-16-day-rollout/). 2025-12 코어 업데이트 회복 사례 4곳도 보도됐다. — [SEJ](https://searchenginejournal.com/4-sites-that-recovered-from-googles-december-2025-core-update/567960/) (본문 미확인)
- **(업계 일반론)** 코어 업데이트 회복에는 흔히 업데이트 주기 1~3회가 걸린다. — [Search Engine Land guide](https://searchengineland.com/guide/google-core-updates) 경유 검색 요약 (정량 근거 약함)

### Inferences
- 구글 사례 기준으로 사이트 단위 분류기에 걸린 소형 사이트의 회복은 "수개월~2년"이다. 회복된 사이트는 검색 밖 신호(브랜드 검색, YouTube 등)를 함께 키운 경우가 눈에 띈다. 이는 NavBoost/Chrome 같은 사용자·브랜드 신호 모델과 정합적이다(추론, 인과 미확인).

### Gaps
- Retro Dodo 사례의 1차 자료를 찾지 못했다(검색 결과에 해당 이름 없음).
- 2025-06, 2025-12 회복 사례 기사의 본문(어떤 유형 사이트가 무엇을 바꿨는지)은 확인하지 못했다.
- 템플릿형 제품 정보 + AdSense 사이트가 구글 업데이트로 맞았다는 정량 집계(유형별 피해율)는 찾지 못했다.
