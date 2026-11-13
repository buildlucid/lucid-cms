import { describe, expect, test } from "vitest";
import { sitemap } from "../../constants.js";
import type { SitemapEntry } from "../../types.js";
import buildSitemapIndexXml from "./build-sitemap-index-xml.js";
import buildSitemapXml from "./build-sitemap-xml.js";
import buildUrlXml from "./build-url-xml.js";
import splitFiles from "./split-files.js";

const origin = "https://example.com";

const entry = (
	path: string,
	file: string,
	lastModified: string | null = null,
): SitemapEntry => ({
	path,
	url: `https://example.com${path}`,
	locale: null,
	lastModified,
	alternates: [],
	file,
});

describe("sitemap files", () => {
	test("splits a file past the limit and the index lists every file", () => {
		const groups = splitFiles(
			[
				entry("/a", "page", "2026-11-01T10:00:00.000Z"),
				entry("/b", "page", "2026-11-03T10:00:00.000Z"),
				entry("/c", "page"),
				entry("/contact", "site"),
				entry("/d", "page", "2026-11-02T10:00:00.000Z"),
			],
			origin,
			{ ...sitemap.fileLimits, urls: 2 },
		);

		expect(groups.data?.map(({ file }) => file)).toEqual([
			{
				name: "page",
				path: "/sitemap-page.xml",
				url: "https://example.com/sitemap-page.xml",
				count: 2,
				lastModified: "2026-11-03T10:00:00.000Z",
			},
			{
				name: "page-2",
				path: "/sitemap-page-2.xml",
				url: "https://example.com/sitemap-page-2.xml",
				count: 2,
				lastModified: "2026-11-02T10:00:00.000Z",
			},
			{
				name: "site",
				path: "/sitemap-site.xml",
				url: "https://example.com/sitemap-site.xml",
				count: 1,
				lastModified: null,
			},
		]);

		const index = buildSitemapIndexXml(
			groups.data?.map(({ file }) => file) ?? [],
		);
		expect(index).toBe(
			[
				'<?xml version="1.0" encoding="UTF-8"?>',
				'<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
				"<sitemap><loc>https://example.com/sitemap-page.xml</loc><lastmod>2026-11-03T10:00:00.000Z</lastmod></sitemap>",
				"<sitemap><loc>https://example.com/sitemap-page-2.xml</loc><lastmod>2026-11-02T10:00:00.000Z</lastmod></sitemap>",
				"<sitemap><loc>https://example.com/sitemap-site.xml</loc></sitemap>",
				"</sitemapindex>",
			].join("\n"),
		);
	});

	test("splits a file before its XML passes the size limit, counted in UTF-8 bytes", () => {
		const entries = ["/é", "/ü", "/ß"].map((path) => entry(path, "page"));
		const twoPages = new TextEncoder().encode(
			buildSitemapXml(entries.slice(0, 2).map(buildUrlXml)),
		).byteLength;
		const counts = (bytes: number) =>
			splitFiles(entries, origin, { ...sitemap.fileLimits, bytes }).data?.map(
				({ file }) => file.count,
			);

		expect(counts(twoPages)).toEqual([2, 1]);
		expect(counts(twoPages - 1)).toEqual([1, 1, 1]);
	});

	test("refuses two files with the same name", () => {
		const groups = splitFiles(
			[entry("/a", "page"), entry("/b", "page"), entry("/c", "page-2")],
			origin,
			{ ...sitemap.fileLimits, urls: 1 },
		);

		expect(groups.error?.status).toBe(500);
	});
});
