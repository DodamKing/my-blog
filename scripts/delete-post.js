/**
 * ========================================
 * 블로그 글 삭제 스크립트 (스마트 검색)
 * ========================================
 * 
 * 📝 사용법:
 *   npm run delete
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';
import { buildLedger } from './build-posts-ledger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

// 블로그 목록 가져오기
function getBlogList() {
  const blogDir = path.join(__dirname, '..', 'src', 'content', 'blog');
  
  if (!fs.existsSync(blogDir)) {
    return [];
  }
  
  return fs.readdirSync(blogDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => {
      const blogPath = path.join(blogDir, dirent.name);
      const stat = fs.statSync(blogPath);
      
      // index.mdx에서 제목 읽기 시도
      let title = '';
      try {
        const mdxPath = path.join(blogPath, 'index.mdx');
        if (fs.existsSync(mdxPath)) {
          const content = fs.readFileSync(mdxPath, 'utf-8');
          const titleMatch = content.match(/^title:\s*['"](.+)['"]/m);
          if (titleMatch) title = titleMatch[1];
        }
      } catch (err) {
        // 무시
      }
      
      return {
        slug: dirent.name,
        path: blogPath,
        mtime: stat.mtime,
        title: title || dirent.name
      };
    })
    .sort((a, b) => b.mtime - a.mtime); // 최신순
}

// 폴더 재귀 삭제
function deleteFolderRecursive(folderPath) {
  if (fs.existsSync(folderPath)) {
    fs.readdirSync(folderPath).forEach(file => {
      const curPath = path.join(folderPath, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        deleteFolderRecursive(curPath);
      } else {
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(folderPath);
  }
}

// 유사도 계산 (간단한 Levenshtein distance)
function similarity(a, b) {
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(a, b) {
  const matrix = [];
  
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[b.length][a.length];
}

// 검색 함수
function searchBlogs(blogs, keyword) {
  const lower = keyword.toLowerCase();
  
  // 1단계: 정확한 매칭
  const exact = blogs.filter(b => b.slug === lower);
  if (exact.length > 0) return { type: 'exact', results: exact };
  
  // 2단계: 포함 검색
  const contains = blogs.filter(b => 
    b.slug.includes(lower) || b.title.toLowerCase().includes(lower)
  );
  if (contains.length > 0) return { type: 'contains', results: contains };
  
  // 3단계: 단어 시작 매칭
  const wordStart = blogs.filter(b => 
    b.slug.split('-').some(word => word.startsWith(lower))
  );
  if (wordStart.length > 0) return { type: 'wordStart', results: wordStart };
  
  // 4단계: 유사도 검색 (70% 이상)
  const similar = blogs
    .map(b => ({
      ...b,
      score: Math.max(
        similarity(b.slug, lower),
        similarity(b.title.toLowerCase(), lower)
      )
    }))
    .filter(b => b.score >= 0.5)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
  
  if (similar.length > 0) return { type: 'similar', results: similar };
  
  return { type: 'none', results: [] };
}

// 블로그 목록 출력
function displayBlogs(blogs, startIdx = 0) {
  blogs.forEach((blog, idx) => {
    const num = String(startIdx + idx + 1).padStart(2);
    const date = blog.mtime.toISOString().split('T')[0];
    const displayTitle = blog.title.length > 30 
      ? blog.title.substring(0, 30) + '...' 
      : blog.title;
    
    console.log(`  ${num}) ${displayTitle.padEnd(35)} ${date}`);
    if (blog.slug !== blog.title) {
      console.log(`      → ${blog.slug}`);
    }
  });
}

async function main() {
  console.log('\n🗑️  블로그 글 삭제\n');
  
  const blogs = getBlogList();
  
  if (blogs.length === 0) {
    console.log('❌ 삭제할 블로그 글이 없습니다.');
    rl.close();
    return;
  }
  
  console.log(`📊 전체 ${blogs.length}개의 글이 있습니다.\n`);
  
  // 최근 5개 표시
  const recentCount = Math.min(5, blogs.length);
  console.log(`📋 최근 ${recentCount}개:\n`);
  displayBlogs(blogs.slice(0, recentCount));
  
  console.log('\n💡 사용법:');
  console.log('  • 번호 입력 → 해당 번호 삭제 (예: 1 또는 1,3,5)');
  console.log('  • 검색어 입력 → 검색 후 선택 (예: protein, 더바이)');
  console.log('  • all → 전체 목록 보기');
  console.log('  • 0 또는 엔터 → 취소\n');
  
  const input = await question('입력: ');
  const trimmed = input.trim();
  
  // 취소
  if (!trimmed || trimmed === '0') {
    console.log('❌ 취소되었습니다.');
    rl.close();
    return;
  }
  
  let selectedBlogs = [];
  
  // 전체 목록 보기
  if (trimmed.toLowerCase() === 'all') {
    console.log('\n📋 전체 목록:\n');
    displayBlogs(blogs);
    
    const choice = await question('\n삭제할 번호 (쉼표 구분, 0=취소): ');
    if (!choice.trim() || choice.trim() === '0') {
      console.log('❌ 취소되었습니다.');
      rl.close();
      return;
    }
    
    const numbers = choice.split(',')
      .map(n => parseInt(n.trim()))
      .filter(n => !isNaN(n) && n > 0 && n <= blogs.length);
    
    selectedBlogs = numbers.map(n => blogs[n - 1]);
  }
  // 번호 입력 (숫자와 쉼표만)
  else if (/^[\d,\s]+$/.test(trimmed)) {
    const numbers = trimmed.split(',')
      .map(n => parseInt(n.trim()))
      .filter(n => !isNaN(n) && n > 0 && n <= recentCount);
    
    if (numbers.length === 0) {
      console.log('❌ 올바른 번호를 입력해주세요.');
      rl.close();
      return;
    }
    
    selectedBlogs = numbers.map(n => blogs[n - 1]);
  }
  // 검색어 입력
  else {
    const searchResult = searchBlogs(blogs, trimmed);
    
    if (searchResult.type === 'none') {
      console.log(`\n❌ "${trimmed}"와 일치하는 글을 찾을 수 없습니다.`);
      rl.close();
      return;
    }
    
    const { type, results } = searchResult;
    
    if (type === 'exact') {
      console.log(`\n✅ 정확히 일치하는 글을 찾았습니다!\n`);
      selectedBlogs = results;
    } else {
      const typeLabel = {
        contains: '포함',
        wordStart: '단어 시작',
        similar: '유사'
      }[type];
      
      console.log(`\n🔍 "${trimmed}" 검색 결과 (${typeLabel} 매칭, ${results.length}개):\n`);
      displayBlogs(results);
      
      if (results.length === 1) {
        const auto = await question('\n이 글을 삭제하시겠습니까? (y/n): ');
        if (auto.toLowerCase() === 'y') {
          selectedBlogs = results;
        } else {
          console.log('❌ 취소되었습니다.');
          rl.close();
          return;
        }
      } else {
        const choice = await question('\n삭제할 번호 (쉼표 구분, 0=취소): ');
        if (!choice.trim() || choice.trim() === '0') {
          console.log('❌ 취소되었습니다.');
          rl.close();
          return;
        }
        
        const numbers = choice.split(',')
          .map(n => parseInt(n.trim()))
          .filter(n => !isNaN(n) && n > 0 && n <= results.length);
        
        selectedBlogs = numbers.map(n => results[n - 1]);
      }
    }
  }
  
  if (selectedBlogs.length === 0) {
    console.log('❌ 선택된 글이 없습니다.');
    rl.close();
    return;
  }
  
  // 중복 제거
  selectedBlogs = [...new Map(selectedBlogs.map(b => [b.slug, b])).values()];
  
  // 최종 확인
  console.log('\n⚠️  다음 블로그 글이 삭제됩니다:\n');
  selectedBlogs.forEach(blog => {
    console.log(`  ❌ ${blog.title}`);
    console.log(`     ${blog.slug}\n`);
  });
  
  const confirm = await question('🚨 정말 삭제하시겠습니까? (yes 입력): ');
  
  if (confirm.toLowerCase() !== 'yes') {
    console.log('❌ 취소되었습니다.');
    rl.close();
    return;
  }
  
  // 삭제 실행
  console.log('\n🗑️  삭제 중...\n');
  let successCount = 0;
  
  for (const blog of selectedBlogs) {
    try {
      deleteFolderRecursive(blog.path);
      console.log(`  ✅ ${blog.slug}`);
      successCount++;
    } catch (err) {
      console.log(`  ❌ ${blog.slug} - 실패: ${err.message}`);
    }
  }
  
  console.log(`\n✅ 총 ${successCount}개 삭제 완료!\n`);

  // 글 목록 자동 갱신
  if (successCount > 0) {
    try {
      buildLedger({ silent: true });
      console.log('📚 docs/posts-ledger.md 갱신됨\n');
    } catch (err) {
      console.warn(`⚠️  ledger 갱신 실패: ${err.message}\n`);
    }
  }

  rl.close();
}

main().catch(err => {
  console.error('❌ 오류:', err);
  rl.close();
  process.exit(1);
});