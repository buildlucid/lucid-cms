import type { ResolvedLucidConfig, Toolkit } from "@lucidcms/core/types";
import { describe, expect, test, vi } from "vitest";
import createSiteConfig from "../../site/create-site-config.js";
import type { Site } from "../../site/create-site-loader.js";
import warnUnbuiltPages from "./warn-unbuilt-pages.js";

const config = {
	localization: {
		locales: [{ code: "en" }, { code: "fr" }],
		defaultLocale: "en",
	},
	collections: [
		{ key: "page", getData: { publishing: { environments: [] } } },
		{ key: "news", getData: { publishing: { environments: [] } } },
		{
			key: "blog",
			getData: {
				publishing: { environments: [{ key: "staging", requires: [] }] },
			},
		},
	],
} as unknown as ResolvedLucidConfig;
const toolkit = {
	documents: {
		getMultiple: async ({ collectionKey }: { collectionKey: string }) => {
			if (collectionKey === "news") throw new Error("afterFetch failed");
			return {
				error: undefined,
				data: {
					data: [{ route: { path: { en: "/en", fr: "/fr/" } } }],
					count: 1,
				},
			};
		},
	},
} as unknown as Toolkit;

describe("warnUnbuiltPages", () => {
	test("warns about links and document URLs the build didn't make, skipping public files, Lucid's paths and collections off the site", async () => {
		const warn = vi.fn();
		await warnUnbuiltPages({
			site: {
				config: createSiteConfig(config, "production"),
			} as Site,
			toolkit,
			collections: ["page", "blog"],
			built: new Set(["/en"]),
			links: new Map([
				["/en", "/en"],
				["/missing", "/en"],
				["/robots.txt", "/en"],
				["/admin/login", "/en"],
			]),
			publicPaths: new Set(["/robots.txt"]),
			warn,
		});
		expect(warn.mock.calls).toEqual([
			["Links to pages the build didn't make: /missing (on /en)"],
			[
				"1 'page' documents have URLs the build didn't make, so their live page links will 404: /fr",
			],
		]);
	});

	test("warns, instead of failing the build, when a collection can't be checked", async () => {
		const warn = vi.fn();
		await warnUnbuiltPages({
			site: {
				config: createSiteConfig(config, "production"),
			} as Site,
			toolkit,
			collections: ["news", "page"],
			built: new Set(["/en", "/fr"]),
			links: new Map(),
			publicPaths: new Set(),
			warn,
		});
		expect(warn.mock.calls).toEqual([
			["Couldn't check the URLs of 'news' documents: afterFetch failed"],
		]);
	});
});
