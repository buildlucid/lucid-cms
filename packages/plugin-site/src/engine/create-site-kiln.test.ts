import type { ResolvedLucidConfig, Toolkit } from "@lucidcms/core/types";
import { decodePreviewFieldTarget } from "@lucidcms/preview-protocol";
import { KilnRenderError, memoryLoader } from "@lucidkiln/core";
import { describe, expect, test, vi } from "vitest";
import { SiteNotFoundError, SiteRedirectError } from "../errors.js";
import type { SitePreview, SiteState } from "../types.js";
import createSiteKiln from "./create-site-kiln.js";
import { pageMarkup } from "./page-markup.js";
import createSiteFunctionsContext from "./site-functions-context.js";

const config = {
	localization: {
		locales: [{ code: "en" }, { code: "fr" }],
		defaultLocale: "en",
	},
	collections: [
		{ key: "page", getData: { publishing: { environments: [] } } },
		{
			key: "blog",
			getData: {
				publishing: {
					environments: [{ key: "staging", requires: [] }],
				},
			},
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
const toolkit = { documents: { getSingle, getMultiple } } as unknown as Toolkit;
const preview = { kind: "preview", token: "token" } as SitePreview;

const context = createSiteFunctionsContext(config, "production");
const kiln = createSiteKiln({
	context,
	options: {},
	loader: memoryLoader({
		"page.kiln": `{% set page = document("page", filter: { _fullSlug: path }) ?? notFound() %}{{ page.fields.title }} ({{ page.locale }})`,
		"list.kiln": `{{ documents("page")|length }}{{ documents("blog")|length }}`,
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
				version: context.getVersion,
				...state,
			},
		},
	);

const editTargets = (html: string) =>
	[...html.matchAll(/data-lucid-preview-field="([^"]+)"/g)].map((match) =>
		decodePreviewFieldTarget(match[1] ?? ""),
	);

describe("site template functions", () => {
	test("document() reads through the toolkit in the locale its route matched", async () => {
		await expect(render("page.kiln", "/fr")).resolves.toBe("Accueil (fr)");
		expect(getSingle).toHaveBeenLastCalledWith({
			collectionKey: "page",
			version: "latest",
			preview: null,
			query: {
				filter: { _fullSlug: { value: "/fr" } },
				include: ["bricks", "meta"],
			},
		});
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
			version: context.getVersion,
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

	test("document() and documents() tag the cached section they run in with their collection", async () => {
		const set = vi.fn();
		const cached = createSiteKiln({
			context,
			options: {},
			cache: { get: () => null, set },
			loader: memoryLoader({
				"cached.kiln": `{% cache "list" %}{{ documents("page")|length }}{{ documents("blog")|length }}{% endcache %}`,
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
					version: context.getVersion,
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
						version: context.getVersion,
					},
				},
			),
		).rejects.toThrow(/Brick/);
	});
});
