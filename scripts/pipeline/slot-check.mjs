#!/usr/bin/env node
/**
 * 외부 슬롯 게이트 — 네이버 자사가 1면을 얼마나 먹는지 본다.
 * docs/keyword-algorithm.md 게이트 3번. 검색량·문서수·경쟁률이 예측 못 하는 진입 가능성을 잰다.
 * 사용: node scripts/pipeline/slot-check.mjs "키워드1" "키워드2" ...
 */
import fs from 'fs';
const SECRET = (fs.readFileSync('.env', 'utf8').match(/^AUTH_SECRET=(.*)$/m) || [])[1].trim().replace(/^"|"$/g, '');
const NAVER = /(^|\.)naver\.com$/;
const THRESHOLD = 0.40; // 잠정 경계 (n=8). 실측 누적으로 고칠 것
// 최소 표본 가드 (2026-09-03 신설) — 표본이 작으면 비율을 판정에 쓸 수 없다.
// 표본이 작다는 것은 "외부가 앉을 자리 자체가 적다"는 뜻이기도 해서 작은 표본의 높은 비율이 특히 위험하다.
// 실측 사고 3건: 도미나스 세럼 표본2→100% / 프로쉬 표본4→100% / 프로쉬 미니·라벤더 표본3→100%
const MIN_SAMPLED = 6;  // 이 미만은 판정 불가 (⏸)
const WEAK_SAMPLED = 10; // 이 미만은 참고값 (❓) — 단독 근거로 쓰지 않는다
const kws = process.argv.slice(2);
const post = (p, b) => fetch(`https://keyword-radar-rho.vercel.app${p}`, { method: 'POST',
  headers: { Authorization: `Bearer ${SECRET}`, 'Content-Type': 'application/json' }, body: JSON.stringify(b) }).then(r => r.json());

const vol = new Map();
for (let i = 0; i < kws.length; i += 10) {
  const j = await post('/api/analyze', { keywords: kws.slice(i, i + 10) });
  for (const k of (j.results || j.keywords || j.data || [])) vol.set(k.keyword, k);
  await new Promise(s => setTimeout(s, 1000));
}
console.log('판정 | 외부슬롯 | 샘플 | 월검색 | 문서수 | 키워드');
const rows = [];
for (const kw of kws) {
  const j = await post('/api/domains', { keyword: kw });
  const ds = j.domains || [], sampled = j.sampled || 0;
  const nav = ds.filter(d => NAVER.test(d.domain)).reduce((a, d) => a + d.count, 0);
  const ratio = sampled ? (sampled - nav) / sampled : 0;
  const v = vol.get(kw) || {};
  // 표본이 MIN_SAMPLED 미만이면 비율을 계산해도 판정에 쓰지 않는다 (통과도 거절도 아님)
  const verdict = sampled < MIN_SAMPLED ? 'unknown' : (ratio >= THRESHOLD ? 'pass' : 'fail');
  const weak = verdict === 'pass' && sampled < WEAK_SAMPLED;
  const mark = { unknown: ' ⏸ ', pass: weak ? ' ❓ ' : ' ✅ ', fail: ' ⛔ ' }[verdict];
  const shown = sampled < MIN_SAMPLED ? '?' : (ratio * 100).toFixed(0) + '%';
  rows.push({ kw, ratio, sampled, v: v.monthly_searches, d: v.document_count, verdict, weak });
  console.log(`${mark}| ${String(shown).padStart(8)} | ${String(sampled).padStart(4)} | ${String(v.monthly_searches ?? '?').padStart(6)} | ${String(v.document_count ?? '?').padStart(6)} | ${kw}`);
  await new Promise(s => setTimeout(s, 700));
}
const byVol = (a, b) => (b.v || 0) - (a.v || 0);
const pass = rows.filter(r => r.verdict === 'pass').sort(byVol);
const unknown = rows.filter(r => r.verdict === 'unknown').sort(byVol);

console.log(`\n통과 ${pass.length}/${rows.length} — 검색량 큰 순:`);
pass.forEach(r => console.log(`  ${String(r.v ?? '?').padStart(6)} · 슬롯 ${(r.ratio * 100).toFixed(0)}%${r.weak ? ` ❓표본 ${r.sampled}` : ''} · ${r.kw}`));

if (unknown.length) {
  console.log(`\n⏸ 판정 불가 ${unknown.length}건 — 표본 ${MIN_SAMPLED} 미만이라 비율을 쓸 수 없다:`);
  unknown.forEach(r => console.log(`  ${String(r.v ?? '?').padStart(6)} · 표본 ${r.sampled} (원시 비율 ${(r.ratio * 100).toFixed(0)}%) · ${r.kw}`));
  console.log('  → 통과도 거절도 아니다. 표본이 작다는 것은 외부가 앉을 자리 자체가 적다는 뜻일 수 있다.');
}
if (pass.some((r) => r.weak)) {
  console.log(`\n❓ 표본 ${WEAK_SAMPLED} 미만 통과분이 있다 — 참고값이므로 단독 근거로 쓰지 말 것.`);
}
