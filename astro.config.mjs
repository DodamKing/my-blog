// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';
import { defineConfig } from 'astro/config';
import rehypeExternalLinks from 'rehype-external-links'
import sitemapLastmod from './integrations/sitemap-lastmod';

// https://astro.build/config
export default defineConfig({
	site: 'https://blog.dimad.kr',
	integrations: [
		react(),
		mdx(),
		sitemap({
			filter: (page) => {
				const path = new URL(page).pathname;
				if (/^\/blog\/\d+\/?$/.test(path)) return false;
				if (/^\/blog\/[a-z-]+\/\d+\/?$/.test(path)) return false;
				return true;
			},
		}),
		sitemapLastmod(),
	],
	markdown: {
		rehypePlugins: [
			[rehypeExternalLinks, { target: '_blank', rel: ['noopener', 'noreferrer'] }]
		]
	}
});
