// integrations/sitemap-lastmod.js
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';
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
          
          // 3. sitemap 수정
          const sitemapPath = join(dir.pathname, 'sitemap-0.xml');
          let sitemap = readFileSync(sitemapPath, 'utf-8');
          
          dateMap.forEach((date, url) => {
            const locTag = `<loc>${url}</loc>`;
            if (sitemap.includes(locTag)) {
              sitemap = sitemap.replace(locTag, `${locTag}\n<lastmod>${date}</lastmod>`);
            }
          });
          
          writeFileSync(sitemapPath, sitemap, 'utf-8');
          
          console.log(`✅ Sitemap lastmod 추가 완료: ${dateMap.size}개 URL`);
        } catch (error) {
          console.error('❌ 실패:', error.message);
        }
      }
    }
  };
}