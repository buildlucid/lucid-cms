import { copy, defineCollection, defineHook, field } from "@lucidcms/core";
import type {
	AllHooks,
	CollectionDefinition,
	ResolvedLucidConfig,
} from "@lucidcms/core/types";
import { afterEach, describe, expect, test, vi } from "vitest";
import seo from "../../plugin.js";
import createSitemapToolkit from "../../toolkit/sitemap/index.js";
import type { SitemapEntry } from "../../types.js";
import parsePluginOptions from "../parse-plugin-options.js";

const mocks = vi.hoisted(() => ({ getDocumentEntries: vi.fn() }));

vi.mock("./get-document-entries.js", () => ({
	default: mocks.getDocumentEntries,
}));

const routed = (key: string) =>
	defineCollection({
		key,
		mode: "multiple",
		details: { labels: { singular: key, plural: key } },
		routing: { field: "path" },
		fields: [field.text("path")],
	});

const given = { collections: [{ key: "page" }, { key: "post" }] };
const options = parsePluginOptions(given);

const entry = (path: string, file: string): SitemapEntry => ({
	path,
	url: `https://example.com${path}`,
	locale: null,
	lastModified: "2026-11-01T10:00:00.000Z",
	alternates: [],
	file,
});

/** A collection's pages as the document query returns them. */
const listed = (
	entries: SitemapEntry[],
	excluded: Array<Pick<SitemapEntry, "path" | "locale">> = [],
) => ({
	error: undefined,
	data: { entries, excluded },
});

/** The parts of a service context the sitemap reads when its documents come from the mock. */
const createContext = (
	hooks: AllHooks[],
	collections: CollectionDefinition[] = [routed("page"), routed("post")],
	site: Pick<ResolvedLucidConfig, "siteUrl" | "localization"> = {
		siteUrl: "https://example.com",
		localization: { locales: [], defaultLocale: null },
	},
) =>
	({
		config: {
			url: "https://cms.example.com",
			...site,
			collections,
			plugins: [seo(given)],
			hooks,
		},
	}) as never;

describe("sitemap", () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	test("hooks can add, change and drop entries, and see the pages left out", async () => {
		mocks.getDocumentEntries
			.mockResolvedValueOnce(
				listed(
					[entry("/about", "page"), entry("/old", "page")],
					[{ path: "/hidden", locale: null }],
				),
			)
			.mockResolvedValueOnce(
				listed([], [{ path: "/news/draft", locale: "en" }]),
			);
		const hook = defineHook({
			service: "seo",
			event: "sitemapEntries",
			handler: ({ meta, data }) => {
				expect(meta.excluded).toEqual([
					{ path: "/hidden", locale: null },
					{ path: "/news/draft", locale: "en" },
				]);
				data.entries = data.entries.filter((item) => item.path !== "/old");
				for (const item of data.entries) item.lastModified = null;
				data.entries.push({ path: "/contact" });
			},
		});

		const entries = await createSitemapToolkit(
			createContext([hook]),
			options,
		).entries();

		expect(entries.data).toEqual([
			{ ...entry("/about", "page"), lastModified: null },
			{
				path: "/contact",
				url: "https://example.com/contact",
				locale: null,
				lastModified: null,
				alternates: [],
				file: "site",
			},
		]);
	});

	test("hooks see the default locale's site URL and each locale's", async () => {
		mocks.getDocumentEntries.mockResolvedValue(listed([]));
		const seen = vi.fn();
		const hook = defineHook({
			service: "seo",
			event: "sitemapEntries",
			handler: ({ meta }) => {
				seen({ siteUrl: meta.siteUrl, siteUrls: meta.siteUrls });
			},
		});

		await createSitemapToolkit(
			createContext([hook], undefined, {
				siteUrl: { en: "/", fr: "https://example.fr" },
				localization: {
					locales: [
						{ label: "English", code: "en" },
						{ label: "French", code: "fr" },
					],
					defaultLocale: "en",
				},
			}),
			options,
		).entries();

		expect(seen).toHaveBeenCalledWith({
			siteUrl: "https://cms.example.com/",
			siteUrls: {
				en: "https://cms.example.com/",
				fr: "https://example.fr/",
			},
		});
	});

	describe("with a domain per locale", () => {
		const domains: Pick<ResolvedLucidConfig, "siteUrl" | "localization"> = {
			siteUrl: { en: "https://example.com", fr: "https://example.fr" },
			localization: {
				locales: [
					{ label: "English", code: "en" },
					{ label: "French", code: "fr" },
				],
				defaultLocale: "en",
			},
		};
		const about = [
			{ hreflang: "en", url: "https://example.com/about" },
			{ hreflang: "fr", url: "https://example.fr/a-propos" },
			{ hreflang: "x-default", url: "https://example.com/about" },
		];
		const version = (path: string, url: string, locale: string) => ({
			...entry(path, "page"),
			url,
			locale,
			alternates: about,
		});
		const hooked: string[][] = [];
		const hook = defineHook({
			service: "seo",
			event: "sitemapEntries",
			handler: ({ data }) => {
				data.entries.push(
					{ path: "/contact", locale: "fr" },
					{ path: "/search" },
				);
				hooked.push(data.entries.map((item) => item.url ?? item.path));
			},
		});
		const createDomainSitemap = () => {
			mocks.getDocumentEntries.mockImplementation(
				async (_context, data: { target: { collection: { key: string } } }) =>
					listed(
						data.target.collection.key === "page"
							? [
									version("/about", "https://example.com/about", "en"),
									version("/a-propos", "https://example.fr/a-propos", "fr"),
								]
							: [entry("/news/launch", "post")],
					),
			);
			hooked.length = 0;
			return createSitemapToolkit(
				createContext([hook], undefined, domains),
				options,
			);
		};

		test("lists only the requested origin's pages, hook pages on their URL's, with language links kept", async () => {
			const sitemap = createDomainSitemap();

			const french = await sitemap.entries({ origin: "https://example.fr" });
			const fallback = await sitemap.entries();

			expect(french.data?.map((item) => item.url)).toEqual([
				"https://example.fr/a-propos",
				"https://example.fr/contact",
			]);
			expect(french.data?.[0]?.alternates).toEqual(about);
			expect(fallback.data?.map((item) => item.url)).toEqual([
				"https://example.com/about",
				"https://example.com/news/launch",
				"https://example.com/search",
			]);
			//* the hook runs once a read, over every origin's pages
			expect(hooked).toEqual([
				[
					"https://example.com/about",
					"https://example.fr/a-propos",
					"https://example.com/news/launch",
					"/contact",
					"/search",
				],
				[
					"https://example.com/about",
					"https://example.fr/a-propos",
					"https://example.com/news/launch",
					"/contact",
					"/search",
				],
			]);
		});

		test("gives each origin its own files, listed in its index on that origin", async () => {
			const sitemap = createDomainSitemap();

			const files = await sitemap.files({ origin: "https://example.fr/" });
			const index = await sitemap.xml({ origin: "https://example.fr" });
			const posts = await sitemap.xml({
				origin: "https://example.fr",
				file: "post",
			});
			const defaultFiles = await sitemap.files();

			expect(files.data?.map(({ name, url }) => ({ name, url }))).toEqual([
				{ name: "page", url: "https://example.fr/sitemap-page.xml" },
				{ name: "site", url: "https://example.fr/sitemap-site.xml" },
			]);
			expect(index.data).toContain(
				"<loc>https://example.fr/sitemap-page.xml</loc>",
			);
			expect(index.data).not.toContain("https://example.com");
			expect(posts.error?.status).toBe(404);
			expect(defaultFiles.data?.map((file) => file.url)).toEqual([
				"https://example.com/sitemap-page.xml",
				"https://example.com/sitemap-post.xml",
				"https://example.com/sitemap-site.xml",
			]);
		});

		test("refuses an origin that isn't a configured site origin, naming those that are", async () => {
			const sitemap = createDomainSitemap();

			const entries = await sitemap.entries({
				origin: "https://other.example",
			});

			expect(entries).toEqual({
				error: {
					type: "basic",
					status: 400,
					message: copy("server:plugin.seo.origin.unknown", {
						data: {
							origin: "https://other.example",
							origins: "https://example.com, https://example.fr",
						},
					}),
				},
				data: undefined,
			});
			expect(mocks.getDocumentEntries).not.toHaveBeenCalled();
		});
	});

	test("a failing source returns its error, not a partial sitemap", async () => {
		const failure = {
			type: "basic",
			status: 500,
			message: copy("server:plugin.seo.sitemap.documents.fetch.failed", {
				data: { collection: "post" },
			}),
		};
		mocks.getDocumentEntries
			.mockResolvedValueOnce(listed([entry("/about", "page")]))
			.mockResolvedValueOnce({ error: failure, data: undefined });
		const sitemap = createSitemapToolkit(createContext([]), options);

		const xml = await sitemap.xml();

		expect(xml).toEqual({ error: failure, data: undefined });
	});

	test("an unknown file is not found", async () => {
		mocks.getDocumentEntries.mockResolvedValue(
			listed([entry("/about", "page")]),
		);
		const sitemap = createSitemapToolkit(createContext([]), options);

		const page = await sitemap.xml({ file: "page" });
		const missing = await sitemap.xml({ file: "page-2" });

		expect(page.data).toContain("<loc>https://example.com/about</loc>");
		expect(missing.error?.status).toBe(404);
	});

	test("an origin without pages has no index", async () => {
		mocks.getDocumentEntries.mockResolvedValue(listed([]));
		const sitemap = createSitemapToolkit(createContext([]), options);

		const index = await sitemap.xml();

		expect(index.error?.status).toBe(404);
	});

	test("lists hook pages for an environment that only collections outside the sitemap have", async () => {
		const environments: string[] = [];
		const hook = defineHook({
			service: "seo",
			event: "sitemapEntries",
			handler: ({ meta, data }) => {
				environments.push(meta.environment);
				data.entries.push({ path: "/contact" });
			},
		});
		//* SEO collections without routing list no documents
		const sitemap = createSitemapToolkit(
			createContext(
				[hook],
				[
					defineCollection({
						key: "page",
						mode: "multiple",
						details: { labels: { singular: "Page", plural: "Pages" } },
						fields: [field.text("title")],
					}),
					defineCollection({
						key: "news",
						mode: "multiple",
						details: { labels: { singular: "News", plural: "News" } },
						fields: [field.text("title")],
						publishing: {
							environments: [{ key: "production", label: "Production" }],
						},
					}),
				],
			),
			options,
		);

		const requested = await sitemap.entries({ environment: "production" });
		const fallback = await sitemap.entries();

		expect(requested.data?.map((item) => item.path)).toEqual(["/contact"]);
		expect(fallback.data?.map((item) => item.path)).toEqual(["/contact"]);
		expect(environments).toEqual(["production", "production"]);
		expect(mocks.getDocumentEntries).not.toHaveBeenCalled();
	});

	test("lists collections too large to spread into one call", async () => {
		const pages = Array.from({ length: 200_000 }, (_, index) =>
			entry(`/${index}`, "page"),
		);
		mocks.getDocumentEntries
			.mockResolvedValueOnce(listed(pages))
			.mockResolvedValueOnce(listed([]));

		const files = await createSitemapToolkit(
			createContext([]),
			options,
		).files();

		expect(files.data?.map((file) => file.count)).toEqual([
			45_000, 45_000, 45_000, 45_000, 20_000,
		]);
	});
});
