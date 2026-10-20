import path from "node:path";
import type { LucidPluginCliFactory } from "@lucidcms/core/types";
import { ASSETS_BASE, CLOUDFLARE_RUNTIME } from "../constants.js";
import type { SitePluginOptionsInternal } from "../types.js";
import buildSiteData from "./build-site-data.js";
import buildSite from "./static/build-site.js";
import createViteDev from "./vite/create-vite-dev.js";
import writeAssetHeaders from "./vite/write-asset-headers.js";
import writeKilnManifest from "./write-kiln-manifest.js";

/** The site plugin's CLI module, loaded only by `lucidcms` commands. */
const siteCli: LucidPluginCliFactory<SitePluginOptionsInternal> = (
	options,
) => ({
	prepare: (props) =>
		writeKilnManifest({
			root: path.resolve(props.projectRoot, options.directory),
			config: props.config,
			options,
		}),
	dev: (props) =>
		createViteDev({
			...props,
			root: path.resolve(props.projectRoot, options.directory),
		}),
	build: async (props) => {
		const data = await buildSiteData({
			root: path.resolve(props.projectRoot, options.directory),
			projectRoot: props.projectRoot,
			publicFiles: props.publicFiles,
			assetsDir: path.join(props.outDir, "public", ASSETS_BASE),
		});
		if (data.manifest && props.runtime === CLOUDFLARE_RUNTIME) {
			await writeAssetHeaders(props.outDir);
		}
		return { data };
	},
	commands: [
		{
			name: "site:build",
			description: "Build a static site into its own output folder",
			run: (props) => buildSite(options, props),
		},
	],
});

export default siteCli;
