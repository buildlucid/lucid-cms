import type { ResolvedLucidConfig, ServiceContext } from "@lucidcms/core/types";
import { describe, expect, test } from "vitest";
import { PLUGIN_KEY } from "../constants.js";
import type { SiteModule, SitePluginOptionsInternal } from "../types.js";
import createSiteLoader from "./create-site-loader.js";

const config = {
	localization: { locales: [{ code: "en" }], defaultLocale: "en" },
	collections: [],
} as unknown as ResolvedLucidConfig;

const options: SitePluginOptionsInternal = {
	directory: "site",
	mode: "ssr",
	trailingSlash: "never",
	static: { outDir: "dist-site" },
};

/** A development site module whose index template reads `source.index`. */
const devModule = (source: { index: string }, revision = "1"): SiteModule => ({
	data: { kind: "dev", prefix: "site/", revision },
	templates: { "pages/index.kiln": async () => source.index },
	components: {},
	renderers: {},
});

const contextFor = (module: SiteModule | undefined) =>
	({
		runtimeContext: {
			compiled: false,
			pluginModules: module ? { [PLUGIN_KEY]: module } : {},
		},
		translate: { scopeBundles: () => ({}), lookup: () => undefined },
	}) as unknown as ServiceContext;

describe("createSiteLoader", () => {
	test("keeps the development site until a template or the revision changes", async () => {
		const getSite = createSiteLoader(options, config);
		const source = { index: "Home" };
		const context = contextFor(devModule(source));

		const first = await getSite({ context });
		await expect(getSite({ context })).resolves.toBe(first);

		source.index = "Home!";
		const second = await getSite({ context });
		expect(second).not.toBe(first);
		expect(second.cacheNamespace).not.toBe(first.cacheNamespace);
		await expect(getSite({ context })).resolves.toBe(second);

		const third = await getSite({
			context: contextFor(devModule(source, "2")),
		});
		expect(third.cacheNamespace).not.toBe(second.cacheNamespace);
	});

	test("starts a new cache namespace when a global's value changes", async () => {
		const namespaceFor = async (siteUrl: string) => {
			const getSite = createSiteLoader(
				{ ...options, kiln: { globals: { siteUrl } } },
				config,
			);
			return (
				await getSite({ context: contextFor(devModule({ index: "Home" })) })
			).cacheNamespace;
		};

		expect(await namespaceFor("https://a.test")).toBe(
			await namespaceFor("https://a.test"),
		);
		expect(await namespaceFor("https://b.test")).not.toBe(
			await namespaceFor("https://a.test"),
		);
	});

	test("fails without the site's server module", async () => {
		const getSite = createSiteLoader(options, config);

		await expect(getSite({ context: contextFor(undefined) })).rejects.toThrow(
			/server module is missing/,
		);
	});
});
