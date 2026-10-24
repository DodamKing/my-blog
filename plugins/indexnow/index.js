export default {
  async onSuccess() {
    const INDEXNOW_KEY = process.env.INDEXNOW_KEY;
    
    if (!INDEXNOW_KEY) {
      console.log('❌ INDEXNOW_KEY 환경변수가 설정되지 않았습니다');
      return;
    }
    
    const { execSync } = await import('child_process');
    
    // Netlify 환경변수로 정확한 커밋 범위 설정
    const current = process.env.COMMIT_REF || 'HEAD';
    const previous = process.env.CACHED_COMMIT_REF;
    const diffRange = previous ? `${previous} ${current}` : 'HEAD~1 HEAD';
    
    console.log('🔎 diffRange:', diffRange);
    
    // 변경된 블로그 글 + 도구 페이지 찾기
    //
    // 2026-07-16 전략 전환: 도구도 색인 대상에 포함.
    // 이전 설계는 "글만 색인 → 글에서 도구로 유입"이었으나, 진입점 글(loan-calculator-guide)이
    // 3개월 반 무노출이었고 정보성 키워드는 문서 수십만짜리 벽이라 애초에 뜰 수가 없다.
    // 반면 tool-intent 키워드는 뚫려 있고(전세 도구 단독 노출 13,420 실증),
    // 짝 글 없는 도구(근무시간·알바비·중도상환)는 색인 경로 자체가 없었다.
    // → 도구는 도구대로 직접 노출을 노린다. (docs/monetization-pivot-backlog.md 참조)
    //
    // 2026-10-25: 새로 추가된 파일만 제출한다 (첫 발행만 자동).
    // 기존 글을 고치기만 해도 재색인 요청이 나가던 구조였다 — redill 붕괴(수정 + 재색인 요청)가
    // 실수 한 번으로 재현될 수 있었다. 수정분은 네이버가 다음 크롤링 때 알아서 가져간다.
    // 수정분도 꼭 제출해야 하면 커밋 메시지에 [indexnow] 를 넣는다.
    let forceAll = false;
    try {
      forceAll = execSync(`git log --format=%B ${previous ? `${previous}..${current}` : '-1'}`, { encoding: 'utf-8' })
        .includes('[indexnow]');
    } catch { /* 커밋 메시지를 못 읽으면 기본(새 글만)으로 간다 */ }
    const diffFilter = forceAll ? 'AMR' : 'A';
    console.log(forceAll ? '🏷 [indexnow] — 수정분 포함 제출' : '🆕 새로 추가된 글·도구만 제출');

    let changedFiles = [];
    try {
      changedFiles = execSync(
        `git diff --name-only --diff-filter=${diffFilter} ${diffRange} -- "src/content/blog/**" "src/pages/tools/**"`,
        { encoding: 'utf-8' }
      )
        .trim()
        .split('\n')
        .filter(Boolean)
        .filter(f =>
          // 글: 폴더형만 (.../slug/index.mdx)
          /^src\/content\/blog\/.+\/index\.(md|mdx)$/.test(f) ||
          // 도구: src/pages/tools/<slug>.astro
          /^src\/pages\/tools\/.+\.astro$/.test(f)
        );
    } catch (e) {
      console.log('⚠️ git diff 실패:', e.message);
      return;
    }

    if (changedFiles.length === 0) {
      console.log('✅ 변경된 글·도구 없음 - IndexNow 건너뜀');
      return;
    }

    console.log('🧾 changedFiles:', changedFiles);

    // 변경된 파일을 URL로 변환 (글 → /blog/<slug>/, 도구 → /tools/<slug>/)
    const urls = changedFiles.map(file => {
      if (file.startsWith('src/pages/tools/')) {
        const slug = file
          .replace('src/pages/tools/', '')
          .replace(/\.astro$/, '');
        // index.astro → /tools/ (도구 목록 페이지)
        return slug === 'index'
          ? 'https://blog.dimad.kr/tools/'
          : `https://blog.dimad.kr/tools/${slug}/`;
      }
      const slug = file
        .replace('src/content/blog/', '')
        .replace(/\/index\.(md|mdx)$/, '');
      return `https://blog.dimad.kr/blog/${slug}/`;
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
        const text = await response.text().catch(() => '');
        console.log(`❌ IndexNow 오류: ${response.status} ${response.statusText}`);
        if (text) console.log('↳ response:', text.slice(0, 500));
      }
    } catch (error) {
      console.log(`❌ IndexNow 실패: ${error.message}`);
    }
  }
};