// integrations/sitemap-lastmod.js
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';

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
          
          // 3. sitemap-0.xml 수정
          const sitemapPath = join(fileURLToPath(dir), 'sitemap-0.xml');
          let sitemap = readFileSync(sitemapPath, 'utf-8');

          dateMap.forEach((date, url) => {
            const locTag = `<loc>${url}</loc>`;
            if (sitemap.includes(locTag)) {
              sitemap = sitemap.replace(locTag, `${locTag}\n<lastmod>${date}</lastmod>`);
            }
          });

          writeFileSync(sitemapPath, sitemap, 'utf-8');

          // 4. sitemap-index.xml 에도 lastmod 주입 (자식 sitemap 중 가장 최신 날짜)
          const latestDate = [...dateMap.values()].sort().pop();
          if (latestDate) {
            const indexPath = join(fileURLToPath(dir), 'sitemap-index.xml');
            let index = readFileSync(indexPath, 'utf-8');
            const childLoc = '<loc>https://blog.dimad.kr/sitemap-0.xml</loc>';
            if (index.includes(childLoc) && !index.includes('<lastmod>')) {
              index = index.replace(childLoc, `${childLoc}<lastmod>${latestDate}</lastmod>`);
              writeFileSync(indexPath, index, 'utf-8');
            }
          }

          console.log(`✅ Sitemap lastmod 추가 완료: ${dateMap.size}개 URL (index lastmod: ${latestDate || 'none'})`);
        } catch (error) {
          console.error('❌ 실패:', error.message);
        }
      }
    }
  };
}