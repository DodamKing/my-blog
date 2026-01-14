/**
 * ========================================
 * 블로그 글 자동 생성 스크립트
 * ========================================
 * 
 * 📝 사용법:
 *   npm run new <slug> [lang]
 * 
 * 📌 예시:
 *   npm run new protein-guide-2026        # 한글 글
 *   npm run new workout-tips en           # 영문 글
 * 
 * ✅ 슬러그(slug) 규칙:
 *   - 영문 소문자, 숫자, 하이픈(-)만 사용
 *   - 띄어쓰기 대신 하이픈 사용
 *   - URL이 되므로 명확하고 간결하게
 *   - 좋은 예: protein-guide-2026, best-supplements-korea
 *   - 나쁜 예: 프로틴가이드, Protein_Guide, protein guide
 * 
 * 📁 생성되는 구조:
 *   src/content/blog/<slug>/
 *   ├── index.mdx          # 글 내용 (MDX 포맷)
 *   └── images/            # 이미지 폴더
 *       └── hero.jpg       # 썸네일 (직접 추가 필요)
 * 
 * 🔧 작성 순서:
 *   1. npm run new <slug> 실행
 *   2. <slug>/images/hero.jpg 파일 추가
 *   3. <slug>/index.mdx 편집:
 *      - title: 글 제목 작성
 *      - description: 설명 작성
 *      - 본문 마크다운 작성
 *      - 필요시 컴포넌트 import (예: CoupangLink)
 *   4. npm run dev로 로컬 확인
 *   5. 커밋 & 푸시
 * 
 * 📋 frontmatter 항목:
 *   - title: 글 제목 (필수, SEO 중요)
 *   - description: 설명 (필수, 검색 결과 미리보기)
 *   - pubDate: 발행일 (자동 생성)
 *   - heroImage: 썸네일 경로 (기본값: './images/hero.jpg')
 *   - lang: 언어 ('ko' 또는 'en', 기본값: 'ko')
 * 
 * 🎨 컴포넌트 사용 (MDX):
 *   import CoupangLink from '../../../components/CoupangLink.astro';
 *   
 *   <CoupangLink
 *     title="제품명"
 *     url="https://link.coupang.com/..."
 *     description="제품 설명"
 *   />
 * 
 * ⚠️  주의사항:
 *   - 슬러그는 변경 불가 (URL이 되므로)
 *   - hero.jpg는 반드시 추가해야 함 (없으면 빌드 에러)
 *   - 같은 슬러그로 재생성 시도하면 에러 발생
 *   - MDX에서는 컴포넌트 import 경로 주의
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 사용법 출력
function printUsage() {
  console.log('\n📝 사용법:');
  console.log('  npm run new <slug> [lang]\n');
  console.log('예시:');
  console.log('  npm run new protein-guide-2026        # 한글 글');
  console.log('  npm run new workout-tips en           # 영문 글\n');
  console.log('슬러그(slug) 규칙:');
  console.log('  - 영문 소문자, 숫자, 하이픈(-)만 사용');
  console.log('  - 띄어쓰기 대신 하이픈 사용');
  console.log('  - 예: protein-guide-2026, best-supplements\n');
}

const args = process.argv.slice(2);
const slug = args[0];
const lang = args[1] || 'ko';

// 인자 검증
if (!slug) {
  console.error('❌ 슬러그를 입력해주세요.');
  printUsage();
  process.exit(1);
}

// 슬러그 검증 (영문, 숫자, 하이픈만)
if (!/^[a-z0-9-]+$/.test(slug)) {
  console.error('❌ 슬러그는 영문 소문자, 숫자, 하이픈(-)만 사용 가능합니다.');
  console.error(`   입력값: ${slug}`);
  printUsage();
  process.exit(1);
}

// 언어 검증
if (!['ko', 'en'].includes(lang)) {
  console.error('❌ 언어는 ko 또는 en만 가능합니다.');
  printUsage();
  process.exit(1);
}

const blogDir = path.join(__dirname, '..', 'src', 'content', 'blog', slug);
const imagesDir = path.join(blogDir, 'images');
const date = new Date().toISOString().split('T')[0];

// 이미 존재하는지 확인
if (fs.existsSync(blogDir)) {
  console.error(`\n❌ 이미 존재하는 글입니다: ${slug}`);
  console.error(`   위치: src/content/blog/${slug}\n`);
  process.exit(1);
}

// 폴더 생성
fs.mkdirSync(blogDir, { recursive: true });
fs.mkdirSync(imagesDir, { recursive: true });

// MDX 템플릿 생성
const template = `---
title: 'Title Here'
description: 'Description here'
pubDate: ${date}
heroImage: './images/hero.jpg'
lang: '${lang}'
---

Write your content here.

## Section 1

Content...

## Section 2

Content...

## 쿠팡 링크 사용 예시

아래처럼 컴포넌트를 import하고 사용하세요:

{/* 
import CoupangLink from '../../../components/CoupangLink.astro';

<CoupangLink
  title="제품명"
  url="https://link.coupang.com/..."
  description="제품 설명"
/>
*/}
`;

fs.writeFileSync(path.join(blogDir, 'index.mdx'), template);

// 성공 메시지
console.log('\n✅ 블로그 글 생성 완료!\n');
console.log(`📁 위치: src/content/blog/${slug}/`);
console.log(`📝 파일: src/content/blog/${slug}/index.mdx`);
console.log(`🖼️  이미지: src/content/blog/${slug}/images/\n`);
console.log('💡 다음 단계:');
console.log(`   1. ${slug}/images/hero.jpg 파일 추가`);
console.log(`   2. ${slug}/index.mdx 파일 편집 (제목, 설명, 본문)`);
console.log(`   3. 쿠팡 링크 필요시 CoupangLink 컴포넌트 사용`);
console.log('   4. npm run dev 로 확인\n');