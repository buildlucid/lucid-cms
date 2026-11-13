import { describe, expect, test } from "vitest";
import createRobotsToolkit from "../../toolkit/robots/index.js";
import type { SeoPluginOptions } from "../../types.js";
import parsePluginOptions from "../parse-plugin-options.js";
import buildRobotsText from "./build-robots-text.js";

const collections = [{ key: "page" }];

/** robots.txt for a site with the CMS on one domain and French on another. */
const readRobots = (
	given: Omit<SeoPluginOptions, "collections"> = {},
	origin?: string,
) =>
	createRobotsToolkit(
		{
			config: {
				url: "https://cms.example.com",
				siteUrl: { en: "/", fr: "https://example.fr" },
				localization: {
					locales: [
						{ label: "English", code: "en" },
						{ label: "French", code: "fr" },
					],
					defaultLocale: "en",
				},
			},
		} as never,
		parsePluginOptions({ collections, ...given }),
	).text({ origin });

describe("robots.txt", () => {
	test("lets every crawler in, keeps them out of the admin on the CMS's origin, and points at that origin's sitemap", async () => {
		const cms = await readRobots();
		const french = await readRobots({}, "https://example.fr");

		expect(cms.data).toBe(
			[
				"User-agent: *",
				"Allow: /",
				"Disallow: /admin$",
				"Disallow: /admin?",
				"Disallow: /admin/",
				"",
				"Sitemap: https://cms.example.com/sitemap.xml",
				"",
			].join("\n"),
		);
		expect(french.data).toBe(
			[
				"User-agent: *",
				"Allow: /",
				"",
				"Sitemap: https://example.fr/sitemap.xml",
				"",
			].join("\n"),
		);
	});

	test("custom rules replace the default, and the sitemap line follows the sitemap", async () => {
		const rules = [
			{ userAgent: ["Googlebot", "Bingbot"], allow: "/", disallow: "/search" },
			{ userAgent: "*", disallow: ["/drafts/", "*.pdf$"] },
		];

		const withSitemap = await readRobots({ robots: { rules } });
		const withoutSitemap = await readRobots({
			robots: { rules },
			sitemap: false,
		});

		expect(withSitemap.data).toBe(
			[
				"User-agent: Googlebot",
				"User-agent: Bingbot",
				"Allow: /",
				"Disallow: /search",
				"",
				"User-agent: *",
				"Disallow: /drafts/",
				"Disallow: *.pdf$",
				"",
				"Sitemap: https://cms.example.com/sitemap.xml",
				"",
			].join("\n"),
		);
		expect(withoutSitemap.data).not.toContain("Sitemap:");
	});

	test("refuses an origin that isn't a configured site origin, and answers 404 when turned off", async () => {
		const unknown = await readRobots({}, "https://other.example");
		const off = await readRobots({ robots: false });

		expect(unknown.error?.status).toBe(400);
		expect(off.error?.status).toBe(404);
	});

	test("keeps a group without rules apart from the next one", () => {
		expect(
			buildRobotsText({
				groups: [
					{ userAgent: ["Googlebot"], allow: [], disallow: [] },
					{ userAgent: ["*"], allow: [], disallow: ["/"] },
				],
				sitemapUrl: null,
			}),
		).toBe("User-agent: Googlebot\nAllow: /\n\nUser-agent: *\nDisallow: /\n");
	});

	test.each([
		[{ userAgent: "*", disallow: "/a\nSitemap: https://evil.example" }],
		[{ userAgent: "*", disallow: "admin" }],
		[{ userAgent: " ", allow: "/" }],
		[{ userAgent: [], allow: "/" }],
		[{ userAgent: "* # all", allow: "/" }],
		[{ userAgent: "Googlebot" }],
	])("refuses rule %j when the plugin is created", (rule) => {
		expect(() =>
			parsePluginOptions({ collections, robots: { rules: [rule] } }),
		).toThrow(/Invalid SEO plugin options/);
	});
});
