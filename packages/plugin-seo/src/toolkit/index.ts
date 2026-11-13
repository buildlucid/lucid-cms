import { defineToolkit } from "@lucidcms/core/toolkit";
import type { ToolkitContext } from "@lucidcms/core/types";
import type { SeoPluginOptionsInternal } from "../services/parse-plugin-options.js";
import createRobotsToolkit from "./robots/index.js";
import createSitemapToolkit from "./sitemap/index.js";

const createSeoToolkit = (
	context: ToolkitContext,
	options: SeoPluginOptionsInternal,
) => ({
	/** The sitemap's pages, files and XML. Calls return an error when `sitemap` is turned off. */
	sitemap: createSitemapToolkit(context, options),
	/** robots.txt for each site origin. Calls return an error when `robots` is turned off. */
	robots: createRobotsToolkit(context, options),
});

/** SEO helpers available on toolkit.seo when the SEO plugin is configured. */
export type SeoToolkit = ReturnType<typeof createSeoToolkit>;

declare module "@lucidcms/core/types" {
	interface ToolkitServices {
		seo: SeoToolkit;
	}
}

/** Adds `toolkit.seo`, bound to these plugin options. */
const seoToolkit = (options: SeoPluginOptionsInternal) =>
	defineToolkit({
		key: "seo",
		create: ({ context }) => createSeoToolkit(context, options),
	});

export default seoToolkit;
