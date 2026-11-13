import {
	copy,
	defineCollection,
	defineHookEvents,
	field,
} from "@lucidcms/core";
import type { ResolvedLucidConfig } from "@lucidcms/core/types";
import { afterEach, describe, expect, test, vi } from "vitest";
import seo from "../../plugin.js";
import type { SeoPluginOptions, SitemapEntry } from "../../types.js";
import parsePluginOptions from "../parse-plugin-options.js";
import staticFilesHandler from "./static-files-handler.js";

const mocks = vi.hoisted(() => ({ getDocumentEntries: vi.fn() }));

vi.mock("../sitemap/get-document-entries.js", () => ({
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

/** Stands in for the site plugin, which runs `site.staticFiles` in its static builds. */
const siteEvents = defineHookEvents({
	key: "site",
	events: { staticFiles: "transform" },
});

const runStaticBuild = (
	site: Pick<ResolvedLucidConfig, "siteUrl" | "localization"> = {
		siteUrl: "https://example.com",
		localization: { locales: [], defaultLocale: null },
	},
	extra: Pick<SeoPluginOptions, "indexNow"> = {},
) =>
	siteEvents.execute(
		{
			config: {
				url: "https://cms.example.com",
				...site,
				collections: [routed("page"), routed("post")],
				plugins: [seo(given), { key: "site", hookEvents: siteEvents }],
				hooks: [
					{
						service: "site",
						event: "staticFiles",
						handler: staticFilesHandler(
							parsePluginOptions({ ...given, ...extra }),
						),
					},
				],
			},
		} as never,
		"staticFiles",
		{ meta: { environment: "latest" }, data: { files: [] } },
	);

const entry = (path: string, file: string): SitemapEntry => ({
	path,
	url: `https://example.com${path}`,
	locale: null,
	lastModified: null,
	alternates: [],
	file,
});

/** A collection's pages as the document query returns them. */
const listed = (entries: SitemapEntry[]) => ({
	error: undefined,
	data: { entries, excluded: [] },
});

describe("staticFilesHandler", () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	test("adds the sitemap index, every file it lists and robots.txt", async () => {
		mocks.getDocumentEntries
			.mockResolvedValueOnce(listed([entry("/", "page")]))
			.mockResolvedValueOnce(listed([entry("/news/launch", "post")]));

		const result = await runStaticBuild();
		const files = new Map(
			result.data?.files.map((file) => [file.path, file.body]),
		);

		expect([...files.keys()]).toEqual([
			"/sitemap.xml",
			"/sitemap-page.xml",
			"/sitemap-post.xml",
			"/robots.txt",
		]);
		expect(files.get("/robots.txt")).toBe(
			"User-agent: *\nAllow: /\n\nSitemap: https://example.com/sitemap.xml\n",
		);
		expect(files.get("/sitemap.xml")).toContain(
			"<loc>https://example.com/sitemap-post.xml</loc>",
		);
		expect(files.get("/sitemap-post.xml")).toContain(
			"<loc>https://example.com/news/launch</loc>",
		);
	});

	test("writes the default locale's origin's files when locales have their own domains", async () => {
		mocks.getDocumentEntries
			.mockResolvedValueOnce(
				listed([
					{ ...entry("/en", "page"), locale: "en" },
					{
						...entry("/fr", "page"),
						locale: "fr",
						url: "https://example.fr/fr",
					},
				]),
			)
			.mockResolvedValueOnce(listed([]));

		const result = await runStaticBuild({
			siteUrl: { en: "https://example.com", fr: "https://example.fr" },
			localization: {
				locales: [
					{ label: "English", code: "en" },
					{ label: "French", code: "fr" },
				],
				defaultLocale: "en",
			},
		});
		const files = new Map(
			result.data?.files.map((file) => [file.path, file.body]),
		);

		expect(files.get("/sitemap-page.xml")).toContain(
			"<loc>https://example.com/en</loc>",
		);
		expect(files.get("/sitemap-page.xml")).not.toContain("example.fr");
		expect(files.get("/robots.txt")).toContain(
			"Sitemap: https://example.com/sitemap.xml",
		);
	});

	test("writes no sitemap, nor a robots.txt line for one, when there are no pages", async () => {
		mocks.getDocumentEntries.mockResolvedValue(listed([]));

		const result = await runStaticBuild();

		expect(result.data?.files).toEqual([
			{ path: "/robots.txt", body: "User-agent: *\nAllow: /\n" },
		]);
	});

	test("adds IndexNow's key file when it is on", async () => {
		mocks.getDocumentEntries.mockResolvedValue(listed([]));

		const result = await runStaticBuild(undefined, {
			indexNow: { key: "test-key-1234" },
		});

		expect(result.data?.files).toContainEqual({
			path: "/test-key-1234.txt",
			body: "test-key-1234",
		});
	});

	test("fails the build instead of writing an empty sitemap", async () => {
		const failure = {
			type: "basic",
			status: 500,
			message: copy("server:plugin.seo.sitemap.documents.fetch.failed", {
				data: { collection: "post" },
			}),
		};
		mocks.getDocumentEntries
			.mockResolvedValueOnce(listed([entry("/", "page")]))
			.mockResolvedValueOnce({ error: failure, data: undefined });

		const result = await runStaticBuild();

		expect(result.error).toMatchObject({
			status: 500,
			message: failure.message,
		});
	});
});
