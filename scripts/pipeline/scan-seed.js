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
    `   → 진단 롱테일 최대 검색량 ${num(diagMax)} (기준 >${DIAG_VOLUME_FLOOR}): ${gateAPassed ? '통과' : '킬'}\n`
  );

  // 5. 게이트 C 적용 + 후보 구성 (템플릿분)
  const evaluated = [];
  evaluated.push(buildEval(seed, seedRow, { source: '시드', kind: 'seed' }));
  for (const l of longtails) {
    evaluated.push(buildEval(l.keyword, find(l.keyword), { source: '템플릿', kind: l.kind }));
  }

  if (!gateAPassed) {
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
  const candidates = evaluated
    .filter((e) => e.candidate)
    .sort((a, b) => (b.row?.opportunity_score ?? 0) - (a.row?.opportunity_score ?? 0))
    .slice(0, JUDGE_MAX);

  if (candidates.length === 0) {
    printTable(evaluated, []);
    log('');
    log('**결론: 발행 후보 없음** — 게이트 통과 후보가 없어 judge 호출하지 않음.');
    finish(started);
    return;
  }

  console.log(`8️⃣  /api/judge — 최종 후보 ${candidates.length}개 (순차)`);
  const judged = [];
  for (const c of candidates) {
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
