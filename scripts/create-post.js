/**
 * ========================================
 * 블로그 글 자동 생성 스크립트 (대화형)
 * ========================================
 * 
 * 📝 사용법:
 *   npm run new
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

// 카테고리 목록
const CATEGORIES = {
  '1': 'health',
  '2': 'tech', 
  '3': 'finance',
  '4': 'other'
};

async function main() {
  console.log('\n📝 새 블로그 글 생성\n');
  
  // 1. 슬러그 입력
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
    
    // 중복 체크
    const blogDir = path.join(__dirname, '..', 'src', 'content', 'blog', trimmed);
    if (fs.existsSync(blogDir)) {
      console.log(`❌ 이미 존재하는 슬러그입니다: ${trimmed}`);
      continue;
    }
    
    slug = trimmed;
  }
  
  // 2. 제목 입력
  const title = await question('\n제목: ');
  if (!title.trim()) {
    console.error('❌ 제목은 필수입니다.');
    rl.close();
    return;
  }
  
  // 3. 카테고리 선택
  console.log('\n📂 카테고리를 선택하세요:');
  console.log('  1) health   - 건강/피트니스/영양 (80%)');
  console.log('  2) tech     - 개발/기술 (10%)');
  console.log('  3) finance  - 재테크/수익화 (10%)');
  console.log('  4) other    - 기타');
  
  let category = '';
  while (!category) {
    const catChoice = await question('카테고리 번호 (1-4): ');
    category = CATEGORIES[catChoice];
    if (!category) {
      console.log('❌ 1, 2, 3, 4 중 하나를 선택해주세요.');
    }
  }
  
  // 4. 설명 입력
  const description = await question('\n설명 (SEO용, 한 줄): ');
  if (!description.trim()) {
    console.error('❌ 설명은 필수입니다.');
    rl.close();
    return;
  }
  
  // 5. 언어 선택
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
  
  // 7. 생성
  const blogDir = path.join(__dirname, '..', 'src', 'content', 'blog', slug);
  const imagesDir = path.join(blogDir, 'images');
  const date = new Date().toISOString().split('T')[0];
  
  fs.mkdirSync(blogDir, { recursive: true });
  fs.mkdirSync(imagesDir, { recursive: true });
  
  const template = `---
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

  fs.writeFileSync(path.join(blogDir, 'index.mdx'), template);
  
  console.log('\n✅ 생성 완료!\n');
  console.log(`📁 위치: src/content/blog/${slug}/`);
  console.log(`\n💡 다음 단계:`);
  console.log(`  1. ${slug}/images/hero.webp 추가`);
  console.log(`  2. ${slug}/index.mdx 편집`);
  console.log(`  3. npm run dev 로 확인\n`);
  
  rl.close();
}

main().catch(err => {
  console.error('❌ 오류:', err);
  rl.close();
  process.exit(1);
});