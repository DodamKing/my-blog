#!/usr/bin/env node
/**
 * SERP 사후 감사 — 발행한 글이 타겟 키워드 1면에 실제로 들었는지 판정한다.
 *
 * 발행 전 지표(judge ✅ 등)와 발행 후 결과 사이의 빠진 고리를 메운다.
 * /api/domains 가 반환하는 1면 도메인 목록에 blog.dimad.kr 이 있는지만 본다.
 *
 * ⛔ 2026-09-06 — 진입률은 `targetKeyword` 가 frontmatter 에 있는 글로만 계산한다.
 *    제목 역추정 키워드는 사람이 검색하지 않는 문자열이라 가짜 성공을 만든다.
 *    08-24 감사의 "1면 진입 9편" 이 전원 역추정이었고, 키워드가
 *    `아이팜 세면대는 수도 연결이 아닙니다` 같은 우리 글 제목 그대로였다.
 *    역추정분은 ~ 로 표시하고 진입률 분모에서 뺀다.
 *
 * 사용: node scripts/pipeline/serp-audit.mjs [--from=YYYY-MM-DD] [--limit=N] [--offset=N]
 *
 * 2026-10-24 — 흡수 판정 모드. 발행 전에 기록한 질문 목록(한 줄에 하나, UTF-8)을 그대로 검색해
 *   우리 도메인이 1면에 뜨는 개수를 센다. 판정선: 5↑ 산다 / 2↓ 죽는다.
 *   node scripts/pipeline/serp-audit.mjs --questions=<파일> [--label=<슬러그>]
 *   ⚠️ 한글 질문을 셸 인자로 넘기지 말 것 — 파일로 넘긴다. `#` 으로 시작하는 줄과 빈 줄은 건너뛴다.
 *   ⚠️ /api/domains 는 도메인만 준다. 1면에 뜬 것이 판정 대상 글이 아니라 우리 다른 글일 수도 있다.
 */
import fs from 'fs';

const OURS = 'blog.dimad.kr';
const API = 'https://keyword-radar-rho.vercel.app/api/domains';
const SECRET = (fs.readFileSync('.env', 'utf8').match(/^AUTH_SECRET=(.*)$/m) || [])[1]?.trim().replace(/^"|"$/g, '');
if (!SECRET) { console.error('AUTH_SECRET 없음'); process.exit(1); }

const arg = (k, d) => (process.argv.find(a => a.startsWith(`--${k}=`)) || `=${d}`).split('=')[1];
const FROM = arg('from', '2026-07-17'), LIMIT = +arg('limit', 10), OFFSET = +arg('offset', 0);
const QUESTIONS = arg('questions', ''), LABEL = arg('label', 'questions');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const domainsOf = async keyword => {
  const r = await fetch(API, { method: 'POST',
    headers: { Authorization: `Bearer ${SECRET}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ keyword }) });
  return r.json();
};

if (QUESTIONS) {
  const qs = fs.readFileSync(QUESTIONS, 'utf8').split(/\r?\n/).map(s => s.trim()).filter(s => s && !s.startsWith('#'));
  console.log(`흡수 판정 — ${LABEL} · 질문 ${qs.length}개\n`);
  console.log('순위 | 샘플 | 질문');
  const out = [];
  for (const q of qs) {
    let res;
    try { res = await domainsOf(q); } catch (e) { console.log(`ERR  |      | ${q} (${e.message})`); out.push({ q, rank: null, error: e.message }); continue; }
    const hit = (res.domains || []).find(d => d.domain === OURS);
    out.push({ q, rank: hit ? hit.rank : null, sampled: res.sampled ?? 0 });
    console.log(`${(hit ? `${hit.rank}위` : '  —').padStart(4)} | ${String(res.sampled ?? '').padStart(4)} | ${q}`);
    await sleep(700);
  }
  const n = out.filter(r => r.rank).length, err = out.filter(r => r.error).length;
  const verdict = n >= 5 ? '✅ 산다 (5↑)' : n <= 2 ? '⛔ 죽는다 (2↓)' : '△ 중간 (3~4)';
  console.log(`\n1면 출현 ${n}/${qs.length} → ${verdict}${err ? ` · ⚠️ 오류 ${err}건` : ''}`);
  fs.mkdirSync('data/serp-audit', { recursive: true });
  const f = `data/serp-audit/${new Date().toISOString().slice(0, 10)}-${LABEL}.json`;
  fs.writeFileSync(f, JSON.stringify(out, null, 2));
  console.log(`저장: ${f}`);
  process.exit(0);
}

// 타겟 키워드는 frontmatter 의 targetKeyword 가 단일 출처다.
// 없는 글(2026-08-24 이전 발행분)만 제목 앞부분에서 역추정한다 — 추정이므로 결과에 ~ 로 표시한다.
const guessFromTitle = title => title.split(/\s*[—–]\s*|\s*\|\s*/)[0].split(/,\s/)[0]
  .replace(/\s*\(.*?\)\s*/g, ' ').replace(/[?!]/g, '').trim();
const targetOf = (slug, title) => {
  try {
    const fm = fs.readFileSync(`src/content/blog/${slug}/index.mdx`, 'utf8').split('---')[1] ?? '';
    const m = fm.match(/^targetKeyword:\s*['"]?(.+?)['"]?\s*$/m);
    if (m) return { kw: m[1], exact: true };
  } catch { /* 파일이 없으면 제목 추정으로 넘어간다 */ }
  return { kw: guessFromTitle(title), exact: false };
};

const posts = [];
for (const l of fs.readFileSync('docs/posts-ledger.md', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^- `([a-z0-9-]+)` \((\d{4}-\d{2}-\d{2})\) — \*\*(.+?)\*\* —/);
  if (m && m[2] >= FROM) posts.push({ slug: m[1], date: m[2], title: m[3], ...targetOf(m[1], m[3]) });
}
const batch = posts.sort((a, b) => a.date.localeCompare(b.date)).slice(OFFSET, OFFSET + LIMIT);
console.log(`대상 ${posts.length}편 중 ${OFFSET}~${OFFSET + batch.length} 판정\n`);
console.log('순위 | 샘플 | 발행일     | 타겟 키워드 → 슬러그');

const out = [];
for (const p of batch) {
  let res;
  try {
    res = await domainsOf(p.kw);
  } catch (e) { console.log(`ERR  |      | ${p.date} | ${p.kw} (${e.message})`); continue; }
  const hit = (res.domains || []).find(d => d.domain === OURS);
  const rank = hit ? hit.rank : null;
  out.push({ ...p, rank, sampled: res.sampled ?? 0 });
  console.log(`${(rank ? `${rank}위` : '  —').padStart(4)} | ${String(res.sampled ?? '').padStart(4)} | ${p.date} | ${p.exact ? '' : '~'}${p.kw} → ${p.slug}`);
  await sleep(700);
}
// 진입률은 실검색어(= frontmatter targetKeyword)만으로 낸다. 역추정분은 참고로만 표시한다.
const real = out.filter(r => r.exact);
const guessed = out.filter(r => !r.exact);
const inTop = real.filter(r => r.rank).length;
console.log(real.length
  ? `
1면 진입 ${inTop}/${real.length} = ${(inTop / real.length * 100).toFixed(0)}%  (targetKeyword 보유분만)`
  : `
1면 진입 판정 불가 — targetKeyword 를 가진 글이 0편이다`);
if (guessed.length) {
  const g = guessed.filter(r => r.rank).length;
  console.log(`참고: 제목 역추정 ${guessed.length}편 중 ${g}편이 1면 — ⚠️ 실검색어가 아니므로 성공으로 세지 않는다`);
}

fs.mkdirSync('data/serp-audit', { recursive: true });
const f = `data/serp-audit/${new Date().toISOString().slice(0, 10)}-${OFFSET}.json`;
fs.writeFileSync(f, JSON.stringify(out, null, 2));
console.log(`저장: ${f}`);
