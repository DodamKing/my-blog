export async function GET(context) {
	const posts = await getCollection('blog');
	
	const rssContent = await rss({
		title: SITE_TITLE,
		description: SITE_DESCRIPTION,
		site: context.site,
		items: posts.map((post) => ({
			...post.data,
			link: `/blog/${post.id}/`,
		})),
		customData: `<language>ko-kr</language>`,
	});

	return new Response(rssContent.body, {
		headers: {
			'Content-Type': 'application/xml; charset=utf-8',
		},
	});
}