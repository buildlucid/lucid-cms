import { copy, defineCollection, field } from "@lucidcms/core";
import type { AllHooks, HttpExtension } from "@lucidcms/core/types";
import { describe, expect, test, vi } from "vitest";
import seo from "./plugin.js";
import type { SeoPluginOptions } from "./types.js";

const configure = (
	options: Pick<SeoPluginOptions, "sitemap" | "robots" | "indexNow"> = {},
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
		admin: { slots: [] as Array<{ key: string }> },
		migrations: [] as Array<{ name: string }>,
		jobs: [] as Array<{ key: string }>,
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

/** The routes the CMS's own root files are served at, for a final config's `siteUrl`. */
const servedRoutes = (
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
	return app.get.mock.calls;
};
/** The paths the CMS's own root files are served at, for a final config's `siteUrl`. */
const servedPaths = (
	extensions: HttpExtension[],
	siteUrl: string | Record<string, string>,
) => servedRoutes(extensions, siteUrl).map(([path]) => path);

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

describe("seo IndexNow", () => {
	const key = "test-key-1234";
	const page = defineCollection({
		key: "page",
		mode: "multiple",
		details: { labels: { singular: "Page", plural: "Pages" } },
		routing: { field: "path" },
		fields: [field.text("path")],
		publishing: {
			environments: [{ key: "production", label: copy.literal("Production") }],
		},
	});
	const finalConfig = {
		collections: [page],
		localization: { locales: [], defaultLocale: null },
		deploys: [{ key: "production" }],
	};

	/** Runs the hooks IndexNow registered for an event, with a toolkit that records queued jobs. */
	const runHooks = async (
		draft: ReturnType<typeof configure>,
		event: string,
		payload: Record<string, unknown>,
	) => {
		const enqueueJob = vi.fn(async () => ({
			error: undefined,
			data: { jobId: "job", key: "seo:index-now-send", version: 1 },
		}));
		for (const hook of draft.hooks.filter((item) => item.event === event)) {
			await (hook.handler as (props: unknown) => Promise<void>)({
				...payload,
				context: { config: finalConfig },
				toolkit: { jobs: { enqueueJob } },
			});
		}
		return enqueueJob.mock.calls.length;
	};

	test("refuses keys IndexNow doesn't accept, and IndexNow without the sitemap", () => {
		expect(() =>
			seo({ collections: [{ key: "page" }], indexNow: { key: "short" } }),
		).toThrow(/8 to 128 letters/);
		expect(() =>
			seo({
				collections: [{ key: "page" }],
				indexNow: { key: "has spaces 123" },
			}),
		).toThrow(/8 to 128 letters/);
		expect(() =>
			seo({
				collections: [{ key: "page" }],
				sitemap: false,
				indexNow: { key },
			}),
		).toThrow(/needs the sitemap/);
	});

	test("refuses a deploy the config doesn't have", () => {
		const check = (deploy: string) =>
			seo({
				collections: [{ key: "page" }],
				indexNow: { key, deploy },
			}).checkCompatibility?.({ config: finalConfig } as never);

		expect(() => check("production")).not.toThrow();
		expect(() => check("staging")).toThrow(/isn't one of the config's deploys/);
	});

	test("serves the key file, and adds its job, routes and Operations tile", () => {
		const draft = configure({ indexNow: { key } });
		const routes = servedRoutes(draft.http.extensions, "/");
		const keyFile = routes.find(([path]) => path === `/${key}.txt`);
		const hono = { header: vi.fn(), body: vi.fn((body: string) => body) };

		expect(keyFile?.[1](hono)).toBe(key);
		expect(hono.header).toHaveBeenCalledWith(
			"Content-Type",
			"text/plain; charset=utf-8",
		);
		expect(draft.migrations.map((item) => item.name)).toEqual([
			"1789100000000-seo-index-now",
		]);
		expect(draft.jobs.map((job) => job.key)).toEqual(["seo:index-now-send"]);
		expect(draft.http.routes.map((route) => route.path)).toContain(
			"/api/v1/seo/index-now/send",
		);
		expect(draft.admin.slots.map((slot) => slot.key)).toContain(
			"@lucidcms/seo:index-now-send",
		);
	});

	test("without a deploy, publishing to or deleting from the listed environment queues a send", async () => {
		const draft = configure({ indexNow: { key } });
		const change = (collectionKey: string, change: Record<string, unknown>) =>
			runHooks(draft, "afterChange", {
				meta: { collectionKey },
				data: { ids: [1], change },
			});

		expect(
			await change("page", { type: "published", version: "production" }),
		).toBe(1);
		expect(
			await change("page", { type: "unpublished", version: "production" }),
		).toBe(1);
		expect(await change("page", { type: "updated", version: "latest" })).toBe(
			0,
		);
		expect(
			await change("post", { type: "published", version: "production" }),
		).toBe(0);
		expect(await change("page", { type: "deleted", permanent: false })).toBe(1);
		expect(await change("page", { type: "deleted", permanent: true })).toBe(1);
		expect(await change("post", { type: "deleted", permanent: false })).toBe(0);
		expect(await runHooks(draft, "afterRunFinish", {})).toBe(0);
	});

	test("with a deploy, only that deploy's succeeded runs queue a send", async () => {
		const draft = configure({ indexNow: { key, deploy: "production" } });
		const finish = (deployKey: string, status: string) =>
			runHooks(draft, "afterRunFinish", {
				meta: {},
				data: { deployKey, runId: 1, status, source: "trigger" },
			});

		expect(await finish("production", "succeeded")).toBe(1);
		expect(await finish("production", "triggered")).toBe(0);
		expect(await finish("production", "timed-out")).toBe(0);
		expect(await finish("staging", "succeeded")).toBe(0);
		expect(
			await runHooks(draft, "afterChange", {
				meta: { collectionKey: "page" },
				data: {
					ids: [1],
					change: { type: "published", version: "production" },
				},
			}),
		).toBe(0);
	});
});
