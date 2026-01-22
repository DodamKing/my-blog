export default {
  async onSuccess() {
    const INDEXNOW_KEY = process.env.INDEXNOW_KEY;
    
    if (!INDEXNOW_KEY) {
      console.log('❌ INDEXNOW_KEY 환경변수가 설정되지 않았습니다');
      return;
    }
    
    const { execSync } = await import('child_process');
    
    // 변경된 블로그 글만 찾기
    let changedFiles = [];
    try {
      changedFiles = execSync(
        'git diff --name-only HEAD~1 HEAD -- "src/content/blog/**/*.{md,mdx}"',
        { encoding: 'utf-8' }
      )
        .trim()
        .split('\n')
        .filter(Boolean);
    } catch (e) {
      console.log('⚠️ 변경된 파일 없음');
      return;
    }
    
    if (changedFiles.length === 0) {
      console.log('✅ 새 블로그 글 없음 - IndexNow 건너뜀');
      return;
    }
    
    // 변경된 파일을 URL로 변환
    const urls = changedFiles.map(file => {
      const slug = file
        .replace('src/content/blog/', '')
        .replace(/\.(md|mdx)$/, '');
      return `https://blog.dimad.kr/blog/${slug}`;
    });
    
    // IndexNow API 호출
    try {
      const response = await fetch('https://api.indexnow.org/indexnow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: 'blog.dimad.kr',
          key: INDEXNOW_KEY,
          keyLocation: `https://blog.dimad.kr/${INDEXNOW_KEY}.txt`,
          urlList: urls
        })
      });
      
      if (response.ok) {
        console.log(`✅ IndexNow 제출 완료: ${urls.length}개 URL (Bing, Naver)`);
        urls.forEach(url => console.log(`   📄 ${url}`));
      } else {
        console.log(`❌ IndexNow 오류: ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ IndexNow 실패: ${error.message}`);
    }
  }
};