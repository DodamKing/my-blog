/**
 * ========================================
 * 블로그 글 자동 생성 스크립트
 * ========================================
 *
 * 두 가지 모드:
 *
 * 1. Interactive 모드 (사용자가 직접 실행)
 *    npm run new
 *
 * 2. Non-interactive 모드 (Claude 등 자동화)
 *    npm run new -- --slug=my-post --title=제목 --category=tech --description=설명
 *    node scripts/create-post.js --slug=my-post --title=제목 --category=tech
 *
 * CLI 인자:
 *    --slug         (필수) URL slug. 영문 소문자·숫자·하이픈만
 *    --title        제목. 생략 시 "temp"
 *    --category     health | tech | finance | other | 1 | 2 | 3 | 4. 생략 시 "tech"
 *    --description  설명. 생략 시 "temp"
 *    --lang         ko | en. 생략 시 "ko"
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';
import { buildLedger } from './build-posts-ledger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 카테고리 매핑 (숫자·이름 둘 다 허용)
const CATEGORY_MAP = {
  '1': 'health', '2': 'tech', '3': 'finance', '4': 'other',
  'health': 'health', 'tech': 'tech', 'finance': 'finance', 'other': 'other'
};

// CLI 인자 파싱 (--key=value 형식)
const argMap = {};
process.argv.slice(2).forEach(arg => {
  const m = arg.match(/^--([^=]+)=(.*)$/);
  if (m) argMap[m[1]] = m[2];
});
const isBatchMode = Boolean(argMap.slug);

function buildTemplate({ title, description, date, category, lang }) {
  return `---
title: '${title}'
description: '${description}'
pubDate: ${date}
heroImage: './images/hero.webp'
category: '${category}'
lang: '${lang}'
---

## 쿠팡 링크 예시

import CoupangDisclosure from '../../../components/CoupangDisclosure.astro';
import CoupangLink from '../../../components/CoupangLink.astro';

<CoupangDisclosure />

<CoupangLink
  title="제품명"
  url="https://link.coupang.com/..."
  description="제품 설명"
/>

## 소개

여기에 내용을 작성하세요.

## 본문

내용...
`;
}

function writePost({ slug, title, description, category, lang }) {
  const blogDir = path.join(__dirname, '..', 'src', 'content', 'blog', slug);
  const imagesDir = path.join(blogDir, 'images');
  const date = new Date().toISOString().split('T')[0];

  fs.mkdirSync(blogDir, { recursive: true });
  fs.mkdirSync(imagesDir, { recursive: true });

  const template = buildTemplate({ title, description, date, category, lang });
  fs.writeFileSync(path.join(blogDir, 'index.mdx'), template);

  // 글 목록 자동 갱신
  try {
    buildLedger({ silent: true });
  } catch (err) {
    console.warn(`⚠️  ledger 갱신 실패: ${err.message}`);
  }

  return blogDir;
}

// ========================================
// Batch 모드 (CLI 인자)
// ========================================
function runBatch(args) {
  const slug = args.slug;
  const title = args.title || 'temp';
  const description = args.description || 'temp';
  const lang = args.lang === 'en' ? 'en' : 'ko';
  const category = CATEGORY_MAP[args.category || 'tech'];

  // 검증
  if (!/^[a-z0-9-]+$/.test(slug)) {
    console.error(`❌ 슬러그 형식 오류: "${slug}" (영문 소문자·숫자·하이픈만 허용)`);
    process.exit(1);
  }
  if (!category) {
    console.error(`❌ 카테고리 오류: "${args.category}" (허용: health|tech|finance|other 또는 1~4)`);
    process.exit(1);
  }
  const blogDir = path.join(__dirname, '..', 'src', 'content', 'blog', slug);
  if (fs.existsSync(blogDir)) {
    console.error(`❌ 이미 존재하는 슬러그: ${slug}`);
    process.exit(1);
  }

  writePost({ slug, title, description, category, lang });
  console.log(`✅ ${slug} (${category}) 생성 완료`);
}

// ========================================
// Interactive 모드 (기존 대화형)
// ========================================
async function runInteractive() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (q) => new Promise(resolve => rl.question(q, resolve));

  console.log('\n📝 새 블로그 글 생성\n');

  // 1. 슬러그
  let slug = '';
  while (!slug) {
    const input = await question('슬러그 (URL에 사용, 예: whey-protein-guide): ');
    const trimmed = input.trim();

    if (!trimmed) {
      console.log('❌ 슬러그를 입력해주세요.');
      continue;
    }
    if (!/^[a-z0-9-]+$/.test(trimmed)) {
      console.log('❌ 영문 소문자, 숫자, 하이픈(-)만 사용 가능합니다.');
      continue;
    }
    const blogDir = path.join(__dirname, '..', 'src', 'content', 'blog', trimmed);
    if (fs.existsSync(blogDir)) {
      console.log(`❌ 이미 존재하는 슬러그입니다: ${trimmed}`);
      continue;
    }
    slug = trimmed;
  }

  // 2. 제목
  const title = await question('\n제목: ');
  if (!title.trim()) {
    console.error('❌ 제목은 필수입니다.');
    rl.close();
    return;
  }

  // 3. 카테고리
  console.log('\n📂 카테고리를 선택하세요:');
  console.log('  1) health   - 건강/피트니스/영양 (80%)');
  console.log('  2) tech     - 개발/기술 (10%)');
  console.log('  3) finance  - 재테크/수익화 (10%)');
  console.log('  4) other    - 기타');

  let category = '';
  while (!category) {
    const catChoice = await question('카테고리 번호 (1-4): ');
    category = CATEGORY_MAP[catChoice.trim()];
    if (!category || !['1','2','3','4'].includes(catChoice.trim())) {
      // 숫자 아닌 경우 재입력
      if (!CATEGORY_MAP[catChoice.trim()]) {
        console.log('❌ 1, 2, 3, 4 중 하나를 선택해주세요.');
        category = '';
      }
    }
  }

  // 4. 설명
  const description = await question('\n설명 (SEO용, 한 줄): ');
  if (!description.trim()) {
    console.error('❌ 설명은 필수입니다.');
    rl.close();
    return;
  }

  // 5. 언어
  const langChoice = await question('\n언어 (1=한글, 2=영문, 엔터=한글): ');
  const lang = langChoice === '2' ? 'en' : 'ko';

  // 6. 확인
  console.log('\n📋 입력 내용 확인:');
  console.log(`  슬러그: ${slug}`);
  console.log(`  제목: ${title}`);
  console.log(`  카테고리: ${category}`);
  console.log(`  설명: ${description}`);
  console.log(`  언어: ${lang}`);

  const confirm = await question('\n✅ 생성하시겠습니까? (y/n): ');
  if (confirm.toLowerCase() !== 'y') {
    console.log('❌ 취소되었습니다.');
    rl.close();
    return;
  }

  writePost({ slug, title, description, category, lang });

  console.log('📚 docs/posts-ledger.md 갱신됨');
  console.log('\n✅ 생성 완료!\n');
  console.log(`📁 위치: src/content/blog/${slug}/`);
  console.log(`\n💡 다음 단계:`);
  console.log(`  1. ${slug}/images/hero.webp 추가`);
  console.log(`  2. ${slug}/index.mdx 편집`);
  console.log(`  3. npm run dev 로 확인\n`);

  rl.close();
}

// ========================================
// Entry point
// ========================================
if (isBatchMode) {
  runBatch(argMap);
} else {
  runInteractive().catch(err => {
    console.error('❌ 오류:', err);
    process.exit(1);
  });
}
