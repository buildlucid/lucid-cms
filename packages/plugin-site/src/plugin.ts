import { definePlugin, LucidError } from "@lucidcms/core";
import type { LucidPluginDefinition } from "@lucidcms/core/types";
import type { SiteCliOptions } from "./cli/index.js";
import {
	CLIENT_SCRIPT_PATH,
	DEFAULT_SITE_DIRECTORY,
	LUCID_VERSION,
	PLUGIN_KEY,
} from "./constants.js";
import registerAssetHeaders from "./services/register-asset-headers.js";
import registerSiteRoute from "./services/register-site-route.js";
import type { SitePluginOptions } from "./types.js";

const plugin = (options: SitePluginOptions = {}): LucidPluginDefinition =>
	definePlugin({
		key: PLUGIN_KEY,
		lucid: LUCID_VERSION,
		defaults: { urls: { site: "/" } },
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
			module: "@lucidcms/plugin-site/cli",
			options: {
				...options,
				directory: options.directory ?? DEFAULT_SITE_DIRECTORY,
			} satisfies SiteCliOptions,
		},
		sources: {
			public: [
				{
					input: "@lucidcms/plugin-site/client/lucid.js",
					output: CLIENT_SCRIPT_PATH,
				},
			],
		},
		configure: (draft) => {
			draft.http.extensions.push({
				name: `${PLUGIN_KEY}:asset-headers`,
				phase: "beforeMiddleware",
				register: registerAssetHeaders,
			});
			draft.http.extensions.push({
				name: `${PLUGIN_KEY}:pages`,
				phase: "fallback",
				register: registerSiteRoute(options),
			});
		},
	});

export default plugin;
