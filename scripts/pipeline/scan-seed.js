/**
 * 시드 키워드 1개 → keyword-radar API 자동 검증 (읽기 전용 조사 도구)
 *
 * 사용법:
 *   npm run scan -- <시드>            콘솔 출력만
 *   npm run scan -- <시드> --queue    docs/research-backlog.md 에 결과 append
 *
 * 환경변수 (.env):
 *   AUTH_SECRET=...   (keyword-radar Bearer 토큰. 커밋 금지)
 *
 * 파이프라인 (순서 고정 — 실측으로 확정됨, 임의 변경 금지):
 *   1. 템플릿 롱테일 생성 (docs/content-strategy.md 승리 패턴 5개 기반)
 *   2. /api/analyze 배치 1회 (가장 쌈 — 반드시 먼저)
 *   3. 게이트 A: 진단 롱테일 볼륨 전멸이면 즉시 킬 (expand·judge 호출 안 함)
 *   4. 게이트 B: 동음이의어 의심 플래그
 *   5. 게이트 C: 헤드 키워드 제외
 *   6. /api/expand (게이트 A 통과 시드만, maxResults 30)
 *   7. /api/analyze (신규 키워드 배치)
 *   7b. /api/domains 슬롯 게이트 (외부 슬롯 < 40% → 거절)
 *   7c. /api/trend 계절 계수 (거절하지 않고 기대치를 깎아 정렬 — 2026-08-27 신설)
 *   8. /api/judge (최종 후보 최대 3개, 순차)
 *   9. 마크다운 표 출력
 *
 * 판정은 서버(/api/judge)가 내린다. 임계값을 재현하지 말 것.
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';

const BASE = 'https://keyword-radar-rho.vercel.app';

// ─── 상수 (승리 패턴 → 결정론적 롱테일 템플릿) ───────────────────────
// docs/content-strategy.md "5가지 승리 패턴" 기반. 시드 + 9개 = 배치 1회(상한 10).
// kind: diagnostic = 게이트 A 판정 대상 (레딜의 실제 승리 키워드 유형)
//       control    = 안티 패턴 대조군. 후보로 승격되지 않음
const LONGTAIL_TEMPLATES = [
  { suffix: '부작용', kind: 'diagnostic', pattern: '5 불안감 진단형' },
  { suffix: '사기', kind: 'diagnostic', pattern: '5 불안감 진단형' },
  { suffix: '효과 없음', kind: 'diagnostic', pattern: '5 불안감 진단형' },
  { suffix: '가품', kind: 'diagnostic', pattern: '1 가품/정품 판별' },
  { suffix: '정품 확인법', kind: 'diagnostic', pattern: '1 가품/정품 판별' },
  { suffix: '차이', kind: 'diagnostic', pattern: '2 차이 비교' },
  // 2026-09-06 추가 — 실사용·고장 축. 기존 9개가 전부 "구매 전 의심" 축이었고,
  // 우리 최대 자산 둘이 그 축이 아니다: 예초기 120클릭은 `줄통 교환방법`(실사용·교체),
  // 레딜 79클릭은 `목아픔`(증상). 비데 시드가 이것 때문에 오판 킬됐다 —
  // 템플릿은 전부 월검색 10 인데 `노즐 청소` 840 / `노즐 안나옴` 540 / `물 안나옴` 480 이었다.
  { suffix: '청소', kind: 'diagnostic', pattern: '실사용·정비' },
  { suffix: '교체', kind: 'diagnostic', pattern: '실사용·정비' },
  { suffix: '안나옴', kind: 'diagnostic', pattern: '실사용·고장' },
  { suffix: '고장', kind: 'diagnostic', pattern: '실사용·고장' },
  { suffix: '분리', kind: 'diagnostic', pattern: '실사용·정비' },
  { suffix: '구입처', kind: 'answer', pattern: '4 단일 답변형' },
  { suffix: '가격', kind: 'answer', pattern: '4 단일 답변형' },
  { suffix: '후기', kind: 'control', pattern: '안티(대조군)' },
];

const ANALYZE_BATCH_MAX = 10; // 실측: 12개에 429 2회
const BATCH_DELAY_MS = 800;
const JUDGE_MAX = 3;
const HEAD_DOC_LIMIT = 20000; // 게이트 C (동적 판단 축 2)
const HOMONYM_RATIO = 100; // 게이트 B
const HOMONYM_DOCS = 500000; // 게이트 B ("제로엔 가격" doc=2,094,384)
const DIAG_VOLUME_FLOOR = 10; // 게이트 A (하드 게이트 4)
// 게이트 3a — 외부 슬롯 비율. 네이버 자사가 1면을 다 먹으면 문서수와 무관하게 못 들어간다.
// 2026-08-24 실측 잠정 경계 (n=8, 성공 2). docs/keyword-algorithm.md "실측 누적" 으로 갱신할 것
const SLOT_FLOOR = 0.4;
const SEASON_FLOOR = 0.7; // 계절 계수 하한 — 미만이면 기대치를 깎는다 (거절은 아님)
const SEASON_BASE_MIN = 0.1; // 전년 M 이 창 최댓값의 이 비율 미만이면 계수 판정 불가 (분모 바닥 가드, 2026-09-15)
const SEASON_HARD = 0.5; // 이 아래는 강한 경고
const NAVER_OWNED = /(^|\.)naver\.com$/;
const EXPAND_MIN_RESULTS = 3; // 3건 이하 = 생태계 없음

// ─── 인증 ───────────────────────────────────────────────────────────
const AUTH_SECRET = process.env.AUTH_SECRET;
if (!AUTH_SECRET) {
  console.error('❌ .env에 AUTH_SECRET을 설정하세요. (keyword-radar Bearer 토큰)');
  process.exit(1);
}

// ─── argv ───────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const queueMode = args.includes('--queue');
const seed = args.filter((a) => !a.startsWith('--')).join(' ').trim();
if (!seed) {
  console.error('사용법: npm run scan -- <시드> [--queue]');
  process.exit(1);
}

// ─── 유틸 ───────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const num = (n) => (typeof n === 'number' ? n.toLocaleString() : '-');

async function post(endpoint, body, { stream = false, timeoutMs = 300000 } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  let res;
  try {
    res = await fetch(`${BASE}${endpoint}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${AUTH_SECRET}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body), // node fetch가 UTF-8 인코딩 — 한글 안전
      signal: ctrl.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    throw new Error(`${endpoint} 호출 실패: ${err.name === 'AbortError' ? '타임아웃' : err.message}`);
  }
  clearTimeout(timer);

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${endpoint} ${res.status}: ${text.slice(0, 300)}`);
  }
  if (stream) return text;
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${endpoint} 응답 JSON 파싱 실패: ${text.slice(0, 300)}`);
  }
}

function checkMetrics(metrics, label) {
  if (metrics && metrics.final_failures) {
    console.warn(
      `⚠️  ${label}: final_failures=${metrics.final_failures} — 결과가 불완전합니다. 수치를 그대로 신뢰하지 마세요.`
    );
  }
}

async function analyzeBatched(keywords, label) {
  const results = [];
  const chunks = [];
  for (let i = 0; i < keywords.length; i += ANALYZE_BATCH_MAX) {
    chunks.push(keywords.slice(i, i + ANALYZE_BATCH_MAX));
  }
  for (const [i, chunk] of chunks.entries()) {
    if (i > 0) await sleep(BATCH_DELAY_MS);
    const t = Date.now();
    const data = await post('/api/analyze', { keywords: chunk });
    console.log(
      `   📊 analyze ${i + 1}/${chunks.length} (${chunk.length}개) — ${((Date.now() - t) / 1000).toFixed(1)}s`
    );
    checkMetrics(data.metrics, `analyze(${label})`);
    results.push(...(data.results || []));
  }
  return results;
}

// ─── 게이트 ─────────────────────────────────────────────────────────
function homonymFlag(row) {
  if (!row) return false;
  return row.competition_ratio > HOMONYM_RATIO || row.document_count > HOMONYM_DOCS;
}

// ─── 메인 ───────────────────────────────────────────────────────────
// 발행 후 노출이 시작되는 구간의 계절 계수.
// 색인~노출에 약 2주 걸리므로(2026-08-10 실측) 지금 쓴 글은 다음 달부터 노출된다.
// /api/trend 에 미래 값이 없으므로 전년 같은 달 패턴으로 대신한다:
//   (전년 M+1, M+2 평균) ÷ (전년 M)
// 2026-08-27 신설 — 추천기가 8월 검색량을 그대로 곱해 에어컨 기대클릭 1,343·1,756 을 냈으나
// 실제 9월은 8월의 절반, 10월은 1/4 이었다. 상세: docs/research-backlog.md 2026-08-27 블록
function seasonFactor(monthly) {
  if (!Array.isArray(monthly)) return null;
  const pts = monthly
    .map((x) => ({
      period: String(x.period ?? x.month ?? ''),
      value: Number(x.ratio ?? x.value),
    }))
    .filter((x) => x.period && Number.isFinite(x.value));
  if (pts.length < 4) return null;
  const nowMonth = new Date().getMonth();
  // 시계열은 오래된 달부터 온다. 이번 달과 월이 같은 첫 점 = 전년 같은 달
  const idx = pts.findIndex((p) => new Date(p.period).getMonth() === nowMonth);
  if (idx < 0 || idx + 2 >= pts.length) return null;
  const base = pts[idx].value;
  if (!base) return null;
  const ahead = (pts[idx + 1].value + pts[idx + 2].value) / 2;
  // 절대값 가드 (2026-09-15) — 분모가 바닥이면 비율이 무의미하다.
  // `선풍기 청소방법` 은 전년 9·10·11 월이 1·1·2 라 계수 150% 로 통과 신호를 냈지만
  // 26-08 이 100 이라 노출 시점 검색이 1/100 이었다. 전년 M 이 창 최댓값의 10% 미만이면 계수를 쓰지 않는다.
  const peak = Math.max(...pts.map((p) => p.value));
  if (peak > 0 && base / peak < SEASON_BASE_MIN) {
    return { factor: null, floor: true, baseShare: base / peak, basePeriod: pts[idx].period.slice(0, 7) };
  }
  return { factor: ahead / base, basePeriod: pts[idx].period.slice(0, 7) };
}

const report = []; // --queue 용 라인 누적
const log = (line = '') => {
  console.log(line);
  report.push(line);
};

async function main() {
  const started = Date.now();
  console.log(`🔍 시드 스캔: "${seed}"${queueMode ? ' (--queue)' : ''}\n`);

  // 1. 템플릿 롱테일 생성
  const longtails = LONGTAIL_TEMPLATES.map((t) => ({ ...t, keyword: `${seed} ${t.suffix}` }));
  console.log(`1️⃣  템플릿 롱테일 ${longtails.length}개 생성 (승리 패턴 기반)`);
  console.log(`   ${longtails.map((l) => l.keyword).join(' / ')}\n`);

  // 2. analyze 배치 1회
  console.log('2️⃣  /api/analyze 배치');
  const batch1 = [seed, ...longtails.map((l) => l.keyword)];
  const rows = await analyzeBatched(batch1, 'seed+longtail');
  const byKw = new Map(rows.map((r) => [r.keyword, r]));
  const find = (kw) => byKw.get(kw) || byKw.get(kw.replace(/\s+/g, '')) || null;

  const seedRow = find(seed);
  if (!seedRow) {
    console.error(`\n❌ 시드 "${seed}" 가 analyze 결과에 없습니다. 키워드 철자를 확인하세요.`);
    process.exit(1);
  }
  console.log('');

  // 4. 게이트 B — 동음이의어 (킬 아님, 플래그)
  const seedHomonym = homonymFlag(seedRow);
  if (seedHomonym) {
    console.log('4️⃣  게이트 B — ⚠️  동음이의어 의심 (시드 자체)');
    console.log(
      `   ⚠️⚠️  "${seed}" 문서수 ${num(seedRow.document_count)} / 경쟁률 ${seedRow.competition_ratio}`
    );
    console.log('   ⚠️⚠️  시드가 다른 주제의 고유명사와 겹칠 가능성이 큽니다. 수치를 이 브랜드의 것으로 읽지 마세요.\n');
  }

  // 3. 게이트 A — 진단 롱테일 볼륨
  const diagnostics = longtails
    .filter((l) => l.kind === 'diagnostic')
    .map((l) => ({ ...l, row: find(l.keyword) }));
  const diagMax = Math.max(0, ...diagnostics.map((d) => d.row?.monthly_searches ?? 0));
  const gateAPassed = diagMax > DIAG_VOLUME_FLOOR;

  console.log('3️⃣  게이트 A — 진단 롱테일 볼륨');
  for (const d of diagnostics) {
    console.log(
      `   ${d.row ? (d.row.monthly_searches > DIAG_VOLUME_FLOOR ? '✅' : '💀') : '❔'} ${d.keyword} — 월검색 ${num(d.row?.monthly_searches)}`
    );
  }
  console.log(
    `   → 진단 롱테일 최대 검색량 ${num(diagMax)} (기준 >${DIAG_VOLUME_FLOOR}): ${gateAPassed ? '통과' : '⚠️ 미달 — 경고만, expand 진행'}\n`
  );

  // 5. 게이트 C 적용 + 후보 구성 (템플릿분)
  const evaluated = [];
  evaluated.push(buildEval(seed, seedRow, { source: '시드', kind: 'seed' }));
  for (const l of longtails) {
    evaluated.push(buildEval(l.keyword, find(l.keyword), { source: '템플릿', kind: l.kind }));
  }

  // ⚫ 2026-09-06 — 게이트 A 의 하드 킬을 제거했다.
  //
  // 템플릿이 전부 "구매 전 의심" 축이었는데 우리 최대 자산 둘이 그 축이 아니다
  // (예초기 = 실사용·교체 / 레딜 = 증상). 그 템플릿 결과로 expand 를 막고 있었고,
  // expand 는 CLAUDE.md 가 "템플릿으로 안 나오는 축을 찾는 유일한 도구" 로 규정한 호출이다.
  // 비데 시드가 실제로 오판 킬됐다 — 템플릿 전부 10 인데 실사용 축은 410~840 이었다.
  // H6(우리 게이트는 사전 거절로 더 많이 잃는다)의 사례이므로 경고로 강등한다.
  //
  // 하드 킬이 남는 곳은 expand 반환 3건 이하(생태계 없음)뿐이고, 그건 실측이지 예측이 아니다.
  if (false) {
    printTable(evaluated, [], '게이트 A 킬 — 클러스터 전체 폐기');
    log('');
    log(
      `**결론: 발행 후보 없음** — 게이트 A 킬. 진단 롱테일 검색량이 전부 ${DIAG_VOLUME_FLOOR} 이하 (최대 ${num(diagMax)}). expand·judge 호출하지 않음.`
    );
    if (seedHomonym) log(`⚠️ 시드 "${seed}" 는 동음이의어 의심 — 문서수 ${num(seedRow.document_count)}.`);
    finish(started);
    return;
  }

  // 6. expand
  console.log('6️⃣  /api/expand (maxResults 30)');
  const tExpand = Date.now();
  const raw = await post('/api/expand', { seed, maxResults: 30 }, { stream: true });
  console.log(`   🌱 expand — ${((Date.now() - tExpand) / 1000).toFixed(1)}s`);

  const doneLine = raw
    .split('\n')
    .filter((l) => l.includes('"type":"done"'))
    .pop();
  if (!doneLine) {
    const errLine = raw.split('\n').filter((l) => l.includes('"type":"error"')).pop();
    throw new Error(`expand 스트림에 done 이벤트가 없습니다. ${errLine ? errLine.slice(0, 200) : ''}`);
  }
  let doneEvent;
  try {
    doneEvent = JSON.parse(doneLine);
  } catch {
    throw new Error('expand done 이벤트 JSON 파싱 실패');
  }
  checkMetrics(doneEvent.metrics, 'expand');
  const expanded = doneEvent.results || [];
  console.log(`   → 연관 키워드 ${expanded.length}건\n`);

  if (expanded.length <= EXPAND_MIN_RESULTS) {
    printTable(evaluated, [], '생태계 없음 — 클러스터 전체 폐기');
    log('');
    log(
      `**결론: 발행 후보 없음** — expand 반환 ${expanded.length}건(기준 >${EXPAND_MIN_RESULTS}). 생태계 없음 → 킬. judge 호출하지 않음.`
    );
    finish(started);
    return;
  }

  // 7. 신규 키워드 analyze
  const known = new Set(evaluated.map((e) => e.keyword));
  const fresh = expanded.map((r) => r.keyword).filter((k) => k && !known.has(k));
  let expandedRows = expanded;
  if (fresh.length > 0) {
    console.log(`7️⃣  /api/analyze — expand 신규 ${fresh.length}개`);
    const more = await analyzeBatched(fresh, 'expand');
    const moreMap = new Map(more.map((r) => [r.keyword, r]));
    expandedRows = expanded.map((r) => moreMap.get(r.keyword) || r);
    console.log('');
  }
  for (const r of expandedRows) {
    if (known.has(r.keyword)) continue;
    evaluated.push(buildEval(r.keyword, r, { source: 'expand', kind: 'expand' }));
  }

  // 8. judge — 최종 후보 최대 3개
  //
  // 2026-09-06 — 정렬 축을 기회점수에서 **문서수 오름차순**으로 바꿨다.
  // 우리가 1면에 든 3건의 문서수가 0 / 1 / 23 이고, 못 든 것들이 135 / 423 / 542 /
  // 1,205 / 1,235 / 5,497 / 5,615 다. 기회점수·검색량 순으로 정렬하면 문서 수십 건짜리
  // 키워드가 목록 바닥에 깔려 한 번도 후보에 오르지 못한다 (0/22 의 구조적 원인).
  //
  // ⚠️ 문서수는 **정렬 기준이지 거절 기준이 아니다.** 하드 컷을 걸면 H6(사전 거절로
  // 더 많이 잃는다)를 반복한다. 계절 계수와 같은 취급이다.
  const docCount = (e) => e.row?.document_count ?? Number.POSITIVE_INFINITY;
  const candidates = evaluated
    .filter((e) => e.candidate)
    .sort((a, b) => docCount(a) - docCount(b)
      || (b.row?.monthly_searches ?? 0) - (a.row?.monthly_searches ?? 0))
    .slice(0, JUDGE_MAX);
  console.log('8️⃣  judge 후보 — 문서수 오름차순 (2026-09-06 변경, 기회점수 순 아님)');
  for (const c of candidates) {
    console.log(`   · ${c.keyword} — 문서 ${c.row?.document_count ?? '?'} · 검색 ${c.row?.monthly_searches ?? '?'}`);
  }

  if (candidates.length === 0) {
    printTable(evaluated, []);
    log('');
    log('**결론: 발행 후보 없음** — 게이트 통과 후보가 없어 judge 호출하지 않음.');
    finish(started);
    return;
  }

  // 7-b. 슬롯 게이트 — 검색량·문서수·경쟁률이 예측 못 하는 "들어갈 자리가 있는가"를 잰다.
  // 2026-08-24 감사: 월검색 1,000↑ 에서 1면 진입 0/13. 문서 423건짜리에도 못 들어갔다.
  // 상세: docs/keyword-algorithm.md
  // ⚫ 2026-09-06 — 슬롯은 거절권을 잃었다. serp-audit 0/9 이고, 예초기 키워드 15개 실측에서
  // 외부 슬롯 85·83·75·70% 인 자리에서도 우리가 전부 없었다. 슬롯은 "자리가 비었나"만 답하고
  // "우리가 딸 수 있나"는 답하지 못한다. 이제 수치만 붙이고 아무도 떨어뜨리지 않는다.
  // 대신 rank1~2 목록을 눈으로 보고 H8(그 의도에 정확히 답하는 네이버 블로그가 있나)을 판단할 것.
  console.log(`7️⃣ b /api/domains — 외부 슬롯 측정 ${candidates.length}개 (참고 수치, 거절하지 않음)`);
  const slotPassed = [];
  for (const c of candidates) {
    let d;
    try {
      d = await post('/api/domains', { keyword: c.keyword }, { timeoutMs: 60000 });
    } catch (err) {
      console.error(`   ❌ domains 실패 (${c.keyword}): ${err.message}`);
      continue;
    }
    const ds = d.domains ?? [];
    const sampled = d.sampled ?? 0;
    const naver = ds.filter((x) => NAVER_OWNED.test(x.domain)).reduce((a, x) => a + x.count, 0);
    const ratio = sampled ? (sampled - naver) / sampled : 0;
    const top3 = ds.filter((x) => x.rank <= 3 && !NAVER_OWNED.test(x.domain)).map((x) => x.domain);
    c.slotRatio = ratio;
    c.top3External = top3;
    // 낮은 슬롯도 떨어뜨리지 않는다 — 30% 로 거절했던 `예초기 줄날 교체법` 이 현 사이트 1위(120클릭)다.
    // 3b 는 자동 판정하지 않는다 — "강한 도메인"은 카테고리 맥락이라 사람이 봐야 한다.
    // judge 는 이들을 tool 버킷으로 통과시킨다(바이알루 실측). 아래 목록을 직접 읽을 것
    const rank12 = ds.filter((x) => x.rank <= 2).map((x) => x.domain);
    console.log(`   · ${c.keyword} — 외부 슬롯 ${(ratio * 100).toFixed(0)}% · rank1~2: ${rank12.join(', ') || '?'} · rank1~3 외부: ${top3.join(', ') || '없음(네이버 독점)'}`);
    slotPassed.push(c);
  }
  console.log('');

  if (slotPassed.length === 0) {
    printTable(evaluated, []);
    log('');
    log('**결론: 발행 후보 없음** — domains 호출이 전부 실패했다. judge 호출하지 않음.');
    finish(started);
    return;
  }

  console.log('   ⚠️  위 rank1~2 를 직접 읽을 것 — 그 키워드 의도에 *정확히* 답하는 blog/cafe.naver 가 있으면 H8 상 ⛔ 다.');
  console.log('');

  // 7c. 계절 게이트 — 거절하지 않고 기대치를 깎아 정렬 순위를 내린다.
  // 슬롯과 같은 취급이다: 게이트가 아니라 정렬 기준. 하드 거절은 08-20 실패 모드
  // ("실패는 발굴이 아니라 사전 거절")를 반복할 위험이 있다.
  console.log(`7️⃣ c /api/trend — 계절 계수 ${slotPassed.length}개`);
  for (const c of slotPassed) {
    let t;
    try {
      t = await post('/api/trend', { keyword: c.keyword }, { timeoutMs: 60000 });
    } catch (err) {
      console.error(`   ⚠️  trend 실패 (${c.keyword}): ${err.message} — 계절 보정 없이 진행`);
      continue;
    }
    const monthly = t.monthly ?? t.results?.[0]?.monthly ?? t.data ?? t.trend ?? [];
    const s = seasonFactor(monthly);
    if (!s) {
      console.log(`   ⚠️  ${c.keyword} — 계절 계수 산출 불가 (시계열 부족)`);
      continue;
    }
    if (s.floor) {
      console.log(
        `   ⏸ ${c.keyword} — 계절 계수 판정 불가: 전년 ${s.basePeriod} 이 창 최댓값의 ` +
          `${(s.baseShare * 100).toFixed(1)}% (분모 바닥). 비율이 무의미하니 곡선을 직접 볼 것`
      );
      await sleep(BATCH_DELAY_MS);
      continue;
    }
    c.seasonFactor = s.factor;
    const pct = (s.factor * 100).toFixed(0);
    if (s.factor < SEASON_HARD) {
      console.log(
        `   ⛔ ${c.keyword} — 계절 계수 ${pct}% (${s.basePeriod} 기준 다음 2개월). ` +
          `발행 후 노출 시점에 검색이 반토막 이하다. 기대치를 이 비율로 깎을 것`
      );
    } else if (s.factor < SEASON_FLOOR) {
      console.log(`   ⚠️  ${c.keyword} — 계절 계수 ${pct}% (하강기). 기대치를 이 비율로 깎을 것`);
    } else {
      console.log(`   ✅ ${c.keyword} — 계절 계수 ${pct}%`);
    }
    await sleep(BATCH_DELAY_MS);
  }
  console.log('');

  console.log(`8️⃣  /api/judge — 최종 후보 ${slotPassed.length}개 (순차)`);
  const judged = [];
  for (const c of slotPassed) {
    const t = Date.now();
    let j;
    try {
      j = await post('/api/judge', { keyword: c.keyword }, { timeoutMs: 90000 });
    } catch (err) {
      console.error(`   ❌ judge 실패 (${c.keyword}): ${err.message}`);
      process.exit(1);
    }
    console.log(`   ⚖️  ${c.keyword} — ${((Date.now() - t) / 1000).toFixed(1)}s`);
    judged.push({ ...c, judge: j });
  }
  console.log('');

  for (const j of judged) {
    const e = evaluated.find((x) => x.keyword === j.keyword);
    e.judge = j.judge;
  }

  printTable(evaluated, judged);

  // judge 근거
  log('');
  log('### 판정 근거 (서버 출력 그대로)');
  log('');
  for (const j of judged) {
    const d = j.judge;
    if (d.ok === false) {
      log(`- **${j.keyword}** — 판정불가 (\`ok:false\`): ${d.error || '사유 미상'} → ✅로 넘겨짚지 말 것. 수동 확인 필요`);
      continue;
    }
    log(`- **${j.keyword}** — ${d.flag} (\`${d.verdict}\`)`);
    log(`  - reasons: ${(d.reasons || []).join(' / ') || '없음'}`);
    log(`  - incumbents: ${(d.incumbents || []).join(', ') || '없음'}`);
    log(`  - signals: ${JSON.stringify(d.signals || {})}`);
  }

  const go = judged.filter((j) => j.judge?.ok !== false && j.judge?.verdict === 'open');
  const soft = judged.filter((j) => j.judge?.ok !== false && j.judge?.verdict === 'soft');
  log('');
  if (go.length > 0) {
    log(
      `**결론: 진행 후보 ${go.length}개** — ${go.map((g) => g.keyword).join(', ')}${soft.length ? ` (추가로 △ ${soft.length}개는 차별화 앵글 확인 후 결정)` : ''}`
    );
  } else if (soft.length > 0) {
    log(
      `**결론: 발행 후보 없음** (✅ 0개). △ ${soft.length}개(${soft.map((s) => s.keyword).join(', ')})는 차별화 앵글이 살아있으면 진행 — WebSearch 수동 확인 필요.`
    );
  } else {
    log('**결론: 발행 후보 없음** — judge 전부 ⛔ 또는 판정불가.');
  }

  finish(started);
}

// ─── 평가 행 구성 ───────────────────────────────────────────────────
function buildEval(keyword, row, { source, kind }) {
  const flags = [];
  let candidate = true;
  let reject = null;

  if (!row) {
    flags.push('❔데이터없음');
    candidate = false;
    reject = '데이터 없음';
    return { keyword, row, source, kind, flags, candidate, reject };
  }

  // 게이트 B는 플래그만 — 킬하지 않는다. 저볼륨 키워드는 경쟁률이 자동으로 치솟아
  // (검색 10 / 문서 2,342 → 156) 동음이의어가 아니어도 걸린다. 의미 확정은 judge가 한다.
  if (homonymFlag(row)) flags.push('⚠️동음이의어의심');

  if (kind === 'control') {
    candidate = false;
    reject = '안티 패턴(대조군)';
  } else if (kind === 'seed') {
    candidate = false;
    reject = 'head 브랜드 키워드(하드 게이트 1)';
  } else if (row.document_count > HEAD_DOC_LIMIT) {
    flags.push('🚫헤드');
    candidate = false;
    reject = `헤드(문서수 ${num(row.document_count)} > ${num(HEAD_DOC_LIMIT)})`;
  }

  return { keyword, row, source, kind, flags, candidate, reject };
}

// ─── 표 출력 ────────────────────────────────────────────────────────
function printTable(evaluated, judged, killReason = null) {
  const judgedSet = new Set(judged.map((j) => j.keyword));
  log('');
  log(`## 시드 스캔 결과 — \`${seed}\``);
  log('');
  log('| 키워드 | 월검색 | 문서수 | 경쟁률 | 플래그 | judge | verdict | 처리 |');
  log('|---|---:|---:|---:|---|---|---|---|');
  for (const e of evaluated) {
    const r = e.row;
    let judgeCol = '-';
    let verdictCol = '-';
    let action = e.candidate ? '보류' : `거절 (${e.reject})`;

    if (judgedSet.has(e.keyword)) {
      const d = e.judge;
      if (!d || d.ok === false) {
        judgeCol = '❓판정불가';
        verdictCol = '`ok:false`';
        action = '거절 (판정불가 — 수동 확인)';
      } else {
        judgeCol = d.flag || d.verdict;
        verdictCol = `\`${d.verdict}\``;
        action =
          d.verdict === 'open' ? '진행' : d.verdict === 'soft' ? '△ 앵글 확인 후 결정' : '거절 (인컴번트 점유)';
      }
    } else if (e.candidate) {
      action = killReason ? `거절 (${killReason})` : `보류 (judge 미호출 — 상위 ${JUDGE_MAX} 밖)`;
    }

    log(
      `| ${e.keyword} | ${num(r?.monthly_searches)} | ${num(r?.document_count)} | ${r?.competition_ratio ?? '-'} | ${e.flags.join(' ') || '-'} | ${judgeCol} | ${verdictCol} | ${action} |`
    );
  }
}

// ─── 마무리 ─────────────────────────────────────────────────────────
function finish(started) {
  console.log('');
  console.log(`⏱️  총 소요 ${((Date.now() - started) / 1000).toFixed(1)}s`);

  if (!queueMode) return;

  const backlog = path.join('docs', 'research-backlog.md');
  if (!fs.existsSync(backlog)) {
    console.error(`❌ ${backlog} 가 없습니다. --queue 를 처리할 수 없습니다.`);
    process.exit(1);
  }
  const stamp = new Date().toISOString().slice(0, 10);
  const block = ['', '---', '', `## 🔎 시드 스캔 — \`${seed}\` (${stamp}, \`npm run scan\`)`, ...report, ''].join('\n');
  fs.appendFileSync(backlog, block, 'utf-8');
  console.log(`📝 ${backlog} 에 결과를 append 했습니다.`);
}

main().catch((err) => {
  console.error(`\n❌ ${err.message}`);
  process.exit(1);
});
