import { getCollection } from 'astro:content';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

export default {
	async onPostBuild({ constants }) {
		try {
			console.log('🔧 Sitemap lastmod 추가 시작...');
			
			// 1. 모든 블로그 포스트 가져오기
			const posts = await getCollection('blog');
			
			// 2. URL -> 날짜 매핑 생성
			const dateMap = new Map();
			posts.forEach(post => {
				const url = `https://blog.dimad.kr/blog/${post.id}/`;
				const lastmod = post.data.updatedDate || post.data.pubDate;
				if (lastmod) {
					// 날짜만 (YYYY-MM-DD)
					dateMap.set(url, lastmod.toISOString().split('T')[0]);
				}
			});
			
			// 3. sitemap-0.xml 파일 읽기
			const sitemapPath = join(constants.PUBLISH_DIR, 'sitemap-0.xml');
			let sitemap = readFileSync(sitemapPath, 'utf-8');
			
			// 4. 각 URL에 lastmod 추가
			dateMap.forEach((date, url) => {
				const locTag = `<loc>${url}</loc>`;
				if (sitemap.includes(locTag)) {
					const replacement = `${locTag}\n<lastmod>${date}</lastmod>`;
					sitemap = sitemap.replace(locTag, replacement);
				}
			});
			
			// 5. 수정된 sitemap 저장
			writeFileSync(sitemapPath, sitemap, 'utf-8');
			
			console.log(`✅ Sitemap lastmod 추가 완료: ${dateMap.size}개 URL`);
			
		} catch (error) {
			console.error('❌ Sitemap lastmod 추가 실패:', error.message);
		}
	}
};