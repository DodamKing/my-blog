import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
	// Load Markdown and MDX files in the `src/content/blog/` directory.
	loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
	// Type-check frontmatter using a schema
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			description: z.string(),
			// Transform string to Date object
			pubDate: z.coerce.date(),
			updatedDate: z.coerce.date().optional(),
			heroImage: image().optional(),
			lang: z.enum(['ko', 'en']).default('ko'),
			category: z.enum(['health', 'tech', 'finance', 'other']).default('other'),
			// 발행 시 노린 키워드. 발행 후 1면 진입 검증(scripts/pipeline/serp-audit.mjs)의 입력이다.
			// 기록하지 않으면 사후 검증이 불가능하다 — docs/keyword-algorithm.md 참조
			targetKeyword: z.string().optional(),
		}),
});

export const collections = { blog };
