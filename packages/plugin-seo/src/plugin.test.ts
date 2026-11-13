import { defineCollection, field } from "@lucidcms/core";
import type { AllHooks, HttpExtension } from "@lucidcms/core/types";
import { describe, expect, test, vi } from "vitest";
import seo from "./plugin.js";
import type { SeoPluginOptions } from "./types.js";

const configure = (
	options: Pick<SeoPluginOptions, "sitemap" | "robots"> = {},
	extensions: HttpExtension[] = [],
) => {
	const draft = {
		url: "https://cms.example.com",
		collections: [
			defineCollection({
				key: "page",
				mode: "multiple",
				details: { labels: { singular: "Page", plural: "Pages" } },
				fields: [field.text("title")],
			}),
		],
		access: [] as Array<{ key: string }>,
		admin: { slots: [] },
		http: {
			routes: [] as Array<{ path: string }>,
			extensions: [...extensions],
		},
		hooks: [] as AllHooks[],
	};
	seo({ collections: [{ key: "page" }], ...options }).configure?.(
		draft as never,
	);
	return draft;
};

/** The paths the CMS's own sitemap files are served at, for a final config's `siteUrl`. */
const servedPaths = (
	extensions: HttpExtension[],
	siteUrl: string | Record<string, string>,
) => {
	const app = { get: vi.fn() };
	for (const extension of extensions) {
		extension.register(
			app as never,
			{
				url: "https://cms.example.com",
				siteUrl,
				localization: {
					locales: [
						{ label: "English", code: "en" },
						{ label: "French", code: "fr" },
					],
					defaultLocale: "en",
				},
			} as never,
		);
	}
	return app.get.mock.calls.map(([path]) => path);
};

describe("seo sitemap and robots registration", () => {
	test("adds nothing when the sitemap and robots.txt are turned off", () => {
		const draft = configure({ sitemap: false, robots: false });

		expect(draft.access).toEqual([]);
		expect(draft.http.routes).toEqual([]);
		expect(draft.http.extensions).toEqual([]);
		expect(draft.hooks).toEqual([]);
	});

	test("turns each off on its own", () => {
		const robotsOnly = configure({ sitemap: false });
		const sitemapOnly = configure({ robots: false });

		expect(robotsOnly.access.map((group) => group.key)).toEqual(["robots"]);
		expect(robotsOnly.http.routes.map((route) => route.path)).toEqual([
			"/seo/robots",
		]);
		expect(servedPaths(robotsOnly.http.extensions, "/")).toEqual([
			"/robots.txt",
		]);
		expect(sitemapOnly.access.map((group) => group.key)).toEqual(["sitemap"]);
		expect(servedPaths(sitemapOnly.http.extensions, "/")).toEqual([
			"/sitemap.xml",
			"/:file{sitemap-[a-z0-9_-]+\\.xml}",
		]);
		//* static builds still get whichever is on
		expect(robotsOnly.hooks).toHaveLength(1);
		expect(sitemapOnly.hooks).toHaveLength(1);
	});

	test("serves root files on the CMS only when a site URL is on its origin", () => {
		const draft = configure();

		expect(draft.access.map((group) => group.key)).toEqual([
			"sitemap",
			"robots",
		]);
		expect(draft.http.routes.map((route) => route.path)).toEqual([
			"/seo/sitemap/entries",
			"/seo/sitemap/files",
			"/seo/sitemap/xml",
			"/seo/robots",
		]);
		expect(servedPaths(draft.http.extensions, "https://example.com")).toEqual(
			[],
		);
		const served = [
			"/robots.txt",
			"/sitemap.xml",
			"/:file{sitemap-[a-z0-9_-]+\\.xml}",
		];
		expect(servedPaths(draft.http.extensions, "/")).toEqual(served);
		expect(
			servedPaths(draft.http.extensions, {
				en: "https://example.com",
				fr: "/",
			}),
		).toEqual(served);
	});

	test("root files wait for the fallback phase, ahead of fallbacks plugins added before", () => {
		const pages: HttpExtension = {
			name: "site:pages",
			phase: "fallback",
			register: () => {},
		};

		const draft = configure({}, [pages]);

		expect(
			draft.http.extensions.map(({ name, phase }) => ({ name, phase })),
		).toEqual([
			{ name: "@lucidcms/seo:robots", phase: "fallback" },
			{ name: "@lucidcms/seo:sitemap", phase: "fallback" },
			{ name: "site:pages", phase: "fallback" },
		]);
	});
});
