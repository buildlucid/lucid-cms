import { expect, test } from "vitest";
import buildSitemapXml from "./build-sitemap-xml.js";
import buildUrlXml from "./build-url-xml.js";

test("writes escaped URLs, hreflang links and lastmod only where known", () => {
	const entries = [
		{
			path: "/en/a&b",
			url: "https://example.com/en/a&b?x='1'",
			locale: "en",
			lastModified: "2026-11-01T10:00:00.000Z",
			alternates: [
				{ hreflang: "en", url: "https://example.com/en/a&b?x='1'" },
				{ hreflang: "x-default", url: "https://example.com/en/a&b?x='1'" },
			],
			file: "page",
		},
		{
			path: "/contact",
			url: "https://example.com/contact",
			locale: null,
			lastModified: null,
			alternates: [],
			file: "site",
		},
	];
	const xml = buildSitemapXml(entries.map(buildUrlXml));

	expect(xml).toBe(
		[
			'<?xml version="1.0" encoding="UTF-8"?>',
			'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
			"<url><loc>https://example.com/en/a&amp;b?x=&apos;1&apos;</loc><lastmod>2026-11-01T10:00:00.000Z</lastmod>" +
				'<xhtml:link rel="alternate" hreflang="en" href="https://example.com/en/a&amp;b?x=&apos;1&apos;"/>' +
				'<xhtml:link rel="alternate" hreflang="x-default" href="https://example.com/en/a&amp;b?x=&apos;1&apos;"/></url>',
			"<url><loc>https://example.com/contact</loc></url>",
			"</urlset>",
		].join("\n"),
	);
});
