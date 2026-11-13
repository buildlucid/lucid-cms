import type {
	ResolvedLucidConfig,
	ServiceContext,
	Toolkit,
} from "@lucidcms/core/types";
import type {
	SeoSitemapEntriesHookMeta,
	SitemapEntryInput,
} from "@lucidcms/seo";
import { describe, expect, test } from "vitest";
import { PLUGIN_KEY } from "../constants.js";
import shareSiteLoader from "../site/share-site-loader.js";
import type { SiteModule, SitePluginOptionsInternal } from "../types.js";
import sitemapEntriesHandler from "./sitemap-entries-handler.js";

const config = {
	localization: {
		locales: [{ code: "en" }, { code: "fr" }, { code: "de" }],
		defaultLocale: "en",
	},
	collections: [],
} as unknown as ResolvedLucidConfig;

const options: SitePluginOptionsInternal = {
	directory: "site",
	mode: "ssr",
	trailingSlash: "always",
	static: { outDir: "dist-site" },
	locales: ["en", "fr"],
	locale: ({ path }) => (path.startsWith("/fr") ? "fr" : "en"),
};

const templates: Record<string, string> = {
	"pages/index.kiln": "Home",
	"pages/about.kiln": "About",
	"pages/news.kiln": "News",
	"pages/fr/contact.kiln": "Contact",
	"pages/hidden.kiln": "{% export sitemap = false %}Hidden",
	"pages/feed.xml.kiln": "<rss></rss>",
	"pages/blog/[slug].kiln": "{% export paths = [] %}Post",
	"pages/_404.kiln": "Missing",
};

/** A service context whose built site has the given templates. */
const createContext = (
	pages: Record<string, string>,
	siteConfig: ResolvedLucidConfig = config,
) => {
	const module: SiteModule = {
		data: {
			kind: "build",
			buildId: "1",
			prefix: "site/",
			manifest: {},
			ui: null,
		},
		templates: Object.fromEntries(
			Object.entries(pages).map(([name, source]) => [name, async () => source]),
		),
		components: {},
		renderers: {},
	};

	return {
		config: siteConfig,
		runtimeContext: { compiled: true, pluginModules: { [PLUGIN_KEY]: module } },
		translate: { lookup: () => undefined },
	} as unknown as ServiceContext;
};

/** Every language version of a page, with `x-default` on the given locale's. */
const versions = (path: string, locales: string[], fallback: string) => [
	...locales.map((locale) => ({
		hreflang: locale,
		url: `https://example.com/${locale}${path}`,
	})),
	{ hreflang: "x-default", url: `https://example.com/${fallback}${path}` },
];

/** Entries as the SEO plugin lists them: a document in three languages, one in two and an unlocalized page. */
const listed = (): SitemapEntryInput[] => [
	...["en", "fr", "de"].map((locale) => ({
		path: `/${locale}/guide`,
		url: `https://example.com/${locale}/guide`,
		locale,
		alternates: versions("/guide", ["en", "fr", "de"], "de"),
		file: "page",
	})),
	...["en", "de"].map((locale) => ({
		path: `/${locale}/pricing`,
		url: `https://example.com/${locale}/pricing`,
		locale,
		alternates: versions("/pricing", ["en", "de"], "en"),
		file: "page",
	})),
	{ path: "/news/", url: "https://example.com/news/", locale: null },
	{ path: "/feed.xml" },
];

const runHook = async (
	environment: string,
	extra: {
		templates?: Record<string, string>;
		excluded?: SeoSitemapEntriesHookMeta["excluded"];
		entries?: SitemapEntryInput[];
	} = {},
) => {
	const data = { entries: [...listed(), ...(extra.entries ?? [])] };
	await sitemapEntriesHandler(
		options,
		shareSiteLoader(options),
	)({
		meta: {
			environment,
			siteUrl: "https://example.com/",
			siteUrls: {},
			excluded: extra.excluded ?? [],
		},
		data,
		context: createContext({ ...templates, ...extra.templates }),
		toolkit: {} as Toolkit,
	});
	return data.entries;
};

describe("sitemapEntriesHandler", () => {
	test("adds pages without route parameters and gives every entry the site's trailing slash and locales", async () => {
		const guide = (locale: string) => ({
			path: `/${locale}/guide/`,
			url: `https://example.com/${locale}/guide/`,
			locale,
			alternates: [
				{ hreflang: "en", url: "https://example.com/en/guide/" },
				{ hreflang: "fr", url: "https://example.com/fr/guide/" },
			],
			file: "page",
		});

		expect(await runHook("latest")).toEqual([
			guide("en"),
			guide("fr"),
			{
				path: "/en/pricing/",
				url: "https://example.com/en/pricing/",
				locale: "en",
				alternates: [],
				file: "page",
			},
			{ path: "/news/", url: "https://example.com/news/", locale: null },
			{ path: "/feed.xml" },
			{ path: "/", locale: "en" },
			{ path: "/about/", locale: "en" },
			{ path: "/fr/contact/", locale: "fr" },
		]);
	});

	test("drops entries whose page opts out, with links to them, and doesn't add back paths the SEO plugin left out", async () => {
		const entries = await runHook("latest", {
			templates: {
				"pages/fr/[slug].kiln": "{% export sitemap = false %}Page",
				"pages/private.kiln": "Private",
			},
			// A noindex document at /private, and one at /about in a locale the site doesn't have.
			excluded: [
				{ path: "/private", locale: "en" },
				{ path: "/about", locale: "de" },
			],
		});

		expect(entries).toEqual([
			{
				path: "/en/guide/",
				url: "https://example.com/en/guide/",
				locale: "en",
				alternates: [],
				file: "page",
			},
			{
				path: "/en/pricing/",
				url: "https://example.com/en/pricing/",
				locale: "en",
				alternates: [],
				file: "page",
			},
			{ path: "/news/", url: "https://example.com/news/", locale: null },
			{ path: "/feed.xml" },
			{ path: "/", locale: "en" },
			{ path: "/about/", locale: "en" },
			{ path: "/fr/contact/", locale: "fr" },
		]);
	});

	test("matches paths to pages however they are encoded", async () => {
		const entries = await runHook("latest", {
			templates: {
				"pages/café.kiln": "{% export sitemap = false %}Café",
				"pages/über.kiln": "Über",
			},
			excluded: [{ path: "/%C3%BCber", locale: null }],
			entries: [{ path: "/café" }, { path: "/100%" }],
		});
		const paths = entries.map((entry) => entry.path);

		expect(paths).not.toContain("/café/");
		expect(paths).not.toContain("/über/");
		// A malformed percent sequence matches no page, rather than failing the sitemap.
		expect(paths).toContain("/100%/");
	});

	test.each(["/en/private", "/en/private/"])(
		"drops links to an opted-out entry that has no url yet, at %s",
		async (path) => {
			const entries = await runHook("latest", {
				templates: { "pages/en/private.kiln": "{% export sitemap = false %}" },
				entries: [
					{ path, locale: "en" },
					{
						path: "/fr/prive",
						url: "https://example.com/fr/prive",
						locale: "fr",
						alternates: [
							{ hreflang: "en", url: "https://example.com/en/private" },
							{ hreflang: "fr", url: "https://example.com/fr/prive" },
							{ hreflang: "x-default", url: "https://example.com/en/private" },
						],
					},
				],
			});

			expect(entries.map((entry) => entry.path)).not.toContain("/en/private/");
			expect(entries).toContainEqual({
				path: "/fr/prive/",
				url: "https://example.com/fr/prive/",
				locale: "fr",
				alternates: [],
			});
		},
	);

	test("lists pages with route parameters that opt in at their paths, linking one per locale", async () => {
		const entries = await runHook("latest", {
			templates: {
				"pages/[locale]/offers/[slug].kiln": `{% export sitemap = true %}{% export paths = ["/en/offers/spring", "/fr/offers/printemps"] %}Offer`,
				"pages/tags/[tag].kiln": `{% export sitemap = true %}{% export paths = [{ tag: "red" }, { tag: "blue" }, { tag: "listed" }, { tag: "hidden" }, { tag: "red" }] %}Tag`,
			},
			excluded: [{ path: "/tags/hidden", locale: "en" }],
			entries: [{ path: "/tags/listed" }],
		});
		const offer = {
			alternates: [
				{ hreflang: "en", url: "https://example.com/en/offers/spring/" },
				{ hreflang: "fr", url: "https://example.com/fr/offers/printemps/" },
				{ hreflang: "x-default", url: "https://example.com/en/offers/spring/" },
			],
		};

		expect(entries.filter((entry) => entry.path.includes("/offers/"))).toEqual([
			{ path: "/en/offers/spring/", locale: "en", ...offer },
			{ path: "/fr/offers/printemps/", locale: "fr", ...offer },
		]);
		// Several paths in one locale can't be paired, so tags get no links.
		expect(entries.filter((entry) => entry.path.startsWith("/tags/"))).toEqual([
			{ path: "/tags/listed/" },
			{ path: "/tags/red/", locale: "en" },
			{ path: "/tags/blue/", locale: "en" },
		]);
		// Pages with route parameters stay out unless they opt in.
		expect(entries.map((entry) => entry.path)).not.toContain("/blog/");
	});

	test("refuses sitemap = true where it can't list the page", async () => {
		await expect(
			runHook("latest", {
				templates: { "pages/team/[slug].kiln": "{% export sitemap = true %}" },
			}),
		).rejects.toThrow(
			"'pages/team/[slug].kiln' exports sitemap = true, but the sitemap lists a page with route parameters from its paths export.",
		);
		await expect(
			runHook("latest", {
				templates: { "pages/feed.xml.kiln": "{% export sitemap = true %}" },
			}),
		).rejects.toThrow(
			"'pages/feed.xml.kiln' exports sitemap = true, but the sitemap only lists HTML pages.",
		);
	});

	test("leaves entries for an environment the site doesn't show as they are", async () => {
		expect(await runHook("staging")).toEqual(listed());
	});
});

describe("sitemapEntriesHandler with a domain per locale", () => {
	const domains = {
		en: "https://example.com/",
		fr: "https://example.fr/",
		de: "https://example.com/",
	};
	const domainConfig = {
		...config,
		siteUrl: { en: "https://example.com", fr: "https://example.fr" },
		collections: ["offer", "page"].map((key) => ({
			key,
			getData: { publishing: { environments: [] } },
		})),
	} as unknown as ResolvedLucidConfig;
	// Every CMS locale and no locale option, so each request's domain picks its locale.
	const domainOptions = { ...options, locales: undefined, locale: undefined };
	// One document per collection, at these paths.
	const routes: Record<string, Record<string, string>> = {
		offer: { en: "/offers/spring", fr: "/offers/printemps" },
		page: { en: "/spring", fr: "/printemps", de: "/de/fruehling" },
	};
	const toolkit = {
		documents: {
			getMultiple: async ({ collectionKey }: { collectionKey: string }) => ({
				error: undefined,
				data: { items: [{ route: { path: routes[collectionKey] } }] },
			}),
		},
	} as unknown as Toolkit;

	const runDomainHook = async (
		entries: SitemapEntryInput[],
		pages: Record<string, string>,
		excluded: SeoSitemapEntriesHookMeta["excluded"] = [],
		siteOptions: SitePluginOptionsInternal = domainOptions,
	) => {
		const data = { entries };
		await sitemapEntriesHandler(
			siteOptions,
			shareSiteLoader(siteOptions),
		)({
			meta: {
				environment: "latest",
				siteUrl: domains.en,
				siteUrls: domains,
				excluded,
			},
			data,
			context: createContext(pages, domainConfig),
			toolkit,
		});
		return data.entries;
	};

	test("lists template pages on every domain in its locale, linked across domains", async () => {
		const linked = (path: { en: string; fr: string }) => [
			{ hreflang: "en", url: `https://example.com${path.en}` },
			{ hreflang: "fr", url: `https://example.fr${path.fr}` },
			{ hreflang: "x-default", url: `https://example.com${path.en}` },
		];
		const contact = linked({ en: "/contact/", fr: "/contact/" });
		const offer = linked({ en: "/offers/spring/", fr: "/offers/printemps/" });

		// Without the de locale each domain has one locale, so the locale option is never asked.
		for (const siteOptions of [
			{ ...domainOptions, locales: ["en", "fr"] },
			{ ...domainOptions, locales: ["en", "fr"], locale: () => "en" },
		]) {
			const entries = await runDomainHook(
				[
					{ path: "/about", url: "https://example.com/about", locale: "en" },
					{ path: "/about", url: "https://example.fr/about", locale: "fr" },
					{ path: "/ueber", url: "https://example.com/ueber", locale: "de" },
				],
				{
					"pages/about.kiln": "About",
					"pages/contact.kiln": "Contact",
					"pages/offers/[slug].kiln": `{% export sitemap = true %}{% export paths = documentPaths("offer") %}Offer`,
				},
				[],
				siteOptions,
			);

			expect(entries).toEqual([
				// Documents are listed once per domain already, and de is not one of the site's locales.
				{ path: "/about/", url: "https://example.com/about/", locale: "en" },
				{ path: "/about/", url: "https://example.fr/about/", locale: "fr" },
				{ path: "/contact/", locale: "en", alternates: contact },
				{ path: "/contact/", locale: "fr", alternates: contact },
				{ path: "/offers/spring/", locale: "en", alternates: offer },
				{ path: "/offers/printemps/", locale: "fr", alternates: offer },
			]);
		}
	});

	test("lists the documents of every locale on a domain, with a locale option choosing between locales that share one", async () => {
		// The en and de locales share example.com by path prefix, and fr has example.fr to itself.
		const entries = await runDomainHook(
			[],
			{
				"pages/about.kiln": "About",
				"pages/[...path].kiln": `{% export sitemap = true %}{% export paths = documentPaths("page") %}Page`,
			},
			[],
			{
				...domainOptions,
				locale: ({ path }) => (path.startsWith("/de") ? "de" : "en"),
			},
		);
		const about = [
			{ hreflang: "en", url: "https://example.com/about/" },
			{ hreflang: "fr", url: "https://example.fr/about/" },
			{ hreflang: "x-default", url: "https://example.com/about/" },
		];
		const page = [
			{ hreflang: "en", url: "https://example.com/spring/" },
			{ hreflang: "de", url: "https://example.com/de/fruehling/" },
			{ hreflang: "fr", url: "https://example.fr/printemps/" },
			{ hreflang: "x-default", url: "https://example.com/spring/" },
		];

		expect(entries).toEqual([
			{ path: "/about/", locale: "en", alternates: about },
			{ path: "/about/", locale: "fr", alternates: about },
			{ path: "/spring/", locale: "en", alternates: page },
			{ path: "/de/fruehling/", locale: "de", alternates: page },
			{ path: "/printemps/", locale: "fr", alternates: page },
		]);
	});

	test("fails when the locale option gives a locale from another domain, as a request would", async () => {
		await expect(
			runDomainHook([], { "pages/about.kiln": "About" }, [], {
				...domainOptions,
				locale: () => "fr",
			}),
		).rejects.toThrow(
			"The locale option gave 'fr' for https://example.com/about, but siteUrl only puts 'en', 'de' on that domain",
		);
	});

	test("lists a path every locale shares once, on the default locale's domain", async () => {
		const entries = await runDomainHook(
			[{ path: "/about", url: "https://example.com/about", locale: null }],
			{ "pages/about.kiln": "About" },
		);

		expect(entries).toEqual([
			{ path: "/about/", url: "https://example.com/about/", locale: null },
		]);
	});

	test("leaves a page the SEO plugin left out off its locale's domain only, and a shared path off every domain", async () => {
		const entries = await runDomainHook(
			[],
			{ "pages/contact.kiln": "Contact", "pages/team.kiln": "Team" },
			[
				// A noindex English document at /contact, and a noindex one every locale shares at /team.
				{ path: "/contact", locale: "en" },
				{ path: "/team", locale: null },
			],
		);

		expect(entries).toEqual([{ path: "/contact/", locale: "fr" }]);
	});

	test("counts an entry as listed only on the domain its URL is on", async () => {
		const entries = await runDomainHook(
			[{ path: "/team", url: "https://example.fr/team" }],
			{ "pages/team.kiln": "Team" },
		);

		expect(entries).toEqual([
			{ path: "/team/", url: "https://example.fr/team/" },
			{ path: "/team/", locale: "en" },
		]);
	});
});
