import { definePlugin, LucidError } from "@lucidcms/core";
import type { LucidPluginDefinition } from "@lucidcms/core/types";
import clearPageCacheConfig from "./admin/components/ClearPageCache/config.js";
import { CLIENT_SCRIPT_PATH, PACKAGE_INFO, PLUGIN_KEY } from "./constants.js";
import registerSiteRoute from "./http/register-site-route.js";
import routes from "./routes/index.js";
import resolvePluginOptions from "./site/resolve-plugin-options.js";
import clearCache from "./tasks/clear-cache.js";
import renderSite from "./tasks/static-build/render-site.js";
import type { SitePluginOptions } from "./types.js";

const plugin = (given: SitePluginOptions = {}): LucidPluginDefinition => {
	const options = resolvePluginOptions(given);

	return definePlugin({
		key: PLUGIN_KEY,
		package: PACKAGE_INFO,
		defaults: { siteUrl: "/" },
		// Hosting frameworks, such as Astro, render the site themselves and only pass Lucid's own paths through.
		checkCompatibility: ({ runtimeContext }) => {
			if (runtimeContext.host !== "lucid") {
				throw new LucidError({
					scope: PLUGIN_KEY,
					message: `The site plugin renders pages with Lucid's own server, so it can't run inside ${runtimeContext.host}. Render your pages with ${runtimeContext.host} instead.`,
				});
			}
		},
		cli: {
			module: "@lucidcms/site/cli",
			options,
		},
		tasks: { build: renderSite(options), "clear-cache": clearCache },
		sources: {
			translations: ["@lucidcms/site/translations"],
			public: [
				{
					input: "@lucidcms/site/client/lucid.js",
					output: CLIENT_SCRIPT_PATH,
				},
			],
		},
		configure: (draft) => {
			draft.http.extensions.push({
				name: `${PLUGIN_KEY}:pages`,
				phase: "fallback",
				register: registerSiteRoute(options),
			});
			//* static sites are served from site:build's files, so they store nothing to clear
			if (options.mode !== "static") {
				draft.http.routes.push(...routes());
				draft.admin.slots.push(clearPageCacheConfig());
			}
		},
	});
};

export default plugin;
