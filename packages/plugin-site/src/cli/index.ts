import path from "node:path";
import type { LucidPluginCliFactory } from "@lucidcms/core/types";
import type { SitePluginOptionsInternal } from "../types.js";
import buildSite from "./static/build-site.js";
import resolveIntegrations from "./ui/resolve-integrations.js";
import uiVitePlugins from "./ui/ui-vite-plugins.js";
import { SITE_MODULE_ID } from "./vite/site-module-plugin.js";
import siteVitePlugins from "./vite/site-vite-plugins.js";
import writeKilnManifest from "./write-kiln-manifest.js";

/** The site plugin's CLI module, loaded only by `lucidcms` commands and Lucid's Vite plugin. */
const siteCli: LucidPluginCliFactory<SitePluginOptionsInternal> = (options) => {
	const ui = options.ui?.length ? resolveIntegrations(options.ui) : null;
	const root = (projectRoot: string) =>
		path.resolve(projectRoot, options.directory);

	return {
		hooks: {
			prepare: (props) =>
				writeKilnManifest({
					root: root(props.projectRoot),
					config: props.config,
					options,
					ui,
				}),
			vite: async (props) => ({
				plugins: [
					...siteVitePlugins({
						root: root(props.projectRoot),
						ui,
						runtime: props.runtime,
					}),
					...(ui
						? await uiVitePlugins({
								root: root(props.projectRoot),
								projectRoot: props.projectRoot,
								integrations: ui,
							})
						: []),
				],
				module: SITE_MODULE_ID,
			}),
		},
		commands: [
			{
				name: "site:build",
				description: "Build a static site into its own output folder",
				run: (props) => buildSite(options, props),
			},
		],
	};
};

export default siteCli;
