import { defineCollection, defineHook, field } from "@lucidcms/core";
import type {
	AllHooks,
	LucidPluginDefinition,
	ServiceContext,
	Toolkit,
} from "@lucidcms/core/types";
import { seo } from "@lucidcms/seo";
import { describe, expect, test } from "vitest";
import { PLUGIN_KEY } from "../../constants.js";
import site from "../../plugin.js";
import resolvePluginOptions from "../../site/resolve-plugin-options.js";
import type {
	BuiltSiteData,
	SitePluginOptions,
	SiteStaticFile,
} from "../../types.js";
import renderSite from "./render-site.js";

const data: BuiltSiteData = {
	kind: "build",
	buildId: "1",
	prefix: "site/",
	manifest: {},
	ui: null,
};

const toolkit = {
	documents: {
		getMultiple: async () => ({ error: undefined, data: { items: [] } }),
	},
} as unknown as Toolkit;

/**
 * Builds a static site with the site and SEO plugins configured as Lucid would, plus any extra
 * hooks. The SEO collection has no routing, so the sitemap lists only the site's template pages.
 */
const build = async (props: {
	templates: Record<string, string>;
	hooks?: AllHooks[];
	/** A site URL per locale, for English and French. */
	siteUrls?: { en: string; fr: string };
	/** The site plugin's `locale` option. */
	locale?: SitePluginOptions["locale"];
}) => {
	const given: SitePluginOptions = { mode: "static", locale: props.locale };
	const plugins: LucidPluginDefinition[] = [
		site(given),
		seo({ collections: [{ key: "page" }] }),
	];
	const draft = {
		url: "https://cms.example.com",
		siteUrl: props.siteUrls ?? "https://example.com",
		collections: [
			defineCollection({
				key: "page",
				mode: "multiple",
				details: { labels: { singular: "Page", plural: "Pages" } },
				fields: [field.text("title")],
			}),
		],
		localization: {
			locales: props.siteUrls
				? [{ code: "en" }, { code: "fr" }]
				: [{ code: "en" }],
			defaultLocale: "en",
		},
		translations: { locales: [] },
		access: [],
		admin: { slots: [] },
		http: { routes: [], extensions: [] },
		hooks: props.hooks ?? [],
		plugins,
	};
	for (const plugin of plugins) plugin.configure?.(draft as never);

	const context = {
		config: draft,
		runtimeContext: {
			compiled: true,
			pluginModules: {
				[PLUGIN_KEY]: {
					data,
					templates: Object.fromEntries(
						Object.entries(props.templates).map(([name, source]) => [
							name,
							async () => source,
						]),
					),
					components: {},
					renderers: {},
				},
			},
		},
		translate: { lookup: () => undefined },
	} as unknown as ServiceContext;

	const result = await renderSite(resolvePluginOptions(given)).run({
		context,
		toolkit,
		input: { data, publicPaths: ["/robots.txt"] },
	});
	return new Map(result.files.map((file) => [file.path, file.body]));
};

/** A hook that adds files to the static build. */
const addFiles = (files: SiteStaticFile[]) =>
	defineHook({
		service: "site",
		event: "staticFiles",
		handler: ({ data }) => {
			data.files.push(...files);
		},
	});

describe("renderSite", () => {
	test("writes the sitemap and hook files after the pages, keeping the site's own files", async () => {
		const files = await build({
			templates: {
				"pages/index.kiln": "Home",
				"pages/about.kiln": "About",
				"pages/feed.xml.kiln": "<rss></rss>",
			},
			// The SEO plugin's robots.txt loses to the public file at that path.
			hooks: [
				addFiles([
					{ path: "/llms.txt", body: "Hook" },
					{ path: "/feed.xml", body: "Hook" },
				]),
			],
		});

		expect([...files.keys()].sort()).toEqual([
			"/about/index.html",
			"/feed.xml",
			"/index.html",
			"/llms.txt",
			"/sitemap-site.xml",
			"/sitemap.xml",
		]);
		expect(files.get("/llms.txt")).toBe("Hook");
		expect(files.get("/feed.xml")).toBe("<rss></rss>");
		expect(files.get("/sitemap.xml")).toContain(
			"<loc>https://example.com/sitemap-site.xml</loc>",
		);
		expect(files.get("/sitemap-site.xml")).toContain(
			"<loc>https://example.com/about</loc>",
		);
		expect(files.get("/sitemap-site.xml")).not.toContain("feed.xml");
	});

	test("keeps a sitemap page of the project's own over the SEO plugin's", async () => {
		const files = await build({
			templates: {
				"pages/index.kiln": "Home",
				"pages/sitemap.xml.kiln": "<urlset></urlset>",
			},
		});

		expect(files.get("/sitemap.xml")).toBe("<urlset></urlset>");
		expect(files.get("/sitemap-site.xml")).toContain(
			"<loc>https://example.com/</loc>",
		);
	});

	test("refuses hook files outside the build folder", async () => {
		for (const path of [
			"/../escape.txt",
			"relative.txt",
			"/assets/",
			"/a//b",
		]) {
			await expect(
				build({
					templates: { "pages/index.kiln": "Home" },
					hooks: [addFiles([{ path, body: "Hook" }])],
				}),
			).rejects.toThrow("isn't a file path inside the build folder");
		}
	});

	test("refuses site URLs on more than one domain, whatever the locale option", async () => {
		const byPath: SitePluginOptions["locale"] = ({ path }) =>
			path.startsWith("/fr") ? "fr" : "en";

		for (const locale of [undefined, byPath]) {
			await expect(
				build({
					templates: { "pages/index.kiln": "Home" },
					siteUrls: { en: "https://example.com", fr: "https://example.fr" },
					locale,
				}),
			).rejects.toThrow(
				"Static builds write one folder, but siteUrl puts the site's locales on more than one domain.",
			);
		}
	});

	test("leaves a locale option that reads the URL alone when every locale is on one domain", async () => {
		const files = await build({
			templates: { "pages/fr/index.kiln": "{{ locale }}" },
			siteUrls: { en: "https://example.com", fr: "https://example.com/fr" },
			locale: ({ url }) => (url?.pathname.startsWith("/fr") ? "fr" : "en"),
		});

		expect(files.get("/fr/index.html")).toBe("en");
	});
});
