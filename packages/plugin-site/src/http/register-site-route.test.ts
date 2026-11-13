import type {
	HttpExtension,
	HttpExtensionPhase,
	LucidHonoGeneric,
	ResolvedLucidConfig,
} from "@lucidcms/core/types";
import { Hono } from "hono";
import { describe, expect, test, vi } from "vitest";
import { PLUGIN_KEY } from "../constants.js";
import site from "../plugin.js";

vi.mock("../preview/read-preview.js", () => ({
	default: async () => ({ preview: null }),
}));

const templates: Record<string, string> = {
	"pages/about.kiln": "Site about",
	"pages/sitemap.xml.kiln": "<urlset>site</urlset>",
	"pages/[...slug].kiln": "Site page",
};

const phases: HttpExtensionPhase[] = [
	"beforeMiddleware",
	"afterRoutes",
	"afterSetup",
	"fallback",
];

/** Another plugin's root routes, registered where the SEO plugin registers its sitemap files. */
const pluginRoutes: HttpExtension = {
	name: "other-plugin",
	phase: "afterSetup",
	register: (app) => {
		for (const path of [
			"/sitemap.xml",
			"/sitemap-page.xml",
			"/about",
			"/robots.txt",
		]) {
			app.get(path, (c) => c.text(`Plugin ${path}`));
		}
	},
};

/** An app with the site plugin's routes and another plugin's, registered phase by phase as Lucid does. */
const createApp = async (pages = templates) => {
	const draft = {
		http: { extensions: [pluginRoutes], routes: [] },
		admin: { slots: [] },
		hooks: [],
	};
	site().configure?.(draft as never);
	const config = {
		url: "https://example.com",
		http: { security: {} },
		localization: { locales: [{ code: "en" }], defaultLocale: "en" },
		translations: { locales: [] },
		collections: [],
		plugins: [],
		hooks: [],
	} as unknown as ResolvedLucidConfig;

	const app = new Hono<LucidHonoGeneric>();
	app.use(async (c, next) => {
		c.set("config", config);
		c.set("runtimeContext", {
			compiled: true,
			getConnectionInfo: () => ({ address: null }),
			pluginModules: {
				[PLUGIN_KEY]: {
					data: {
						kind: "build",
						buildId: "1",
						prefix: "site/",
						manifest: {},
						ui: null,
					},
					templates: Object.fromEntries(
						Object.entries(pages).map(([name, source]) => [
							name,
							async () => source,
						]),
					),
					components: {},
					renderers: {},
				},
			},
		} as never);
		await next();
	});
	for (const phase of phases) {
		for (const extension of draft.http.extensions) {
			if (extension.phase === phase) await extension.register(app, config);
		}
	}
	return app;
};

const read = async (path: string, pages = templates) => {
	const response = await (await createApp(pages)).request(path);
	return { status: response.status, body: await response.text() };
};

describe("registerSiteRoute", () => {
	test("serves the project's file pages before other plugins' routes", async () => {
		expect(await read("/sitemap.xml")).toEqual({
			status: 200,
			body: "<urlset>site</urlset>",
		});
		expect(await read("/sitemap-page.xml")).toEqual({
			status: 200,
			body: "Plugin /sitemap-page.xml",
		});
	});

	test("leaves file paths to later routes while the site fails to load, and the pages route reports it", async () => {
		// `revalidate` only fits ISR pages, so this site fails to load.
		const broken = {
			...templates,
			"pages/broken.kiln": "{% export revalidate = 60 %}Broken",
		};

		expect(await read("/robots.txt", broken)).toEqual({
			status: 200,
			body: "Plugin /robots.txt",
		});
		expect((await read("/contact", broken)).status).toBe(500);
	});

	test("serves HTML pages after other plugins' routes", async () => {
		expect(await read("/about")).toEqual({
			status: 200,
			body: "Plugin /about",
		});
		expect(await read("/contact")).toEqual({
			status: 200,
			body: "Site page",
		});
	});
});
