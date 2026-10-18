import type {
	AdapterRuntimeContext,
	LucidHonoGeneric,
	ResolvedLucidConfig,
} from "@lucidcms/core/types";
import { Hono } from "hono";
import { describe, expect, test } from "vitest";
import { IMMUTABLE_CACHE_CONTROL, PLUGIN_KEY } from "../constants.js";
import type { SiteCliData } from "../types.js";
import registerAssetHeaders from "./register-asset-headers.js";

const data: SiteCliData = {
	kind: "build",
	buildId: "build",
	templates: {},
	manifest: { "styles/site.css": { file: "site-a1.css" } },
};

const createApp = async () => {
	const app = new Hono<LucidHonoGeneric>();
	await registerAssetHeaders(app, {} as ResolvedLucidConfig);
	app.use("*", async (c, next) => {
		c.set("runtimeContext", {
			pluginData: { [PLUGIN_KEY]: data },
		} as unknown as AdapterRuntimeContext);
		await next();
	});
	app.get("/_assets/*", (c) =>
		c.req.path === "/_assets/missing.css"
			? c.text("Not found", 404)
			: c.text("body {}"),
	);
	return app;
};

describe("registerAssetHeaders", () => {
	test("caches built files for a year, leaving other public files and misses alone", async () => {
		const app = await createApp();
		const cacheControl = async (path: string) =>
			(await app.request(path)).headers.get("cache-control");

		expect(await cacheControl("/_assets/site-a1.css")).toBe(
			IMMUTABLE_CACHE_CONTROL,
		);
		expect(await cacheControl("/_assets/logo.png")).toBeNull();
		expect(await cacheControl("/_assets/missing.css")).toBeNull();
	});
});
