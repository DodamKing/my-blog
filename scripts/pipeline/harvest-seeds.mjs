#!/usr/bin/env node
/**
 * harvest-seeds.mjs — **흡수 가능성 측정기** (2026-09-21 신설 · 같은 날 용도 전환)
 *
 * 본업: 후보 제품의 **실제 사용자 질문이 지식iN 에 몇 개나 있는지** 수 초에 센다.
 *
 *   node scripts/pipeline/harvest-seeds.mjs --terms=<제품명> --pages=3
 *
 * 왜 필요한가
 * -----------
 * 09-20 에 키워드 축을 "큰 것 1개 → 작은 질문 15~20개 묶음" 으로 바꿨는데,
 * **후보를 받았을 때 그게 흡수가 되는 물건인지 발행 전에 알 방법이 없었다.**
 *   · 샤워기헤드(09-21): `expand` 30건을 돌려서야 꼬리 0개인 걸 알았다
 *   · 요소수 첨가제(09-21): 조사(02)가 **48회 호출 · 약 9분**을 써서야 질문 24개가 있다는 걸 알았다
 * 이 스크립트는 같은 판정을 **수 초**에 한다.
 *
 * 왜 `expand` 로는 안 되나 (2026-09-21 실측)
 * ------------------------------------------
 * **`레딜 목아픔`**(실측 85클릭 · 사이트 1위 · 꼬리 흡수가 확인된 키워드)을 `/api/expand` 에 넣으면
 * **반환 0건**이다. 자동완성·연관검색어는 검색량이 일정 수준 이상이어야 뜨고 우리가 먹는 층은 그 아래다.
 * **그런데 지식iN 에는 그 질문이 문장으로 있다** (`레딜` 직접 검색 → 10/10).
 *
 * 양성 대조군 (2026-09-21 · 이 도구가 믿을 만한지 스스로 시험한 결과)
 * -------------------------------------------------------------------
 *   레딜   10/10  "레딜 제로 가성비 괜찮을까요?" "레딜 니코틴 검사에 안 걸리나요?"
 *   예초기 10/10  "예초기에 경유 혼유" "예초기 사고 후 바로 응급실"
 *   아큐스터  1+   "허리디스크 있는데 아큐스터 괜찮나요?"
 *
 * ⛔ 시드 발굴에는 쓰지 마라 — 증상어 역검색은 실패했다 (아래 AXES 주석)
 * ⛔ 이 스크립트는 발행을 결정하지 않는다.
 *    진입 판정(analyze → expand → domains → trend → judge)과 규모 게이트(월 300)는 그대로 거친다.
 *
 * 누가 무엇을 하나
 * -----------------
 *   스크립트 = 수집 (기계적·결정적).  에이전트 = 제품 고유명사 추출 (판단).
 *   이 분업은 `factcheck`(기계) / `04-reviewer`(판단) 와 같다.
 *   ⛔ **LLM API 를 붙이지 말 것.** 2026-09-21 에 Gemini 로 추출을 자동화하려다 걷어냈다 —
 *      같은 날 404(모델명)·402(결제) 로 두 번 깨졌고, 모델명이 계속 바뀌는데
 *      **정작 그 판단은 이미 메인 에이전트가 출력을 읽으며 하고 있다.** 얻는 것 없이 실패 모드만 는다.
 *
 * 사용법
 *   node scripts/pipeline/harvest-seeds.mjs --axis=fault         # 제목 원문 (기본)
 *   node scripts/pipeline/harvest-seeds.mjs --axis=body,fault
 *   node scripts/pipeline/harvest-seeds.mjs --terms=에러코드 --pages=3
 *   node scripts/pipeline/harvest-seeds.mjs --json=out.json
 *   node scripts/pipeline/harvest-seeds.mjs --tally              # 거친 빈도(힌트용)
 *
 * 전역 playwright 를 쓴다 (글로벌 CLAUDE.md 규칙):
 *   GLOBAL_MODULES="$(npm root -g)" node scripts/pipeline/harvest-seeds.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';

const require = createRequire(import.meta.url);

// ─── 증상어 사전 ────────────────────────────────────────────────────────────
// 우리 승리 자산의 형태에서 역산했다:
//   레딜 목아픔(85클릭) · 아큐스터 부작용 · 예초기 줄통 교환방법(245클릭)
// 전부 `{고유명사} + 내 몸·내 상황에 일어난 일` 이다.
//
// ⛔⛔ **증상어 역검색은 시드 발굴에 실패했다 (2026-09-21 양성 대조군 시험).**
//    우리 승리 자산 3개로 시험했다 — `목아픔`·`가래`·`교환방법`·`부품교체`·`내돈내산` 으로
//    150건을 긁었는데 **직격 1건**(`전자담배 목아픔`, 브랜드 아님)이고 예초기·아큐스터는 0건이었다.
//
//    실제로 나온 것:  `목아픔`→"웃으면 목아픔"·"인후염?"  `교환방법`→타오바오·번개장터
//                     `내돈내산`→"리뷰 명예훼손 고소"
//
//    **원인: 증상어가 흔할수록 제품이 노이즈에 묻힌다.** 목 아픈 사람은 수만 명이고
//    레딜 쓰는 사람은 극소수라 상위에 못 든다. 레딜은 사람들이 **검색한** 말이지
//    지식iN 에 **물어본** 말이 아니었다 — 지식iN 질문 ≠ 검색어.
//
//    ✅ `fault` 축만 살아남았다. `에러코드` 는 **기계만 내는 말이라 제품 없이 성립이 안 된다**
//       (실측 10건 중 7건이 브랜드: LG 에어컨·린나이·코웨이·삼성식기세척기·cm115 프린터).
//
// → 시드 발굴은 추천기·판정 완료 큐가 계속 맡는다. 이 도구의 본업은 아래 "질문 수집" 이다.
const AXES = {
  fault: {
    label: '고장·에러 (유일하게 살아남은 축)',
    terms: ['에러코드', 'AS비용', '전원이안들어와요', '소음이심해요', '고장'],
  },
};

// ─── 인자 ───────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const arg = (k, d) => {
  const hit = argv.find((a) => a.startsWith(`--${k}=`));
  return hit ? hit.slice(k.length + 3) : d;
};

const PAGES = Math.max(1, Math.min(5, Number(arg('pages', 2))));
const TOP = Number(arg('top', 25));
const JSON_OUT = arg('json', null);
// 기본은 제목 원문 출력(에이전트가 읽고 고른다). `--tally` 를 주면 거친 빈도 집계를 대신 낸다.
const TALLY = argv.includes('--tally');
const CUSTOM_TERMS = arg('terms', null);
const AXIS_ARG = arg('axis', 'all');

let terms = [];
if (CUSTOM_TERMS) {
  terms = CUSTOM_TERMS.split(',').map((t) => t.trim()).filter(Boolean);
} else {
  const picked = AXIS_ARG === 'all' ? Object.keys(AXES) : AXIS_ARG.split(',').map((a) => a.trim());
  for (const a of picked) {
    if (!AXES[a]) {
      console.error(`❌ 모르는 축: ${a} (가능: ${Object.keys(AXES).join(', ')}, all)`);
      process.exit(1);
    }
    terms.push(...AXES[a].terms);
  }
}

// ─── playwright 해석 (프로젝트 → 전역) ──────────────────────────────────────
function loadPlaywright() {
  try {
    return require('playwright');
  } catch {}
  let globalRoot = process.env.GLOBAL_MODULES;
  if (!globalRoot) {
    try {
      globalRoot = execSync('npm root -g', { encoding: 'utf8' }).trim();
    } catch {}
  }
  if (globalRoot) {
    try {
      return require(path.join(globalRoot, 'playwright'));
    } catch {}
  }
  console.error('❌ playwright 를 찾지 못했다. `npm i -g playwright` 후 다시 실행하라.');
  process.exit(1);
}

const { chromium } = loadPlaywright();

// ─── 수집 ───────────────────────────────────────────────────────────────────
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const SELECTOR = 'ul.basic1 > li > dl > dt > a';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function harvest() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ userAgent: UA, locale: 'ko-KR' });
  const rows = [];

  for (const term of terms) {
    let got = 0;
    for (let p = 1; p <= PAGES; p++) {
      const url =
        `https://kin.naver.com/search/list.naver?query=${encodeURIComponent(term)}` +
        (p > 1 ? `&page=${p}` : '');
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(1200);
        const titles = await page.locator(SELECTOR).allInnerTexts();
        for (const t of titles) {
          const title = t.replace(/\s+/g, ' ').trim();
          if (title) {
            rows.push({ term, title });
            got++;
          }
        }
      } catch (e) {
        console.error(`   ⚠️  ${term} p${p} 실패: ${e.message.split('\n')[0]}`);
      }
      await sleep(900); // 점잖게
    }
    console.log(`   ${term.padEnd(8)} ${String(got).padStart(3)}건`);
  }

  await browser.close();
  return rows;
}

// ─── 고유명사 추출 ──────────────────────────────────────────────────────────
/**
 * `--tally` 용 거친 집계 — 증상어 앞의 토큰을 제품명 후보로 본다.
 *
 * ⚠️ **정확도가 낮다. 시드 목록이 아니라 훑어보기용 힌트다.**
 *    제목 100건이 넘어갈 때 어느 제품이 반복되는지 감을 잡는 용도로만 쓴다.
 *    실제 추출은 **에이전트가 제목을 읽고 고른다**(기본 출력).
 */
const STOPWORDS = new Set([
  // 대명사·부사
  '이거', '이게', '제가', '저는', '혹시', '요즘', '그냥', '진짜', '너무', '조금', '갑자기',
  '어제', '오늘', '내일', '방금', '계속', '자꾸', '매일', '한번', '다시', '아직', '혼자',
  '같', '이런', '저런', '무슨', '어떤', '현재', '최근', '작년', '올해',
  // 신체 부위 — 2026-09-21 실측에서 상위를 먹었다 (얼굴 5건 · 다리 2건)
  '얼굴', '다리', '피부', '머리', '손', '발', '팔', '눈', '코', '입', '목', '배', '등', '살',
  '가슴', '허리', '어깨', '무릎', '두피', '이마', '볼', '턱', '손목', '발목',
  // 일반 증상·질환
  '여드름', '트러블', '알러지', '알레르기', '염증', '통증', '두통', '멍', '붓기',
]);
function extractHeuristic(titles, termsUsed) {
  return titles.map((title, i) => {
    let s = title;
    const term = termsUsed[i];
    if (term) s = s.split(term)[0];
    const tok = s.trim().split(/\s+/).filter(Boolean);
    let cand = tok[0] || '';
    // ⚠️ 조사를 먼저 떼고 나서 길이를 본다. 순서를 바꾸면 `같은` → `같` 이 통과한다 (2026-09-21 실측 버그)
    // ⛔ `이`·`가` 는 떼지 않는다 — 브랜드명이 그 글자로 끝나는 경우가 흔하다
    //    (2026-09-21 실측: `코웨이` → `코웨` 로 잘렸다)
    cand = cand.replace(/[은는을를의도만과와로]$/u, '');
    if (!cand || cand.length < 2) return '';
    if (STOPWORDS.has(cand)) return '';
    if (!/[가-힣A-Za-z]/.test(cand)) return '';
    return cand;
  });
}

// ─── 실행 ───────────────────────────────────────────────────────────────────
console.log(`\n🌱 harvest-seeds — 증상어 ${terms.length}개 × ${PAGES}페이지\n`);
console.log('1️⃣  지식iN 수집');

const rows = await harvest();
console.log(`\n   총 ${rows.length}건 수집`);

if (!rows.length) {
  console.log('\n결과 없음. 셀렉터가 바뀌었을 수 있다.');
  process.exit(0);
}

// ─── 기본 출력: 제목 원문 ───────────────────────────────────────────────────
// 고유명사 추출은 판단이다. 스크립트가 억지로 하면 `얼굴`·`살` 이 상위를 먹는다(09-21 실측).
// 수집은 기계가, 추출은 에이전트가 — `factcheck`(기계) / `04-reviewer`(판단)와 같은 분업이다.
if (!TALLY) {
  console.log('\n2️⃣  제목 원문 (에이전트가 읽고 제품 고유명사를 고른다)\n');
  const byTerm = new Map();
  rows.forEach((r) => {
    if (!byTerm.has(r.term)) byTerm.set(r.term, []);
    byTerm.get(r.term).push(r.title);
  });
  for (const [term, list] of byTerm) {
    console.log(`\n### ${term} (${list.length}건)`);
    list.forEach((t) => console.log(`- ${t}`));
  }
  if (JSON_OUT) {
    fs.writeFileSync(
      JSON_OUT,
      JSON.stringify({ harvestedAt: new Date().toISOString(), terms, pages: PAGES, rows }, null, 2),
      'utf8',
    );
    console.log(`\n💾 ${JSON_OUT}`);
  }
  console.log('');
  process.exit(0);
}

console.log('\n2️⃣  거친 집계 (--tally) — ⚠️ 힌트일 뿐 시드 목록이 아니다');
const titles = rows.map((r) => r.title);
const products = extractHeuristic(titles, rows.map((r) => r.term));

// ─── 집계 ───────────────────────────────────────────────────────────────────
const tally = new Map();
products.forEach((p, i) => {
  if (!p) return;
  if (!tally.has(p)) tally.set(p, { product: p, count: 0, questions: [], axes: new Set() });
  const e = tally.get(p);
  e.count++;
  e.axes.add(rows[i].term);
  if (e.questions.length < 25) e.questions.push(rows[i].title);
});

const ranked = [...tally.values()].sort((a, b) => b.count - a.count).slice(0, TOP);
const hitRate = ((products.filter(Boolean).length / products.length) * 100).toFixed(0);

console.log(`   고유명사 추출 ${products.filter(Boolean).length}/${products.length}건 (${hitRate}%) · 고유 제품 ${tally.size}개\n`);

console.log('3️⃣  시드 후보 — 질문 개수 순');
console.log('─'.repeat(72));
console.log('제품명'.padEnd(26) + '질문'.padStart(5) + '  증상축');
console.log('─'.repeat(72));
for (const e of ranked) {
  console.log(e.product.padEnd(26) + String(e.count).padStart(5) + '  ' + [...e.axes].join('·'));
}
console.log('─'.repeat(72));

// 질문이 여러 개 붙은 제품 = 흡수 설계 후보
const absorbable = ranked.filter((e) => e.count >= 3);
console.log(`\n⭐ 질문 3개 이상 = 흡수 설계 후보: ${absorbable.length}개`);
for (const e of absorbable.slice(0, 5)) {
  console.log(`\n   ▸ ${e.product} (질문 ${e.count}개)`);
  e.questions.slice(0, 8).forEach((q) => console.log(`       · ${q.slice(0, 68)}`));
}

console.log(`\n\n다음 단계 — 시드를 판정 파이프라인에 넣는다 (이 스크립트는 발행을 결정하지 않는다):`);
ranked.slice(0, 3).forEach((e) => console.log(`   npm run scan -- ${e.product}`));

if (JSON_OUT) {
  const payload = {
    harvestedAt: new Date().toISOString(),
    terms,
    pages: PAGES,
    extraction: 'heuristic-tally',
    totalRows: rows.length,
    candidates: ranked.map((e) => ({ ...e, axes: [...e.axes] })),
  };
  fs.writeFileSync(JSON_OUT, JSON.stringify(payload, null, 2), 'utf8');
  console.log(`\n💾 ${JSON_OUT}`);
}
console.log('');
