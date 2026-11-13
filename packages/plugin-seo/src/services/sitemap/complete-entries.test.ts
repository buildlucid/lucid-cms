import { copy } from "@lucidcms/core";
import { expect, test } from "vitest";
import resolveSiteUrls, { type SiteUrls } from "../resolve-site-urls.js";
import completeEntries from "./complete-entries.js";

const siteUrls = resolveSiteUrls({
	url: "https://cms.example.com",
	siteUrl: { en: "https://example.com", fr: "https://example.fr" },
	localization: {
		locales: [
			{ label: "English", code: "en" },
			{ label: "French", code: "fr" },
		],
		defaultLocale: "en",
	},
}) as SiteUrls;

test("refuses entry and alternate URLs on an origin no site URL has, naming the URL", () => {
	const offsite = (url: string) => ({
		error: {
			type: "basic",
			status: 500,
			message: copy("server:plugin.seo.sitemap.entry.offsite", {
				data: { url, origins: "https://example.com, https://example.fr" },
			}),
		},
		data: undefined,
	});

	expect(
		completeEntries(
			[{ path: "/about", url: "https://other.example/about" }],
			siteUrls,
		),
	).toEqual(offsite("https://other.example/about"));
	expect(
		completeEntries(
			[
				{
					path: "/en/about",
					alternates: [
						{ hreflang: "en", url: "https://example.com/en/about" },
						{ hreflang: "fr", url: "http://example.fr/fr/about" },
					],
				},
			],
			siteUrls,
		),
	).toEqual(offsite("http://example.fr/fr/about"));
});

test("accepts every configured domain and builds missing URLs on the entry's locale's", () => {
	const completed = completeEntries(
		[
			{ path: "/contact", locale: "fr" },
			{ path: "/contact" },
			{
				path: "/about",
				alternates: [{ hreflang: "fr", url: "https://example.fr/a-propos" }],
			},
		],
		siteUrls,
	);

	expect(completed.data?.map((entry) => entry.url)).toEqual([
		"https://example.fr/contact",
		"https://example.com/contact",
		"https://example.com/about",
	]);
});
