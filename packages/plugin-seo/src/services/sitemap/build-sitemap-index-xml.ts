import type { SitemapFile } from "../../types.js";
import escapeXml from "./escape-xml.js";

/** Writes the sitemap index, listing every file with the newest `lastmod` of its pages. */
const buildSitemapIndexXml = (files: SitemapFile[]) => {
	const sitemaps = files.map((file) =>
		[
			"<sitemap>",
			`<loc>${escapeXml(file.url)}</loc>`,
			...(file.lastModified
				? [`<lastmod>${escapeXml(file.lastModified)}</lastmod>`]
				: []),
			"</sitemap>",
		].join(""),
	);

	return [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
		...sitemaps,
		"</sitemapindex>",
	].join("\n");
};

export default buildSitemapIndexXml;
