import type { ResolvedLucidConfig, Toolkit } from "@lucidcms/core/types";
import { memoryLoader } from "@lucidkiln/core";
import { describe, expect, test, vi } from "vitest";
import createPageRouter from "../../router/create-page-router.js";
import readPageExports from "../../router/read-page-exports.js";
import createSiteConfig from "../../site/create-site-config.js";
import createSiteKiln from "../../site/create-site-kiln.js";
import type { Site } from "../../site/create-site-loader.js";
import collectPagePaths from "./collect-page-paths.js";

const config = {
	localization: { locales: [{ code: "en" }], defaultLocale: "en" },
	collections: [{ key: "page", getData: { publishing: { environments: [] } } }],
} as unknown as ResolvedLucidConfig;
const siteConfig = createSiteConfig(config, {}, null);
const toolkit = {
	documents: {
		getMultiple: async () => ({
			error: undefined,
			data: { items: [{ route: { path: { en: "/en/about" } } }] },
		}),
	},
} as unknown as Toolkit;

/** A site of `templates`, with each page's exports read as `loadSite` reads them. */
const createSite = async (templates: Record<string, string>) => {
	const kiln = createSiteKiln({
		config: siteConfig,
		options: {},
		data: null,
		lookupTranslation: () => undefined,
		loader: memoryLoader(templates),
	});
	const names = Object.keys(templates);
	const exports = new Map(
		await Promise.all(
			names.map(
				async (name) => [name, await readPageExports(kiln, name)] as const,
			),
		),
	);
	return {
		...createPageRouter(names, { mode: "static", exports }),
		freshKiln: kiln,
	} as Site;
};

const collect = async (templates: Record<string, string>, warn = vi.fn()) =>
	collectPagePaths({
		site: await createSite(templates),
		state: {
			toolkit,
			path: "",
			locale: "en",
			preview: null,
			version: siteConfig.getVersion,
		},
		warn,
	});

describe("collectPagePaths", () => {
	test("builds static pages and what dynamic pages list, as URLs or their file names' values", async () => {
		const paths = await collect({
			"pages/index.kiln": "",
			"pages/blog/[slug].kiln": `{% export paths = [{ slug: "hello" }, "/blog/world/"] %}`,
			"pages/docs/[lang]-[version].kiln": `{% export paths = [{ lang: "en", version: 2 }] %}`,
			"pages/guides/[slug]+.kiln": `{% export paths = [{ slug: "hello" }, { slug: "a/b" }] %}`,
			"pages/files/file-[[slug]].kiln": `{% export paths = [{ slug: "hello" }, {}] %}`,
			"pages/[...slug].kiln": `{% export paths = documentPaths("page")|merge([{ slug: "a/b" }]) %}`,
		});
		expect(paths.sort()).toEqual([
			"/",
			"/a/b",
			"/blog/hello",
			"/blog/world",
			"/docs/en-2",
			"/en/about",
			"/files/file-",
			"/files/file-hello",
			"/guides/a/b",
			"/guides/hello",
		]);
	});

	test("fails when a dynamic page has no paths export", async () => {
		await expect(collect({ "pages/blog/[slug].kiln": "" })).rejects.toThrow(
			/need a paths export.*pages\/blog\/\[slug\]\.kiln/,
		);
	});

	test("fails for each path that doesn't route back to its page with the same values", async () => {
		const failure = collect({
			"pages/about.kiln": "",
			"pages/blog/[slug].kiln": `{% export paths = [{ slug: "a/b" }, { title: "x" }, "/about", "blog"] %}`,
			"pages/docs/[lang]-[version].kiln": `{% export paths = [{ lang: "en-us", version: "2" }] %}`,
		});
		await expect(failure).rejects.toThrow(/puts a '\/' in 'slug'/);
		await expect(failure).rejects.toThrow(/gives no value for 'slug'/);
		await expect(failure).rejects.toThrow(
			/lists '\/about', which 'pages\/about\.kiln' renders/,
		);
		await expect(failure).rejects.toThrow(/doesn't start with '\/'/);
		await expect(failure).rejects.toThrow(
			/gives 'lang' as 'en-us', but '\/docs\/en-us-2' routes back with 'en'/,
		);
	});

	test("warns when a page lists no paths", async () => {
		const warn = vi.fn();
		await collect(
			{ "pages/blog/[slug].kiln": "{% export paths = [] %}" },
			warn,
		);
		expect(warn).toHaveBeenCalledWith(expect.stringMatching(/lists no paths/));
	});
});
