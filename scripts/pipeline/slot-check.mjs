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
  rows.push({ kw, ratio, sampled, v: v.monthly_searches, d: v.document_count, pass: ratio >= THRESHOLD });
  console.log(`${(ratio >= THRESHOLD ? ' ✅ ' : ' ⛔ ')}| ${String((ratio * 100).toFixed(0) + '%').padStart(8)} | ${String(sampled).padStart(4)} | ${String(v.monthly_searches ?? '?').padStart(6)} | ${String(v.document_count ?? '?').padStart(6)} | ${kw}`);
  await new Promise(s => setTimeout(s, 700));
}
const pass = rows.filter(r => r.pass).sort((a, b) => (b.v || 0) - (a.v || 0));
console.log(`\n통과 ${pass.length}/${rows.length} — 검색량 큰 순:`);
pass.forEach(r => console.log(`  ${String(r.v ?? '?').padStart(6)} · 슬롯 ${(r.ratio * 100).toFixed(0)}% · ${r.kw}`));
