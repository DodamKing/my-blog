#!/usr/bin/env node
/**
 * GA4 글별 트래픽 — 서치 어드바이저 캡처 없이 "어느 글이 언제 올랐나"를 본다.
 *
 * 2026-10-31 신설. 10-29~30 노출·페이지뷰 급등이 어느 글인지 서치 어드바이저 30일 합계로는 안 보였다.
 * 셋업(서비스 계정·키·속성 ID): docs/setup/ga4-api.md
 *
 * 최근 N일(--days, 기본 2) vs 직전 기준 기간(--base, 기본 14일)의 일평균 페이지뷰를 글별로 비교한다.
 * 기준 기간은 최근 기간 바로 앞에 붙는다. 오늘은 집계 중이라 기본으로 어제까지만 본다.
 *
 * 사용: npm run traffic [-- --days=2] [--base=14] [--naver] [--top=30] [--daily=<경로 일부>]
 *   --naver           세션 출처가 naver 인 것만 (검색·리퍼럴 모두)
 *   --daily=redill    경로에 그 문자열이 든 글의 날짜별 페이지뷰
 *   --sources         최근 기간 유입 출처/매체 표
 *
 * ⚠️ GA4 에는 검색어가 넘어오지 않는다. 검색어는 서치 어드바이저로 본다.
 * ⚠️ GA4 숫자는 서치 어드바이저 클릭보다 적다(광고 차단기·스크립트 로드 전 이탈).
 *
 * 외부 의존성 없이 서비스 계정 JWT 를 node crypto 로 서명해 REST 를 직접 부른다.
 */
import fs from 'fs';
import crypto from 'crypto';
import 'dotenv/config';

const KEY_PATH = '.secrets/ga4-key.json';
const PROPERTY = process.env.GA4_PROPERTY_ID;

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  })
);
const DAYS = Number(args.days ?? 2);
const BASE = Number(args.base ?? 14);
const TOP = Number(args.top ?? 30);

if (!PROPERTY) throw new Error('.env 에 GA4_PROPERTY_ID 가 없다 — docs/setup/ga4-api.md ⑥');
if (!fs.existsSync(KEY_PATH)) throw new Error(`${KEY_PATH} 가 없다 — docs/setup/ga4-api.md ④`);

async function token() {
  const key = JSON.parse(fs.readFileSync(KEY_PATH, 'utf8'));
  const now = Math.floor(Date.now() / 1000);
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const body = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({
    iss: key.client_email,
    scope: 'https://www.googleapis.com/auth/analytics.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })}`;
  const sig = crypto.sign('RSA-SHA256', Buffer.from(body), key.private_key).toString('base64url');
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${body}.${sig}`,
    }),
  });
  const j = await res.json();
  if (!j.access_token) throw new Error(`토큰 발급 실패: ${JSON.stringify(j)}`);
  return j.access_token;
}

async function report(tok, req) {
  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${PROPERTY}:runReport`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    }
  );
  const j = await res.json();
  if (j.error) throw new Error(`${j.error.status}: ${j.error.message}`);
  return (j.rows ?? []).map((r) => ({
    d: r.dimensionValues.map((v) => v.value),
    m: r.metricValues.map((v) => Number(v.value)),
  }));
}

// 오늘(집계 중) 제외 — 어제가 최근 기간의 끝
const ago = (n) => `${n}daysAgo`;
const recent = { startDate: ago(DAYS), endDate: ago(1) };
const base = { startDate: ago(DAYS + BASE), endDate: ago(DAYS + 1) };

const naverFilter = args.naver
  ? {
      dimensionFilter: {
        filter: { fieldName: 'sessionSource', stringFilter: { matchType: 'CONTAINS', value: 'naver' } },
      },
    }
  : {};

const slugOf = (path) => path.replace(/^\/blog\//, '').replace(/\/$/, '') || path;
const tok = await token();

if (args.sources) {
  const rows = await report(tok, {
    dateRanges: [recent],
    dimensions: [{ name: 'sessionSourceMedium' }],
    metrics: [{ name: 'screenPageViews' }, { name: 'sessions' }],
    orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
    limit: 20,
  });
  console.log(`\n유입 출처 (최근 ${DAYS}일)\n`);
  for (const r of rows) console.log(`${String(r.m[0]).padStart(6)} PV  ${String(r.m[1]).padStart(5)} 세션  ${r.d[0]}`);
} else if (args.daily) {
  const rows = await report(tok, {
    dateRanges: [{ startDate: ago(DAYS + BASE), endDate: 'today' }],
    dimensions: [{ name: 'date' }, { name: 'pagePath' }],
    metrics: [{ name: 'screenPageViews' }],
    dimensionFilter: {
      filter: { fieldName: 'pagePath', stringFilter: { matchType: 'CONTAINS', value: String(args.daily) } },
    },
    orderBys: [{ dimension: { dimensionName: 'date' } }],
    limit: 1000,
  });
  const byDate = {};
  for (const r of rows) byDate[r.d[0]] = (byDate[r.d[0]] ?? 0) + r.m[0];
  console.log(`\n'${args.daily}' 날짜별 페이지뷰 (마지막 줄은 오늘, 집계 중)\n`);
  for (const [d, v] of Object.entries(byDate)) console.log(`${d.slice(4, 6)}-${d.slice(6)}  ${String(v).padStart(5)}  ${'█'.repeat(Math.min(v, 80))}`);
} else {
  const rows = await report(tok, {
    dateRanges: [recent, base],
    dimensions: [{ name: 'pagePath' }],
    metrics: [{ name: 'screenPageViews' }],
    ...naverFilter,
    limit: 2000,
  });
  // 날짜 범위가 둘이면 GA 가 dateRange 차원을 덧붙인다 (date_range_0 = recent)
  const pages = {};
  for (const r of rows) {
    const p = (pages[r.d[0]] ??= { recent: 0, base: 0 });
    if (r.d[1] === 'date_range_0') p.recent += r.m[0];
    else p.base += r.m[0];
  }
  const list = Object.entries(pages)
    .map(([path, v]) => ({ path, ...v, rAvg: v.recent / DAYS, bAvg: v.base / BASE }))
    .filter((x) => x.recent > 0)
    .sort((a, b) => b.rAvg - b.bAvg - (a.rAvg - a.bAvg));
  const total = (k) => list.reduce((s, x) => s + x[k], 0);
  console.log(
    `\n최근 ${DAYS}일 vs 직전 ${BASE}일 — 일평균 페이지뷰${args.naver ? ' (네이버 유입만)' : ''}, 증가폭 순\n` +
      `사이트 일평균: ${(total('recent') / DAYS).toFixed(1)} ← ${(Object.values(pages).reduce((s, x) => s + x.base, 0) / BASE).toFixed(1)}\n`
  );
  console.log('  최근/일   기준/일   증가     글');
  for (const x of list.slice(0, TOP)) {
    const diff = x.rAvg - x.bAvg;
    console.log(
      `${x.rAvg.toFixed(1).padStart(9)} ${x.bAvg.toFixed(1).padStart(9)} ${(diff >= 0 ? '+' : '') + diff.toFixed(1).padStart(6)}   ${slugOf(x.path)}`
    );
  }
}
