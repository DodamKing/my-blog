#!/usr/bin/env node
/**
 * SERP 사후 감사 — 발행한 글이 타겟 키워드 1면에 실제로 들었는지 판정한다.
 *
 * 발행 전 지표(judge ✅ 등)와 발행 후 결과 사이의 빠진 고리를 메운다.
 * /api/domains 가 반환하는 1면 도메인 목록에 blog.dimad.kr 이 있는지만 본다.
 *
 * 사용: node scripts/pipeline/serp-audit.mjs [--from=YYYY-MM-DD] [--limit=N] [--offset=N]
 */
import fs from 'fs';

const OURS = 'blog.dimad.kr';
const API = 'https://keyword-radar-rho.vercel.app/api/domains';
const SECRET = (fs.readFileSync('.env', 'utf8').match(/^AUTH_SECRET=(.*)$/m) || [])[1]?.trim().replace(/^"|"$/g, '');
if (!SECRET) { console.error('AUTH_SECRET 없음'); process.exit(1); }

const arg = (k, d) => (process.argv.find(a => a.startsWith(`--${k}=`)) || `=${d}`).split('=')[1];
const FROM = arg('from', '2026-07-17'), LIMIT = +arg('limit', 10), OFFSET = +arg('offset', 0);

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

const sleep = ms => new Promise(r => setTimeout(r, ms));
const out = [];
for (const p of batch) {
  let res;
  try {
    const r = await fetch(API, { method: 'POST',
      headers: { Authorization: `Bearer ${SECRET}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword: p.kw }) });
    res = await r.json();
  } catch (e) { console.log(`ERR  |      | ${p.date} | ${p.kw} (${e.message})`); continue; }
  const hit = (res.domains || []).find(d => d.domain === OURS);
  const rank = hit ? hit.rank : null;
  out.push({ ...p, rank, sampled: res.sampled ?? 0 });
  console.log(`${(rank ? `${rank}위` : '  —').padStart(4)} | ${String(res.sampled ?? '').padStart(4)} | ${p.date} | ${p.exact ? '' : '~'}${p.kw} → ${p.slug}`);
  await sleep(700);
}
const inTop = out.filter(r => r.rank).length;
console.log(`\n1면 진입 ${inTop}/${out.length} = ${(inTop / out.length * 100).toFixed(0)}%`);
fs.mkdirSync('data/serp-audit', { recursive: true });
const f = `data/serp-audit/${new Date().toISOString().slice(0, 10)}-${OFFSET}.json`;
fs.writeFileSync(f, JSON.stringify(out, null, 2));
console.log(`저장: ${f}`);
