import path from "node:path";
import type { LucidPluginCliFactory } from "@lucidcms/core/types";
import { ASSETS_BASE, CLOUDFLARE_RUNTIME, PLUGIN_KEY } from "../constants.js";
import type { SitePluginOptionsInternal } from "../types.js";
import buildSiteData from "./build-site-data.js";
import buildSite from "./static/build-site.js";
import resolveIntegrations from "./ui/resolve-integrations.js";
import createViteDev from "./vite/create-vite-dev.js";
import writeAssetHeaders from "./vite/write-asset-headers.js";
import writeKilnManifest from "./write-kiln-manifest.js";

/** The site plugin's CLI module, loaded only by `lucidcms` commands. */
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
			dev: (props) =>
				createViteDev({ ...props, root: root(props.projectRoot), ui }),
			build: async (props) => {
				const { data, module } = await buildSiteData({
					root: root(props.projectRoot),
					projectRoot: props.projectRoot,
					publicFiles: props.publicFiles,
					assetsDir: path.join(props.outDir, "public", ASSETS_BASE),
					ui,
					serverDir: path.join(props.outDir, "plugins", PLUGIN_KEY),
				});
				if (
					(data.manifest || data.ui) &&
					props.runtime === CLOUDFLARE_RUNTIME
				) {
					await writeAssetHeaders(props.outDir);
				}
				return { data, module: module ?? undefined };
			},
		},
		commands: [
			{
				name: "site:build",
				description: "Build a static site into its own output folder",
				run: (props) => buildSite(options, ui, props),
			},
		],
	};
};

export default siteCli;
