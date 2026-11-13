/**
 * Writes one sitemap file from its pages' `<url>` elements, as `buildUrlXml` writes them, one to a
 * line. `splitFiles` sizes files by this layout.
 */
const buildSitemapXml = (urls: string[]) =>
	[
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
		...urls,
		"</urlset>",
	].join("\n");

export default buildSitemapXml;
