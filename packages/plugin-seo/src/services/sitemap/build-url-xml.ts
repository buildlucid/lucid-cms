import type { SitemapEntry } from "../../types.js";
import escapeXml from "./escape-xml.js";

/** Writes one page's `<url>` element, with hreflang links for language versions and `lastmod` where known. */
const buildUrlXml = (entry: SitemapEntry) =>
	[
		"<url>",
		`<loc>${escapeXml(entry.url)}</loc>`,
		...(entry.lastModified
			? [`<lastmod>${escapeXml(entry.lastModified)}</lastmod>`]
			: []),
		...entry.alternates.map(
			(alternate) =>
				`<xhtml:link rel="alternate" hreflang="${escapeXml(alternate.hreflang)}" href="${escapeXml(alternate.url)}"/>`,
		),
		"</url>",
	].join("");

export default buildUrlXml;
