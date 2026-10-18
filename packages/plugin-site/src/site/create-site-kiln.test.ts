import type { ResolvedLucidConfig, Toolkit } from "@lucidcms/core/types";
import { decodePreviewFieldTarget } from "@lucidcms/preview-protocol";
import { KilnRenderError, memoryLoader } from "@lucidkiln/core";
import { describe, expect, test, vi } from "vitest";
import { SiteNotFoundError, SiteRedirectError } from "../errors.js";
import defineSiteFunction from "../functions/define-site-function.js";
import { pageMarkup } from "../preview/page-markup.js";
import type { SitePluginOptions, SitePreview, SiteState } from "../types.js";
import createSiteConfig from "./create-site-config.js";
import createSiteKiln from "./create-site-kiln.js";

const config = {
	localization: {
		locales: [{ code: "en" }, { code: "fr" }],
		defaultLocale: "en",
	},
	collections: [
		{
			key: "page",
			getData: { publishing: { environments: [] } },
			flatFields: [],
			brickInstances: [],
		},
		{
			key: "blog",
			getData: {
				publishing: {
					environments: [{ key: "staging", requires: [] }],
				},
			},
			flatFields: [],
			brickInstances: [],
		},
	],
} as unknown as ResolvedLucidConfig;

const page = {
	id: 2,
	collectionKey: "page",
	version: null,
	route: { path: { en: "/en", fr: "/fr" }, label: "Home" },
	fields: { title: { en: "Home", fr: "Accueil" } },
	bricks: [
		{
			ref: "b1",
			id: 9,
			key: "banner",
			order: 0,
			type: "builder",
			fields: { links: [{ label: { en: "Hi", fr: "Salut" } }] },
		},
	],
};

const getSingle = vi.fn(async ({ query }) =>
	query.filter._fullSlug.value === "/missing"
		? { error: { status: 404, message: "Not found" }, data: undefined }
		: { error: undefined, data: { document: page } },
);
const getMultiple = vi.fn(async ({ preview }) =>
	preview
		? { error: { status: 403, code: "preview_scope" }, data: undefined }
		: { error: undefined, data: { data: [page], count: 1 } },
);
const image = {
	id: 5,
	type: "image",
	key: "public/5",
	url: "/cdn/public/5",
	title: { en: "Cat", fr: "Chat" },
	alt: { en: "A cat" },
};
const video = {
	id: 7,
	type: "video",
	key: "public/7",
	url: "/cdn/public/7",
	title: { en: "Clip" },
	poster: { id: 8, type: "image", key: "public/8", url: "/cdn/public/8" },
};
const media = {
	getSingle: vi.fn(async ({ id }) => {
		if (id === 5) return { error: undefined, data: image };
		if (id === 7) return { error: undefined, data: video };
		return { error: { status: 404 }, data: undefined };
	}),
	getMultiple: vi.fn(async () => ({
		error: undefined,
		data: { data: [image], count: 21 },
	})),
	resolveUrl: vi.fn(async ({ key, preset }) => ({
		error: undefined,
		data: { url: `/cdn/${key}?preset=${preset}` },
	})),
};
const toolkit = {
	documents: { getSingle, getMultiple },
	media,
	locales: {
		getAll: async () => ({
			error: undefined,
			data: [{ code: "en" }, { code: "fr" }],
		}),
	},
} as unknown as Toolkit;
const preview = { kind: "preview", token: "token" } as SitePreview;

const siteConfig = createSiteConfig(config, "production");
const kiln = createSiteKiln({
	config: siteConfig,
	options: {},
	data: null,
	loader: memoryLoader({
		"page.kiln": `{% set page = document("page", { filter: { _fullSlug: path }, include: ["bricks"] }) ?? notFound() %}{{ page.fields.title }} ({{ page.locale }})`,
		"list.kiln": `{{ documentList("page").items|length }}{{ documentList("blog").items|length }}`,
		"pages.kiln": `{% set list = documentList("page", { page: 2, perPage: 1 }) %}{% set p = list.pagination %}{{ list.items|length }}:{{ p.currentPage }},{{ p.perPage }},{{ p.total }},{{ p.lastPage }}`,
		"media.kiln": `{% set item = media(5, { locale: "fr" }) %}{{ item.title }}|{{ media(6) ?? "none" }}|{{ mediaUrl(item, { preset: "card" }) }}`,
		"media-list.kiln": `{% set list = mediaList({ filter: { type: "image" }, perPage: 20 }) %}{{ list.items[0].alt }}|{{ list.pagination.lastPage }}`,
		"locales.kiln": `{% for locale in locales() %}{{ locale.code }}{% endfor %}`,
		"island.kiln": `{% set page = document("page", { filter: { _fullSlug: path } }) %}{% island "islands/typed" with { image: media(5), page: page, brick: page.bricks[0] } %}{% endisland %}`,
		"islands/typed.kiln": `{% props image: Media, page: Document, brick: Brick %}{{ image.title }}:{{ page.id }}:{{ brick.key }}`,
		"paths.kiln": `{{ documentPaths("page")|join(",") }}|{{ documentPaths("blog")|length }}`,
		"editable.kiln": `{% set page = document("page", filter: { _fullSlug: path }) %}<h1{{ editable(page, "title") }}></h1>{% for link in page.bricks[0].fields.links %}<a{{ editable(link, "label") }}></a>{% endfor %}`,
		"moved.kiln": `{{ redirect("/new", 301) }}`,
		"layout.kiln": `{{ head() }}|{{ footer() }}|{{ footer() }}`,
		"typed.kiln": `{% set page = document("page", filter: { _fullSlug: path }) %}{% include "brick" with { page: page, brick: brick ?? page.bricks[0] } %}`,
		"brick.kiln": `{% props page: Document, brick: Brick %}{{ page.id }}:{{ brick.key }}`,
	}),
});

const render = (
	template: string,
	path: string,
	state: Partial<SiteState> = {},
) =>
	kiln.render(
		template,
		{ path },
		{
			state: {
				toolkit,
				path,
				preview: null,
				version: siteConfig.getVersion,
				...state,
			},
		},
	);

const editTargets = (html: string) =>
	[...html.matchAll(/data-lucid-preview-field="([^"]+)"/g)].map((match) =>
		decodePreviewFieldTarget(match[1] ?? ""),
	);

describe("site template functions", () => {
	test("document() reads through the toolkit in the locale its route matched, with the includes it's given", async () => {
		await expect(render("page.kiln", "/fr")).resolves.toBe("Accueil (fr)");
		expect(getSingle).toHaveBeenLastCalledWith({
			collectionKey: "page",
			version: "latest",
			preview: null,
			query: {
				filter: { _fullSlug: { value: "/fr" } },
				include: ["bricks"],
			},
		});
	});

	test("documentList() returns items with the content API's pagination", async () => {
		await expect(render("pages.kiln", "/")).resolves.toBe("1:2,1,1,1");
		expect(getMultiple).toHaveBeenLastCalledWith(
			expect.objectContaining({
				query: expect.objectContaining({ page: 2, perPage: 1 }),
			}),
		);
	});

	test("media(), mediaList() and mediaUrl() read library media only, with text in the locale", async () => {
		await expect(render("media.kiln", "/")).resolves.toBe(
			"Chat|none|/cdn/public/5?preset=card",
		);
		await expect(render("media-list.kiln", "/")).resolves.toBe("A cat|2");
		expect(media.getSingle).toHaveBeenCalledWith({ id: 5, libraryOnly: true });
		expect(media.getMultiple).toHaveBeenCalledWith({
			query: {
				filter: { type: { value: "image" } },
				page: 1,
				perPage: 20,
			},
			libraryOnly: true,
		});
		expect(media.resolveUrl).toHaveBeenCalledWith(
			expect.objectContaining({ key: "public/5", libraryOnly: true }),
		);
	});

	test("typed props accept the copies islands receive", async () => {
		await expect(render("island.kiln", "/en")).resolves.toBe("Cat:2:banner");
	});

	test("media() tags its section with every media change, as media includes crops and posters", async () => {
		const set = vi.fn();
		await createSiteKiln({
			config: siteConfig,
			options: {},
			data: null,
			cache: { get: () => null, set },
			loader: memoryLoader({
				"video.kiln": `{% cache "video" %}{{ media(7).title }}{% endcache %}`,
			}),
		}).render(
			"video.kiln",
			{},
			{
				state: {
					toolkit,
					path: "/",
					preview: null,
					version: siteConfig.getVersion,
				},
			},
		);
		expect(set).toHaveBeenCalledWith(
			expect.objectContaining({ tags: ["content-media"] }),
		);
	});

	test("locales() lists the content locales", async () => {
		await expect(render("locales.kiln", "/")).resolves.toBe("enfr");
	});

	test("notFound() stops the render when document() finds nothing", async () => {
		const error = await render("page.kiln", "/missing").catch(
			(caught: unknown) => caught,
		);
		expect(error).toBeInstanceOf(KilnRenderError);
		expect((error as KilnRenderError).cause).toBeInstanceOf(SiteNotFoundError);
	});

	test("redirect() stops the render with the location and status", async () => {
		const error = await render("moved.kiln", "/old").catch(
			(caught: unknown) => caught,
		);
		expect((error as KilnRenderError).cause).toBeInstanceOf(SiteRedirectError);
		expect((error as KilnRenderError).cause).toEqual(
			expect.objectContaining({ location: "/new", status: 301 }),
		);
	});

	test("documentPaths() lists a collection's URLs in every locale, and none from a collection off the site", async () => {
		await expect(render("paths.kiln", "/")).resolves.toBe("/en,/fr|0");
	});

	test("shows nothing from a collection without the site's environment", async () => {
		await expect(render("list.kiln", "/")).resolves.toBe("10");
		expect(getMultiple).not.toHaveBeenCalledWith(
			expect.objectContaining({ collectionKey: "blog" }),
		);
	});

	test("lists published content when a scoped preview can't list its collection", async () => {
		getMultiple.mockClear();
		await expect(render("list.kiln", "/", { preview })).resolves.toBe("10");
		expect(getMultiple.mock.calls.map(([input]) => input.preview)).toEqual([
			"token",
			null,
		]);
	});

	test("head() and footer() write the page's Lucid markup, the footer only once", async () => {
		const state: SiteState = {
			toolkit,
			path: "/",
			preview,
			version: siteConfig.getVersion,
		};
		pageMarkup.set(state, {
			head: "<meta>",
			footer: "<lucid-toolbar></lucid-toolbar>",
			footerWritten: false,
		});

		await expect(
			kiln.render("layout.kiln", { path: "/" }, { state }),
		).resolves.toBe("<meta>|<lucid-toolbar></lucid-toolbar>|");
		expect(pageMarkup.get(state)?.footerWritten).toBe(true);
		await expect(render("layout.kiln", "/")).resolves.toBe("||");
	});

	test("editable() points documents, bricks and repeater groups at their fields during a preview", async () => {
		await expect(render("editable.kiln", "/en")).resolves.toBe(
			"<h1></h1><a></a>",
		);

		const html = await render("editable.kiln", "/en", { preview });
		expect(editTargets(html)).toEqual([
			{ collectionKey: "page", documentId: 2, locale: "en", path: ["title"] },
			{
				collectionKey: "page",
				documentId: 2,
				locale: "en",
				brick: { type: "builder", key: "banner", order: 0 },
				path: ["links", 0, "label"],
			},
		]);
	});

	test("document() and documentList() tag the cached section they run in with their collection", async () => {
		const set = vi.fn();
		const cached = createSiteKiln({
			config: siteConfig,
			options: {},
			data: null,
			cache: { get: () => null, set },
			loader: memoryLoader({
				"cached.kiln": `{% cache "list" %}{{ documentList("page").items|length }}{{ documentList("blog").items|length }}{% endcache %}`,
			}),
		});

		await cached.render(
			"cached.kiln",
			{},
			{
				state: {
					toolkit,
					path: "/",
					preview: null,
					version: siteConfig.getVersion,
				},
			},
		);
		expect(set).toHaveBeenCalledWith(
			expect.objectContaining({ tags: ["content-documents:page"] }),
		);
	});

	test("checks the Document and Brick prop types", async () => {
		await expect(render("typed.kiln", "/en")).resolves.toBe("2:banner");
		await expect(
			kiln.render(
				"typed.kiln",
				{ path: "/en", brick: { key: "banner", fields: {} } },
				{
					state: {
						toolkit,
						path: "/en",
						preview: null,
						version: siteConfig.getVersion,
					},
				},
			),
		).rejects.toThrow(/Brick/);
	});
});

describe("site kiln options", () => {
	const state: SiteState = {
		toolkit,
		path: "/",
		preview,
		version: siteConfig.getVersion,
	};

	test("site functions get the preview token and built-in reads that tag the cached section", async () => {
		const set = vi.fn();
		const pageCount = defineSiteFunction(
			async ({ functions, preview: token }, suffix: string) =>
				`${(await functions.documentList("page")).items.length}${suffix}:${token}`,
		);
		const site = createSiteKiln({
			config: siteConfig,
			options: { kiln: { functions: { pageCount } } },
			data: null,
			cache: { get: () => null, set },
			loader: memoryLoader({
				"count.kiln": `{% cache "count" %}{{ pageCount("!") }}{% endcache %}`,
			}),
		});

		await expect(
			site.render("count.kiln", {}, { state: { ...state, preview: null } }),
		).resolves.toBe("1!:null");
		expect(set).toHaveBeenCalledWith(
			expect.objectContaining({ tags: ["content-documents:page"] }),
		);
		await expect(site.render("count.kiln", {}, { state })).resolves.toBe(
			"1!:token",
		);
	});

	test("extensions can't register a built-in or each other's names, while the site's own entries replace anything", async () => {
		const create = (kilnOptions: SitePluginOptions["kiln"]) =>
			createSiteKiln({
				config: siteConfig,
				options: { kiln: kilnOptions },
				data: null,
				loader: memoryLoader({
					"notice.kiln": `{{ notFound() }}`,
					"shout.kiln": `{{ "hi"|upper }}`,
				}),
			});

		expect(() =>
			create({
				extensions: [{ name: "pages", functions: { document: () => null } }],
			}),
		).toThrow(
			/'pages' extension registers the 'document' function, which the site plugin/,
		);
		expect(() =>
			create({
				extensions: [
					{ name: "text", filters: { upper: (value: string) => value } },
				],
			}),
		).toThrow(/'text' extension registers the 'upper' filter, which Kiln/);
		expect(() =>
			create({
				extensions: [
					{ name: "first", filters: { money: (value: number) => value } },
					{ name: "second", filters: { money: (value: number) => value } },
				],
			}),
		).toThrow(
			/'second' extension registers the 'money' filter, which the 'first' extension/,
		);
		await expect(
			create({ functions: { notFound: () => "replaced" } }).render(
				"notice.kiln",
				{},
				{ state },
			),
		).resolves.toBe("replaced");
		await expect(
			create({ filters: { upper: () => "replaced" } }).render(
				"shout.kiln",
				{},
				{ state },
			),
		).resolves.toBe("replaced");
	});
});
