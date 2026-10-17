import { findRoute } from "rou3";
import { describe, expect, test } from "vitest";
import createPageRouter from "./create-page-router.js";

const { router } = createPageRouter([
	"pages/index.kiln",
	"pages/about.kiln",
	"pages/blog/[slug].kiln",
	"pages/[...slug].kiln",
	"pages/(marketing)/pricing.kiln",
	"pages/sitemap.xml.kiln",
	"pages/_404.kiln",
	"pages/_partials/hero.kiln",
	"layouts/base.kiln",
]);

const match = (path: string) => {
	const route = findRoute(router, "GET", path);
	return route && { template: route.data.template, params: route.params };
};

describe("createPageRouter", () => {
	test("prefers static pages, then dynamic segments, then catch-alls", () => {
		expect(match("/")).toEqual({ template: "pages/index.kiln" });
		expect(match("/about")).toEqual({ template: "pages/about.kiln" });
		expect(match("/blog/hello")).toEqual({
			template: "pages/blog/[slug].kiln",
			params: { slug: "hello" },
		});
		expect(match("/en/about")).toEqual({
			template: "pages/[...slug].kiln",
			params: { slug: "en/about" },
		});
		expect(match("/pricing")).toEqual({
			template: "pages/(marketing)/pricing.kiln",
		});
	});

	test("keeps index pages ahead of catch-alls whatever order the files are listed in", () => {
		const { router: listed } = createPageRouter([
			"pages/[...slug].kiln",
			"pages/docs/[[...path]].kiln",
			"pages/docs/index.kiln",
			"pages/index.kiln",
		]);
		expect(findRoute(listed, "GET", "/")?.data.template).toBe(
			"pages/index.kiln",
		);
		expect(findRoute(listed, "GET", "/docs")?.data.template).toBe(
			"pages/docs/index.kiln",
		);
		expect(findRoute(listed, "GET", "/docs/a/b")?.data.template).toBe(
			"pages/docs/[[...path]].kiln",
		);
	});

	test("leaves out templates starting with an underscore and those outside pages", () => {
		const names = [
			"pages/_404.kiln",
			"pages/_partials/hero.kiln",
			"layouts/base.kiln",
		];
		const { router: filtered } = createPageRouter(names);
		expect(findRoute(filtered, "GET", "/_404")).toBeUndefined();
		expect(findRoute(filtered, "GET", "/base")).toBeUndefined();
	});

	test("serves routes ending in an extension with that content type", () => {
		expect(findRoute(router, "GET", "/sitemap.xml")?.data.contentType).toBe(
			"application/xml; charset=utf-8",
		);
		expect(findRoute(router, "GET", "/about")?.data.contentType).toBe(
			"text/html; charset=utf-8",
		);
	});

	test("rejects two pages claiming the same path", () => {
		expect(() =>
			createPageRouter(["pages/about.kiln", "pages/about/index.kiln"]),
		).toThrow(/both route to '\/about'/);
	});

	test("gives pages the site's mode unless their route overrides it", () => {
		const { pages } = createPageRouter(
			["pages/index.kiln", "pages/search.kiln", "pages/blog/[slug].kiln"],
			{
				mode: "isr",
				routes: { search: { mode: "ssr" }, "blog/[slug]": { revalidate: 60 } },
			},
		);
		expect(
			pages.map(({ name, pattern, mode }) => ({ name, pattern, mode })),
		).toEqual([
			{ name: "index", pattern: "/", mode: "isr" },
			{ name: "search", pattern: "/search", mode: "ssr" },
			{ name: "blog/[slug]", pattern: "/blog/:slug", mode: "isr" },
		]);
	});

	test("rejects route settings that name no page or don't fit the mode", () => {
		expect(() =>
			createPageRouter(["pages/index.kiln"], { routes: { about: {} } }),
		).toThrow(/name no page/);
		expect(() =>
			createPageRouter(["pages/index.kiln"], {
				mode: "static",
				routes: { index: { mode: "isr" } },
			}),
		).toThrow(/static site/);
		expect(() =>
			createPageRouter(["pages/index.kiln"], {
				routes: { index: { revalidate: 60 } },
			}),
		).toThrow(/only applies to pages rendered with ISR/);
	});
});
