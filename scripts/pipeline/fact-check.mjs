#!/usr/bin/env node
/**
 * fact-check.mjs — 발행 전 기계 검증 (2026-08-27 신설)
 *
 * 검토(04)가 쓰던 시간의 절반이 "세어봐 / 나눠봐 / 대조해봐" 였다.
 * 그건 판단이 아니라 기계 일이므로 여기로 내린다. 검토는 판단만 남긴다.
 *
 *   node scripts/pipeline/fact-check.mjs <슬러그> [--note=<조사노트경로>] [--draft=<초안경로>]
 *
 * 검사 항목
 *   1. 파생 단가 검산      — 표의 `원/ml`·`원/매`·`10g당` 컬럼이 (가격 ÷ 용량)과 맞나
 *   2. 순번 검증           — "X는 N번째" 를 노트의 원문 나열에서 세어 대조
 *   3. 노트 초과 서술      — 본문의 금액(1,000↑)·용량이 노트에 있나
 *   4. 타겟 키워드         — frontmatter targetKeyword 가 제목·본문에 있나
 *   5. 금지 표현           — 화학제품안전법 등 법적 금지 문구
 *   6. MDX 파싱 위험       — 미이스케이프 `~`, 체크박스 마크다운
 *   7. 내부링크            — /blog/<슬러그>/ 대상이 실재하나
 *   8. 쿠팡 배치           — CoupangDisclosure 가 첫 CoupangLink 앞에 있나
 *
 * 판정하지 않는 것: 논리 정합성, 문체, 자기잠식, 사실의 참/거짓.
 * 그건 검토(04)가 한다.
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(process.argv[1], '../../..');
const BLOG = join(ROOT, 'src/content/blog');

const args = process.argv.slice(2);
const slug = args.find((a) => !a.startsWith('--'));
const noteArg = args.find((a) => a.startsWith('--note='))?.slice(7);
const draftArg = args.find((a) => a.startsWith('--draft='))?.slice(8);

if (!slug && !draftArg) {
  console.error('사용법: node scripts/pipeline/fact-check.mjs <슬러그> [--note=경로] [--draft=경로]');
  process.exit(2);
}

const postPath = draftArg ? resolve(draftArg) : join(BLOG, slug, 'index.mdx');
if (!existsSync(postPath)) {
  console.error(`❌ 파일 없음: ${postPath}`);
  process.exit(2);
}

const raw = readFileSync(postPath, 'utf8');
const note = noteArg && existsSync(resolve(noteArg)) ? readFileSync(resolve(noteArg), 'utf8') : null;
if (noteArg && !note) console.error(`⚠️  노트를 못 읽었다: ${noteArg} — 노트 대조 항목은 건너뛴다\n`);

// ── frontmatter / body 분리 ──────────────────────────────────────────
const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
const fm = fmMatch ? fmMatch[1] : '';
const body = fmMatch ? fmMatch[2] : raw;
const fmGet = (k) => fm.match(new RegExp(`^${k}:\\s*["']?(.*?)["']?\\s*$`, 'm'))?.[1] ?? null;

const findings = { error: [], warn: [], info: [] };
const add = (level, section, msg) => findings[level].push({ section, msg });

// ── 유틸 ────────────────────────────────────────────────────────────
const stripCell = (s) =>
  String(s)
    .replace(/\*\*/g, '')
    .replace(/`/g, '')
    .replace(/\\~/g, '~')
    .trim();

// 용량 → { value, unit } (L·kg 는 ml·g 로 정규화)
function parseQty(s) {
  const t = stripCell(s).replace(/,/g, '');
  const m = t.match(/([\d.]+)\s*(ml|mL|ML|L|l|리터|kg|KG|g|G|매|장|개|정|포|캡슐)/);
  if (!m) return null;
  const v = parseFloat(m[1]);
  if (!Number.isFinite(v) || v <= 0) return null;
  const u = m[2];
  if (/^(L|l|리터)$/.test(u)) return { value: v * 1000, unit: 'ml', raw: u };
  if (/^(ml|mL|ML)$/.test(u)) return { value: v, unit: 'ml', raw: u };
  if (/^(kg|KG)$/.test(u)) return { value: v * 1000, unit: 'g', raw: u };
  if (/^(g|G)$/.test(u)) return { value: v, unit: 'g', raw: u };
  if (/^(매|장)$/.test(u)) return { value: v, unit: '매', raw: u };
  return { value: v, unit: u, raw: u };
}

function parsePrice(s) {
  const t = stripCell(s).replace(/,/g, '');
  const m = t.match(/(\d+(?:\.\d+)?)\s*원/);
  return m ? parseFloat(m[1]) : null;
}

function parseNumber(s) {
  const t = stripCell(s).replace(/,/g, '').replace(/^약\s*/, '');
  const m = t.match(/(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : null;
}

// 단가 헤더 해석: "원/ml" · "ml당" · "10g당" · "원/매" · "장당"
function parseRateHeader(h) {
  const t = stripCell(h).replace(/\s/g, '');
  let m = t.match(/^원\/(\D+)$/);
  if (m) return { per: 1, unit: normUnit(m[1]) };
  m = t.match(/^(\d*)(\D+?)당$/);
  if (m) return { per: m[1] ? parseFloat(m[1]) : 1, unit: normUnit(m[2]) };
  return null;
}
function normUnit(u) {
  const t = u.replace(/,/g, '').trim();
  if (/^(L|l|리터)$/.test(t)) return 'L';
  if (/^(ml|mL|ML)$/.test(t)) return 'ml';
  if (/^(kg|KG)$/.test(t)) return 'kg';
  if (/^(g|G)$/.test(t)) return 'g';
  if (/^(매|장)$/.test(t)) return '매';
  return t;
}
// 단가 단위 → 정규화 단위 (표의 용량 파싱 결과와 맞추기 위함)
function baseUnit(u) {
  if (u === 'L') return 'ml';
  if (u === 'kg') return 'g';
  return u;
}
function unitScale(u) {
  if (u === 'L') return 1000; // 원/L 이면 ml 값을 1000 으로 나눠야 함
  if (u === 'kg') return 1000;
  return 1;
}

// ── 표 파싱 ─────────────────────────────────────────────────────────
function parseTables(text) {
  const lines = text.split(/\r?\n/);
  const tables = [];
  let cur = null;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    if (l.startsWith('|') && l.endsWith('|')) {
      const cells = l.slice(1, -1).split('|');
      if (/^[\s:|-]+$/.test(l.replace(/\|/g, ''))) {
        if (cur) cur.sepSeen = true;
        continue;
      }
      if (!cur) cur = { header: cells, rows: [], line: i + 1, sepSeen: false };
      else if (!cur.sepSeen) cur.header = cells; // 구분선 전이면 헤더 갱신
      else cur.rows.push({ cells, line: i + 1 });
    } else if (cur) {
      if (cur.rows.length) tables.push(cur);
      cur = null;
    }
  }
  if (cur && cur.rows.length) tables.push(cur);
  return tables;
}

// ── 1. 파생 단가 검산 ───────────────────────────────────────────────
function checkRates() {
  const tables = parseTables(body);
  let checked = 0;
  let flagged = 0;
  for (const t of tables) {
    const head = t.header.map(stripCell);
    const rateIdx = head.findIndex((h) => parseRateHeader(h));
    if (rateIdx < 0) continue;
    const rate = parseRateHeader(head[rateIdx]);
    const priceIdx = head.findIndex((h) => /가격|최저가|판매가|권장가|정가/.test(h));
    const qtyIdx = head.findIndex((h) => /용량|중량|매수|수량|규격|구성/.test(h));
    if (priceIdx < 0 || qtyIdx < 0) {
      add('info', '단가검산', `표(${t.line}행) 에 단가 컬럼 '${head[rateIdx]}' 은 있으나 가격/용량 컬럼을 못 찾아 건너뜀`);
      continue;
    }
    for (const r of t.rows) {
      const price = parsePrice(r.cells[priceIdx]);
      const qty = parseQty(r.cells[qtyIdx]);
      const stated = parseNumber(r.cells[rateIdx]);
      if (price == null || qty == null || stated == null) continue;
      const wantBase = baseUnit(rate.unit);
      if (qty.unit !== wantBase) {
        add(
          'warn',
          '단가검산',
          `${t.line}행 표 · "${stripCell(r.cells[0])}" — 단위 불일치: 용량이 ${qty.raw}(${qty.unit}) 인데 단가 컬럼은 ${head[rateIdx]}. 환산 근거를 본문에 밝혔는지 확인`
        );
        continue;
      }
      const expected = (price / (qty.value / unitScale(rate.unit))) * rate.per;
      checked++;
      const diff = Math.abs(expected - stated) / (stated || 1);
      // 반올림 자릿수 허용 + 상대오차 3%
      const decimals = (String(stated).split('.')[1] || '').length;
      const tol = Math.max(0.5 * Math.pow(10, -decimals) / (stated || 1), 0.03);
      if (diff > tol) {
        flagged++;
        add(
          'error',
          '단가검산',
          `${r.line}행 "${stripCell(r.cells[0])}" — 표기 ${stated}, 계산값 ${expected.toFixed(decimals + 1)} (${price}원 ÷ ${stripCell(r.cells[qtyIdx])})`
        );
      }
    }
  }
  // 인라인 파생값 — 단가 컬럼이 없고 가격 셀 괄호에 들어간 형태
  // 예: `49,990원 (10g당 5,262원)`  (2026-08-25 도미나스 초안이 이 형태였다)
  for (const t of tables) {
    const head = t.header.map(stripCell);
    const priceIdx = head.findIndex((h) => /가격|최저가|판매가|권장가|정가/.test(h));
    const qtyIdx = head.findIndex((h) => /용량|중량|매수|수량|규격|구성/.test(h));
    if (priceIdx < 0 || qtyIdx < 0) continue;
    for (const r of t.rows) {
      const cell = stripCell(r.cells[priceIdx]);
      const im = cell.match(/(\d*)\s*(ml|mL|L|g|kg|매|장)\s*당\s*([\d,]+)\s*원/);
      if (!im) continue;
      const price = parsePrice(cell);
      const qty = parseQty(r.cells[qtyIdx]);
      if (price == null || qty == null) continue;
      const per = im[1] ? parseFloat(im[1]) : 1;
      const unit = normUnit(im[2]);
      const stated = parseFloat(im[3].replace(/,/g, ''));
      if (qty.unit !== baseUnit(unit)) continue;
      const expected = (price / (qty.value / unitScale(unit))) * per;
      checked++;
      if (Math.abs(expected - stated) / (stated || 1) > 0.03) {
        flagged++;
        add(
          'error',
          '단가검산',
          `${r.line}행 "${stripCell(r.cells[0])}" — 표기 ${per}${im[2]}당 ${stated.toLocaleString()}원, 계산값 ${Math.round(expected).toLocaleString()}원 (${price.toLocaleString()}원 ÷ ${stripCell(r.cells[qtyIdx])})`
        );
      }
    }
  }

  // 산문 안의 파생값은 검산하지 않고 목록만 낸다 — 한 문장에 여러 제품이 섞이면
  // 총액과 단가의 짝을 기계가 못 맞춘다. 표에서 잡히면 산문은 그 값을 옮긴 것이 보통이다.
  const proseRates = [...body.replace(/^\|.*$/gm, '').matchAll(/(\d*)\s*(ml|mL|L|g|kg|매|장)\s*당\s*([\d,]+)\s*원/g)];
  if (proseRates.length) {
    add('info', '단가검산', `산문 파생단가 ${proseRates.length}건 (검산 대상 아님) — ${proseRates.map((x) => x[0]).slice(0, 6).join(' · ')}`);
  }

  return { checked, flagged };
}

// ── 2. 순번 검증 (기준 A) ───────────────────────────────────────────
//
// ⚠️ 나이브하게 콤마로 자르면 틀린다. 전성분에는 `1,2-헥산다이올`·`C14-22알코올` 처럼
//    **이름 안에 콤마가 있는 성분**이 섞여 있고, 그러면 그 뒤 항목이 전부 +1 밀린다.
//    2026-08-25 도미나스 실측: 나이브 파싱은 아데노신을 39번째로 셌으나 실제는 38번째다
//    (`1,2-헥산다이올` 하나가 둘로 쪼개져서). 숫자 사이 콤마는 보호하고 자른다.
function splitIngredients(line) {
  const GUARD = ' ';
  return line
    .replace(/^[^:：]*[:：]/, '')
    .replace(/(\d)\s*,\s*(\d)/g, `$1${GUARD}$2`) // 1,2-헥산다이올 보호
    .split(',')
    .map((s) => s.replace(new RegExp(GUARD, 'g'), ',').replace(/[*`|]/g, '').trim())
    .filter(Boolean);
}

function checkOrdinals() {
  if (!note) return { checked: 0 };
  const noteLines = note.split(/\r?\n/);
  const claims = [];

  // (a) 표 셀 형태 — `| 아데노신 | 설명 | 42번째 |`
  for (const t of parseTables(body)) {
    for (const r of t.rows) {
      const cells = r.cells.map(stripCell);
      const oi = cells.findIndex((c) => /^\d{1,3}\s*번째$/.test(c));
      if (oi > 0 && cells[0]) {
        claims.push({ term: cells[0].replace(/\(.*?\)/g, '').trim(), claimed: parseInt(cells[oi], 10) });
      }
    }
  }
  // (b) 문장 형태 — `아데노신은 42번째`
  const re = /([가-힣A-Za-z][가-힣A-Za-z0-9·\-]{1,24}?)\s*(?:은|는|이|가|을|를|도)?\s*(\d{1,3})\s*번째/g;
  let m;
  while ((m = re.exec(body))) {
    const term = m[1].trim().replace(/^(그|이|저|해당|전성분에서도?)\s*/, '');
    if (term.length >= 2) claims.push({ term, claimed: parseInt(m[2], 10) });
  }

  let checked = 0;
  const seen = new Set();
  for (const { term, claimed } of claims) {
    const key = `${term}:${claimed}`;
    if (seen.has(key)) continue;
    seen.add(key);
    // 노트에서 그 항목을 포함하는 "긴 나열"(콤마 15개 이상) = 원문 목록
    const listLine = noteLines.find((l) => l.includes(term) && (l.match(/,/g) || []).length >= 15);
    if (!listLine) continue;
    const items = splitIngredients(listLine);
    const idx = items.findIndex((s) => s === term || s.replace(/\(.*?\)/g, '').trim() === term);
    if (idx < 0) continue;
    checked++;
    const actual = idx + 1;
    if (actual !== claimed) {
      add('error', '순번검증', `"${term} ${claimed}번째" — 노트 원문 나열에서는 ${actual}번째 (총 ${items.length}개)`);
    }
  }
  return { checked };
}

// ── 3. 노트 초과 서술 ───────────────────────────────────────────────
// 노트 대조에서 뺄 것: 본문이 스스로 계산한 파생 단가.
// 노트에 있을 수가 없는 값이고, 이미 단가검산이 따로 검증한다.
// (기준 C — 오탐이 과하면 스크립트를 아무도 안 본다)
function bodyForNoteCompare() {
  const lines = body.split(/\r?\n/);
  const rateCellByLine = new Map();
  for (const tb of parseTables(body)) {
    const ri = tb.header.map(stripCell).findIndex((h) => parseRateHeader(h));
    if (ri < 0) continue;
    for (const r of tb.rows) rateCellByLine.set(r.line, ri);
  }
  return lines
    .map((l, i) => {
      if (!rateCellByLine.has(i + 1)) return l;
      const ri = rateCellByLine.get(i + 1);
      const t = l.trim();
      const cells = t.slice(1, -1).split('|');
      cells[ri] = ' ';
      return `|${cells.join('|')}|`;
    })
    .join('\n')
    .replace(/(\d*)\s*(ml|mL|L|g|kg|매|장)\s*당\s*[\d,]+\s*원/g, ''); // 인라인 파생단가
}

function checkAgainstNote() {
  if (!note) return { checked: 0 };
  const noteNorm = note.replace(/,/g, '');
  const bodyNorm = bodyForNoteCompare().replace(/,/g, '');
  const missing = [];
  let checked = 0;

  // 금액 1,000 이상만 (파생 소액 단가·1회비용 제외 — 기준 C 오탐 억제)
  const prices = new Set();
  for (const m of bodyNorm.matchAll(/(\d{4,})\s*원/g)) {
    const v = parseInt(m[1], 10);
    if (v >= 1000) prices.add(v);
  }
  for (const v of prices) {
    checked++;
    if (!new RegExp(`\\b${v}\\b`).test(noteNorm)) missing.push(`${v.toLocaleString()}원`);
  }

  // 용량·매수
  const qtys = new Set();
  for (const m of bodyNorm.matchAll(/([\d.]+)\s*(ml|mL|L|kg|g|매)\b/g)) {
    qtys.add(`${m[1]}${m[2]}`);
  }
  for (const q of qtys) {
    checked++;
    const num = q.match(/^[\d.]+/)[0];
    const unit = q.slice(num.length);
    if (!new RegExp(`${num.replace('.', '\\.')}\\s*${unit}`, 'i').test(noteNorm)) missing.push(q);
  }

  if (missing.length) {
    add(
      'warn',
      '노트대조',
      `노트에 없는 값 ${missing.length}건 — ${missing.slice(0, 12).join(' · ')}${missing.length > 12 ? ' …' : ''}`
    );
  }
  return { checked, missing: missing.length };
}

// ── 4. 타겟 키워드 ──────────────────────────────────────────────────
function checkTargetKeyword() {
  const tk = fmGet('targetKeyword');
  if (!tk) {
    add('warn', '타겟키워드', 'frontmatter 에 targetKeyword 가 없다 — 발행 후 serp-audit 이 불가능하다');
    return;
  }
  const title = fmGet('title') || '';
  // 검색엔진은 대소문자를 구분하지 않는다 — 영문 브랜드(AHC vs ahc)에서 오탐이 났다
  const tkLower = tk.toLowerCase();
  const inTitle = title.toLowerCase().includes(tkLower);
  // 본문에서 import 줄 제외
  const prose = body.replace(/^import .*$/gm, '');
  const proseLower = prose.toLowerCase();
  const count = (proseLower.match(new RegExp(tkLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
  if (count === 0) {
    add('error', '타겟키워드', `"${tk}" 가 본문에 0회 — 제목·description 에만 있으면 그 키워드로 안 잡힌다`);
  } else {
    // 첫 등장 위치 (앞 100단어 안인가)
    const first = proseLower.indexOf(tkLower);
    const head = prose.slice(0, first).split(/\s+/).length;
    if (head > 100) {
      add('warn', '타겟키워드', `"${tk}" 첫 등장이 ${head}단어째 (권장: 100단어 이내)`);
    }
    add('info', '타겟키워드', `"${tk}" — 제목 ${inTitle ? '포함' : '미포함'} · 본문 ${count}회`);
  }
  if (!inTitle) add('warn', '타겟키워드', `제목에 "${tk}" 가 그대로 들어 있지 않다`);
}

// ── 5. 금지 표현 ────────────────────────────────────────────────────
const BANNED = [
  // 화학제품안전법 (생활화학제품) — 표시·광고 금지
  { re: /무독성/g, why: '화학제품안전법 금지 표현' },
  { re: /인체에\s*무해|인체\s*무해|무해성/g, why: '화학제품안전법 금지 표현' },
  { re: /친환경|환경\s*친화|자연\s*친화|인체\s*친화|동물\s*친화/g, why: '화학제품안전법 금지 표현 (환경표지 인증 제품 제외)' },
  // 의약품·건강기능식품 과장
  { re: /완치(됩니다|된다|시켜|가능)/g, why: '의료 효능 단정' },
  { re: /부작용이?\s*(전혀\s*)?없(습니다|다|어요)/g, why: '안전성 단정' },
  { re: /100%\s*(효과|안전|보장)/g, why: '절대적 표현' },
  { re: /(질병|질환)을?\s*(치료|예방)(합니다|한다|해)/g, why: '의료 효능 단정' },
];
function checkBanned() {
  for (const b of BANNED) {
    const hits = body.match(b.re);
    if (hits) {
      add('error', '금지표현', `${[...new Set(hits)].join(' · ')} — ${b.why}`);
    }
  }
}

// ── 6. MDX 파싱 위험 ────────────────────────────────────────────────
function checkMdx() {
  const lines = body.split(/\r?\n/);
  const bad = [];
  lines.forEach((l, i) => {
    if (/^\s*[-*]\s*\[\s?\]/.test(l)) bad.push(`${i + 1}행: 체크박스 마크다운 (프로젝트 금지)`);
    // 이스케이프 안 된 ~ (코드블록/인라인코드 밖)
    const noCode = l.replace(/`[^`]*`/g, '');
    const un = noCode.match(/(?<!\\)~/g);
    if (un && un.length) bad.push(`${i + 1}행: 미이스케이프 \`~\` ${un.length}개`);
    if (/<!--/.test(l)) bad.push(`${i + 1}행: HTML 주석 (MDX 에서 파싱 오류)`);
  });
  if (bad.length) bad.forEach((b) => add('error', 'MDX', b));
}

// ── 7. 내부링크 ─────────────────────────────────────────────────────
function checkInternalLinks() {
  const slugs = new Set(readdirSync(BLOG, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name));
  const links = [...body.matchAll(/\]\(\/blog\/([a-z0-9-]+)\/?\)/g)].map((m) => m[1]);
  const counts = {};
  for (const l of links) counts[l] = (counts[l] || 0) + 1;
  for (const [target, n] of Object.entries(counts)) {
    if (!slugs.has(target)) add('error', '내부링크', `/blog/${target}/ — 대상 글이 없다 (404)`);
    else if (n > 3) add('warn', '내부링크', `/blog/${target}/ 로 ${n}회 — 같은 글로 3회 초과`);
  }
  if (/관련\s*글\s*모아보기|함께\s*읽으면\s*좋은\s*글/.test(body))
    add('warn', '내부링크', '"관련 글 모아보기" 류 별도 섹션 — 하단 컴포넌트와 중복 (프로젝트 금지)');
}

// ── 8. 쿠팡 배치 ────────────────────────────────────────────────────
function checkCoupang() {
  const firstLink = body.indexOf('<CoupangLink');
  const disc = body.indexOf('<CoupangDisclosure');
  if (firstLink < 0) return;
  if (disc < 0) add('error', '쿠팡', 'CoupangLink 는 있는데 CoupangDisclosure 가 없다');
  else if (disc > firstLink) add('error', '쿠팡', 'CoupangDisclosure 가 첫 CoupangLink 뒤에 있다');
  const empty = [...body.matchAll(/<CoupangLink[\s\S]*?\/>/g)].filter((m) => /url=""/.test(m[0]));
  if (empty.length) add('error', '쿠팡', `url 이 빈 CoupangLink ${empty.length}개 — npm run coupang -- ${slug} --apply 미실행`);
  // 같은 URL 중복
  const urls = [...body.matchAll(/url="(https:\/\/link\.coupang\.com\/[^"]+)"/g)].map((m) => m[1]);
  const dup = urls.filter((u, i) => urls.indexOf(u) !== i);
  if (dup.length) add('warn', '쿠팡', `같은 딥링크가 2회 이상 — 매칭이 같은 상품으로 걸렸을 수 있다`);
}


// 2026-09-06 신설 — 히어로 이미지 게이트.
// npm run new 가 heroImage 줄을 더 이상 쓰지 않으므로(그 줄이 있는데 파일이 없으면 빌드가 죽는다)
// "이미지를 안 넣었다"는 알림이 빌드에서 여기로 옮겨왔다. 발행 직전이 맞는 타이밍이다.
function checkHeroImage() {
  if (draftArg) return; // 미발행 초안은 폴더가 없을 수 있다
  const dir = join('src', 'content', 'blog', slug, 'images');
  const heroPath = join(dir, 'hero.webp');
  const hasFile = existsSync(heroPath);
  const hasField = /^heroImage:/m.test(fm);

  if (!hasFile && !hasField) {
    add('error', '히어로', 'hero.webp 가 없다 — 이미지를 images/ 에 넣고 npm run webp -- ' + slug);
    return;
  }
  if (hasFile && !hasField) {
    add('error', '히어로', 'hero.webp 는 있는데 frontmatter 에 heroImage 가 없다 — npm run webp -- ' + slug + ' 재실행');
    return;
  }
  if (!hasFile && hasField) {
    add('error', '히어로', 'frontmatter 에 heroImage 가 있는데 파일이 없다 — 이 상태로는 빌드가 실패한다');
    return;
  }
  // 남은 원본(png/jpg)이 있으면 변환이 덜 끝난 것이다
  const leftovers = existsSync(dir)
    ? readdirSync(dir).filter((f) => /\.(png|jpe?g)$/i.test(f))
    : [];
  if (leftovers.length) {
    add('warn', '히어로', '변환 안 된 원본이 남아 있다 — ' + leftovers.join(', '));
  }
}

// ── 실행 ────────────────────────────────────────────────────────────
const rates = checkRates();
const ord = checkOrdinals();
const noteCheck = checkAgainstNote();
checkTargetKeyword();
checkBanned();
checkMdx();
checkInternalLinks();
checkCoupang();
checkHeroImage();

const name = draftArg ? draftArg : slug;
console.log(`\n📋 fact-check — ${name}`);
console.log(`   단가 검산 ${rates.checked}건 · 순번 검증 ${ord.checked}건 · 노트 대조 ${noteCheck.checked}건${note ? '' : ' (노트 없음)'}\n`);

const icon = { error: '⛔', warn: '⚠️ ', info: 'ℹ️ ' };
for (const level of ['error', 'warn', 'info']) {
  for (const f of findings[level]) {
    console.log(`${icon[level]} [${f.section}] ${f.msg}`);
  }
}

const e = findings.error.length;
const w = findings.warn.length;
console.log(`\n${e ? '❌' : '✅'} 오류 ${e}건 · 경고 ${w}건\n`);
process.exit(e ? 1 : 0);
