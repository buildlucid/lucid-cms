import { describe, expect, test } from "vitest";
import resolveSiteUrls, { type SiteUrls } from "../resolve-site-urls.js";
import buildDocumentEntries, {
	type SitemapDocumentRow,
} from "./build-document-entries.js";

const localization = {
	locales: [
		{ label: "English", code: "en" },
		{ label: "French", code: "fr" },
	],
	defaultLocale: "en",
};
const siteUrls = (siteUrl: string | Record<string, string>) =>
	resolveSiteUrls({
		url: "https://cms.example.com",
		siteUrl,
		localization,
	}) as SiteUrls;

const row = (values: Partial<SitemapDocumentRow>): SitemapDocumentRow => ({
	documentId: 1,
	locale: null,
	path: "/",
	lastModified: "2026-11-01T10:00:00.000Z",
	indexing: "index",
	canonicalUrl: null,
	...values,
});

const build = (
	rows: SitemapDocumentRow[],
	siteUrl: string | Record<string, string> = "https://example.com",
) =>
	buildDocumentEntries({
		rows,
		file: "page",
		siteUrls: siteUrls(siteUrl),
		defaultLocale: "en",
	});

describe("sitemap document entries", () => {
	test("leaves out noindex pages and canonicals elsewhere, but keeps self-canonical pages", () => {
		const { entries, excluded } = build([
			row({ documentId: 1, path: "/hidden", indexing: "noindex" }),
			row({
				documentId: 2,
				path: "/copy",
				canonicalUrl: "https://example.com/original",
			}),
			row({
				documentId: 3,
				path: "/about",
				canonicalUrl: "https://example.com/about/",
			}),
			row({ documentId: 4, path: "contact" }),
		]);

		expect(entries.map((entry) => entry.url)).toEqual([
			"https://example.com/about",
			"https://example.com/contact",
		]);
		expect(entries[1]?.path).toBe("/contact");
		expect(excluded).toEqual([
			{ path: "/hidden", locale: null },
			{ path: "/copy", locale: null },
		]);
	});

	test("links every listed language version to the others and the default locale", () => {
		const { entries } = build([
			row({ documentId: 1, locale: "en", path: "/en/about" }),
			row({ documentId: 1, locale: "fr", path: "/fr/a-propos" }),
			row({ documentId: 2, locale: "en", path: "/en/team" }),
			row({
				documentId: 2,
				locale: "fr",
				path: "/fr/equipe",
				indexing: "noindex",
			}),
		]);

		const about = [
			{ hreflang: "en", url: "https://example.com/en/about" },
			{ hreflang: "fr", url: "https://example.com/fr/a-propos" },
			{ hreflang: "x-default", url: "https://example.com/en/about" },
		];
		expect(entries).toMatchObject([
			{ url: "https://example.com/en/about", locale: "en", alternates: about },
			{
				url: "https://example.com/fr/a-propos",
				locale: "fr",
				alternates: about,
			},
			//* a page with one listed language has nothing to link to
			{ url: "https://example.com/en/team", alternates: [] },
		]);
	});

	test("lists each language version on its locale's domain, linked across domains", () => {
		const { entries, excluded } = build(
			[
				row({ documentId: 1, locale: "en", path: "/about" }),
				//* canonical to its own domain's URL, so it stays
				row({
					documentId: 1,
					locale: "fr",
					path: "/a-propos",
					canonicalUrl: "https://example.fr/a-propos",
				}),
				//* canonical to the same path on the default domain, which is elsewhere for fr
				row({
					documentId: 2,
					locale: "fr",
					path: "/team",
					canonicalUrl: "https://example.com/team",
				}),
			],
			{ en: "https://example.com", fr: "https://example.fr" },
		);

		const about = [
			{ hreflang: "en", url: "https://example.com/about" },
			{ hreflang: "fr", url: "https://example.fr/a-propos" },
			{ hreflang: "x-default", url: "https://example.com/about" },
		];
		expect(entries).toMatchObject([
			{ url: "https://example.com/about", alternates: about },
			{ url: "https://example.fr/a-propos", alternates: about },
		]);
		//* with its locale, so hooks leave it out on the French domain only
		expect(excluded).toEqual([{ path: "/team", locale: "fr" }]);
	});
});
