import {
	DEFAULT_SITE_DIRECTORY,
	DEFAULT_STATIC_OUTPUT_DIRECTORY,
} from "../constants.js";
import type { SitePluginOptions, SitePluginOptionsInternal } from "../types.js";

/** Fills in defaults for the plugin options given by the user. */
const resolvePluginOptions = (
	given: SitePluginOptions,
): SitePluginOptionsInternal => ({
	...given,
	directory: given.directory ?? DEFAULT_SITE_DIRECTORY,
	mode: given.mode ?? "ssr",
	trailingSlash: given.trailingSlash ?? "never",
	static: {
		outDir: given.static?.outDir ?? DEFAULT_STATIC_OUTPUT_DIRECTORY,
	},
});

export default resolvePluginOptions;
