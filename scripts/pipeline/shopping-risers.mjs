#!/usr/bin/env node
/**
 * shopping-risers.mjs — 레딜식 실험의 시드 공급기 (2026-10-25 신설)
 *
 * 네이버 데이터랩 쇼핑인사이트에서 분야별 인기 검색어 TOP200 을
 * "최근 7일" 과 "5~9주 전 4주" 로 받아, 새로 진입했거나 80계단 이상 급상승한 검색어를 뽑는다.
 *
 *   GLOBAL_MODULES="$(npm root -g)" node scripts/pipeline/shopping-risers.mjs [--end=YYYY-MM-DD] [--json=out.json]
 *
 * 왜 필요한가
 * -----------
 * 레딜식 실험(docs/experiments/2026-10-25-redill-type.md)은 "갑자기 생긴 수요 × 아직 답이 없는 자리" 를 노린다.
 * keyword-radar 엔드포인트는 전부 "키워드를 이미 알 때" 쓰는 도구라 급등 시드를 공급하지 못하고,
 * 일일 추천 봇은 5일치 ~50건에 쓸 만한 것이 1건이었다(10-24). 구글 트렌드 RSS 는 뉴스·스포츠뿐이었다.
 * 10-25 첫 실행에서 경쟁률 ≤ 1 · 월검색 ≥ 1,000 인 새 이름이 27개 나왔다.
 *
 * ⚠️ 데이터랩 API 는 페이지 세션(쿠키)이 있어야 응답한다 — curl 직접 호출은 301 로 막힌다. 그래서 playwright 다.
 * ⚠️ 결과의 대부분은 패딩·매트 같은 계절 카테고리다. **고유명사(새 제품·연예인 이름 붙은 제품)만 사람이 골라**
 *    `/api/analyze`(경쟁률) → `/api/trend`(오르는 중인가) → `/api/domains`(1면에 답이 있나) 순으로 거른다.
 * ⚠️ 키워드가 띄어쓰기 없는 붙임말이라 문서수가 작게 찍힐 수 있다. 글 쓰기 전 띄어 쓴 형태로 다시 잰다.
 * ⛔ 이 스크립트는 발행을 결정하지 않는다.
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require(join(process.env.GLOBAL_MODULES || '', 'playwright'));

const arg = (k, d) => (process.argv.find(a => a.startsWith(`--${k}=`)) || `=${d}`).split('=')[1];
const day = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
const END = arg('end', day(new Date(), -1));
const NOW = [day(END, -6), END];
const BEFORE = [day(END, -64), day(END, -37)];
const JSON_OUT = arg('json', '');

const CATS = { '화장품/미용': 50000002, '디지털/가전': 50000003, '가구/인테리어': 50000004, '출산/육아': 50000005, '식품': 50000006, '스포츠/레저': 50000007, '생활/건강': 50000008, '여가/생활편의': 50000009 };

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('https://datalab.naver.com/shoppingInsight/sCategory.naver', { waitUntil: 'networkidle', timeout: 45000 });

const fetchRank = (cid, s, e, pg) => page.evaluate(async ({ cid, s, e, pg }) => {
  const r = await fetch('/shoppingInsight/getCategoryKeywordRank.naver', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'X-Requested-With': 'XMLHttpRequest' },
    body: `cid=${cid}&timeUnit=date&startDate=${s}&endDate=${e}&age=&gender=&device=&page=${pg}&count=20`,
  });
  const t = await r.text();
  try { return JSON.parse(t).ranks || []; } catch { return null; }
}, { cid, s, e, pg });
// 연속 호출하면 빈 응답이 섞인다 — 물러났다가 다시 묻는다
const rank = async (...a) => { for (let i = 0; i < 4; i++) { const r = await fetchRank(...a); if (r) return r; await page.waitForTimeout(1500 * (i + 1)); } return []; };

console.log(`이번 주 ${NOW.join('~')} vs 기준 ${BEFORE.join('~')}`);
const out = {};
for (const [name, cid] of Object.entries(CATS)) {
  const now = [], before = [];
  for (let pg = 1; pg <= 10; pg++) {
    now.push(...await rank(cid, NOW[0], NOW[1], pg));
    before.push(...await rank(cid, BEFORE[0], BEFORE[1], pg));
  }
  const prev = new Map(before.map(x => [x.keyword, x.rank]));
  out[name] = now.map(x => ({ kw: x.keyword, rank: x.rank, prev: prev.get(x.keyword) ?? null }));
  const fresh = out[name].filter(x => x.prev === null || x.prev - x.rank >= 80);
  console.log(`\n[${name}] ${now.length}개 중 신규·급상승 ${fresh.length}`);
  console.log(fresh.map(x => `${x.kw}(${x.rank}${x.prev ? '←' + x.prev : '·신규'})`).join(' · '));
}
if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify(out, null, 1));
await browser.close();
