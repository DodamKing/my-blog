// integrations/sitemap-lastmod.js
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';

const META_PATH = join(process.cwd(), '.sitemap-meta.json');

export default function sitemapLastmod() {
  return {
    name: 'sitemap-lastmod',
    hooks: {
      'astro:build:done': async ({ dir }) => {
        try {
          console.log('🔧 Sitemap lastmod 추가 시작...');

          // 1. src/content/blog 폴더 읽기
          const blogDir = join(process.cwd(), 'src/content/blog');
          const dateMap = new Map();

          const folders = readdirSync(blogDir, { withFileTypes: true })
            .filter(d => d.isDirectory())
            .map(d => d.name);

          // 2. 각 폴더의 index.mdx frontmatter 읽기
          folders.forEach(slug => {
            try {
              const mdxPath = join(blogDir, slug, 'index.mdx');
              const content = readFileSync(mdxPath, 'utf-8');
              const { data } = matter(content);

              const url = `https://blog.dimad.kr/blog/${slug}/`;
              const lastmod = data.updatedDate || data.pubDate;

              if (lastmod) {
                const date = new Date(lastmod).toISOString().split('T')[0];
                dateMap.set(url, date);
              }
            } catch (err) {
              // 파일 없으면 무시
            }
          });

          // 3. sitemap-0.xml URL별 lastmod 주입
          const sitemapPath = join(fileURLToPath(dir), 'sitemap-0.xml');
          let sitemap = readFileSync(sitemapPath, 'utf-8');

          dateMap.forEach((date, url) => {
            const locTag = `<loc>${url}</loc>`;
            if (sitemap.includes(locTag)) {
              sitemap = sitemap.replace(locTag, `${locTag}\n<lastmod>${date}</lastmod>`);
            }
          });

          writeFileSync(sitemapPath, sitemap, 'utf-8');

          // 4. sitemap-index.xml lastmod 결정
          // - 슬러그 목록이 직전 빌드와 다르면(추가/삭제) 오늘 날짜
          // - 같으면 글 frontmatter 최신값 사용 (수정은 updatedDate로 자동 반영)
          const today = new Date().toISOString().split('T')[0];
          const latestPostDate = [...dateMap.values()].sort().pop();

          const currentSlugs = [...folders].sort();
          let prevSlugs = [];
          if (existsSync(META_PATH)) {
            try {
              prevSlugs = JSON.parse(readFileSync(META_PATH, 'utf-8')).slugs || [];
            } catch {}
          }
          const slugsChanged = JSON.stringify(currentSlugs) !== JSON.stringify(prevSlugs);
          const indexLastmod = slugsChanged ? today : (latestPostDate || today);

          const indexPath = join(fileURLToPath(dir), 'sitemap-index.xml');
          let index = readFileSync(indexPath, 'utf-8');
          const childLoc = '<loc>https://blog.dimad.kr/sitemap-0.xml</loc>';
          if (index.includes(childLoc) && !index.includes('<lastmod>')) {
            index = index.replace(childLoc, `${childLoc}<lastmod>${indexLastmod}</lastmod>`);
            writeFileSync(indexPath, index, 'utf-8');
          }

          // 5. 메타 파일 갱신 (다음 빌드의 비교 기준)
          writeFileSync(META_PATH, JSON.stringify({ slugs: currentSlugs }, null, 2) + '\n', 'utf-8');

          const changeNote = slugsChanged ? ' — 슬러그 변경 감지' : '';
          console.log(`✅ Sitemap lastmod 완료: ${dateMap.size}개 URL (index lastmod: ${indexLastmod}${changeNote})`);
        } catch (error) {
          console.error('❌ Sitemap lastmod 실패:', error.message);
        }
      }
    }
  };
}
