import { definePlugin } from "@lucidcms/core";
import type { LucidPluginDefinition } from "@lucidcms/core/types";
import type { SiteCliOptions } from "./cli/index.js";
import {
	CLIENT_SCRIPT_PATH,
	DEFAULT_SITE_DIRECTORY,
	LUCID_VERSION,
	PLUGIN_KEY,
} from "./constants.js";
import registerSiteRoute from "./services/register-site-route.js";
import type { SitePluginOptions } from "./types.js";

const plugin = (options: SitePluginOptions = {}): LucidPluginDefinition =>
	definePlugin({
		key: PLUGIN_KEY,
		lucid: LUCID_VERSION,
		defaults: { urls: { site: "/" } },
		cli: {
			module: "@lucidcms/plugin-site/cli",
			options: {
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
		commands: [
			{
				name: "site:build",
				description: "Build a static site into the build directory",
				run: async (props) => {
					const { default: buildSite } = await import(
						"./services/build-site.js"
					);
					await buildSite(options, props);
				},
			},
		],
		configure: (draft) => {
			draft.http.extensions.push({
				name: `${PLUGIN_KEY}:pages`,
				phase: "fallback",
				register: registerSiteRoute(options),
			});
		},
	});

export default plugin;
