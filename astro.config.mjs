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
	integrations: [react(), mdx(), sitemap(), sitemapLastmod()],
	markdown: {
		rehypePlugins: [
			[rehypeExternalLinks, { target: '_blank', rel: ['noopener', 'noreferrer'] }]
		]
	}
});
